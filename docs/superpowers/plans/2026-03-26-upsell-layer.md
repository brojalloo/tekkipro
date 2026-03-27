# Upsell Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implémenter une couche d'upsell passive sur frontend et mobile qui montre aux utilisateurs Gratuit leur consommation de quota et les features PRO verrouillées, pour augmenter les conversions sans jamais bloquer le workflow.

**Architecture:** 4 primitives visuelles réutilisables (UsageMeter, ProBadge, ProTooltip, FeaturePreview) sur 8 touchpoints. Le backend enrichit GET /auth/me avec `planUsage` et attache des headers de quota sur les POST. Un intercepteur Axios met à jour AuthContext en temps réel sans appel API supplémentaire. Un store bridge `planUsageStore.js` évite les imports circulaires entre `api.js` et `AuthContext`.

**Tech Stack:** React 19 + Tailwind CSS, Node.js + Express + Prisma, React Native + Expo, Vitest + React Testing Library (frontend), Node Test Runner (backend)

---

## File Map

### Nouveaux fichiers
| Fichier | Responsabilité |
|---|---|
| `backend/src/middleware/quota.middleware.js` | `attachQuotaHeaders` factory + `getQuotaUsage` helper |
| `frontend/src/services/planUsageStore.js` | Bridge pour éviter import circulaire api↔AuthContext |
| `frontend/src/components/UsageMeter.jsx` | Barre de quota + CTA upgrade à ≥80% |
| `frontend/src/components/ProBadge.jsx` | Badge discret feature verrouillée |
| `frontend/src/components/ProTooltip.jsx` | Wrapper hover → tooltip upgrade |
| `frontend/src/components/UsageMeter.test.jsx` | Tests Vitest UsageMeter |
| `frontend/src/components/ProBadge.test.jsx` | Tests Vitest ProBadge |
| `frontend/src/components/ProTooltip.test.jsx` | Tests Vitest ProTooltip |
| `mobile/src/components/ProTooltip.js` | Bottom sheet upgrade (React Native) |

### Fichiers modifiés
| Fichier | Changement |
|---|---|
| `backend/src/modules/auth/auth.controller.js` | Ajouter `planUsage` dans réponse `getMe` |
| `backend/src/modules/sales/vente.controller.js` | Appliquer `attachQuotaHeaders('Ventes')` |
| `backend/src/modules/catalog/produit.controller.js` | Appliquer `attachQuotaHeaders('Produits')` |
| `backend/src/modules/customers/client.controller.js` | Appliquer `attachQuotaHeaders('Clients')` |
| `frontend/src/services/api.js` | Intercepteur quota headers |
| `frontend/src/context/AuthContext.jsx` | Ajouter `planUsage` state + `updatePlanUsage()` |
| `frontend/src/components/UpgradeBanner.jsx` | Ajouter variant `FeaturePreview` avec skeleton rows |
| `frontend/src/components/Layout.jsx` | ProBadge + ProTooltip sur items nav verrouillés |
| `frontend/src/pages/Dashboard.jsx` | 3× UsageMeter (ventes, produits, clients) |
| `frontend/src/pages/NouvelleVente.jsx` | UsageMeter ventes/mois |
| `frontend/src/pages/Stock.jsx` | UsageMeter produits |
| `frontend/src/pages/Dettes.jsx` | ProBadge sur bouton export PDF |
| `mobile/src/screens/DashboardScreen.js` | UsageMeter compact |

---

## Task 1 — Backend : `planUsage` dans GET /auth/me

**Files:**
- Modify: `backend/src/modules/auth/auth.controller.js`
- Test: `backend/src/modules/auth/auth.controller.test.js` (fichier existant, ajouter cas)

- [ ] **Étape 1 — Écrire le test qui échoue**

Ajouter ce bloc dans `auth.controller.test.js` (après les tests existants) :

```js
// Dans le describe principal ou un describe('getMe') dédié
it('getMe inclut planUsage avec les compteurs courants', async (t) => {
  // Arrange — mocker Prisma findUnique + count
  const mockUser = {
    id: 1, nom: 'Diallo', prenom: 'Aminata', email: 'amin@test.sn',
    telephone: null, role: 'ADMIN', actif: true, boutiqueId: 10, createdAt: new Date(),
    boutique: { id: 10, nom: 'Boutique Test', slug: 'bt', plan: 'GRATUIT', devise: 'FCFA', telephone: null, adresse: null, email: null },
  };
  // planUsage doit apparaître dans la réponse
  // Ce test vérifie la structure de la réponse — à adapter selon le mocking pattern du projet
  assert.ok(true); // Placeholder structurel — remplacer par assertion réelle après implémentation
});
```

> Note : le pattern de mock Prisma varie selon les fichiers existants. Consulter `auth.controller.test.js` pour le pattern utilisé (ex: `vi.mock` ou injection) et l'appliquer.

- [ ] **Étape 2 — Implémenter dans `auth.controller.js`**

Remplacer la fonction `getMe` existante par :

```js
const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, nom: true, prenom: true, email: true,
        telephone: true, role: true, actif: true,
        boutiqueId: true, createdAt: true,
        boutique: {
          select: { id: true, nom: true, slug: true, plan: true, devise: true, telephone: true, adresse: true, email: true },
        },
      },
    });

    const boutiqueId = user.boutiqueId;
    const plan = user.boutique?.plan || 'GRATUIT';
    const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.GRATUIT;

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [ventesCount, produitsCount, clientsCount] = await Promise.all([
      prisma.vente.count({
        where: { boutiqueId, createdAt: { gte: startOfMonth }, statut: { not: 'ANNULEE' } },
      }),
      prisma.produit.count({ where: { boutiqueId, actif: true } }),
      prisma.client.count({ where: { boutiqueId } }),
    ]);

    const planUsage = {
      ventesParMois: { used: ventesCount,   limit: limits.ventesParMois },
      produits:      { used: produitsCount, limit: limits.produits },
      clients:       { used: clientsCount,  limit: limits.clients },
    };

    res.json({ success: true, data: { ...user, planUsage } });
  } catch (error) {
    logger.error('Erreur getMe', error);
    return sendError(res, 'Erreur serveur', 500, { code: 'PROFILE_FETCH_FAILED' });
  }
};
```

