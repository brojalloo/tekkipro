// Configuration centralisée des plans TekkiPro
// Doit rester synchronisé avec le backend (auth.middleware.js PLAN_LIMITS)

export const PLAN_LIMITS = {
  GRATUIT: {
    nom: 'Starter',
    prix: 0,
    utilisateurs: 1,
    produits: 50,
    clients: 30,
    ventesParMois: 100,
    categories: 5,
    fournisseurs: false,
    employes: false,
    multiBoutique: false,
    exportPdf: false,
    statsAvancees: false,
  },
  PRO: {
    nom: 'Pro',
    prix: 5000,
    utilisateurs: 5,
    produits: 999999,
    clients: 999999,
    ventesParMois: 999999,
    categories: 999999,
    fournisseurs: true,
    employes: true,
    multiBoutique: false,
    exportPdf: true,
    statsAvancees: true,
  },
  BUSINESS: {
    nom: 'Business',
    prix: 10000,
    utilisateurs: 999999,
    produits: 999999,
    clients: 999999,
    ventesParMois: 999999,
    categories: 999999,
    fournisseurs: true,
    employes: true,
    multiBoutique: true,
    exportPdf: true,
    statsAvancees: true,
  },
};

// Retourne les limites du plan actuel
export const getPlanLimits = (plan) => PLAN_LIMITS[plan] || PLAN_LIMITS.GRATUIT;

// Vérifie si une feature est disponible pour un plan
export const hasFeature = (plan, feature) => {
  const limits = getPlanLimits(plan);
  return !!limits[feature];
};

// Vérifie si un plan est au moins PRO
export const isPlanPro = (plan) => plan === 'PRO' || plan === 'BUSINESS';

// Vérifie si un plan est BUSINESS
export const isPlanBusiness = (plan) => plan === 'BUSINESS';

// Formater une limite (999999 → ∞)
export const formatLimit = (limit) => limit >= 999999 ? '∞' : limit.toLocaleString('fr-FR');

// Calculer le pourcentage d'utilisation
export const usagePercent = (current, limit) => {
  if (limit >= 999999) return 0;
  return Math.min(100, Math.round((current / limit) * 100));
};

// Couleur selon le pourcentage d'utilisation
export const usageColor = (percent) => {
  if (percent >= 90) return '#ef4444'; // rouge
  if (percent >= 70) return '#f59e0b'; // orange
  return '#10b981'; // vert
};

// Plan minimum requis pour une feature
export const requiredPlanForFeature = (feature) => {
  if (PLAN_LIMITS.GRATUIT[feature]) return 'GRATUIT';
  if (PLAN_LIMITS.PRO[feature]) return 'PRO';
  return 'BUSINESS';
};
