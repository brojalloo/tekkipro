import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Switch, Modal, Linking,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { useTheme } from '../context/ThemeContext';
import { TP, DARK_THEME } from '../theme/tokens';

const SUPPORT_PHONE = '+221768815972';

// ─── Row component ────────────────────────────────────────────────────────────
function SettingRow({ icon, iconBg, iconColor, title, subtitle, onPress, toggle, toggleValue, onToggle, last = false, colors }) {
  const D = colors || {};
  return (
    <TouchableOpacity
      style={[styles.row, { borderBottomColor: D.rowBorder || TP.greenBorder }, last && styles.rowLast]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Feather name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowTitle, { color: D.text || TP.text }]}>{title}</Text>
        {subtitle ? <Text style={[styles.rowSubtitle, { color: D.muted || TP.muted }]}>{subtitle}</Text> : null}
      </View>
      {toggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: '#D1D5DB', true: TP.green }}
          thumbColor="#FFFFFF"
          ios_backgroundColor="#D1D5DB"
        />
      ) : onPress ? (
        <Feather name="chevron-right" size={18} color={D.muted || '#D1D5DB'} />
      ) : null}
    </TouchableOpacity>
  );
}

export default function ParametresScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { t, language, setLanguage, languages } = useI18n();
  const { isDark, setTheme } = useTheme();
  const [autoReceipts, setAutoReceipts] = useState(true);
  const [langVisible, setLangVisible] = useState(false);

  const displayName = `${user?.prenom || ''} ${user?.nom || ''}`.trim() || '—';
  const initials = [user?.prenom?.[0], user?.nom?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const langLabel = t(language === 'fr' ? 'common.french' : 'common.english');
  const isAdmin = user?.role === 'ADMIN';

  const D = {
    bg: isDark ? DARK_THEME.background : TP.screenBg,
    card: isDark ? DARK_THEME.cardBg : TP.cardBg,
    border: isDark ? DARK_THEME.cardBorder : TP.greenBorder,
    text: isDark ? DARK_THEME.text : TP.text,
    muted: isDark ? DARK_THEME.muted : TP.muted,
    rowBorder: isDark ? DARK_THEME.cardBg : TP.greenBorder,
    modalBg: isDark ? DARK_THEME.cardBg : TP.cardBg,
  };

  const handleLogout = () => {
    Alert.alert(
      t('settings.logoutTitle'),
      t('settings.logoutConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('settings.logoutAction'), style: 'destructive', onPress: logout },
      ]
    );
  };

  const openSupport = () => {
    Linking.openURL(`https://wa.me/${SUPPORT_PHONE.replace('+', '')}`).catch(() => {
      Linking.openURL(`tel:${SUPPORT_PHONE}`);
    });
  };

  return (
    <>
      <ScrollView
        style={[styles.container, { backgroundColor: D.bg }]}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Title ── */}
        <Text style={[styles.pageTitle, { color: D.text }]}>{t('settings.title')}</Text>

        {/* ── Profile card ── */}
        <TouchableOpacity style={[styles.profileCard, { backgroundColor: D.card, borderColor: D.border }]} activeOpacity={0.85}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={[styles.profileName, { color: D.text }]}>{displayName}</Text>
            <Text style={[styles.profileEmail, { color: D.muted }]}>{user?.email || '—'}</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#D1D5DB" />
        </TouchableOpacity>

        {/* ── Preferences group ── */}
        <View style={[styles.group, { backgroundColor: D.card, borderColor: D.border }]}>
          <SettingRow icon="dollar-sign" iconBg={TP.goldLight} iconColor={TP.gold} title="Devise" subtitle="Franc CFA (FCFA)" onPress={() => {}} colors={D} />
          <SettingRow icon="bell" iconBg={TP.greenLight} iconColor={TP.accent} title="Notifications" subtitle="Alertes stock et ventes" onPress={() => {}} colors={D} />
          <SettingRow icon="globe" iconBg={TP.greenLight} iconColor={TP.green} title={t('settings.languageTitle')} subtitle={langLabel} onPress={() => setLangVisible(true)} last colors={D} />
        </View>

        {/* ── Toggles group ── */}
        <View style={[styles.group, { backgroundColor: D.card, borderColor: D.border }]}>
          <SettingRow icon="moon" iconBg={TP.greenLight} iconColor={TP.green} title="Mode sombre" subtitle={isDark ? 'Activé' : 'Désactivé'} toggle toggleValue={isDark} onToggle={(val) => setTheme(val ? 'dark' : 'light')} colors={D} />
          <SettingRow icon="printer" iconBg={TP.goldLight} iconColor={TP.gold} title="Reçus automatiques" subtitle="Envoyer par SMS" toggle toggleValue={autoReceipts} onToggle={setAutoReceipts} colors={D} />
          <SettingRow icon="alert-circle" iconBg={TP.greenLight} iconColor={TP.accent} title="Alertes stock bas" subtitle="Seuil : 10 unités" onPress={() => {}} last colors={D} />
        </View>

        {/* ── Gestion group (admin only) ── */}
        {isAdmin && (
          <View style={[styles.group, { backgroundColor: D.card, borderColor: D.border }]}>
            <SettingRow icon="users" iconBg={TP.greenLight} iconColor={TP.green} title="Employés" subtitle="Gérer les accès" onPress={() => navigation.navigate('Employes')} colors={D} />
            <SettingRow icon="star" iconBg={TP.goldLight} iconColor={TP.gold} title="Abonnement" subtitle="Voir mon plan" onPress={() => navigation.navigate('Abonnement')} last colors={D} />
          </View>
        )}

        {/* ── Support group ── */}
        <View style={[styles.group, { backgroundColor: D.card, borderColor: D.border }]}>
          <SettingRow icon="message-circle" iconBg={TP.greenLight} iconColor={TP.green} title="Support WhatsApp" subtitle="Contacter l'équipe TekkiPro" onPress={openSupport} last colors={D} />
        </View>

        {/* ── Version ── */}
        <View style={styles.versionBlock}>
          <Text style={[styles.versionApp, { color: D.muted }]}>TekkiPro v2.1.0</Text>
          <Text style={[styles.versionSub, { color: D.muted }]}>Made with 🤍 in Dakar, Sénégal</Text>
        </View>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Feather name="log-out" size={17} color={TP.accent} />
          <Text style={styles.logoutText}>{t('settings.logoutTitle')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {/* ── Language modal ── */}
      <Modal visible={langVisible} transparent animationType="slide" onRequestClose={() => setLangVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: D.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: D.text }]}>{t('settings.languageTitle')}</Text>
              <TouchableOpacity onPress={() => setLangVisible(false)} style={styles.modalClose}>
                <Feather name="x" size={18} color={TP.muted} />
              </TouchableOpacity>
            </View>
            {/* Language options inline (LanguageSelector doesn't support onSelect callback) */}
            <View style={styles.langOptions}>
              {languages.map((item) => {
                const active = language === item.code;
                return (
                  <TouchableOpacity
                    key={item.code}
                    style={[styles.langOption, active && styles.langOptionActive]}
                    onPress={() => { setLanguage(item.code); setLangVisible(false); }}
                  >
                    <Text style={[styles.langCode, active && styles.langCodeActive]}>{item.shortLabel}</Text>
                    <Text style={[styles.langLabel, active && styles.langLabelActive]}>{item.shortLabel === 'FR' ? 'Français' : 'English'}</Text>
                    {active && <Feather name="check" size={16} color={TP.green} style={{ marginLeft: 'auto' }} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: TP.screenBg },
  content: { paddingBottom: 40 },

  // Title
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: TP.text,
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
  },

  // Profile card
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TP.cardBg,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: TP.greenBorder,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TP.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '900' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 16, fontWeight: '800', color: TP.text },
  profileEmail: { fontSize: 13, color: TP.muted, marginTop: 2 },

  // Settings groups
  group: {
    backgroundColor: TP.cardBg,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: TP.greenBorder,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: TP.greenBorder,
  },
  rowLast: { borderBottomWidth: 0 },
  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  rowInfo: { flex: 1 },
  rowTitle: { fontSize: 15, fontWeight: '700', color: TP.text },
  rowSubtitle: { fontSize: 13, color: TP.muted, marginTop: 2 },

  // Version
  versionBlock: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  versionApp: { fontSize: 14, fontWeight: '700', color: TP.muted },
  versionSub: { fontSize: 13, color: TP.muted, marginTop: 4 },

  // Logout
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: TP.accent,
    backgroundColor: TP.greenLight,
  },
  logoutText: { fontSize: 15, fontWeight: '800', color: TP.accent },

  // Language modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: TP.overlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: TP.cardBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: TP.text },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: TP.screenBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langOptions: { gap: 10 },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: TP.greenBorder,
    backgroundColor: TP.screenBg,
  },
  langOptionActive: {
    borderColor: TP.green,
    backgroundColor: TP.greenLight,
  },
  langCode: {
    fontSize: 13,
    fontWeight: '800',
    color: TP.muted,
    width: 30,
  },
  langCodeActive: { color: TP.green },
  langLabel: { fontSize: 15, fontWeight: '600', color: TP.text },
  langLabelActive: { color: TP.green, fontWeight: '800' },
});