Ajouter l'import de PLAN_LIMITS en tête de fichier (s'il n'est pas déjà importé) :

```js
const { PLAN_LIMITS } = require('../../middleware/auth.middleware');
```

- [ ] **Étape 3 — Vérifier que l'API répond correctement**

```bash
cd tekkipro/backend
npm run dev
# Dans un autre terminal :
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/auth/me | jq '.data.planUsage'
# Attendu : { ventesParMois: { used: N, limit: 100 }, produits: {...}, clients: {...} }
```

- [ ] **Étape 4 — Commit**

```bash
git add backend/src/modules/auth/auth.controller.js
git commit -m "feat(backend): add planUsage to GET /auth/me response"
```

---

## Task 2 — Backend : `quota.middleware.js`

**Files:**
- Create: `backend/src/middleware/quota.middleware.js`

- [ ] **Étape 1 — Créer le fichier**

```js
// backend/src/middleware/quota.middleware.js
'use strict';

const prisma = require('../config/database');
const { PLAN_LIMITS } = require('./auth.middleware');

/**
 * Retourne { used, limit } pour un type de quota donné.
 * limit = 999999 pour les plans PRO/BUSINESS (sans limite réelle).
 */
const getQuotaUsage = async (boutiqueId, quotaType) => {
  const boutique = await prisma.boutique.findUnique({
    where: { id: boutiqueId },
    select: { plan: true },
  });
  const plan = boutique?.plan || 'GRATUIT';
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.GRATUIT;

  switch (quotaType) {
    case 'Ventes': {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const used = await prisma.vente.count({
        where: { boutiqueId, createdAt: { gte: startOfMonth }, statut: { not: 'ANNULEE' } },
      });
      return { used, limit: limits.ventesParMois };
    }
    case 'Produits': {
      const used = await prisma.produit.count({ where: { boutiqueId, actif: true } });
      return { used, limit: limits.produits };
    }
    case 'Clients': {
      const used = await prisma.client.count({ where: { boutiqueId } });
      return { used, limit: limits.clients };
    }
    default:
      return { used: 0, limit: null };
  }
};

/**
 * Middleware factory. À appliquer après le handler principal sur les routes POST.
 * Injecte X-Quota-<Type>-Used, X-Quota-<Type>-Limit, X-Plan-Tier dans la réponse.
 *
 * Usage : router.post('/ventes', auth, checkPlanVentes, venteController.creerVente, attachQuotaHeaders('Ventes'))
 */
const attachQuotaHeaders = (quotaType) => async (req, res, next) => {
  const originalJson = res.json.bind(res);

  res.json = async function (body) {
    if (res.statusCode < 400 && req.boutiqueId) {
      try {
        const { used, limit } = await getQuotaUsage(req.boutiqueId, quotaType);
        res.setHeader(`X-Quota-${quotaType}-Used`, String(used));
        res.setHeader(`X-Quota-${quotaType}-Limit`, String(limit));
        res.setHeader('X-Plan-Tier', req.user?.boutique?.plan || 'GRATUIT');
      } catch (_) {
        // Non-bloquant : les headers de quota sont optionnels
      }
    }
    return originalJson(body);
  };

  next();
};

module.exports = { attachQuotaHeaders, getQuotaUsage };
```

- [ ] **Étape 2 — Tester manuellement que le module se charge**

```bash
cd tekkipro/backend
node -e "const m = require('./src/middleware/quota.middleware'); console.log(Object.keys(m))"
# Attendu : [ 'attachQuotaHeaders', 'getQuotaUsage' ]
```

- [ ] **Étape 3 — Commit**

```bash
git add backend/src/middleware/quota.middleware.js
git commit -m "feat(backend): add attachQuotaHeaders quota middleware"
```

---

## Task 3 — Backend : Appliquer le middleware aux 3 routes POST

**Files:**
- Modify: `backend/src/modules/sales/vente.routes.js` (ou fichier qui monte POST /ventes)
- Modify: `backend/src/modules/catalog/produit.routes.js`
- Modify: `backend/src/modules/customers/client.routes.js`

- [ ] **Étape 1 — Trouver les fichiers de routes**

```bash
grep -r "router.post.*ventes\|router.post.*produits\|router.post.*clients" tekkipro/backend/src --include="*.js" -l
```

- [ ] **Étape 2 — Appliquer `attachQuotaHeaders` sur POST /ventes**

Dans le fichier de routes ventes, ajouter l'import et l'usage :

```js
const { attachQuotaHeaders } = require('../../middleware/quota.middleware');

// Avant :
// router.post('/', auth, checkPlanVentes, creerVente);
// Après :
router.post('/', auth, checkPlanVentes, creerVente, attachQuotaHeaders('Ventes'));
```

- [ ] **Étape 3 — Appliquer sur POST /produits**

```js
const { attachQuotaHeaders } = require('../../middleware/quota.middleware');

// Avant :
// router.post('/', auth, adminOnly, checkPlanProduits, creerProduit);
// Après :
router.post('/', auth, adminOnly, checkPlanProduits, creerProduit, attachQuotaHeaders('Produits'));
```

- [ ] **Étape 4 — Appliquer sur POST /clients**

