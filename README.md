# Écran mural

Carte Home Assistant plein écran pour une tablette murale : alarme Alarmo avec pavé de code, caméras, scènes, volets, thermostat, météo 24 h, EDF Tempo, consommations en euros, appel visio et écran de veille.

Une seule carte, en JavaScript pur (aucune dépendance). Elle se met à l'échelle d'elle-même pour tenir sur n'importe quel écran (format 16/10 conseillé).

## Installation

1. Home Assistant → **Paramètres → Marketplace → ⋮ → Ajouter grâce à un lien**, coller l'adresse de ce dépôt, type **Dashboard**.
2. Installer **Écran mural**, puis recharger la page (Ctrl+F5).
3. Créer un tableau de bord, une vue en mode **Panneau (1 carte)**, puis coller la configuration ci-dessous dans l'éditeur YAML de la carte.

## Configuration

```yaml
type: custom:ecran-mural-card
alarm: alarm_control_panel.alarmo
weather: weather.maison
outdoor_temperature: sensor.temperature_exterieure   # facultatif
code_length: 4
idle_timeout: 60          # secondes avant l'écran de veille (0 = jamais)
sounds: true
moment: auto              # auto | matin | jour | soir | nuit
doors:
  - { entity: binary_sensor.porte_entree_ouverture, name: Entrée }
cameras:
  - { entity: camera.sonnette, name: Sonnette, sub: Entrée }
  - { entity: camera.exterieur, name: Extérieur, sub: Jardin }
doorbell_camera: camera.sonnette   # plein écran automatique quand on sonne (Netatmo)
scenes:
  - { name: Tout allumer, sub: Rez-de-chaussée, icon: bulb, service: light.turn_on, target: light.rez_de_chaussee }
  - { name: Soirée, sub: Ambiance, icon: moon, service: scene.turn_on, target: scene.rez_de_chaussee_soiree }
  - { name: Tout éteindre, sub: Rez-de-chaussée, icon: power, service: light.turn_off, target: light.rez_de_chaussee }
covers:
  - { name: Jardin, entities: [cover.volet_1, cover.volet_2] }
thermostat: { entity: climate.netatmo, name: Thermostat }
tempo: { today: sensor.rte_tempo_couleur_actuelle, tomorrow: sensor.rte_tempo_prochaine_couleur }
energy:
  - { name: Électricité, kind: elec, statistic: sensor.linky_energie, price: 0.1952 }
  - { name: Gaz, kind: gas, source: gazpar, entity: sensor.gazpar, price: 0.11 }   # lit l'historique GRDF directement
  - { name: Eau, kind: water, statistic: sensor.ileo_index_mode_ghost, scale: 0.001, unit: m³, price: 4.2 }   # scale : litres → m³
call:
  room: https://meet.ffmuc.net/ma-salle-secrete-a-changer   # Jitsi sans compte (Freifunk München)
  name: Maison
  targets:
    - { name: Julien, notify: notify.mobile_app_iphone_de_julien, color: "#F2B544" }
    - { name: Julie, notify: notify.mobile_app_iphone_de_julie, color: "#8B9CFF" }
```

Les blocs non configurés ou indisponibles affichent « non connecté » au lieu de casser la page.

- **Volets** : boutons sans retour d'état (haut = ouvrir, bas = fermer) ; un groupe peut piloter plusieurs volets.
- **Consommations** : lues dans les statistiques long terme (les mêmes que le tableau Énergie). `price` en € par kWh ou par m³ ; sans prix, la carte affiche le volume.
- **Visio** : chaque iPhone reçoit une notification qui ouvre la salle ; la tablette rejoint la même salle.

## Tablette (Fully Kiosk)

URL de démarrage : `http://IP_DE_HOME_ASSISTANT/ecran-mural/0?kiosk` (avec l'intégration kiosk-mode pour masquer l'en-tête), écran toujours allumé, réveil par la caméra frontale si souhaité.

Licence MIT.
