import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getDettes, rembourserDette } from '../lib/api';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { TP, DARK_THEME } from '../theme/tokens';
import StatCard from '../components/StatCard';
import { getAvatarColorByName } from '../utils/avatarColor';

const formatCFA = (value, locale) => `${Math.round(value || 0).toLocaleString(locale)} CFA`;

const DEBT_TEXT = {
  fr: {
    salePrefix: 'Vente', paid: 'Payée', inProgress: 'En cours', total: 'Total', paidAmount: 'Payé', remaining: 'Restant',
    paymentsCount: (count) => `${count} paiement(s)`, repay: 'Rembourser', loadError: 'Impossible de charger les dettes.',
    errorTitle: 'Erreur',
    validationTitle: 'Validation', invalidAmount: 'Saisis un montant valide.', maxAmount: (value, locale) => `Le montant ne peut pas dépasser ${formatCFA(value, locale)}.`,
    successTitle: 'Succès', paymentSaved: 'Paiement enregistré.', paymentError: 'Impossible de rembourser cette dette.',
    headerBadge: 'Suivi des encours', title: 'Dettes & Crédits', subtitle: 'Suivi des encours et remboursements clients',
    currentDebts: 'Dettes en cours', openCases: 'Dossiers ouverts', visible: 'Affichées',
    searchPlaceholder: 'Rechercher un client, une vente, un produit...', filterOpen: 'En cours', filterPaid: 'Payées', filterAll: 'Toutes',
    empty: 'Aucune dette pour ce filtre', modalTitle: 'Remboursement', modalSubtitle: 'Enregistre un paiement sur cette dette.',
    client: 'Client', sale: 'Vente', alreadyPaid: 'Déjà payé', leftToPay: 'Reste à payer', paymentHistory: 'Historique des paiements',
    amountLabel: 'Montant *', amountPlaceholder: 'Montant', maxPlaceholder: (value, locale) => `Max ${formatCFA(value, locale)}`,
    payAll: 'Tout payer', fullyPaidHint: 'Cette dette sera entièrement remboursée.', remainingAfterPayment: (value, locale) => `Restant après paiement : ${formatCFA(value, locale)}`,
    cancel: 'Annuler', confirming: 'Validation…', confirmPayment: 'Confirmer le paiement',
  },
  en: {
    salePrefix: 'Sale', paid: 'Paid', inProgress: 'Open', total: 'Total', paidAmount: 'Paid', remaining: 'Remaining',
    paymentsCount: (count) => `${count} payment(s)`, repay: 'Repay', loadError: 'Unable to load debts.',
    errorTitle: 'Error',
    validationTitle: 'Validation', invalidAmount: 'Enter a valid amount.', maxAmount: (value, locale) => `Amount cannot exceed ${formatCFA(value, locale)}.`,
    successTitle: 'Success', paymentSaved: 'Payment recorded.', paymentError: 'Unable to repay this debt.',
    headerBadge: 'Outstanding tracking', title: 'Debts & Credits', subtitle: 'Track outstanding balances and customer repayments',
    currentDebts: 'Outstanding debts', openCases: 'Open cases', visible: 'Visible',
    searchPlaceholder: 'Search by client, sale or product...', filterOpen: 'Open', filterPaid: 'Paid', filterAll: 'All',
    empty: 'No debt for this filter', modalTitle: 'Repayment', modalSubtitle: 'Record a payment on this debt.',
    client: 'Client', sale: 'Sale', alreadyPaid: 'Already paid', leftToPay: 'Left to pay', paymentHistory: 'Payment history',
    amountLabel: 'Amount *', amountPlaceholder: 'Amount', maxPlaceholder: (value, locale) => `Max ${formatCFA(value, locale)}`,
    payAll: 'Pay all', fullyPaidHint: 'This debt will be fully repaid.', remainingAfterPayment: (value, locale) => `Remaining after payment: ${formatCFA(value, locale)}`,
    cancel: 'Cancel', confirming: 'Submitting…', confirmPayment: 'Confirm payment',
  },
};


