# Upsell Layer — Design Spec
**Date :** 2026-03-26
**Statut :** Approuvé
**Objectif :** Augmenter les conversions GRATUIT → PRO/BUSINESS via une friction douce (soft frustration) qui montre en permanence la valeur manquée, sans jamais bloquer le workflow.

---

## 1. Contexte & Problème

TekkiPro propose 3 plans : GRATUIT, PRO, BUSINESS. Les utilisateurs Gratuit ne voient pas suffisamment ce qu'ils ratent, ce qui réduit la motivation à upgrader.

**Approche retenue :** Upsell Layer systématique — couche visuelle passive sur tous les touchpoints, basée sur 4 primitives réutilisables et des headers de quota backend.

**Ce que ce n'est pas :** popups agressifs, blocage de workflow, modification du flow de vente.

---

## 2. Les 4 Primitives Visuelles

### 2.1 `<UsageMeter>`
Barre de progression montrant l'utilisation d'une limite de plan.

```
Ventes ce mois     87 / 100   ████████░░  87%
                              [Passer au PRO →]   ← apparaît à ≥ 80%
```

- Couleur : vert → orange à 70% → rouge à 90%
- CTA upgrade visible uniquement à **≥ 80%** d'utilisation
- Variante **compact** pour mobile (barre + chiffre, sans label)
- Props : `label`, `used`, `limit`, `unit`, `showUpgradeCta`

### 2.2 `<ProBadge>`
Badge inline discret sur toute feature verrouillée.

```
[PDF]  🔒 PRO          [Fournisseurs]  ✦ PRO
```

- Deux variantes : `icon-only` (sidebar collapsed) et `label` (sidebar étendue)
- Style : fond `#FFD600/15`, texte `#B8860B`
- Cliquable → redirige vers `/app/abonnement`

### 2.3 `<FeaturePreview>`
Remplace le contenu d'une page verrouillée par un aperçu skeleton + CTA.

```
┌─────────────────────────────────────────┐
│  [icône floue]  Fournisseurs            │
│  ░░░░░░░░░░  Nom fournisseur            │  ← skeleton animé
│  ░░░░░░  Téléphone                      │
│  ░░░░░░░░░░░░  Email                    │
│                                         │
│  ✦ Fonctionnalité PRO                   │
│  Gérez vos partenaires d'appro...       │
│  [Débloquer avec PRO →]                 │
└─────────────────────────────────────────┘
```

- Étend `UpgradeBanner` existant en ajoutant des skeleton rows animés
- CTA principal : `bg-[#1B5E20] text-white`

### 2.4 `<ProTooltip>`
Wrapper transparent qui intercepte hover (web) / press (mobile) sur un élément verrouillé.

```jsx
<ProTooltip feature="fournisseurs" requiredPlan="PRO">
  <Button disabled>Nouveau fournisseur</Button>
</ProTooltip>
```

- Si `requiredPlan` > plan actuel → affiche tooltip avec nom feature + plan requis + lien upgrade
- Sinon → laisse passer l'événement normalement
- **Web :** tooltip classique au hover
- **Mobile :** bottom sheet léger au tap

---

## 3. Les 8 Touchpoints

### Web Frontend

| Touchpoint | Primitives | Déclencheur |
|---|---|---|
| Sidebar | `ProBadge` + `ProTooltip` | Items nav verrouillés |
| Dashboard | `UsageMeter` × 3 (ventes, produits, clients) | Chaque visite |
| NouvelleVente | `UsageMeter` ventes/mois | Compteur visible en temps réel |
| Stock | `UsageMeter` produits | À l'approche de la limite |
| Dettes | `ProBadge` sur bouton export PDF | Toujours visible |
| Fournisseurs (locked) | `FeaturePreview` | Accès page |
| Employés (locked) | `FeaturePreview` | Accès page |
| ProduitForm / ClientForm | `UsageMeter` inline | Formulaire ouvert |

### Mobile

| Touchpoint | Primitives | Déclencheur |
|---|---|---|
| DashboardScreen | `UsageMeter` compact | Chaque visite |
| ActionItems verrouillés | `ProBadge` + `ProTooltip` (bottom sheet) | Tap sur action locked |

---

## 4. Data Flow

### 4.1 Initialisation au login

`GET /auth/me` renvoie les usages courants dans la réponse :

```json
{
  "user": { ... },
  "boutique": { ... },
  "plan": "GRATUIT",
  "planUsage": {
    "ventesParMois": { "used": 87, "limit": 100 },
    "produits":      { "used": 32, "limit": 50 },
    "clients":       { "used": 18, "limit": 30 }
  }
}
```

`AuthContext` stocke `planUsage` en state. Les composants lisent depuis ce contexte.

### 4.2 Mise à jour en temps réel via headers

