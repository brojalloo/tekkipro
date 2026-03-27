// API Produits
import api from '../../lib/api';

export const produitsApi = {
  getAll: (params) => api.get('/produits', { params }),
  getById: (id) => api.get(`/produits/${id}`),
  create: (data) => api.post('/produits', data),
  update: (id, data) => api.put(`/produits/${id}`, data),
  remove: (id) => api.delete(`/produits/${id}`),
  getAlertesStock: () => api.get('/produits/alertes'),

  // Unités de vente
  addUnite: (produitId, data) => api.post(`/produits/${produitId}/unites`, data),
  updateUnite: (uniteId, data) => api.put(`/produits/unites/${uniteId}`, data),
  removeUnite: (uniteId) => api.delete(`/produits/unites/${uniteId}`),

  // Barcodes
  getByBarcode: (code) => api.get(`/barcodes/lookup/${encodeURIComponent(code)}`),
  addBarcode: (produitId, data) => api.post(`/barcodes/produit/${produitId}`, data),
  removeBarcode: (barcodeId) => api.delete(`/barcodes/${barcodeId}`),
};

