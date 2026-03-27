import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'token';

export async function getStoredToken() {
  const secureToken = await SecureStore.getItemAsync(TOKEN_KEY);
  if (secureToken) return secureToken;

  const legacyToken = await AsyncStorage.getItem(TOKEN_KEY);
  if (!legacyToken) return null;

  await SecureStore.setItemAsync(TOKEN_KEY, legacyToken);
  await AsyncStorage.removeItem(TOKEN_KEY);
  return legacyToken;
}

export async function setStoredToken(token) {
  if (!token) {
    await clearStoredToken();
    return;
  }

  await SecureStore.setItemAsync(TOKEN_KEY, token);
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function clearStoredToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
  await AsyncStorage.removeItem(TOKEN_KEY);
}