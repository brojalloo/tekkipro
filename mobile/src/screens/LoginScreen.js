import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, ScrollView, Modal, SafeAreaView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useI18n } from '../context/LanguageContext';
import { getApiErrorCode, getApiErrorMessage } from '@tekkipro/shared/apiError';
import { forgotPassword as requestPasswordReset, resendVerification as requestResendVerification } from '../lib/api';
import KenteBar from '../components/KenteBar';

// ─── Password strength helper ──────────────────────────────────────────────────
const isStrongPassword = (value) => (
  typeof value === 'string'
  && value.length >= 8
  && /[a-z]/.test(value)
  && /[A-Z]/.test(value)
  && /[0-9]/.test(value)
  && /[^A-Za-z0-9]/.test(value)
);

// ─── TekkiPro Brand Palette ────────────────────────────────────────────────────
const P = {
  darkBg:      '#071C08',   // Vert forêt profond
  green:       '#1B5E20',   // Vert Baobab
  gold:        '#FFD600',   // Or du Sénégal
  accent:      '#D32F2F',   // Rouge Gorée
  lightBg:     '#F5F2ED',
  white:       '#FFFFFF',
  cardBg:      'rgba(255,255,255,0.07)',
  cardBorder:  'rgba(255,255,255,0.12)',
  mutedWhite:  'rgba(255,255,255,0.60)',
  placeholder: 'rgba(255,255,255,0.30)',
  error:       '#FF6B6B',
};

