import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated, Dimensions, View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getDashboard, getInventaire, getTopProduits, getVentesParJour } from '../lib/api';
import ProTooltip from '../components/ProTooltip';

// ─── TekkiPro West African brand palette ──────────────────────────────────────
const TP = {
  bg:           '#F5F2ED',
  card:         '#FFFFFF',
  text:         '#1A1A18',
  muted:        '#6B7280',
  green:        '#1B5E20',   // Vert Baobab
  gold:         '#FFD600',   // Or du Sénégal
  accent:       '#D32F2F',   // Rouge Gorée
  border:       '#E8E2D9',
  white:        '#FFFFFF',
  // Derived helpers
  greenLight:   '#e8f5e9',
  goldLight:    '#FFFDE7',
  accentLight:  '#FFEBEE',
  headerBg:     '#071C08',   // Vert forêt profond
};

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
  edgeBg:        'rgba(7,28,8,0.97)',
  modalBg:       '#0F2212',
  modalOverlay:  'rgba(7,28,8,0.85)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatCFA = (value, locale) => `${(value || 0).toLocaleString(locale)} FCFA`;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const OVERVIEW_CARD_WIDTH = Math.round((SCREEN_WIDTH - 52) / 2);
const OVERVIEW_CARD_GAP = 12;
const OVERVIEW_PAGE_STEP = (OVERVIEW_CARD_WIDTH * 2) + (OVERVIEW_CARD_GAP * 2);
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const formatDateLabel = (value, locale) => {
  if (!value) return '';
  const normalized = String(value).trim().slice(0, 10);
  if (!/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.test(normalized)) return '';
  return new Date(`${normalized}T12:00:00.000Z`).toLocaleDateString(locale, {
    day: '2-digit', month: 'short', year: 'numeric',
  });
};

const getRemainingPeremptionDays = (datePeremption, providedValue) => {
  const numericValue = Number(providedValue);
  if (Number.isFinite(numericValue)) return numericValue;
  const normalized = String(datePeremption || '').trim().slice(0, 10);
  if (!/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/.test(normalized)) return null;
  const target = new Date(`${normalized}T12:00:00.000Z`);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  return Math.round((target.getTime() - today.getTime()) / DAY_IN_MS);
};

// Quick action definitions — West African palette cycling
const ACTION_ITEMS = [
  { labelKey: 'dashboard.actionScanner', route: 'Scanner', icon: 'camera',      accent: TP.gold,  bg: TP.goldLight  },
  { labelKey: 'dashboard.actionClients', route: 'Clients', icon: 'users',       accent: TP.green, bg: TP.greenLight },
  { labelKey: 'dashboard.actionDebts',   route: 'Dettes',  icon: 'credit-card', accent: TP.green, bg: TP.greenLight },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

// Inline compact usage meter for React Native
function UsageMeterCompact({ label, used, limit, palette }) {
  if (!limit || limit >= 999999) return null;
  const pct = Math.min(Math.round((used / limit) * 100), 100);
  const barColor = pct >= 90 ? '#D32F2F' : pct >= 70 ? '#F9A825' : '#1B5E20';
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: palette?.muted || '#6B7280' }}>{label}</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: palette?.text || '#071C08' }}>{used}/{limit}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: '#E8E2D9', borderRadius: 2, overflow: 'hidden' }}>
        <View style={{ height: 4, width: `${pct}%`, backgroundColor: barColor, borderRadius: 2 }} />
      </View>
    </View>
  );
}