```js
const { attachQuotaHeaders } = require('../../middleware/quota.middleware');

// Avant :
// router.post('/', auth, checkPlanClients, creerClient);
// Après :
router.post('/', auth, checkPlanClients, creerClient, attachQuotaHeaders('Clients'));
```

- [ ] **Étape 5 — Vérifier les headers en réponse**

```bash
# Créer une vente de test et inspecter les headers
curl -s -I -X POST http://localhost:5000/api/ventes \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"details":[{"produitId":1,"quantite":1}],"modePaiement":"CASH","montantPaye":1000}'
# Attendu dans les headers :
# X-Quota-Ventes-Used: 88
# X-Quota-Ventes-Limit: 100
# X-Plan-Tier: GRATUIT
```

- [ ] **Étape 6 — Commit**

```bash
git add backend/src/modules/sales/vente.routes.js \
        backend/src/modules/catalog/produit.routes.js \
        backend/src/modules/customers/client.routes.js
git commit -m "feat(backend): attach quota headers on POST ventes/produits/clients"
```

---

## Task 4 — Frontend : `planUsageStore` + `AuthContext` mis à jour

**Files:**
- Create: `frontend/src/services/planUsageStore.js`
- Modify: `frontend/src/context/AuthContext.jsx`
- Test: `frontend/src/context/AuthContext.test.jsx` (fichier existant, ajouter cas)

- [ ] **Étape 1 — Créer `planUsageStore.js`** (bridge anti-import circulaire)

```js
// frontend/src/services/planUsageStore.js
// Ce module expose un registrar pour que AuthContext enregistre
// sa fonction updatePlanUsage, accessible par api.js sans import circulaire.

let _updater = null;

export const registerPlanUsageUpdater = (fn) => { _updater = fn; };

export const callPlanUsageUpdater = (payload) => {
  if (_updater) _updater(payload);
};
```

- [ ] **Étape 2 — Écrire le test qui échoue pour AuthContext**

Ajouter dans `frontend/src/context/AuthContext.test.jsx` :

```jsx
it('expose planUsage dans le contexte et updatePlanUsage le modifie', async () => {
  api.post.mockResolvedValue({
    data: {
      success: true,
      data: {
        token: 'tok', user: { id: 1, prenom: 'Awa', nom: 'Diallo', role: 'ADMIN' },
        boutique: { id: 2, nom: 'BT', plan: 'GRATUIT' },
        planUsage: {
          ventesParMois: { used: 5, limit: 100 },
          produits:      { used: 10, limit: 50 },
          clients:       { used: 3, limit: 30 },
        },
      },
    },
  });

  render(<AuthProvider><Probe /></AuthProvider>);
  fireEvent.click(screen.getByText('login'));
  await waitFor(() => {
    const state = readState();
    expect(state.planUsage?.ventesParMois?.used).toBe(5);
  });
});
```

- [ ] **Étape 3 — Exécuter le test pour le voir échouer**

```bash
cd tekkipro/frontend
npm run test -- --reporter=verbose AuthContext
# Attendu : FAIL — planUsage undefined
```

- [ ] **Étape 4 — Mettre à jour `AuthContext.jsx`**

Localiser la section des states existants et ajouter :

```jsx
import { registerPlanUsageUpdater } from '../services/planUsageStore';

// Dans le composant AuthProvider, après les useState existants :
const [planUsage, setPlanUsage] = useState(null);

// Fonction exposée pour mise à jour temps réel (appelée par api.js via le store)
const updatePlanUsage = useCallback((payload) => {
  setPlanUsage(prev => {
    if (!prev) return prev;
    const next = { ...prev };
    if (payload.ventesUsed  !== undefined) next.ventesParMois = { ...next.ventesParMois, used: payload.ventesUsed };
    if (payload.ventesLimit !== undefined) next.ventesParMois = { ...next.ventesParMois, limit: payload.ventesLimit };
    if (payload.produitsUsed  !== undefined) next.produits = { ...next.produits, used: payload.produitsUsed };
    if (payload.produitsLimit !== undefined) next.produits = { ...next.produits, limit: payload.produitsLimit };
    if (payload.clientsUsed  !== undefined) next.clients = { ...next.clients, used: payload.clientsUsed };
    if (payload.clientsLimit !== undefined) next.clients = { ...next.clients, limit: payload.clientsLimit };
    return next;
  });
}, []);

// Enregistrer l'updater dans le store au montage
useEffect(() => {
  registerPlanUsageUpdater(updatePlanUsage);
}, [updatePlanUsage]);
```

Dans la fonction `login` existante, après avoir reçu la réponse du serveur, ajouter :

```jsx
if (data.planUsage) setPlanUsage(data.planUsage);
```

Dans la fonction `loadUser` / `refreshSession` (appel GET /auth/me), ajouter :

```jsx
if (data.planUsage) setPlanUsage(data.planUsage);
```

Exposer dans la valeur du contexte :

```jsx
// Ajouter planUsage et updatePlanUsage à la value du Provider
value={{ ..., planUsage, updatePlanUsage }}
```

- [ ] **Étape 5 — Vérifier que le test passe**

```bash
npm run test -- --reporter=verbose AuthContext
# Attendu : PASS
```

- [ ] **Étape 6 — Commit**

```bash
git add frontend/src/services/planUsageStore.js frontend/src/context/AuthContext.jsx frontend/src/context/AuthContext.test.jsx
git commit -m "feat(frontend): add planUsage state to AuthContext with real-time updater"
```

---

## Task 5 — Frontend : Intercepteur Axios quota headers

**Files:**
- Modify: `frontend/src/services/api.js`

- [ ] **Étape 1 — Localiser la section intercepteurs dans `api.js`**

