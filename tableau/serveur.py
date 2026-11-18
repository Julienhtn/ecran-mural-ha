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
        if chemin == "/api/etat":
            return self._envoyer(200, json.dumps(etat()), "application/json")
        return self._envoyer(404, "Introuvable", "text/plain; charset=utf-8")


if __name__ == "__main__":
    threading.Thread(target=verifier_services, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", PORT), Gestion).serve_forever()