function DebtItem({ item, onPay, text, locale, isDark, themeColors }) {
  const productLabel = item.vente?.details?.map((detail) => detail.produit?.nom).filter(Boolean).slice(0, 2).join(', ');
  const initials = `${item.client?.prenom?.[0] || ''}${item.client?.nom?.[0] || ''}`.trim().toUpperCase() || 'D';
  const avatarColor = getAvatarColorByName(initials);
  const paymentMeta = `${new Date(item.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })}${item.remboursements?.length ? ` • ${text.paymentsCount(item.remboursements.length)}` : ''}`;
  const isPaid = item.statut === 'PAYEE';

  return (
    <View style={[styles.item, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
      <View style={styles.itemTop}>
        <View style={[
          styles.avatar,
          { backgroundColor: avatarColor.bg, borderColor: avatarColor.border },
          isDark && { backgroundColor: themeColors.accentBg, borderColor: 'rgba(27,94,32,0.35)' },
        ]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }, isDark && { color: themeColors.accentText }]}>{initials}</Text>
        </View>
        <View style={styles.itemMain}>
          <Text style={[styles.itemName, isDark && { color: themeColors.text }]}>{item.client?.prenom} {item.client?.nom}</Text>
          <View style={styles.metaRow}>
            <Feather name="shopping-bag" size={13} color={isDark ? themeColors.faint : TP.muted} />
            <Text style={[styles.itemMeta, isDark && { color: themeColors.muted }]}>{text.salePrefix} #{item.vente?.numero || '—'}</Text>
          </View>
          {item.client?.telephone ? (
            <View style={styles.metaRow}>
              <Feather name="phone" size={13} color={isDark ? themeColors.faint : TP.muted} />
              <Text style={[styles.itemMeta, isDark && { color: themeColors.muted }]}>{item.client.telephone}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Status + remaining badges */}
      <View style={styles.badgesRow}>
        <View style={[
          styles.badge,
          isPaid ? styles.badgeGreen : styles.badgeGold,
          isDark && isPaid && { backgroundColor: 'rgba(27,107,58,0.14)', borderColor: 'rgba(27,107,58,0.26)' },
          isDark && !isPaid && { backgroundColor: themeColors.warningBg, borderColor: themeColors.warningBorder },
        ]}>
          <Feather name={isPaid ? 'check-circle' : 'clock'} size={12} color={isPaid ? TP.green : '#B45309'} />
          <Text style={[styles.badgeText, isPaid ? styles.badgeTextGreen : styles.badgeTextGold]}>
            {isPaid ? text.paid : text.inProgress}
          </Text>
        </View>
        <View style={[styles.badge, styles.badgeTerracotta, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Feather name="credit-card" size={12} color={TP.green} />
          <Text numberOfLines={1} style={[styles.badgeText, styles.badgeTextTerracotta, isDark && { color: themeColors.accentText }]}>
            {text.remaining}: {formatCFA(item.montantRestant, locale)}
          </Text>
        </View>
      </View>

      {productLabel ? (
        <View style={[styles.helperNotice, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Feather name="package" size={13} color={isDark ? themeColors.faint : TP.muted} />
          <Text style={[styles.helperNoticeText, isDark && { color: themeColors.muted }]}>{productLabel}</Text>
        </View>
      ) : null}

      {/* Amount boxes */}
      <View style={styles.amountsRow}>
        <View style={[styles.amountBox, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Text style={[styles.amountLabel, isDark && { color: themeColors.muted }]}>{text.total}</Text>
          <Text style={[styles.amountValue, isDark && { color: themeColors.text }]}>{formatCFA(item.montantTotal, locale)}</Text>
        </View>
        <View style={[styles.amountBox, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Text style={[styles.amountLabel, isDark && { color: themeColors.muted }]}>{text.paidAmount}</Text>
          <Text style={[styles.amountValue, styles.amountPaid]}>{formatCFA(item.montantPaye, locale)}</Text>
        </View>
        <View style={[styles.amountBox, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Text style={[styles.amountLabel, isDark && { color: themeColors.muted }]}>{text.remaining}</Text>
          <Text style={[styles.amountValue, isDark && { color: themeColors.text }, item.montantRestant > 0 && styles.amountRest]}>
            {formatCFA(item.montantRestant, locale)}
          </Text>
        </View>
      </View>

      <View style={[styles.helperNotice, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
        <Feather name="calendar" size={13} color={isDark ? themeColors.faint : TP.muted} />
        <Text style={[styles.helperNoticeText, isDark && { color: themeColors.muted }]}>{paymentMeta}</Text>
      </View>

      {item.statut === 'EN_COURS' ? (
        <TouchableOpacity
          style={[styles.payBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
          onPress={() => onPay(item)}
        >
          <Feather name="credit-card" size={15} color={isDark ? themeColors.accentText : TP.green} />
          <Text style={[styles.payBtnText, isDark && { color: themeColors.accentText }]}>{text.repay}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function DettesScreen() {
  const { language, locale } = useI18n();
  const { isDark } = useTheme();
  const themeColors = isDark ? DARK_THEME : null;
  const [data, setData] = useState({ dettes: [], totalDettes: 0, nombreEnCours: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('EN_COURS');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedDette, setSelectedDette] = useState(null);
  const [montantRemb, setMontantRemb] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const text = DEBT_TEXT[language] || DEBT_TEXT.fr;
  const placeholderTextColor = isDark ? themeColors.faint : '#94a3b8';

  const loadDettes = async (nextFilter = filter) => {
    try {
      const { data: response } = await getDettes({ statut: nextFilter || undefined });
      if (response.success) {
        const arr = Array.isArray(response.data) ? response.data : (response.data?.dettes || []);
        setData({
          dettes: arr,
          totalDettes: response.data?.totalDettes ?? response.totalDettes ?? 0,
          nombreEnCours: response.data?.nombreEnCours ?? response.nombreEnCours ?? 0,
        });
      }
    } catch (error) {
      Alert.alert(text.errorTitle, getApiErrorMessage(error, { language, fallback: text.loadError }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDettes(filter); }, [filter]);

  const filteredDettes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data.dettes || [];

    return (data.dettes || []).filter((dette) => {
      const client = `${dette.client?.prenom || ''} ${dette.client?.nom || ''}`.toLowerCase();
      return client.includes(q)
        || dette.client?.telephone?.toLowerCase().includes(q)
        || dette.vente?.numero?.toLowerCase().includes(q)
        || dette.vente?.details?.some((detail) => detail.produit?.nom?.toLowerCase().includes(q));
    });
  }, [data.dettes, search]);

  const openPayment = (dette) => {
    setSelectedDette(dette);
    setMontantRemb('');
    setShowModal(true);
  };

  const handlePayment = async () => {
    const amount = parseFloat(montantRemb);
    if (!selectedDette || !amount || amount <= 0) {
      Alert.alert(text.validationTitle, text.invalidAmount);
      return;
    }
    if (amount > selectedDette.montantRestant) {
      Alert.alert(text.validationTitle, text.maxAmount(selectedDette.montantRestant, locale));
      return;
    }

    setSubmitting(true);
    try {
      const response = await rembourserDette(selectedDette.id, amount);
      setShowModal(false);
      setSelectedDette(null);
      setMontantRemb('');
      await loadDettes(filter);
      Alert.alert(text.successTitle, getApiSuccessMessage(response, { language, fallback: text.paymentSaved }));
    } catch (error) {
      Alert.alert(text.errorTitle, getApiErrorMessage(error, { language, fallback: text.paymentError }));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={TP.green} />
      </View>
    );
  }

  const FILTERS = [
    { key: 'EN_COURS', label: text.filterOpen, icon: 'clock' },
    { key: 'PAYEE', label: text.filterPaid, icon: 'check-circle' },
    { key: '', label: text.filterAll, icon: 'layers' },
  ];

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <FlatList
        data={filteredDettes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <DebtItem item={item} onPay={openPayment} text={text} locale={locale} isDark={isDark} themeColors={themeColors} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadDettes(filter); }}
            tintColor={isDark ? themeColors.accentText : TP.green}
            colors={[TP.green]}
            progressBackgroundColor={isDark ? '#081120' : undefined}
          />
        }
        ListHeaderComponent={(
          <>
            {/* Header */}
            <View style={[styles.header, isDark && { backgroundColor: themeColors.headerBg }]}>
              <View style={styles.headerBadge}>
                <Feather name="shield" size={13} color="rgba(255,255,255,0.7)" />
                <Text style={styles.headerBadgeText}>{text.headerBadge}</Text>
              </View>
              <Text style={styles.title}>{text.title}</Text>
              <Text style={styles.subtitle}>{text.subtitle}</Text>

              {/* Summary card — total outstanding */}
              <View style={styles.summaryHero}>
                <Text style={styles.summaryHeroLabel}>{text.currentDebts}</Text>
                <Text style={styles.summaryHeroAmount}>{formatCFA(data.totalDettes, locale)}</Text>
              </View>
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <StatCard label={text.currentDebts} value={formatCFA(data.totalDettes, locale)} tone="rgba(220,38,38,0.1)" icon="credit-card" accent={TP.danger} isDark={isDark} themeColors={themeColors} />
              <StatCard label={text.openCases} value={data.nombreEnCours || 0} tone={TP.goldLight} icon="folder" accent="#C47D0A" isDark={isDark} themeColors={themeColors} />
              <StatCard label={text.visible} value={filteredDettes.length} tone={TP.greenLight} icon="eye" accent={TP.green} isDark={isDark} themeColors={themeColors} />
            </View>

            {/* Search + filter tabs */}
            <View style={styles.toolbar}>
              <View style={[styles.searchWrap, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
                <Feather name="search" size={16} color={isDark ? themeColors.faint : TP.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={text.searchPlaceholder}
                  placeholderTextColor={placeholderTextColor}
                  style={[styles.searchInput, isDark && { color: themeColors.text }]}
                />
              </View>

              {/* Filter tabs — active tab = green */}
              <View style={styles.filterRow}>
                {FILTERS.map((item) => {
                  const isActive = filter === item.key;
                  return (
                    <TouchableOpacity
                      key={item.key + item.label}
                      style={[
                        styles.filterChip,
                        isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 },
                        isActive && styles.filterChipActive,
                        isDark && isActive && { backgroundColor: TP.green, borderColor: TP.green },
                      ]}
                      onPress={() => setFilter(item.key)}
                    >
                      <Feather name={item.icon} size={13} color={isActive ? '#fff' : (isDark ? themeColors.muted : TP.text)} />
                      <Text style={[
                        styles.filterChipText,
                        isActive && styles.filterChipTextActive,
                        isDark && !isActive && { color: themeColors.muted },
                      ]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={<Text style={[styles.empty, isDark && { color: themeColors.muted }]}>{text.empty}</Text>}
        contentContainerStyle={styles.list}
      />

      {/* Repayment modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: themeColors.overlay }]}>
          <View style={[styles.modalCard, isDark && { backgroundColor: themeColors.headerBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.modalHandle, isDark && { backgroundColor: '#243041' }]} />
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalTitleIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}>
                  <Feather name="credit-card" size={18} color={isDark ? themeColors.accentText : TP.green} />
                </View>
                <Text style={[styles.modalTitle, isDark && { color: themeColors.text }]}>{text.modalTitle}</Text>
              </View>
              <Text style={[styles.modalSubtitle, isDark && { color: themeColors.muted }]}>{text.modalSubtitle}</Text>

              {selectedDette ? (
                <View style={[styles.summaryCard, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
                  <View style={styles.summaryRow}>
                    <Feather name="user" size={14} color={isDark ? themeColors.accentText : TP.green} />
                    <Text style={[styles.summaryLine, isDark && { color: themeColors.muted }]}>
                      {text.client} : <Text style={[styles.summaryStrong, isDark && { color: themeColors.text }]}>{selectedDette.client?.prenom} {selectedDette.client?.nom}</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Feather name="shopping-bag" size={14} color={isDark ? themeColors.accentText : TP.green} />
                    <Text style={[styles.summaryLine, isDark && { color: themeColors.muted }]}>
                      {text.sale} : <Text style={[styles.summaryStrong, isDark && { color: themeColors.text }]}>{selectedDette.vente?.numero || '—'}</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Feather name="check-circle" size={14} color={TP.green} />
                    <Text style={[styles.summaryLine, isDark && { color: themeColors.muted }]}>
                      {text.alreadyPaid} : <Text style={[styles.summaryStrong, isDark && { color: themeColors.text }]}>{formatCFA(selectedDette.montantPaye, locale)}</Text>
                    </Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Feather name="alert-circle" size={14} color={TP.danger} />
                    <Text style={[styles.summaryLine, isDark && { color: themeColors.muted }]}>
                      {text.leftToPay} : <Text style={[styles.summaryStrong, { color: TP.danger }]}>{formatCFA(selectedDette.montantRestant, locale)}</Text>
                    </Text>
                  </View>
                </View>
              ) : null}

              {selectedDette?.remboursements?.length ? (
                <View style={[styles.historyBox, isDark && { backgroundColor: themeColors.warningBg, borderColor: themeColors.warningBorder }]}>
                  <Text style={[styles.historyTitle, isDark && { color: '#fde68a' }]}>{text.paymentHistory}</Text>
                  {selectedDette.remboursements.map((item, index) => (
                    <View key={`${item.createdAt}-${index}`} style={styles.historyRow}>
                      <Text style={[styles.historyDate, isDark && { color: '#fcd34d' }]}>{new Date(item.createdAt).toLocaleDateString(locale)}</Text>
                      <Text style={styles.historyAmount}>+{formatCFA(item.montant, locale)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.amountLabel}</Text>
              <TextInput
                value={montantRemb}
                onChangeText={setMontantRemb}
                placeholder={selectedDette ? text.maxPlaceholder(selectedDette.montantRestant, locale) : text.amountPlaceholder}
                placeholderTextColor={placeholderTextColor}
                keyboardType="numeric"
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
              />

              <View style={styles.quickRow}>
                <TouchableOpacity
                  style={[styles.quickBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                  onPress={() => selectedDette && setMontantRemb(Math.round(selectedDette.montantRestant / 2).toString())}
                >
                  <Feather name="divide-circle" size={14} color={isDark ? themeColors.accentText : TP.green} />
                  <Text style={[styles.quickBtnText, isDark && { color: themeColors.accentText }]}>50%</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                  onPress={() => selectedDette && setMontantRemb(selectedDette.montantRestant.toString())}
                >
                  <Feather name="check-square" size={14} color={isDark ? themeColors.accentText : TP.green} />
                  <Text style={[styles.quickBtnText, isDark && { color: themeColors.accentText }]}>{text.payAll}</Text>
                </TouchableOpacity>
              </View>

              {selectedDette && montantRemb ? (
                <Text style={[styles.helperText, isDark && { color: '#86efac' }]}>
                  {parseFloat(montantRemb || '0') >= selectedDette.montantRestant
                    ? text.fullyPaidHint
                    : text.remainingAfterPayment(selectedDette.montantRestant - parseFloat(montantRemb || '0'), locale)}
                </Text>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                  onPress={() => setShowModal(false)}
                >
                  <Feather name="x" size={14} color={isDark ? themeColors.accentText : TP.muted} />
                  <Text style={[styles.secondaryBtnText, isDark && { color: themeColors.accentText }]}>{text.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryActionBtn} onPress={handlePayment} disabled={submitting}>
                  <Feather name="check-circle" size={16} color="#fff" />
                  <Text style={styles.primaryActionBtnText}>{submitting ? text.confirming : text.confirmPayment}</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TP.screenBg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TP.screenBg },

  // Header
  header: {
    backgroundColor: TP.headerBg,
    paddingTop: 52,
    paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 10,
  },
  headerBadgeText: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '900', color: '#fff' },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4, marginBottom: 16 },

  // Summary hero card inside header
  summaryHero: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  summaryHeroLabel: { fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: '600' },
  summaryHeroAmount: { fontSize: 24, fontWeight: '900', color: '#FC8181', marginTop: 2 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: 14, zIndex: 2 },

  // Toolbar
  toolbar: { paddingHorizontal: 14, marginTop: 12 },
  searchWrap: {
    backgroundColor: TP.cardBg,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: { flex: 1, paddingVertical: 12, color: TP.text },

  // Filter tabs
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 },
  filterChip: {
    backgroundColor: TP.cardBg,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  filterChipActive: { backgroundColor: TP.green, borderColor: TP.green },
  filterChipText: { color: TP.text, fontSize: 12, fontWeight: '700' },
  filterChipTextActive: { color: '#fff' },

  // List
  list: { paddingBottom: 28 },
  item: {
    backgroundColor: TP.cardBg,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 14,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start' },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1.5,
  },
  avatarText: { fontWeight: '900', fontSize: 16 },
  itemMain: { flex: 1 },
  itemName: { fontSize: 17, fontWeight: '900', color: TP.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  itemMeta: { fontSize: 13, color: TP.muted, flexShrink: 1 },

  // Badges
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  badgeGreen: { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
  badgeGold: { backgroundColor: TP.goldLight, borderColor: TP.goldBorder },
  badgeTerracotta: { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextGreen: { color: TP.green },
  badgeTextGold: { color: '#B45309' },
  badgeTextTerracotta: { color: TP.green },

  // Helper notice
  helperNotice: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F6F3',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helperNoticeText: { flex: 1, color: TP.muted, fontSize: 12, lineHeight: 18 },

  // Amount boxes
  amountsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  amountBox: {
    flexGrow: 1,
    flexBasis: '31%',
    backgroundColor: '#F8F6F3',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ECECEC',
  },
  amountLabel: { fontSize: 12, color: TP.muted },
  amountValue: { fontSize: 14, fontWeight: '800', color: TP.text, marginTop: 3 },
  amountPaid: { color: TP.green },
  amountRest: { color: TP.danger },

  // Pay button
  payBtn: {
    marginTop: 12,
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
    backgroundColor: TP.greenLight,
    borderColor: TP.greenBorder,
  },
  payBtnText: { color: TP.green, fontWeight: '800' },

  empty: { textAlign: 'center', color: TP.muted, marginTop: 40, fontSize: 15 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: TP.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: TP.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: '85%',
  },
  modalHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitleIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: TP.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: TP.text },
  modalSubtitle: { fontSize: 13, color: TP.muted, marginTop: 4, marginBottom: 14 },

  summaryCard: {
    backgroundColor: '#F8F6F3',
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  summaryLine: { fontSize: 13, color: TP.muted },
  summaryStrong: { fontWeight: '800', color: TP.text },

  historyBox: {
    backgroundColor: TP.goldLight,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TP.goldBorder,
  },
  historyTitle: { fontSize: 13, fontWeight: '800', color: '#92400E', marginBottom: 10 },
  historyRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  historyDate: { fontSize: 12, color: '#78350F' },
  historyAmount: { fontSize: 12, fontWeight: '800', color: TP.green },

  fieldLabel: { fontSize: 13, fontWeight: '700', color: TP.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    color: TP.text,
  },

  quickRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  quickBtn: {
    flex: 1,
    backgroundColor: TP.greenLight,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: TP.greenBorder,
  },
  quickBtnText: { color: TP.green, fontWeight: '700' },

  helperText: { fontSize: 13, color: TP.green, marginTop: 12, fontWeight: '700' },

  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18, gap: 10 },
  secondaryBtn: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryBtnText: { color: TP.muted, fontWeight: '700' },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: TP.green,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: TP.green,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryActionBtnText: { color: '#fff', fontWeight: '800' },
});
