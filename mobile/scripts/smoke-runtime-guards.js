const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8');
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertNoCameraChildren(relativePath) {
  const source = read(relativePath);
  assert(
    !/<CameraView[\s\S]*?>[\s\S]*?<\/CameraView>/.test(source),
    `${relativePath} should not render children inside <CameraView>.`
  );
  assert(
    /<CameraView[\s\S]*?\/>/.test(source),
    `${relativePath} should render a self-closing <CameraView />.`
  );
}

function assertThermalLazyLoad() {
  const source = read('src/lib/thermalPrinter.js');
  assert(source.includes('const getThermalBindings = () => {'), 'thermalPrinter should expose lazy bindings.');
  assert(source.includes("prepareThermalNativeModules();"), 'thermalPrinter should prepare native modules before require.');
  assert(source.includes("require('@finan-me/react-native-thermal-printer')"), 'thermalPrinter should still load the native package on demand.');
  assert(source.includes('const parseJsonOrValue = (value, fallback) => {'), 'thermalPrinter should accept native event payloads that are already objects.');
  assert(source.includes('if (paired.length || found.length) {'), 'thermalPrinter should keep paired printers even if active discovery fails.');
  assert(source.includes("await requestBluetoothPermissions();"), 'thermalPrinter should request Bluetooth permissions before connection-sensitive actions.');
}

function assertSubscriptionFallback() {
  const source = read('src/screens/AbonnementScreen.js');
  assert(source.includes("const [errorMessage, setErrorMessage] = useState('');"), 'AbonnementScreen should track load errors.');
  assert(source.includes('loadAbonnement({ showAlert: false });'), 'AbonnementScreen should load silently on mount.');
  assert(source.includes('[activeBoutique, loadAbonnement]'), 'AbonnementScreen should refresh when active boutique changes.');
  assert(source.includes('text.loadUnavailable'), 'AbonnementScreen should render a visible fallback state.');
}

function assertClientsUpgradeCta() {
  const source = read('src/screens/ClientsScreen.js');
  assert(source.includes("viewPlans: 'Voir les abonnements'"), 'ClientsScreen should expose a view plans CTA label.');
  assert(source.includes("navigation.navigate('Abonnement')"), 'ClientsScreen should navigate to Abonnement on upgrade errors.');
  assert(source.includes('error.response?.data?.upgrade'), 'ClientsScreen should detect upgrade payloads.');
  assert(source.includes('const CLIENT_PLAN_LIMITS = { GRATUIT: 30, PRO: null, BUSINESS: null };'), 'ClientsScreen should expose the Starter client quota.');
  assert(source.includes('text.planLimitTitle'), 'ClientsScreen should render a visible client quota banner.');
}

function assertProductConversionsMobile() {
  const source = read('src/screens/ProduitFormScreen.js');
  assert(source.includes("saleUnitsTitle: 'Unités de vente (conversions)'"), 'ProduitFormScreen should expose the sales-units section.');
  assert(source.includes("expirationTitle: 'Péremption & alertes'"), 'ProduitFormScreen should expose the expiration section.');
  assert(source.includes('prepareExpirationForSubmit(form)'), 'ProduitFormScreen should prepare expiration data before submit.');
  assert(source.includes('const SUGGESTIONS_UNITES = {'), 'ProduitFormScreen should expose quick unit suggestions.');
  assert(source.includes('prepareManualUnitsForSubmit(unitesVente)'), 'ProduitFormScreen should prepare manual sales units before submit.');
  assert(source.includes('addProduitUniteVente('), 'ProduitFormScreen should create sales units on edit when needed.');
}

function assertStockExpirationAlerts() {
  const source = read('src/screens/StockScreen.js');
  assert(source.includes("expiringSoon: 'Expire bientôt'"), 'StockScreen should expose expiration alert labels.');
  assert(source.includes('const getPeremptionBadge = (item, text, locale) => {'), 'StockScreen should compute expiration badges.');
  assert(source.includes('peremptionBadge && ('), 'StockScreen should render expiration badges when relevant.');
}

function assertSalesExpirationAlerts() {
  const source = read('src/screens/VentesScreen.js');
  assert(source.includes("expirationSoonTitle: 'Péremption proche'"), 'VentesScreen should expose expiration warning labels.');
  assert(source.includes('const getExpirationAlert = (produit, text, locale) => {'), 'VentesScreen should compute expiration sale alerts.');
  assert(source.includes('datePeremption: produit.datePeremption || null'), 'VentesScreen should carry expiration data into the cart.');
}

function assertWifiPreferredOverUsb() {
  const source = read('src/lib/api.js');
  assert(source.includes('const EXPO_LAN_DEV_BASE_URL = expoDebuggerHost ? `http://${expoDebuggerHost}:5000/api` : null;'), 'api.js should expose a LAN dev base URL derived from Expo host.');
  assert(source.includes('|| EXPO_LAN_DEV_BASE_URL'), 'api.js should prefer Expo LAN host before Android USB loopback.');
}

function assertPdfUrlNoLongerAcceptsToken() {
  const source = read('src/lib/api.js');
  assert(source.includes("export const getFacturePdfUrl = (id) => `${BASE_URL}/factures/${id}/pdf`;"), 'api.js should build facture URLs without embedding auth tokens.');
}

function assertCleartextTrafficDisabledByDefault() {
  const appJson = read('app.json');
  const appConfig = read('app.config.js');
  assert(appJson.includes('"usesCleartextTraffic": false'), 'app.json should disable cleartext traffic by default.');
  assert(appConfig.includes("process.env.EXPO_PUBLIC_ALLOW_CLEARTEXT === 'true'"), 'app.config.js should only allow cleartext traffic when explicitly opted in.');
}

function assertSecureTokenStorageEnabled() {
  const appConfig = read('app.config.js');
  const authContext = read('src/context/AuthContext.js');
  const apiSource = read('src/lib/api.js');
  const storageSource = read('src/lib/sessionStorage.js');

  assert(appConfig.includes("plugins.push('expo-secure-store')"), 'app.config.js should enable expo-secure-store.');
  assert(storageSource.includes("import * as SecureStore from 'expo-secure-store';"), 'sessionStorage should use expo-secure-store.');
  assert(authContext.includes("import { clearStoredToken, getStoredToken, setStoredToken } from '../lib/sessionStorage';"), 'AuthContext should centralize secure token storage.');
  assert(apiSource.includes("import { clearStoredToken, getStoredToken } from './sessionStorage';"), 'api.js should read tokens from secure storage helpers.');
}

function main() {
  assertNoCameraChildren('src/screens/ScannerScreen.js');
  assertNoCameraChildren('src/screens/ProduitFormScreen.js');
  assertThermalLazyLoad();
  assertSubscriptionFallback();
  assertClientsUpgradeCta();
  assertProductConversionsMobile();
  assertStockExpirationAlerts();
  assertSalesExpirationAlerts();
  assertWifiPreferredOverUsb();
  assertPdfUrlNoLongerAcceptsToken();
  assertCleartextTrafficDisabledByDefault();
  assertSecureTokenStorageEnabled();
  console.log('Smoke runtime guards passed.');
}

main();

