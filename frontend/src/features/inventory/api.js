// API Inventaire / Stock
import api from '../../lib/api';

export const stockApi = {
  entree: (data) => api.post('/stock/entree', data),
  getHistorique: (params) => api.get('/stock/historique', { params }),
  getInventaire: () => api.get('/stock/inventaire'),

  // Nouveaux endpoints — mouvements
  getMovements: (params) => api.get('/stock/movements', { params }),
  getBalance: (produitId) => api.get(`/stock/balance/${produitId}`),
};

