import React from 'react';
import { Alert, Linking } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ParametresScreen from './ParametresScreen';

const mockAuthState = {
  user: {
    prenom: 'Awa',
    nom: 'Ndiaye',
    role: 'ADMIN',
    email: 'awa@tekki.dev',
    telephone: '770000000',
    createdAt: '2026-01-05T00:00:00.000Z',
  },
  boutique: { nom: 'Boutique Dakar' },
  getActiveBoutiqueName: jest.fn(() => 'Boutique Dakar'),
};

const mockThemeState = {
  isDark: false,
  theme: 'light',
  setTheme: jest.fn(),
};

const mockLanguageState = {
  locale: 'fr-FR',
  languages: [
    { code: 'fr', shortLabel: 'FR', labelKey: 'language.fr' },
    { code: 'en', shortLabel: 'EN', labelKey: 'language.en' },
  ],
  language: 'fr',
  setLanguage: jest.fn(),
  t: (key) => key,
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => mockLanguageState,
}));

jest.mock('../context/ThemeContext', () => ({
  THEME_OPTIONS: [
    { code: 'dark', icon: 'moon' },
    { code: 'light', icon: 'sun' },
  ],
  useTheme: () => mockThemeState,
}));

describe('ParametresScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockThemeState.isDark = false;
    mockThemeState.theme = 'light';
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('change le thème et ouvre la modal des conditions', async () => {
    render(<ParametresScreen />);

    fireEvent.press(screen.getByText('settings.themeDarkTitle'));
    expect(mockThemeState.setTheme).toHaveBeenCalledWith('dark');

    fireEvent.press(screen.getByText('settings.termsAction'));
    expect(screen.getByText('settings.termsModalTitle')).toBeTruthy();

    fireEvent.press(screen.getByText('settings.term1Title'));
  });

  it('ouvre le contact email de support', async () => {
    render(<ParametresScreen />);

    fireEvent.press(screen.getByText('settings.contactEmailAction'));

    await waitFor(() => {
      expect(Linking.canOpenURL).toHaveBeenCalledWith('mailto:ibrahimadiallo0899@gmail.com');
      expect(Linking.openURL).toHaveBeenCalledWith('mailto:ibrahimadiallo0899@gmail.com');
    });
  });

  it('affiche une erreur si un lien support ne peut pas être ouvert', async () => {
    Linking.canOpenURL.mockResolvedValue(false);

    render(<ParametresScreen />);

    fireEvent.press(screen.getByText('settings.supportCallAction'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('common.error', 'settings.openLinkError');
    });
  });
});