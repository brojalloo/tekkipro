import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import WelcomeScreen from './WelcomeScreen';

const mockLanguageState = {
  language: 'fr',
  languages: [
    { code: 'fr', shortLabel: 'FR' },
    { code: 'en', shortLabel: 'EN' },
  ],
  setLanguage: jest.fn(),
  t: (key) => key,
};

const mockThemeState = {
  isDark: false,
  theme: 'light',
  setTheme: jest.fn(),
};

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

describe('WelcomeScreen', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    mockLanguageState.language = 'fr';
    mockThemeState.theme = 'light';
    mockThemeState.isDark = false;
  });

  it('navigue vers la création de compte et la connexion', () => {
    render(<WelcomeScreen navigation={navigation} />);

    fireEvent.press(screen.getByText('welcome.createAccount'));
    expect(navigation.navigate).toHaveBeenCalledWith('Login', { mode: 'register' });

    fireEvent.press(screen.getByText('welcome.signIn'));
    expect(navigation.navigate).toHaveBeenCalledWith('Login', { mode: 'login' });
  });

  it('permet de changer le thème et la langue', () => {
    render(<WelcomeScreen navigation={navigation} />);

    fireEvent.press(screen.getByText('common.dark'));
    expect(mockThemeState.setTheme).toHaveBeenCalledWith('dark');

    fireEvent.press(screen.getByText('EN'));
    expect(mockLanguageState.setLanguage).toHaveBeenCalledWith('en');
  });
});