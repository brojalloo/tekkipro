import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TextInput, ActivityIndicator, RefreshControl, TouchableOpacity, Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { deleteProduit, getHistoriqueStock, getInventaire } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { TP, DARK_THEME } from '../theme/tokens';

const formatCFA = (value, locale) => `${(value || 0).toLocaleString(locale)} F`;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const STOCK_TEXT = {
  fr: {
    title: 'Stock', add: '+ Ajouter', searchPlaceholder: 'Rechercher un produit...',
    colProduct: 'Produit', colStock: 'Stock', colPrice: 'Prix',
    productsCount: (n) => `${n} produit${n > 1 ? 's' : ''}`,
    movementsCount: (n) => `${n} mouvement${n > 1 ? 's' : ''}`,
    inventoryTab: 'Inventaire', historyTab: 'Historique',
    noProduct: 'Aucun produit trouvé', noMovement: 'Aucun mouvement trouvé',
    edit: 'Modifier', delete: 'Supprimer', cancel: 'Annuler',
    deleteConfirmTitle: 'Supprimer le produit',
    deleteConfirmMessage: (name) => `Voulez-vous vraiment supprimer "${name}" du stock ?`,
    deleteUnavailableTitle: 'Suppression indisponible',
    deleteUnavailableMessage: 'Ce produit a déjà été utilisé dans des ventes.',
    deleteSuccessTitle: 'Produit supprimé',
    deleteSuccessMessage: (name) => `${name} a été retiré du stock.`,
    deleteErrorTitle: 'Erreur', deleteErrorMessage: 'Impossible de supprimer ce produit.',
    uncategorized: 'Sans catégorie', noSupplier: 'Sans fournisseur',
    deletedProduct: 'Produit supprimé',
    statTotal: 'Total produits',
    statAlert: 'En alerte',
    statExpired: 'Expirés',
  },
  en: {
    title: 'Stock', add: '+ Add', searchPlaceholder: 'Search a product...',
    colProduct: 'Product', colStock: 'Stock', colPrice: 'Price',
    productsCount: (n) => `${n} product${n > 1 ? 's' : ''}`,
    movementsCount: (n) => `${n} movement${n > 1 ? 's' : ''}`,
    inventoryTab: 'Inventory', historyTab: 'History',
    noProduct: 'No product found', noMovement: 'No movement found',
    edit: 'Edit', delete: 'Delete', cancel: 'Cancel',
    deleteConfirmTitle: 'Delete product',
    deleteConfirmMessage: (name) => `Remove "${name}" from stock?`,
    deleteUnavailableTitle: 'Deletion unavailable',
    deleteUnavailableMessage: 'This product has already been used in sales.',
    deleteSuccessTitle: 'Product deleted',
    deleteSuccessMessage: (name) => `${name} was removed from stock.`,
    deleteErrorTitle: 'Error', deleteErrorMessage: 'Unable to delete this product.',
    uncategorized: 'Uncategorized', noSupplier: 'No supplier',
    deletedProduct: 'Deleted product',
    statTotal: 'Total products',
    statAlert: 'Low stock',
    statExpired: 'Expired',
  },
};

const formatStockDisplay = (item) => {
  const defU = item.unitesVente?.find((u) => u.estDefaut) || item.unitesVente?.[0];
  if (defU?.facteurConversion > 0) {
    const qty = Number(item.stock || 0) / defU.facteurConversion;
    return qty % 1 === 0 ? String(qty) : qty.toFixed(1);
  }
  return String(item.stock || 0);
};

const getStockUnit = (item) => {
  const defU = item.unitesVente?.find((u) => u.estDefaut) || item.unitesVente?.[0];
  return defU?.unite?.symbole || defU?.unite?.nom || '';
};

const getRemainingDays = (datePeremption, providedValue) => {
  const numericValue = Number(providedValue);
  if (Number.isFinite(numericValue)) return numericValue;
  const normalized = String(datePeremption || '').trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return null;
  const target = new Date(`${normalized}T12:00:00.000Z`);
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  return Math.round((target.getTime() - today.getTime()) / DAY_IN_MS);
};

