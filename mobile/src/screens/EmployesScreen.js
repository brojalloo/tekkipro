import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import {
  createEmployee,
  deleteEmployee,
  getEmployees,
  toggleEmployee,
  updateEmployee,
} from '../lib/api';
import { getApiErrorMessage } from '@tekkipro/shared/apiError';
import { getApiSuccessMessage } from '@tekkipro/shared/apiSuccess';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { TP, DARK_THEME } from '../theme/tokens';
import StatCard from '../components/StatCard';
import { getAvatarColorByName } from '../utils/avatarColor';

const EMPTY_FORM = {
  nom: '',
  prenom: '',
  email: '',
  password: '',
  telephone: '',
  role: 'EMPLOYE',
};

const ROLE_OPTIONS = [
  {
    value: 'EMPLOYE',
    labelKey: 'common.employee',
    helpKey: 'employees.employeeRoleHint',
    icon: 'user',
    tint: TP.green,
  },
  {
    value: 'ADMIN',
    labelKey: 'common.admin',
    helpKey: 'employees.adminRoleHint',
    icon: 'shield',
    tint: TP.accent,
  },
];


function RoleOption({ option, active, disabled, onPress, isDark, themeColors }) {
  const { t } = useI18n();

  return (
    <TouchableOpacity
      style={[
        styles.roleOption,
        isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder },
        active && styles.roleOptionActive,
        isDark && active && { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
        disabled && styles.roleOptionDisabled,
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[
        styles.roleOptionIcon,
        isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder },
        active && styles.roleOptionIconActive,
        isDark && active && { backgroundColor: themeColors.accentBg, borderColor: TP.greenBorder },
      ]}>
        <Feather name={option.icon} size={15} color={active ? TP.accent : (isDark ? themeColors.muted : option.tint)} />
      </View>
      <View style={styles.roleOptionContent}>
        <Text style={[
          styles.roleOptionLabel,
          isDark && { color: themeColors.text },
          active && styles.roleOptionLabelActive,
          isDark && active && { color: '#FDBA74' },
        ]}>
          {t(option.labelKey)}
        </Text>
        <Text style={[styles.roleOptionHelp, isDark && { color: themeColors.muted }]}>{t(option.helpKey)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function EmployeItem({ item, onToggle, onEdit, onDelete, isDark, themeColors }) {
  const { t } = useI18n();
  const initials = `${item.prenom?.[0] || ''}${item.nom?.[0] || ''}`.trim().toUpperCase() || 'E';
  const avatarColor = getAvatarColorByName(initials);
  const isAdmin = item.role === 'ADMIN';
  const canDelete = item.peutSupprimer !== false;
  const toggleDisabled = item.isCurrentUser;
  const helperText = item.isCurrentUser
    ? t('employees.selfHint')
    : item.nombreVentes > 0
      ? t('employees.salesLockedHint', { count: item.nombreVentes })
      : null;

  return (
    <View style={[styles.item, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
      <View style={styles.itemTop}>
        <View style={[
          styles.avatar,
          { backgroundColor: avatarColor.bg, borderColor: avatarColor.border },
          isDark && { backgroundColor: themeColors.accentBg, borderColor: TP.greenBorder },
        ]}>
          <Text style={[styles.avatarText, { color: avatarColor.text }, isDark && { color: themeColors.accentText }]}>{initials}</Text>
        </View>
        <View style={styles.itemMain}>
          <Text style={[styles.itemName, isDark && { color: themeColors.text }]}>{item.prenom} {item.nom}</Text>
          <View style={styles.metaRow}>
            <Feather name="mail" size={13} color={isDark ? themeColors.faint : TP.muted} />
            <Text style={[styles.itemMeta, isDark && { color: themeColors.muted }]}>{item.email}</Text>
          </View>
          <View style={styles.metaRow}>
            <Feather name="phone" size={13} color={isDark ? themeColors.faint : TP.muted} />
            <Text style={[styles.itemMeta, isDark && { color: themeColors.muted }]}>{item.telephone || t('employees.phoneMissing')}</Text>
          </View>
        </View>
      </View>

      {/* Role + status badges */}
      <View style={styles.badgesRow}>
        {/* Role badge — terracotta for admin, green for employee */}
        <View style={[
          styles.badge,
          isAdmin ? styles.badgeTerracotta : styles.badgeGreen,
          isDark && !isAdmin && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder },
          isDark && isAdmin && { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
        ]}>
          <Feather name={isAdmin ? 'shield' : 'user'} size={12} color={isAdmin ? TP.accent : TP.green} />
          <Text style={[styles.badgeText, isAdmin ? styles.badgeTextTerracotta : styles.badgeTextGreen, isDark && !isAdmin && { color: themeColors.muted }]}>
            {isAdmin ? t('common.admin') : t('common.employee')}
          </Text>
        </View>

        {/* Active status dot */}
        <View style={[
          styles.badge,
          item.actif ? styles.badgeGreenStatus : styles.badgeDanger,
          isDark && item.actif && { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
          isDark && !item.actif && { backgroundColor: 'rgba(220,38,38,0.12)', borderColor: 'rgba(220,38,38,0.25)' },
        ]}>
          <View style={[styles.statusDot, { backgroundColor: item.actif ? TP.green : TP.danger }]} />
          <Text style={[styles.badgeText, item.actif ? styles.badgeTextGreen : styles.badgeTextDanger]}>
            {item.actif ? t('common.active') : t('common.disabled')}
          </Text>
        </View>

        {item.isCurrentUser && (
          <View style={[styles.badge, styles.badgeGold, isDark && { backgroundColor: themeColors.accentBg, borderColor: TP.goldBorder }]}>
            <Feather name="star" size={12} color="#C47D0A" />
            <Text style={[styles.badgeText, styles.badgeTextGold, isDark && { color: themeColors.accentText }]}>{t('common.myAccount')}</Text>
          </View>
        )}

        {item.nombreVentes > 0 && (
          <View style={[styles.badge, styles.badgeGold, isDark && { backgroundColor: themeColors.warningBg, borderColor: themeColors.warningBorder }]}>
            <Feather name="shopping-bag" size={12} color="#C47D0A" />
            <Text style={[styles.badgeText, styles.badgeTextGold]}>{t('common.salesCount', { count: item.nombreVentes })}</Text>
          </View>
        )}
      </View>

      {helperText && (
        <View style={[styles.helperNotice, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}>
          <Feather name="info" size={13} color={isDark ? themeColors.faint : TP.muted} />
          <Text style={[styles.helperNoticeText, isDark && { color: themeColors.muted }]}>{helperText}</Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.smallActionBtn, styles.smallActionBtnEdit, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
          onPress={() => onEdit(item)}
        >
          <Feather name="edit-2" size={15} color={isDark ? themeColors.accentText : TP.accent} />
          <Text style={[styles.smallActionBtnText, styles.smallActionBtnTextEdit, isDark && { color: themeColors.accentText }]}>{t('common.edit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.smallActionBtn,
            canDelete ? styles.smallActionBtnDelete : styles.smallActionBtnDisabled,
            isDark && canDelete && { backgroundColor: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.2)' },
            isDark && !canDelete && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder },
          ]}
          onPress={() => onDelete(item)}
          disabled={!canDelete}
        >
          <Feather name="trash-2" size={15} color={canDelete ? TP.danger : '#94a3b8'} />
          <Text style={[styles.smallActionBtnText, canDelete ? styles.smallActionBtnTextDelete : styles.smallActionBtnTextDisabled]}>
            {t('common.delete')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.toggleBtn,
          item.actif ? styles.toggleBtnDanger : styles.toggleBtnNeutral,
          isDark && item.actif && { backgroundColor: 'rgba(220,38,38,0.1)', borderColor: 'rgba(220,38,38,0.2)' },
          isDark && !item.actif && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder },
          toggleDisabled && styles.toggleBtnDisabled,
        ]}
        onPress={() => onToggle(item)}
        disabled={toggleDisabled}
      >
        <Feather
          name={item.actif ? 'user-x' : 'user-check'}
          size={15}
          color={item.actif ? TP.danger : (isDark ? themeColors.accentText : TP.green)}
        />
        <Text style={[
          styles.toggleBtnText,
          item.actif ? styles.toggleBtnTextDanger : styles.toggleBtnTextNeutral,
          isDark && !item.actif && { color: themeColors.accentText },
        ]}>
          {item.actif ? t('common.disable') : t('common.enable')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function EmployesScreen({ navigation }) {
  const { user, plan } = useAuth();
  const { language, t } = useI18n();
  const { isDark } = useTheme();
  const themeColors = isDark ? DARK_THEME : null;
  const [employes, setEmployes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === 'ADMIN';
  const isProPlan = plan === 'PRO' || plan === 'BUSINESS';
  const isEditMode = modalMode === 'edit';
  const isEditingSelf = !!selectedEmployee?.isCurrentUser;
  const placeholderTextColor = isDark ? themeColors.faint : '#94a3b8';

  useEffect(() => {
    navigation.setOptions?.({
      headerStyle: { backgroundColor: isDark ? themeColors.headerBg : TP.headerBg },
      headerTintColor: '#fff',
      headerTitleStyle: { color: '#fff' },
    });
  }, [isDark, navigation, themeColors]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setModalMode('create');
    setSelectedEmployee(null);
    setForm(EMPTY_FORM);
  }, []);

  const openCreateModal = useCallback(() => {
    setModalMode('create');
    setSelectedEmployee(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }, []);

  const openEditModal = useCallback((item) => {
    setModalMode('edit');
    setSelectedEmployee(item);
    setForm({
      nom: item.nom || '',
      prenom: item.prenom || '',
      email: item.email || '',
      password: '',
      telephone: item.telephone || '',
      role: item.role || 'EMPLOYE',
    });
    setShowModal(true);
  }, []);

  const loadEmployees = useCallback(async () => {
    if (!isAdmin || !isProPlan) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const { data } = await getEmployees();
      if (data.success) setEmployes(data.data || []);
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, { language, fallback: t('employees.loadError') }));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, isProPlan, language, t]);

  useFocusEffect(useCallback(() => {
    loadEmployees();
  }, [loadEmployees]));

  const filteredEmployes = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return employes;
    return employes.filter((item) => (
      `${item.prenom || ''} ${item.nom || ''}`.toLowerCase().includes(q)
      || item.email?.toLowerCase().includes(q)
      || item.telephone?.toLowerCase().includes(q)
    ));
  }, [employes, search]);

  const stats = useMemo(() => ({
    total: employes.length,
    active: employes.filter((item) => item.actif).length,
    inactive: employes.filter((item) => !item.actif).length,
    admins: employes.filter((item) => item.role === 'ADMIN').length,
  }), [employes]);

  const handleSubmit = async () => {
    if (!form.prenom.trim() || !form.nom.trim() || !form.email.trim()) {
      Alert.alert(t('common.validation'), t('employees.requiredFields'));
      return;
    }

    if (!isEditMode && !form.password.trim()) {
      Alert.alert(t('common.validation'), t('employees.createPasswordRequired'));
      return;
    }

    if (form.password.trim() && form.password.trim().length < 6) {
      Alert.alert(t('common.validation'), t('employees.passwordTooShort'));
      return;
    }

    const payload = {
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      email: form.email.trim(),
      telephone: form.telephone.trim(),
      role: form.role,
    };

    if (!isEditMode || form.password.trim()) {
      payload.password = form.password.trim();
    }

    setSubmitting(true);
    try {
      let response;
      if (isEditMode) {
        response = await updateEmployee(selectedEmployee.id, payload);
      } else {
        response = await createEmployee(payload);
      }
      closeModal();
      await loadEmployees();
      Alert.alert(t('common.success'), getApiSuccessMessage(response, { language, fallback: isEditMode ? t('employees.updateSuccess') : t('employees.createSuccess') }));
    } catch (error) {
      Alert.alert(t('common.error'), getApiErrorMessage(error, { language, fallback: t('employees.saveError') }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggle = (item) => {
    if (item.isCurrentUser) {
      Alert.alert(t('common.error'), t('employees.selfDisableBlocked'));
      return;
    }

    Alert.alert(
      item.actif ? t('employees.toggleDisableTitle') : t('employees.toggleEnableTitle'),
      `${item.prenom || ''} ${item.nom || ''}`.trim(),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: item.actif ? t('common.disable') : t('common.enable'),
          style: item.actif ? 'destructive' : 'default',
          onPress: async () => {
            try {
              const response = await toggleEmployee(item.id);
              await loadEmployees();
              Alert.alert(t('common.success'), getApiSuccessMessage(response, { language, fallback: item.actif ? t('employees.toggleDisabledSuccess') : t('employees.toggleEnabledSuccess') }));
            } catch (error) {
              Alert.alert(t('common.error'), getApiErrorMessage(error, { language, fallback: t('employees.updateError') }));
            }
          },
        },
      ],
    );
  };

  const handleDelete = (item) => {
    if (item.isCurrentUser) {
      Alert.alert(t('common.error'), t('employees.selfDeleteBlocked'));
      return;
    }

    if (item.nombreVentes > 0) {
      Alert.alert(t('common.error'), t('employees.salesDeleteBlocked'));
      return;
    }

    Alert.alert(
      t('employees.deleteTitle'),
      `${item.prenom || ''} ${item.nom || ''}`.trim(),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await deleteEmployee(item.id);
              await loadEmployees();
              Alert.alert(t('common.success'), getApiSuccessMessage(response, { language, fallback: t('employees.deleteSuccess') }));
            } catch (error) {
              Alert.alert(t('common.error'), getApiErrorMessage(error, { language, fallback: t('employees.deleteError') }));
            }
          },
        },
      ],
    );
  };

  if (!isAdmin) {
    return (
      <View style={[styles.centeredState, isDark && { backgroundColor: themeColors.background }]}>
        <View style={styles.lockIconWrap}>
          <Feather name="shield-off" size={24} color={TP.danger} />
        </View>
        <Text style={[styles.lockTitle, isDark && { color: themeColors.text }]}>{t('employees.accessAdminTitle')}</Text>
        <Text style={[styles.lockText, isDark && { color: themeColors.muted }]}>{t('employees.accessAdminText')}</Text>
        <TouchableOpacity style={styles.primaryCta} onPress={() => navigation.goBack()}>
          <Text style={styles.primaryCtaText}>{t('common.back')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!isProPlan) {
    return (
      <View style={[styles.centeredState, isDark && { backgroundColor: themeColors.background }]}>
        <View style={[styles.lockIconWrap, styles.upgradeIconWrap]}>
          <Feather name="lock" size={24} color={TP.accent} />
        </View>
        <Text style={[styles.lockTitle, isDark && { color: themeColors.text }]}>{t('employees.proTitle')}</Text>
        <Text style={[styles.lockText, isDark && { color: themeColors.muted }]}>{t('employees.proText')}</Text>
        <TouchableOpacity style={styles.primaryCta} onPress={() => navigation.navigate('Abonnement')}>
          <Text style={styles.primaryCtaText}>{t('employees.viewSubscriptions')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.centered, isDark && { backgroundColor: themeColors.background }]}>
        <ActivityIndicator size="large" color={TP.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, isDark && { backgroundColor: themeColors.background }]}>
      <FlatList
        data={filteredEmployes}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <EmployeItem item={item} onToggle={handleToggle} onEdit={openEditModal} onDelete={handleDelete} isDark={isDark} themeColors={themeColors} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); loadEmployees(); }}
            tintColor={isDark ? themeColors.accentText : TP.accent}
            colors={[TP.accent]}
            progressBackgroundColor={isDark ? DARK_THEME.headerBg : undefined}
          />
        }
        ListHeaderComponent={(
          <>
            {/* Header */}
            <View style={[styles.header, isDark && { backgroundColor: themeColors.headerBg }]}>
              <View style={styles.headerTop}>
                <View style={{ flex: 1 }}>
                  <View style={styles.headerBadge}>
                    <Feather name="user-check" size={13} color="rgba(255,255,255,0.7)" />
                    <Text style={styles.headerBadgeText}>{t('employees.teamManagement')}</Text>
                  </View>
                  <Text style={styles.title}>{t('employees.title')}</Text>
                  <Text style={styles.subtitle}>{t('employees.subtitle')}</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={openCreateModal}>
                  <Feather name="plus" size={18} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats */}
            <View style={styles.statsGrid}>
              <StatCard label={t('employees.users')} value={stats.total} icon="users" tone={TP.greenLight} accent={TP.accent} isDark={isDark} themeColors={themeColors} />
              <StatCard label={t('employees.activeUsers')} value={stats.active} icon="check-circle" tone={TP.greenLight} accent={TP.green} isDark={isDark} themeColors={themeColors} />
              <StatCard label={t('employees.inactiveUsers')} value={stats.inactive} icon="x-circle" tone="rgba(220,38,38,0.1)" accent={TP.danger} isDark={isDark} themeColors={themeColors} />
              <StatCard label={t('employees.admins')} value={stats.admins} icon="shield" tone={TP.goldLight} accent="#C47D0A" isDark={isDark} themeColors={themeColors} />
            </View>

            {/* Search */}
            <View style={styles.toolbar}>
              <View style={[styles.searchWrap, isDark && { backgroundColor: themeColors.cardBg, borderColor: themeColors.cardBorder, shadowOpacity: 0 }]}>
                <Feather name="search" size={16} color={isDark ? themeColors.faint : TP.muted} />
                <TextInput
                  value={search}
                  onChangeText={setSearch}
                  placeholder={t('employees.searchPlaceholder')}
                  style={[styles.searchInput, isDark && { color: themeColors.text }]}
                  placeholderTextColor={placeholderTextColor}
                />
              </View>
            </View>
          </>
        )}
        ListEmptyComponent={<Text style={[styles.empty, isDark && { color: themeColors.muted }]}>{t('employees.empty')}</Text>}
        contentContainerStyle={styles.list}
      />

      {/* Add / Edit modal */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={[styles.modalOverlay, isDark && { backgroundColor: themeColors.overlay }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
        >
          <View style={[styles.modalCard, isDark && { backgroundColor: themeColors.headerBg }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.modalScrollContent}
            >
              <View style={[styles.modalHandle, isDark && { backgroundColor: '#243041' }]} />
              <View style={styles.modalTitleRow}>
                <View style={[styles.modalIconWrap, isDark && { backgroundColor: themeColors.accentBg }]}>
                  <Feather name={isEditMode ? 'edit-2' : 'user-plus'} size={18} color={isDark ? themeColors.accentText : TP.accent} />
                </View>
                <Text style={[styles.modalTitle, isDark && { color: themeColors.text }]}>
                  {isEditMode ? t('employees.editEmployee') : t('employees.addEmployeeTitle')}
                </Text>
              </View>
              <Text style={[styles.modalSubtitle, isDark && { color: themeColors.muted }]}>
                {isEditMode ? t('employees.editEmployeeHint') : t('employees.addEmployeeHint')}
              </Text>

              <Text style={[styles.label, isDark && { color: themeColors.text }]}>{t('employees.firstName')}</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                value={form.prenom}
                onChangeText={(v) => setForm((prev) => ({ ...prev, prenom: v }))}
                placeholder="Ex: Awa"
                placeholderTextColor={placeholderTextColor}
              />

              <Text style={[styles.label, isDark && { color: themeColors.text }]}>{t('employees.lastName')}</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                value={form.nom}
                onChangeText={(v) => setForm((prev) => ({ ...prev, nom: v }))}
                placeholder="Ex: Diop"
                placeholderTextColor={placeholderTextColor}
              />

              <Text style={[styles.label, isDark && { color: themeColors.text }]}>{t('employees.email')}</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                value={form.email}
                onChangeText={(v) => setForm((prev) => ({ ...prev, email: v }))}
                placeholder="nom@exemple.com"
                placeholderTextColor={placeholderTextColor}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={[styles.label, isDark && { color: themeColors.text }]}>
                {isEditMode ? t('employees.newPassword') : t('employees.password')}
              </Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                value={form.password}
                onChangeText={(v) => setForm((prev) => ({ ...prev, password: v }))}
                placeholder={isEditMode ? t('employees.passwordEditPlaceholder') : t('employees.passwordCreatePlaceholder')}
                placeholderTextColor={placeholderTextColor}
                secureTextEntry
              />
              <Text style={[styles.inputHint, isDark && { color: themeColors.muted }]}>
                {isEditMode ? t('employees.passwordEditHint') : t('employees.passwordCreateHint')}
              </Text>

              <Text style={[styles.label, isDark && { color: themeColors.text }]}>{t('employees.phone')}</Text>
              <TextInput
                style={[styles.input, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder, color: themeColors.text }]}
                value={form.telephone}
                onChangeText={(v) => setForm((prev) => ({ ...prev, telephone: v }))}
                placeholder={t('common.optional')}
                placeholderTextColor={placeholderTextColor}
                keyboardType="phone-pad"
              />

              <Text style={[styles.label, isDark && { color: themeColors.text }]}>{t('employees.role')}</Text>
              <View style={styles.roleSelector}>
                {ROLE_OPTIONS.map((option) => (
                  <RoleOption
                    key={option.value}
                    option={option}
                    active={form.role === option.value}
                    disabled={isEditingSelf}
                    onPress={() => setForm((prev) => ({ ...prev, role: option.value }))}
                    isDark={isDark}
                    themeColors={themeColors}
                  />
                ))}
              </View>
              {isEditingSelf && (
                <Text style={[styles.inputHint, isDark && { color: themeColors.muted }]}>{t('employees.selfRoleHint')}</Text>
              )}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, isDark && { backgroundColor: themeColors.surfaceBg, borderColor: themeColors.surfaceBorder }]}
                  onPress={closeModal}
                >
                  <Text style={[styles.secondaryBtnText, isDark && { color: themeColors.accentText }]}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryActionBtn, submitting && styles.primaryActionBtnDisabled]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={styles.primaryActionBtnText}>{isEditMode ? t('common.save') : t('common.add')}</Text>}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TP.screenBg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TP.screenBg },
  centeredState: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: TP.screenBg, padding: 24 },

  // Lock / upgrade states
  lockIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: TP.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  upgradeIconWrap: { backgroundColor: TP.greenLight },
  lockTitle: { fontSize: 22, fontWeight: '900', color: TP.text },
  lockText: { textAlign: 'center', color: TP.muted, fontSize: 14, marginTop: 8, lineHeight: 21 },
  primaryCta: {
    marginTop: 16,
    backgroundColor: TP.accent,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 12,
    shadowColor: TP.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryCtaText: { color: '#fff', fontWeight: '800' },

  list: { paddingBottom: 28 },

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
  headerBadgeText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 11 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900' },
  subtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 20, marginTop: 4 },
  addBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: TP.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: TP.accent,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 4,
  },

  // Stats
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10, marginTop: 14 },

  // Search
  toolbar: { paddingHorizontal: 14, marginBottom: 8 },
  searchWrap: {
    backgroundColor: TP.cardBg,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  searchInput: { flex: 1, color: TP.text },

  // List items
  item: {
    backgroundColor: TP.cardBg,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ECECEC',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
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
  itemMeta: { color: TP.muted, fontSize: 13, flexShrink: 1 },

  // Badges
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  badgeGreen: { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
  badgeGreenStatus: { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
  badgeTerracotta: { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
  badgeDanger: { backgroundColor: TP.dangerLight, borderColor: TP.dangerBorder },
  badgeGold: { backgroundColor: TP.goldLight, borderColor: TP.goldBorder },
  badgeText: { fontSize: 12, fontWeight: '700' },
  badgeTextGreen: { color: TP.green },
  badgeTextTerracotta: { color: TP.accent },
  badgeTextDanger: { color: TP.danger },
  badgeTextGold: { color: '#C47D0A' },
  statusDot: { width: 7, height: 7, borderRadius: 4 },

  // Helper
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

  // Action buttons
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
  smallActionBtnDisabled: { backgroundColor: TP.screenBg, borderColor: '#E5E7EB' },
  smallActionBtnText: { fontWeight: '800', fontSize: 13 },
  smallActionBtnTextEdit: { color: TP.accent },
  smallActionBtnTextDelete: { color: TP.danger },
  smallActionBtnTextDisabled: { color: '#94a3b8' },

  toggleBtn: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    borderWidth: 1,
  },
  toggleBtnDanger: { backgroundColor: TP.dangerLight, borderColor: TP.dangerBorder },
  toggleBtnNeutral: { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
  toggleBtnDisabled: { opacity: 0.5 },
  toggleBtnText: { fontWeight: '800' },
  toggleBtnTextDanger: { color: TP.danger },
  toggleBtnTextNeutral: { color: TP.green },

  empty: { textAlign: 'center', color: TP.muted, marginTop: 28, fontSize: 14 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: TP.overlay, justifyContent: 'flex-end' },
  modalCard: {
    backgroundColor: TP.cardBg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 18,
    maxHeight: '88%',
  },
  modalScrollContent: { paddingBottom: 28 },
  modalHandle: { width: 44, height: 5, borderRadius: 999, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 14 },
  modalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  modalIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: TP.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 20, fontWeight: '900', color: TP.text },
  modalSubtitle: { fontSize: 13, color: TP.muted, marginTop: 8, marginBottom: 16 },
  label: { color: TP.text, fontWeight: '700', fontSize: 13, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#FAFAFA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: TP.text,
  },
  inputHint: { color: TP.muted, fontSize: 12, lineHeight: 18, marginTop: 6 },

  // Role selector
  roleSelector: { gap: 10, marginTop: 4 },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: TP.screenBg,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleOptionActive: { backgroundColor: TP.greenLight, borderColor: TP.greenBorder },
  roleOptionDisabled: { opacity: 0.65 },
  roleOptionIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleOptionIconActive: { backgroundColor: TP.greenLight },
  roleOptionContent: { flex: 1 },
  roleOptionLabel: { color: TP.text, fontWeight: '800', fontSize: 14 },
  roleOptionLabelActive: { color: TP.accent },
  roleOptionHelp: { color: TP.muted, fontSize: 12, marginTop: 2, lineHeight: 17 },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20, marginBottom: 12 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  secondaryBtnText: { color: TP.muted, fontWeight: '800' },
  primaryActionBtn: {
    flex: 1,
    backgroundColor: TP.accent,
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    shadowColor: TP.accent,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryActionBtnDisabled: { opacity: 0.7 },
  primaryActionBtnText: { color: '#fff', fontWeight: '800' },
});
