import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getPlanLimits } from '../config/planConfig';
import { AuthContext } from './auth-context';
import { registerPlanUsageUpdater } from '../services/planUsageStore';
import {
  clearStoredActiveBoutique,
  clearStoredAuth,
  getStoredAuthData,
  persistAuthSession,
  setStoredActiveBoutique,
  updateStoredBoutique,
  updateStoredUser,
} from '../lib/authStorage';

export function AuthProvider({ children }) {
  const [storedAuth] = useState(getStoredAuthData);
  const [user, setUser] = useState(storedAuth.user);
  const [boutique, setBoutique] = useState(storedAuth.boutique);
  const [activeBoutique, setActiveBoutique] = useState(storedAuth.activeBoutique);
  const [mesBoutiques, setMesBoutiques] = useState([]);
  const [planUsage, setPlanUsage] = useState(null);
  const loading = false;

  // Charger les boutiques quand user est admin BUSINESS
  const loadMesBoutiques = useCallback(async () => {
    try {
      const res = await api.get('/boutique/mes-boutiques');
      setMesBoutiques(res.data.data || []);
      return res.data.data || [];
    } catch {
      setMesBoutiques([]);
      return [];
    }
  }, []);

  useEffect(() => {
    if (user?.role !== 'ADMIN' || boutique?.plan !== 'BUSINESS') {
      return undefined;
    }

    let cancelled = false;

    api.get('/boutique/mes-boutiques')
      .then(res => {
        if (!cancelled) {
          setMesBoutiques(res.data.data || []);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMesBoutiques([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.role, boutique?.plan]);

  const updatePlanUsage = useCallback((payload) => {
    setPlanUsage(prev => {
      const base = prev || { ventesParMois: {}, produits: {}, clients: {} };
      const next = { ...base };
      if (payload.ventesUsed  !== undefined) next.ventesParMois = { ...next.ventesParMois, used: payload.ventesUsed };
      if (payload.ventesLimit !== undefined) next.ventesParMois = { ...next.ventesParMois, limit: payload.ventesLimit };
      if (payload.produitsUsed  !== undefined) next.produits = { ...next.produits, used: payload.produitsUsed };
      if (payload.produitsLimit !== undefined) next.produits = { ...next.produits, limit: payload.produitsLimit };
      if (payload.clientsUsed  !== undefined) next.clients = { ...next.clients, used: payload.clientsUsed };
      if (payload.clientsLimit !== undefined) next.clients = { ...next.clients, limit: payload.clientsLimit };
      return next;
    });
  }, []);

  useEffect(() => {
    registerPlanUsageUpdater(updatePlanUsage);
  }, [updatePlanUsage]);

  // Charger planUsage et rafraîchir auth au démarrage si l'utilisateur est déjà connecté
  useEffect(() => {
    if (!user) return;
    refreshBoutique();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Une seule fois au montage

  const switchBoutique = (boutiqueId) => {
    const target = mesBoutiques.find(b => b.id === boutiqueId);
    if (target) {
      setActiveBoutique(boutiqueId);
      setStoredActiveBoutique(boutiqueId);
    }
  };

  const getActiveBoutiqueName = () => {
    if (activeBoutique && mesBoutiques.length > 0) {
      const found = mesBoutiques.find(b => b.id === activeBoutique);
      if (found) return found.nom;
    }
    return boutique?.nom || 'Ma Boutique';
  };

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token, user: userData, boutique: boutiqueData } = res.data.data;

    persistAuthSession({ token, user: userData, boutique: boutiqueData });

    setUser(userData);
    setBoutique(boutiqueData);
    if (res.data.data?.planUsage) setPlanUsage(res.data.data.planUsage);
    setActiveBoutique(null);
    setMesBoutiques([]);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const {
      requiresEmailVerification = false,
      token,
      user: userData,
      boutique: boutiqueData,
    } = res.data.data;

    if (requiresEmailVerification) {
      return res.data;
    }

    persistAuthSession({ token, user: userData, boutique: boutiqueData });
    
    setUser(userData);
    setBoutique(boutiqueData);
    setActiveBoutique(null);
    setMesBoutiques([]);
    return res.data;
  };

  const logout = async () => {
    try { await api.post('/auth/logout'); } catch (_err) { /* ignore logout errors */ }
    clearStoredAuth();
    setUser(null);
    setBoutique(null);
    setActiveBoutique(null);
    setMesBoutiques([]);
  };

  // Rafraîchir les données boutique (après changement de plan)
  const refreshBoutique = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const data = res.data.data;
      if (data?.boutique) {
        setBoutique(data.boutique);
        updateStoredBoutique(data.boutique);
      }
      if (data) {
        const { boutique: _boutique, ...userData } = data;
        setUser(userData);
        updateStoredUser(userData);
        if (!(userData?.role === 'ADMIN' && data?.boutique?.plan === 'BUSINESS')) {
          setMesBoutiques([]);
          setActiveBoutique(null);
          clearStoredActiveBoutique();
        }
      }
      if (data?.planUsage) setPlanUsage(data.planUsage);
    } catch (err) {
      if (import.meta.env.DEV) console.error('Erreur refreshBoutique:', err);
    }
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const plan = boutique?.plan || 'GRATUIT';
  const isPro = plan === 'PRO' || plan === 'BUSINESS';
  const isBusiness = plan === 'BUSINESS';
  const planLimits = getPlanLimits(plan);

  return (
    <AuthContext.Provider value={{
      user, boutique, loading, login, register, logout,
      isAdmin, isPro, isBusiness, plan, planLimits,
      activeBoutique, mesBoutiques, switchBoutique, loadMesBoutiques, getActiveBoutiqueName,
      refreshBoutique,
      planUsage,
      updatePlanUsage,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
