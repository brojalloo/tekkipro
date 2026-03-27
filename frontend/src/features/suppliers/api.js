// API Fournisseurs
import api from '../../lib/api';

export const fournisseursApi = {
  getAll: (params) => api.get('/fournisseurs', { params }),
  getById: (id) => api.get(`/fournisseurs/${id}`),
  create: (data) => api.post('/fournisseurs', data),
  update: (id, data) => api.put(`/fournisseurs/${id}`, data),
  remove: (id) => api.delete(`/fournisseurs/${id}`),
};