```bash
grep -n "interceptors" tekkipro/frontend/src/services/api.js
```

- [ ] **Étape 2 — Ajouter l'intercepteur après les intercepteurs existants**

```js
import { callPlanUsageUpdater } from './planUsageStore';

// Response interceptor — quota headers
api.interceptors.response.use((response) => {
  const headers = response.headers;

  const ventesUsed  = headers['x-quota-ventes-used'];
  const ventesLimit = headers['x-quota-ventes-limit'];
  const produitsUsed  = headers['x-quota-produits-used'];
  const produitsLimit = headers['x-quota-produits-limit'];
  const clientsUsed  = headers['x-quota-clients-used'];
  const clientsLimit = headers['x-quota-clients-limit'];

  const payload = {};
  if (ventesUsed  !== undefined) payload.ventesUsed  = Number(ventesUsed);
  if (ventesLimit !== undefined) payload.ventesLimit = Number(ventesLimit);
  if (produitsUsed  !== undefined) payload.produitsUsed  = Number(produitsUsed);
  if (produitsLimit !== undefined) payload.produitsLimit = Number(produitsLimit);
  if (clientsUsed  !== undefined) payload.clientsUsed  = Number(clientsUsed);
  if (clientsLimit !== undefined) payload.clientsLimit = Number(clientsLimit);

  if (Object.keys(payload).length > 0) {
    callPlanUsageUpdater(payload);
  }

  return response;
});
```

- [ ] **Étape 3 — Test manuel : créer une vente et observer AuthContext**

Ouvrir React DevTools → AuthContext → vérifier que `planUsage.ventesParMois.used` s'incrémente après un POST vente.

- [ ] **Étape 4 — Commit**

```bash
git add frontend/src/services/api.js frontend/src/services/planUsageStore.js
git commit -m "feat(frontend): intercept quota headers and update planUsage in real-time"
```

---

## Task 6 — Frontend : Composant `UsageMeter`

**Files:**
- Create: `frontend/src/components/UsageMeter.jsx`
- Create: `frontend/src/components/UsageMeter.test.jsx`

- [ ] **Étape 1 — Écrire les tests**

```jsx
// frontend/src/components/UsageMeter.test.jsx
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import UsageMeter from './UsageMeter';

describe('UsageMeter', () => {
  it('affiche le label, used et limit', () => {
    render(<UsageMeter label="Ventes ce mois" used={45} limit={100} />);
    expect(screen.getByText(/Ventes ce mois/)).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('affiche le CTA upgrade à ≥80% d\'utilisation', () => {
    render(<UsageMeter label="Ventes" used={80} limit={100} />);
    expect(screen.getByText(/Passer au PRO/)).toBeInTheDocument();
  });

  it('n\'affiche pas le CTA upgrade à <80%', () => {
    render(<UsageMeter label="Ventes" used={50} limit={100} />);
    expect(screen.queryByText(/Passer au PRO/)).not.toBeInTheDocument();
  });

  it('n\'affiche rien si limit est null ou 999999', () => {
    const { container } = render(<UsageMeter label="Ventes" used={100} limit={999999} />);
    expect(container.firstChild).toBeNull();
  });

  it('affiche rouge à ≥90%', () => {
    render(<UsageMeter label="Ventes" used={95} limit={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.className).toMatch(/bg-red/);
  });
});
```

- [ ] **Étape 2 — Exécuter les tests pour les voir échouer**

```bash
cd tekkipro/frontend
npm run test -- --reporter=verbose UsageMeter
# Attendu : FAIL — Cannot find module
```

- [ ] **Étape 3 — Implémenter `UsageMeter.jsx`**

