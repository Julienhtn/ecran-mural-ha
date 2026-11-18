#!/bin/bash
# Mise à jour du tableau de bord (conteneur 120) — à lancer sur l'hôte Proxmox.
# Garde config.env (jeton) ; services.json n'est remplacé que si MAJ_SERVICES=1.
set -euo pipefail
CTID=${CTID:-120}
DEPOT=https://raw.githubusercontent.com/Julienhtn/ecran-mural-ha/main/tableau
FICHIERS="serveur.py index.html"
[ "${MAJ_SERVICES:-1}" = "1" ] && FICHIERS="$FICHIERS services.json"
TMP=$(mktemp -d)
for f in $FICHIERS; do curl -fsSL "$DEPOT/$f?$(date +%s)" -o "$TMP/$f"; pct push "$CTID" "$TMP/$f" "/opt/tableau/$f"; done
rm -rf "$TMP"
pct exec "$CTID" -- systemctl restart tableau
echo "Tableau de bord mis à jour."
