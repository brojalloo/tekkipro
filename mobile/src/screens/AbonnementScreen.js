import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
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
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import {
  annulerAbonnement,
  createStripeSession,
  getAbonnement,
  initiateFreeMoneyPayment,
  renouvelerAbonnement,
  souscrireAbonnement,
} from '../lib/api';
import { createApiErrorFromPayload, getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage } from '@tekkipro/shared/apiSuccess';

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

const MODE_ICONS = {
  WAVE: 'smartphone',
  ORANGE_MONEY: 'smartphone',
  FREE_MONEY: 'smartphone',
  STRIPE: 'credit-card',
  VIREMENT: 'repeat',
  CASH: 'dollar-sign',
};

const AVAILABLE_SUBSCRIPTION_PAYMENT_MODES = ['STRIPE', 'VIREMENT', 'CASH'];
const PHONE_REQUIRED_PAYMENT_MODES = [];
const DEFAULT_PAYMENT_MODE = AVAILABLE_SUBSCRIPTION_PAYMENT_MODES[0];

const DARK_THEME = {
  background:    '#071C08',
  headerBg:      '#0D2710',
  cardBg:        '#0F2212',
  cardBorder:    'rgba(255,214,0,0.10)',
  surfaceBg:     'rgba(27,94,32,0.12)',
  surfaceBorder: 'rgba(27,94,32,0.25)',
  accentBg:      'rgba(255,214,0,0.15)',
  accentText:    '#FFD600',
  text:          '#F5F0E8',
  muted:         '#9CA3AF',
  faint:         '#6B7280',
  warningBg:     '#2a1f0f',
  warningBorder: '#92400e',
  overlay:       'rgba(7,28,8,0.80)',
};

const formatCFA = (value, locale) => `${Number(value || 0).toLocaleString(locale)} FCFA`;
const formatDate = (value, locale) => new Date(value).toLocaleDateString(locale, { day: '2-digit', month: 'long', year: 'numeric' });
const daysLeft = (dateFin) => Math.max(0, Math.ceil((new Date(dateFin) - new Date()) / (1000 * 60 * 60 * 24)));
const usagePercent = (current, limit) => (limit && limit !== 999999 ? Math.min(100, Math.round((current / limit) * 100)) : 0);

