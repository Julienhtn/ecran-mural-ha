#!/bin/bash
# Tableau de bord de la maison sur http://192.168.86.100
# À lancer sur l'hôte Proxmox (shell du nœud) :
#   bash -c "$(curl -fsSL https://raw.githubusercontent.com/Julienhtn/ecran-mural-ha/main/tableau/installer.sh)"
# Crée : un utilisateur Proxmox en lecture seule (tableau@pve, rôle PVEAuditor) avec un jeton,
#        et un petit conteneur Debian « tableau » (ID 120) qui sert la page sur le port 80.
set -euo pipefail
CTID=${CTID:-120}; IP=${IP:-192.168.86.100/24}; GW=${GW:-192.168.86.1}
DEPOT=https://raw.githubusercontent.com/Julienhtn/ecran-mural-ha/main/tableau
HOTE_IP=$(hostname -I | awk '{print $1}')

if pct status "$CTID" >/dev/null 2>&1; then echo "Le conteneur $CTID existe déjà (pour réinstaller : pct destroy $CTID --force)"; exit 1; fi
if ping -c1 -W1 "${IP%/*}" >/dev/null 2>&1; then echo "L'adresse ${IP%/*} est déjà utilisée sur le réseau"; exit 1; fi

# 1. Jeton Proxmox en lecture seule
pveum user add tableau@pve --comment "Tableau de bord (lecture seule)" 2>/dev/null || true
pveum acl modify / --users tableau@pve --roles PVEAuditor
pveum user token remove tableau@pve lecture 2>/dev/null || true
SECRET=$(pveum user token add tableau@pve lecture --privsep 0 --output-format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["value"])')

# 2. Conteneur
pveam update >/dev/null
TPL=$(pveam available --section system | awk '/debian-13-standard_.*amd64/ {print $2}' | sort -V | tail -1)
[ -n "$TPL" ] || TPL=$(pveam available --section system | awk '/debian-12-standard_.*amd64/ {print $2}' | sort -V | tail -1)
[ -f "/var/lib/vz/template/cache/$TPL" ] || pveam download local "$TPL"
pct create "$CTID" "local:vztmpl/$TPL" --hostname tableau --cores 1 --memory 256 --swap 128 \
  --rootfs local-lvm:2 --net0 "name=eth0,bridge=vmbr0,ip=$IP,gw=$GW" --nameserver "$GW" \
  --unprivileged 1 --features nesting=1 --onboot 1 --startup order=3 --timezone host \
  --description "Tableau de bord de la maison : http://${IP%/*}"
pct start "$CTID"
sleep 5

TMP=$(mktemp -d)
for f in serveur.py index.html services.json; do curl -fsSL "$DEPOT/$f" -o "$TMP/$f"; done
cat > "$TMP/config.env" <<CFG
PVE_URL=https://$HOTE_IP:8006
PVE_TOKEN=tableau@pve!lecture=$SECRET
PORT=80
CFG
cat > "$TMP/tableau.service" <<'UNIT'
[Unit]
Description=Tableau de bord de la maison
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/opt/tableau/config.env
ExecStart=/usr/bin/python3 /opt/tableau/serveur.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
UNIT
pct exec "$CTID" -- mkdir -p /opt/tableau
for f in serveur.py index.html services.json; do pct push "$CTID" "$TMP/$f" "/opt/tableau/$f"; done
pct push "$CTID" "$TMP/config.env" /opt/tableau/config.env --perms 600
pct push "$CTID" "$TMP/tableau.service" /etc/systemd/system/tableau.service
rm -rf "$TMP"
pct exec "$CTID" -- bash -c 'export DEBIAN_FRONTEND=noninteractive; command -v python3 >/dev/null || (apt-get update -qq && apt-get install -y -qq python3 >/dev/null); systemctl daemon-reload; systemctl enable --now tableau'
sleep 3
echo
echo "Tableau de bord prêt : http://${IP%/*}"
