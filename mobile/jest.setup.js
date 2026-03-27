global.__DEV__ = true;

const secureStoreState = {};

jest.mock('expo-status-bar', () => ({ StatusBar: () => null }));
jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('expo-constants', () => ({
  expoGoConfig: null,
  expoConfig: null,
  manifest2: null,
  manifest: null,
}));
jest.mock(
  '@react-native-async-storage/async-storage',
  () => require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key) => (key in secureStoreState ? secureStoreState[key] : null)),
  setItemAsync: jest.fn(async (key, value) => {
    secureStoreState[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key) => {
    delete secureStoreState[key];
  }),
  __reset: () => {
    Object.keys(secureStoreState).forEach((key) => delete secureStoreState[key]);
  },
}));

beforeEach(() => {
  const SecureStore = require('expo-secure-store');
  SecureStore.__reset();
});