const SUBSCRIPTION_TEXT = {
  fr: {
    error: 'Erreur', modeLabels: { WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', FREE_MONEY: 'Free Money', STRIPE: 'Carte bancaire', VIREMENT: 'Virement', CASH: 'Espèces' },
    planMeta: {
      GRATUIT: { icon: 'zap', accent: '#6B7280', soft: '#F3F4F6', subtitle: 'Pour démarrer simplement', features: ['1 utilisateur', '50 produits max', '100 ventes / mois'] },
      PRO: { icon: 'star', accent: TP.green, soft: TP.greenLight, subtitle: 'Pour une boutique en croissance', features: ["Jusqu'à 5 utilisateurs", 'Produits illimités', 'PDF + statistiques'] },
      BUSINESS: { icon: 'shield', accent: TP.gold, soft: TP.goldLight, subtitle: 'Pour les structures avancées', features: ['Utilisateurs illimités', 'Multi-boutiques', 'Pilotage consolidé'] },
    },
    loadError: "Impossible de charger l'abonnement.", loadUnavailable: 'Abonnement indisponible', retry: 'Réessayer', paymentStarted: 'Paiement lancé', paymentOpenFallback: 'Paiement', choosePaymentMode: 'Choisis un mode de paiement.', validation: 'Validation', stripeUnavailable: 'URL Stripe indisponible.',
    stripeOpened: "La page de paiement Stripe a été ouverte. Reviens ensuite dans l'app pour actualiser.", waveOpened: 'La page Wave a été ouverte.', waveInitiated: 'Paiement Wave initié.', orangeInitiated: 'Paiement Orange Money initié.', freeInitiated: 'Paiement Free Money initié.', subscriptionDone: 'Abonnement souscrit.', renewed: 'Abonnement renouvelé.', operationError: 'Impossible de traiter cette opération.',
    cancelPlanTitle: "Annuler l'abonnement ?", cancelPlanMessage: 'Votre boutique reviendra au plan Gratuit.', back: 'Retour', cancelPlanAction: 'Annuler le plan', success: 'Succès', cancelled: 'Abonnement annulé.', cancelError: "Impossible d'annuler cet abonnement.",
    heroBadge: "Gestion d'abonnement", heroTitle: 'Votre plan actuel', heroText: "Gérez votre offre TekkiPro et suivez l'utilisation de votre boutique.", daysRemaining: (days) => `${days} j restants`, noExpiry: 'Sans expiration',
    currentPlan: 'Plan actuel', expiresOn: (date, days) => `Expire le ${date} • ${days} jour(s) restant(s)`, freeForever: 'Plan gratuit sans limite de durée', renew: 'Renouveler', cancel: 'Annuler',
    users: 'Utilisateurs', products: 'Produits', clients: 'Clients', salesPerMonth: 'Ventes / mois', unlimited: 'Illimité', usedPercent: (percent) => `${percent}% utilisé`,
    plansAvailable: 'Plans disponibles', chooseOffer: "Choisissez l'offre adaptée à votre activité.", starter: 'Starter', pro: 'Pro', business: 'Business', free: 'Gratuit', perMonth: (price, locale) => `${formatCFA(price, locale)} / mois`, currentPlanBadge: 'Votre plan actuel', upgradeTo: (name) => `Passer à ${name}`, changeTo: (name) => `Changer vers ${name}`,
    paymentHistory: 'Historique des paiements', recentPeriods: "Retrouvez vos périodes d'abonnement récentes.", status: (value) => `Statut : ${value}`, noPayments: "Aucun paiement enregistré pour le moment.",
    upgradePlan: (plan) => `Passer au plan ${plan}`, renewSubscription: "Renouveler l'abonnement", modalSubtitle: 'Choisissez un mode de paiement puis confirmez.', phone: 'Téléphone', referenceOptional: 'Référence (optionnel)', transactionNumber: 'N° transaction', processing: 'Traitement…', confirm: 'Confirmer', paymentModeUnavailable: "Ce mode de paiement n'est pas disponible sur mobile pour le moment.",
  },
  en: {
    error: 'Error', modeLabels: { WAVE: 'Wave', ORANGE_MONEY: 'Orange Money', FREE_MONEY: 'Free Money', STRIPE: 'Bank card', VIREMENT: 'Bank transfer', CASH: 'Cash' },
    planMeta: {
      GRATUIT: { icon: 'zap', accent: '#6B7280', soft: '#F3F4F6', subtitle: 'To get started simply', features: ['1 user', '50 products max', '100 sales / month'] },
      PRO: { icon: 'star', accent: TP.green, soft: TP.greenLight, subtitle: 'For a growing store', features: ['Up to 5 users', 'Unlimited products', 'PDF + analytics'] },
      BUSINESS: { icon: 'shield', accent: TP.gold, soft: TP.goldLight, subtitle: 'For advanced businesses', features: ['Unlimited users', 'Multi-store', 'Consolidated management'] },
    },
    loadError: 'Unable to load the subscription.', loadUnavailable: 'Subscription unavailable', retry: 'Retry', paymentStarted: 'Payment started', paymentOpenFallback: 'Payment', choosePaymentMode: 'Choose a payment method.', validation: 'Validation', stripeUnavailable: 'Stripe URL unavailable.',
    stripeOpened: 'Stripe payment page was opened. Come back to the app afterward to refresh.', waveOpened: 'Wave page was opened.', waveInitiated: 'Wave payment initiated.', orangeInitiated: 'Orange Money payment initiated.', freeInitiated: 'Free Money payment initiated.', subscriptionDone: 'Subscription created.', renewed: 'Subscription renewed.', operationError: 'Unable to process this operation.',
    cancelPlanTitle: 'Cancel subscription?', cancelPlanMessage: 'Your store will return to the Free plan.', back: 'Back', cancelPlanAction: 'Cancel plan', success: 'Success', cancelled: 'Subscription cancelled.', cancelError: 'Unable to cancel this subscription.',
    heroBadge: 'Subscription management', heroTitle: 'Your current plan', heroText: 'Manage your TekkiPro offer and track your store usage.', daysRemaining: (days) => `${days} days left`, noExpiry: 'No expiration',
    currentPlan: 'Current plan', expiresOn: (date, days) => `Expires on ${date} • ${days} day(s) left`, freeForever: 'Free plan with no time limit', renew: 'Renew', cancel: 'Cancel',
    users: 'Users', products: 'Products', clients: 'Clients', salesPerMonth: 'Sales / month', unlimited: 'Unlimited', usedPercent: (percent) => `${percent}% used`,
    plansAvailable: 'Available plans', chooseOffer: 'Choose the offer that fits your business.', starter: 'Starter', pro: 'Pro', business: 'Business', free: 'Free', perMonth: (price, locale) => `${formatCFA(price, locale)} / month`, currentPlanBadge: 'Your current plan', upgradeTo: (name) => `Upgrade to ${name}`, changeTo: (name) => `Switch to ${name}`,
    paymentHistory: 'Payment history', recentPeriods: 'Review your recent subscription periods.', status: (value) => `Status: ${value}`, noPayments: 'No payment recorded yet.',
    upgradePlan: (plan) => `Upgrade to ${plan} plan`, renewSubscription: 'Renew subscription', modalSubtitle: 'Choose a payment method then confirm.', phone: 'Phone', referenceOptional: 'Reference (optional)', transactionNumber: 'Transaction no.', processing: 'Processing…', confirm: 'Confirm', paymentModeUnavailable: 'This payment method is not available on mobile right now.',
  },
};

function UsageCard({ label, current, limit, color, icon, text, isDark, themeColors }) {
  const percent = usagePercent(current, limit);

  return (
    <View style={[styles.usageCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
      <View style={styles.usageTop}>
        <View style={styles.usageHeaderMain}>
          <View style={[styles.usageIconWrap, { backgroundColor: `${color}18` }]}>
            <Feather name={icon} size={15} color={color} />
          </View>
          <Text style={[styles.usageLabel, isDark && { color: themeColors.muted }]}>{label}</Text>
        </View>
        <Text style={[styles.usageValue, isDark && { color: themeColors.text }]}>{current} / {limit === 999999 ? '∞' : limit}</Text>
      </View>
      <View style={[styles.usageTrack, isDark && { backgroundColor: '#2A1F15' }]}>
        <View style={[styles.usageFill, { width: `${Math.max(percent, limit === 999999 ? 8 : 0)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.usagePercent, isDark && { color: themeColors.muted }]}>{limit === 999999 ? text.unlimited : text.usedPercent(percent)}</Text>
    </View>
  );
}

export default function AbonnementScreen() {
  const { activeBoutique, refreshBoutique, user } = useAuth();
  const { language, locale } = useI18n();
  const { isDark } = useTheme();
  const themeColors = isDark ? DARK_THEME : null;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [paiement, setPaiement] = useState({ modePaiement: DEFAULT_PAYMENT_MODE, reference: '', telephone: '' });
  const text = SUBSCRIPTION_TEXT[language] || SUBSCRIPTION_TEXT.fr;
  const placeholderTextColor = isDark ? themeColors.faint : '#94a3b8';
  const modeLabels = text.modeLabels;
  const planMeta = text.planMeta;
  const availablePaymentModes = useMemo(
    () => AVAILABLE_SUBSCRIPTION_PAYMENT_MODES.map((key) => ({ key, label: modeLabels[key] || key })),
    [modeLabels]
  );

  const resetPaiement = useCallback(() => {
    setPaiement({ modePaiement: DEFAULT_PAYMENT_MODE, reference: '', telephone: '' });
  }, []);

  const loadAbonnement = useCallback(async ({ isRefresh = false, showAlert = true } = {}) => {
    if (isRefresh) {
      setRefreshing(true);
    } else if (data) {
      setLoading(true);
    }

    if (errorMessage) {
      setErrorMessage('');
    }

    try {
      let lastError = null;

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const { data: response } = await getAbonnement();

          if (!response?.success || !response?.data) {
            throw createApiErrorFromPayload(response);
          }

          setData(response.data);
          await refreshBoutique();
          setErrorMessage('');
          return true;
        } catch (error) {
          lastError = error;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 600));
          }
        }
      }

      const message = getApiErrorMessage(lastError, { language, fallback: text.loadError });
      setErrorMessage(message);
      if (showAlert) {
        Alert.alert(text.error, message);
      }
      return false;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [data, errorMessage, language, refreshBoutique, text.error, text.loadError]);

  useEffect(() => {
    loadAbonnement({ showAlert: false });
  }, [activeBoutique, loadAbonnement]);

  useEffect(() => {
    if (!showModal) return;
    if (!AVAILABLE_SUBSCRIPTION_PAYMENT_MODES.includes(paiement.modePaiement)) {
      resetPaiement();
    }
  }, [paiement.modePaiement, resetPaiement, showModal]);

  const planCards = useMemo(() => {
    if (!data?.plans) return [];
    return ['GRATUIT', 'PRO', 'BUSINESS'].map((key) => ({
      key,
      price: data.plans[key]?.prix || 0,
      ...planMeta[key],
    }));
  }, [data, planMeta]);

  const openModal = (plan = null) => {
    setSelectedPlan(plan);
    resetPaiement();
    setShowModal(true);
  };

  const openExternal = async (url, successMessage) => {
    try {
      await Linking.openURL(url);
      Alert.alert(text.paymentStarted, successMessage);
    } catch {
      Alert.alert(text.paymentOpenFallback, url);
    }
  };

  const handleSubmit = async () => {
    if (!paiement.modePaiement) {
      Alert.alert(text.validation, text.choosePaymentMode);
      return;
    }

    if (!AVAILABLE_SUBSCRIPTION_PAYMENT_MODES.includes(paiement.modePaiement)) {
      Alert.alert(text.validation, text.paymentModeUnavailable);
      return;
    }

    setSubmitting(true);
    try {
      if (selectedPlan) {
        if (paiement.modePaiement === 'STRIPE') {
          const { data: response } = await createStripeSession({ plan: selectedPlan, type: 'souscrire' });
          const url = response.data?.url;
          if (url) {
            setShowModal(false);
            await openExternal(url, text.stripeOpened);
          } else {
            Alert.alert(text.error, text.stripeUnavailable);
          }
        } else if (paiement.modePaiement === 'FREE_MONEY') {
          const { data: response } = await initiateFreeMoneyPayment({ plan: selectedPlan, type: 'souscrire', telephone: paiement.telephone });
          setShowModal(false);
          Alert.alert(text.success, getApiSuccessMessage(response, { language, fallback: text.freeInitiated }));
        } else {
          const { data: response } = await souscrireAbonnement({ plan: selectedPlan, ...paiement });
          setShowModal(false);
          Alert.alert(text.success, getApiSuccessMessage(response, { language, fallback: text.subscriptionDone }));
        }
      } else {
        const plan = data?.abonnementActif?.plan || data?.plan;

        if (paiement.modePaiement === 'STRIPE') {
          const { data: response } = await createStripeSession({ plan, type: 'renouveler' });
          const url = response.data?.url;
          if (url) {
            setShowModal(false);
            await openExternal(url, text.stripeOpened);
          } else {
            Alert.alert(text.error, text.stripeUnavailable);
          }
        } else if (paiement.modePaiement === 'FREE_MONEY') {
          const { data: response } = await initiateFreeMoneyPayment({ plan, type: 'renouveler', telephone: paiement.telephone });
          setShowModal(false);
          Alert.alert(text.success, getApiSuccessMessage(response, { language, fallback: text.freeInitiated }));
        } else {
          const { data: response } = await renouvelerAbonnement(paiement);
          setShowModal(false);
          Alert.alert(text.success, getApiSuccessMessage(response, { language, fallback: text.renewed }));
        }
      }

      await loadAbonnement();
    } catch (error) {
      Alert.alert(text.error, getApiErrorMessage(error, { language, fallback: text.operationError }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    Alert.alert(text.cancelPlanTitle, text.cancelPlanMessage, [
      { text: text.back, style: 'cancel' },
      {
        text: text.cancelPlanAction,
        style: 'destructive',
        onPress: async () => {
          try {
            await annulerAbonnement();
            await loadAbonnement();
            Alert.alert(text.success, text.cancelled);
          } catch (error) {
            Alert.alert(text.error, getApiErrorMessage(error, { language, fallback: text.cancelError }));
          }
        },
      },
    ]);
  };

  if (loading && !data) {
    return (
      <View testID="abonnement-loader" style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={TP.green} />
      </View>
    );
  }

  if (!data) {
    return (
      <View style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}>
        <View style={[styles.errorStateCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: 'rgba(220,38,38,0.25)' }]}>
          <Feather name="alert-circle" size={22} color="#dc2626" />
          <Text style={[styles.errorStateTitle, isDark && { color: themeColors.text }]}>{text.loadUnavailable}</Text>
          <Text style={[styles.errorStateText, isDark && { color: themeColors.muted }]}>{errorMessage || text.loadError}</Text>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={() => loadAbonnement()}>
            <Feather name="refresh-cw" size={16} color="#fff" />
            <Text style={styles.primaryActionText}>{text.retry}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const daysRemaining = data.abonnementActif ? daysLeft(data.abonnementActif.dateFin) : 0;

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      {/* ── Dark Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.heroBadgeRow}>
          <Feather name="credit-card" size={14} color="rgba(255,214,0,0.8)" />
          <Text style={styles.heroBadge}>{text.heroBadge}</Text>
        </View>
        <Text style={styles.heroTitle}>{text.heroTitle}</Text>
        <Text style={styles.heroText}>{text.heroText}</Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaChip}>
            <Feather name={planMeta[data.plan]?.icon || 'star'} size={13} color="#fff" />
            <Text style={styles.heroMetaText}>{data.planNom}</Text>
          </View>
          <View style={styles.heroMetaChip}>
            <Feather name="clock" size={13} color="#fff" />
            <Text style={styles.heroMetaText}>{data.abonnementActif ? text.daysRemaining(daysRemaining) : text.noExpiry}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadAbonnement({ isRefresh: true, showAlert: false })}
            tintColor={isDark ? TP.gold : TP.green}
            colors={[TP.green]}
            progressBackgroundColor={isDark ? DARK_THEME.headerBg : undefined}
          />
        }
        contentContainerStyle={styles.content}
      >
        {errorMessage ? (
          <View style={[styles.errorBanner, isDark && { backgroundColor: 'rgba(127,29,29,0.22)', borderColor: 'rgba(220,38,38,0.25)' }]}>
            <Feather name="alert-circle" size={15} color="#dc2626" />
            <Text style={[styles.errorBannerText, isDark && { color: '#fecaca' }]}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* ── Current Plan Status Card ─────────────────────────────── */}
        <View style={[styles.statusCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
          <View style={styles.statusTop}>
            <View>
              <Text style={[styles.statusLabel, isDark && { color: themeColors.muted }]}>{text.currentPlan}</Text>
              <View style={styles.statusPlanRow}>
                <View style={[styles.planIconBadge, { backgroundColor: planMeta[data.plan]?.soft || '#F3F4F6' }]}>
                  <Feather name={planMeta[data.plan]?.icon || 'star'} size={18} color={planMeta[data.plan]?.accent || TP.text} />
                </View>
                <Text style={[styles.statusPlan, isDark && { color: themeColors.text }]}>{data.planNom}</Text>
              </View>
              {data.abonnementActif ? (
                <Text style={[styles.statusMeta, isDark && { color: themeColors.muted }]}>{text.expiresOn(formatDate(data.abonnementActif.dateFin, locale), daysRemaining)}</Text>
              ) : (
                <Text style={[styles.statusMeta, isDark && { color: themeColors.muted }]}>{text.freeForever}</Text>
              )}
            </View>

            {data.plan !== 'GRATUIT' ? (
              <View style={styles.statusActions}>
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                  onPress={() => openModal(null)}
                >
                  <Feather name="refresh-cw" size={16} color={isDark ? TP.gold : TP.green} />
                  <Text style={[styles.secondaryActionText, isDark && { color: TP.gold }]}>{text.renew}</Text>
                </TouchableOpacity>
                {user?.role === 'ADMIN' ? (
                  <TouchableOpacity
                    style={[styles.dangerActionBtn, isDark && { backgroundColor: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.2)' }]}
                    onPress={handleCancel}
                  >
                    <Feather name="x-circle" size={16} color="#dc2626" />
                    <Text style={styles.dangerActionText}>{text.cancel}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}
          </View>

          <View style={styles.usageGrid}>
            <UsageCard label={text.users} current={data.utilisation.utilisateurs.actuel} limit={data.utilisation.utilisateurs.limite} color={TP.green} icon="users" text={text} isDark={isDark} themeColors={themeColors} />
            <UsageCard label={text.products} current={data.utilisation.produits.actuel} limit={data.utilisation.produits.limite} color={TP.gold} icon="package" text={text} isDark={isDark} themeColors={themeColors} />
            {data.utilisation.clients ? <UsageCard label={text.clients} current={data.utilisation.clients.actuel} limit={data.utilisation.clients.limite} color={TP.green} icon="user-check" text={text} isDark={isDark} themeColors={themeColors} /> : null}
            {data.utilisation.ventesParMois ? <UsageCard label={text.salesPerMonth} current={data.utilisation.ventesParMois.actuel} limit={data.utilisation.ventesParMois.limite} color={TP.green} icon="shopping-cart" text={text} isDark={isDark} themeColors={themeColors} /> : null}
          </View>
        </View>

        {/* ── Plan Cards ───────────────────────────────────────────── */}
        <View style={[styles.sectionCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionTitleIconWrap, isDark && { backgroundColor: themeColors.accentBg, borderColor: themeColors.surfaceBorder, borderWidth: 1 }]}>
              <Feather name="layers" size={16} color={isDark ? TP.gold : TP.green} />
            </View>
            <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>{text.plansAvailable}</Text>
          </View>
          <Text style={[styles.sectionSubtitle, isDark && { color: themeColors.muted }]}>{text.chooseOffer}</Text>

          {planCards.map((plan) => {
            const isCurrent = data.plan === plan.key;
            const isPro = plan.key === 'PRO';
            const isBusiness = plan.key === 'BUSINESS';
            return (
              <View
                key={plan.key}
                style={[
                  styles.planCard,
                  isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder },
                  isPro && styles.planCardPro,
                  isBusiness && styles.planCardBusiness,
                  isCurrent && styles.planCardCurrent,
                  isDark && isCurrent && { backgroundColor: DARK_THEME.surfaceBg, borderColor: TP.green },
                ]}
              >
                {isPro && !isCurrent ? (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>RECOMMANDÉ</Text>
                  </View>
                ) : null}

                <View style={styles.planHeader}>
                  <View style={styles.planHeaderMain}>
                    <View style={[styles.planIconBadge, { backgroundColor: plan.soft }]}>
                      <Feather name={plan.icon} size={18} color={plan.accent} />
                    </View>
                    <View>
                      <Text style={[styles.planName, isDark && { color: themeColors.text }]}>
                        {plan.key === 'GRATUIT' ? text.starter : plan.key === 'PRO' ? text.pro : text.business}
                      </Text>
                      <Text style={[styles.planSubtitle, isDark && { color: themeColors.muted }]}>{plan.subtitle}</Text>
                    </View>
                  </View>
                  <Text style={[styles.planPrice, { color: plan.accent }]}>
                    {plan.key === 'GRATUIT' ? text.free : text.perMonth(plan.price, locale)}
                  </Text>
                </View>

                {plan.features.map((feature) => (
                  <View key={feature} style={styles.planFeatureRow}>
                    <Feather name="check" size={14} color={plan.accent} />
                    <Text style={[styles.planFeature, isDark && { color: themeColors.muted }]}>{feature}</Text>
                  </View>
                ))}

                {isCurrent ? (
                  <View style={[styles.currentBadge, { backgroundColor: `${plan.accent}18`, borderColor: `${plan.accent}30` }]}>
                    <Feather name="check-circle" size={14} color={plan.accent} />
                    <Text style={[styles.currentBadgeText, { color: plan.accent }]}>{text.currentPlanBadge}</Text>
                  </View>
                ) : user?.role === 'ADMIN' && plan.key !== 'GRATUIT' ? (
                  <TouchableOpacity
                    style={[styles.primaryActionBtn, { backgroundColor: plan.accent, shadowColor: plan.accent }]}
                    onPress={() => openModal(plan.key)}
                  >
                    <Feather name="arrow-up-right" size={16} color="#fff" />
                    <Text style={styles.primaryActionText}>
                      {data.plan === 'GRATUIT'
                        ? text.upgradeTo(plan.key === 'PRO' ? text.pro : text.business)
                        : text.changeTo(plan.key === 'PRO' ? text.pro : text.business)}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            );
          })}
        </View>

        {/* ── Payment History ──────────────────────────────────────── */}
        <View style={[styles.sectionCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
          <View style={styles.sectionTitleRow}>
            <View style={[styles.sectionTitleIconWrap, isDark && { backgroundColor: themeColors.accentBg, borderColor: themeColors.surfaceBorder, borderWidth: 1 }]}>
              <Feather name="clock" size={16} color={isDark ? TP.gold : TP.green} />
            </View>
            <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>{text.paymentHistory}</Text>
          </View>
          <Text style={[styles.sectionSubtitle, isDark && { color: themeColors.muted }]}>{text.recentPeriods}</Text>

          {data.historique?.length ? data.historique.map((item) => (
            <View key={item.id} style={[styles.historyItem, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
              <View style={styles.historyTop}>
                <Text style={[styles.historyPlan, isDark && { color: themeColors.text }]}>{item.plan}</Text>
                <Text style={styles.historyAmount}>{formatCFA(item.montant, locale)}</Text>
              </View>
              <Text style={[styles.historyMeta, isDark && { color: themeColors.muted }]}>{formatDate(item.dateDebut, locale)} → {formatDate(item.dateFin, locale)}</Text>
              <Text style={[styles.historyMeta, isDark && { color: themeColors.muted }]}>{text.status(item.statut)}</Text>
              {item.paiements?.map((payment, index) => (
                <View key={`${payment.modePaiement}-${index}`} style={styles.historyPaymentRow}>
                  <Feather name={MODE_ICONS[payment.modePaiement] || 'credit-card'} size={14} color={TP.green} />
                  <Text style={[styles.historyPayment, isDark && { color: themeColors.muted }]}>
                    {modeLabels[payment.modePaiement] || payment.modePaiement}{payment.reference ? ` • #${payment.reference}` : ''}
                  </Text>
                </View>
              ))}
            </View>
          )) : <Text style={[styles.emptyText, isDark && { color: themeColors.muted }]}>{text.noPayments}</Text>}
        </View>
      </ScrollView>

      {/* ── Payment Modal ────────────────────────────────────────────── */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: themeColors.overlay }]}>
          <View style={[styles.modalCard, isDark && { backgroundColor: themeColors.headerBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.modalHandle, isDark && { backgroundColor: '#3A2A1A' }]} />
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalTitleIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}>
                  <Feather name="credit-card" size={18} color={isDark ? TP.gold : TP.green} />
                </View>
                <Text style={[styles.modalTitle, isDark && { color: themeColors.text }]}>
                  {selectedPlan ? text.upgradePlan(selectedPlan) : text.renewSubscription}
                </Text>
              </View>
              <Text style={[styles.modalSubtitle, isDark && { color: themeColors.muted }]}>{text.modalSubtitle}</Text>

              <View style={styles.modeGrid}>
                {availablePaymentModes.map(({ key, label }) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.modeBtn,
                      isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder },
                      paiement.modePaiement === key && styles.modeBtnActive,
                      isDark && paiement.modePaiement === key && { backgroundColor: TP.green, borderColor: TP.green },
                    ]}
                    onPress={() => setPaiement((prev) => ({ ...prev, modePaiement: key }))}
                  >
                    <Feather name={MODE_ICONS[key] || 'credit-card'} size={15} color={paiement.modePaiement === key ? '#fff' : (isDark ? themeColors.muted : TP.muted)} />
                    <Text style={[styles.modeBtnText, paiement.modePaiement === key && styles.modeBtnTextActive, isDark && paiement.modePaiement !== key && { color: themeColors.muted }]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {PHONE_REQUIRED_PAYMENT_MODES.includes(paiement.modePaiement) ? (
                <>
                  <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.phone}</Text>
                  <TextInput
                    value={paiement.telephone}
                    onChangeText={(telephone) => setPaiement((prev) => ({ ...prev, telephone }))}
                    placeholder="77 123 45 67"
                    placeholderTextColor={placeholderTextColor}
                    keyboardType="phone-pad"
                    style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                  />
                </>
              ) : null}

              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.referenceOptional}</Text>
              <TextInput
                value={paiement.reference}
                onChangeText={(reference) => setPaiement((prev) => ({ ...prev, reference }))}
                placeholder={text.transactionNumber}
                placeholderTextColor={placeholderTextColor}
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.secondaryActionBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                  onPress={() => setShowModal(false)}
                >
                  <Feather name="x" size={16} color={isDark ? TP.gold : TP.green} />
                  <Text style={[styles.secondaryActionText, isDark && { color: TP.gold }]}>{text.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.primaryActionBtn} onPress={handleSubmit} disabled={submitting}>
                  <Feather name="check-circle" size={16} color="#fff" />
                  <Text style={styles.primaryActionText}>{submitting ? text.processing : text.confirm}</Text>
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
  content: { paddingBottom: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ── Dark Header ────────────────────────────────────────────────────────
  header: { backgroundColor: TP.headerBg, padding: 22, paddingTop: 56, paddingBottom: 34, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  heroBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  heroBadge: { color: 'rgba(255,214,0,0.8)', fontSize: 12, fontWeight: '800' },
  heroTitle: { fontSize: 26, fontWeight: '900', color: '#fff' },
  heroText: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginTop: 8, lineHeight: 18 },
  heroMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  heroMetaChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 7 },
  heroMetaText: { color: '#fff', fontSize: 12, fontWeight: '800' },

  // ── Error States ───────────────────────────────────────────────────────
  errorStateCard: { width: '88%', backgroundColor: TP.cardBg, borderRadius: 22, padding: 22, alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#fecaca' },
  errorStateTitle: { fontSize: 18, fontWeight: '800', color: TP.text },
  errorStateText: { fontSize: 13, color: TP.muted, textAlign: 'center', lineHeight: 18 },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 14, marginTop: 14, backgroundColor: '#fef2f2', borderColor: '#fecaca', borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10 },
  errorBannerText: { flex: 1, color: '#991b1b', fontSize: 12, fontWeight: '700' },

  // ── Status Card ────────────────────────────────────────────────────────
  statusCard: { backgroundColor: TP.cardBg, marginHorizontal: 14, marginTop: -18, borderRadius: 22, padding: 16, shadowColor: TP.headerBg, shadowOpacity: 0.10, shadowRadius: 14, elevation: 4, borderWidth: 1, borderColor: '#EDE8E3' },
  statusTop: { marginBottom: 14 },
  statusLabel: { fontSize: 12, color: TP.muted, fontWeight: '700' },
  statusPlanRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  statusPlan: { fontSize: 24, fontWeight: '900', color: TP.text },
  statusMeta: { fontSize: 13, color: TP.muted, marginTop: 6 },
  statusActions: { flexDirection: 'row', marginTop: 12 },

  // ── Usage Cards ────────────────────────────────────────────────────────
  usageGrid: { marginTop: 6 },
  usageCard: { backgroundColor: TP.screenBg, borderRadius: 16, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#EDE8E3' },
  usageTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  usageHeaderMain: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  usageIconWrap: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  usageLabel: { fontSize: 13, fontWeight: '700', color: TP.text },
  usageValue: { fontSize: 13, fontWeight: '800', color: TP.text },
  usageTrack: { height: 8, borderRadius: 999, backgroundColor: '#EDE8E3', overflow: 'hidden' },
  usageFill: { height: '100%', borderRadius: 999 },
  usagePercent: { marginTop: 8, fontSize: 12, color: TP.muted, fontWeight: '700' },

  // ── Section Cards ──────────────────────────────────────────────────────
  sectionCard: { backgroundColor: TP.cardBg, marginHorizontal: 14, marginTop: 14, borderRadius: 22, padding: 16, shadowColor: TP.headerBg, shadowOpacity: 0.07, shadowRadius: 12, elevation: 3, borderWidth: 1, borderColor: '#EDE8E3' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionTitleIconWrap: { width: 34, height: 34, borderRadius: 11, backgroundColor: TP.greenLight, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: TP.text },
  sectionSubtitle: { fontSize: 13, color: TP.muted, marginTop: 4, marginBottom: 12 },

  // ── Plan Cards ─────────────────────────────────────────────────────────
  planCard: { borderWidth: 1, borderColor: '#EDE8E3', borderRadius: 18, padding: 16, marginBottom: 12, backgroundColor: TP.cardBg },
  planCardCurrent: { borderColor: TP.green, backgroundColor: TP.greenLight },
  planCardPro: { borderColor: `${TP.green}40`, shadowColor: TP.green, shadowOpacity: 0.10, shadowRadius: 12, elevation: 4, marginVertical: 4 },
  planCardBusiness: { borderColor: `${TP.gold}40` },
  recommendedBadge: { alignSelf: 'flex-start', backgroundColor: TP.green, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  recommendedBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  planHeader: { marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planHeaderMain: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1, paddingRight: 10 },
  planIconBadge: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  planName: { fontSize: 17, fontWeight: '800', color: TP.text },
  planSubtitle: { fontSize: 13, color: TP.muted, marginTop: 3 },
  planPrice: { fontSize: 14, fontWeight: '800', color: TP.green },
  planFeatureRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  planFeature: { fontSize: 13, color: '#4b5563' },
  currentBadge: { alignSelf: 'flex-start', borderRadius: 999, borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8, marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  currentBadgeText: { fontWeight: '800', fontSize: 12 },

  // ── Action Buttons ─────────────────────────────────────────────────────
  primaryActionBtn: { alignSelf: 'flex-start', backgroundColor: TP.green, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8, shadowColor: TP.green, shadowOpacity: 0.20, shadowRadius: 10, elevation: 3 },
  primaryActionText: { color: '#fff', fontWeight: '800' },
  secondaryActionBtn: { alignSelf: 'flex-start', backgroundColor: TP.greenLight, paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, marginRight: 8, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: `${TP.green}30` },
  secondaryActionText: { color: TP.green, fontWeight: '800' },
  dangerActionBtn: { alignSelf: 'flex-start', backgroundColor: '#fef2f2', paddingHorizontal: 14, paddingVertical: 11, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#fecaca' },
  dangerActionText: { color: '#dc2626', fontWeight: '800' },

  // ── History ────────────────────────────────────────────────────────────
  historyItem: { borderWidth: 1, borderColor: '#EDE8E3', backgroundColor: TP.screenBg, borderRadius: 16, padding: 14, marginTop: 12 },
  historyTop: { flexDirection: 'row', justifyContent: 'space-between' },
  historyPlan: { fontSize: 15, fontWeight: '800', color: TP.text },
  historyAmount: { fontSize: 15, fontWeight: '800', color: TP.green },
  historyMeta: { fontSize: 12, color: TP.muted, marginTop: 4 },
  historyPaymentRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  historyPayment: { fontSize: 12, color: TP.text, fontWeight: '700' },
  emptyText: { color: TP.muted, fontSize: 14 },

  // ── Modal ──────────────────────────────────────────────────────────────
  modalOverlay: { flex: 1, backgroundColor: TP.overlay, justifyContent: 'flex-end' },
  modalCard: { backgroundColor: TP.cardBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 18, maxHeight: '85%' },
  modalHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#EDE8E3', alignSelf: 'center', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalTitleIconWrap: { width: 36, height: 36, borderRadius: 12, backgroundColor: TP.greenLight, alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '800', color: TP.text },
  modalSubtitle: { fontSize: 13, color: TP.muted, marginTop: 4, marginBottom: 14 },
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 },
  modeBtn: { borderWidth: 1, borderColor: `${TP.green}30`, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginRight: 8, marginBottom: 8, backgroundColor: TP.cardBg, flexDirection: 'row', alignItems: 'center', gap: 6 },
  modeBtnActive: { backgroundColor: TP.green, borderColor: TP.green },
  modeBtnText: { color: TP.text, fontWeight: '700', fontSize: 12 },
  modeBtnTextActive: { color: '#fff' },
  fieldLabel: { fontSize: 13, fontWeight: '700', color: TP.text, marginTop: 10, marginBottom: 6 },
  input: { borderWidth: 1, borderColor: `${TP.green}30`, backgroundColor: TP.screenBg, borderRadius: 14, padding: 12, color: TP.text },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 18 },
});
