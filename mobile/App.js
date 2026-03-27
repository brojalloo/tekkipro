import React, { useState, useEffect } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';

let NavigationContainer, createNativeStackNavigator, Stack, DefaultTheme, DarkTheme;
let AuthProvider, useAuth;
let LanguageProvider, useI18n;
let ThemeProvider, useTheme;
let WelcomeScreen, LoginScreen, DashboardScreen, ScannerScreen, StockScreen, VentesScreen, VenteTicketScreen, ProduitFormScreen, ClientsScreen, DettesScreen, AbonnementScreen, EmployesScreen, ParametresScreen;
let SplashScreen;
let Feather;
let importError = null;

try {
  const navigation = require('@react-navigation/native');
  NavigationContainer = navigation.NavigationContainer;
  DefaultTheme = navigation.DefaultTheme;
  DarkTheme = navigation.DarkTheme;
} catch (e) { importError = 'react-navigation/native: ' + e.message; }
try { createNativeStackNavigator = require('@react-navigation/native-stack').createNativeStackNavigator; Stack = createNativeStackNavigator(); } catch (e) { importError = 'react-navigation/native-stack: ' + e.message; }
try { Feather = require('@expo/vector-icons').Feather; } catch (e) { importError = '@expo/vector-icons: ' + e.message; }
try { const auth = require('./src/context/AuthContext'); AuthProvider = auth.AuthProvider; useAuth = auth.useAuth; } catch (e) { importError = 'AuthContext: ' + e.message; }
try { const lang = require('./src/context/LanguageContext'); LanguageProvider = lang.LanguageProvider; useI18n = lang.useI18n; } catch (e) { importError = 'LanguageContext: ' + e.message; }
try { const theme = require('./src/context/ThemeContext'); ThemeProvider = theme.ThemeProvider; useTheme = theme.useTheme; } catch (e) { importError = 'ThemeContext: ' + e.message; }
try { WelcomeScreen = require('./src/screens/WelcomeScreen').default; } catch (e) { importError = 'WelcomeScreen: ' + e.message; }
try { LoginScreen = require('./src/screens/LoginScreen').default; } catch (e) { importError = 'LoginScreen: ' + e.message; }
try { DashboardScreen = require('./src/screens/DashboardScreen').default; } catch (e) { importError = 'DashboardScreen: ' + e.message; }
try { ScannerScreen = require('./src/screens/ScannerScreen').default; } catch (e) { importError = 'ScannerScreen: ' + e.message; }
try { StockScreen = require('./src/screens/StockScreen').default; } catch (e) { importError = 'StockScreen: ' + e.message; }
try { VentesScreen = require('./src/screens/VentesScreen').default; } catch (e) { importError = 'VentesScreen: ' + e.message; }
try { VenteTicketScreen = require('./src/screens/VenteTicketScreen').default; } catch (e) { importError = 'VenteTicketScreen: ' + e.message; }
try { ProduitFormScreen = require('./src/screens/ProduitFormScreen').default; } catch (e) { importError = 'ProduitFormScreen: ' + e.message; }
try { ClientsScreen = require('./src/screens/ClientsScreen').default; } catch (e) { importError = 'ClientsScreen: ' + e.message; }
try { DettesScreen = require('./src/screens/DettesScreen').default; } catch (e) { importError = 'DettesScreen: ' + e.message; }
try { AbonnementScreen = require('./src/screens/AbonnementScreen').default; } catch (e) { importError = 'AbonnementScreen: ' + e.message; }
try { EmployesScreen = require('./src/screens/EmployesScreen').default; } catch (e) { importError = 'EmployesScreen: ' + e.message; }
try { ParametresScreen = require('./src/screens/ParametresScreen').default; } catch (e) { importError = 'ParametresScreen: ' + e.message; }
try { SplashScreen = require('./src/screens/SplashScreen').default; } catch (e) { /* splash optional */ }
// TekkiPro brand palette — always used for chrome regardless of theme
const TP = {
  dark: '#071C08',
  green: '#1B5E20',
  gold: '#FFD600',
  accent: '#D32F2F',
  bg: '#F5F2ED',
  white: '#FFFFFF',
  muted: 'rgba(255,255,255,0.55)',
};

const navigationTheme = DefaultTheme ? {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: TP.green,
    background: TP.bg,
    card: TP.dark,
    text: TP.white,
    border: 'transparent',
    notification: TP.green,
  },
} : null;

const NAV_TABS = [
  { route: 'Dashboard', labelKey: 'navigation.home', icon: 'home' },
  { route: 'Ventes', labelKey: 'navigation.sales', icon: 'bar-chart-2' },
  { route: 'Scanner', labelKey: 'navigation.scanner', icon: 'maximize' },
  { route: 'Stock', labelKey: 'navigation.stock', icon: 'package' },
  { route: 'Paramètres', labelKey: 'navigation.settings', icon: 'grid' },
];

