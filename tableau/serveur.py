#!/usr/bin/env python3
"""Tableau de bord de la maison : état du serveur Proxmox en direct + raccourcis vers les services.

Aucune dépendance (bibliothèque standard Python uniquement).
Configuration par variables d'environnement (fichier /opt/tableau/config.env) :
  PVE_URL      https://192.168.86.10:8006
  PVE_TOKEN    tableau@pve!lecture=<secret>   (jeton en lecture seule, rôle PVEAuditor)
  PORT         80
Les services affichés sont dans /opt/tableau/services.json.
"""
import json
import os
import socket
import ssl
import threading
import time
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ICI = os.path.dirname(os.path.abspath(__file__))
PVE_URL = os.environ.get("PVE_URL", "https://192.168.86.10:8006").rstrip("/")
PVE_TOKEN = os.environ.get("PVE_TOKEN", "")
PORT = int(os.environ.get("PORT", "80"))

# Certificat auto-signé de Proxmox : appel local uniquement, sans vérification.
CTX = ssl.create_default_context()
CTX.check_hostname = False
CTX.verify_mode = ssl.CERT_NONE


def pve(chemin):
    req = urllib.request.Request(PVE_URL + "/api2/json" + chemin, headers={"Authorization": "PVEAPIToken=" + PVE_TOKEN})
    with urllib.request.urlopen(req, timeout=4, context=CTX) as r:
        return json.loads(r.read().decode())["data"]


def charger_services():
    try:
        with open(os.path.join(ICI, "services.json"), encoding="utf-8") as f:
            return json.load(f)
    except Exception:
        return []


# Disponibilité des services : vérifiée en tâche de fond toutes les 15 s (connexion TCP simple).
DISPO = {}


def verifier_services():
    while True:
        for s in charger_services():
            u = urllib.parse.urlparse(s.get("verif") or s.get("url", ""))
            if not u.hostname or s.get("externe"):
                continue
            port = u.port or (443 if u.scheme == "https" else 80)
            t0 = time.time()
            try:
                with socket.create_connection((u.hostname, port), timeout=1.5):
                    DISPO[s["id"]] = {"ok": True, "ms": round((time.time() - t0) * 1000)}
            except OSError:
                DISPO[s["id"]] = {"ok": False, "ms": None}
        time.sleep(15)


# Inventaire du réseau : balayage de 192.168.86.1-254 toutes les 10 min (connexion TCP rapide pour
# remplir la table ARP), puis lecture de /proc/net/arp. Nom : DNS inverse ; fabricant : préfixe MAC.
RESEAU = {"t": 0, "appareils": [], "sous_reseau": None}
OUI = {
    "001788": "Philips Hue (Signify)", "ECB5FA": "Philips Hue (Signify)",
    "7C2C67": "Shelly", "3C6105": "Espressif (objet connecté)", "A4CF12": "Espressif (objet connecté)", "8CAAB5": "Espressif (objet connecté)",
    "70EE50": "Netatmo", "BC2411": "Proxmox (machine virtuelle)",
    "F4F5D8": "Google", "F4F5E8": "Google", "3C5AB4": "Google", "1C53F9": "Google", "CCF411": "Google", "F88FCA": "Google", "D8EB46": "Google",
    "B827EB": "Raspberry Pi", "DCA632": "Raspberry Pi", "E45F01": "Raspberry Pi",
    "00113D": "Dell", "F8BC12": "Dell", "6C2B59": "Dell", "8CEC4B": "Dell", "B04F13": "Dell",
    "000E58": "Sonos", "5CAAFD": "Sonos", "B8E937": "Sonos",
}


def _sonder(ip):
    try:
        with socket.create_connection((ip, 80), timeout=0.4):
            pass
    except OSError:
        pass


