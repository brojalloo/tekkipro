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
import { createClient, deleteClient, getClients, updateClient } from '../lib/api';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { TP, DARK_THEME } from '../theme/tokens';
import StatCard from '../components/StatCard';
import { getAvatarColorByName } from '../utils/avatarColor';

const EMPTY_FORM = { nom: '', prenom: '', telephone: '', adresse: '' };
const formatCFA = (value, locale) => `${(value || 0).toLocaleString(locale)} CFA`;
const CLIENT_PLAN_LIMITS = { GRATUIT: 30, PRO: null, BUSINESS: null };

const CLIENT_TEXT = {
  fr: {
    initialFallback: 'C', phoneMissing: 'Téléphone non renseigné', edit: 'Modifier', delete: 'Supprimer',
    salesCount: (count) => `${count} vente(s)`, debtAmount: (value, locale) => `${formatCFA(value, locale)} de dette`,
    errorTitle: 'Erreur', loadError: 'Impossible de charger les clients.', validationTitle: 'Validation', requiredName: 'Le nom du client est obligatoire.',
    successTitle: 'Succès', updateSuccess: 'Client mis à jour.', createSuccess: 'Client ajouté.', saveError: "Impossible d'enregistrer ce client.",
    deleteTitle: 'Supprimer ce client ?', deleteSuccess: 'Client supprimé.', deleteError: 'Impossible de supprimer ce client.',
    cancel: 'Annuler', headerBadge: 'Relation client', title: 'Clients', subtitle: "Carnet client, ventes et dettes en un coup d'œil",
    addClient: 'Ajouter un client', totalClients: 'Clients', withDebt: 'Avec dette', relatedSales: 'Ventes liées', cumulativeDebt: 'Dette cumulée',
    searchPlaceholder: 'Rechercher un client, téléphone, adresse...', empty: 'Aucun client trouvé',
    editModalTitle: 'Modifier le client', createModalTitle: 'Nouveau client', modalSubtitle: 'Renseigne les informations principales du client.',
    nameLabel: 'Nom *', firstNameLabel: 'Prénom', phoneLabel: 'Téléphone', addressLabel: 'Adresse',
    namePlaceholder: 'Nom', firstNamePlaceholder: 'Prénom', phonePlaceholder: '77 123 45 67', addressPlaceholder: 'Adresse / quartier',
    saving: 'Enregistrement…', updateAction: 'Mettre à jour', createAction: 'Créer', viewPlans: 'Voir les abonnements',
    planLimitTitle: 'Limite Starter', planLimitUsage: (count, limit) => `${count} / ${limit} clients`,
    planLimitHint: 'La base clients est plafonnée sur Starter. Passe au plan Pro pour continuer à grandir.',
  },
  en: {
    initialFallback: 'C', phoneMissing: 'Phone not provided', edit: 'Edit', delete: 'Delete',
    salesCount: (count) => `${count} sale(s)`, debtAmount: (value, locale) => `${formatCFA(value, locale)} debt`,
    errorTitle: 'Error', loadError: 'Unable to load clients.', validationTitle: 'Validation', requiredName: 'Client name is required.',
    successTitle: 'Success', updateSuccess: 'Client updated.', createSuccess: 'Client added.', saveError: 'Unable to save this client.',
    deleteTitle: 'Delete this client?', deleteSuccess: 'Client deleted.', deleteError: 'Unable to delete this client.',
    cancel: 'Cancel', headerBadge: 'Customer relationship', title: 'Clients', subtitle: 'Customer records, sales and debts at a glance',
    addClient: 'Add client', totalClients: 'Clients', withDebt: 'With debt', relatedSales: 'Linked sales', cumulativeDebt: 'Total debt',
    searchPlaceholder: 'Search by client, phone, address...', empty: 'No client found',
    editModalTitle: 'Edit client', createModalTitle: 'New client', modalSubtitle: "Fill in the client's main information.",
    nameLabel: 'Name *', firstNameLabel: 'First name', phoneLabel: 'Phone', addressLabel: 'Address',
    namePlaceholder: 'Name', firstNamePlaceholder: 'First name', phonePlaceholder: '77 123 45 67', addressPlaceholder: 'Address / area',
    saving: 'Saving…', updateAction: 'Update', createAction: 'Create', viewPlans: 'View plans',
    planLimitTitle: 'Starter limit', planLimitUsage: (count, limit) => `${count} / ${limit} clients`,
    planLimitHint: 'The client base is capped on Starter. Upgrade to Pro to keep growing.',
  },
};