function ScreenWithBottomNav({ component: ScreenComponent, currentRouteName, navigation, route }) {
  const { t } = useI18n();
  const { isDark } = useTheme();

  const wrapBg = isDark ? '#0F172A' : '#F8F6F3';
  const wrapBorder = isDark ? '#1E293B' : '#EDE8E3';
  const pillBg = isDark ? '#1E293B' : '#EEEBE7';
  const inactiveColor = isDark ? '#475569' : '#9CA3AF';

  return (
    <View style={[styles.shell, { backgroundColor: wrapBg }]}>
      <View style={styles.screenArea}>
        <ScreenComponent navigation={navigation} route={route} />
      </View>

      <View style={[styles.bottomBarWrap, { backgroundColor: wrapBg, borderTopColor: wrapBorder }]}>
        <View style={[styles.bottomBar, { backgroundColor: pillBg }]}>
          {NAV_TABS.map((tab) => {
            const isActive = currentRouteName === tab.route;
            return (
              <TouchableOpacity
                key={tab.route}
                style={[styles.tabButton, isActive && styles.tabButtonActive]}
                activeOpacity={0.85}
                onPress={() => { if (!isActive) navigation.navigate(tab.route); }}
              >
                <Feather name={tab.icon} size={16} color={isActive ? '#FFFFFF' : inactiveColor} />
                <Text style={[styles.tabLabel, { color: inactiveColor }, isActive && styles.tabLabelActive]} numberOfLines={1}>
                  {t(tab.labelKey).toUpperCase()}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const DashboardWithBottomNav = (props) => <ScreenWithBottomNav {...props} component={DashboardScreen} currentRouteName="Dashboard" />;
const VentesWithBottomNav = (props) => <ScreenWithBottomNav {...props} component={VentesScreen} currentRouteName="Ventes" />;
const ScannerWithBottomNav = (props) => <ScreenWithBottomNav {...props} component={ScannerScreen} currentRouteName="Scanner" />;
const StockWithBottomNav = (props) => <ScreenWithBottomNav {...props} component={StockScreen} currentRouteName="Stock" />;
const ParametresWithBottomNav = (props) => <ScreenWithBottomNav {...props} component={ParametresScreen} currentRouteName="Paramètres" />;

const headerOptions = (title) => ({
  headerShown: true,
  title,
  headerStyle: { backgroundColor: TP.dark },
  headerTintColor: TP.white,
  headerShadowVisible: false,
});

function AppNavigator() {
  const { user, loading } = useAuth();
  const { t } = useI18n();

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TP.green} />
        <Text style={{ marginTop: 10, color: TP.dark }}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!user ? (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'slide_from_right', gestureEnabled: true }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Dashboard" component={DashboardWithBottomNav} />
            <Stack.Screen name="Scanner" component={ScannerWithBottomNav} />
            <Stack.Screen name="Stock" component={StockWithBottomNav} />
            <Stack.Screen name="Ventes" component={VentesWithBottomNav} />
            <Stack.Screen name="VenteTicket" component={VenteTicketScreen} options={headerOptions(t('navigation.salesTicket'))} />
            <Stack.Screen name="Clients" component={ClientsScreen} />
            <Stack.Screen name="Dettes" component={DettesScreen} />
            <Stack.Screen name="Abonnement" component={AbonnementScreen} />
            <Stack.Screen name="Employes" component={EmployesScreen} options={headerOptions(t('navigation.employees'))} />
            <Stack.Screen name="Paramètres" component={ParametresWithBottomNav} />
            <Stack.Screen name="ProduitForm" component={ProduitFormScreen} options={headerOptions(t('navigation.product'))} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}


function ErrorBoundaryFallback({ error }) {
  return (
    <View style={styles.centered}>
      <Text style={{ color: 'red', fontSize: 16, fontWeight: 'bold' }}>Erreur :</Text>
      <Text style={{ color: '#333', margin: 20, textAlign: 'center' }}>{error?.message || 'Erreur inconnue'}</Text>
    </View>
  );
}

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) return <ErrorBoundaryFallback error={this.state.error} />;
    return this.props.children;
  }
}

function AppContent() {
  return (
    <>
      <StatusBar style="light" backgroundColor={TP.dark} />
      <AppNavigator />
    </>
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(!!SplashScreen);

  if (showSplash && SplashScreen) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  if (!ThemeProvider || !AuthProvider || !LanguageProvider || importError) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}>
          <Text style={styles.splashLogoText}>T</Text>
        </View>
        <Text style={styles.splashTitle}>TekkiPro</Text>
        {importError && <Text style={{ color: '#FFD0C0', marginTop: 16, textAlign: 'center', paddingHorizontal: 24, fontSize: 12 }}>{importError}</Text>}
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <AppContent />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F6F3' },
  splash: { flex: 1, backgroundColor: '#071C08', alignItems: 'center', justifyContent: 'center' },
  splashLogo: {
    width: 80, height: 80, borderRadius: 20,
    backgroundColor: '#FFD600',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
    shadowColor: '#FFD600', shadowOpacity: 0.35, shadowRadius: 20, elevation: 8,
  },
  splashLogoText: { fontSize: 36, fontWeight: '900', color: '#071C08' },
  splashTitle: { fontSize: 28, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  splashSubtitle: { fontSize: 14, color: 'rgba(245,242,237,0.6)', marginTop: 8 },
  shell: { flex: 1, backgroundColor: '#F8F6F3' },
  screenArea: { flex: 1 },
  bottomBarWrap: {
    backgroundColor: '#F8F6F3',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#EDE8E3',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEEBE7',
    borderRadius: 40,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    borderRadius: 40,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: '#1B5E20',
  },
  tabLabel: { fontSize: 10, fontWeight: '700', color: '#9CA3AF', letterSpacing: 0.3 },
  tabLabelActive: { color: '#FFFFFF' },
});
