import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import LoginScreen from './LoginScreen';

const mockSetTheme = jest.fn();
const mockLogin = jest.fn();
const mockRegister = jest.fn();
const mockForgotPassword = jest.fn();
const mockResendVerification = jest.fn();
let mockTheme = 'dark';

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin, register: mockRegister }),
}));

jest.mock('../lib/api', () => ({
  forgotPassword: (...args) => mockForgotPassword(...args),
  resendVerification: (...args) => mockResendVerification(...args),
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({
    language: 'fr',
    t: (key, params = {}) => {
      const template = ({
      'common.error': 'Erreur',
      'common.dark': 'Dark',
      'common.light': 'Clair',
      'login.emailPlaceholder': 'Email',
      'login.passwordPlaceholder': 'Mot de passe',
      'login.loginError': 'Erreur de connexion',
      'login.subtitle': 'Connecte-toi pour continuer',
      'login.registerSubtitle': 'Crée ton espace',
      'login.loginMode': 'Connexion',
      'login.registerMode': 'Inscription',
      'login.submit': 'Se connecter',
      'login.createAccount': 'Créer un compte',
      'login.storeNamePlaceholder': 'Nom de la boutique',
      'login.firstNamePlaceholder': 'Prénom',
      'login.lastNamePlaceholder': 'Nom',
      'login.confirmPasswordPlaceholder': 'Confirmer le mot de passe',
      'login.passwordTooShort': 'Le mot de passe doit contenir au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial',
      'login.registerActivationTitle': 'Activation requise',
      'login.registerActivationMessage': 'Votre compte a été créé. Vérifiez votre email {{email}} pour activer votre compte avant de vous connecter.',
      'common.success': 'Succès',
      'common.validation': 'Validation',
      'common.cancel': 'Annuler',
      'login.resendVerificationAction': 'Renvoyer l’email d’activation',
      'login.resendVerificationEmailRequired': 'Saisissez votre email pour renvoyer l’activation.',
      'login.resendVerificationSuccess': 'Si ce compte existe, un lien d’activation a été envoyé.',
      'login.showPassword': 'Afficher le mot de passe',
      'login.hidePassword': 'Masquer le mot de passe',
      'login.forgotPasswordAction': 'Mot de passe oublié ?',
      'login.forgotPasswordTitle': 'Réinitialiser le mot de passe',
      'login.forgotPasswordHint': 'Entrez l’email lié à votre compte pour recevoir un lien de réinitialisation.',
      'login.forgotPasswordPlaceholder': 'Votre email',
      'login.forgotPasswordSubmit': 'Envoyer le lien',
      'login.forgotPasswordEmailRequired': 'Veuillez saisir votre email.',
      'login.forgotPasswordSuccess': 'Si ce compte existe, un lien de réinitialisation a été envoyé.',
      }[key] || key);
      return String(template).replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, name) => String(params[name.trim()] ?? ''));
    },
  }),
}));

