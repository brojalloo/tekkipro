# Guide de messaging client TekkiPro

## Objectif
Cette note fixe les règles simples pour les messages visibles côté client :
- frontend web
- application mobile

Elle complète `docs/CONTRAT_ERREURS_API.md`.

## Helpers à utiliser

### Succès
- message issu de l'API : `getApiSuccessMessage(response, options)`
- message local UI : `getLocalSuccessMessage(options)`

### Erreurs
- utiliser `getApiErrorMessage(error, options)`
- ne pas lire directement `error.response?.data?.message`

## Règle de décision
- **API** -> `getApiSuccessMessage`
- **UI locale** -> `getLocalSuccessMessage`
- **Erreur** -> `getApiErrorMessage`

## Wording recommandé
Préférer des formulations stables et courtes :
- `X créé avec succès.`
- `X mis à jour avec succès.`
- `X supprimé avec succès.`
- `X enregistré avec succès.`
- `X annulé avec succès.`

## Variantes à éviter
- ponctuation expressive inutile : `!`
- emojis dans les toasts standards
- verbes incohérents pour une même action (`modifié`, `updated`, `ok`, etc.)

## Messages dynamiques autorisés
Utiliser un message dynamique seulement si l'information affichée aide vraiment l'utilisateur.

Exemples acceptables :
- `Vente VNT-50 enregistrée avec succès.`
- `Produit Lait frais ajouté à la vente.`
- `Code-barres scanné : 777888999`

## Checklist PR

### Succès
- [ ] Si le message vient de l'API, utiliser `getApiSuccessMessage(...)`
- [ ] Sinon utiliser `getLocalSuccessMessage(...)`
- [ ] Respecter le wording standard en `... avec succès.` si possible
- [ ] Garder les messages dynamiques seulement quand ils apportent une vraie info métier

### Erreurs
- [ ] Utiliser `getApiErrorMessage(...)`
- [ ] Prévoir un `fallback` court et clair
- [ ] Conserver les cas spéciaux (`upgrade`, auth, permissions, etc.) dans les helpers existants

### Tests
- [ ] Mettre à jour les assertions si le wording visible change
- [ ] Ajouter un test helper si un nouveau type de message local est introduit
- [ ] Lancer au minimum les tests ciblés du fichier touché

### Revue rapide
- [ ] Pas de `toast.success('...')` arbitraire quand un helper existe
- [ ] Pas de `Alert.alert(...success...)` arbitraire côté mobile si un helper ou un objet `TEXT` existe
- [ ] Pas de `console.error` résiduel dans un flux utilisateur