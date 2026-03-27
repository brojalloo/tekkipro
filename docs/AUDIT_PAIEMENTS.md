# Audit paiements TekkiPro

## Portée analysée
- `backend/src/modules/payments/payment.controller.js`
- `backend/src/modules/payments/payment.routes.js`
- `backend/src/modules/abonnements/abonnement.controller.js`
- `frontend/src/pages/Abonnement.jsx`
- `backend/prisma/schema.prisma`

## Vue d'ensemble
TekkiPro mélange aujourd'hui deux systèmes :
- un flux récent via `/api/payments/*` pour Stripe, Wave, Orange Money et Free Money
- un flux legacy via `/api/abonnements/*` pour souscription/renouvellement manuels

Cette coexistence crée des incohérences fonctionnelles et des risques de paiement non confirmé mais activé.

## État par moyen de paiement
### Stripe
- Souscription : partiellement implémentée via Checkout + webhook
- Renouvellement : backend prévu, mais frontend ne l'utilise pas correctement
- Vérification session : présente, mais contrôle d'appartenance boutique insuffisant

### Wave
- Mode API : initiation présente, mais pas de callback/webhook de confirmation observé
- Mode démo : active immédiatement l'abonnement

### Orange Money
- API live non finalisée
- Fallback actuel : simulation avec activation immédiate

### Free Money
- Flux 100% simulé
- Activation immédiate sans vérification externe

### Virement / Cash
- Flux legacy manuel disponible via `/api/abonnements/*`
- À réserver à une validation interne ou manuelle, pas à un paiement automatisé public

## Problèmes critiques
### 1. Le renouvellement peut contourner le vrai paiement
Dans `frontend/src/pages/Abonnement.jsx`, le renouvellement appelle `/api/abonnements/renouveler` pour tous les modes.

Conséquence :
- un renouvellement `STRIPE` peut prolonger l'abonnement sans Checkout Stripe réel
- idem pour les autres modes si le backend legacy est utilisé comme source d'autorité

### 2. Les flux live créent parfois un abonnement `ACTIF` avant confirmation
Dans `payment.controller.js`, Stripe souscription et Wave API créent un abonnement avec `statut: 'ACTIF'` avant confirmation finale.

Conséquence :
- historique et état d'abonnement ambigu
- risque d'affichage faux côté UI
- base métier moins fiable

### 3. `verifyStripeSession` ne filtre pas par boutique courante
La route Stripe de vérification retrouve le paiement par `stripeSessionId`, sans vérifier explicitement `req.boutiqueId`.

Conséquence :
- fuite possible d'information si un utilisateur authentifié connaît un `sessionId`

### 4. Wave live n'a pas de confirmation fiable observée
Le frontend traite `payment=success` sans `session_id` comme un succès générique.

Conséquence :
- retour navigateur potentiellement interprété comme succès
- mais paiement backend possiblement toujours `EN_ATTENTE`

### 5. Les modes démo peuvent être confondus avec des paiements réels
Wave sans clé API, Orange Money sans API live, et Free Money activent directement l'abonnement.

Conséquence :
- risque commercial et financier majeur si exposé tel quel en prod

### 6. Pas de garde visible contre les doubles clics / duplications
Je n'ai pas vu d'idempotency key ni de verrouillage serveur sur la création de sessions ou paiements.

Conséquence :
- abonnements ou paiements en double
- enregistrements `EN_ATTENTE` multiples

## Niveau de préparation par provider
- Stripe souscription : moyen
- Stripe renouvellement : faible
- Wave live : faible
- Orange Money live : non prêt
- Free Money : démo uniquement
- Virement/Cash : manuel uniquement

## Recommandations prioritaires
### Priorité 1
- Unifier tout le paiement autour d'un seul système métier
- Supprimer le contournement via `/api/abonnements/renouveler` pour les modes automatisés
- Ne passer `ACTIF` qu'après confirmation réelle du paiement

### Priorité 2
- Filtrer `verifyStripeSession` par boutique courante
- Désactiver explicitement les providers démo en production
- Ajouter une stratégie d'idempotence côté serveur

### Priorité 3
- Ajouter une confirmation fiable Wave (webhook, callback signé, polling provider)
- Finaliser ou masquer Orange Money tant que l'intégration n'est pas prête
- Ajouter des tests E2E paiements souscription + renouvellement

## Décision recommandée avant mise en ligne publique
### Autoriser
- Stripe souscription, après validation sandbox/public complète

### Restreindre
- Virement/Cash à un usage interne ou support manuel

### Désactiver en prod tant que non validé
- Wave démo
- Orange Money fallback simulé
- Free Money simulé
- Renouvellement automatisé non vérifié

## Conclusion
Le module paiements est prometteur, mais il n'est pas encore homogène ni suffisamment sûr pour une ouverture publique complète sur tous les moyens de paiement.

Le chemin le plus sûr est :
- 1 provider principal fiable (Stripe) validé de bout en bout
- renouvellement corrigé
- modes démo masqués en production
- puis activation progressive des paiements locaux après validation réelle.