jest.mock('../context/ThemeContext', () => ({
  THEME_OPTIONS: [
    { code: 'dark', icon: 'moon' },
    { code: 'light', icon: 'sun' },
  ],
  useTheme: () => ({
    isDark: mockTheme === 'dark',
    theme: mockTheme,
    setTheme: mockSetTheme,
  }),
}));

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTheme = 'dark';
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows the theme switch below the TekkiPro logo/title', () => {
    render(<LoginScreen navigation={{ canGoBack: () => false }} route={{ params: { mode: 'login' } }} />);

    expect(screen.getByLabelText('Logo TekkiPro')).toBeTruthy();
    expect(screen.getByText('TekkiPro')).toBeTruthy();
    expect(screen.getByText('Dark')).toBeTruthy();
    expect(screen.getByText('Clair')).toBeTruthy();
  });

  it('lets the user switch from dark to light mode', () => {
    render(<LoginScreen navigation={{ canGoBack: () => false }} route={{ params: { mode: 'login' } }} />);

    fireEvent.press(screen.getByText('Clair'));

    expect(mockSetTheme).toHaveBeenCalledWith('light');
  });

  it('maps login errors by API code instead of showing the raw backend message', async () => {
    mockLogin.mockRejectedValue({
      response: {
        status: 401,
        data: { code: 'INVALID_CREDENTIALS', message: 'Backend raw message' },
      },
    });

    render(<LoginScreen navigation={{ canGoBack: () => false }} route={{ params: { mode: 'login' } }} />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'awa@tekkipro.com');
    fireEvent.changeText(screen.getByPlaceholderText('Mot de passe'), 'secret');
    fireEvent.press(screen.getByText('Se connecter'));

    expect(mockLogin).toHaveBeenCalledWith('awa@tekkipro.com', 'secret');

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Erreur de connexion', 'Email ou mot de passe incorrect.');
    });
  });

  it('opens forgot password modal and sends reset email request', async () => {
    mockForgotPassword.mockResolvedValue({ data: { success: true } });

    render(<LoginScreen navigation={{ canGoBack: () => false }} route={{ params: { mode: 'login' } }} />);

    fireEvent.press(screen.getByText('Mot de passe oublié ?'));
    expect(screen.getByText('Réinitialiser le mot de passe')).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText('Votre email'), 'brotory50@gmail.com');
    fireEvent.press(screen.getByText('Envoyer le lien'));

    await waitFor(() => {
      expect(mockForgotPassword).toHaveBeenCalledWith('brotory50@gmail.com');
      expect(Alert.alert).toHaveBeenCalledWith('Succès', 'Si ce compte existe, un lien de réinitialisation a été envoyé.');
    });
  });

  it('lets the user reveal the password input', () => {
    render(<LoginScreen navigation={{ canGoBack: () => false }} route={{ params: { mode: 'login' } }} />);

    const passwordInput = screen.getByPlaceholderText('Mot de passe');
    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(screen.getByLabelText('Afficher le mot de passe'));

    expect(screen.getByPlaceholderText('Mot de passe').props.secureTextEntry).toBe(false);
  });

  it('blocks weak passwords during registration before calling the API', () => {
    render(<LoginScreen navigation={{ canGoBack: () => false }} route={{ params: { mode: 'register' } }} />);

    fireEvent.changeText(screen.getByPlaceholderText('Nom de la boutique'), 'Tekki Shop');
    fireEvent.changeText(screen.getByPlaceholderText('Prénom'), 'Broto');
    fireEvent.changeText(screen.getByPlaceholderText('Nom'), 'Diallo');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'brotory50@gmail.com');
    fireEvent.changeText(screen.getByPlaceholderText('Mot de passe'), 'Secret12');
    fireEvent.changeText(screen.getByPlaceholderText('Confirmer le mot de passe'), 'Secret12');

    fireEvent.press(screen.getByText('Créer un compte'));

    expect(mockRegister).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Le mot de passe doit contenir au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial');
  });

  it('shows activation confirmation after registration when email verification is required', async () => {
    mockRegister.mockResolvedValue({
      requiresEmailVerification: true,
      emailVerificationSentTo: 'brotory50@gmail.com',
    });

    render(<LoginScreen navigation={{ canGoBack: () => false }} route={{ params: { mode: 'register' } }} />);

    fireEvent.changeText(screen.getByPlaceholderText('Nom de la boutique'), 'Tekki Shop');
    fireEvent.changeText(screen.getByPlaceholderText('Prénom'), 'Broto');
    fireEvent.changeText(screen.getByPlaceholderText('Nom'), 'Diallo');
    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'brotory50@gmail.com');
    fireEvent.changeText(screen.getByPlaceholderText('Mot de passe'), 'Passer@123');
    fireEvent.changeText(screen.getByPlaceholderText('Confirmer le mot de passe'), 'Passer@123');

    fireEvent.press(screen.getByText('Créer un compte'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Activation requise',
        'Votre compte a été créé. Vérifiez votre email brotory50@gmail.com pour activer votre compte avant de vous connecter.'
      );
      expect(screen.getByText('Renvoyer l’email d’activation')).toBeTruthy();
      expect(screen.queryByPlaceholderText('Confirmer le mot de passe')).toBeNull();
    });
  });

  it('allows resending the activation email after EMAIL_NOT_VERIFIED on login', async () => {
    mockLogin.mockRejectedValueOnce({
      response: {
        status: 403,
        data: { code: 'EMAIL_NOT_VERIFIED', message: 'Backend raw message' },
      },
    });
    mockResendVerification.mockResolvedValue({ data: { success: true } });

    render(<LoginScreen navigation={{ canGoBack: () => false }} route={{ params: { mode: 'login' } }} />);

    fireEvent.changeText(screen.getByPlaceholderText('Email'), 'awa@tekkipro.com');
    fireEvent.changeText(screen.getByPlaceholderText('Mot de passe'), 'Passer@123');
    fireEvent.press(screen.getByText('Se connecter'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Erreur de connexion', 'Veuillez vérifier votre email avant de vous connecter.');
      expect(screen.getByText('Renvoyer l’email d’activation')).toBeTruthy();
    });

    fireEvent.press(screen.getByText('Renvoyer l’email d’activation'));

    await waitFor(() => {
      expect(mockResendVerification).toHaveBeenCalledWith('awa@tekkipro.com');
      expect(Alert.alert).toHaveBeenCalledWith('Succès', 'Si ce compte existe, un lien d’activation a été envoyé.');
    });
  });
});