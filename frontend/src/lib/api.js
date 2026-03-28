// Tekkipro — Client HTTP centralisé
// C'est le point d'entrée unique pour tous les appels API
import axios from 'axios';
import { clearStoredAuth, getStoredActiveBoutiqueId, getStoredToken } from './authStorage';
import { normalizeApiError, shouldClearAuthSession } from '@tekkipro/shared/apiError';
import { callPlanUsageUpdater } from '../services/planUsageStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Avertissement si HTTP utilisé en production
if (import.meta.env.PROD && API_URL.startsWith('http://')) {
  console.error('[Security] API_URL utilise HTTP en production. HTTPS requis.');
}

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor requête — token + boutique active
api.interceptors.request.use((config) => {
  const token = getStoredToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeBoutiqueId = getStoredActiveBoutiqueId();
  if (activeBoutiqueId) {
    config.headers['X-Boutique-Id'] = activeBoutiqueId;
  }
  return config;
});

// Interceptor réponse — gestion erreurs globales
api.interceptors.response.use(
  (response) => response,
  (error) => {
    error.apiError = normalizeApiError(error);

    if (shouldClearAuthSession(error)) {
      clearStoredAuth();
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

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

export default api;