def scanner_reseau():
    from concurrent.futures import ThreadPoolExecutor
    while True:
        try:
            ip_local = socket.gethostbyname(socket.gethostname())
            with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as so:
                so.connect(("192.168.86.1", 53))
                ip_local = so.getsockname()[0]
            base = ".".join(ip_local.split(".")[:3])
            with ThreadPoolExecutor(64) as ex:
                list(ex.map(_sonder, [f"{base}.{i}" for i in range(1, 255)]))
            vus = []
            with open("/proc/net/arp") as f:
                for ligne in f.readlines()[1:]:
                    c = ligne.split()
                    if len(c) < 4 or c[2] == "0x0" or c[3] == "00:00:00:00:00:00" or not c[0].startswith(base + "."):
                        continue
                    mac = c[3].upper()
                    pref = mac.replace(":", "")[:6]
                    prive = int(pref[1], 16) & 2 == 2
                    try:
                        nom = socket.gethostbyaddr(c[0])[0].split(".")[0]
                    except OSError:
                        nom = None
                    vus.append({"ip": c[0], "mac": mac, "nom": nom, "fabricant": OUI.get(pref) or ("Adresse privée (téléphone, tablette…)" if prive else None)})
            vus.append({"ip": ip_local, "mac": None, "nom": "tableau", "fabricant": "Ce tableau de bord"})
            vus.sort(key=lambda a: tuple(int(x) for x in a["ip"].split(".")))
            RESEAU.update(t=time.time(), appareils=vus, sous_reseau=base + ".0/24")
        except Exception as e:  # le balayage n'est qu'un plus : on réessaie plus tard
            RESEAU["erreur"] = str(e)[:200]
        time.sleep(180)


CACHE = {"t": 0, "data": None}
VERROU = threading.Lock()


def etat():
    with VERROU:
        if time.time() - CACHE["t"] < 1.5 and CACHE["data"]:
            return CACHE["data"]
        out = {"heure": time.time(), "erreur": None, "noeud": None, "machines": [], "stockage": []}
        try:
            noeuds = pve("/nodes")
            n = noeuds[0]["node"]
            st = pve(f"/nodes/{n}/status")
            out["noeud"] = {
                "nom": n,
                "cpu": st.get("cpu", 0),
                "coeurs": (st.get("cpuinfo") or {}).get("cpus"),
                "modele": (st.get("cpuinfo") or {}).get("model"),
                "mem": (st.get("memory") or {}).get("used"),
                "memTotal": (st.get("memory") or {}).get("total"),
                "disque": (st.get("rootfs") or {}).get("used"),
                "disqueTotal": (st.get("rootfs") or {}).get("total"),
                "charge": st.get("loadavg"),
                "uptime": st.get("uptime"),
                "version": st.get("pveversion"),
            }
            for g in pve("/cluster/resources?type=vm"):
                out["machines"].append({k: g.get(k) for k in ("vmid", "name", "type", "status", "cpu", "maxcpu", "mem", "maxmem", "uptime", "disk", "maxdisk")})
            out["machines"].sort(key=lambda g: g.get("vmid") or 0)
            for s in pve("/cluster/resources?type=storage"):
                if s.get("maxdisk"):
                    out["stockage"].append({"nom": s.get("storage"), "util": s.get("disk"), "total": s.get("maxdisk")})
        except Exception as e:  # Proxmox injoignable ou jeton invalide : la page l'affiche.
            out["erreur"] = str(e)[:200]
        services = charger_services()
        out["services"] = [dict(s, **DISPO.get(s["id"], {})) for s in services]
        CACHE.update(t=time.time(), data=out)
        return out


class Gestion(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _envoyer(self, code, corps, type_):
        b = corps if isinstance(corps, bytes) else corps.encode()
        self.send_response(code)
        self.send_header("Content-Type", type_)
        self.send_header("Content-Length", str(len(b)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        chemin = urllib.parse.urlparse(self.path).path
        if chemin in ("/", "/index.html"):
            with open(os.path.join(ICI, "index.html"), "rb") as f:
                return self._envoyer(200, f.read(), "text/html; charset=utf-8")
        if chemin == "/api/reseau":
            return self._envoyer(200, json.dumps(RESEAU), "application/json")
        if chemin == "/api/etat":
            return self._envoyer(200, json.dumps(etat()), "application/json")
        return self._envoyer(404, "Introuvable", "text/plain; charset=utf-8")


if __name__ == "__main__":
    threading.Thread(target=verifier_services, daemon=True).start()
    threading.Thread(target=scanner_reseau, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", PORT), Gestion).serve_forever()
