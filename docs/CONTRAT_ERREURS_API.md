# Contrat d'erreurs API TekkiPro

## Objectif
Cette note décrit le format d'erreur commun renvoyé par le backend TekkiPro.

Elle doit servir de référence pour :
- le frontend web
- l'application mobile
- les intégrations futures

Principe clé : **les clients doivent s'appuyer d'abord sur `code`, pas sur `message`**.

Voir aussi : `docs/frontend-messaging.md` pour les conventions d'affichage côté clients web/mobile.

## 1. Structure commune d'une erreur métier
Pour les erreurs métier et techniques hors validation, le backend renvoie le format suivant :

```json
{
  "success": false,
  "code": "SOME_ERROR_CODE",
  "message": "Message lisible côté humain"
}
```

Champs possibles :
- `success` : toujours `false`
- `code` : code machine stable à consommer côté client
- `message` : message lisible pour journalisation ou UI
- `details` : détails structurés additionnels quand disponibles
- autres métadonnées utiles selon le cas, par ex. `upgrade`, `requiredPlan`, `provider`

## 2. Structure d'une erreur de validation
Les erreurs de validation ont un format distinct avec détail par champ :

```json
{
  "success": false,
  "code": "VALIDATION_ERROR",
  "message": "La requête contient des données invalides.",
  "errorCount": 2,
  "errors": [
    {
      "field": "email",
      "message": "Email invalide",
      "location": "body",
      "code": "INVALID_FORMAT"
    }
  ]
}
```

Chaque entrée de `errors` contient :
- `field` : champ concerné
- `message` : message de validation lisible
- `location` : `body`, `params`, `query`, etc.
- `code` : catégorie de validation

## 3. Mapping par défaut status HTTP -> code
Quand aucun code plus spécifique n'est fourni, le backend utilise :

- `400` -> `BAD_REQUEST`
- `401` -> `UNAUTHORIZED`
- `403` -> `FORBIDDEN`
- `404` -> `NOT_FOUND`
- `409` -> `CONFLICT`
- `429` -> `RATE_LIMITED`
- `500` -> `INTERNAL_ERROR`
- `503` -> `SERVICE_UNAVAILABLE`

## 4. Codes de validation actuellement utilisés
- `VALIDATION_ERROR` : enveloppe globale des erreurs de validation
- `REQUIRED_FIELD` : champ requis manquant
- `INVALID_IDENTIFIER` : identifiant invalide
- `INVALID_FORMAT` : format invalide
- `INVALID_LENGTH` : longueur invalide
- `INVALID_VALUE` : valeur invalide

## 5. Codes métier principaux par domaine
### Authentification / autorisation
- `AUTH_REQUIRED`
- `INVALID_TOKEN`
- `USER_INACTIVE_OR_MISSING`
- `ADMIN_ONLY`
- `INVALID_CREDENTIALS`
- `ACCOUNT_DISABLED`
- `EMAIL_NOT_VERIFIED`
- `EMAIL_REQUIRED`
- `EMAIL_ALREADY_USED`
- `EMAIL_ALREADY_VERIFIED`
- `WEAK_PASSWORD`
- `VERIFICATION_TOKEN_REQUIRED`
- `INVALID_VERIFICATION_TOKEN`
- `INVALID_RESET_TOKEN`
- `RESET_PASSWORD_FIELDS_REQUIRED`

### Plans / abonnements / limitations
- `PLAN_UPGRADE_REQUIRED`
- `PLAN_CHECK_FAILED`
- `INVALID_PLAN`
- `INVALID_SUBSCRIPTION_TYPE`
- `INVALID_RENEWAL_CONTEXT`

### Sécurité plateforme
- `BAD_JSON`
- `FORBIDDEN_ORIGIN`
- `RATE_LIMIT_EXCEEDED`

### Paiements
- `PAYMENT_PROVIDER_NOT_CONFIGURED`
- `STRIPE_NOT_CONFIGURED`
- `INVALID_STRIPE_SIGNATURE`
- `STRIPE_SESSION_CREATE_FAILED`
- `STRIPE_SESSION_VERIFY_FAILED`
- `STRIPE_WEBHOOK_FAILED`
- `WAVE_PHONE_REQUIRED`
- `WAVE_PAYMENT_FAILED`
- `ORANGE_MONEY_PHONE_REQUIRED`
- `ORANGE_MONEY_NOT_AVAILABLE`
- `ORANGE_MONEY_PAYMENT_FAILED`
- `FREE_MONEY_PHONE_REQUIRED`
- `FREE_MONEY_PAYMENT_FAILED`
- `PAYMENT_NOT_FOUND`
- `PAYMENT_STATUS_FETCH_FAILED`

### Ventes
- `SALE_DETAILS_REQUIRED`
- `SALE_CREATE_FAILED`
- `SALES_FETCH_FAILED`
- `SALE_NOT_FOUND`
- `SALE_FETCH_FAILED`
- `SALE_ALREADY_CANCELLED`
- `SALE_CANCEL_FAILED`

### Catalogue / produits
- `PRODUCTS_FETCH_FAILED`
- `PRODUCT_NOT_FOUND`
- `PRODUCT_FETCH_FAILED`
- `INVALID_PEREMPTION_PAYLOAD`
- `INVALID_AUTOMATIC_PRODUCT_CONFIG`
- `PRODUCT_CREATE_FAILED`
- `PRODUCT_UPDATE_FAILED`
- `PRODUCT_REMOVE_FAILED`
- `UNIT_FIELDS_REQUIRED`
- `UNIT_NOT_FOUND`
- `UNIT_CREATE_FAILED`
- `UNIT_REMOVE_FAILED`
- `UNIT_UPDATE_FAILED`
- `STOCK_ALERTS_FETCH_FAILED`

## 6. Exemples de consommation côté client
### Cas 1 : forcer une reconnexion ou réauth
- `AUTH_REQUIRED`
- `INVALID_TOKEN`

### Cas 2 : afficher un blocage d'abonnement
- `PLAN_UPGRADE_REQUIRED`
- utiliser aussi `upgrade === true`
- lire `requiredPlan` si présent

### Cas 3 : affichage formulaire
- si `code === VALIDATION_ERROR`, utiliser `errors[]`
- sinon afficher un message global basé sur `code`

## 7. Recommandations frontend/mobile
- ne pas parser `message` pour piloter la logique métier
- mapper l'UI sur `code`
- pour les formulaires, exploiter `errors[].field`
- journaliser `details` et métadonnées, mais ne pas les rendre obligatoires côté client

## 8. Source d'autorité backend
Implémentation actuelle :
- `backend/src/common/utils/response.js`
- `backend/src/common/errors/AppError.js`
- `backend/src/middleware/validation.middleware.js`
- `backend/src/server.js`

Si un nouveau contrôleur renvoie une erreur API, il doit passer par ces helpers pour conserver ce contrat.