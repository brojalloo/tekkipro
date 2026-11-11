# Docker local sur Windows

Dans PowerShell, ouvre le dossier du dépôt sur la branche `dev` et démarre Docker Desktop en mode conteneurs Linux.

```powershell
.\deploy\dev-local\Sync-Dev.ps1
```

Ouvre [127.0.0.1:8092](http://127.0.0.1:8092). La commande télécharge la dernière image validée de `dev` et la démarre par empreinte. Relance-la pour récupérer une nouvelle version. Les conteneurs déjà installés redémarrent quand Docker Desktop redémarre, sauf arrêt manuel.

Si le paquet GHCR est privé, lance `docker --context desktop-linux login ghcr.io --username brojalloo` et utilise un jeton GitHub classique avec `read:packages` à l’invite du mot de passe. Tant que la première publication de `dev` n’a pas réussi, utilise la construction locale ci-dessous.

## Activer les mises à jour automatiques

Depuis ta copie de travail Windows sur `dev`, avec Docker Desktop démarré :

```powershell
.\deploy\dev-local\Install-AutoSync.ps1
```

La tâche **TekkiPro - Synchronisation dev** vérifie GHCR toutes les cinq minutes pendant ta session Windows et au début d’une nouvelle session. Elle attend un prochain passage si Docker Desktop est indisponible ou si la copie de travail est sur une autre branche. GitHub publie les images après les tests et Trivy. Le script sélectionne les images web et API de la même révision et conserve les volumes Docker existants.

Si les images sont privées, connecte-toi à GHCR une fois avec le même compte Windows avant d’installer la tâche. Vérifie l’heure et le résultat de la dernière exécution dans PowerShell :

```powershell
Get-ScheduledTaskInfo -TaskName 'TekkiPro - Synchronisation dev'
```

Pour tester une construction locale avec `-Build`, mets la tâche en pause et attends la fin d’une éventuelle synchronisation en cours. Réactive-la ensuite pour reprendre les mises à jour GHCR :

```powershell
Disable-ScheduledTask -TaskName 'TekkiPro - Synchronisation dev'
Enable-ScheduledTask -TaskName 'TekkiPro - Synchronisation dev'
```

## Développer avec Docker

Après avoir modifié le code, reconstruis l’image depuis le dépôt.

```powershell
.\deploy\dev-local\Sync-Dev.ps1 -Build
```

Crée une boutique fictive depuis la page d’inscription. En local, le serveur utilise le mode développement sans SMTP.

Les volumes de cette instance sont dédiés au développement. La base et les fichiers restent en place lors d’une reconstruction. Conserve aussi `deploy/dev-local/.env`, qui contient la clé locale générée au premier démarrage. Les données d’une ancienne installation Compose vivent dans leurs volumes d’origine. Utilise une sauvegarde et une restauration pour les transférer.

Pour voir les journaux ou arrêter l’instance en conservant les volumes :

```powershell
docker --context desktop-linux compose --env-file deploy/dev-local/.env -f deploy/dev-local/compose.yaml logs --tail 100
docker --context desktop-linux compose --env-file deploy/dev-local/.env -f deploy/dev-local/compose.yaml stop
```

Les pull requests vers `dev` construisent et démarrent cette configuration dans GitHub Actions. Après validation d’un push sur `dev`, le workflow publie les images de développement sur GHCR. La mise en service sur un serveur reste une étape distincte.
