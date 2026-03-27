import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe, getMesBoutiques, login as apiLogin, register as apiRegister } from '../lib/api';
import { createApiErrorFromPayload } from '@tekkipro/shared/apiError';
import { clearStoredToken, getStoredToken, setStoredToken } from '../lib/sessionStorage';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [boutique, setBoutique] = useState(null);
  const [activeBoutique, setActiveBoutique] = useState(null);
  const [mesBoutiques, setMesBoutiques] = useState([]);
  const [loading, setLoading] = useState(true);

  const syncCurrentBoutiqueId = useCallback(async (boutiqueId, isMainBoutique = false) => {
    if (boutiqueId == null) return;

    await AsyncStorage.setItem('boutiqueId', String(boutiqueId));

    if (isMainBoutique) {
      await AsyncStorage.removeItem('activeBoutique');
      setActiveBoutique(null);
    } else {
      await AsyncStorage.setItem('activeBoutique', String(boutiqueId));
      setActiveBoutique(boutiqueId);
    }
  }, []);

  const hydrateSession = useCallback(async ({ userData, boutiqueData, activeBoutiqueId = null }) => {
    const resolvedBoutiqueId = boutiqueData?.id ?? userData?.boutiqueId;

    if (!userData || resolvedBoutiqueId == null) {
      setUser(null);
      setBoutique(null);
      setActiveBoutique(null);
      setMesBoutiques([]);
      return;
    }

    const normalizedUser = userData?.boutiqueId
      ? userData
      : { ...userData, boutiqueId: resolvedBoutiqueId };

    setUser(normalizedUser);
    setBoutique(boutiqueData || null);

    await AsyncStorage.multiSet([
      ['user', JSON.stringify(normalizedUser)],
      ['boutique', JSON.stringify(boutiqueData || null)],
      ['boutiqueId', String(activeBoutiqueId || resolvedBoutiqueId)],
    ]);

    if (activeBoutiqueId && activeBoutiqueId !== resolvedBoutiqueId) {
      setActiveBoutique(activeBoutiqueId);
      await AsyncStorage.setItem('activeBoutique', String(activeBoutiqueId));
    } else {
      setActiveBoutique(null);
      await AsyncStorage.removeItem('activeBoutique');
    }

    if (boutiqueData?.plan !== 'BUSINESS') {
      setMesBoutiques([]);
    }
  }, []);

  const loadMesBoutiques = useCallback(async () => {
    if (boutique?.plan !== 'BUSINESS') {
      setMesBoutiques([]);
      return [];
    }

    try {
      const { data } = await getMesBoutiques();
      const boutiques = data?.data || [];
      setMesBoutiques(boutiques);

      if (activeBoutique && !boutiques.some((item) => item.id === activeBoutique)) {
        await syncCurrentBoutiqueId(boutique?.id, true);
      }

      return boutiques;
    } catch {
      setMesBoutiques([]);
      return [];
    }
  }, [activeBoutique, boutique?.id, boutique?.plan, syncCurrentBoutiqueId]);

  const switchBoutique = useCallback(async (boutiqueId) => {
    const resolvedMainBoutiqueId = boutique?.id;
    const targetBoutiqueId = Number(boutiqueId);

    if (!resolvedMainBoutiqueId || Number.isNaN(targetBoutiqueId)) {
      throw new Error('Boutique cible invalide');
    }

    const isMainBoutique = targetBoutiqueId === resolvedMainBoutiqueId;
    await syncCurrentBoutiqueId(isMainBoutique ? resolvedMainBoutiqueId : targetBoutiqueId, isMainBoutique);

    return mesBoutiques.find((item) => item.id === targetBoutiqueId)
      || (isMainBoutique ? boutique : null);
  }, [boutique, mesBoutiques, syncCurrentBoutiqueId]);

  const getActiveBoutiqueName = useCallback(() => {
    if (activeBoutique && mesBoutiques.length > 0) {
      const found = mesBoutiques.find((item) => item.id === activeBoutique);
      if (found) return found.nom;
    }

    return boutique?.nom || 'Ma Boutique';
  }, [activeBoutique, boutique?.nom, mesBoutiques]);

  useEffect(() => {
    loadStoredUser();
  }, [hydrateSession]);

  const loadStoredUser = async () => {
    try {
      const token = await getStoredToken();
      const entries = await AsyncStorage.multiGet(['user', 'boutique', 'activeBoutique']);
      const values = Object.fromEntries(entries);

      if (!token || !values.user) {
        setLoading(false);
        return;
      }

      const storedUser = JSON.parse(values.user);
      const storedBoutique = values.boutique ? JSON.parse(values.boutique) : null;
      const storedActiveBoutique = values.activeBoutique ? Number(values.activeBoutique) : null;

      await hydrateSession({
        userData: storedUser,
        boutiqueData: storedBoutique,
        activeBoutiqueId: Number.isNaN(storedActiveBoutique) ? null : storedActiveBoutique,
      });

      try {
        const { data } = await getMe();
        const refreshedData = data?.data;
        if (refreshedData) {
          const { boutique: refreshedBoutique, ...refreshedUser } = refreshedData;
          await hydrateSession({
            userData: refreshedUser,
            boutiqueData: refreshedBoutique,
            activeBoutiqueId: Number.isNaN(storedActiveBoutique) ? null : storedActiveBoutique,
          });
        }
      } catch (_) {}
    } catch (_) {}
    setLoading(false);
  };

  useEffect(() => {
    if (!loading) {
      loadMesBoutiques();
    }
  }, [loadMesBoutiques, loading]);

  const refreshBoutique = useCallback(async () => {
    try {
      const storedActiveBoutique = await AsyncStorage.getItem('activeBoutique');
      const activeBoutiqueId = storedActiveBoutique ? Number(storedActiveBoutique) : activeBoutique;
      const { data } = await getMe();
      const refreshedData = data?.data;

      if (!refreshedData) return null;

      const { boutique: refreshedBoutique, ...refreshedUser } = refreshedData;

      await hydrateSession({
        userData: refreshedUser,
        boutiqueData: refreshedBoutique,
        activeBoutiqueId: Number.isNaN(activeBoutiqueId) ? null : activeBoutiqueId,
      });

      if (refreshedBoutique?.plan === 'BUSINESS') {
        try {
          const { data: boutiquesData } = await getMesBoutiques();
          setMesBoutiques(boutiquesData?.data || []);
        } catch {
          setMesBoutiques([]);
        }
      } else {
        setMesBoutiques([]);
      }

      return refreshedBoutique;
    } catch {
      return null;
    }
  }, [activeBoutique, hydrateSession]);

  const login = async (email, password) => {
    const { data } = await apiLogin(email, password);
    if (!data.success) throw createApiErrorFromPayload(data);
    const {
      token,
      user: userData,
      boutique,
      boutiqueId: legacyBoutiqueId,
    } = data.data;

    const resolvedBoutiqueId = boutique?.id ?? userData?.boutiqueId ?? legacyBoutiqueId;
    if (!token || !userData || resolvedBoutiqueId == null) {
      throw new Error('Réponse de connexion invalide');
    }

    const normalizedUser = userData?.boutiqueId
      ? userData
      : { ...userData, boutiqueId: resolvedBoutiqueId };

    await setStoredToken(token);
    await AsyncStorage.multiSet([
      ['user', JSON.stringify(normalizedUser)],
      ['boutique', JSON.stringify(boutique || null)],
      ['boutiqueId', String(resolvedBoutiqueId)],
    ]);

    await AsyncStorage.removeItem('activeBoutique');

    setUser(normalizedUser);
    setBoutique(boutique || null);
    setActiveBoutique(null);
    setMesBoutiques([]);

    if (boutique?.plan === 'BUSINESS') {
      try {
        const { data: boutiquesData } = await getMesBoutiques();
        setMesBoutiques(boutiquesData?.data || []);
      } catch {
        setMesBoutiques([]);
      }
    }

    return normalizedUser;
  };

  const register = async (payload) => {
    const { data } = await apiRegister(payload);
    if (!data.success) throw createApiErrorFromPayload(data);

    const {
      requiresEmailVerification = false,
      token,
      user: userData,
      boutique,
      boutiqueId: legacyBoutiqueId,
    } = data.data;

    if (requiresEmailVerification) {
      return data.data;
    }

    const resolvedBoutiqueId = boutique?.id ?? userData?.boutiqueId ?? legacyBoutiqueId;
    if (!token || !userData || resolvedBoutiqueId == null) {
      throw new Error('Réponse d\'inscription invalide');
    }

    const normalizedUser = userData?.boutiqueId
      ? userData
      : { ...userData, boutiqueId: resolvedBoutiqueId };

    await setStoredToken(token);
    await AsyncStorage.multiSet([
      ['user', JSON.stringify(normalizedUser)],
      ['boutique', JSON.stringify(boutique || null)],
      ['boutiqueId', String(resolvedBoutiqueId)],
    ]);

    await AsyncStorage.removeItem('activeBoutique');

    setUser(normalizedUser);
    setBoutique(boutique || null);
    setActiveBoutique(null);
    setMesBoutiques([]);

    return data.data;
  };

  const logout = async () => {
    await clearStoredToken();
    await AsyncStorage.multiRemove(['user', 'boutique', 'boutiqueId', 'activeBoutique']);
    setUser(null);
    setBoutique(null);
    setActiveBoutique(null);
    setMesBoutiques([]);
  };

  const plan = boutique?.plan || 'GRATUIT';
  const isBusiness = plan === 'BUSINESS';

  return (
    <AuthContext.Provider value={{
      user,
      boutique,
      activeBoutique,
      mesBoutiques,
      loading,
      login,
      register,
      logout,
      switchBoutique,
      loadMesBoutiques,
      getActiveBoutiqueName,
      refreshBoutique,
      isBusiness,
      plan,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

