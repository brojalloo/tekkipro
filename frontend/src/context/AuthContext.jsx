import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { getPlanLimits } from '../config/planConfig';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [boutique, setBoutique] = useState(null);
  const [activeBoutique, setActiveBoutique] = useState(null);
  const [mesBoutiques, setMesBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('tekkipro_token');
    const savedUser = localStorage.getItem('tekkipro_user');
    const savedBoutique = localStorage.getItem('tekkipro_boutique');
    const savedActive = localStorage.getItem('tekkipro_active_boutique');
    
    if (token && savedUser) {
      const u = JSON.parse(savedUser);
      const b = savedBoutique ? JSON.parse(savedBoutique) : null;
      setUser(u);
      setBoutique(b);
      // Restaurer la boutique active
      if (savedActive && b) {
        setActiveBoutique(parseInt(savedActive));
      }
    }
    setLoading(false);
  }, []);

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
    if (user?.role === 'ADMIN' && boutique?.plan === 'BUSINESS') {
      loadMesBoutiques();
    }
  }, [user, boutique, loadMesBoutiques]);

  const switchBoutique = (boutiqueId) => {
    const target = mesBoutiques.find(b => b.id === boutiqueId);
    if (target) {
      setActiveBoutique(boutiqueId);
      localStorage.setItem('tekkipro_active_boutique', boutiqueId.toString());
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
    
    localStorage.setItem('tekkipro_token', token);
    localStorage.setItem('tekkipro_user', JSON.stringify(userData));
    localStorage.setItem('tekkipro_boutique', JSON.stringify(boutiqueData));
    localStorage.removeItem('tekkipro_active_boutique');
    
    setUser(userData);
    setBoutique(boutiqueData);
    setActiveBoutique(null);
    return res.data;
  };

  const register = async (data) => {
    const res = await api.post('/auth/register', data);
    const { token, user: userData, boutique: boutiqueData } = res.data.data;
    
    localStorage.setItem('tekkipro_token', token);
    localStorage.setItem('tekkipro_user', JSON.stringify(userData));
    localStorage.setItem('tekkipro_boutique', JSON.stringify(boutiqueData));
    localStorage.removeItem('tekkipro_active_boutique');
    
    setUser(userData);
    setBoutique(boutiqueData);
    setActiveBoutique(null);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('tekkipro_token');
    localStorage.removeItem('tekkipro_user');
    localStorage.removeItem('tekkipro_boutique');
    localStorage.removeItem('tekkipro_active_boutique');
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
        localStorage.setItem('tekkipro_boutique', JSON.stringify(data.boutique));
      }
      if (data) {
        const { boutique: b, ...userData } = data;
        setUser(userData);
        localStorage.setItem('tekkipro_user', JSON.stringify(userData));
      }
    } catch (err) {
      console.error('Erreur refreshBoutique:', err);
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
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
