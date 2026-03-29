# Logs d'Audit Boutique — Design Spec

## Objectif

Permettre à l'admin d'une boutique de voir l'historique d'activité : qui a fait quoi et quand. Vue simplifiée (messages lisibles, sans détails avant/après).

## Périmètre

- Visible par l'admin uniquement
- Actions tracées : ventes (création, annulation), produits (création, modification, suppression), stock (ajustement manuel), connexions réussies
- Interface : page "Activité" dans le menu latéral frontend web

---

## Architecture

### Utilitaire backend

Fichier : `backend/src/common/utils/auditLog.js`

Fonction unique `logAudit(prisma, { action, entite, entiteId, message, userId, boutiqueId })` appelée manuellement dans chaque controller concerné. Enregistre un `AuditLog` en base. Les erreurs de log ne doivent jamais faire échouer l'action principale (try/catch silencieux).

### Controllers modifiés

| Fichier | Actions tracées |
|---------|----------------|
| `backend/src/modules/sales/vente.controller.js` | CREATE (vente créée + montant), CANCEL (vente annulée) |
| `backend/src/modules/catalog/produit.controller.js` | CREATE (produit créé), UPDATE (nom ou prix modifié), DELETE (produit supprimé) |
| `backend/src/modules/inventory/stock.controller.js` | STOCK_ADJUST (ajustement manuel + quantité) |
| `backend/src/modules/auth/auth.controller.js` | CREATE (connexion réussie + email) |

### Nouveau module audit

```
backend/src/modules/audit/
├── audit.routes.js      — GET /api/audit (auth + adminOnly)
├── audit.controller.js  — getAuditLogs (paginé, filtrable par date)
```

Route : `GET /api/audit?startDate=&endDate=&page=&limit=`

Réponse :
```json
{
  "data": [
    {
      "id": 1,
      "action": "CREATE",
      "entite": "vente",
      "message": "Jean a créé une vente de 15 000 CFA",
      "utilisateur": { "nom": "Jean Dupont", "email": "jean@boutique.com" },
      "createdAt": "2026-03-29T10:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 45 }
}
```

La réponse ne retourne PAS les champs `avant`/`apres` (stockés en DB pour usage futur mais non exposés).

---

## Frontend

### Nouvelle page

Fichier : `frontend/src/pages/Activite.jsx`

- Route : `/app/activite`
- Menu latéral : icône horloge, libellé "Activité"
- Accès restreint admin uniquement (redirection si employé)

### Interface

- Liste chronologique paginée (20 entrées par page)
- Chaque entrée : icône colorée par type d'action + message lisible + nom utilisateur + date relative ("il y a 2h")
- Filtre période : Aujourd'hui / 7 derniers jours / 30 derniers jours (défaut: 7 jours)
- Pas de recherche texte (hors périmètre)

### Palette icônes/couleurs

| Action | Icône | Couleur |
|--------|-------|---------|
| CREATE | FiPlus | vert `#1B5E20` |
| UPDATE | FiEdit2 | bleu `#1565C0` |
| DELETE | FiTrash2 | rouge `#D32F2F` |
| CANCEL | FiXCircle | orange `#E65100` |
| STOCK_ADJUST | FiPackage | jaune `#F9A825` |
| Connexion | FiLogIn | gris `#546E7A` |

---

## Enregistrement dans routes.js

Ajouter dans `backend/src/app/routes.js` :
```js
app.use('/api/audit', auditRoutes);
```

---

## Hors périmètre

- Détails avant/après (stockés en DB mais non affichés)
- Filtres par utilisateur ou par type d'action
- Export CSV
- Panel super-admin (projet 2 séparé)
- App mobile
