import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor pour ajouter le token et X-Boutique-Id
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('tekkipro_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const activeBoutiqueId = localStorage.getItem('tekkipro_active_boutique');
  if (activeBoutiqueId) {
    config.headers['X-Boutique-Id'] = activeBoutiqueId;
  }
  return config;
});

// Interceptor pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('tekkipro_token');
      localStorage.removeItem('tekkipro_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
