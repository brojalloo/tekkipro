import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput, Modal, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { createClient, createVente, getClients, getProduits, getVentes, getVentesParJour } from '../lib/api';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getApiErrorMessage, isUpgradeRequiredError } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';

import { TP, DARK_THEME, STATUT_COLORS, ICON_COLORS, SALES_TEXT, MAX_VISIBLE_PRODUCTS, MAX_VISIBLE_CLIENTS, EMPTY_CLIENT_FORM, DAY_IN_MS } from './ventes/constants';
import { formatCFA, formatClientName, formatStockHuman, parseDateOnly, formatDateLabel, getExpirationInfo, getExpirationBadge, getExpirationAlert, buildCartKey, getPreferredUnit, getCartItemMaxQty, filterVentesByPeriod } from './ventes/utils';
import HistoryTransactionItem from './ventes/HistoryTransactionItem';
import KenteBar from '../components/KenteBar';

export default function VentesScreen({ navigation, route }) {
  const { language, locale } = useI18n();
  const { isDark } = useTheme();
  const themeColors = isDark ? DARK_THEME : null;
  const listRef = useRef(null);
  const cartSectionYRef = useRef(0);
  const pendingCartScrollRef = useRef(false);
  const scrollTimerRef = useRef(null);

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('HISTORY'); // 'HISTORY' | 'NEW_SALE'
  const [period, setPeriod] = useState('TODAY'); // 'TODAY' | 'WEEK' | 'MONTH'
  const [ventesTrend, setVentesTrend] = useState([]);

  // ── Data state ─────────────────────────────────────────────────────────────
  const [ventes, setVentes] = useState([]);
  const [produits, setProduits] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // ── Search / filter state ──────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [produitSearch, setProduitSearch] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('TOUTES');

  // ── Cart / sale state ──────────────────────────────────────────────────────
  const [cart, setCart] = useState([]);
  const [clientId, setClientId] = useState('');
  const [modePaiement, setModePaiement] = useState('CASH');
  const [montantPaye, setMontantPaye] = useState('');
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientForm, setClientForm] = useState(EMPTY_CLIENT_FORM);
  const [creatingClient, setCreatingClient] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const text = SALES_TEXT[language] || SALES_TEXT.fr;
  const paymentOptions = useMemo(() => ([
    { key: 'CASH', label: text.paymentLabels.CASH, icon: 'dollar-sign' },
    { key: 'MOBILE_MONEY', label: text.paymentLabels.MOBILE_MONEY, icon: 'smartphone' },
    { key: 'CREDIT', label: text.paymentLabels.CREDIT, icon: 'credit-card' },
  ]), [text]);

  const scrollToCartSection = useCallback((animated = true) => {
    const offset = Math.max(cartSectionYRef.current - 12, 0);
    listRef.current?.scrollToOffset?.({ offset, animated });
  }, []);

  // ── API loaders ────────────────────────────────────────────────────────────
  const loadVentes = useCallback(async () => {
    try {
      const { data } = await getVentes();
      if (data.success) setVentes(data.data);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  const loadProduits = useCallback(async () => {
    setCatalogLoading(true);
    try {
      const { data } = await getProduits();
      if (data.success) setProduits(data.data || []);
    } catch (_) {
      setProduits([]);
    }
    setCatalogLoading(false);
  }, []);

  const loadClients = useCallback(async () => {
    setClientsLoading(true);
    try {
      const { data } = await getClients();
      if (data.success) setClients(data.data || []);
    } catch (_) {
      setClients([]);
    }
    setClientsLoading(false);
  }, []);

  const openCreateClientModal = useCallback(() => {
    const searchValue = clientSearch.trim();
    setClientForm({ ...EMPTY_CLIENT_FORM, nom: searchValue });
    setShowClientModal(true);
  }, [clientSearch]);

  const closeCreateClientModal = useCallback(() => {
    if (creatingClient) return;
    setShowClientModal(false);
    setClientForm(EMPTY_CLIENT_FORM);
  }, [creatingClient]);

  const handleCreateClient = useCallback(async () => {
    if (!clientForm.nom.trim()) {
      Alert.alert(text.validation, text.clientNameRequired);
      return;
    }

    setCreatingClient(true);
    try {
      const payload = {
        nom: clientForm.nom.trim(),
        prenom: clientForm.prenom.trim(),
        telephone: clientForm.telephone.trim(),
        adresse: clientForm.adresse.trim(),
      };

      const { data } = await createClient(payload);
      const createdClient = data?.data;

      await loadClients();

      if (createdClient?.id) {
        setClientId(String(createdClient.id));
      }

      setClientSearch('');
      setClientForm(EMPTY_CLIENT_FORM);
      setShowClientModal(false);
      Alert.alert(text.success, getApiSuccessMessage(data, { language, fallback: text.clientCreatedSelected }));
    } catch (error) {
      Alert.alert(text.error, getApiErrorMessage(error, { language, fallback: text.clientCreateError }));
    } finally {
      setCreatingClient(false);
    }
  }, [clientForm, language, loadClients, text]);

  useEffect(() => {
    Promise.all([loadVentes(), loadProduits(), loadClients()]);
    getVentesParJour({ jours: 7 }).then((res) => {
      if (res?.data?.data) setVentesTrend(res.data.data);
    }).catch(() => {});
  }, [loadClients, loadProduits, loadVentes]);

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  // ── Cart logic ─────────────────────────────────────────────────────────────
  const addToCart = useCallback((produit, unite = null) => {
    if (!produit?.id) return;

    let stockAlert = null;
    let expirationAlert = null;
    const expirationInfo = getExpirationInfo(produit, locale);

    setCart((current) => {
      const stockDispo = Number(produit.stock || 0);
      const uniteNom = unite?.nom || produit.uniteBase || 'u';
      const facteurConversion = Number(unite?.facteurConversion || 1);
      const maxQty = facteurConversion > 0 ? Math.floor(stockDispo / facteurConversion) : 0;
      const cartKey = buildCartKey(produit.id, unite?.id || null);

      if (maxQty <= 0) {
        stockAlert = {
          title: text.lowStockTitle,
          message: `${produit.nom} n'est pas disponible en ${uniteNom}.`,
        };
        return current;
      }

      const currentItem = current.find((item) => item.key === cartKey);
      if (currentItem) {
        if (currentItem.quantite >= maxQty) {
          stockAlert = {
            title: text.limitedStockTitle,
            message: `Maximum disponible : ${maxQty} ${uniteNom}.`,
          };
          return current;
        }

        return current.map((item) => (
          item.key === cartKey
            ? { ...item, quantite: item.quantite + 1 }
            : item
        ));
      }

      return [
        ...current,
        {
          key: cartKey,
          produitId: produit.id,
          uniteVenteId: unite?.id || null,
          nom: produit.nom,
          quantite: 1,
          prixUnitaire: Number(unite?.prix ?? produit.prixVente ?? 0),
          uniteBase: produit.uniteBase || 'u',
          uniteNom,
          facteurConversion,
          stockDispo,
          datePeremption: produit.datePeremption || null,
          alertePeremptionJours: produit.alertePeremptionJours ?? null,
          joursAvantPeremption: expirationInfo?.daysRemaining ?? null,
          estExpire: expirationInfo?.isExpired || false,
          enAlertePeremption: expirationInfo?.isSoon || false,
        },
      ];
    });

    expirationAlert = getExpirationAlert(produit, text, locale);

    if (stockAlert) {
      Alert.alert(stockAlert.title, stockAlert.message);
    } else {
      // Produit ajouté avec succès → déclencher le scroll vers le panier
      pendingCartScrollRef.current = true;
      if (expirationAlert) Alert.alert(expirationAlert.title, expirationAlert.message);
    }
  }, [locale, text]);

  useEffect(() => {
    const scannedItems = route?.params?.scannedItems;
    const scannedLookup = route?.params?.scannedLookup;
    const scannedProduit = route?.params?.scannedProduit;
    if (!scannedLookup && !scannedProduit && !(Array.isArray(scannedItems) && scannedItems.length)) return;

    pendingCartScrollRef.current = true;
    setActiveTab('NEW_SALE');

    if (Array.isArray(scannedItems) && scannedItems.length) {
      scannedItems.forEach((item) => {
        const produit = item?.produit || item;
        const unite = getPreferredUnit(produit, item?.uniteId);
        addToCart(produit, unite);
      });
    } else if (scannedLookup) {
      const produit = scannedLookup.produit || scannedLookup;
      const unite = getPreferredUnit(produit, scannedLookup.uniteId);
      addToCart(produit, unite);
    } else {
      const unite = getPreferredUnit(scannedProduit);
      addToCart(scannedProduit, unite);
    }

    navigation.setParams?.({ scannedItems: undefined, scannedLookup: undefined, scannedProduit: undefined });
  }, [addToCart, navigation, route?.params?.scannedItems, route?.params?.scannedLookup, route?.params?.scannedProduit]);

  useEffect(() => {
    if (!cart.length || !pendingCartScrollRef.current) return;

    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    scrollTimerRef.current = setTimeout(() => {
      // Si cartSectionYRef pas encore mesuré (tab vient de s'ouvrir), attendre un peu plus
      if (cartSectionYRef.current === 0) {
        scrollTimerRef.current = setTimeout(() => {
          scrollToCartSection(true);
          pendingCartScrollRef.current = false;
          scrollTimerRef.current = null;
        }, 300);
        return;
      }
      scrollToCartSection(true);
      pendingCartScrollRef.current = false;
      scrollTimerRef.current = null;
    }, 350);
  }, [cart.length, scrollToCartSection]);

  const updateQuantite = (cartKey, delta) => {
    let stockAlert = null;

    setCart((current) => current.flatMap((item) => {
      if (item.key !== cartKey) return [item];

      const nextQty = item.quantite + delta;
      if (nextQty <= 0) return [];

      const maxQty = getCartItemMaxQty(item);
      if (nextQty > maxQty) {
        stockAlert = {
          title: text.limitedStockTitle,
          message: `Maximum disponible : ${maxQty} ${item.uniteNom}.`,
        };
        return [item];
      }

      return [{ ...item, quantite: nextQty }];
    }));

    if (stockAlert) {
      Alert.alert(stockAlert.title, stockAlert.message);
    }
  };

  const removeFromCart = (cartKey) => {
    setCart((current) => current.filter((item) => item.key !== cartKey));
  };

  const handleOpenTicket = useCallback((vente) => {
    if (!vente?.id) return;
    navigation.navigate('VenteTicket', { venteId: vente.id, vente });
  }, [navigation]);

  const handleSubmit = async () => {
    if (cart.length === 0 || submitting) return;

    if (modePaiement === 'CREDIT' && !clientId) {
      Alert.alert(text.clientRequired, text.creditClientRequired);
      return;
    }

    const montantPayeValue = montantPaye === '' ? undefined : Number(String(montantPaye).replace(',', '.'));
    if (montantPayeValue !== undefined && (Number.isNaN(montantPayeValue) || montantPayeValue < 0)) {
      Alert.alert(text.invalidAmountTitle, text.invalidAmountMin);
      return;
    }

    if (montantPayeValue !== undefined && montantPayeValue > totalPanier) {
      Alert.alert(text.invalidAmountTitle, text.invalidAmountMax);
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await createVente({
        details: cart.map((item) => ({
          produitId: item.produitId,
          quantite: item.quantite,
          uniteVenteId: item.uniteVenteId || undefined,
        })),
        clientId: clientId || undefined,
        modePaiement,
        montantPaye: montantPayeValue,
      });

      const createdVente = data.data;

      setCart([]);
      setClientId('');
      setClientSearch('');
      setModePaiement('CASH');
      setMontantPaye('');
      await loadVentes();

      Alert.alert(
        text.saleSavedTitle,
        getApiSuccessMessage(data, { language, fallback: getLocalSuccessMessage({ language, entity: 'vente', action: 'save', params: { numero: data.data?.numero || '' } }) }),
        [
          { text: text.close, style: 'cancel' },
          { text: text.openTicket, onPress: () => handleOpenTicket(createdVente) },
        ]
      );
    } catch (error) {
      const message = getApiErrorMessage(error, { language, fallback: text.saleSaveError });
      if (isUpgradeRequiredError(error)) {
        Alert.alert(text.error, message, [
          { text: text.close, style: 'cancel' },
          { text: text.viewPlans, onPress: () => navigation.navigate('Abonnement') },
        ]);
      } else {
        Alert.alert(text.error, message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Derived values ─────────────────────────────────────────────────────────
  const totalPanier = cart.reduce((sum, item) => sum + (item.prixUnitaire * item.quantite), 0);
  const selectedClient = useMemo(
    () => clients.find((client) => String(client.id) === String(clientId)) || null,
    [clientId, clients]
  );
  const matchingProduits = useMemo(() => {
    const q = produitSearch.trim().toLowerCase();
    return produits.filter((produit) => {
      if (!q) return true;
      return produit.nom?.toLowerCase().includes(q) || produit.codeBarre?.toLowerCase().includes(q);
    });
  }, [produitSearch, produits]);

  const visibleProduits = useMemo(() => matchingProduits.slice(0, MAX_VISIBLE_PRODUCTS), [matchingProduits]);

  const matchingClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return clients.filter((client) => {
      if (!q) return true;
      const fullName = `${client.prenom || ''} ${client.nom || ''}`.toLowerCase();
      const phone = String(client.telephone || '').toLowerCase();
      return fullName.includes(q) || phone.includes(q);
    });
  }, [clientSearch, clients]);

  const visibleClients = useMemo(() => matchingClients.slice(0, MAX_VISIBLE_CLIENTS), [matchingClients]);

  // ── Period-filtered ventes (for Historique tab) ────────────────────────────
  const periodFilteredVentes = useMemo(() => filterVentesByPeriod(ventes, period), [ventes, period]);
  const periodTotal = useMemo(
    () => periodFilteredVentes.filter((v) => v.statut !== 'ANNULEE').reduce((s, v) => s + (v.montantTotal || 0), 0),
    [periodFilteredVentes]
  );

  // ── Status-filtered ventes (for legacy search/filter inside Historique) ────
  const filteredVentes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodFilteredVentes.filter((vente) => {
      const matchStatus = statusFilter === 'TOUTES' || vente.statut === statusFilter;
      const matchSearch = !q
        || vente.numero?.toLowerCase().includes(q)
        || `${vente.client?.prenom || ''} ${vente.client?.nom || ''}`.toLowerCase().includes(q)
        || vente.details?.some((detail) => detail.produit?.nom?.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [search, statusFilter, periodFilteredVentes]);

  if (loading) {
    return <View style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}><ActivityIndicator size="large" color={TP.primary} /></View>;
  }

  // ─── Period label ────────────────────────────────────────────────────────
  const periodLabel = period === 'TODAY' ? text.periodToday : period === 'WEEK' ? text.periodWeek : text.periodMonth;

  // ─── Tab toggle component ─────────────────────────────────────────────────
  const TabToggle = () => (
    <View style={styles.tabToggleWrap}>
      <TouchableOpacity
        style={[styles.tabToggleBtn, activeTab === 'HISTORY' && styles.tabToggleBtnActive]}
        onPress={() => setActiveTab('HISTORY')}
        activeOpacity={0.82}
      >
        <Text style={[styles.tabToggleBtnText, activeTab === 'HISTORY' && styles.tabToggleBtnTextActive]}>
          {text.tabHistory}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tabToggleBtn, activeTab === 'NEW_SALE' && styles.tabToggleBtnActive]}
        onPress={() => setActiveTab('NEW_SALE')}
        activeOpacity={0.82}
      >
        <Text style={[styles.tabToggleBtnText, activeTab === 'NEW_SALE' && styles.tabToggleBtnTextActive]}>
          {text.tabNewSale}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORIQUE TAB
  // ═══════════════════════════════════════════════════════════════════════════
  if (activeTab === 'HISTORY') {
    return (
      <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.historyScrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); loadVentes(); }}
              tintColor={TP.primary}
              colors={[TP.primary]}
            />
          }
        >
          {/* ── Header ── */}
          <View style={styles.historyHeader}>
            <KenteBar style={styles.historyHeaderKente} />
            <View style={styles.historyHeaderContent}>
              <View>
                <Text style={styles.historyTitle}>{text.historyTitle}</Text>
                <Text style={styles.historyHeaderSub}>Suivi de vos transactions</Text>
              </View>
              <TouchableOpacity
                style={styles.newSaleFab}
                onPress={() => setActiveTab('NEW_SALE')}
              >
                <Feather name="plus" size={18} color="#FFD600" />
                <Text style={styles.newSaleFabText}>Vente</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Period pills ── */}
          <View style={[styles.periodRow, isDark && { backgroundColor: DARK_THEME.background }]}>
            {[
              { key: 'TODAY', label: text.periodToday },
              { key: 'WEEK', label: text.periodWeek },
              { key: 'MONTH', label: text.periodMonth },
            ].map((p) => (
              <TouchableOpacity
                key={p.key}
                style={[
                  styles.periodPill,
                  isDark && { backgroundColor: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder },
                  period === p.key && styles.periodPillActive,
                ]}
                onPress={() => setPeriod(p.key)}
                activeOpacity={0.82}
              >
                <Text style={[
                  styles.periodPillText,
                  isDark && { color: DARK_THEME.muted },
                  period === p.key && styles.periodPillTextActive,
                ]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Summary card ── */}
          <View style={[styles.summaryBigCard, isDark && { backgroundColor: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }]}>
            <View style={styles.summaryBigCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.summaryBigLabel, isDark && { color: DARK_THEME.muted }]}>{text.totalPeriod} {periodLabel}</Text>
                <Text style={[styles.summaryBigAmount, isDark && { color: DARK_THEME.text }]}>{formatCFA(periodTotal, locale)}</Text>
              </View>
              <View style={[styles.summaryIconWrap, isDark && { backgroundColor: 'rgba(27,94,32,0.2)' }]}>
                <Feather name="bar-chart-2" size={20} color={TP.primary} />
              </View>
            </View>
            <View style={[styles.summaryStatsRow, isDark && { borderTopColor: DARK_THEME.cardBorder }]}>
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, isDark && { color: DARK_THEME.text }]}>{filteredVentes.filter(v => v.statut !== 'ANNULEE').length}</Text>
                <Text style={[styles.summaryStatLabel, isDark && { color: DARK_THEME.muted }]}>Ventes</Text>
              </View>
              <View style={[styles.summaryStatDivider, isDark && { backgroundColor: DARK_THEME.cardBorder }]} />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, isDark && { color: DARK_THEME.text }]}>{filteredVentes.filter(v => v.statut === 'EN_CREDIT').length}</Text>
                <Text style={[styles.summaryStatLabel, isDark && { color: DARK_THEME.muted }]}>Crédit</Text>
              </View>
              <View style={[styles.summaryStatDivider, isDark && { backgroundColor: DARK_THEME.cardBorder }]} />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryStatValue, { color: TP.error }, isDark && { color: '#F87171' }]}>{filteredVentes.filter(v => v.statut === 'ANNULEE').length}</Text>
                <Text style={[styles.summaryStatLabel, isDark && { color: DARK_THEME.muted }]}>Annulées</Text>
              </View>
            </View>
          </View>

          {/* ── Transactions header ── */}
          {/* ── Performance chart ── */}
          {ventesTrend.length > 0 && (() => {
            const BAR_MAX_HEIGHT = 72;
            const chartMax = Math.max(...ventesTrend.map((d) => d.total || 0), 1);
            const today = new Date();
            const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            return (
              <View style={[styles.vChartPanel, isDark && { backgroundColor: DARK_THEME.cardBg, borderColor: DARK_THEME.cardBorder }]}>
                <View style={styles.vChartTitleRow}>
                  <View style={[styles.vChartDot, { backgroundColor: TP.gold }]} />
                  <Text style={[styles.vChartTitle, isDark && { color: DARK_THEME.text }]}>Performance</Text>
                  <Text style={[styles.vChartSub, isDark && { color: DARK_THEME.muted }]}>7 derniers jours</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.vChartScroll}>
                  {ventesTrend.map((item, index) => {
                    const barH = Math.max(Math.round(((item.total || 0) / chartMax) * BAR_MAX_HEIGHT), 4);
                    const dateStr = String(item.date || '').trim().slice(0, 10);
                    const isToday = dateStr === todayStr;
                    const dayDate = item.date ? new Date(`${dateStr}T12:00:00.000Z`) : null;
                    const dayLabel = dayDate
                      ? dayDate.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 3)
                      : `J${index + 1}`;
                    const isMax = (item.total || 0) === chartMax && chartMax > 0;
                    return (
                      <View key={`vbar-${item.date}-${index}`} style={styles.vBarWrapper}>
                        {isMax && (
                          <View style={styles.vBarTooltip}>
                            <Text style={styles.vBarTooltipText}>{formatCFA(item.total, locale)}</Text>
                          </View>
                        )}
                        <View style={[styles.vBarTrack, { height: BAR_MAX_HEIGHT }]}>
                          <View style={[
                            styles.vBar,
                            { height: barH },
                            isToday ? styles.vBarToday : isDark ? { backgroundColor: 'rgba(27,94,32,0.65)' } : styles.vBarDefault,
                          ]} />
                        </View>
                        <Text style={[styles.vBarLabel, isToday && styles.vBarLabelToday, isDark && { color: DARK_THEME.muted }]}>
                          {dayLabel}
                        </Text>
                      </View>
                    );
                  })}
                </ScrollView>
              </View>
            );
          })()}

          <View style={styles.txSectionHeader}>
            <Text style={[styles.txSectionTitle, isDark && { color: DARK_THEME.text }]}>{text.transactions}</Text>
            <Text style={[styles.txSectionCount, isDark && { color: DARK_THEME.muted }]}>{text.transactionsCount(filteredVentes.length)}</Text>
          </View>

          {/* ── Transaction list ── */}
          {filteredVentes.length === 0 ? (
            <Text style={[styles.empty, isDark && { color: DARK_THEME.muted }]}>{text.noSale}</Text>
          ) : (
            filteredVentes.map((item, index) => (
              <HistoryTransactionItem
                key={String(item.id)}
                item={item}
                index={index}
                onOpenTicket={handleOpenTicket}
                locale={locale}
              />
            ))
          )}
        </ScrollView>

      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NOUVELLE VENTE TAB
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <FlatList
        ref={listRef}
        data={[]}
        keyExtractor={() => 'noop'}
        renderItem={null}
        ListHeaderComponent={(
          <>
            <View style={styles.newSaleHeaderWrap}>
              <KenteBar style={styles.historyHeaderKente} />
              <View style={styles.newSaleHeaderRow}>
                <TouchableOpacity
                  style={styles.newSaleBackBtn}
                  onPress={() => setActiveTab('HISTORY')}
                  activeOpacity={0.75}
                >
                  <Feather name="arrow-left" size={18} color="#FFD600" />
                </TouchableOpacity>
                <Text style={styles.newSaleScreenTitle}>{text.tabNewSale}</Text>
                <View style={{ width: 34 }} />
              </View>
            </View>

            {/* ── Quick sale card ── */}
            <View style={[styles.quickSaleCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
              <View style={styles.quickSaleHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.quickSaleTitle, isDark && { color: themeColors.text }]}>{text.quickSaleTitle}</Text>
                  <Text style={[styles.quickSaleSubtitle, isDark && { color: themeColors.muted }]}>{text.quickSaleSubtitle}</Text>
                </View>
                <TouchableOpacity style={[styles.scanBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={() => navigation.navigate('Scanner', { mode: 'cart' })}>
                  <Feather name="camera" size={16} color={isDark ? themeColors.accentText : TP.primary} />
                  <Text style={[styles.scanBtnText, isDark && { color: themeColors.accentText }]}>{text.scanProducts}</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.manualSaleNotice, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                <View style={[styles.manualSaleNoticeIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}>
                  <Feather name="edit-3" size={16} color={isDark ? themeColors.accentText : TP.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.manualSaleNoticeTitle, isDark && { color: themeColors.text }]}>{text.manualSaleTitle}</Text>
                  <Text style={[styles.manualSaleNoticeText, isDark && { color: themeColors.muted }]}>{text.manualSaleText}</Text>
                </View>
              </View>

              <View style={[styles.productSearchWrap, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                <Feather name="search" size={16} color={isDark ? themeColors.faint : '#94a3b8'} />
                <TextInput
                  style={[styles.productSearchInput, isDark && { color: themeColors.text }]}
                  placeholder={text.searchProduct}
                  value={produitSearch}
                  onChangeText={setProduitSearch}
                  placeholderTextColor={isDark ? themeColors.faint : '#94a3b8'}
                />
              </View>

              <View style={styles.catalogMetaRow}>
                <Text style={[styles.catalogMetaText, isDark && { color: themeColors.muted }]}>{text.foundProducts(matchingProduits.length)}</Text>
                {matchingProduits.length > MAX_VISIBLE_PRODUCTS && (
                  <Text style={[styles.catalogMetaHint, isDark && { color: themeColors.faint }]}>{text.showingFirst(MAX_VISIBLE_PRODUCTS)}</Text>
                )}
              </View>

              {catalogLoading ? (
                <View style={styles.catalogLoadingWrap}>
                  <ActivityIndicator size="small" color={TP.primary} />
                  <Text style={[styles.catalogLoadingText, isDark && { color: themeColors.muted }]}>{text.catalogLoading}</Text>
                </View>
              ) : visibleProduits.length === 0 ? (
                <View style={[styles.catalogEmpty, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                  <Feather name="package" size={18} color={isDark ? themeColors.faint : '#94a3b8'} />
                  <Text style={[styles.catalogEmptyTitle, isDark && { color: themeColors.text }]}>{text.emptyCatalogTitle}</Text>
                  <Text style={[styles.catalogEmptyText, isDark && { color: themeColors.muted }]}>{text.emptyCatalogText}</Text>
                </View>
              ) : (
                <View style={styles.catalogList}>
                  {visibleProduits.map((produit) => {
                    const expirationBadge = getExpirationBadge(produit, text, locale);

                    return (
                      <View
                        key={produit.id}
                        style={[
                          styles.catalogCard,
                          expirationBadge?.isExpired
                            ? styles.catalogCardDanger
                            : (expirationBadge?.isSoon ? styles.catalogCardWarning : null),
                          isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder },
                          isDark && expirationBadge?.isSoon && { backgroundColor: themeColors.warningBg, borderColor: themeColors.warningBorder },
                          isDark && expirationBadge?.isExpired && { backgroundColor: themeColors.dangerBg, borderColor: themeColors.dangerBorder },
                        ]}
                      >
                        <View style={styles.catalogCardTop}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.catalogProductName, isDark && { color: themeColors.text }]}>{produit.nom}</Text>
                            <Text style={[styles.catalogProductMeta, isDark && { color: themeColors.muted }]}>{formatStockHuman(produit.stock, produit.uniteBase, produit.unitesVente)}</Text>
                          </View>
                          <View style={[styles.catalogBadge, !produit.codeBarre && styles.catalogBadgeWarning, isDark && produit.codeBarre && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                            <Text style={[styles.catalogBadgeText, !produit.codeBarre && styles.catalogBadgeTextWarning]}>
                              {produit.codeBarre ? text.codeOk : text.noCode}
                            </Text>
                          </View>
                        </View>

                        <Text style={[styles.catalogPriceText, isDark && { color: themeColors.text }]}>
                          {produit.unitesVente?.length
                            ? `${formatCFA(produit.unitesVente.find((unit) => unit.estDefaut)?.prix || produit.unitesVente[0]?.prix || produit.prixVente, locale)} / ${produit.unitesVente.find((unit) => unit.estDefaut)?.nom || produit.unitesVente[0]?.nom || produit.uniteBase}`
                            : `${formatCFA(produit.prixVente, locale)} / ${produit.uniteBase}`}
                        </Text>

                        {expirationBadge && (
                          <View style={[styles.expirationBadge, expirationBadge.isExpired ? styles.expirationBadgeDanger : styles.expirationBadgeWarning]}>
                            <Feather name={expirationBadge.icon} size={13} color={expirationBadge.isExpired ? TP.error : TP.secondary} />
                            <Text style={[styles.expirationBadgeText, expirationBadge.isExpired ? styles.expirationBadgeDangerText : styles.expirationBadgeWarningText]}>
                              {expirationBadge.label}
                            </Text>
                          </View>
                        )}

                        <View style={styles.catalogActionsWrap}>
                          {produit.unitesVente?.length ? (
                            produit.unitesVente.map((unit) => (
                              <TouchableOpacity
                                key={unit.id}
                                style={[styles.catalogActionBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                                onPress={() => addToCart(produit, unit)}
                              >
                                <Text style={[styles.catalogActionBtnLabel, isDark && { color: themeColors.text }]}>1 {unit.nom}</Text>
                                <Text style={styles.catalogActionBtnPrice}>{formatCFA(unit.prix, locale)}</Text>
                              </TouchableOpacity>
                            ))
                          ) : (
                            <TouchableOpacity style={[styles.catalogActionBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={() => addToCart(produit)}>
                              <Text style={[styles.catalogActionBtnLabel, isDark && { color: themeColors.text }]}>{text.addBaseUnit(produit.uniteBase)}</Text>
                              <Text style={styles.catalogActionBtnPrice}>{formatCFA(produit.prixVente, locale)}</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              {/* ── Cart section ── */}
              <View
                style={[styles.cartSectionHeader, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                onLayout={(event) => {
                  cartSectionYRef.current = event.nativeEvent.layout.y;
                  if (pendingCartScrollRef.current && cart.length) {
                    scrollToCartSection(false);
                  }
                }}
              >
                <View style={styles.cartSectionTitleWrap}>
                  <Feather name="shopping-cart" size={16} color={isDark ? themeColors.accentText : TP.primary} />
                  <Text style={[styles.cartSectionTitle, isDark && { color: themeColors.text }]}>{text.cartSectionTitle}</Text>
                </View>
                <Text style={[styles.cartSectionHint, isDark && { color: themeColors.muted }]}>{text.cartSectionHint}</Text>
              </View>

              {cart.length === 0 ? (
                <View style={[styles.quickSaleEmpty, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                  <Text style={[styles.quickSaleEmptyTitle, isDark && { color: themeColors.text }]}>{text.cartEmptyTitle}</Text>
                  <Text style={[styles.quickSaleEmptyText, isDark && { color: themeColors.muted }]}>{text.cartEmptyText}</Text>
                </View>
              ) : (
                <>
                  {cart.map((item) => {
                    const expirationBadge = getExpirationBadge(item, text, locale);

                    return (
                      <View
                        key={item.key}
                        style={[
                          styles.cartItem,
                          expirationBadge?.isExpired ? styles.cartItemDanger : (expirationBadge?.isSoon ? styles.cartItemWarning : null),
                          isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder },
                          isDark && expirationBadge?.isSoon && { backgroundColor: themeColors.warningBg, borderColor: themeColors.warningBorder },
                          isDark && expirationBadge?.isExpired && { backgroundColor: themeColors.dangerBg, borderColor: themeColors.dangerBorder },
                        ]}
                      >
                        <View style={styles.cartItemInfo}>
                          <Text style={[styles.cartItemName, isDark && { color: themeColors.text }]}>{item.nom}</Text>
                          <Text style={[styles.cartItemMeta, isDark && { color: themeColors.muted }]}>{formatCFA(item.prixUnitaire, locale)} • {item.uniteNom} • Stock {formatStockHuman(item.stockDispo, item.uniteBase, [])}</Text>
                          {expirationBadge && (
                            <View style={[styles.expirationBadge, expirationBadge.isExpired ? styles.expirationBadgeDanger : styles.expirationBadgeWarning]}>
                              <Feather name={expirationBadge.icon} size={13} color={expirationBadge.isExpired ? TP.error : TP.secondary} />
                              <Text style={[styles.expirationBadgeText, expirationBadge.isExpired ? styles.expirationBadgeDangerText : styles.expirationBadgeWarningText]}>
                                {expirationBadge.label}
                              </Text>
                            </View>
                          )}
                        </View>

                        <View style={styles.cartActions}>
                          <TouchableOpacity style={[styles.qtyBtn, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]} onPress={() => updateQuantite(item.key, -1)}>
                            <Text style={[styles.qtyBtnText, isDark && { color: themeColors.text }]}>−</Text>
                          </TouchableOpacity>
                          <Text style={[styles.qtyValue, isDark && { color: themeColors.text }]}>{item.quantite}</Text>
                          <TouchableOpacity style={[styles.qtyBtn, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]} onPress={() => updateQuantite(item.key, 1)}>
                            <Text style={[styles.qtyBtnText, isDark && { color: themeColors.text }]}>＋</Text>
                          </TouchableOpacity>
                          <TouchableOpacity style={[styles.removeBtn, isDark && { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.2)' }]} onPress={() => removeFromCart(item.key)}>
                            <Feather name="trash-2" size={14} color={TP.error} />
                            <Text style={styles.removeBtnText}>{text.remove}</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}

                  {/* ── Client section ── */}
                  <View style={[styles.clientSection, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
                    <View style={styles.clientSectionHeader}>
                      <View style={styles.clientSectionTitleWrap}>
                        <Feather name="user" size={15} color={isDark ? themeColors.accentText : TP.primary} />
                        <Text style={[styles.clientSectionTitle, isDark && { color: themeColors.text }]}>{text.customerForCredit}</Text>
                      </View>
                      <View style={styles.clientHeaderActions}>
                        <TouchableOpacity style={[styles.addClientBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={openCreateClientModal}>
                          <Feather name="user-plus" size={13} color={isDark ? themeColors.accentText : TP.primary} />
                          <Text style={[styles.addClientBtnText, isDark && { color: themeColors.accentText }]}>{text.addCustomer}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.walkInBtn, !clientId && styles.walkInBtnActive, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }, isDark && !clientId && { backgroundColor: TP.primaryDark, borderColor: TP.primaryDark }]}
                          onPress={() => { setClientId(''); setClientSearch(''); }}
                        >
                          <Text style={[styles.walkInBtnText, !clientId && styles.walkInBtnTextActive, isDark && clientId && { color: themeColors.muted }]}>{text.walkIn}</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {selectedClient ? (
                      <View style={[styles.selectedClientCard, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                        <View style={styles.selectedClientTop}>
                          <View>
                            <Text style={[styles.selectedClientName, isDark && { color: themeColors.text }]}>{formatClientName(selectedClient, text.walkInClient)}</Text>
                            <Text style={[styles.selectedClientMeta, isDark && { color: themeColors.muted }]}>{selectedClient.telephone || text.phoneMissing}</Text>
                          </View>
                          <TouchableOpacity onPress={() => setClientId('')}>
                            <Text style={styles.changeClientText}>{text.change}</Text>
                          </TouchableOpacity>
                        </View>
                        {!!selectedClient.totalDettes && (
                          <Text style={[styles.selectedClientDebt, isDark && { color: '#fbbf24' }]}>{text.debtTotal(formatCFA(selectedClient.totalDettes, locale))}</Text>
                        )}
                      </View>
                    ) : (
                      <Text style={[styles.clientHelperText, isDark && { color: themeColors.muted }]}>{text.clientHelper}</Text>
                    )}

                    <View style={[styles.clientSearchWrap, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                      <Feather name="search" size={16} color={isDark ? themeColors.faint : '#94a3b8'} />
                      <TextInput
                        style={[styles.clientSearchInput, isDark && { color: themeColors.text }]}
                        placeholder={text.searchClient}
                        value={clientSearch}
                        onChangeText={setClientSearch}
                        placeholderTextColor={isDark ? themeColors.faint : '#94a3b8'}
                      />
                    </View>

                    {clientsLoading ? (
                      <Text style={[styles.clientHelperText, isDark && { color: themeColors.muted }]}>{text.loadingClients}</Text>
                    ) : visibleClients.length > 0 ? (
                      <View style={styles.clientResultsList}>
                        {visibleClients.map((client) => {
                          const isActive = String(client.id) === String(clientId);
                          return (
                            <TouchableOpacity
                              key={client.id}
                              style={[styles.clientResultCard, isActive && styles.clientResultCardActive, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }, isDark && isActive && { backgroundColor: 'rgba(232,98,58,0.18)', borderColor: TP.primary }]}
                              onPress={() => { setClientId(String(client.id)); setClientSearch(''); }}
                            >
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.clientResultName, isActive && styles.clientResultNameActive, isDark && { color: themeColors.text }, isDark && isActive && { color: '#FFF0EB' }]}>{formatClientName(client, text.walkInClient)}</Text>
                                <Text style={[styles.clientResultMeta, isActive && styles.clientResultMetaActive, isDark && { color: themeColors.muted }, isDark && isActive && { color: '#FDD0C0' }]}>
                                  {client.telephone || text.noPhone}
                                  {client.totalDettes ? ` • ${text.debtTotal(formatCFA(client.totalDettes, locale))}` : ''}
                                </Text>
                              </View>
                              {isActive && <Feather name="check-circle" size={16} color={isDark ? themeColors.accentText : TP.primary} />}
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : (
                      <View style={[styles.noClientBox, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                        <Text style={[styles.clientHelperText, isDark && { color: themeColors.muted }]}>{text.noClientFound}</Text>
                        <TouchableOpacity style={[styles.noClientActionBtn, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]} onPress={openCreateClientModal}>
                          <Feather name="user-plus" size={14} color={isDark ? themeColors.accentText : TP.primary} />
                          <Text style={[styles.noClientActionText, isDark && { color: themeColors.accentText }]}>{text.createClient}</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  {/* ── Payment mode ── */}
                  <View style={styles.paymentRow}>
                    {paymentOptions.map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={[styles.paymentBtn, modePaiement === option.key && styles.paymentBtnActive, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }, isDark && modePaiement === option.key && { backgroundColor: TP.primaryDark, borderColor: TP.primaryDark }]}
                        onPress={() => {
                          setModePaiement(option.key);
                          if (option.key !== 'CREDIT') setMontantPaye('');
                        }}
                      >
                        <Feather name={option.icon} size={15} color={modePaiement === option.key ? '#fff' : (isDark ? themeColors.muted : '#374151')} />
                        <Text style={[styles.paymentBtnText, modePaiement === option.key && styles.paymentBtnTextActive, isDark && modePaiement !== option.key && { color: themeColors.muted }]}>{option.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {modePaiement === 'CREDIT' && (
                    <View style={[styles.creditCard, isDark && { backgroundColor: themeColors.warningBg, borderColor: themeColors.warningBorder }]}>
                      <View style={styles.creditHeader}>
                        <Feather name="alert-circle" size={16} color={TP.secondary} />
                        <Text style={[styles.creditTitle, isDark && { color: themeColors.text }]}>{text.creditSale}</Text>
                      </View>
                      <Text style={[styles.creditHint, isDark && { color: '#fde68a' }]}>{text.creditHint}</Text>
                      <View style={[styles.creditInputWrap, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                        <Feather name="dollar-sign" size={16} color={isDark ? themeColors.faint : '#94a3b8'} />
                        <TextInput
                          style={[styles.creditInput, isDark && { color: themeColors.text }]}
                          placeholder={text.amountPaidNow}
                          value={montantPaye}
                          onChangeText={setMontantPaye}
                          keyboardType="numeric"
                          placeholderTextColor={isDark ? themeColors.faint : '#94a3b8'}
                        />
                      </View>
                      <View style={[styles.creditSummaryBox, isDark && { backgroundColor: 'rgba(255,255,255,0.04)', borderColor: themeColors.surfaceBorder }]}>
                        <Text style={[styles.creditSummaryLine, isDark && { color: '#fde68a' }]}>{text.paidNow(formatCFA(montantPaye === '' ? 0 : Number(String(montantPaye).replace(',', '.')) || 0, locale))}</Text>
                        <Text style={[styles.creditSummaryLineStrong, isDark && { color: themeColors.text }]}>
                          {text.remainingToPay(formatCFA(Math.max(0, totalPanier - (montantPaye === '' ? 0 : Number(String(montantPaye).replace(',', '.')) || 0)), locale))}
                        </Text>
                      </View>
                      {!clientId && (
                        <Text style={[styles.creditWarning, isDark && { color: '#fdba74' }]}>{text.creditClientRequired}</Text>
                      )}
                    </View>
                  )}

                  {/* ── Cart footer ── */}
                  <View style={[styles.cartFooter, isDark && { borderTopColor: themeColors.surfaceBorder }]}>
                    <View>
                      <Text style={[styles.totalLabel, isDark && { color: themeColors.muted }]}>{text.totalCart}</Text>
                      <Text style={[styles.cartTotal, isDark && { color: themeColors.text }]}>{formatCFA(totalPanier, locale)}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
                      onPress={handleSubmit}
                      disabled={submitting}
                    >
                      {!submitting && <Feather name="check-circle" size={16} color="#fff" />}
                      <Text style={styles.submitBtnText}>{submitting ? text.validating : text.validateSale}</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadVentes(); loadProduits(); loadClients(); }}
            tintColor={isDark ? themeColors.accentText : TP.primary}
            colors={[TP.primary]}
            progressBackgroundColor={isDark ? themeColors.headerBg : undefined}
          />
        }
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
      />

      {/* ── Create client modal ── */}
      <Modal visible={showClientModal} animationType="slide" transparent onRequestClose={closeCreateClientModal}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: themeColors.overlay }]}>
          <View style={[styles.modalCard, isDark && { backgroundColor: themeColors.headerBg }]}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={[styles.modalHandle, isDark && { backgroundColor: '#243041' }]} />
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalTitleIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}>
                  <Feather name="user-plus" size={18} color={isDark ? themeColors.accentText : TP.primary} />
                </View>
                <Text style={[styles.modalTitle, isDark && { color: themeColors.text }]}>{text.modalTitle}</Text>
              </View>
              <Text style={[styles.modalSubtitle, isDark && { color: themeColors.muted }]}>{text.modalSubtitle}</Text>
              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.name} *</Text>
              <TextInput value={clientForm.nom} onChangeText={(nom) => setClientForm((prev) => ({ ...prev, nom }))} style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]} placeholder={text.name} placeholderTextColor={isDark ? themeColors.faint : '#9ca3af'} />
              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.firstName}</Text>
              <TextInput value={clientForm.prenom} onChangeText={(prenom) => setClientForm((prev) => ({ ...prev, prenom }))} style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]} placeholder={text.firstName} placeholderTextColor={isDark ? themeColors.faint : '#9ca3af'} />
              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.phone}</Text>
              <TextInput value={clientForm.telephone} onChangeText={(telephone) => setClientForm((prev) => ({ ...prev, telephone }))} style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]} placeholder={text.phone} keyboardType="phone-pad" placeholderTextColor={isDark ? themeColors.faint : '#9ca3af'} />
              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.address}</Text>
              <TextInput value={clientForm.adresse} onChangeText={(adresse) => setClientForm((prev) => ({ ...prev, adresse }))} style={[styles.input, styles.textarea, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]} placeholder={text.addressPlaceholder} multiline placeholderTextColor={isDark ? themeColors.faint : '#9ca3af'} />
              <View style={styles.modalActions}>
                <TouchableOpacity style={[styles.secondaryBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]} onPress={closeCreateClientModal} disabled={creatingClient}>
                  <Feather name="x" size={14} color={isDark ? themeColors.accentText : TP.primary} />
                  <Text style={[styles.secondaryBtnText, isDark && { color: themeColors.accentText }]}>{text.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.primaryBtn, isDark && { backgroundColor: themeColors.accentBg }]} onPress={handleCreateClient} disabled={creatingClient}>
                  <Feather name="plus-circle" size={16} color={isDark ? themeColors.accentText : TP.primary} />
                  <Text style={[styles.primaryBtnText, isDark && { color: themeColors.accentText }]}>{creatingClient ? text.creating : text.createClient}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TP.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Tab toggle ──────────────────────────────────────────────────────────────
  tabToggleWrap: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TP.border,
    padding: 4,
    alignSelf: 'flex-start',
    marginTop: 16,
    marginBottom: 4,
  },
  tabToggleBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 11,
  },
  tabToggleBtnActive: {
    backgroundColor: TP.primary,
  },
  tabToggleBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: TP.muted,
  },
  tabToggleBtnTextActive: {
    color: '#FFFFFF',
  },

  // ── Historique screen ───────────────────────────────────────────────────────
  historyScrollContent: { paddingBottom: 40 },

  // ── History header ──────────────────────────────────────────────────────────
  historyHeader: {
    backgroundColor: '#071C08',
    paddingTop: 50,
    paddingBottom: 0,
  },
  historyHeaderKente: {
    flexDirection: 'row',
    height: 3,
    marginHorizontal: 20,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 16,
  },
  historyHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  historyHeaderSub: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.55)',
    marginTop: 3,
  },
  newSaleFab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1B5E20',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,214,0,0.3)',
  },
  newSaleFabText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFD600',
  },
  filterIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: TP.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Period pills
  periodRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  periodPill: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: TP.border,
  },
  periodPillActive: {
    backgroundColor: TP.primary,
    borderColor: TP.primary,
  },
  periodPillText: {
    fontSize: 13,
    fontWeight: '700',
    color: TP.text,
  },
  periodPillTextActive: {
    color: '#FFFFFF',
  },

  // Summary big card
  summaryBigCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  summaryBigCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  summaryBigLabel: {
    fontSize: 13,
    color: TP.muted,
    fontWeight: '600',
  },
  summaryBigAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: TP.text,
    marginTop: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: TP.successLight,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trendBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: TP.success,
  },

  // ── Summary card stats ───────────────────────────────────────────────────────
  summaryIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(27,94,32,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStatsRow: {
    flexDirection: 'row',
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  summaryStat: {
    flex: 1,
    alignItems: 'center',
  },
  summaryStatValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A2E',
  },
  summaryStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  summaryStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#F1F5F9',
    alignSelf: 'center',
  },

  // Transactions section
  /* ── Performance chart ─────────────────────────────────────────────────── */
  vChartPanel: {
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.12)',
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 12,
    shadowColor: '#1B5E20',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  vChartTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  vChartDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  vChartTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A18',
    flex: 1,
  },
  vChartSub: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
  },
  vChartScroll: {
    paddingRight: 8,
    paddingBottom: 4,
    alignItems: 'flex-end',
  },
  vBarWrapper: {
    alignItems: 'center',
    marginRight: 10,
    width: 38,
  },
  vBarTooltip: {
    backgroundColor: '#071C08',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 2,
    marginBottom: 4,
  },
  vBarTooltipText: {
    color: '#FFD600',
    fontSize: 9,
    fontWeight: '800',
  },
  vBarTrack: {
    justifyContent: 'flex-end',
    width: 24,
    borderRadius: 4,
    backgroundColor: 'rgba(27,94,32,0.06)',
  },
  vBar: {
    width: 24,
    borderRadius: 4,
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  vBarDefault: { backgroundColor: 'rgba(27,94,32,0.55)' },
  vBarToday: { backgroundColor: '#FFD600' },
  vBarLabel: {
    marginTop: 6,
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
  },
  vBarLabelToday: {
    color: '#1B5E20',
    fontWeight: '800',
  },

  txSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 20,
    marginTop: 28,
    marginBottom: 12,
  },
  txSectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: TP.text,
  },
  txSectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: TP.muted,
  },

  // Transaction card
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 16,
    padding: 14,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  txIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txMiddle: { flex: 1 },
  txProductNames: {
    fontSize: 14,
    fontWeight: '700',
    color: TP.text,
  },
  txTime: {
    fontSize: 12,
    color: TP.muted,
    marginTop: 3,
  },
  txDate: {
    color: TP.muted,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: TP.success,
  },

  // ── Nouvelle Vente screen ───────────────────────────────────────────────────
  newSaleHeaderWrap: {
    backgroundColor: '#071C08',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  newSaleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  newSaleBackBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newSaleScreenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // Quick sale card
  quickSaleCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 8,
    borderRadius: 24,
    padding: 20,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.12)',
  },
  quickSaleHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' },
  quickSaleTitle: { fontSize: 20, fontWeight: '800', color: '#1A1A2E' },
  quickSaleSubtitle: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 18, flex: 1 },
  scanBtn: {
    backgroundColor: 'rgba(27,94,32,0.08)',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.2)',
  },
  scanBtnText: { color: '#1B5E20', fontWeight: '800', fontSize: 13 },
  manualSaleNotice: {
    marginTop: 18,
    backgroundColor: 'rgba(27,94,32,0.06)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.15)',
    padding: 16,
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  manualSaleNoticeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(27,94,32,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualSaleNoticeTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  manualSaleNoticeText: { fontSize: 12, color: '#6B7280', marginTop: 4, lineHeight: 18 },

  // Product search
  productSearchWrap: {
    marginTop: 18,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productSearchInput: { flex: 1, paddingVertical: 14, color: '#1A1A2E', fontSize: 14, fontWeight: '600' },
  catalogMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, gap: 12 },
  catalogMetaText: { fontSize: 12, color: '#475569', fontWeight: '700' },
  catalogMetaHint: { fontSize: 11, color: '#94a3b8' },
  catalogLoadingWrap: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 16, alignItems: 'center', gap: 8 },
  catalogLoadingText: { fontSize: 13, color: '#6B7280' },
  catalogEmpty: { marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: '#e2e8f0', backgroundColor: '#f8fafc', padding: 16, alignItems: 'center' },
  catalogEmptyTitle: { marginTop: 8, fontSize: 14, fontWeight: '700', color: '#1A1A2E' },
  catalogEmptyText: { marginTop: 4, fontSize: 12, color: '#6B7280', textAlign: 'center', lineHeight: 18 },

  // Catalog grid
  catalogList: { marginTop: 18, gap: 12 },
  catalogCard: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  catalogCardWarning: { borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' },
  catalogCardDanger: { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  catalogCardTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  catalogProductName: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  catalogProductMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  catalogBadge: {
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catalogBadgeWarning: { backgroundColor: '#FEF3C7', borderColor: '#FDE68A' },
  catalogBadgeText: { fontSize: 11, fontWeight: '800', color: '#475569' },
  catalogBadgeTextWarning: { color: '#92400E' },
  catalogPriceText: { fontSize: 14, fontWeight: '800', color: '#1B6B3A', marginTop: 12 },

  // Expiration badges
  expirationBadge: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  expirationBadgeWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  expirationBadgeDanger: { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  expirationBadgeText: { fontSize: 12, fontWeight: '700' },
  expirationBadgeWarningText: { color: '#92400E' },
  expirationBadgeDangerText: { color: '#991B1B' },

  // Catalog action buttons
  catalogActionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 12 },
  catalogActionBtn: {
    backgroundColor: 'rgba(27,94,32,0.06)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.15)',
    minWidth: 120,
    alignItems: 'center',
  },
  catalogActionBtnLabel: { fontSize: 13, fontWeight: '800', color: '#1B5E20' },
  catalogActionBtnPrice: { fontSize: 11, color: '#155724', marginTop: 2, fontWeight: '600' },

  // Cart section header
  cartSectionHeader: {
    marginTop: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(27,94,32,0.2)',
    backgroundColor: 'rgba(27,94,32,0.06)',
    padding: 16,
  },
  cartSectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartSectionTitle: { fontSize: 16, fontWeight: '800', color: '#1B5E20' },
  cartSectionHint: { marginTop: 8, fontSize: 13, color: '#155724', lineHeight: 20, fontWeight: '500' },
  quickSaleEmpty: {
    backgroundColor: '#F8F6F3',
    borderRadius: 20,
    padding: 20,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  quickSaleEmptyTitle: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  quickSaleEmptyText: { fontSize: 13, color: '#6B7280', marginTop: 6, lineHeight: 20 },

  // Cart items
  cartItem: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 14,
    marginTop: 14,
    backgroundColor: '#FFFFFF',
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cartItemWarning: { borderColor: '#FEF3C7', backgroundColor: '#FFFBEB' },
  cartItemDanger: { borderColor: '#FEE2E2', backgroundColor: '#FEF2F2' },
  cartItemInfo: { marginBottom: 14 },
  cartItemName: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  cartItemMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  cartActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },

  // Client section
  clientSection: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 20,
    padding: 16,
    backgroundColor: '#FFFFFF',
  },
  clientSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' },
  clientSectionTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  clientSectionTitle: { fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  clientHeaderActions: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginTop: 10 },
  addClientBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(232,98,58,0.2)',
    backgroundColor: '#FFF0EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 1,
  },
  addClientBtnText: { fontSize: 12, fontWeight: '800', color: '#E8623A' },
  walkInBtn: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    flexShrink: 1,
  },
  walkInBtnActive: { backgroundColor: '#FFF0EB', borderColor: 'rgba(232,98,58,0.2)' },
  walkInBtnText: { fontSize: 12, fontWeight: '700', color: '#6B7280' },
  walkInBtnTextActive: { color: '#E8623A' },
  selectedClientCard: { marginTop: 14, borderRadius: 16, backgroundColor: '#FFF0EB', borderWidth: 1, borderColor: 'rgba(232,98,58,0.2)', padding: 16 },
  selectedClientTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  selectedClientName: { fontSize: 15, fontWeight: '800', color: '#1A1A2E' },
  selectedClientMeta: { fontSize: 13, color: '#6B7280', marginTop: 4 },
  selectedClientDebt: { fontSize: 13, color: '#92400E', marginTop: 10, fontWeight: '800' },
  changeClientText: { fontSize: 13, fontWeight: '800', color: '#E8623A' },
  clientHelperText: { marginTop: 12, fontSize: 13, color: '#6B7280', lineHeight: 20 },
  clientSearchWrap: {
    marginTop: 14,
    backgroundColor: '#F8F6F3',
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  clientSearchInput: { flex: 1, paddingVertical: 14, color: '#1A1A2E', fontSize: 14, fontWeight: '600' },
  clientResultsList: { marginTop: 14, gap: 10 },
  clientResultCard: {
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#F8F6F3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientResultCardActive: { borderColor: 'rgba(232,98,58,0.3)', backgroundColor: '#FFF0EB' },
  clientResultName: { fontSize: 14, fontWeight: '800', color: '#1A1A2E' },
  clientResultNameActive: { color: '#E8623A' },
  clientResultMeta: { fontSize: 12, color: '#6B7280', marginTop: 4 },
  clientResultMetaActive: { color: '#C44A25' },
  noClientBox: { marginTop: 10 },
  noClientActionBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    borderRadius: 12,
    backgroundColor: '#FFF0EB',
    borderWidth: 1,
    borderColor: 'rgba(232,98,58,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  noClientActionText: { color: '#E8623A', fontWeight: '800', fontSize: 13 },

  // Qty controls
  qtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#FFF0EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnText: { color: '#E8623A', fontWeight: '800', fontSize: 20 },
  qtyValue: { minWidth: 24, textAlign: 'center', fontSize: 16, fontWeight: '800', color: '#1A1A2E' },
  removeBtn: {
    marginLeft: 'auto',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 11,
    backgroundColor: '#FEF2F2',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  removeBtnText: { color: '#DC2626', fontWeight: '800', fontSize: 13 },

  // Payment mode
  paymentRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  paymentBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  paymentBtnActive: { backgroundColor: '#E8623A', borderColor: '#E8623A' },
  paymentBtnText: { color: '#475569', fontWeight: '800' },
  paymentBtnTextActive: { color: '#FFFFFF' },

  // Credit card
  creditCard: { marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: '#FEF3C7', backgroundColor: '#FFFBEB', padding: 16 },
  creditHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  creditTitle: { fontSize: 16, fontWeight: '800', color: '#92400E' },
  creditHint: { marginTop: 10, fontSize: 13, color: '#92400E', lineHeight: 20, fontWeight: '500' },
  creditInputWrap: {
    marginTop: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FDE68A',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  creditInput: { flex: 1, paddingVertical: 14, color: '#1A1A2E', fontSize: 14, fontWeight: '700' },
  creditSummaryBox: { marginTop: 14, borderRadius: 14, backgroundColor: 'rgba(255, 255, 255, 0.5)', padding: 14, borderWidth: 1, borderColor: '#FEF3C7' },
  creditSummaryLine: { fontSize: 13, color: '#6B7280', fontWeight: '500' },
  creditSummaryLineStrong: { fontSize: 14, fontWeight: '800', color: '#92400E', marginTop: 8 },
  creditWarning: { marginTop: 12, fontSize: 13, color: '#DC2626', fontWeight: '800', textAlign: 'center' },

  // Cart footer
  cartFooter: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 20,
  },
  totalLabel: { fontSize: 12, color: '#6B7280', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  cartTotal: { fontSize: 26, fontWeight: '900', color: '#1A1A2E', marginTop: 4 },
  submitBtn: {
    backgroundColor: '#1B6B3A',
    borderRadius: 18,
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#1B6B3A',
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 6,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#FFFFFF', fontWeight: '900', fontSize: 16 },

  // ── List & shared ──────────────────────────────────────────────────────────
  list: { paddingBottom: 32 },

  // Sale list items (kept for VenteItem)
  item: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 15,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(232,98,58,0.1)',
    marginHorizontal: 16,
  },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  numero: { fontSize: 15, fontWeight: '800', color: '#475569' },
  badge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  badgeText: { fontSize: 12, fontWeight: '800' },
  itemBody: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  date: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
  montant: { fontSize: 18, fontWeight: '900', color: '#1B6B3A' },
  inlineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  ticketActionRow: { marginTop: 16, alignItems: 'flex-end' },
  ticketActionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF0EB',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,98,58,0.2)',
  },
  ticketActionText: { color: '#E8623A', fontSize: 13, fontWeight: '800' },
  client: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  meta: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  articles: { fontSize: 13, color: '#94A3B8', fontWeight: '500' },
  empty: { textAlign: 'center', color: '#94A3B8', marginTop: 60, fontSize: 16, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26, 26, 46, 0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, maxHeight: '90%' },
  modalHandle: { width: 50, height: 6, borderRadius: 999, backgroundColor: '#E2E8F0', alignSelf: 'center', marginBottom: 20 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  modalTitleIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: '#FFF0EB', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1A1A2E' },
  modalSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 6, marginBottom: 20, lineHeight: 20 },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: '#475569', marginTop: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8F6F3', borderRadius: 16, padding: 16, fontSize: 15, color: '#1A1A2E' },
  textarea: { minHeight: 110, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 24, gap: 12 },
  primaryBtn: {
    backgroundColor: '#FFF0EB',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(232,98,58,0.2)',
  },
  primaryBtnText: { color: '#E8623A', fontWeight: '800', fontSize: 15 },
  secondaryBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryBtnText: { color: '#E8623A', fontWeight: '800', fontSize: 15 },
});