Après chaque POST qui consomme un quota, le backend émet des headers :

```
X-Plan-Tier: GRATUIT
X-Quota-Ventes-Used: 88
X-Quota-Ventes-Limit: 100
```

L'intercepteur Axios parse ces headers et appelle `updatePlanUsage()` dans `AuthContext` — pas de re-render global, juste mise à jour du sous-état `usage`.

```js
// src/services/api.js
api.interceptors.response.use(res => {
  const used  = res.headers['x-quota-ventes-used'];
  const limit = res.headers['x-quota-ventes-limit'];
  if (used !== undefined) updatePlanUsage({ ventesUsed: +used, ventesLimit: +limit });
  return res;
});
```

**Endpoints émettant des headers :**

| Endpoint | Headers |
|---|---|
| `POST /ventes` | `X-Quota-Ventes-Used/Limit` |
| `POST /produits` | `X-Quota-Produits-Used/Limit` |
| `POST /clients` | `X-Quota-Clients-Used/Limit` |

Les GET ne changent pas les quotas → pas de headers → zéro overhead.

### 4.3 Flux complet

```
POST /ventes
  → vente.controller.js (logique métier)
  → attachQuotaHeaders('Ventes') middleware
  → Response 201 + X-Quota-* headers
  → Axios interceptor (frontend)
  → updatePlanUsage() → AuthContext.usage
  → <UsageMeter> re-render
```

### 4.4 Mobile

`AuthContext` mobile reçoit `planUsage` au login → stocké en mémoire (pas AsyncStorage, données volatiles) → `UsageMeter` compact lit depuis le contexte.

---

## 5. Nouveau Middleware Backend

```js
// backend/src/middleware/quota.middleware.js
const attachQuotaHeaders = (quotaType) => async (req, res, next) => {
  const original = res.json.bind(res);
  res.json = async (body) => {
    if (res.statusCode < 400) {
      const usage = await getQuotaUsage(req.boutiqueId, quotaType);
      res.setHeader(`X-Quota-${quotaType}-Used`, usage.used);
      res.setHeader(`X-Quota-${quotaType}-Limit`, usage.limit);
      res.setHeader('X-Plan-Tier', req.boutique?.plan || 'GRATUIT');
    }
    return original(body);
  };
  next();
};
```

Appliqué uniquement sur les 3 routes POST — zéro impact sur les autres endpoints.

---

## 6. Fichiers Créés / Modifiés

| Fichier | Action |
|---|---|
| `frontend/src/components/UsageMeter.jsx` | Nouveau |
| `frontend/src/components/ProBadge.jsx` | Nouveau |
| `frontend/src/components/ProTooltip.jsx` | Nouveau |
| `frontend/src/components/UpgradeBanner.jsx` | Étendu (FeaturePreview) |
| `frontend/src/services/api.js` | Intercepteur quota headers |
| `frontend/src/context/AuthContext.jsx` | Ajout `planUsage` state + `updatePlanUsage()` |
| `frontend/src/pages/Dashboard.jsx` | Ajout 3× UsageMeter |
| `frontend/src/pages/NouvelleVente.jsx` | Ajout UsageMeter ventes/mois |
| `frontend/src/pages/Stock.jsx` | Ajout UsageMeter produits |
| `frontend/src/pages/Dettes.jsx` | Ajout ProBadge export PDF |
| `frontend/src/components/Layout.jsx` | ProBadge + ProTooltip sur nav items |
| `backend/src/middleware/quota.middleware.js` | Nouveau |
| `backend/src/modules/auth/auth.controller.js` | `planUsage` dans GET /me |
| `backend/src/modules/sales/vente.controller.js` | attachQuotaHeaders |
| `backend/src/modules/catalog/produit.controller.js` | attachQuotaHeaders |
| `backend/src/modules/customers/client.controller.js` | attachQuotaHeaders |
| `mobile/src/components/ProTooltip.js` | Nouveau (bottom sheet) |
| `mobile/src/screens/DashboardScreen.js` | Ajout UsageMeter compact |

---

## 7. Hors Scope (v1)

- Notifications push "tu approches de ta limite"
- Emails marketing automatiques déclenchés par seuils
- A/B testing des messages d'upgrade
- Analytics de conversion (outil tiers requis)
- Modification du flow de paiement abonnement

---

## 8. Critères de Succès

- Un utilisateur Gratuit voit son quota ventes/mois en temps réel sur le dashboard
- Les features PRO affichent un badge visible sans bloquer la navigation
- Aucun appel API supplémentaire au runtime (tout vient des headers POST existants)
- Le CTA upgrade n'apparaît que quand l'usage ≥ 80%
- Zéro régression sur le plan PRO/BUSINESS (primitives transparentes si plan suffisant)