function SectionTitle({ children, isDark, themeColors, style, dotColor }) {
  return (
    <View style={[styles.sectionTitleRow, style]}>
      {dotColor ? <View style={[styles.sectionDot, { backgroundColor: dotColor }]} /> : null}
      <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>
        {children}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const {
    user, logout, boutique, activeBoutique, mesBoutiques,
    switchBoutique, getActiveBoutiqueName, isBusiness, plan, planUsage,
  } = useAuth();
  const { t, locale } = useI18n();
  const { isDark } = useTheme();
  const themeColors = isDark ? DARK_THEME : null;

  const [stats, setStats] = useState(null);
  const [inventaire, setInventaire] = useState(null);
  const [topProduits, setTopProduits] = useState([]);
  const [ventesTrend, setVentesTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showBoutiqueModal, setShowBoutiqueModal] = useState(false);
  const [switchingBoutiqueId, setSwitchingBoutiqueId] = useState(null);

  const overviewScrollRef = useRef(null);
  const overviewPageRef = useRef(0);
  const overviewDirectionRef = useRef(1);
  const overviewPausedRef = useRef(false);
  const overviewResumeTimeoutRef = useRef(null);
  const overviewAnimatedX = useRef(new Animated.Value(0)).current;

  // Pulse animation for expiration alert
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.18, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [pulseAnim]);

  const loadStats = async () => {
    try {
      const [dashRes, inventaireRes, topRes, trendRes] = await Promise.all([
        getDashboard(),
        getInventaire(),
        getTopProduits({ periode: 'mois' }),
        getVentesParJour({ jours: 7 }),
      ]);
      if (dashRes.data.success) setStats(dashRes.data.data);
      if (inventaireRes.data.success) setInventaire(inventaireRes.data.data);
      if (topRes.data.success) setTopProduits(topRes.data.data || []);
      if (trendRes.data.success) setVentesTrend(trendRes.data.data || []);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => { loadStats(); }, [activeBoutique]);

  useEffect(() => {
    const listenerId = overviewAnimatedX.addListener(({ value }) => {
      overviewScrollRef.current?.scrollTo({ x: value, animated: false });
    });
    return () => { overviewAnimatedX.removeListener(listenerId); };
  }, [overviewAnimatedX]);

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  const trendTotal = ventesTrend.reduce((sum, item) => sum + (item.total || 0), 0);
  const trendCount = ventesTrend.reduce((sum, item) => sum + (item.nombre || item.nombreVentes || item.nombre_ventes || 0), 0);
  const currentBoutiqueName = getActiveBoutiqueName();
  const selectedBoutiqueId = activeBoutique || boutique?.id;
  const canSwitchBoutique = isBusiness && mesBoutiques.length > 1;
  const boutiquesForSwitch = mesBoutiques.length > 0 ? mesBoutiques : (boutique ? [boutique] : []);
  const isProPlan = plan === 'PRO' || plan === 'BUSINESS';

  const actionItems = useMemo(() => {
    const items = [...ACTION_ITEMS];
    if (user?.role === 'ADMIN') {
      items.splice(5, 0, {
        labelKey: 'dashboard.actionEmployees',
        route: 'Employes',
        icon: 'user-check',
        accent: TP.gold,
        bg: TP.goldLight,
        locked: !isProPlan,
      });
    }
    return items.map((item) => ({ ...item, label: t(item.labelKey) }));
  }, [isProPlan, t, user?.role]);

  const handleSwitchBoutique = async (boutiqueId) => {
    if (boutiqueId === selectedBoutiqueId) { setShowBoutiqueModal(false); return; }
    setSwitchingBoutiqueId(boutiqueId);
    setRefreshing(true);
    try {
      await switchBoutique(boutiqueId);
      await loadStats();
      setShowBoutiqueModal(false);
    } catch (_) {
      setRefreshing(false);
    } finally {
      setSwitchingBoutiqueId(null);
    }
  };

  // Stat cards — today sales, 7-day trend, monthly revenue
  const cards = [
    {
      label: t('dashboard.salesToday', { count: stats?.ventesJour?.nombre || 0 }),
      value: formatCFA(stats?.ventesJour?.total, locale),
      color: TP.green, icon: 'shopping-cart',
    },
    {
      label: t('dashboard.salesMonth', { count: stats?.ventesMois?.nombre || 0 }),
      value: formatCFA(stats?.ventesMois?.total, locale),
      color: TP.green, icon: 'bar-chart-2',
    },
    {
      label: t('dashboard.currentDebts', { count: stats?.dettes?.nombre || 0 }),
      value: formatCFA(stats?.dettes?.total, locale),
      color: TP.gold, icon: 'credit-card',
    },
    {
      label: t('dashboard.stockAlerts'),
      value: stats?.alertesStock ?? 0,
      color: '#D93A2B', icon: 'alert-triangle',
    },
    {
      label: t('dashboard.activeProducts'),
      value: stats?.totalProduits ?? 0,
      color: TP.green, icon: 'package',
    },
    {
      label: t('dashboard.customers'),
      value: stats?.totalClients ?? 0,
      color: TP.green, icon: 'users',
    },
  ];

  if (user?.role === 'ADMIN') {
    cards.splice(2, 0,
      { label: t('dashboard.profitToday'), value: formatCFA(stats?.beneficeJour, locale), color: TP.gold,  icon: 'trending-up' },
      { label: t('dashboard.profitMonth'), value: formatCFA(stats?.beneficeMois, locale), color: TP.green, icon: 'activity' },
    );
  }

  const peremptionOverview = useMemo(() => {
    const produits = Array.isArray(inventaire) ? inventaire : (inventaire?.produits || []);
    const expiredCount  = produits.filter((item) => item.estExpire).length;
    const expiringCount = produits.filter((item) => item.enAlertePeremption && !item.estExpire).length;
    const urgentItems = [...produits.filter((item) => item.datePeremption && (item.estExpire || item.enAlertePeremption))]
      .sort((a, b) => {
        if (a.estExpire !== b.estExpire) return a.estExpire ? -1 : 1;
        const dayDiff = getRemainingPeremptionDays(a.datePeremption, a.joursAvantPeremption)
          - getRemainingPeremptionDays(b.datePeremption, b.joursAvantPeremption);
        if (Number.isFinite(dayDiff) && dayDiff !== 0) return dayDiff;
        return String(a.nom || '').localeCompare(String(b.nom || ''), locale, { sensitivity: 'base' });
      });
    return { expiredCount, expiringCount, urgentCount: expiredCount + expiringCount, urgentItems: urgentItems.slice(0, 4) };
  }, [inventaire, locale]);

  const getPeremptionStatusLabel = (item) => {
    const daysRemaining = getRemainingPeremptionDays(item.datePeremption, item.joursAvantPeremption);
    if (daysRemaining === 0) return t('dashboard.expiresToday');
    if (item.estExpire) return t('dashboard.expiredDaysAgo', { count: Math.abs(daysRemaining || 0) });
    if (Number.isFinite(daysRemaining)) return t('dashboard.expiresInDays', { count: daysRemaining });
    return formatDateLabel(item.datePeremption, locale);
  };

  const overviewPageCount = Math.ceil(cards.length / 2);

  useEffect(() => {
    if (overviewResumeTimeoutRef.current) clearTimeout(overviewResumeTimeoutRef.current);
    if (overviewPageCount <= 1) return undefined;
    const interval = setInterval(() => {
      if (overviewPausedRef.current || !overviewScrollRef.current) return;
      let nextPage = overviewPageRef.current + overviewDirectionRef.current;
      if (nextPage >= overviewPageCount) { overviewDirectionRef.current = -1; nextPage = Math.max(overviewPageCount - 2, 0); }
      else if (nextPage < 0) { overviewDirectionRef.current = 1; nextPage = Math.min(1, overviewPageCount - 1); }
      overviewPageRef.current = nextPage;
      Animated.timing(overviewAnimatedX, { toValue: nextPage * OVERVIEW_PAGE_STEP, duration: 1400, useNativeDriver: false }).start();
    }, 3000);
    return () => {
      clearInterval(interval);
      if (overviewResumeTimeoutRef.current) clearTimeout(overviewResumeTimeoutRef.current);
    };
  }, [overviewAnimatedX, overviewPageCount]);

  const pauseOverviewAutoplay = () => {
    overviewPausedRef.current = true;
    overviewAnimatedX.stopAnimation();
    if (overviewResumeTimeoutRef.current) clearTimeout(overviewResumeTimeoutRef.current);
    overviewResumeTimeoutRef.current = setTimeout(() => { overviewPausedRef.current = false; }, 5000);
  };

  const handleOverviewMomentumEnd = (event) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const nextPage = Math.round(offsetX / OVERVIEW_PAGE_STEP);
    overviewAnimatedX.setValue(offsetX);
    overviewPageRef.current = Math.max(0, Math.min(nextPage, Math.max(overviewPageCount - 1, 0)));
  };

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return t('dashboard.greetingMorning');
    if (h < 18) return t('dashboard.greetingAfternoon');
    return t('dashboard.greetingEvening');
  }, [t]);

  if (loading) {
    return (
      <View style={[styles.centered, isDark && { backgroundColor: DARK_THEME.background }]}>
        <ActivityIndicator size="large" color={TP.green} />
      </View>
    );
  }

  const userInitial = (user?.prenom || user?.nom || '?')[0].toUpperCase();
  const firstName = user?.prenom || user?.nom || '';

  // Bar chart helpers
  const chartMax = ventesTrend.length > 0 ? Math.max(...ventesTrend.map((d) => d.total || 0), 1) : 1;
  const BAR_MAX_HEIGHT = 80;
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return (
    <ScrollView
      style={[styles.container, isDark && { backgroundColor: themeColors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={isDark ? themeColors.accentText : TP.gold}
          colors={[TP.green]}
          progressBackgroundColor={isDark ? themeColors.cardBg : undefined}
        />
      }
    >

      {/* ─── HEADER: Dark forest green card ─────────────────────────────────── */}
      <View style={[styles.headerCard, isDark && { backgroundColor: DARK_THEME.headerBg }]}>
        {/* Kente tricolor bar */}
        <View style={styles.kenteBar}>
          <View style={[styles.kenteStripe, { backgroundColor: TP.green, flex: 1 }]} />
          <View style={[styles.kenteStripe, { backgroundColor: TP.gold, flex: 1 }]} />
          <View style={[styles.kenteStripe, { backgroundColor: TP.accent, flex: 1 }]} />
        </View>

        {/* Radial glow overlay */}
        <View style={styles.headerGlow} pointerEvents="none" />

        <View style={styles.headerContent}>
          {/* Greeting row */}
          <View style={styles.greetingRow}>
            <View style={styles.greetingLeft}>
              <Text style={styles.greetingText}>{`${greeting} ${firstName}`}</Text>
              <Text style={styles.greetingSubtitle}>Bienvenue sur TekkiPro</Text>
            </View>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarInitial}>{userInitial}</Text>
            </View>
          </View>

          {/* Boutique switcher (business only) */}
          {canSwitchBoutique ? (
            <TouchableOpacity
              style={styles.boutiqueCard}
              onPress={() => setShowBoutiqueModal(true)}
              activeOpacity={0.88}
            >
              <View style={styles.boutiqueCardLeft}>
                <View style={styles.boutiqueIconWrap}>
                  <Feather name="home" size={16} color={TP.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.boutiqueLabel}>{t('dashboard.activeStore')}</Text>
                  <Text style={styles.boutiqueName} numberOfLines={1}>{currentBoutiqueName}</Text>
                  <Text style={styles.boutiqueMeta}>
                    {t('common.storesCount', { count: boutiquesForSwitch.length })}
                  </Text>
                </View>
              </View>
              <View style={styles.boutiqueSwitchBtn}>
                <Text style={styles.boutiqueSwitchBtnText}>{t('dashboard.switch')}</Text>
                <Feather name="chevrons-right" size={14} color={TP.headerBg} />
              </View>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      {/* ─── KPI STAT CARDS ──────────────────────────────────────────────────── */}
      <View style={[styles.statSection, isDark && { backgroundColor: themeColors.background }]}>
        <SectionTitle isDark={isDark} themeColors={themeColors} style={styles.sectionTitleSpaced}>
          Ventes
        </SectionTitle>
        <View style={styles.statRow}>

          {/* Card 1 — Aujourd'hui: dark green */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardInnerGreen}>
              <View style={styles.kpiIconBadge}>
                <Feather name="shopping-cart" size={16} color={TP.gold} />
              </View>
              <Text style={styles.kpiAmount} numberOfLines={1}>
                {formatCFA(stats?.ventesJour?.total, locale)}
              </Text>
              <Text style={styles.kpiLabel}>Aujourd'hui</Text>
              {stats?.ventesJour?.nombre != null ? (
                <View style={styles.kpiCountBadge}>
                  <Text style={styles.kpiCountText}>{stats.ventesJour.nombre} ventes</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Card 2 — Semaine: gold */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardInnerGold}>
              <View style={[styles.kpiIconBadge, styles.kpiIconBadgeDark]}>
                <Feather name="trending-up" size={16} color={TP.headerBg} />
              </View>
              <Text style={[styles.kpiAmount, styles.kpiAmountDark]} numberOfLines={1}>
                {formatCFA(trendTotal, locale)}
              </Text>
              <Text style={[styles.kpiLabel, styles.kpiLabelDark]}>Semaine</Text>
              {trendCount > 0 ? (
                <View style={[styles.kpiCountBadge, styles.kpiCountBadgeDark]}>
                  <Text style={[styles.kpiCountText, styles.kpiCountTextDark]}>{trendCount} ventes</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Card 3 — Mois: darkest forest */}
          <View style={styles.kpiCard}>
            <View style={styles.kpiCardInnerForest}>
              <View style={[styles.kpiIconBadge, { backgroundColor: 'rgba(255,214,0,0.15)' }]}>
                <Feather name="calendar" size={16} color={TP.gold} />
              </View>
              <Text style={styles.kpiAmount} numberOfLines={1}>
                {formatCFA(stats?.ventesMois?.total, locale)}
              </Text>
              <Text style={styles.kpiLabel}>Mois</Text>
              {stats?.ventesMois?.nombre != null ? (
                <View style={styles.kpiCountBadge}>
                  <Text style={styles.kpiCountText}>{stats.ventesMois.nombre} ventes</Text>
                </View>
              ) : null}
            </View>
          </View>

        </View>
      </View>

      {/* ─── PLAN USAGE METERS (GRATUIT plan only) ───────────────────────────── */}
      {planUsage && plan === 'GRATUIT' && (
        <View style={{ backgroundColor: '#FFFFFF', borderRadius: 16, padding: 16, marginHorizontal: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E5E7EB' }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#6B7280', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Limites du plan Starter
          </Text>
          <UsageMeterCompact
            label="Ventes ce mois"
            used={planUsage.ventesParMois?.used ?? 0}
            limit={planUsage.ventesParMois?.limit ?? null}
            palette={TP}
          />
          <UsageMeterCompact
            label="Produits actifs"
            used={planUsage.produits?.used ?? 0}
            limit={planUsage.produits?.limit ?? null}
            palette={TP}
          />
          <UsageMeterCompact
            label="Clients"
            used={planUsage.clients?.used ?? 0}
            limit={planUsage.clients?.limit ?? null}
            palette={TP}
          />
        </View>
      )}

      {/* ─── QUICK ACTIONS ───────────────────────────────────────────────────── */}
      <View style={[styles.quickSection, isDark && { backgroundColor: themeColors.background }]}>
        <SectionTitle isDark={isDark} themeColors={themeColors} style={styles.sectionTitleSpaced}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="zap" size={14} color={TP.gold} />
            <Text style={[styles.sectionTitle, isDark && { color: themeColors.text }]}>Accès rapide</Text>
          </View>
        </SectionTitle>

        {/* Primary 3 actions */}
        <View style={styles.quickActionsRow}>
          <TouchableOpacity
            style={[styles.quickActionCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}
            onPress={() => navigation.navigate('Ventes')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: TP.greenLight }]}>
              <Feather name="plus" size={22} color={TP.green} />
            </View>
            <Text style={[styles.quickActionLabel, isDark && { color: themeColors.text }]}>Nvl Vente</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}
            onPress={() => navigation.navigate('Scanner')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: TP.goldLight }]}>
              <Feather name="maximize" size={22} color={TP.gold} />
            </View>
            <Text style={[styles.quickActionLabel, isDark && { color: themeColors.text }]}>Scanner</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickActionCard, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}
            onPress={() => navigation.navigate('Stock')}
            activeOpacity={0.85}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: TP.greenLight }]}>
              <Feather name="package" size={22} color={TP.green} />
            </View>
            <Text style={[styles.quickActionLabel, isDark && { color: themeColors.text }]}>Produit</Text>
          </TouchableOpacity>
        </View>

        {/* Full actions grid — 4-column */}
        <View style={styles.actionsGrid}>
          {actionItems.map((action) => {
            const button = (
              <TouchableOpacity
                key={action.route}
                style={[
                  styles.actionBtn,
                  action.locked && styles.actionBtnLocked,
                  isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder },
                  isDark && action.locked && { backgroundColor: '#1A1029', borderColor: '#4C1D95' },
                ]}
                onPress={() => !action.locked && navigation.navigate(action.route)}
                disabled={action.locked}
                activeOpacity={0.85}
              >
                <View style={[
                  styles.actionIconChip,
                  { backgroundColor: action.bg || TP.greenLight },
                  isDark && { backgroundColor: themeColors.surfaceBg },
                ]}>
                  <Feather name={action.icon} size={20} color={action.accent} />
                </View>
                <View style={[styles.actionAccentLine, { backgroundColor: action.accent }]} />
                <Text style={[styles.actionText, isDark && { color: themeColors.text }]} numberOfLines={1}>
                  {action.label}
                </Text>
                {action.locked ? (
                  <View style={styles.actionLockBadge}>
                    <Feather name="lock" size={10} color="#7c3aed" />
                    <Text style={styles.actionLockText}>{t('dashboard.proBadge')}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            );

            if (action.locked) {
              return (
                <ProTooltip key={action.route} locked={true} featureLabel={action.label} requiredPlan="PRO">
                  {button}
                </ProTooltip>
              );
            }
            return button;
          })}
        </View>
      </View>

      {/* ─── EXPIRATION ALERTS ───────────────────────────────────────────────── */}
      <View style={[
        styles.panel,
        peremptionOverview.urgentCount > 0 ? styles.expirationPanelActive : styles.expirationPanelCalm,
        isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder },
        isDark && peremptionOverview.urgentCount > 0 && { backgroundColor: '#10192c', borderColor: '#274c77' },
      ]}>
        <View style={[styles.panelHeader, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <View style={{ width: '100%' }}>
            <View style={styles.panelTitleRow}>
              {peremptionOverview.urgentCount > 0 ? (
                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                  <Feather name="alert-triangle" size={16} color={TP.accent} />
                </Animated.View>
              ) : (
                <Feather name="check-circle" size={16} color={TP.green} />
              )}
              <Text style={[styles.panelTitle, isDark && { color: themeColors.text }]}>
                {t('dashboard.expirationAlerts')}
              </Text>
            </View>
            <Text style={[styles.panelSubtitle, isDark && { color: themeColors.muted }]}>
              {t('dashboard.expirationHint')}
            </Text>
          </View>
          <TouchableOpacity style={{ alignSelf: 'flex-start', marginTop: 8 }} onPress={() => navigation.navigate('Stock')}>
            <View style={[styles.panelBadge, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
              <Text style={[styles.panelBadgeText, isDark && { color: themeColors.accentText }]}>
                {t('dashboard.viewStock')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.expirationSummaryRow}>
          <View style={[styles.expirationSummaryPill, styles.expirationSummaryDanger]}>
            <Feather name="alert-octagon" size={12} color="#b91c1c" />
            <Text style={[styles.expirationSummaryText, styles.expirationSummaryTextDanger]}>
              {t('dashboard.expiredCount', { count: peremptionOverview.expiredCount })}
            </Text>
          </View>
          <View style={[styles.expirationSummaryPill, styles.expirationSummaryWarning]}>
            <Feather name="clock" size={12} color="#b45309" />
            <Text style={[styles.expirationSummaryText, styles.expirationSummaryTextWarning]}>
              {t('dashboard.expiringSoonCount', { count: peremptionOverview.expiringCount })}
            </Text>
          </View>
        </View>

        {peremptionOverview.urgentCount === 0 ? (
          <View style={styles.expirationCleanRow}>
            <View style={styles.expirationCleanIconWrap}>
              <Feather name="shield" size={18} color={TP.green} />
            </View>
            <Text style={[styles.emptyPanelText, isDark && { color: themeColors.muted }]}>
              {t('dashboard.expirationHealthy')}
            </Text>
          </View>
        ) : (
          <>
            {peremptionOverview.urgentItems.map((item) => {
              const isExpired = item.estExpire;
              const dateLabel = formatDateLabel(item.datePeremption, locale);
              const daysLeft = getRemainingPeremptionDays(item.datePeremption, item.joursAvantPeremption);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.expirationRow, isDark && { borderTopColor: themeColors.surfaceBorder }]}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('Stock')}
                >
                  <View style={[
                    styles.expirationIconWrap,
                    isExpired ? styles.expirationIconWrapDanger : styles.expirationIconWrapWarning,
                  ]}>
                    <Feather
                      name={isExpired ? 'alert-octagon' : 'calendar'}
                      size={15}
                      color={isExpired ? '#b91c1c' : '#b45309'}
                    />
                  </View>
                  <View style={styles.productInfo}>
                    <Text style={[styles.productName, isDark && { color: themeColors.text }]}>{item.nom}</Text>
                    <Text style={[styles.productMeta, isDark && { color: themeColors.muted }]}>{dateLabel}</Text>
                  </View>
                  <View style={[
                    styles.expirationDaysPill,
                    isExpired ? styles.expirationDaysPillDanger : styles.expirationDaysPillWarning,
                  ]}>
                    <Text style={[
                      styles.expirationDaysPillText,
                      isExpired ? styles.expirationStatusTextDanger : styles.expirationStatusTextWarning,
                    ]}>
                      {getPeremptionStatusLabel(item)}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {peremptionOverview.urgentCount > peremptionOverview.urgentItems.length ? (
              <Text style={[styles.expirationMoreText, isDark && { color: themeColors.accentText }]}>
                {t('dashboard.moreExpirationItems', { count: peremptionOverview.urgentCount - peremptionOverview.urgentItems.length })}
              </Text>
            ) : null}
          </>
        )}
      </View>

      {/* ─── TOP PRODUCTS ────────────────────────────────────────────────────── */}
      <View style={[styles.panel, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
        <View style={styles.panelHeader}>
          <View>
            <View style={styles.panelTitleRow}>
              <Feather name="award" size={16} color={TP.gold} />
              <Text style={[styles.panelTitle, isDark && { color: themeColors.text }]}>{t('dashboard.topProducts')}</Text>
            </View>
            <Text style={[styles.panelSubtitle, isDark && { color: themeColors.muted }]}>{t('dashboard.thisMonth')}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Ventes')}>
            <View style={styles.linkRow}>
              <Text style={[styles.linkText, isDark && { color: themeColors.accentText }]}>{t('dashboard.viewSales')}</Text>
              <Feather name="arrow-right" size={14} color={isDark ? themeColors.accentText : TP.green} />
            </View>
          </TouchableOpacity>
        </View>

        {topProduits.length === 0 ? (
          <Text style={[styles.emptyPanelText, isDark && { color: themeColors.muted }]}>
            {t('dashboard.noSalesThisMonth')}
          </Text>
        ) : (
          topProduits.slice(0, 5).map((item, index) => {
            const rankMeta = [
              { color: TP.gold,   label: '1er', borderColor: TP.gold },
              { color: '#9E9E9E', label: '2e',  borderColor: '#9E9E9E' },
              { color: '#A0522D', label: '3e',  borderColor: '#A0522D' },
              { color: TP.green,  label: `${index + 1}e`, borderColor: TP.green },
              { color: TP.green,  label: `${index + 1}e`, borderColor: TP.green },
            ];
            const rank = rankMeta[index] || rankMeta[3];
            return (
              <View
                key={`${item.produit}-${index}`}
                style={[
                  styles.topProductCard,
                  { borderLeftColor: rank.borderColor },
                  isDark && { backgroundColor: themeColors.surfaceBg, borderTopColor: themeColors.surfaceBorder },
                ]}
              >
                <View style={[styles.rankBubble, { backgroundColor: `${rank.color}22` }]}>
                  <Text style={[styles.rankText, { color: rank.color }]}>{index + 1}</Text>
                </View>
                <View style={styles.productInfo}>
                  <Text style={[styles.productName, isDark && { color: themeColors.text }]}>{item.produit}</Text>
                  <Text style={[styles.productMeta, isDark && { color: themeColors.muted }]}>
                    {t('common.salesCount', { count: item.nombreVentes || 0 })}
                  </Text>
                </View>
                <View style={styles.topProductRight}>
                  <Text style={[styles.topProductRevenue, isDark && { color: themeColors.accentText }]}>
                    {formatCFA(item.chiffreAffaires || 0, locale)}
                  </Text>
                  <Text style={[styles.topProductQty, isDark && { color: themeColors.muted }]}>
                    {item.quantiteVendue || 0} unités
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </View>

      {/* ─── ACTIVITÉ RÉCENTE ────────────────────────────────────────────────── */}
      <View style={[styles.panel, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder }]}>
        <View style={styles.panelHeader}>
          <SectionTitle isDark={isDark} themeColors={themeColors} style={{ marginBottom: 0 }}>
            Activité récente
          </SectionTitle>
          <TouchableOpacity onPress={() => navigation.navigate('Ventes')}>
            <Text style={[styles.voirToutLink, isDark && { color: themeColors.accentText }]}>Voir tout</Text>
          </TouchableOpacity>
        </View>

        {ventesTrend.length === 0 ? (
          <Text style={[styles.emptyPanelText, isDark && { color: themeColors.muted }]}>
            {t('dashboard.noRecentActivity')}
          </Text>
        ) : (
          ventesTrend.map((item, index) => {
            const total = item.total || 0;
            const saleCount = item.nombre || item.nombreVentes || item.nombre_ventes || 0;
            const iconColors = [TP.green, TP.gold, TP.accent];
            const iconColor = iconColors[index % 3];
            return (
              <View
                key={`${item.date}-${index}`}
                style={[styles.activityRow, isDark && { borderTopColor: themeColors.surfaceBorder }]}
              >
                <View style={[styles.activityIconWrap, { backgroundColor: `${iconColor}18` }]}>
                  <Feather name="shopping-bag" size={15} color={iconColor} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityProductName, isDark && { color: themeColors.text }]}>
                    {t('common.salesCount', { count: saleCount })}
                  </Text>
                  <Text style={[styles.activityTimeAgo, isDark && { color: themeColors.muted }]}>
                    {new Date(item.date).toLocaleDateString(locale, { day: '2-digit', month: 'short' })}
                  </Text>
                </View>
                <Text style={[styles.activityAmount, isDark && { color: TP.gold }]}>
                  {formatCFA(total, locale)}
                </Text>
              </View>
            );
          })
        )}
      </View>

      {/* ─── NEW PRODUCT CTA (admin only) ────────────────────────────────────── */}
      {user?.role === 'ADMIN' && (
        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('ProduitForm')}>
          <View style={styles.createBtnRow}>
            <Feather name="plus-circle" size={18} color="#fff" />
            <Text style={styles.createBtnTitle}>{t('dashboard.newProduct')}</Text>
          </View>
          <Text style={styles.createBtnText}>{t('dashboard.newProductHint')}</Text>
        </TouchableOpacity>
      )}

      {/* ─── BOUTIQUE SWITCH MODAL ───────────────────────────────────────────── */}
      <Modal visible={showBoutiqueModal} transparent animationType="slide" onRequestClose={() => setShowBoutiqueModal(false)}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: themeColors.modalOverlay }]}>
          <View style={[styles.modalCard, isDark && { backgroundColor: themeColors.modalBg }]}>
            <View style={[styles.modalHandle, isDark && { backgroundColor: '#243041' }]} />
            <View style={styles.modalTitleRow}>
              <View style={[styles.modalTitleIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}>
                <Feather name="home" size={18} color={isDark ? themeColors.accentText : TP.green} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.modalTitle, isDark && { color: themeColors.text }]}>
                  {t('dashboard.switchStoreTitle')}
                </Text>
                <Text style={[styles.modalSubtitle, isDark && { color: themeColors.muted }]}>
                  {t('dashboard.switchStoreHint')}
                </Text>
              </View>
            </View>

            {boutiquesForSwitch.map((item) => {
              const isActive    = selectedBoutiqueId === item.id;
              const isSwitching = switchingBoutiqueId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.boutiqueOption,
                    isActive && styles.boutiqueOptionActive,
                    isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder },
                    isDark && isActive && { backgroundColor: '#10192C', borderColor: '#274C77' },
                  ]}
                  onPress={() => handleSwitchBoutique(item.id)}
                  disabled={isSwitching}
                >
                  <View style={styles.boutiqueOptionLeft}>
                    <View style={[
                      styles.boutiqueOptionIconWrap,
                      isActive && { backgroundColor: TP.greenLight },
                      isDark && { backgroundColor: themeColors.surfaceBg },
                      isDark && isActive && { backgroundColor: themeColors.accentBg },
                    ]}>
                      <Feather
                        name={item.parentBoutiqueId ? 'git-branch' : 'home'}
                        size={16}
                        color={isActive ? TP.green : (isDark ? themeColors.muted : TP.muted)}
                      />
                    </View>
                    <View>
                      <Text style={[styles.boutiqueOptionName, isDark && { color: themeColors.text }]}>{item.nom}</Text>
                      <Text style={[styles.boutiqueOptionMeta, isDark && { color: themeColors.muted }]}>
                        {item.parentBoutiqueId ? t('dashboard.secondaryStore') : t('dashboard.primaryStore')}
                        {item._count ? ` • ${t('common.productsCount', { count: item._count.produits || 0 })}` : ''}
                      </Text>
                    </View>
                  </View>
                  {isSwitching ? (
                    <ActivityIndicator size="small" color={TP.green} />
                  ) : isActive ? (
                    <Feather name="check-circle" size={18} color={TP.green} />
                  ) : (
                    <Feather name="chevron-right" size={18} color={TP.muted} />
                  )}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[
                styles.modalCloseBtn,
                isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, borderWidth: 1 },
              ]}
              onPress={() => setShowBoutiqueModal(false)}
            >
              <Feather name="x" size={16} color={isDark ? themeColors.accentText : TP.green} />
              <Text style={[styles.modalCloseText, isDark && { color: themeColors.accentText }]}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TP.bg },
  centered:  { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TP.bg },

  // ── Section title utility ──
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitleSpaced: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: TP.text, letterSpacing: 0.2 },
  sectionDot: { width: 8, height: 8, borderRadius: 4 },

  // ── HEADER ──
  headerCard: {
    backgroundColor: TP.headerBg,
    paddingBottom: 24,
    overflow: 'hidden',
  },
  kenteBar: {
    flexDirection: 'row',
    height: 4,
  },
  kenteStripe: {
    height: 4,
  },
  // Radial glow: a large tinted circle behind the content
  headerGlow: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(27,94,32,0.25)',
  },
  headerContent: {
    paddingTop: 52,
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  greetingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  greetingLeft:     { flex: 1, paddingRight: 12 },
  greetingText:     { fontSize: 24, fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.4 },
  greetingSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 5 },

  avatarCircle: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: TP.gold,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: TP.gold, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  avatarInitial: { color: TP.headerBg, fontSize: 20, fontWeight: '900' },

  // Boutique card inside dark header
  boutiqueCard: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16, padding: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: `${TP.gold}40`,
  },
  boutiqueCardLeft:  { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  boutiqueIconWrap:  {
    width: 40, height: 40, borderRadius: 13,
    backgroundColor: 'rgba(255,214,0,0.15)',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  boutiqueLabel:     { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: 0.5 },
  boutiqueName:      { fontSize: 15, fontWeight: '800', color: '#FFFFFF', marginTop: 2 },
  boutiqueMeta:      { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  boutiqueSwitchBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: TP.gold, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8,
  },
  boutiqueSwitchBtnText: { color: TP.headerBg, fontWeight: '900', fontSize: 12 },

  // ── KPI STAT CARDS ──
  statSection:  { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 8 },
  statRow:  { flexDirection: 'row', gap: 8 },

  kpiCard: { flex: 1 },
  kpiCardInnerGreen: {
    backgroundColor: TP.green,
    borderRadius: 18, padding: 14,
    minHeight: 110,
    shadowColor: TP.green, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
    overflow: 'hidden',
  },
  kpiCardInnerGold: {
    backgroundColor: TP.gold,
    borderRadius: 18, padding: 14,
    minHeight: 110,
    shadowColor: TP.gold, shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
    overflow: 'hidden',
  },
  kpiCardInnerForest: {
    backgroundColor: '#071C08',
    borderRadius: 18, padding: 14,
    minHeight: 110,
    borderWidth: 1, borderColor: `${TP.gold}30`,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
    overflow: 'hidden',
  },
  kpiKenteBar: {
    flexDirection: 'row',
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
    marginBottom: 10,
  },
  kpiIconBadge: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  kpiIconBadgeDark: { backgroundColor: 'rgba(7,28,8,0.2)' },
  kpiAmount: {
    fontSize: 13, fontWeight: '900', color: '#FFFFFF',
    marginBottom: 4, letterSpacing: -0.2,
  },
  kpiAmountDark: { color: TP.headerBg },
  kpiLabel: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.75)' },
  kpiLabelDark: { color: 'rgba(7,28,8,0.65)' },
  kpiCountBadge: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  kpiCountBadgeDark: { backgroundColor: 'rgba(7,28,8,0.15)' },
  kpiCountText: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.9)' },
  kpiCountTextDark: { color: 'rgba(7,28,8,0.7)' },

  // ── CHART ──
  chartPanel: {
    backgroundColor: TP.card,
    marginHorizontal: 20, marginTop: 20, marginBottom: 4,
    borderRadius: 20, padding: 16,
    shadowColor: '#1A1A2E', shadowOpacity: 0.07, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: TP.border,
  },
  chartSubtitle: { fontSize: 12, color: TP.muted, marginBottom: 16, marginTop: -8 },
  chartScrollContent: { paddingRight: 8, paddingBottom: 4 },

  barWrapper: { alignItems: 'center', marginRight: 10, width: 38 },
  barTooltip: {
    backgroundColor: TP.headerBg, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 3,
    marginBottom: 4,
  },
  barTooltipText: { color: TP.gold, fontSize: 9, fontWeight: '800' },
  barTrack: { justifyContent: 'flex-end', width: 24 },
  bar: {
    width: 24, borderTopLeftRadius: 6, borderTopRightRadius: 6,
  },
  barDefault: { backgroundColor: `${TP.green}80` },
  barToday: { backgroundColor: TP.gold },
  barDayLabel: { marginTop: 6, fontSize: 10, color: TP.muted, fontWeight: '600' },
  barDayLabelToday: { color: TP.green, fontWeight: '800' },

  // ── QUICK ACTIONS ──
  quickSection: { marginTop: 20, backgroundColor: TP.bg },
  quickActionsRow: {
    flexDirection: 'row', gap: 10,
    paddingHorizontal: 20, marginBottom: 12,
  },
  quickActionCard: {
    flex: 1, backgroundColor: TP.card, borderRadius: 18, padding: 14,
    alignItems: 'center',
    shadowColor: '#1A1A2E', shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: TP.border,
  },
  quickActionIcon: {
    width: 48, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  quickActionLabel: { fontSize: 12, fontWeight: '700', color: TP.text, textAlign: 'center' },

  // Full actions grid
  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 14, marginBottom: 8 },
  actionBtn: {
    backgroundColor: TP.card, borderRadius: 16, padding: 14, margin: 6,
    width: '30%', alignItems: 'center',
    shadowColor: '#1A1A2E', shadowOpacity: 0.06, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: TP.border,
  },
  actionBtnLocked: { backgroundColor: '#F5F3FF', borderColor: '#DDD6FE' },
  actionIconChip: {
    width: 44, height: 44, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  actionAccentLine: { width: 28, height: 3, borderRadius: 999, marginBottom: 6 },
  actionText:       { fontSize: 12, fontWeight: '700', color: TP.text, textAlign: 'center' },
  actionLockBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#EDE9FE', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginTop: 6,
  },
  actionLockText: { color: '#6D28D9', fontSize: 10, fontWeight: '800' },

  // ── PANELS ──
  panel: {
    backgroundColor: TP.card, marginHorizontal: 20, marginBottom: 16, marginTop: 16,
    borderRadius: 20, padding: 16,
    shadowColor: '#1A1A2E', shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    borderWidth: 1, borderColor: TP.border,
  },
  panelHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  panelTitleRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  panelTitle:     { fontSize: 16, fontWeight: '800', color: TP.text },
  panelSubtitle:  { fontSize: 12, color: TP.muted, marginTop: 2 },
  panelBadge:     { backgroundColor: TP.greenLight, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  panelBadgeText: { color: TP.green, fontSize: 12, fontWeight: '700' },

  voirToutLink: { color: TP.green, fontSize: 13, fontWeight: '700' },

  // ── ACTIVITY ──
  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: TP.border,
  },
  activityIconWrap: {
    width: 36, height: 36, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  activityInfo:        { flex: 1 },
  activityProductName: { fontSize: 14, fontWeight: '700', color: TP.text },
  activityTimeAgo:     { fontSize: 12, color: TP.muted, marginTop: 2 },
  activityAmount:      { fontSize: 14, fontWeight: '800', color: TP.green },

  // ── EXPIRATION ──
  expirationPanelActive: { backgroundColor: '#FFF4F4', borderColor: `${TP.accent}40` },
  expirationPanelCalm:   { backgroundColor: '#F2FBF3', borderColor: `${TP.green}30` },
  expirationSummaryRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  expirationSummaryPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1,
  },
  expirationSummaryDanger:       { backgroundColor: '#FEE2E2', borderColor: '#FCA5A5' },
  expirationSummaryWarning:      { backgroundColor: '#FFFBEB', borderColor: '#FDBA74' },
  expirationSummaryText:         { fontSize: 12, fontWeight: '800' },
  expirationSummaryTextDanger:   { color: '#B91C1C' },
  expirationSummaryTextWarning:  { color: '#B45309' },

  expirationCleanRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  expirationCleanIconWrap: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: TP.greenLight, alignItems: 'center', justifyContent: 'center',
  },

  expirationRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderTopWidth: 1, borderTopColor: TP.border,
  },
  expirationIconWrap:        { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  expirationIconWrapDanger:  { backgroundColor: '#FEE2E2' },
  expirationIconWrapWarning: { backgroundColor: '#FFEDD5' },

  expirationDaysPill:        { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  expirationDaysPillDanger:  { backgroundColor: '#FEF2F2', borderColor: '#FCA5A5' },
  expirationDaysPillWarning: { backgroundColor: '#FFFBEB', borderColor: '#FDBA74' },
  expirationDaysPillText:    { fontSize: 11, fontWeight: '800' },
  expirationStatusTextDanger:   { color: '#B91C1C' },
  expirationStatusTextWarning:  { color: '#B45309' },
  expirationMoreText: { marginTop: 8, fontSize: 12, fontWeight: '700', color: TP.green },

  // ── TOP PRODUCTS ──
  topProductCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 10,
    borderTopWidth: 1, borderTopColor: TP.border,
    borderLeftWidth: 3, borderRadius: 4,
    marginBottom: 2,
  },
  rankBubble:  { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  rankText:    { fontWeight: '900', fontSize: 13 },
  productInfo: { flex: 1 },
  productName: { fontSize: 14, fontWeight: '700', color: TP.text },
  productMeta: { fontSize: 12, color: TP.muted, marginTop: 2 },
  topProductRight: { alignItems: 'flex-end' },
  topProductRevenue: { fontSize: 13, fontWeight: '800', color: TP.green },
  topProductQty:     { fontSize: 11, color: TP.muted, marginTop: 2 },
  productQty:  { fontSize: 14, fontWeight: '800' },

  emptyPanelText: { color: TP.muted, fontSize: 13, lineHeight: 18 },
  linkRow:        { flexDirection: 'row', alignItems: 'center', gap: 5 },
  linkText:       { color: TP.green, fontWeight: '700', fontSize: 13 },

  // ── CREATE CTA BUTTON ──
  createBtn: {
    backgroundColor: TP.green, marginHorizontal: 20, marginBottom: 36,
    borderRadius: 18, padding: 18,
    shadowColor: TP.green, shadowOpacity: 0.38, shadowRadius: 14, elevation: 6,
  },
  createBtnRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  createBtnTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  createBtnText:  { color: 'rgba(255,255,255,0.80)', fontSize: 13 },

  // ── BOTTOM SHEET MODAL ──
  modalOverlay: { flex: 1, backgroundColor: 'rgba(26,26,46,0.52)', justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: TP.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 18, maxHeight: '80%',
  },
  modalHandle: {
    width: 44, height: 5, borderRadius: 999, backgroundColor: TP.border,
    alignSelf: 'center', marginBottom: 14,
  },
  modalTitleRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  modalTitleIconWrap: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: TP.greenLight, alignItems: 'center', justifyContent: 'center',
  },
  modalTitle:    { fontSize: 18, fontWeight: '800', color: TP.text },
  modalSubtitle: { fontSize: 13, color: TP.muted, marginTop: 2 },

  boutiqueOption: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: TP.border, borderRadius: 16, padding: 14,
    marginBottom: 10, backgroundColor: TP.card,
  },
  boutiqueOptionActive:   { borderColor: `${TP.green}60`, backgroundColor: TP.greenLight },
  boutiqueOptionLeft:     { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 8 },
  boutiqueOptionIconWrap: {
    width: 40, height: 40, borderRadius: 14,
    backgroundColor: TP.bg, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  boutiqueOptionName: { fontSize: 15, fontWeight: '800', color: TP.text },
  boutiqueOptionMeta: { fontSize: 12, color: TP.muted, marginTop: 4 },

  modalCloseBtn: {
    alignSelf: 'flex-end', marginTop: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: TP.greenLight, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10,
  },
  modalCloseText: { color: TP.green, fontWeight: '800' },

  // Legacy scroll helpers (kept for overviewScrollRef compatibility)
  overviewScrollWrap: { position: 'relative', marginTop: 8 },
  overviewContent:    { paddingLeft: 20, paddingBottom: 4, paddingRight: 44 },
  overviewEdgeHint: {
    position: 'absolute', right: 16, top: '50%', marginTop: -16,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.94)', borderWidth: 1, borderColor: TP.border,
    alignItems: 'center', justifyContent: 'center',
  },
  card: {
    backgroundColor: TP.card, borderRadius: 16, padding: 16, margin: 6,
    flex: 1, minWidth: '44%',
    shadowColor: '#1A1A2E', shadowOpacity: 0.07, shadowRadius: 10, elevation: 3,
    borderWidth: 1, borderColor: TP.border,
  },
  cardIconWrap: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  cardValue:    { fontSize: 18, fontWeight: '800', color: TP.text, marginBottom: 4 },
  cardLabel:    { fontSize: 11, color: TP.muted },
});
