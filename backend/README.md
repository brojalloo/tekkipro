TekkiPro Backend

API Node.js / Express / Prisma de TekkiPro.

## Documentation liée
- `../README.md`
- `../docs/README.md`
- `../docs/CONTRAT_ERREURS_API.md`
- `../docs/frontend-messaging.md`

## Prérequis
- Node.js 20 recommandé
- npm
- PostgreSQL accessible via `DATABASE_URL`

## Configuration
1. Copier `./.env.example` vers `.env`
2. Renseigner au minimum :
   - `DATABASE_URL`
   - `JWT_SECRET`
   - `FRONTEND_URL`
   - `APP_URL`
3. Ajouter les variables SMTP / Stripe seulement si ces flux sont utilisés

Le détail des validations sensibles se trouve dans `src/config/env.js`.

## Commandes principales
- `npm ci`
- `npm run dev` : démarrage avec nodemon
- `npm start` : démarrage simple
- `npm test` : tests Node natifs
- `npm run test:watch` : tests en watch
- `npm run lint` : vérification syntaxique JS

## Prisma
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run prisma:seed`
- `npm run prisma:studio`

## Démarrage local
Depuis ce dossier :
1. `npm ci`
2. `npm run prisma:generate`
3. `npm run prisma:migrate`
4. `npm run dev`

API locale par défaut : `http://localhost:5000/api`

## Structure rapide
- `src/modules/` : domaines métier (auth, catalog, sales, stock, payments, etc.)
- `src/middleware/` : auth, sécurité, validations communes
- `src/config/` : environnement et configuration serveur
- `tests/` : tests backend
- `prisma/` : schéma et seed

## Notes qualité
- `npm test` est la commande standard à utiliser en local et en CI
- `npm run lint` est pour l'instant un garde-fou syntaxique basé sur `node --check`
- le contrat d'erreur client/API est documenté dans `../docs/CONTRAT_ERREURS_API.md`

## Exemple rapide d'appel API

### cURL
`curl -X POST http://localhost:5000/api/produits -H "Content-Type: application/json" -H "Authorization: Bearer <TOKEN>" -d '{"nom":"Test Riz Pack via HTTP","commercialMode":"poids","commercialSize":50,"commercialCount":2,"uniteBase":"g","prixVente":15000,"prixAchat":10000,"stockAlerte":0}'`

### PowerShell
`$body = @{ nom = 'Test Riz Pack via HTTP'; commercialMode = 'poids'; commercialSize = 50; commercialCount = 2; uniteBase = 'g'; prixVente = 15000; prixAchat = 10000; stockAlerte = 0 } | ConvertTo-Json`

`Invoke-RestMethod -Uri 'http://localhost:5000/api/produits' -Method Post -ContentType 'application/json' -Headers @{ Authorization = 'Bearer <TOKEN>' } -Body $body`

Si vous voyez l'erreur `Expected property name or '}' in JSON`, le JSON envoyé est mal formé ou le header `Content-Type: application/json` manque.
