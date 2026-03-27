# TekkiPro Mobile

Client mobile React Native / Expo pour TekkiPro.

## Documentation liée
- `../README.md`
- `../docs/README.md`
- `../docs/frontend-messaging.md`
- `../docs/CONTRAT_ERREURS_API.md`

## Configuration
1. Copier `./.env.example` vers `.env`
2. Configurer `EXPO_PUBLIC_API_URL`
3. En développement Android HTTP local, laisser `EXPO_PUBLIC_ALLOW_CLEARTEXT=true` si nécessaire

Exemples d'URL :
- émulateur Android : `http://10.0.2.2:5000/api`
- réseau local : `http://192.168.x.x:5000/api`

## Commandes principales
- `npm ci`
- `npm start`
- `npm run android`
- `npm run ios`
- `npm run web`
- `npm run lint`
- `npm test`
- `npm run test:watch`
- `npm run smoke:runtime`

## Démarrage local
Depuis ce dossier :
1. `npm ci`
2. vérifier `EXPO_PUBLIC_API_URL`
3. `npm start`
4. ouvrir ensuite Android / iOS / Web selon votre cible

## Structure rapide
- `src/screens/` : écrans métier
- `src/navigation/` : navigation
- `src/context/` : thème, auth et état partagé
- `src/lib/` : API, i18n, helpers erreur/succès, stockage session
- `scripts/` : smoke checks et utilitaires de dev

## Qualité
- `npm run lint` : vérification syntaxique JS via `node --check`
- `npm test` : suite Jest
- `npm run smoke:runtime` : garde-fous runtime rapides

## Notes techniques
- les sessions utilisent `expo-secure-store`
- l'URL API peut être déduite automatiquement par certaines briques Expo, mais `EXPO_PUBLIC_API_URL` reste la source la plus explicite
- si vous ajoutez des messages visibles utilisateur, suivre `../docs/frontend-messaging.md`