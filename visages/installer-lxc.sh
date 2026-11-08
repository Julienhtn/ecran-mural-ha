#!/bin/bash
# À lancer sur l'hôte Proxmox (shell du nœud « pve ») :
#   bash installer-lxc.sh <ID> <IP/24> <passerelle> <adresse HA> <jeton HA>
# Crée le conteneur Debian « visages » et y installe le service de reconnaissance.
set -euo pipefail
CTID=${1:-110}; IP=${2:-192.168.86.12/24}; GW=${3:-192.168.86.1}; HA=${4:-http://192.168.86.11}; TOKEN=${5:-}
DEPOT=https://raw.githubusercontent.com/Julienhtn/ecran-mural-ha/main/visages

if [ -z "$TOKEN" ]; then read -rsp "Colle le jeton Home Assistant puis Entrée : " TOKEN </dev/tty; echo; fi
[ ${#TOKEN} -gt 100 ] || { echo "Jeton manquant ou incomplet"; exit 1; }
if pct status "$CTID" >/dev/null 2>&1; then echo "Le conteneur $CTID existe déjà"; exit 1; fi
if ping -c1 -W1 "${IP%/*}" >/dev/null 2>&1; then echo "L'adresse ${IP%/*} est déjà utilisée"; exit 1; fi

pveam update >/dev/null
TPL=$(pveam available --section system | awk '/debian-13-standard_.*amd64/ {print $2}' | sort -V | tail -1)
[ -n "$TPL" ] || TPL=$(pveam available --section system | awk '/debian-12-standard_.*amd64/ {print $2}' | sort -V | tail -1)
[ -f "/var/lib/vz/template/cache/$TPL" ] || pveam download local "$TPL"

pct create "$CTID" "local:vztmpl/$TPL" --hostname visages --cores 1 --memory 1024 --swap 512 \
  --rootfs local-lvm:6 --net0 "name=eth0,bridge=vmbr0,ip=$IP,gw=$GW" --nameserver "$GW" \
  --unprivileged 1 --features nesting=1 --onboot 1 --startup order=2 --timezone host \
  --description "Reconnaissance des visages de la sonnette (OpenCV YuNet + SFace). Port 8099."
pct start "$CTID"
sleep 5

TMP=$(mktemp -d)
curl -fsSL "$DEPOT/visages.py" -o "$TMP/visages.py"
cat > "$TMP/config.env" <<EOF
HA_URL=$HA
HA_TOKEN=$TOKEN
CAMERA=camera.sonnette
SEUIL=0.40
PORT=8099
EOF
cat > "$TMP/visages.service" <<'EOF'
[Unit]
Description=Reconnaissance des visages (sonnette)
After=network-online.target
Wants=network-online.target

[Service]
EnvironmentFile=/opt/visages/config.env
ExecStart=/opt/visages/venv/bin/python /opt/visages/visages.py
Restart=always
RestartSec=5
User=root

[Install]
WantedBy=multi-user.target
EOF

pct exec "$CTID" -- mkdir -p /opt/visages/modeles /opt/visages/personnes /opt/visages/captures
pct push "$CTID" "$TMP/visages.py" /opt/visages/visages.py
pct push "$CTID" "$TMP/config.env" /opt/visages/config.env --perms 600
pct push "$CTID" "$TMP/visages.service" /etc/systemd/system/visages.service
rm -rf "$TMP"

pct exec "$CTID" -- bash -s <<'EOS'
set -e
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -y -qq python3 python3-venv curl ca-certificates >/dev/null
python3 -m venv /opt/visages/venv
/opt/visages/venv/bin/pip install -q --upgrade pip
/opt/visages/venv/bin/pip install -q opencv-python-headless numpy
M=https://media.githubusercontent.com/media/opencv/opencv_zoo/main/models
curl -fsSL "$M/face_detection_yunet/face_detection_yunet_2023mar.onnx" -o /opt/visages/modeles/yunet.onnx
curl -fsSL "$M/face_recognition_sface/face_recognition_sface_2021dec.onnx" -o /opt/visages/modeles/sface.onnx
cd /opt/visages/modeles
echo "8f2383e4dd3cfbb4553ea8718107fc0423210dc964f9f4280604804ed2552fa4  yunet.onnx
0ba9fbfa01b5270c96627c4ef784da859931e02f04419c829e83484087c34e79  sface.onnx" | sha256sum -c -
systemctl daemon-reload
systemctl enable --now visages
sleep 4
curl -s localhost:8099/sante
EOS
echo
echo "Conteneur $CTID prêt : http://${IP%/*}:8099/sante"
