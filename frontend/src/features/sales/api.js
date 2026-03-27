// API Ventes
import api from '../../lib/api';

export const ventesApi = {
  create: (data) => api.post('/ventes', data),
  getAll: (params) => api.get('/ventes', { params }),
  getById: (id) => api.get(`/ventes/${id}`),
  annuler: (id) => api.patch(`/ventes/${id}/annuler`),
  genererFacture: (id) => api.get(`/factures/${id}/pdf`, { responseType: 'blob' }),
};

export const dettesApi = {
  getAll: (params) => api.get('/dettes', { params }),
  rembourser: (id, data) => api.post(`/dettes/${id}/rembourser`, data),
};