const getStockBadgeColor = (item) => {
  if (item.estExpire) return { bg: '#FEE2E2', color: '#DC2626' };
  if (item.enAlertePeremption) return { bg: '#FEF3C7', color: '#B45309' };
  if (item.enAlerte || Number(item.stock) <= Number(item.stockAlerte)) return { bg: '#FFF6E5', color: '#D4880F' };
  return { bg: '#E8F5ED', color: TP.green };
};

// Returns a stable color for the avatar based on the first letter
const getAvatarColor = (item) => {
  if (item.estExpire) return { bg: '#DC2626', text: '#fff' };
  if (item.enAlertePeremption) return { bg: '#B45309', text: '#fff' };
  if (item.enAlerte || Number(item.stock) <= Number(item.stockAlerte)) return { bg: '#D4880F', text: '#fff' };
  return { bg: TP.green, text: '#fff' };
};

// Returns a subtle tint for the card background based on stock status
const getCardTint = (item, isDark) => {
  if (item.estExpire) {
    return isDark ? 'rgba(220,38,38,0.10)' : '#FFF5F5';
  }
  if (item.enAlertePeremption || item.enAlerte || Number(item.stock) <= Number(item.stockAlerte)) {
    return isDark ? 'rgba(212,136,15,0.08)' : '#FFFBF0';
  }
  return null; // default card bg
};

