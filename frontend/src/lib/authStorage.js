const STORAGE_KEYS = {
  token: 'tekkipro_token',
  user: 'tekkipro_user',
  boutique: 'tekkipro_boutique',
  activeBoutique: 'tekkipro_active_boutique',
};

const getStorage = (type) => {
  if (typeof window === 'undefined') return null;
  return window[type] ?? null;
};

const readKey = (storage, key) => storage?.getItem(key) ?? null;
const writeKey = (storage, key, value) => storage?.setItem(key, value);
const removeKey = (storage, key) => storage?.removeItem(key);

const migrateLegacyLocalStorage = () => {
  const sessionStorageRef = getStorage('sessionStorage');
  const localStorageRef = getStorage('localStorage');

  if (!sessionStorageRef || !localStorageRef) {
    return;
  }

  const sessionToken = readKey(sessionStorageRef, STORAGE_KEYS.token);
  const legacyToken = readKey(localStorageRef, STORAGE_KEYS.token);

  if (!sessionToken && legacyToken) {
    Object.values(STORAGE_KEYS).forEach((key) => {
      const value = readKey(localStorageRef, key);
      if (value != null) {
        writeKey(sessionStorageRef, key, value);
      }
    });
  }

  Object.values(STORAGE_KEYS).forEach((key) => removeKey(localStorageRef, key));
};

export const getStoredAuthData = () => {
  migrateLegacyLocalStorage();

  const sessionStorageRef = getStorage('sessionStorage');
  if (!sessionStorageRef) {
    return { token: null, user: null, boutique: null, activeBoutique: null };
  }

  const token = readKey(sessionStorageRef, STORAGE_KEYS.token);
  const savedUser = readKey(sessionStorageRef, STORAGE_KEYS.user);
  const savedBoutique = readKey(sessionStorageRef, STORAGE_KEYS.boutique);
  const savedActive = readKey(sessionStorageRef, STORAGE_KEYS.activeBoutique);

  if (!token || !savedUser) {
    return { token: null, user: null, boutique: null, activeBoutique: null };
  }

  try {
    const user = JSON.parse(savedUser);
    const boutique = savedBoutique ? JSON.parse(savedBoutique) : null;
    const activeBoutique = savedActive && boutique
      ? Number.parseInt(savedActive, 10)
      : null;

    return {
      token,
      user,
      boutique,
      activeBoutique: Number.isNaN(activeBoutique) ? null : activeBoutique,
    };
  } catch {
    clearStoredAuth();
    return { token: null, user: null, boutique: null, activeBoutique: null };
  }
};

export const persistAuthSession = ({ token, user, boutique }) => {
  const sessionStorageRef = getStorage('sessionStorage');
  if (!sessionStorageRef) return;

  writeKey(sessionStorageRef, STORAGE_KEYS.token, token);
  writeKey(sessionStorageRef, STORAGE_KEYS.user, JSON.stringify(user));
  writeKey(sessionStorageRef, STORAGE_KEYS.boutique, JSON.stringify(boutique));
  removeKey(sessionStorageRef, STORAGE_KEYS.activeBoutique);

  const localStorageRef = getStorage('localStorage');
  Object.values(STORAGE_KEYS).forEach((key) => removeKey(localStorageRef, key));
};

export const clearStoredAuth = () => {
  const sessionStorageRef = getStorage('sessionStorage');
  const localStorageRef = getStorage('localStorage');

  Object.values(STORAGE_KEYS).forEach((key) => {
    removeKey(sessionStorageRef, key);
    removeKey(localStorageRef, key);
  });
};

export const setStoredActiveBoutique = (boutiqueId) => {
  const sessionStorageRef = getStorage('sessionStorage');
  if (!sessionStorageRef) return;

  writeKey(sessionStorageRef, STORAGE_KEYS.activeBoutique, String(boutiqueId));
};

export const clearStoredActiveBoutique = () => {
  removeKey(getStorage('sessionStorage'), STORAGE_KEYS.activeBoutique);
  removeKey(getStorage('localStorage'), STORAGE_KEYS.activeBoutique);
};

export const updateStoredBoutique = (boutique) => {
  const sessionStorageRef = getStorage('sessionStorage');
  if (!sessionStorageRef) return;

  writeKey(sessionStorageRef, STORAGE_KEYS.boutique, JSON.stringify(boutique));
};

export const updateStoredUser = (user) => {
  const sessionStorageRef = getStorage('sessionStorage');
  if (!sessionStorageRef) return;

  writeKey(sessionStorageRef, STORAGE_KEYS.user, JSON.stringify(user));
};

export const getStoredToken = () => getStoredAuthData().token;
export const getStoredActiveBoutiqueId = () => getStoredAuthData().activeBoutique;