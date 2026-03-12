// Rôles utilisateurs TekkiPro
const ROLES = {
  ADMIN: 'ADMIN',
  EMPLOYE: 'EMPLOYE',
};

// Plans SaaS
const PLANS = {
  GRATUIT: 'GRATUIT',
  PRO: 'PRO',
  BUSINESS: 'BUSINESS',
};

// Types de mouvements de stock
const STOCK_MOVEMENT_TYPES = {
  IN: 'IN',           // Entrée stock / approvisionnement
  OUT: 'OUT',         // Sortie manuelle
  SALE: 'SALE',       // Sortie par vente
  RETURN: 'RETURN',   // Retour client
  ADJUSTMENT: 'ADJUSTMENT', // Correction inventaire
  LOSS: 'LOSS',       // Perte / casse
};

module.exports = { ROLES, PLANS, STOCK_MOVEMENT_TYPES };

