import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocale, LANGUAGE_OPTIONS, translate } from '../lib/i18n';

const STORAGE_KEY = 'tekkipro.language';
const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState('fr');

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((storedLanguage) => {
        if (mounted && LANGUAGE_OPTIONS.some((item) => item.code === storedLanguage)) {
          setLanguageState(storedLanguage);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const setLanguage = useCallback(async (nextLanguage) => {
    if (!LANGUAGE_OPTIONS.some((item) => item.code === nextLanguage)) return;
    setLanguageState(nextLanguage);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, nextLanguage);
    } catch (_) {}
  }, []);

  const t = useCallback((key, params) => translate(language, key, params), [language]);

  const value = useMemo(() => ({
    language,
    locale: getLocale(language),
    languages: LANGUAGE_OPTIONS,
    setLanguage,
    t,
  }), [language, setLanguage, t]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useI18n must be used within a LanguageProvider');
  }
  return context;
}