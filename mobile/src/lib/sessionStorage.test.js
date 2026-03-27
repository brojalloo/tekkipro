import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { clearStoredToken, getStoredToken, setStoredToken } from './sessionStorage';

describe('sessionStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lit le token depuis SecureStore en priorité', async () => {
    SecureStore.getItemAsync.mockResolvedValue('secure-token');

    const token = await getStoredToken();

    expect(token).toBe('secure-token');
    expect(AsyncStorage.getItem).not.toHaveBeenCalledWith('token');
  });

  it('migre le token legacy depuis AsyncStorage vers SecureStore', async () => {
    SecureStore.getItemAsync.mockResolvedValue(null);
    AsyncStorage.getItem.mockResolvedValue('legacy-token');

    const token = await getStoredToken();

    expect(token).toBe('legacy-token');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'legacy-token');
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('token');
  });

  it('stocke et efface le token dans SecureStore', async () => {
    await setStoredToken('new-token');
    await clearStoredToken();

    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('token', 'new-token');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('token');
  });
});