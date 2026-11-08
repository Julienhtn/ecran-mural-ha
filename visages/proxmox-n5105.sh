#!/bin/bash
# Stabilité du Celeron N5105 sous Proxmox + aucune mise en veille.
# À lancer une fois sur l'hôte, puis redémarrer.
set -euo pipefail

# 1. Microcode Intel (dépôt non-free-firmware de Debian)
for f in /etc/apt/sources.list.d/debian.sources; do
  [ -f "$f" ] && grep -q '^Components:' "$f" && ! grep -q 'non-free-firmware' "$f" && \
    sed -i '/^Components:/ s/$/ non-free-firmware/' "$f"
done
if [ -f /etc/apt/sources.list ] && grep -q '^deb .*debian' /etc/apt/sources.list && ! grep -q non-free-firmware /etc/apt/sources.list; then
  sed -i '/^deb .*debian/ s/$/ non-free-firmware/' /etc/apt/sources.list
fi
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq intel-microcode >/dev/null

# 2. Limiter les états de veille profonde du processeur (gels connus du N5105)
OPT="intel_idle.max_cstate=1"
if [ -f /etc/kernel/cmdline ]; then
  grep -q "$OPT" /etc/kernel/cmdline || sed -i "s/\$/ $OPT/" /etc/kernel/cmdline
  proxmox-boot-tool refresh
else
  grep -q "$OPT" /etc/default/grub || sed -i "s/^GRUB_CMDLINE_LINUX_DEFAULT=\"\(.*\)\"/GRUB_CMDLINE_LINUX_DEFAULT=\"\1 $OPT\"/" /etc/default/grub
  update-grub
fi

# 3. Jamais de veille ni d'hibernation
systemctl mask sleep.target suspend.target hibernate.target hybrid-sleep.target >/dev/null
mkdir -p /etc/systemd/logind.conf.d
cat > /etc/systemd/logind.conf.d/pas-de-veille.conf <<'EOF'
[Login]
HandleSuspendKey=ignore
HandleHibernateKey=ignore
HandleLidSwitch=ignore
HandleLidSwitchExternalPower=ignore
IdleAction=ignore
EOF

echo "OK — redémarrer l'hôte pour appliquer le microcode et l'option noyau."