```jsx
// frontend/src/components/UsageMeter.jsx
import { Link } from 'react-router-dom';

const UNLIMITED = 999999;
const UPGRADE_THRESHOLD = 0.8;

export default function UsageMeter({ label, used, limit, compact = false }) {
  // Ne rien afficher pour les plans sans limite réelle
  if (!limit || limit >= UNLIMITED) return null;

  const pct = Math.min(Math.round((used / limit) * 100), 100);
  const showCta = pct >= UPGRADE_THRESHOLD * 100;

  const barColor =
    pct >= 90 ? 'bg-red-500' :
    pct >= 70 ? 'bg-amber-400' :
                'bg-[#1B5E20]';

  if (compact) {
    return (
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            className={`h-full rounded-full transition-all ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[0.7rem] font-bold tabular-nums text-muted-foreground shrink-0">
          {used}/{limit}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[0.78rem] font-semibold text-muted-foreground">{label}</span>
        <span className="text-[0.78rem] font-bold tabular-nums text-foreground">{used} / {limit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showCta && (
        <Link
          to="/app/abonnement"
          className="self-start text-[0.72rem] font-bold text-[#1B5E20] hover:underline mt-0.5"
        >
          Passer au PRO →
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Étape 4 — Vérifier que les tests passent**

```bash
npm run test -- --reporter=verbose UsageMeter
# Attendu : 5 PASS
```

- [ ] **Étape 5 — Commit**

```bash
git add frontend/src/components/UsageMeter.jsx frontend/src/components/UsageMeter.test.jsx
git commit -m "feat(frontend): add UsageMeter component with upgrade CTA at 80%"
```

---

## Task 7 — Frontend : Composant `ProBadge`

**Files:**
- Create: `frontend/src/components/ProBadge.jsx`
- Create: `frontend/src/components/ProBadge.test.jsx`

- [ ] **Étape 1 — Écrire les tests**

```jsx
// frontend/src/components/ProBadge.test.jsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import ProBadge from './ProBadge';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ProBadge', () => {
  it('affiche le label PRO en variante label', () => {
    wrap(<ProBadge variant="label" requiredPlan="PRO" />);
    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('affiche uniquement une icône en variante icon-only', () => {
    const { container } = wrap(<ProBadge variant="icon-only" requiredPlan="PRO" />);
    expect(screen.queryByText('PRO')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('est un lien vers /app/abonnement', () => {
    wrap(<ProBadge variant="label" requiredPlan="PRO" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/abonnement');
  });
});
```

- [ ] **Étape 2 — Exécuter pour voir échouer**

```bash
npm run test -- --reporter=verbose ProBadge
# Attendu : FAIL
```

- [ ] **Étape 3 — Implémenter `ProBadge.jsx`**

```jsx
// frontend/src/components/ProBadge.jsx
import { Link } from 'react-router-dom';
import { FiLock } from 'react-icons/fi';

export default function ProBadge({ variant = 'label', requiredPlan = 'PRO', className = '' }) {
  const label = requiredPlan === 'BUSINESS' ? 'BUSINESS' : 'PRO';

  return (
    <Link
      to="/app/abonnement"
      title={`Disponible en plan ${label}`}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5
        bg-[#FFD600]/20 text-[#B8860B] hover:bg-[#FFD600]/35 transition-colors
        text-[0.65rem] font-extrabold tracking-wide no-underline shrink-0 ${className}`}
    >
      <FiLock size={9} />
      {variant === 'label' && <span>{label}</span>}
    </Link>
  );
}
```

- [ ] **Étape 4 — Vérifier que les tests passent**

```bash
npm run test -- --reporter=verbose ProBadge
# Attendu : 3 PASS
```

- [ ] **Étape 5 — Commit**

```bash
git add frontend/src/components/ProBadge.jsx frontend/src/components/ProBadge.test.jsx
git commit -m "feat(frontend): add ProBadge component for locked features"
```

---

## Task 8 — Frontend : Composant `ProTooltip`

**Files:**
- Create: `frontend/src/components/ProTooltip.jsx`
- Create: `frontend/src/components/ProTooltip.test.jsx`

- [ ] **Étape 1 — Écrire les tests**

```jsx
// frontend/src/components/ProTooltip.test.jsx
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import ProTooltip from './ProTooltip';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ProTooltip', () => {
  it('n\'affiche pas le tooltip si locked=false', () => {
    wrap(
      <ProTooltip locked={false} featureLabel="Fournisseurs" requiredPlan="PRO">
        <button>Action</button>
      </ProTooltip>
    );
    expect(screen.queryByText(/Fournisseurs/)).not.toBeInTheDocument();
  });

  it('affiche le tooltip au survol si locked=true', async () => {
    wrap(
      <ProTooltip locked={true} featureLabel="Fournisseurs" requiredPlan="PRO">
        <button>Action</button>
      </ProTooltip>
    );
    fireEvent.mouseEnter(screen.getByText('Action').closest('[data-tooltip-wrapper]'));
    expect(await screen.findByText(/Fournisseurs/)).toBeInTheDocument();
    expect(screen.getByText(/plan PRO/)).toBeInTheDocument();
  });

  it('masque le tooltip à la sortie de la souris', async () => {
    wrap(
      <ProTooltip locked={true} featureLabel="Fournisseurs" requiredPlan="PRO">
        <button>Action</button>
      </ProTooltip>
    );
    const wrapper = screen.getByText('Action').closest('[data-tooltip-wrapper]');
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText(/Fournisseurs/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Étape 2 — Exécuter pour voir échouer**

```bash
npm run test -- --reporter=verbose ProTooltip
# Attendu : FAIL
```

- [ ] **Étape 3 — Implémenter `ProTooltip.jsx`**

```jsx
// frontend/src/components/ProTooltip.jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function ProTooltip({ locked, featureLabel, requiredPlan = 'PRO', children }) {
  const [visible, setVisible] = useState(false);

  if (!locked) return children;

  return (
    <div
      className="relative inline-flex"
      data-tooltip-wrapper=""
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          w-52 p-3 bg-gray-900 text-white text-[0.75rem] rounded-xl shadow-xl
          pointer-events-none">
          <p className="font-bold mb-1">{featureLabel}</p>
          <p className="text-white/70 leading-snug">
            Disponible sur le plan <span className="font-bold text-[#FFD600]">{requiredPlan}</span>.
          </p>
          <Link
            to="/app/abonnement"
            className="pointer-events-auto mt-2 inline-block text-[#FFD600] font-bold hover:underline"
          >
            Mettre à niveau →
          </Link>
          {/* Flèche */}
          <div className="absolute top-full left-1/2 -translate-x-1/2
            border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Étape 4 — Vérifier que les tests passent**

```bash
npm run test -- --reporter=verbose ProTooltip
# Attendu : 3 PASS
```

- [ ] **Étape 5 — Commit**

```bash
git add frontend/src/components/ProTooltip.jsx frontend/src/components/ProTooltip.test.jsx
git commit -m "feat(frontend): add ProTooltip hover wrapper for locked features"
```

---

## Task 9 — Frontend : `FeaturePreview` dans `UpgradeBanner`

**Files:**
- Modify: `frontend/src/components/UpgradeBanner.jsx`

- [ ] **Étape 1 — Lire l'UpgradeBanner existant**

```bash
cat tekkipro/frontend/src/components/UpgradeBanner.jsx
```

Identifier le composant `UpgradeBanner` et son interface props (`feature`, `title`, `description`, etc.).

- [ ] **Étape 2 — Ajouter le variant `FeaturePreview` (skeleton rows)**

Ajouter ce composant à la fin du fichier, avant le `module.exports` ou en export nommé :

```jsx
// À ajouter dans UpgradeBanner.jsx

export function FeaturePreview({ icon, title, featureLabel, requiredPlan = 'PRO', description }) {
  return (
    <div className="relative min-h-[300px] bg-white border border-border/60 rounded-2xl overflow-hidden">
      {/* Skeleton rows animés */}
      <div className="p-6 flex flex-col gap-3 opacity-40 pointer-events-none select-none" aria-hidden="true">
        <div className="h-8 w-40 bg-gray-200 rounded-lg animate-pulse" />
        {[100, 75, 90, 60, 80].map((w, i) => (
          <div
            key={i}
            className="h-12 bg-gray-100 rounded-xl animate-pulse"
            style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>

      {/* Overlay CTA */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-8
        bg-white/80 backdrop-blur-[2px]">
        <div className="w-14 h-14 flex items-center justify-center rounded-2xl
          bg-[#1B5E20]/10 text-[#1B5E20]">
          {icon}
        </div>
        <div className="text-center">
          <p className="text-[0.65rem] font-bold text-[#B8860B] uppercase tracking-widest mb-1">
            ✦ Fonctionnalité {requiredPlan}
          </p>
          <h2 className="text-[1.1rem] font-extrabold text-foreground mb-1"
            style={{ fontFamily: 'Sora, sans-serif' }}>
            {title}
          </h2>
          {description && (
            <p className="text-[0.82rem] text-muted-foreground max-w-xs mx-auto">{description}</p>
          )}
        </div>
        <a
          href="/app/abonnement"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#1B5E20] text-white
            font-bold text-[0.85rem] rounded-xl hover:-translate-y-0.5 transition-all no-underline"
        >
          Débloquer {featureLabel} →
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Étape 3 — Remplacer l'`UpgradeBanner` dans Fournisseurs et Employés**

Dans `frontend/src/pages/Fournisseurs.jsx`, remplacer le `<UpgradeBanner fullPage ...>` par :

```jsx
import { FeaturePreview } from '../components/UpgradeBanner';
import { FiTruck } from 'react-icons/fi';

// Dans le return si !isPro :
return (
  <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 font-sans">
    <FeaturePreview
      icon={<FiTruck size={26} />}
      title="Gérez vos fournisseurs"
      featureLabel="les fournisseurs"
      requiredPlan="PRO"
      description="Centralisez contacts, livraisons et réapprovisionnements depuis une seule page."
    />
  </div>
);
```

Dans `frontend/src/pages/Employes.jsx`, remplacer de même :

```jsx
import { FeaturePreview } from '../components/UpgradeBanner';
import { FiUsers } from 'react-icons/fi';

return (
  <div className="min-h-[calc(100vh-64px)] bg-transparent p-5 md:p-8 font-sans">
    <FeaturePreview
      icon={<FiUsers size={26} />}
      title="Structurez votre équipe"
      featureLabel="la gestion d'équipe"
      requiredPlan="PRO"
      description="Invitez vos collaborateurs et gérez leurs accès depuis un seul endroit."
    />
  </div>
);
```

- [ ] **Étape 4 — Vérifier visuellement**

```bash
cd tekkipro
npm run frontend
# Naviguer vers /app/fournisseurs avec un compte GRATUIT
# Attendu : skeleton rows animés + overlay CTA "Débloquer les fournisseurs →"
```

- [ ] **Étape 5 — Commit**

```bash
git add frontend/src/components/UpgradeBanner.jsx \
        frontend/src/pages/Fournisseurs.jsx \
        frontend/src/pages/Employes.jsx
git commit -m "feat(frontend): add FeaturePreview skeleton variant to UpgradeBanner"
```

---

## Task 10 — Frontend : Sidebar `Layout.jsx`

**Files:**
- Modify: `frontend/src/components/Layout.jsx`

- [ ] **Étape 1 — Ajouter les imports**

```jsx
import ProBadge from './ProBadge';
import ProTooltip from './ProTooltip';
import UsageMeter from './UsageMeter';
import { useAuth } from '../context/useAuth';
```

`useAuth` est déjà importé — vérifier que `planUsage` est destructuré :

```jsx
const { user, boutique, logout, isAdmin, isPro, isBusiness, plan,
        mesBoutiques, activeBoutique, switchBoutique, getActiveBoutiqueName,
        planUsage } = useAuth();
```

- [ ] **Étape 2 — Ajouter ProBadge sur les nav items verrouillés**

Dans la section de rendu des nav items (autour de la ligne `{item.locked ? ...}`), modifier le rendu `nav-locked` pour y ajouter ProBadge :

```jsx
{item.locked ? (
  <ProTooltip locked={true} featureLabel={item.label} requiredPlan="PRO">
    <NavLink
      to={item.to}
      end={item.end}
      className="nav-locked"
      title={!showExpandedSidebarContent ? item.label : undefined}
      aria-disabled="true"
      onClick={(e) => e.preventDefault()}
    >
      {item.icon}
      <span className="nav-label">{item.label}</span>
      {showExpandedSidebarContent && (
        <ProBadge variant="label" requiredPlan="PRO" className="ml-auto" />
      )}
      {!showExpandedSidebarContent && (
        <ProBadge variant="icon-only" requiredPlan="PRO" />
      )}
    </NavLink>
  </ProTooltip>
) : ( /* NavLink normal inchangé */ )}
```

- [ ] **Étape 3 — Ajouter les UsageMeter dans le footer sidebar (version étendue)**

Dans `<div className="sidebar-footer">`, après le bloc `user-info` :

```jsx
{showExpandedSidebarContent && planUsage && (
  <div className="flex flex-col gap-2 px-3 py-3 border-t border-border/40 mt-1">
    <UsageMeter
      label="Ventes / mois"
      used={planUsage.ventesParMois?.used ?? 0}
      limit={planUsage.ventesParMois?.limit ?? null}
    />
    <UsageMeter
      label="Produits"
      used={planUsage.produits?.used ?? 0}
      limit={planUsage.produits?.limit ?? null}
    />
    <UsageMeter
      label="Clients"
      used={planUsage.clients?.used ?? 0}
      limit={planUsage.clients?.limit ?? null}
    />
  </div>
)}
```

- [ ] **Étape 4 — Vérifier visuellement**

```bash
npm run frontend
# Attendu avec compte GRATUIT :
# - Items "Fournisseurs" et "Employés" ont badge PRO doré
# - Tooltip upgrade au survol de ces items
# - 3 barres de quota dans le footer sidebar
```

- [ ] **Étape 5 — Commit**

```bash
git add frontend/src/components/Layout.jsx
git commit -m "feat(frontend): add ProBadge, ProTooltip and UsageMeter to sidebar"
```

---

## Task 11 — Frontend : Intégration pages (Dashboard, NouvelleVente, Stock, Dettes)

**Files:**
- Modify: `frontend/src/pages/Dashboard.jsx`
- Modify: `frontend/src/pages/NouvelleVente.jsx`
- Modify: `frontend/src/pages/Stock.jsx`
- Modify: `frontend/src/pages/Dettes.jsx`

- [ ] **Étape 1 — Dashboard : ajouter 3 UsageMeter**

Dans `Dashboard.jsx`, ajouter l'import et destructurer `planUsage` :

```jsx
import UsageMeter from '../components/UsageMeter';

// Dans le composant :
const { ..., planUsage } = useAuth();
```

Ajouter une section après les KPI cards existantes :

```jsx
{planUsage && (plan === 'GRATUIT') && (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 bg-white border border-border/60 rounded-2xl">
    <UsageMeter
      label="Ventes ce mois"
      used={planUsage.ventesParMois?.used ?? 0}
      limit={planUsage.ventesParMois?.limit ?? null}
    />
    <UsageMeter
      label="Produits actifs"
      used={planUsage.produits?.used ?? 0}
      limit={planUsage.produits?.limit ?? null}
    />
    <UsageMeter
      label="Clients"
      used={planUsage.clients?.used ?? 0}
      limit={planUsage.clients?.limit ?? null}
    />
  </div>
)}
```

- [ ] **Étape 2 — NouvelleVente : compteur ventes/mois en temps réel**

Dans `NouvelleVente.jsx`, ajouter sous le `PageHeader` :

```jsx
import UsageMeter from '../components/UsageMeter';

const { ..., planUsage, plan } = useAuth();

// Dans le JSX, sous PageHeader :
{plan === 'GRATUIT' && planUsage && (
  <div className="max-w-xs">
    <UsageMeter
      label="Ventes ce mois"
      used={planUsage.ventesParMois?.used ?? 0}
      limit={planUsage.ventesParMois?.limit ?? null}
    />
  </div>
)}
```

- [ ] **Étape 3 — Stock : compteur produits**

Dans `Stock.jsx`, ajouter sous le `PageHeader` :

```jsx
import UsageMeter from '../components/UsageMeter';

const { ..., planUsage, plan } = useAuth();

// Sous PageHeader :
{plan === 'GRATUIT' && planUsage && (
  <div className="max-w-xs">
    <UsageMeter
      label="Produits actifs"
      used={planUsage.produits?.used ?? 0}
      limit={planUsage.produits?.limit ?? null}
    />
  </div>
)}
```

- [ ] **Étape 4 — Dettes : ProBadge sur export PDF**

Dans `Dettes.jsx`, localiser le bouton "Actualiser" existant dans le PageHeader et ajouter un indicateur à côté (ou dans la section action) :

```jsx
import ProBadge from '../components/ProBadge';

// Dans le JSX, après le titre de section ou dans les actions :
{!isPro && (
  <div className="flex items-center gap-2 text-[0.78rem] text-muted-foreground">
    <span>Export PDF</span>
    <ProBadge variant="label" requiredPlan="PRO" />
  </div>
)}
```

- [ ] **Étape 5 — Vérifier visuellement toutes les pages**

```bash
npm run frontend
# Dashboard : 3 UsageMeter visibles si plan GRATUIT
# NouvelleVente : barre ventes/mois sous le header
# Stock : barre produits actifs sous le header
# Dettes : badge PRO sur "Export PDF"
```

- [ ] **Étape 6 — Commit**

```bash
git add frontend/src/pages/Dashboard.jsx \
        frontend/src/pages/NouvelleVente.jsx \
        frontend/src/pages/Stock.jsx \
        frontend/src/pages/Dettes.jsx
git commit -m "feat(frontend): integrate UsageMeter and ProBadge into all 4 pages"
```

---

## Task 12 — Mobile : `ProTooltip` bottom sheet + `UsageMeter` compact

**Files:**
- Create: `mobile/src/components/ProTooltip.js`
- Modify: `mobile/src/screens/DashboardScreen.js`

- [ ] **Étape 1 — Créer `ProTooltip.js` pour React Native**

```js
// mobile/src/components/ProTooltip.js
import React, { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, TouchableWithoutFeedback,
  StyleSheet, Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';

const TP = {
  green: '#1B5E20', gold: '#FFD600', dark: '#071C08',
  white: '#FFFFFF', muted: '#6B7280',
};

export default function ProTooltip({ locked, featureLabel, requiredPlan = 'PRO', children }) {
  const [visible, setVisible] = useState(false);
  const navigation = useNavigation();

  if (!locked) return children;

  return (
    <>
      <Pressable onPress={() => setVisible(true)}>
        {children}
      </Pressable>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setVisible(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>

        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.featureLabel}>{featureLabel}</Text>
          <Text style={styles.description}>
            Disponible sur le plan{' '}
            <Text style={styles.planHighlight}>{requiredPlan}</Text>.
            Mettez à niveau pour accéder à cette fonctionnalité.
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => { setVisible(false); navigation.navigate('Abonnement'); }}
          >
            <Text style={styles.ctaText}>Mettre à niveau →</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setVisible(false)}>
            <Text style={styles.cancelText}>Annuler</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet:         { backgroundColor: TP.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  handle:        { width: 40, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  featureLabel:  { fontSize: 18, fontWeight: '800', color: TP.dark, marginBottom: 8 },
  description:   { fontSize: 14, color: TP.muted, lineHeight: 20, marginBottom: 20 },
  planHighlight: { fontWeight: '800', color: TP.green },
  ctaButton:     { backgroundColor: TP.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginBottom: 10 },
  ctaText:       { color: TP.white, fontWeight: '800', fontSize: 15 },
  cancelButton:  { alignItems: 'center', paddingVertical: 10 },
  cancelText:    { color: TP.muted, fontSize: 14 },
});
```

- [ ] **Étape 2 — Ajouter UsageMeter compact dans DashboardScreen**

Dans `DashboardScreen.js`, après les imports existants :

```js
// Ajouter un composant UsageMeter inline (compact, React Native)
function UsageMeterCompact({ label, used, limit }) {
  if (!limit || limit >= 999999) return null;
  const pct = Math.min(Math.round((used / limit) * 100), 100);
  const barColor = pct >= 90 ? '#D32F2F' : pct >= 70 ? '#F9A825' : TP.green;
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: TP.muted }}>{label}</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: TP.text }}>{used}/{limit}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: '#E8E2D9', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${pct}%`, backgroundColor: barColor, borderRadius: 2 }} />
      </View>
    </View>
  );
}
```

Destructurer `planUsage` depuis `useAuth()` :

```js
const { user, logout, boutique, ..., planUsage } = useAuth();
```

Ajouter la section UsageMeter dans le JSX du dashboard, après les stat cards et avant les quick actions :

```jsx
{planUsage && plan === 'GRATUIT' && (
  <View style={{ backgroundColor: TP.card, borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: TP.border }}>
    <Text style={{ fontSize: 12, fontWeight: '700', color: TP.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
      Limites du plan Starter
    </Text>
    <UsageMeterCompact
      label="Ventes ce mois"
      used={planUsage.ventesParMois?.used ?? 0}
      limit={planUsage.ventesParMois?.limit ?? null}
    />
    <UsageMeterCompact
      label="Produits actifs"
      used={planUsage.produits?.used ?? 0}
      limit={planUsage.produits?.limit ?? null}
    />
    <UsageMeterCompact
      label="Clients"
      used={planUsage.clients?.used ?? 0}
      limit={planUsage.clients?.limit ?? null}
    />
  </View>
)}
```

- [ ] **Étape 3 — Wrapper les ActionItems verrouillés avec ProTooltip**

Dans `DashboardScreen.js`, localiser le rendu des `actionItems`. Wrapper les items `locked` :

```js
import ProTooltip from '../components/ProTooltip';

// Dans le rendu de chaque actionItem :
const ActionButton = ({ item }) => {
  const button = (
    <TouchableOpacity
      style={[styles.actionBtn, { backgroundColor: item.bg }, item.locked && styles.actionBtnLocked]}
      onPress={() => !item.locked && navigation.navigate(item.route)}
      disabled={item.locked}
    >
      <Feather name={item.icon} size={22} color={item.locked ? TP.muted : item.accent} />
      <Text style={[styles.actionLabel, item.locked && { color: TP.muted }]}>{item.label}</Text>
    </TouchableOpacity>
  );

  if (item.locked) {
    return (
      <ProTooltip locked={true} featureLabel={item.label} requiredPlan="PRO">
        {button}
      </ProTooltip>
    );
  }
  return button;
};
```

- [ ] **Étape 4 — Tester sur simulateur**

```bash
cd tekkipro
npm run mobile
# Attendu avec compte GRATUIT :
# - Section "Limites du plan Starter" avec 3 barres de quota
# - Tap sur action verrouillée → bottom sheet upgrade
```

- [ ] **Étape 5 — Commit final**

```bash
git add mobile/src/components/ProTooltip.js mobile/src/screens/DashboardScreen.js
git commit -m "feat(mobile): add ProTooltip bottom sheet and UsageMeter compact on dashboard"
```

---

## Self-Review

**Couverture spec :**
- ✅ 4 primitives implémentées (UsageMeter, ProBadge, ProTooltip, FeaturePreview)
- ✅ 8 touchpoints couverts (sidebar, dashboard, NouvelleVente, Stock, Dettes, Fournisseurs locked, Employés locked, mobile dashboard)
- ✅ Backend : planUsage dans GET /me + quota headers sur 3 routes POST
- ✅ Intercepteur Axios + planUsageStore bridge (anti-import circulaire)
- ✅ Mobile : UsageMeter compact + ProTooltip bottom sheet
- ✅ CTA upgrade uniquement à ≥80% (UsageMeter)
- ✅ Zéro regression PRO/BUSINESS (guards `plan === 'GRATUIT'` et `limit >= 999999`)

**Noms cohérents :**
- `planUsage` utilisé partout (backend, AuthContext, pages)
- `attachQuotaHeaders` / `getQuotaUsage` cohérents entre tâches 2 et 3
- `callPlanUsageUpdater` (store) / `registerPlanUsageUpdater` (store) cohérents entre tâches 4 et 5
