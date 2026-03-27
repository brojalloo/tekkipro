import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Platform, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { getFacturePdfUrl, getVenteById } from '../lib/api';
import {
  THERMAL_PRINTER_SUPPORT_MESSAGE,
  getSavedPrinter,
  printSaleReceipt,
  saveSelectedPrinter,
  scanBluetoothPrinters,
  testPrinterConnection,
} from '../lib/thermalPrinter';

// ─── TekkiPro Brand Palette ───────────────────────────────────────────────────
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

const safeNumber = (value) => {
  const parsedValue = Number(value ?? 0);
  return Number.isFinite(parsedValue) ? parsedValue : 0;
};
const formatCFA = (value, locale) => `${safeNumber(value).toLocaleString(locale)} FCFA`;
const formatDate = (value, locale) => {
  if (!value) return '—';
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return '—';
  return parsedDate.toLocaleString(locale, { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};
const detailQuantity = (detail) => safeNumber(detail?.quantite);
const detailUnitLabel = (detail) => detail?.uniteNom || detail?.produit?.uniteBase || 'u';
const detailKey = (detail, index) => detail?.id || `${detail?.produitId || 'detail'}-${detail?.uniteNom || index}`;
const printerTypeLabel = (value) => ({ bt: 'Bluetooth', ble: 'BLE', dual: 'Bluetooth/BLE' }[value] || 'Bluetooth');
const printErrorMessage = (result, fallbackMessage) => {
  if (!result || result.success) return null;
  if (result.results instanceof Map) {
    for (const item of result.results.values()) {
      if (!item?.success) return item?.error?.message || fallbackMessage;
    }
  }
  return fallbackMessage;
};

const TICKET_TEXT = {
  fr: {
    error: 'Erreur', paymentLabel: (value) => ({ CASH: 'Espèces', MOBILE_MONEY: 'Mobile Money', CREDIT: 'Crédit' }[value] || value || '—'),
    walkInClient: 'Client de passage', productFallback: 'Produit', storeFallback: 'Ma boutique', appFallback: 'TekkiPro',
    loadError: 'Impossible de charger ce ticket.', shareError: 'Impossible de partager ce ticket pour le moment.',
    planRequired: 'Plan requis', pdfPlanRequired: 'La facture PDF est disponible avec le plan Pro ou Business.',
    sessionExpired: 'Session expirée', reconnectForPdf: 'Reconnectez-vous pour ouvrir la facture PDF.', pdfOpenError: "Impossible d'ouvrir la facture PDF.",
    bluetoothTitle: 'Bluetooth', noPrinterFound: "Aucune imprimante trouvée. Vérifie qu'elle est allumée et déjà appairée si nécessaire.",
    printerSelected: 'Imprimante sélectionnée', printerSelectedMessage: (name) => `${name} sera utilisée pour les prochains tickets.`,
    printerRequired: 'Imprimante requise', printerRequiredTest: 'Sélectionne une imprimante thermique avant de tester la connexion.', printerRequiredPrint: "Sélectionne une imprimante thermique avant d'imprimer.",
    connectionOk: 'Connexion OK', connectionOkMessage: (name) => `${name} répond correctement.`, connectionFailed: 'Connexion impossible', connectionFailedMessage: 'Impossible de joindre cette imprimante.',
    androidRequired: 'Android requis', androidRequiredMessage: "L'impression thermique Bluetooth est actuellement configurée pour Android.",
    printFailed: 'Impression échouée', printFailedFallback: "Le ticket n'a pas pu être imprimé.", printSent: 'Impression envoyée', printSentMessage: (name) => `Le ticket a été envoyé vers ${name}.`,
    ticketMissing: 'Ticket introuvable', back: 'Retour', heroBadge: 'Ticket de Vente', summary: 'Résumé', store: 'Boutique', client: 'Client', payment: 'Paiement', seller: 'Vendeur',
    items: 'Articles', totals: 'Totaux', totalAmount: 'Montant total', paidAmount: 'Montant payé', remainingAmount: 'Reste à payer',
    thermalPrinter: 'Imprimante thermique', printerReady: 'Prête', printerSetup: 'À configurer',
    printerHintAndroid: 'Recherche une imprimante Bluetooth, sélectionne-la une fois, puis imprime les prochains tickets en un clic.', printerHintIos: "Le flux d'impression thermique est préparé pour le build Android TekkiPro.",
    remove: 'Retirer', noPrinterSelected: 'Aucune imprimante sélectionnée pour le moment.', searching: 'Recherche...', search: 'Rechercher', testing: 'Test...', test: 'Tester', printing: 'Impression...', printTicket: 'Imprimer ticket',
    detectedPrinters: 'Imprimantes détectées', shareTicket: 'Partager le ticket', openPdf: 'Ouvrir PDF',
    thankYou: 'Merci de votre visite !',
    shareLine: (detail, locale) => `- ${detail.produit?.nom || 'Produit'}: ${detailQuantity(detail)} ${detailUnitLabel(detail)} x ${formatCFA(detail?.prixUnitaire, locale)} = ${formatCFA(detail?.sousTotal, locale)}`,
    shareHeader: (store, number) => `${store} - Ticket ${number}`,
    shareDate: (date) => `Date: ${date}`,
    shareClient: (client) => `Client: ${client}`,
    sharePayment: (payment) => `Paiement: ${payment}`,
    shareTotal: (value) => `Total: ${value}`,
    sharePaid: (value) => `Payé: ${value}`,
    shareRemaining: (value) => `Reste: ${value}`,
  },
  en: {
    error: 'Error', paymentLabel: (value) => ({ CASH: 'Cash', MOBILE_MONEY: 'Mobile Money', CREDIT: 'Credit' }[value] || value || '—'),
    walkInClient: 'Walk-in client', productFallback: 'Product', storeFallback: 'My store', appFallback: 'TekkiPro',
    loadError: 'Unable to load this ticket.', shareError: 'Unable to share this ticket right now.',
    planRequired: 'Plan required', pdfPlanRequired: 'PDF invoice is available with the Pro or Business plan.',
    sessionExpired: 'Session expired', reconnectForPdf: 'Please sign in again to open the PDF invoice.', pdfOpenError: 'Unable to open the PDF invoice.',
    bluetoothTitle: 'Bluetooth', noPrinterFound: 'No printer found. Make sure it is powered on and already paired if needed.',
    printerSelected: 'Printer selected', printerSelectedMessage: (name) => `${name} will be used for future receipts.`,
    printerRequired: 'Printer required', printerRequiredTest: 'Select a thermal printer before testing the connection.', printerRequiredPrint: 'Select a thermal printer before printing.',
    connectionOk: 'Connection OK', connectionOkMessage: (name) => `${name} is responding correctly.`, connectionFailed: 'Connection failed', connectionFailedMessage: 'Unable to reach this printer.',
    androidRequired: 'Android required', androidRequiredMessage: 'Bluetooth thermal printing is currently configured for Android.',
    printFailed: 'Printing failed', printFailedFallback: 'The receipt could not be printed.', printSent: 'Print sent', printSentMessage: (name) => `The receipt was sent to ${name}.`,
    ticketMissing: 'Ticket not found', back: 'Back', heroBadge: 'Sale Receipt', summary: 'Summary', store: 'Store', client: 'Client', payment: 'Payment', seller: 'Seller',
    items: 'Items', totals: 'Totals', totalAmount: 'Total amount', paidAmount: 'Amount paid', remainingAmount: 'Remaining amount',
    thermalPrinter: 'Thermal printer', printerReady: 'Ready', printerSetup: 'To set up',
    printerHintAndroid: 'Search for a Bluetooth printer, select it once, then print future receipts in one tap.', printerHintIos: 'Thermal printing flow is prepared for the TekkiPro Android build.',
    remove: 'Remove', noPrinterSelected: 'No printer selected yet.', searching: 'Searching...', search: 'Search', testing: 'Testing...', test: 'Test', printing: 'Printing...', printTicket: 'Print receipt',
    detectedPrinters: 'Detected printers', shareTicket: 'Share receipt', openPdf: 'Open PDF',
    thankYou: 'Thank you for your visit!',
    shareLine: (detail, locale) => `- ${detail.produit?.nom || 'Product'}: ${detailQuantity(detail)} ${detailUnitLabel(detail)} x ${formatCFA(detail?.prixUnitaire, locale)} = ${formatCFA(detail?.sousTotal, locale)}`,
    shareHeader: (store, number) => `${store} - Receipt ${number}`,
    shareDate: (date) => `Date: ${date}`,
    shareClient: (client) => `Client: ${client}`,
    sharePayment: (payment) => `Payment: ${payment}`,
    shareTotal: (value) => `Total: ${value}`,
    sharePaid: (value) => `Paid: ${value}`,
    shareRemaining: (value) => `Remaining: ${value}`,
  },
};

export default function VenteTicketScreen({ navigation, route }) {
  const { boutique, plan } = useAuth();
  const { language, locale } = useI18n();
  const venteId = route?.params?.venteId;
  const [vente, setVente] = useState(route?.params?.vente || null);
  const [loading, setLoading] = useState(!route?.params?.vente);
  const [selectedPrinter, setSelectedPrinter] = useState(null);
  const [printerResults, setPrinterResults] = useState([]);
  const [scanningPrinters, setScanningPrinters] = useState(false);
  const [testingPrinter, setTestingPrinter] = useState(false);
  const [printingTicket, setPrintingTicket] = useState(false);
  const text = TICKET_TEXT[language] || TICKET_TEXT.fr;
  const clientName = useCallback((client) => [client?.prenom, client?.nom].filter(Boolean).join(' ').trim() || client?.nom || client?.telephone || client?.email || text.walkInClient, [text]);
  const sellerName = useCallback((user) => [user?.prenom, user?.nom].filter(Boolean).join(' ').trim() || user?.nom || user?.username || user?.email || '—', []);
  const paymentLabel = useCallback((value) => text.paymentLabel(value), [text]);
  const storeName = useMemo(() => boutique?.nom || vente?.boutique?.nom || text.storeFallback, [boutique?.nom, text.storeFallback, vente?.boutique?.nom]);
  const shareStoreName = useMemo(() => boutique?.nom || vente?.boutique?.nom || text.appFallback, [boutique?.nom, text.appFallback, vente?.boutique?.nom]);
  const printerActionBusy = scanningPrinters || testingPrinter || printingTicket;

  const loadVente = useCallback(async () => {
    if (!venteId) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await getVenteById(venteId);
      if (data.success) {
        setVente(data.data);
      } else {
        Alert.alert(text.error, data?.message || text.loadError);
      }
    } catch (error) {
      Alert.alert(text.error, error.response?.data?.message || text.loadError);
    } finally {
      setLoading(false);
    }
  }, [text.error, text.loadError, venteId]);

  useEffect(() => { loadVente(); }, [loadVente]);

  useEffect(() => {
    let mounted = true;
    getSavedPrinter()
      .then((printer) => { if (mounted) setSelectedPrinter(printer); })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const reste = useMemo(() => {
    if (!vente) return 0;
    const detteRestante = Number(vente?.dette?.montantRestant || 0);
    if (detteRestante > 0) return detteRestante;
    return Math.max(0, Number(vente.montantTotal || 0) - Number(vente.montantPaye || 0));
  }, [vente]);
  const ticketDetails = useMemo(() => (Array.isArray(vente?.details) ? vente.details.filter(Boolean) : []), [vente]);

  const shareMessage = useMemo(() => {
    if (!vente) return '';
    const lines = ticketDetails.map((detail) => text.shareLine(detail, locale));
    return [
      text.shareHeader(shareStoreName, vente.numero || '—'),
      text.shareDate(formatDate(vente.createdAt, locale)),
      text.shareClient(clientName(vente.client)),
      text.sharePayment(paymentLabel(vente.modePaiement)),
      '',
      ...lines,
      '',
      text.shareTotal(formatCFA(vente.montantTotal, locale)),
      text.sharePaid(formatCFA(vente.montantPaye, locale)),
      text.shareRemaining(formatCFA(reste, locale)),
    ].join('\n');
  }, [clientName, locale, paymentLabel, reste, shareStoreName, text, ticketDetails, vente]);

  const handleShare = useCallback(async () => {
    if (!shareMessage) return;
    try {
      await Share.share({ message: shareMessage });
    } catch {
      Alert.alert(text.error, text.shareError);
    }
  }, [shareMessage, text.shareError]);

  const handleOpenPdf = useCallback(async () => {
    if (!vente?.id) {
      Alert.alert(text.error, text.pdfOpenError);
      return;
    }
    if (!['PRO', 'BUSINESS'].includes(plan)) {
      Alert.alert(text.planRequired, text.pdfPlanRequired);
      return;
    }
    const token = await AsyncStorage.getItem('token');
    if (!token) {
      Alert.alert(text.sessionExpired, text.reconnectForPdf);
      return;
    }
    try {
      await Linking.openURL(getFacturePdfUrl(vente.id, token));
    } catch {
      Alert.alert(text.error, text.pdfOpenError);
    }
  }, [plan, text, vente?.id]);

  const handleScanPrinters = useCallback(async () => {
    setScanningPrinters(true);
    try {
      const result = await scanBluetoothPrinters();
      setPrinterResults(result.printers || []);
      if (!(result.printers || []).length) {
        Alert.alert(text.bluetoothTitle, text.noPrinterFound);
      }
    } catch (error) {
      Alert.alert(text.bluetoothTitle, error.message || THERMAL_PRINTER_SUPPORT_MESSAGE);
    } finally {
      setScanningPrinters(false);
    }
  }, [text.bluetoothTitle, text.noPrinterFound]);

  const handleSelectPrinter = useCallback(async (printer) => {
    try {
      const saved = await saveSelectedPrinter(printer);
      setSelectedPrinter(saved);
      Alert.alert(text.printerSelected, text.printerSelectedMessage(saved.name));
    } catch (error) {
      Alert.alert(text.error, error.message || THERMAL_PRINTER_SUPPORT_MESSAGE);
    }
  }, [text]);

  const handleForgetPrinter = useCallback(async () => {
    try {
      await saveSelectedPrinter(null);
      setSelectedPrinter(null);
    } catch (error) {
      Alert.alert(text.error, error.message || THERMAL_PRINTER_SUPPORT_MESSAGE);
    }
  }, []);

  const handleTestPrinter = useCallback(async () => {
    if (!selectedPrinter) {
      Alert.alert(text.printerRequired, text.printerRequiredTest);
      return;
    }
    setTestingPrinter(true);
    try {
      const result = await testPrinterConnection(selectedPrinter);
      if (result?.success) {
        Alert.alert(text.connectionOk, text.connectionOkMessage(selectedPrinter.name));
      } else {
        Alert.alert(text.connectionFailed, result?.error?.message || text.connectionFailedMessage);
      }
    } catch (error) {
      Alert.alert(text.connectionFailed, error.message || THERMAL_PRINTER_SUPPORT_MESSAGE);
    } finally {
      setTestingPrinter(false);
    }
  }, [selectedPrinter, text]);

  const handlePrintTicket = useCallback(async () => {
    if (!vente) return;
    if (Platform.OS !== 'android') {
      Alert.alert(text.androidRequired, text.androidRequiredMessage);
      return;
    }
    if (!selectedPrinter) {
      Alert.alert(text.printerRequired, text.printerRequiredPrint);
      return;
    }
    setPrintingTicket(true);
    try {
      const result = await printSaleReceipt({ printer: selectedPrinter, boutique, vente });
      const errorMessage = printErrorMessage(result, text.printFailedFallback);
      if (errorMessage) {
        Alert.alert(text.printFailed, errorMessage);
      } else {
        Alert.alert(text.printSent, text.printSentMessage(selectedPrinter.name));
      }
    } catch (error) {
      Alert.alert(text.printFailed, error.message || THERMAL_PRINTER_SUPPORT_MESSAGE);
    } finally {
      setPrintingTicket(false);
    }
  }, [selectedPrinter, text, vente]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={TP.green} />
      </View>
    );
  }

  if (!vente) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>{text.ticketMissing}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryBtnText}>{text.back}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ── Dark Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={styles.heroBadgeWrap}>
          <Text style={styles.heroBadge}>{text.heroBadge}</Text>
        </View>
        <Text style={styles.heroTitle}>{vente.numero || '—'}</Text>
        <Text style={styles.heroSubtitle}>{formatDate(vente.createdAt, locale)}</Text>
      </View>

      {/* ── Receipt Card ─────────────────────────────────────────────── */}
      <View style={styles.receiptCard}>
        {/* Shop header */}
        <View style={styles.receiptShopHeader}>
          <View style={styles.receiptLogo}>
            <Feather name="shopping-bag" size={20} color={TP.green} />
          </View>
          <Text style={styles.receiptShopName}>{storeName}</Text>
          <Text style={styles.receiptShopTag}>TekkiPro</Text>
        </View>

        {/* Date & ID row */}
        <View style={styles.receiptMetaRow}>
          <Text style={styles.receiptMetaLabel}>{text.store}</Text>
          <Text style={styles.receiptMetaValue}>{storeName}</Text>
        </View>
        <View style={styles.receiptMetaRow}>
          <Text style={styles.receiptMetaLabel}>{text.client}</Text>
          <Text style={styles.receiptMetaValue}>{clientName(vente.client)}</Text>
        </View>
        <View style={styles.receiptMetaRow}>
          <Text style={styles.receiptMetaLabel}>{text.seller}</Text>
          <Text style={styles.receiptMetaValue}>{sellerName(vente.user)}</Text>
        </View>

        {/* Dashed divider */}
        <View style={styles.dashedDivider}>
          {Array.from({ length: 28 }).map((_, i) => (
            <View key={i} style={styles.dashedSegment} />
          ))}
        </View>

        {/* Line items */}
        <Text style={styles.receiptSectionLabel}>{text.items}</Text>
        {ticketDetails.map((detail, index) => (
          <View key={detailKey(detail, index)} style={styles.receiptItemRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.receiptItemName}>{detail.produit?.nom || text.productFallback}</Text>
              <Text style={styles.receiptItemMeta}>
                {detailQuantity(detail)} {detailUnitLabel(detail)} × {formatCFA(detail?.prixUnitaire, locale)}
              </Text>
            </View>
            <Text style={styles.receiptItemTotal}>{formatCFA(detail?.sousTotal, locale)}</Text>
          </View>
        ))}

        {/* Dashed divider */}
        <View style={styles.dashedDivider}>
          {Array.from({ length: 28 }).map((_, i) => (
            <View key={i} style={styles.dashedSegment} />
          ))}
        </View>

        {/* Totals */}
        <View style={styles.receiptTotalRow}>
          <Text style={styles.receiptTotalLabel}>{text.totalAmount}</Text>
          <Text style={styles.receiptTotalValue}>{formatCFA(vente.montantTotal, locale)}</Text>
        </View>
        <View style={styles.receiptMetaRow}>
          <Text style={styles.receiptMetaLabel}>{text.paidAmount}</Text>
          <Text style={styles.receiptMetaValue}>{formatCFA(vente.montantPaye, locale)}</Text>
        </View>
        {reste > 0 ? (
          <View style={styles.receiptMetaRow}>
            <Text style={styles.receiptMetaLabel}>{text.remainingAmount}</Text>
            <Text style={[styles.receiptMetaValue, styles.warningValue]}>{formatCFA(reste, locale)}</Text>
          </View>
        ) : null}

        {/* Payment mode badge */}
        <View style={styles.paymentBadgeRow}>
          <View style={styles.paymentBadge}>
            <Feather name="credit-card" size={13} color={TP.green} />
            <Text style={styles.paymentBadgeText}>{paymentLabel(vente.modePaiement)}</Text>
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.receiptFooter}>{text.thankYou}</Text>
      </View>

      {/* ── Thermal Printer Card ──────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{text.thermalPrinter}</Text>
          <View style={[styles.statusBadge, selectedPrinter ? styles.statusBadgeReady : styles.statusBadgeMuted]}>
            <Text style={[styles.statusBadgeText, selectedPrinter ? styles.statusBadgeTextReady : styles.statusBadgeTextMuted]}>
              {selectedPrinter ? text.printerReady : text.printerSetup}
            </Text>
          </View>
        </View>
        <Text style={styles.printerHint}>
          {Platform.OS === 'android' ? text.printerHintAndroid : text.printerHintIos}
        </Text>

        {selectedPrinter ? (
          <View style={styles.selectedPrinterBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.selectedPrinterName}>{selectedPrinter.name}</Text>
              <Text style={styles.selectedPrinterMeta}>{printerTypeLabel(selectedPrinter.deviceType)} • {selectedPrinter.address}</Text>
            </View>
            <TouchableOpacity style={styles.forgetBtn} onPress={handleForgetPrinter} disabled={printerActionBusy}>
              <Feather name="trash-2" size={14} color="#dc2626" />
              <Text style={styles.forgetBtnText}>{text.remove}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.printerEmpty}>{text.noPrinterSelected}</Text>
        )}

        <View style={styles.printerButtonsWrap}>
          <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleScanPrinters} disabled={printerActionBusy}>
            <Feather name="search" size={16} color={TP.green} />
            <Text style={styles.secondaryActionText}>{scanningPrinters ? text.searching : text.search}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryActionBtn} onPress={handleTestPrinter} disabled={!selectedPrinter || printerActionBusy}>
            <Feather name="wifi" size={16} color={TP.green} />
            <Text style={styles.secondaryActionText}>{testingPrinter ? text.testing : text.test}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handlePrintTicket} disabled={!selectedPrinter || printerActionBusy}>
            <Feather name="printer" size={16} color="#fff" />
            <Text style={styles.primaryActionText}>{printingTicket ? text.printing : text.printTicket}</Text>
          </TouchableOpacity>
        </View>

        {printerResults.length > 0 ? (
          <View style={styles.printerList}>
            <Text style={styles.printerListTitle}>{text.detectedPrinters}</Text>
            {printerResults.map((printer) => {
              const isActive = selectedPrinter?.address === printer.address;
              return (
                <TouchableOpacity
                  key={printer.address}
                  style={[styles.printerRow, isActive && styles.printerRowActive]}
                  onPress={() => handleSelectPrinter(printer)}
                >
                  <View style={styles.printerIconWrap}>
                    <Feather name="printer" size={16} color={TP.green} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.printerRowTitle, isActive && styles.printerRowTitleActive]}>{printer.name}</Text>
                    <Text style={[styles.printerRowMeta, isActive && styles.printerRowMetaActive]}>{printerTypeLabel(printer.deviceType)} • {printer.address}</Text>
                  </View>
                  {isActive
                    ? <Feather name="check-circle" size={18} color={TP.green} />
                    : <Feather name="chevron-right" size={18} color={TP.muted} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}
      </View>

      {/* ── Share / PDF Actions ───────────────────────────────────────── */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.secondaryBtn} onPress={handleShare}>
          <Feather name="share-2" size={16} color={TP.green} />
          <Text style={styles.secondaryBtnText}>{text.shareTicket}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryBtn} onPress={handleOpenPdf}>
          <Feather name="file-text" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>{text.openPdf}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TP.screenBg },
  content: { paddingBottom: 28 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: TP.screenBg },

  // ── Dark Header ────────────────────────────────────────────────────────
  header: { backgroundColor: TP.headerBg, padding: 20, paddingTop: 52, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  backBtn: { marginBottom: 12, alignSelf: 'flex-start', width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  heroBadgeWrap: { alignSelf: 'flex-start', backgroundColor: TP.goldLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, marginBottom: 8 },
  heroBadge: { color: TP.gold, fontWeight: '800', fontSize: 12 },
  heroTitle: { color: '#fff', fontSize: 24, fontWeight: '900', marginTop: 4 },
  heroSubtitle: { color: 'rgba(255,255,255,0.60)', marginTop: 4, fontSize: 13 },

  // ── Receipt Card ───────────────────────────────────────────────────────
  receiptCard: { marginHorizontal: 14, marginTop: -14, backgroundColor: TP.cardBg, borderRadius: 20, padding: 20, shadowColor: TP.headerBg, shadowOpacity: 0.10, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#EDE8E3' },
  receiptShopHeader: { alignItems: 'center', marginBottom: 16 },
  receiptLogo: { width: 48, height: 48, borderRadius: 14, backgroundColor: TP.greenLight, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  receiptShopName: { fontSize: 18, fontWeight: '900', color: TP.text },
  receiptShopTag: { fontSize: 12, color: TP.muted, marginTop: 2 },
  receiptMetaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 5 },
  receiptMetaLabel: { color: TP.muted, fontSize: 13 },
  receiptMetaValue: { color: TP.text, fontSize: 13, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  dashedDivider: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: 14, overflow: 'hidden' },
  dashedSegment: { width: 8, height: 2, backgroundColor: '#D1C8BF', marginRight: 4, borderRadius: 1 },
  receiptSectionLabel: { fontSize: 12, fontWeight: '800', color: TP.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  receiptItemRow: { flexDirection: 'row', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: '#EDE8E3' },
  receiptItemName: { fontSize: 14, fontWeight: '800', color: TP.text },
  receiptItemMeta: { marginTop: 3, fontSize: 12, color: TP.muted },
  receiptItemTotal: { fontSize: 13, fontWeight: '800', color: TP.text },
  receiptTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  receiptTotalLabel: { fontSize: 16, fontWeight: '800', color: TP.text },
  receiptTotalValue: { fontSize: 18, fontWeight: '900', color: TP.green },
  warningValue: { color: TP.gold },
  paymentBadgeRow: { marginTop: 14, alignItems: 'center' },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: TP.greenLight, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: TP.greenBorder },
  paymentBadgeText: { color: TP.green, fontWeight: '800', fontSize: 13 },
  receiptFooter: { textAlign: 'center', marginTop: 18, color: TP.muted, fontSize: 13, fontStyle: 'italic' },

  // ── Generic Cards ──────────────────────────────────────────────────────
  card: { marginHorizontal: 14, marginTop: 14, backgroundColor: TP.cardBg, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: '#EDE8E3', shadowColor: TP.headerBg, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TP.text },

  // ── Status Badge ───────────────────────────────────────────────────────
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  statusBadgeReady: { backgroundColor: TP.greenLight },
  statusBadgeMuted: { backgroundColor: '#F3F4F6' },
  statusBadgeText: { fontSize: 11, fontWeight: '800' },
  statusBadgeTextReady: { color: TP.green },
  statusBadgeTextMuted: { color: TP.muted },

  // ── Printer ────────────────────────────────────────────────────────────
  printerHint: { color: TP.muted, fontSize: 12, lineHeight: 18 },
  selectedPrinterBox: { marginTop: 12, borderRadius: 14, borderWidth: 1, borderColor: TP.greenBorder, backgroundColor: TP.greenLight, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedPrinterName: { color: TP.green, fontWeight: '800', fontSize: 14 },
  selectedPrinterMeta: { color: TP.green, fontSize: 12, marginTop: 4 },
  forgetBtn: { borderRadius: 10, borderWidth: 1, borderColor: '#fecaca', backgroundColor: '#fff1f2', paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6 },
  forgetBtnText: { color: '#dc2626', fontWeight: '700', fontSize: 12 },
  printerEmpty: { marginTop: 12, color: TP.muted, fontSize: 13 },
  printerButtonsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  secondaryActionBtn: { borderRadius: 12, borderWidth: 1, borderColor: TP.greenBorder, backgroundColor: TP.greenLight, paddingHorizontal: 12, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  secondaryActionText: { color: TP.green, fontWeight: '800', fontSize: 12 },
  primaryActionBtn: { borderRadius: 12, backgroundColor: TP.green, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: TP.green, shadowOpacity: 0.20, shadowRadius: 8, elevation: 3 },
  primaryActionText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  printerList: { marginTop: 16, gap: 10 },
  printerListTitle: { fontSize: 13, fontWeight: '800', color: TP.text },
  printerRow: { borderRadius: 14, borderWidth: 1, borderColor: '#EDE8E3', backgroundColor: TP.screenBg, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  printerRowActive: { borderColor: TP.greenBorder, backgroundColor: TP.greenLight },
  printerIconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: TP.greenLight, alignItems: 'center', justifyContent: 'center' },
  printerRowTitle: { fontSize: 13, fontWeight: '800', color: TP.text },
  printerRowTitleActive: { color: TP.green },
  printerRowMeta: { marginTop: 4, fontSize: 12, color: TP.muted },
  printerRowMetaActive: { color: TP.green },

  // ── Bottom Action Row ──────────────────────────────────────────────────
  actionsRow: { flexDirection: 'row', gap: 10, marginHorizontal: 14, marginTop: 16 },
  primaryBtn: { flex: 1, backgroundColor: TP.green, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, shadowColor: TP.green, shadowOpacity: 0.20, shadowRadius: 8, elevation: 3 },
  primaryBtnText: { color: '#fff', fontWeight: '800' },
  secondaryBtn: { flex: 1, backgroundColor: TP.greenLight, borderRadius: 14, paddingVertical: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, borderWidth: 1, borderColor: TP.greenBorder },
  secondaryBtnText: { color: TP.green, fontWeight: '800' },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: TP.text, marginBottom: 14 },
});