function ClientItem({ item, canDelete, onEdit, onDelete, text, locale, isDark, themeColors }) {
  const initials = `${item.prenom?.[0] || ''}${item.nom?.[0] || ''}`.trim().toUpperCase() || text.initialFallback;
  const helperText = item.adresse || null;
  const avatarColor = getAvatarColorByName(initials);

  return (
    <View style={[styles.item, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
      <View style={styles.itemTop}>
        <View style={[
          styles.avatar,
          { backgroundColor: avatarColor.bg, borderColor: avatarColor.border },
          isDark && { backgroundColor: themeColors.accentBg, borderColor: 'rgba(255,214,0,0.35)' },
        ]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }, isDark && { color: themeColors.accentText }]}>{initials}</Text>
        </View>
        <View style={styles.itemMain}>
          <Text style={[styles.itemName, isDark && { color: themeColors.text }]}>{item.prenom} {item.nom}</Text>
          <View style={styles.metaRow}>
            <Feather name="phone" size={13} color={isDark ? themeColors.faint : TP.muted} />
            <Text style={[styles.itemMeta, isDark && { color: themeColors.muted }]}>{item.telephone || text.phoneMissing}</Text>
          </View>
        </View>
      </View>

      <View style={styles.badgesRow}>
        <View style={[styles.badge, styles.badgeGreen, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Feather name="shopping-bag" size={12} color={TP.green} />
          <Text numberOfLines={1} style={[styles.badgeText, styles.badgeTextGreen, isDark && { color: themeColors.accentText }]}>
            {text.salesCount(item.nombreVentes || 0)}
          </Text>
        </View>
        <View style={[
          styles.badge,
          item.totalDettes > 0 ? styles.badgeDanger : styles.badgeGold,
          isDark && !item.totalDettes && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder },
          isDark && item.totalDettes > 0 && { backgroundColor: 'rgba(220,38,38,0.12)', borderColor: 'rgba(220,38,38,0.25)' },
        ]}>
          <Feather name="credit-card" size={12} color={item.totalDettes > 0 ? TP.danger : '#C47D0A'} />
          <Text numberOfLines={1} style={[styles.badgeText, item.totalDettes > 0 ? styles.badgeTextDanger : styles.badgeTextGold, isDark && !item.totalDettes && { color: themeColors.accentText }]}>
            {text.debtAmount(item.totalDettes || 0, locale)}
          </Text>
        </View>
      </View>

      {helperText ? (
        <View style={[styles.helperNotice, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Feather name="map-pin" size={13} color={isDark ? themeColors.faint : TP.muted} />
          <Text style={[styles.helperNoticeText, isDark && { color: themeColors.muted }]}>{helperText}</Text>
        </View>
      ) : null}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.smallActionBtn, styles.smallActionBtnEdit, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
          onPress={() => onEdit(item)}
        >
          <Feather name="edit-2" size={15} color={isDark ? themeColors.accentText : TP.green} />
          <Text style={[styles.smallActionBtnText, styles.smallActionBtnTextEdit, isDark && { color: themeColors.accentText }]}>{text.edit}</Text>
        </TouchableOpacity>
        {canDelete ? (
          <TouchableOpacity
            style={[styles.smallActionBtn, styles.smallActionBtnDelete, isDark && { backgroundColor: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.2)' }]}
            onPress={() => onDelete(item)}
          >
            <Feather name="trash-2" size={15} color={TP.danger} />
            <Text style={[styles.smallActionBtnText, styles.smallActionBtnTextDelete]}>{text.delete}</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function ClientsScreen({ navigation }) {
  const { plan, user } = useAuth();
  const { language, locale } = useI18n();
  const { isDark } = useTheme();
  const themeColors = isDark ? DARK_THEME : null;
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const text = CLIENT_TEXT[language] || CLIENT_TEXT.fr;

  const loadClients = async () => {
    try {
      const { data } = await getClients();
      if (data.success) setClients(data.data || []);
    } catch (error) {
      Alert.alert(text.errorTitle, getApiErrorMessage(error, { language, fallback: text.loadError }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadClients(); }, []);

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;

    return clients.filter((client) => {
      const fullName = `${client.prenom || ''} ${client.nom || ''}`.toLowerCase();
      return fullName.includes(q)
        || client.telephone?.toLowerCase().includes(q)
        || client.adresse?.toLowerCase().includes(q);
    });
  }, [clients, search]);

  const stats = useMemo(() => ({
    total: clients.length,
    withDebt: clients.filter((client) => (client.totalDettes || 0) > 0).length,
    totalSales: clients.reduce((sum, client) => sum + (client.nombreVentes || 0), 0),
    totalDebt: clients.reduce((sum, client) => sum + (client.totalDettes || 0), 0),
  }), [clients]);

  const clientLimit = CLIENT_PLAN_LIMITS[plan] ?? null;
  const clientUsagePercent = clientLimit ? Math.min(100, Math.round((stats.total / clientLimit) * 100)) : 0;
  const clientLimitTone = clientUsagePercent >= 90 ? TP.danger : clientUsagePercent >= 70 ? TP.gold : TP.green;
  const placeholderTextColor = isDark ? themeColors.faint : '#94a3b8';

  const openCreate = () => {
    setEditingClient(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setForm({
      nom: client.nom || '',
      prenom: client.prenom || '',
      telephone: client.telephone || '',
      adresse: client.adresse || '',
    });
    setShowModal(true);
  };

  const handleSubmit = async () => {
    if (!form.nom.trim()) {
      Alert.alert(text.validationTitle, text.requiredName);
      return;
    }

    setSubmitting(true);
    try {
      let response;
      if (editingClient) {
        response = await updateClient(editingClient.id, form);
        Alert.alert(text.successTitle, getApiSuccessMessage(response, { language, fallback: getLocalSuccessMessage({ language, entity: 'client', action: 'update' }) }));
      } else {
        response = await createClient(form);
        Alert.alert(text.successTitle, getApiSuccessMessage(response, { language, fallback: getLocalSuccessMessage({ language, entity: 'client', action: 'create' }) }));
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingClient(null);
      await loadClients();
    } catch (error) {
      const message = getApiErrorMessage(error, { language, fallback: text.saveError });
      if (error.response?.data?.upgrade) {
        Alert.alert(text.errorTitle, message, [
          { text: text.cancel, style: 'cancel' },
          { text: text.viewPlans, onPress: () => navigation.navigate('Abonnement') },
        ]);
      } else {
        Alert.alert(text.errorTitle, message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (client) => {
    Alert.alert(
      text.deleteTitle,
      `${client.prenom || ''} ${client.nom}`.trim(),
      [
        { text: text.cancel, style: 'cancel' },
        {
          text: text.delete,
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteClient(client.id);
              await loadClients();
              Alert.alert(text.successTitle, getApiSuccessMessage(response, { language, fallback: getLocalSuccessMessage({ language, entity: 'client', action: 'delete' }) }));
            } catch (error) {
              Alert.alert(text.errorTitle, getApiErrorMessage(error, { language, fallback: text.deleteError }));
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={TP.green} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <FlatList
        data={filteredClients}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <ClientItem
            item={item}
            canDelete={user?.role === 'ADMIN'}
            onEdit={openEdit}
            onDelete={handleDelete}
            text={text}
            locale={locale}
            isDark={isDark}
            themeColors={themeColors}
          />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadClients(); }}
            tintColor={isDark ? themeColors.accentText : TP.green}
            colors={[TP.green]}
            progressBackgroundColor={isDark ? themeColors.headerBg : undefined}
          />
        }
        ListHeaderComponent={(
          <>
            {/* Header */}
            <View style={[styles.header, isDark && { backgroundColor: themeColors.headerBg }]}>
              <View style={styles.headerTop}>
                <View>
                  <View style={styles.headerBadge}>
                    <Feather name="users" size={13} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.headerBadgeText}>{text.headerBadge}</Text>
                  </View>
                  <Text style={styles.title}>{text.title}</Text>
                  <Text style={styles.subtitle}>{text.subtitle}</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
                  <Feather name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Plan limit banner */}
            {clientLimit ? (
              <View style={[styles.limitBanner, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
                <View style={styles.limitBannerTop}>
                  <View>
                    <Text style={[styles.limitBannerTitle, isDark && { color: themeColors.text }]}>{text.planLimitTitle}</Text>
                    <Text style={[styles.limitBannerUsage, { color: clientLimitTone }]}>{text.planLimitUsage(stats.total, clientLimit)}</Text>
                  </View>
                  {clientUsagePercent >= 90 ? (
                    <TouchableOpacity
                      style={[styles.limitBannerBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                      onPress={() => navigation.navigate('Abonnement')}
                    >
                      <Text style={[styles.limitBannerBtnText, isDark && { color: themeColors.accentText }]}>{text.viewPlans}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
                <Text style={[styles.limitBannerHint, isDark && { color: themeColors.muted }]}>{text.planLimitHint}</Text>
                <View style={[styles.limitBarTrack, isDark && { backgroundColor: '#1b2637' }]}>
                  <View style={[styles.limitBarFill, { width: `${clientUsagePercent}%`, backgroundColor: clientLimitTone }]} />
                </View>
              </View>
            ) : null}

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <StatCard label={text.totalClients} value={stats.total} tone={TP.greenLight} icon="users" accent={TP.green} isDark={isDark} themeColors={themeColors} />
              <StatCard label={text.withDebt} value={stats.withDebt} tone="rgba(220,38,38,0.1)" icon="alert-circle" accent={TP.danger} isDark={isDark} themeColors={themeColors} />
              <StatCard label={text.relatedSales} value={stats.totalSales} tone={TP.greenLight} icon="shopping-bag" accent={TP.green} isDark={isDark} themeColors={themeColors} />
              <StatCard label={text.cumulativeDebt} value={formatCFA(stats.totalDebt, locale)} tone={TP.goldLight} icon="credit-card" accent={TP.gold} isDark={isDark} themeColors={themeColors} />
            </View>

            {/* Search bar */}
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
            </View>
          </>
        )}
        ListEmptyComponent={<Text style={[styles.empty, isDark && { color: themeColors.muted }]}>{text.empty}</Text>}
        contentContainerStyle={styles.list}
      />

      {/* Add / Edit modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <View style={[styles.modalOverlay, isDark && { backgroundColor: themeColors.overlay }]}>
          <View style={[styles.modalCard, isDark && { backgroundColor: themeColors.headerBg }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={[styles.modalHandle, isDark && { backgroundColor: '#243041' }]} />
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalTitleIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}>
                  <Feather name={editingClient ? 'edit-2' : 'user-plus'} size={18} color={isDark ? themeColors.accentText : TP.green} />
                </View>
                <Text style={[styles.modalTitle, isDark && { color: themeColors.text }]}>{editingClient ? text.editModalTitle : text.createModalTitle}</Text>
              </View>
              <Text style={[styles.modalSubtitle, isDark && { color: themeColors.muted }]}>{text.modalSubtitle}</Text>

              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.nameLabel}</Text>
              <TextInput
                value={form.nom}
                onChangeText={(nom) => setForm((prev) => ({ ...prev, nom }))}
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                placeholder={text.namePlaceholder}
                placeholderTextColor={placeholderTextColor}
              />

              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.firstNameLabel}</Text>
              <TextInput
                value={form.prenom}
                onChangeText={(prenom) => setForm((prev) => ({ ...prev, prenom }))}
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                placeholder={text.firstNamePlaceholder}
                placeholderTextColor={placeholderTextColor}
              />

              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.phoneLabel}</Text>
              <TextInput
                value={form.telephone}
                onChangeText={(telephone) => setForm((prev) => ({ ...prev, telephone }))}
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                placeholder={text.phonePlaceholder}
                placeholderTextColor={placeholderTextColor}
                keyboardType="phone-pad"
              />

              <Text style={[styles.fieldLabel, isDark && { color: themeColors.text }]}>{text.addressLabel}</Text>
              <TextInput
                value={form.adresse}
                onChangeText={(adresse) => setForm((prev) => ({ ...prev, adresse }))}
                style={[styles.input, styles.textarea, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                placeholder={text.addressPlaceholder}
                placeholderTextColor={placeholderTextColor}
                multiline
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                  onPress={() => setShowModal(false)}
                >
                  <Feather name="x" size={14} color={isDark ? themeColors.accentText : TP.muted} />
                  <Text style={[styles.secondaryBtnText, isDark && { color: themeColors.accentText }]}>{text.cancel}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, isDark && { backgroundColor: themeColors.accentBg, borderColor: TP.greenBorder }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  <Feather name={editingClient ? 'check-circle' : 'plus-circle'} size={16} color="#fff" />
                  <Text style={styles.primaryActionBtnText}>
                    {submitting ? text.saving : editingClient ? text.updateAction : text.createAction}
                  </Text>
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
  headerTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
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
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 13, marginTop: 4 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: TP.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TP.green,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 4,
  },

  // Limit banner
  limitBanner: {
    marginHorizontal: 14,
    marginTop: 14,
    marginBottom: 4,
    backgroundColor: TP.cardBg,
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  limitBannerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  limitBannerTitle: { fontSize: 14, fontWeight: '800', color: TP.text },
  limitBannerUsage: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  limitBannerHint: { fontSize: 12, lineHeight: 17, color: TP.muted, marginTop: 8, marginBottom: 10 },
  limitBarTrack: { height: 6, borderRadius: 999, backgroundColor: '#E5E7EB', overflow: 'hidden' },
  limitBarFill: { height: '100%', borderRadius: 999 },
  limitBannerBtn: {
    backgroundColor: TP.greenLight,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: TP.greenBorder,
  },
  limitBannerBtnText: { color: TP.green, fontWeight: '800', fontSize: 12 },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: 14, zIndex: 2 },

  // Search
  toolbar: { paddingHorizontal: 14, marginTop: 12, marginBottom: 4 },
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
  badgeDanger: { backgroundColor: TP.dangerLight, borderColor: TP.dangerBorder },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextGreen: { color: TP.green },
  badgeTextGold: { color: '#C47D0A' },
  badgeTextDanger: { color: TP.danger },

  // Helper notice
  helperNotice: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: TP.screenBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  helperNoticeText: { flex: 1, color: TP.muted, fontSize: 12, lineHeight: 18 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  smallActionBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
  },
  smallActionBtnEdit: { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
  smallActionBtnDelete: { backgroundColor: TP.dangerLight, borderColor: TP.dangerBorder },
  smallActionBtnText: { fontWeight: '800', fontSize: 13 },
  smallActionBtnTextEdit: { color: TP.green },
  smallActionBtnTextDelete: { color: TP.danger },

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
  modalHandle: {
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginBottom: 14,
  },
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
  fieldLabel: { fontSize: 13, fontWeight: '700', color: TP.text, marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    padding: 12,
    color: TP.text,
  },
  textarea: { minHeight: 90, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20, gap: 10 },
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
