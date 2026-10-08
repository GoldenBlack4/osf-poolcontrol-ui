# OSF PoolControl UI (français)

Interface web moderne et passerelle Home Assistant pour les contrôleurs de piscine **OSF PoolControl .NET**.

> ⚠️ **Projet non officiel**, sans lien avec OSF. Utilisation à vos risques : l'app commande pompes, chauffage et vannes.

## Fonctions

- Tableau de bord en direct : eau, solaire, consigne, filtration, chauffage
- Commandes : consigne, pompe manuelle, lumière (AUX, démarre la pompe si nécessaire), ECO, modes, contre-lavage
- Minuteries : filtration, contre-lavage, ECO et lumière (ajout / modification / suppression), durées, abaissement ECO
- Home Assistant via MQTT (découverte automatique)
- Application installable sur téléphone, mode clair/sombre, anglais / français / allemand

## Installation

### Add-on Home Assistant (HA OS / Supervised)

1. *Paramètres → Modules complémentaires → Boutique → ⋮ → Dépôts* → ajouter `https://github.com/GoldenBlack4/osf-poolcontrol-ui`
2. Installer **OSF PoolControl UI**, renseigner l'**adresse du contrôleur** et le **PIN**, démarrer.
3. Ouvrir **Pool** dans la barre latérale. Avec l'add-on Mosquitto, l'appareil **Pool** apparaît tout seul.

### Docker (serveur Linux, NAS, Raspberry Pi, HA en conteneur…)

```bash
mkdir osf-poolcontrol && cd osf-poolcontrol
curl -O https://raw.githubusercontent.com/GoldenBlack4/osf-poolcontrol-ui/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/GoldenBlack4/osf-poolcontrol-ui/main/app/.env.example
nano .env            # OSF_HOST, OSF_PIN (et MQTT_* pour Home Assistant)
docker compose up -d
```

Puis ouvrir `http://<serveur>:8090`.

Le PIN utilisateur (4 chiffres) est nécessaire pour envoyer des commandes. L'adresse IP du contrôleur se trouve dans
son menu *Service → réglages réseau*.

## Sécurité

Ne jamais exposer l'app directement sur Internet : passer par un VPN (WireGuard, Tailscale) ou un reverse proxy
avec authentification. `APP_PASSWORD` ajoute un mot de passe simple (utilisateur `pool`).

Documentation complète (variables, entités, protocole) : [README anglais](../README.md) et [PROTOCOL.md](PROTOCOL.md).
