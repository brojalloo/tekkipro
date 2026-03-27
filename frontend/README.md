# TekkiPro Frontend

Client web React + Vite pour TekkiPro.

## Documentation liée
- `../README.md`
- `../docs/README.md`
- `../docs/frontend-messaging.md`
- `../docs/CONTRAT_ERREURS_API.md`

## Configuration
1. Copier `./.env.example` vers `.env`
2. Configurer `VITE_API_URL`

Exemples :
- dev local direct : `http://localhost:5000/api`
- derrière reverse proxy frontend : `/api`

## Commandes principales
- `npm ci`
- `npm run dev`
- `npm run lint`
- `npm test`
- `npm run test:watch`
- `npm run build`
- `npm run preview`

## Démarrage local
Depuis ce dossier :
1. `npm ci`
2. vérifier `VITE_API_URL`
3. `npm run dev`

Application locale par défaut : `http://localhost:5173`

## Structure rapide
- `src/pages/` : pages métier principales
- `src/components/` : composants réutilisables
- `src/context/` : auth et état global
- `src/lib/` : client API, helpers erreur/succès, stockage auth
- `src/services/` : intégration API

## Qualité
- `npm run lint` : lint ESLint
- `npm test` : suite Vitest
- `npm run build` : build production Vite

## Conventions importantes
- messages visibles : `../docs/frontend-messaging.md`
- erreurs API : `../docs/CONTRAT_ERREURS_API.md`
- préférer `getApiErrorMessage`, `getApiSuccessMessage` et `getLocalSuccessMessage` aux chaînes dispersées

## Notes
- le projet utilise actuellement Vite 8 beta ; toute évolution de l'outillage build doit être testée via `npm run build`
- le frontend est prévu pour fonctionner soit avec une URL API complète, soit via proxy `/api`