export default function StockScreen({ navigation }) {
  const { user } = useAuth();
  const { language, locale } = useI18n();
  const { isDark } = useTheme();
  const [inventaire, setInventaire] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [tab, setTab] = useState('inventaire');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const text = STOCK_TEXT[language] || STOCK_TEXT.fr;
  const isAdmin = user?.role === 'ADMIN';

  const D = {
    bg: isDark ? DARK_THEME.background : TP.screenBg,
    card: isDark ? DARK_THEME.cardBg : TP.cardBg,
    border: isDark ? DARK_THEME.cardBorder : TP.greenBorder,
    text: isDark ? DARK_THEME.text : TP.text,
    muted: isDark ? DARK_THEME.muted : TP.muted,
    rowBg: isDark ? DARK_THEME.cardBg : TP.cardBg,
  };

  const loadInventaire = useCallback(async () => {
    try {
      const [invRes, histRes] = await Promise.all([getInventaire(), getHistoriqueStock()]);
      if (invRes.data.success) setInventaire(invRes.data.data);
      if (histRes.data.success) setHistorique(histRes.data.data || []);
    } catch (_) {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useFocusEffect(useCallback(() => { loadInventaire(); }, [loadInventaire]));

  const handleEdit = useCallback((item) => {
    navigation.navigate('ProduitForm', { produitId: item.id });
  }, [navigation]);

  const handleDelete = useCallback((item) => {
    if (item.peutSupprimer === false) {
      Alert.alert(text.deleteUnavailableTitle, text.deleteUnavailableMessage);
      return;
    }
    Alert.alert(text.deleteConfirmTitle, text.deleteConfirmMessage(item.nom), [
      { text: text.cancel, style: 'cancel' },
      {
        text: text.delete, style: 'destructive',
        onPress: async () => {
          try {
            const res = await deleteProduit(item.id);
            Alert.alert(
              text.deleteSuccessTitle,
              getApiSuccessMessage(res, { language, fallback: getLocalSuccessMessage({ language, entity: 'produit', action: 'delete' }) })
            );
            loadInventaire();
          } catch (err) {
            Alert.alert(text.deleteErrorTitle, getApiErrorMessage(err, { language, fallback: text.deleteErrorMessage }));
          }
        },
      },
    ]);
  }, [loadInventaire, text, language]);

  const filteredProduits = useMemo(() => {
    // API returns data.data as a direct array of products
    const produits = Array.isArray(inventaire) ? inventaire : (inventaire?.produits || []);
    const q = search.trim().toLowerCase();
    return produits
      .filter((p) => !q || p.nom?.toLowerCase().includes(q) || p.categorie?.nom?.toLowerCase().includes(q) || p.codeBarre?.toLowerCase().includes(q))
      .sort((a, b) => String(a.nom || '').localeCompare(String(b.nom || ''), locale, { sensitivity: 'base' }));
  }, [inventaire, locale, search]);

  const filteredHistorique = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return historique;
    return historique.filter((h) =>
      h.produit?.nom?.toLowerCase().includes(q) || h.fournisseur?.nom?.toLowerCase().includes(q)
    );
  }, [historique, search]);

  // ── Stats derived from the full (unfiltered) product list ──────────────────
  const allProduits = useMemo(() => {
    return Array.isArray(inventaire) ? inventaire : (inventaire?.produits || []);
  }, [inventaire]);

  const stats = useMemo(() => {
    const total = allProduits.length;
    const enAlerte = allProduits.filter(
      (p) => p.enAlerte || p.enAlertePeremption || Number(p.stock) <= Number(p.stockAlerte)
    ).length;
    const expires = allProduits.filter((p) => p.estExpire).length;
    return { total, enAlerte, expires };
  }, [allProduits]);

  const activeData = tab === 'inventaire' ? filteredProduits : filteredHistorique;

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: D.bg }]}>
        <ActivityIndicator size="large" color={TP.green} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: D.bg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => { setRefreshing(true); loadInventaire(); }}
          tintColor={TP.green}
          colors={[TP.green]}
        />
      }
    >
      {/* ── Header ── */}
      <View style={styles.pageHeader}>
        <Text style={[styles.pageTitle, { color: D.text }]}>{text.title}</Text>
        {isAdmin && (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ProduitForm')} activeOpacity={0.85}>
            <Text style={styles.addBtnText}>{text.add}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Search ── */}
      <View style={[styles.searchBar, { backgroundColor: D.card, borderColor: D.border }]}>
        <Feather name="search" size={16} color={D.muted} />
        <TextInput
          style={[styles.searchInput, { color: D.text }]}
          placeholder={text.searchPlaceholder}
          placeholderTextColor={D.muted}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Feather name="x-circle" size={16} color={D.muted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Tabs ── */}
      <View style={[styles.tabRow, { backgroundColor: isDark ? DARK_THEME.headerBg : '#EEEBE7' }]}>
        {[
          { key: 'inventaire', label: text.inventoryTab },
          { key: 'historique', label: text.historyTab },
        ].map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabBtnText, { color: tab === t.key ? '#fff' : D.muted }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Count ── */}
      <Text style={[styles.countText, { color: D.muted }]}>
        {tab === 'inventaire' ? text.productsCount(filteredProduits.length) : text.movementsCount(filteredHistorique.length)}
      </Text>

      {/* ══════════════════════════════════════════════════════════════════════
          INVENTAIRE TAB
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'inventaire' && (
        <>
          {/* ── Stats mini-cards row ── */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsRow}
          >
            {/* Total produits */}
            <View style={[styles.statCard, { backgroundColor: D.card, borderColor: D.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: TP.greenLight }]}>
                <Feather name="package" size={18} color={TP.green} />
              </View>
              <Text style={[styles.statValue, { color: D.text }]}>{stats.total}</Text>
              <Text style={[styles.statLabel, { color: D.muted }]}>{text.statTotal}</Text>
            </View>

            {/* En alerte */}
            <View style={[styles.statCard, { backgroundColor: D.card, borderColor: stats.enAlerte > 0 ? '#D4880F' : D.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: '#FFF6E5' }]}>
                <Feather name="alert-triangle" size={18} color="#D4880F" />
              </View>
              <Text style={[styles.statValue, { color: stats.enAlerte > 0 ? '#D4880F' : D.text }]}>{stats.enAlerte}</Text>
              <Text style={[styles.statLabel, { color: D.muted }]}>{text.statAlert}</Text>
            </View>

            {/* Expirés */}
            <View style={[styles.statCard, { backgroundColor: D.card, borderColor: stats.expires > 0 ? TP.accent : D.border }]}>
              <View style={[styles.statIconWrap, { backgroundColor: TP.dangerLight }]}>
                <Feather name="x-octagon" size={18} color={TP.accent} />
              </View>
              <Text style={[styles.statValue, { color: stats.expires > 0 ? TP.accent : D.text }]}>{stats.expires}</Text>
              <Text style={[styles.statLabel, { color: D.muted }]}>{text.statExpired}</Text>
            </View>
          </ScrollView>

          {/* ── Product cards ── */}
          {filteredProduits.length === 0 ? (
            <View style={[styles.emptyWrap, { backgroundColor: D.card, borderColor: D.border }]}>
              <Feather name="inbox" size={28} color={D.muted} style={{ marginBottom: 10 }} />
              <Text style={[styles.emptyText, { color: D.muted }]}>{text.noProduct}</Text>
            </View>
          ) : (
            <View style={styles.cardList}>
              {filteredProduits.map((item, index) => {
                const badge = getStockBadgeColor(item);
                const avatar = getAvatarColor(item);
                const cardTint = getCardTint(item, isDark);
                const stockDisplay = formatStockDisplay(item);
                const stockUnit = getStockUnit(item);
                const price = item.prixVente ?? 0;
                const initial = (item.nom || '?').charAt(0).toUpperCase();
                const categoryName = item.categorie?.nom || '—';
                const hasBarcode = !!item.codeBarre;

                const isExpired = item.estExpire;
                const isAlert = !isExpired && (item.enAlerte || item.enAlertePeremption || Number(item.stock) <= Number(item.stockAlerte));

                return (
                  <View
                    key={String(item.id || index)}
                    style={[
                      styles.productCard,
                      {
                        backgroundColor: cardTint || D.card,
                        borderColor: isExpired
                          ? TP.dangerBorder
                          : isAlert
                          ? '#F6D97B'
                          : D.border,
                        borderLeftColor: isExpired
                          ? TP.accent
                          : isAlert
                          ? '#D4880F'
                          : TP.green,
                      },
                    ]}
                  >
                    {/* LEFT — Avatar */}
                    <View style={[styles.productAvatar, { backgroundColor: avatar.bg }]}>
                      <Text style={[styles.productAvatarText, { color: avatar.text }]}>{initial}</Text>
                    </View>

                    {/* CENTER — Name + category + barcode */}
                    <View style={styles.productCenter}>
                      <Text style={[styles.productName, { color: D.text }]} numberOfLines={1}>
                        {item.nom}
                      </Text>
                      <View style={styles.productMetaRow}>
                        <Feather name="tag" size={11} color={D.muted} style={{ marginRight: 3 }} />
                        <Text style={[styles.productCategory, { color: D.muted }]} numberOfLines={1}>
                          {categoryName}
                        </Text>
                      </View>
                      {hasBarcode && (
                        <View style={styles.productBarcodeRow}>
                          <Feather name="maximize" size={10} color={D.muted} style={{ marginRight: 3 }} />
                          <Text style={[styles.productBarcode, { color: D.muted }]} numberOfLines={1}>
                            {item.codeBarre}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* RIGHT — Stock badge + price */}
                    <View style={styles.productRight}>
                      <View style={[styles.stockPill, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.stockPillText, { color: badge.color }]}>
                          {stockDisplay}{stockUnit ? ` ${stockUnit}` : ''}
                        </Text>
                      </View>
                      <Text style={[styles.productPrice, { color: D.text }]}>
                        {formatCFA(price, locale)}
                      </Text>
                    </View>

                    {/* ADMIN — Action buttons */}
                    {isAdmin && (
                      <View style={styles.productActions}>
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: D.border }]}
                          onPress={() => handleEdit(item)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          activeOpacity={0.7}
                        >
                          <Feather name="edit-2" size={14} color={TP.green} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionBtn, { borderColor: D.border }]}
                          onPress={() => handleDelete(item)}
                          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                          activeOpacity={0.7}
                        >
                          <Feather name="trash-2" size={14} color={TP.accent} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          HISTORIQUE TAB — unchanged table layout
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'historique' && (
        <View style={[styles.tableCard, { backgroundColor: D.card, borderColor: D.border }]}>

          {/* Column headers */}
          <View style={[styles.tableHeader, { borderBottomColor: D.border }]}>
            <Text style={[styles.colHeader, styles.colFlex, { color: D.muted }]}>{text.colProduct}</Text>
            <Text style={[styles.colHeader, styles.colStock, { color: D.muted }]}>{text.colStock}</Text>
            <Text style={[styles.colHeader, styles.colPrice, { color: D.muted }]}>{text.colPrice}</Text>
            <View style={styles.colMenu} />
          </View>

          {/* Rows */}
          {filteredHistorique.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Feather name="inbox" size={22} color={D.muted} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, { color: D.muted }]}>{text.noMovement}</Text>
            </View>
          ) : (
            filteredHistorique.map((item, index) => {
              const isLast = index === filteredHistorique.length - 1;
              const dateStr = new Date(item.createdAt).toLocaleDateString(locale, { day: '2-digit', month: 'short' });
              return (
                <View
                  key={String(item.id || index)}
                  style={[styles.row, !isLast && { borderBottomColor: D.border, borderBottomWidth: 1 }]}
                >
                  <View style={styles.colFlex}>
                    <Text style={[styles.rowName, { color: D.text }]} numberOfLines={1}>
                      {item.produit?.nom || text.deletedProduct}
                    </Text>
                    <Text style={[styles.rowCategory, { color: D.muted }]} numberOfLines={1}>
                      {item.fournisseur?.nom || text.noSupplier}
                    </Text>
                  </View>
                  <View style={[styles.colStock, styles.stockBadgeWrap]}>
                    <View style={[styles.stockBadge, { backgroundColor: '#E8F5ED' }]}>
                      <Text style={[styles.stockBadgeText, { color: TP.green }]}>+{item.quantite}</Text>
                    </View>
                  </View>
                  <Text style={[styles.colPrice, styles.priceText, { color: D.text }]}>
                    {formatCFA(item.prixAchat, locale)}
                  </Text>
                  <Text style={[styles.colMenu, { color: D.muted, fontSize: 12, textAlign: 'right' }]}>{dateStr}</Text>
                </View>
              );
            })
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 16,
  },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  addBtn: {
    backgroundColor: TP.green,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    shadowColor: TP.green,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnText: { color: '#fff', fontWeight: '800', fontSize: 14 },

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 40,
    padding: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 40,
  },
  tabBtnActive: { backgroundColor: TP.green },
  tabBtnText: { fontSize: 13, fontWeight: '700' },

  countText: {
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 20,
    marginBottom: 10,
  },

  // ── Stats row ──────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  statCard: {
    width: 110,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    lineHeight: 14,
  },

  // ── Product cards ──────────────────────────────────────────────────────────
  cardList: {
    marginHorizontal: 16,
    gap: 10,
    marginBottom: 16,
  },
  productCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingVertical: 14,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },

  // Avatar circle
  productAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  productAvatarText: {
    fontSize: 18,
    fontWeight: '800',
  },

  // Center info
  productCenter: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  productMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  productCategory: {
    fontSize: 12,
    flexShrink: 1,
  },
  productBarcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },
  productBarcode: {
    fontSize: 10,
    fontFamily: 'monospace',
    flexShrink: 1,
  },

  // Right: badge + price
  productRight: {
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  stockPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  stockPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  productPrice: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Admin action buttons
  productActions: {
    flexDirection: 'column',
    gap: 6,
    flexShrink: 0,
  },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Historique table (unchanged) ───────────────────────────────────────────
  tableCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  colHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },

  colFlex: { flex: 1, paddingRight: 8 },
  colStock: { width: 56, alignItems: 'center' },
  colPrice: { width: 68, textAlign: 'right' },
  colMenu: { width: 28, alignItems: 'center' },

  stockBadgeWrap: { alignItems: 'center', justifyContent: 'center' },
  stockBadge: {
    minWidth: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  stockBadgeText: { fontSize: 13, fontWeight: '800' },

  rowName: { fontSize: 14, fontWeight: '700' },
  rowCategory: { fontSize: 12, marginTop: 2 },
  priceText: { fontSize: 13, fontWeight: '600' },

  emptyWrap: {
    paddingVertical: 32,
    alignItems: 'center',
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  emptyText: { fontSize: 14 },
});
