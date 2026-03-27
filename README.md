# TekkiPro

TekkiPro est un SaaS de gestion de boutique avec trois applications dans ce dépôt :
- `backend/` : API Node.js / Express / Prisma
- `frontend/` : client web React + Vite
- `mobile/` : client mobile React Native / Expo

## Documentation utile
- `docs/README.md`
- `docs/CONTRAT_ERREURS_API.md`
- `docs/frontend-messaging.md`
- `docs/MISE_EN_PROD_CHECKLIST.md`

## Prérequis
- Node.js 20 recommandé
- npm
- PostgreSQL pour le backend
- Expo / Android Studio si vous lancez le mobile sur émulateur/appareil

## Configuration rapide
1. Copier les exemples d'environnement :
   - `backend/.env.example`
   - `frontend/.env.example`
   - `mobile/.env.example`
2. Adapter les URLs et secrets à votre environnement local.
3. Installer les dépendances dans chaque package avec `npm ci`.

## Démarrage local

### Backend
Depuis `backend/` :
- `npm ci`
- `npm run prisma:generate`
- `npm run prisma:migrate`
- `npm run dev`

API locale par défaut : `http://localhost:5000/api`

### Frontend
Depuis `frontend/` :
- `npm ci`
- `npm run dev`

Application web locale par défaut : `http://localhost:5173`

### Mobile
Depuis `mobile/` :
- `npm ci`
- `npm start`

Selon votre cas :
- `npm run android`
- `npm run ios`
- `npm run web`

## Commandes qualité

### Backend
- `npm test`
- `npm run lint`

### Frontend
- `npm run lint`
- `npm test`
- `npm run build`

### Mobile
- `npm run lint`
- `npm test`
- `npm run smoke:runtime`

## Structure rapide
- `backend/src/modules` : logique métier par domaine
- `backend/tests` : tests backend
- `frontend/src/pages` : pages principales web
- `frontend/src/lib` : clients API, helpers erreur/succès, stockage auth
- `mobile/src/screens` : écrans principaux mobile
- `mobile/src/lib` : client API mobile, i18n, stockage session

## Notes
- Le frontend appelle l'API via `VITE_API_URL`.
- Le mobile peut utiliser `EXPO_PUBLIC_API_URL` en dev, sinon il tente de déduire une URL locale Expo.
- Le backend valide davantage de variables en production ; voir `backend/src/config/env.js`.

## Statut qualité actuel
- backend : tests Node natifs disponibles
- frontend : lint, tests et build disponibles
- mobile : tests Jest et smoke runtime disponibles

La CI GitHub Actions du dépôt exécute désormais les vérifications principales sur chaque `push` et `pull_request`.