import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { normalizeApiError, shouldClearAuthSession } from './apiError';
import { clearStoredToken, getStoredToken } from './sessionStorage';

// ─── JWT expiry check (no external lib needed) ────────────────────────────────
const isTokenExpired = (token) => {
  try {
    const payload = token.split('.')[1];
    if (!payload) return true;
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    if (!decoded?.exp) return false; // no expiry claim → treat as valid
    return decoded.exp * 1000 < Date.now() + 30_000; // 30s buffer
  } catch {
    return true;
  }
};

// ─── Base URL resolution ───────────────────────────────────────────────────────
const getExpoDebuggerHost = () => {
  const candidates = [
    Constants.expoGoConfig?.debuggerHost,
    Constants.expoConfig?.hostUri,
    Constants.manifest2?.extra?.expoGo?.debuggerHost,
    Constants.manifest?.debuggerHost,
  ];
  const rawHost = candidates.find(Boolean)?.split(':')[0] || null;
  return rawHost && /^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$/.test(rawHost) ? rawHost : null;
};

const expoDebuggerHost = getExpoDebuggerHost();
const ANDROID_USB_DEV_BASE_URL = 'http://127.0.0.1:5000/api';
const EXPO_LAN_DEV_BASE_URL = expoDebuggerHost ? `http://${expoDebuggerHost}:5000/api` : null;
const CONFIGURED_BASE_URL = process.env.EXPO_PUBLIC_API_URL || null;

// DEV: priorité → env var → LAN Expo → USB Android → rien (erreur claire)
const DEV_BASE_URL = CONFIGURED_BASE_URL
  || EXPO_LAN_DEV_BASE_URL
  || (Platform.OS === 'android' ? ANDROID_USB_DEV_BASE_URL : null)
  || null;

const PROD_BASE_URL = CONFIGURED_BASE_URL || 'https://api.tekkipro.com/api';

const BASE_URL = __DEV__ ? DEV_BASE_URL : PROD_BASE_URL;

if (!BASE_URL) {
  console.warn('[TekkiPro] API URL not resolved. Set EXPO_PUBLIC_API_URL or connect via USB/LAN.');
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request interceptor — token expiry check + attach headers ────────────────
api.interceptors.request.use(async (config) => {
  try {
    const token = await getStoredToken();
    const boutiqueId = await AsyncStorage.getItem('boutiqueId');
    if (token && !isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    } else if (token && isTokenExpired(token)) {
      // Token expired — clear it silently; the 401 interceptor will handle logout
      if (__DEV__) console.warn('[TekkiPro] Token expired, clearing session.');
      try { await clearStoredToken(); } catch (_) {}
      try { await AsyncStorage.multiRemove(['user', 'boutique', 'boutiqueId', 'activeBoutique']); } catch (_) {}
    }
    if (boutiqueId) config.headers['x-boutique-id'] = boutiqueId;
  } catch (_) {}
  return config;
});

// ─── Response interceptor — 401 cleanup + network retry ───────────────────────
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    error.apiError = normalizeApiError(error);

    // 401 — clear token and session data independently so neither blocks the other
    if (shouldClearAuthSession(error)) {
      try { await clearStoredToken(); } catch (_) {}
      try { await AsyncStorage.multiRemove(['user', 'boutique', 'boutiqueId', 'activeBoutique']); } catch (_) {}
    }

    // Retry on network errors (no response) — max 2 retries with backoff
    const config = error.config;
    if (!error.response && config && !config._retryCount) {
      config._retryCount = 0;
    }
    if (!error.response && config && config._retryCount < 2) {
      config._retryCount += 1;
      await new Promise((resolve) => setTimeout(resolve, 1000 * config._retryCount));
      if (__DEV__) console.warn(`[TekkiPro] Retrying request (attempt ${config._retryCount})…`);
      return api(config);
    }

    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) =>
  api.post('/auth/login', { email, password });
export const register = (data) => api.post('/auth/register', data);
export const forgotPassword = (email) => api.post('/auth/forgot-password', { email });
export const resendVerification = (email) => api.post('/auth/resend-verification', { email });
export const getMe = () => api.get('/auth/me');
export const getEmployees = () => api.get('/auth/employees');
export const createEmployee = (data) => api.post('/auth/employees', data);
export const toggleEmployee = (id) => api.patch(`/auth/employees/${id}/toggle`);
export const updateEmployee = (id, data) => api.put(`/auth/employees/${id}`, data);
export const deleteEmployee = (id) => api.delete(`/auth/employees/${id}`);

// Boutiques
export const getMesBoutiques = () => api.get('/boutique/mes-boutiques');

// Référentiels produits
export const getCategories = () => api.get('/categories');
export const getFournisseurs = () => api.get('/fournisseurs');

// Produits
export const getProduits = (params) => api.get('/produits', { params: { limit: 200, ...params } });
export const getProduit = (id) => api.get(`/produits/${id}`);
export const createProduit = (data) => api.post('/produits', data);
export const updateProduit = (id, data) => api.put(`/produits/${id}`, data);
export const addProduitUniteVente = (produitId, data) => api.post(`/produits/${produitId}/unites`, data);
export const updateProduitUniteVente = (uniteId, data) => api.put(`/produits/unites/${uniteId}`, data);
export const deleteProduitUniteVente = (uniteId) => api.delete(`/produits/unites/${uniteId}`);
export const deleteProduit = (id) => api.delete(`/produits/${id}`);
export const getProduitByBarcode = (code) =>
  api.get(`/barcodes/lookup/${encodeURIComponent(code)}`);

// Clients
export const getClients = (params) => api.get('/clients', { params: { limit: 200, ...params } });
export const createClient = (data) => api.post('/clients', data);
export const updateClient = (id, data) => api.put(`/clients/${id}`, data);
export const deleteClient = (id) => api.delete(`/clients/${id}`);

// Ventes
export const getVentes = (params) => api.get('/ventes', { params: { limit: 200, ...params } });
export const getVenteById = (id) => api.get(`/ventes/${id}`);
export const createVente = (data) => api.post('/ventes', data);
export const getFacturePdfUrl = (id) => `${BASE_URL}/factures/${id}/pdf`;

// Stock
export const getInventaire = (params) => api.get('/stock/inventaire', { params: { limit: 200, ...params } });
export const getHistoriqueStock = (params) => api.get('/stock/historique', { params: { limit: 200, ...params } });
export const entreeStock = (data) => api.post('/stock/entree', data);

// Dettes
export const getDettes = (params) => api.get('/dettes', { params: { limit: 200, ...params } });
export const rembourserDette = (id, montant) => api.post(`/dettes/${id}/rembourser`, { montant });

// Abonnements
export const getAbonnement = () => api.get('/abonnements');
export const souscrireAbonnement = (data) => api.post('/abonnements/souscrire', data);
export const renouvelerAbonnement = (data) => api.post('/abonnements/renouveler', data);
export const annulerAbonnement = () => api.post('/abonnements/annuler');

// Paiements abonnements
export const createStripeSession = (data) => api.post('/payments/stripe/create-session', data);
export const initiateWavePayment = (data) => api.post('/payments/wave/initiate', data);
export const initiateOrangeMoneyPayment = (data) => api.post('/payments/orange-money/initiate', data);
export const initiateFreeMoneyPayment = (data) => api.post('/payments/free-money/initiate', data);

// Stats
export const getDashboard = () => api.get('/statistiques/dashboard');
export const getTopProduits = (params) => api.get('/statistiques/top-produits', { params });
export const getVentesParJour = (params) => api.get('/statistiques/ventes-par-jour', { params });

export default api;

