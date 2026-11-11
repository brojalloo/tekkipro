# Déploiement de production sur le VPS

Le workflow CI propose un déploiement le **1er de chaque mois à 09 h 17, heure de Dakar**. Une fois le workflow arrivé sur `main`, GitHub teste et scanne le commit de `main` du lancement mensuel. Après ces vérifications, **Production VPS** attend l’approbation de l’environnement `production`. Les pushes habituels sur `main` lancent les vérifications CI.

## Configurer GitHub

Dans **Settings → Environments**, crée l’environnement `production`.

1. Active **Required reviewers** et ajoute `brojalloo` ou le compte chargé d’approuver. Laisse **Prevent self-review** désactivé si tu es le seul approbateur.
2. Dans **Deployment branches and tags**, sélectionne **Selected branches and tags** et crée une seule règle de type **Branch** nommée exactement `main`.
3. Renseigne les variables et secrets dans cet environnement.

| Paramètre | Type | Valeur |
| --- | --- | --- |
| `VPS_HOST` | Variable | Nom DNS ou IPv4 utilisé pour SSH |
| `VPS_USER` | Variable | Compte de déploiement du VPS |
| `VPS_PORT` | Variable | Port SSH si différent de 22 |
| `VPS_SSH_KEY` | Secret | Clé privée de déploiement SSH utilisable sans interaction |
| `VPS_KNOWN_HOSTS` | Secret | Ligne OpenSSH de la clé d’hôte vérifiée du VPS. Pour un port non standard, l’entrée commence par `[hôte]:port`. |

## Préparer le VPS

Le compte de déploiement doit pouvoir se connecter par SSH, écrire dans `/opt/tekkipro` et exécuter Docker Compose. Le VPS doit disposer de `rsync` et `curl`. Conserve la configuration de production dans `/opt/tekkipro/infra/.env`, le fichier PgBouncer dans `/opt/tekkipro/infra/pgbouncer/userlist.txt` et les certificats à l’emplacement déclaré dans la configuration Nginx. Si un runner GitHub auto-hébergé avait été installé uniquement pour ce dépôt public, retire-le après la bascule vers SSH.

Le workflow synchronise les sources et conserve ces fichiers locaux. Il reconstruit l’API et le web, attend le démarrage des services et vérifie `https://tekkipro.com/api/health` via Nginx sur le VPS. Au premier déploiement avec le volume d’uploads, il copie les fichiers du conteneur API existant vers le volume persistant.

## Approuver une mise en production

Une fois les changements promus de `dev` vers `main`, ouvre le run mensuel dans **Actions → CI → Review deployments**, sélectionne `production`, puis approuve le commit affiché si tu veux le mettre en production.
