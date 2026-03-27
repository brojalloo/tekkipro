import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, ScrollView, Animated,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, Camera } from 'expo-camera';
import { getProduitByBarcode } from '../lib/api';
import { useScanSuccessBeep } from '../lib/scanFeedback';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';

// ─── Brand Tokens ─────────────────────────────────────────────────────────────
const TP = {
  headerBg:        '#071C08',
  green:           '#1B5E20',
  gold:            '#FFD600',
  accent:          '#D32F2F',
  screenBg:        '#F5F2ED',
  cardBg:          '#FFFFFF',
  text:            '#1A1A18',
  muted:           '#6B7280',
  danger:          '#D32F2F',
  greenLight:      'rgba(27,94,32,0.10)',
  greenBorder:     'rgba(27,94,32,0.25)',
  goldLight:       'rgba(255,214,0,0.10)',
  goldBorder:      'rgba(255,214,0,0.30)',
  dangerLight:     '#FEF2F2',
  dangerBorder:    '#FECACA',
  overlay:         'rgba(7,28,8,0.60)',
};

const ICON_ACCENT = [TP.accent, TP.gold, TP.green];
const formatCFA = (value) => `${(value || 0).toLocaleString('fr-FR')} F`;

const AUTO_MULTI_SCAN_DELAY = 900;
const DUPLICATE_SCAN_GUARD_MS = 1200;

const SCANNER_TEXT = {
  fr: {
    title: 'Scanner produit',
    hint: 'Placez le code-barres dans le cadre',
    scanBtn: 'Scanner',
    recentTitle: 'Scannés récemment',
    noRecent: 'Aucun produit scanné',
    sellNow: 'Vendre maintenant',
    chooseWithoutScanner: 'Choisir sans scanner',
    newScan: 'Nouveau scan',
    back: 'Retour',
    productNotFound: 'Produit introuvable',
    finishSale: 'Terminer la vente',
    manualSale: 'Vente manuelle',
    continueScan: 'Continuer le scan',
    retry: 'Réessayer',
    createProductPrompt: (code) => `Code: ${code}\nVoulez-vous créer ce produit ?`,
    createProduct: 'Créer le produit',
    saleBack: 'Retour vente',
    adminOnlyCreate: (code) => `Code: ${code}\nSeul un administrateur peut créer ce produit.`,
    errorTitle: 'Erreur',
    productFetchError: 'Impossible de récupérer le produit',
    cameraRequest: 'Demande de permission caméra...',
    cameraDenied: 'Accès à la caméra refusé',
    cameraDeniedHelp: "Activez la permission dans les paramètres de l'appareil.",
    searching: 'Recherche en cours...',
    cartHint: "Scannez plusieurs produits d'affilée",
    singleHint: 'Pointez la caméra vers un code-barres',
    scansCount: (count) => `${count} scan(s)`,
    lastAdded: 'Dernier produit ajouté',
    scanAgain: 'Scanner à nouveau',
    doneWithCount: (count) => `Terminer (${count})`,
    returnToSale: 'Retour à la vente',
    finishThenChoose: 'Terminer puis choisir sans code-barres',
    noBarcodeProduct: 'Produit sans code-barres',
    flashOn: 'Flash ON',
    flashOff: 'Flash OFF',
    productDetails: (produit, unitPrice, unitLabel, code) =>
      `Stock: ${produit.stock} ${produit.uniteBase}\nPrix vente: ${formatCFA(unitPrice)} / ${unitLabel}\nCode: ${code}`,
    codeOnly: (code) => `Code: ${code}`,
  },
  en: {
    title: 'Scan product',
    hint: 'Place the barcode inside the frame',
    scanBtn: 'Scan',
    recentTitle: 'Recently scanned',
    noRecent: 'No product scanned',
    sellNow: 'Sell now',
    chooseWithoutScanner: 'Choose without scanner',
    newScan: 'New scan',
    back: 'Back',
    productNotFound: 'Product not found',
    finishSale: 'Finish sale',
    manualSale: 'Manual sale',
    continueScan: 'Continue scanning',
    retry: 'Try again',
    createProductPrompt: (code) => `Code: ${code}\nDo you want to create this product?`,
    createProduct: 'Create product',
    saleBack: 'Back to sale',
    adminOnlyCreate: (code) => `Code: ${code}\nOnly an administrator can create this product.`,
    errorTitle: 'Error',
    productFetchError: 'Unable to fetch the product',
    cameraRequest: 'Requesting camera permission...',
    cameraDenied: 'Camera access denied',
    cameraDeniedHelp: 'Enable the permission in your device settings.',
    searching: 'Searching...',
    cartHint: 'Scan several products in a row',
    singleHint: 'Point the camera at a barcode',
    scansCount: (count) => `${count} scan(s)`,
    lastAdded: 'Last added product',
    scanAgain: 'Scan again',
    doneWithCount: (count) => `Finish (${count})`,
    returnToSale: 'Back to sale',
    finishThenChoose: 'Finish then choose without barcode',
    noBarcodeProduct: 'Product without barcode',
    flashOn: 'Flash ON',
    flashOff: 'Flash OFF',
    productDetails: (produit, unitPrice, unitLabel, code) =>
      `Stock: ${produit.stock} ${produit.uniteBase}\nSale price: ${formatCFA(unitPrice)} / ${unitLabel}\nCode: ${code}`,
    codeOnly: (code) => `Code: ${code}`,
  },
};