export default function LoginScreen({ navigation, route }) {
  const { login, register } = useAuth();
  const { language, t } = useI18n();

  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nomBoutique, setNomBoutique] = useState('');
  const [prenom, setPrenom] = useState('');
  const [nom, setNom] = useState('');
  const [telephone, setTelephone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [activationNotice, setActivationNotice] = useState('');
  const [showResendActivation, setShowResendActivation] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isRegisterMode = mode === 'register';
  const submitLabel = isRegisterMode ? t('login.createAccount') : t('login.submit');
  const canGoBack = navigation?.canGoBack?.() || false;

  const slug = useMemo(() => nomBoutique
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, ''), [nomBoutique]);

  const resetRegisterFields = () => {
    setNomBoutique('');
    setPrenom('');
    setNom('');
    setTelephone('');
    setConfirmPassword('');
    setShowConfirmPassword(false);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setLoading(false);
    setForgotPasswordVisible(false);
    setForgotLoading(false);
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (nextMode === 'login') {
      resetRegisterFields();
    }
  };

  useEffect(() => {
    const requestedMode = route?.params?.mode;
    if (requestedMode === 'register' || requestedMode === 'login') {
      setMode(requestedMode);
    }
  }, [route?.params?.mode]);

  // ─── Field renderer ────────────────────────────────────────────────────────
  const renderField = ({
    label,
    placeholder = label,
    required = false,
    value,
    onChangeText,
    secureTextEntry,
    isVisible,
    onToggleVisibility,
    ...inputProps
  }) => (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{required ? `${label} *` : label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={P.placeholder}
          value={value}
          onChangeText={onChangeText}
          editable={!loading}
          secureTextEntry={Boolean(secureTextEntry && !isVisible)}
          {...inputProps}
        />
        {secureTextEntry && onToggleVisibility && (
          <TouchableOpacity
            style={styles.visibilityBtn}
            onPress={onToggleVisibility}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={isVisible ? t('login.hidePassword') : t('login.showPassword')}
          >
            <Feather name={isVisible ? 'eye-off' : 'eye'} size={18} color={P.mutedWhite} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // ─── Handlers ──────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setError('');
    if (!email || !password) {
      setError(t('login.missingFields'));
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      setActivationNotice('');
      setShowResendActivation(false);
    } catch (err) {
      const code = getApiErrorCode(err);
      const message = getApiErrorMessage(err, { language });
      if (code === 'EMAIL_NOT_VERIFIED') {
        setActivationNotice(message);
        setShowResendActivation(true);
      } else {
        setShowResendActivation(false);
      }
      setError(message);
      Alert.alert(t('login.loginError'), message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!nomBoutique || !prenom || !nom || !email || !password) {
      setError(t('login.missingFields'));
      return;
    }
    if (!slug) {
      setError(t('login.storeNamePlaceholder'));
      return;
    }
    if (!isStrongPassword(password)) {
      setError(t('login.passwordTooShort'));
      return;
    }
    if (password !== confirmPassword) {
      setError(t('login.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      const response = await register({
        nomBoutique: nomBoutique.trim(),
        slug,
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: email.trim().toLowerCase(),
        password,
        telephone: telephone.trim(),
      });

      if (response?.requiresEmailVerification) {
        const activationEmail = response.emailVerificationSentTo || email.trim().toLowerCase();
        setEmail(activationEmail);
        setPassword('');
        switchMode('login');
        setActivationNotice(t('login.registerActivationMessage', { email: activationEmail }));
        setShowResendActivation(true);
        Alert.alert(
          t('login.registerActivationTitle'),
          t('login.registerActivationMessage', { email: activationEmail })
        );
      }
    } catch (err) {
      const message = getApiErrorMessage(err, { language });
      setError(message);
      Alert.alert(t('login.registerError'), message);
    } finally {
      setLoading(false);
    }
  };

  const openForgotPasswordModal = () => {
    setForgotEmail(email.trim().toLowerCase());
    setForgotPasswordVisible(true);
  };

  const closeForgotPasswordModal = () => {
    if (forgotLoading) return;
    setForgotPasswordVisible(false);
  };

  const handleForgotPassword = async () => {
    const normalizedEmail = forgotEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert(t('common.validation'), t('login.forgotPasswordEmailRequired'));
      return;
    }
    setForgotLoading(true);
    try {
      await requestPasswordReset(normalizedEmail);
      setForgotPasswordVisible(false);
      Alert.alert(t('common.success'), t('login.forgotPasswordSuccess'));
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, { language }));
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert(t('common.validation'), t('login.resendVerificationEmailRequired'));
      return;
    }
    setResendLoading(true);
    try {
      await requestResendVerification(normalizedEmail);
      const successMessage = t('login.resendVerificationSuccess');
      setActivationNotice(successMessage);
      setShowResendActivation(true);
      Alert.alert(t('common.success'), successMessage);
    } catch (err) {
      Alert.alert(t('common.error'), getApiErrorMessage(err, { language }));
    } finally {
      setResendLoading(false);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'android' ? 24 : 0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            isRegisterMode ? styles.scrollRegister : styles.scrollLogin,
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Back button ── */}
          {canGoBack && (
            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} disabled={loading}>
              <Feather name="arrow-left" size={16} color={P.white} />
              <Text style={styles.backBtnText}>{t('login.backToWelcome')}</Text>
            </TouchableOpacity>
          )}

          {/* ── Header: logo + title ── */}
          <View style={styles.header}>
            {/* Gold "T" badge */}
            <View style={styles.logoBox}>
              <View style={styles.logoShine} />
              <Text style={styles.logoLetter}>T</Text>
            </View>
            <Text style={styles.appTitle}>TekkiPro</Text>
            {/* Kente tricolor bar */}
            <KenteBar style={styles.kenteBar} height={4} />
          </View>

          {/* ── Mode toggle pills ── */}
          <View style={styles.pillRow}>
            <TouchableOpacity
              style={[styles.pill, !isRegisterMode && styles.pillActive]}
              onPress={() => switchMode('login')}
              disabled={loading}
            >
              <Text style={[styles.pillText, !isRegisterMode && styles.pillTextActive]}>
                {t('login.loginMode')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.pill, isRegisterMode && styles.pillActive]}
              onPress={() => switchMode('register')}
              disabled={loading}
            >
              <Text style={[styles.pillText, isRegisterMode && styles.pillTextActive]}>
                {t('login.registerMode')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Form card ── */}
          <View style={styles.card}>
            {/* Register-only fields */}
            {isRegisterMode && (
              <>
                {renderField({
                  label: t('login.storeNamePlaceholder'),
                  value: nomBoutique,
                  onChangeText: setNomBoutique,
                  required: true,
                })}
                {!!slug && (
                  <Text style={styles.slugPreview}>{slug}.tekkipro.com</Text>
                )}
                {renderField({
                  label: t('login.firstNamePlaceholder'),
                  value: prenom,
                  onChangeText: setPrenom,
                  required: true,
                })}
                {renderField({
                  label: t('login.lastNamePlaceholder'),
                  value: nom,
                  onChangeText: setNom,
                  required: true,
                })}
              </>
            )}

            {/* Email */}
            {renderField({
              label: t('login.emailPlaceholder'),
              value: email,
              onChangeText: setEmail,
              required: true,
              autoCapitalize: 'none',
              keyboardType: 'email-address',
            })}

            {/* Phone — register only */}
            {isRegisterMode && renderField({
              label: t('login.phonePlaceholder'),
              placeholder: t('login.phoneExamplePlaceholder'),
              value: telephone,
              onChangeText: setTelephone,
              keyboardType: 'phone-pad',
            })}

            {/* Password */}
            {renderField({
              label: t('login.passwordPlaceholder'),
              value: password,
              onChangeText: setPassword,
              required: true,
              secureTextEntry: true,
              isVisible: showPassword,
              onToggleVisibility: () => setShowPassword(prev => !prev),
            })}

            {/* Confirm password — register only */}
            {isRegisterMode && renderField({
              label: t('login.confirmPasswordPlaceholder'),
              value: confirmPassword,
              onChangeText: setConfirmPassword,
              required: true,
              secureTextEntry: true,
              isVisible: showConfirmPassword,
              onToggleVisibility: () => setShowConfirmPassword(prev => !prev),
            })}

            {/* Error message */}
            {!!error && (
              <Text style={styles.errorText}>{error}</Text>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.btnDisabled]}
              onPress={isRegisterMode ? handleRegister : handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color={P.white} />
                : <Text style={styles.submitBtnText}>{submitLabel}</Text>
              }
            </TouchableOpacity>

            {/* Login-mode extras */}
            {!isRegisterMode && (
              <>
                {showResendActivation && !!activationNotice && (
                  <View style={styles.infoBanner}>
                    <Text style={styles.infoBannerText}>{activationNotice}</Text>
                  </View>
                )}

                {showResendActivation && (
                  <TouchableOpacity
                    style={[styles.secondaryBtn, resendLoading && styles.btnDisabled]}
                    onPress={handleResendVerification}
                    disabled={loading || resendLoading}
                  >
                    {resendLoading
                      ? <ActivityIndicator color={P.green} />
                      : <Text style={styles.secondaryBtnText}>{t('login.resendVerificationAction')}</Text>
                    }
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.forgotBtn}
                  onPress={openForgotPasswordModal}
                  disabled={loading || resendLoading}
                >
                  <Text style={styles.forgotBtnText}>{t('login.forgotPasswordAction')}</Text>
                </TouchableOpacity>
              </>
            )}

            {/* Footer mode-switch */}
            <View style={styles.footerRow}>
              <Text style={styles.footerText}>
                {isRegisterMode ? t('login.alreadyHaveAccount') : t('login.noAccountYet')}
              </Text>
              <TouchableOpacity onPress={() => switchMode(isRegisterMode ? 'login' : 'register')} disabled={loading}>
                <Text style={styles.footerLink}>
                  {isRegisterMode ? t('login.switchToLogin') : t('login.switchToRegister')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot password modal ── */}
      <Modal
        visible={forgotPasswordVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForgotPasswordModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('login.forgotPasswordTitle')}</Text>
            <Text style={styles.modalHint}>{t('login.forgotPasswordHint')}</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>{t('login.emailPlaceholder')} *</Text>
              <TextInput
                style={styles.inputStandalone}
                placeholder={t('login.forgotPasswordPlaceholder')}
                placeholderTextColor={P.placeholder}
                value={forgotEmail}
                onChangeText={setForgotEmail}
                editable={!forgotLoading}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, forgotLoading && styles.btnDisabled]}
                onPress={closeForgotPasswordModal}
                disabled={forgotLoading}
              >
                <Text style={styles.modalCancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, forgotLoading && styles.btnDisabled]}
                onPress={handleForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading
                  ? <ActivityIndicator color={P.white} />
                  : <Text style={styles.modalSubmitBtnText}>{t('login.forgotPasswordSubmit')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // ── Structural ──────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: P.darkBg,  // #071C08 vert forêt
  },
  kav: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
  },
  scrollLogin: {
    justifyContent: 'center',
    paddingVertical: 32,
  },
  scrollRegister: {
    justifyContent: 'flex-start',
    paddingVertical: 32,
    paddingBottom: 96,
  },

  // ── Back button ─────────────────────────────────────────────────────────────
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
    alignSelf: 'flex-start',
  },
  backBtnText: {
    color: P.white,
    fontWeight: '700',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: P.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: P.gold,
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  logoShine: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: '52%',
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  logoLetter: {
    fontSize: 38,
    fontWeight: '900',
    color: '#071C08',
    letterSpacing: -1,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: P.white,
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  kenteBar: {
    flexDirection: 'row',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    width: 64,
  },

  // ── Mode toggle pills ────────────────────────────────────────────────────────
  pillRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
    marginBottom: 24,
  },
  pill: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: P.white,
  },
  pillActive: {
    backgroundColor: P.green,
    borderColor: P.green,
  },
  pillText: {
    color: P.white,
    fontWeight: '700',
    fontSize: 14,
  },
  pillTextActive: {
    color: P.white,
  },

  // ── Form card ───────────────────────────────────────────────────────────────
  card: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.cardBorder,
    borderRadius: 20,
    padding: 24,
  },

  // ── Fields ──────────────────────────────────────────────────────────────────
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: P.mutedWhite,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.cardBorder,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 15,
    color: P.white,
  },
  inputStandalone: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.cardBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: P.white,
  },
  visibilityBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  slugPreview: {
    color: P.gold,
    fontWeight: '600',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 14,
  },

  // ── Error ────────────────────────────────────────────────────────────────────
  errorText: {
    color: P.error,
    textAlign: 'center',
    fontSize: 13,
    marginBottom: 12,
  },

  // ── Submit button ────────────────────────────────────────────────────────────
  submitBtn: {
    backgroundColor: P.green,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  submitBtnText: {
    color: P.white,
    fontWeight: '700',
    fontSize: 16,
  },

  // ── Info banner + resend ─────────────────────────────────────────────────────
  infoBanner: {
    backgroundColor: P.cardBg,
    borderWidth: 1,
    borderColor: P.cardBorder,
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
  },
  infoBannerText: {
    color: P.mutedWhite,
    fontSize: 13,
    lineHeight: 19,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: P.green,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 12,
  },
  secondaryBtnText: {
    color: P.green,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Forgot password ──────────────────────────────────────────────────────────
  forgotBtn: {
    alignSelf: 'center',
    marginTop: 16,
  },
  forgotBtnText: {
    color: P.gold,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Footer row ───────────────────────────────────────────────────────────────
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 20,
  },
  footerText: {
    color: P.mutedWhite,
    fontSize: 14,
  },
  footerLink: {
    color: P.gold,
    fontWeight: '700',
    fontSize: 14,
  },

  // ── Modal ────────────────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: '#0D2710',
    borderWidth: 1,
    borderColor: P.cardBorder,
    borderRadius: 20,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: P.white,
    marginBottom: 8,
  },
  modalHint: {
    fontSize: 14,
    color: P.mutedWhite,
    lineHeight: 20,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: P.cardBorder,
    backgroundColor: P.cardBg,
  },
  modalCancelBtnText: {
    color: P.mutedWhite,
    fontWeight: '700',
  },
  modalSubmitBtn: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    backgroundColor: P.green,
  },
  modalSubmitBtnText: {
    color: P.white,
    fontWeight: '700',
  },
});