const getSuggestedUnit = (produit, uniteId = null) => {
  if (!produit?.unitesVente?.length) return null;
  if (uniteId) {
    const matchedUnit = produit.unitesVente.find((unit) => unit.id === Number(uniteId));
    if (matchedUnit) return matchedUnit;
  }
  return produit.unitesVente.find((unit) => unit.estDefaut) || produit.unitesVente[0] || null;
};

// Animated scan line component
function ScanLine() {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-60, 60] });

  return (
    <Animated.View
      style={[styles.scanLine, { transform: [{ translateY }] }]}
      pointerEvents="none"
    />
  );
}

export default function ScannerScreen({ navigation, route }) {
  const { user } = useAuth();
  const { language } = useI18n();
  const { isDark } = useTheme();
  const playScanSuccessBeep = useScanSuccessBeep();

  const D = {
    bg: isDark ? '#0F172A' : TP.screenBg,
    card: isDark ? '#1E293B' : TP.cardBg,
    border: isDark ? '#334155' : TP.greenBorder,
    text: isDark ? '#F8FAFC' : TP.text,
    muted: isDark ? '#94A3B8' : TP.muted,
    recentBg: isDark ? '#1E293B' : TP.cardBg,
    emptyBg: isDark ? '#1E293B' : TP.cardBg,
  };
  const isCartMode = route?.params?.mode === 'cart';
  const [hasPermission, setHasPermission] = useState(null);
  const [torchEnabled, setTorchEnabled] = useState(false);
  const [scanned, setScanned] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingLookups, setPendingLookups] = useState([]);
  const [lastScannedItem, setLastScannedItem] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const scanLock = useRef(false);
  const lastScanRef = useRef({ data: '', at: 0 });
  const text = SCANNER_TEXT[language] || SCANNER_TEXT.fr;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const resetScan = () => {
    setScanned(false);
    scanLock.current = false;
  };

  const returnToVentes = (extraParams = null) => {
    resetScan();
    if (extraParams) {
      navigation.navigate('Ventes', extraParams);
      return;
    }
    navigation.navigate('Ventes');
  };

  const finishCartScanning = () => {
    const items = pendingLookups;
    setPendingLookups([]);
    setLastScannedItem(null);
    if (items.length) {
      returnToVentes({ scannedItems: items });
      return;
    }
    returnToVentes();
  };

  const handleBarcodeScanned = async ({ data }) => {
    const now = Date.now();
    if (scanLock.current || scanned) return;
    if (isCartMode && lastScanRef.current.data === data && now - lastScanRef.current.at < DUPLICATE_SCAN_GUARD_MS) return;

    lastScanRef.current = { data, at: now };
    scanLock.current = true;
    setScanned(true);
    setLoading(true);
    playScanSuccessBeep();

    try {
      const res = await getProduitByBarcode(data);
      const lookupData = res.data?.data;
      const produit = lookupData?.produit || lookupData;

      if (produit) {
        const suggestedUnit = getSuggestedUnit(produit, lookupData?.uniteId);
        const unitLabel = suggestedUnit?.nom || produit.uniteBase;
        const unitPrice = suggestedUnit?.prix ?? produit.prixVente;

        // Add to recent scans
        setRecentScans((prev) => {
          const filtered = prev.filter((s) => s.code !== data);
          return [{ nom: produit.nom, code: data, price: unitPrice }, ...filtered].slice(0, 5);
        });

        if (isCartMode) {
          setPendingLookups((current) => [...current, lookupData]);
          setLastScannedItem({ nom: produit.nom, unitLabel, unitPrice });
          setTimeout(resetScan, AUTO_MULTI_SCAN_DELAY);
          return;
        }

        Alert.alert(
          produit.nom,
          text.productDetails(produit, unitPrice, unitLabel, data),
          [
            { text: text.sellNow, onPress: () => { resetScan(); navigation.navigate('Ventes', { scannedLookup: lookupData }); } },
            { text: text.chooseWithoutScanner, onPress: () => { resetScan(); navigation.navigate('Ventes'); } },
            { text: text.newScan, onPress: resetScan },
            { text: text.back, onPress: () => navigation.goBack() },
          ]
        );
        return;
      }

      Alert.alert(text.productNotFound, text.codeOnly(data), [
        { text: isCartMode ? text.finishSale : text.manualSale, onPress: () => { isCartMode ? finishCartScanning() : returnToVentes(); } },
        { text: isCartMode ? text.continueScan : text.retry, onPress: resetScan },
      ]);
    } catch (err) {
      if (err.response?.status === 404) {
        if (user?.role === 'ADMIN') {
          Alert.alert(text.productNotFound, text.createProductPrompt(data), [
            { text: text.createProduct, onPress: () => { resetScan(); navigation.navigate('ProduitForm', { codeBarre: data }); } },
            { text: isCartMode ? text.finishSale : text.manualSale, onPress: () => { isCartMode ? finishCartScanning() : returnToVentes(); } },
            { text: isCartMode ? text.continueScan : text.retry, onPress: resetScan },
            { text: isCartMode ? text.saleBack : text.back, onPress: () => { isCartMode ? finishCartScanning() : navigation.goBack(); } },
          ]);
        } else {
          Alert.alert(text.productNotFound, text.adminOnlyCreate(data), [
            { text: isCartMode ? text.finishSale : text.manualSale, onPress: () => { isCartMode ? finishCartScanning() : returnToVentes(); } },
            { text: isCartMode ? text.continueScan : text.retry, onPress: resetScan },
          ]);
        }
      } else {
        Alert.alert(text.errorTitle, err.response?.data?.message || text.productFetchError, [
          { text: isCartMode ? text.finishSale : text.manualSale, onPress: () => { isCartMode ? finishCartScanning() : returnToVentes(); } },
          { text: isCartMode ? text.continueScan : text.retry, onPress: resetScan },
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Permission loading ──
  if (hasPermission === null) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TP.green} />
        <Text style={styles.infoText}>{text.cameraRequest}</Text>
      </View>
    );
  }

  // ── Permission denied ──
  if (hasPermission === false) {
    return (
      <View style={styles.centered}>
        <View style={styles.permIconWrap}>
          <Feather name="camera-off" size={24} color="#ef4444" />
        </View>
        <Text style={styles.errorText}>{text.cameraDenied}</Text>
        <Text style={styles.infoText}>{text.cameraDeniedHelp}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: D.bg }]} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: D.text }]}>{text.title}</Text>
        <TouchableOpacity
          style={[styles.flashBtn, { backgroundColor: isDark ? '#1E293B' : TP.greenLight }, torchEnabled && styles.flashBtnActive]}
          onPress={() => setTorchEnabled((v) => !v)}
        >
          <Feather name={torchEnabled ? 'zap' : 'zap-off'} size={16} color={torchEnabled ? '#fff' : D.muted} />
        </TouchableOpacity>
      </View>

      {/* ── Camera card ── */}
      <View style={styles.cameraCard}>
        <CameraView
          style={styles.camera}
          facing="back"
          enableTorch={torchEnabled}
          onBarcodeScanned={scanned ? undefined : handleBarcodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr', 'ean13', 'ean8', 'code128', 'code39', 'upc_a', 'upc_e'] }}
        />

        {/* Corner brackets */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <View style={styles.cornersWrap}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            <ScanLine />
          </View>
        </View>

        {/* Loading indicator */}
        {loading && (
          <View style={styles.loadingOverlay} pointerEvents="none">
            <ActivityIndicator color={TP.green} size="large" />
          </View>
        )}

        {/* Cart badge */}
        {isCartMode && pendingLookups.length > 0 && (
          <View style={styles.cartBadge}>
            <Feather name="shopping-cart" size={12} color="#fff" />
            <Text style={styles.cartBadgeText}>{text.scansCount(pendingLookups.length)}</Text>
          </View>
        )}
      </View>

      {/* ── Hint text ── */}
      <Text style={[styles.hintText, { color: D.muted }]}>{text.hint}</Text>

      {/* ── Scan button ── */}
      {!isCartMode ? (
        <TouchableOpacity style={styles.scanBtn} onPress={resetScan} activeOpacity={0.85}>
          <Feather name="maximize" size={20} color="#fff" />
          <Text style={styles.scanBtnText}>{scanned ? text.scanAgain : text.scanBtn}</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.scanBtn} onPress={finishCartScanning} activeOpacity={0.85}>
          <Feather name="check-circle" size={20} color="#fff" />
          <Text style={styles.scanBtnText}>
            {pendingLookups.length > 0 ? text.doneWithCount(pendingLookups.length) : text.returnToSale}
          </Text>
        </TouchableOpacity>
      )}

      {/* ── Recently scanned ── */}
      <Text style={[styles.recentTitle, { color: D.text }]}>{text.recentTitle}</Text>

      {recentScans.length === 0 ? (
        <View style={[styles.emptyRecent, { backgroundColor: D.emptyBg, borderColor: D.border }]}>
          <Feather name="bar-chart-2" size={20} color={D.muted} style={{ marginBottom: 6 }} />
          <Text style={[styles.emptyRecentText, { color: D.muted }]}>{text.noRecent}</Text>
        </View>
      ) : (
        <View style={[styles.recentList, { backgroundColor: D.recentBg, borderColor: D.border }]}>
          {recentScans.map((item, index) => (
            <View key={item.code + index} style={[styles.recentItem, { borderBottomColor: D.border }]}>
              <View style={[styles.recentIconWrap, { backgroundColor: ICON_ACCENT[index % 3] + '18' }]}>
                <Feather name="bar-chart-2" size={18} color={ICON_ACCENT[index % 3]} />
              </View>
              <View style={styles.recentInfo}>
                <Text style={[styles.recentName, { color: D.text }]} numberOfLines={1}>{item.nom}</Text>
                <Text style={[styles.recentCode, { color: D.muted }]}>{item.code}</Text>
              </View>
              <Text style={styles.recentPrice}>{formatCFA(item.price)}</Text>
            </View>
          ))}
        </View>
      )}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TP.screenBg },
  content: { paddingBottom: 32 },

  // Permission screens
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TP.screenBg, padding: 24 },
  permIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fee2e2', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  errorText: { fontSize: 18, fontWeight: '700', color: '#ef4444', marginBottom: 8 },
  infoText: { fontSize: 14, color: TP.muted, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800', color: TP.text },
  flashBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: TP.greenLight,
    alignItems: 'center', justifyContent: 'center',
  },
  flashBtnActive: { backgroundColor: TP.gold },

  // Camera
  cameraCard: {
    marginHorizontal: 20,
    height: 260,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: TP.headerBg,
  },
  camera: { flex: 1 },
  cornersWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  corner: {
    position: 'absolute',
    width: 28, height: 28,
    borderColor: TP.green,
    borderWidth: 3,
  },
  cornerTL: { top: '25%', left: '15%', borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
  cornerTR: { top: '25%', right: '15%', borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
  cornerBL: { bottom: '25%', left: '15%', borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
  cornerBR: { bottom: '25%', right: '15%', borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },
  scanLine: {
    position: 'absolute',
    width: '70%',
    height: 2,
    backgroundColor: TP.green,
    opacity: 0.8,
    borderRadius: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: TP.overlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 12, right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: TP.green,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  cartBadgeText: { color: '#fff', fontWeight: '800', fontSize: 12 },

  // Hint
  hintText: {
    textAlign: 'center',
    color: TP.muted,
    fontSize: 14,
    marginTop: 14,
    marginBottom: 18,
  },

  // Scan button
  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: TP.green,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginHorizontal: 60,
    shadowColor: TP.green,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 28,
  },
  scanBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  // Recently scanned
  recentTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: TP.text,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  recentList: {
    marginHorizontal: 16,
    backgroundColor: TP.cardBg,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: TP.greenBorder,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: TP.greenBorder,
  },
  recentIconWrap: {
    width: 40, height: 40,
    borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  recentInfo: { flex: 1 },
  recentName: { fontSize: 15, fontWeight: '700', color: TP.text, marginBottom: 2 },
  recentCode: { fontSize: 12, color: TP.muted },
  recentPrice: { fontSize: 15, fontWeight: '700', color: TP.green },
  emptyRecent: {
    marginHorizontal: 16,
    backgroundColor: TP.cardBg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: TP.greenBorder,
  },
  emptyRecentText: { fontSize: 14, color: TP.muted },
});
