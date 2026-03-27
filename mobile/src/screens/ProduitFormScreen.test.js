import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ProduitFormScreen from './ProduitFormScreen';

let mockIsDark = true;

jest.mock('expo-camera', () => ({
  CameraView: 'CameraView',
  Camera: { requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ granted: true }) },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR' }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({
    isDark: mockIsDark,
    isLight: !mockIsDark,
    theme: mockIsDark ? 'dark' : 'light',
  }),
}));

jest.mock('../lib/scanFeedback', () => ({
  useScanSuccessBeep: () => jest.fn(),
}));

jest.mock('../lib/api', () => ({
  addProduitUniteVente: jest.fn(),
  createProduit: jest.fn(),
  deleteProduitUniteVente: jest.fn(),
  getCategories: jest.fn().mockResolvedValue([]),
  getFournisseurs: jest.fn().mockResolvedValue([]),
  getProduit: jest.fn(),
  updateProduit: jest.fn(),
  updateProduitUniteVente: jest.fn(),
}));

describe('ProduitFormScreen', () => {
  const navigation = { setOptions: jest.fn(), goBack: jest.fn(), reset: jest.fn(), navigate: jest.fn() };
  const route = { params: {} };

  const renderScreen = async () => {
    const utils = render(<ProduitFormScreen navigation={navigation} route={route} />);
    await waitFor(() => expect(screen.getByText('Type de produit & stock')).toBeTruthy());
    return utils;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockIsDark = true;
  });

  it('shows the product type step before sales units', async () => {
    const tree = (await renderScreen()).toJSON();
    const output = JSON.stringify(tree);

    expect(output.indexOf('Type de produit & stock')).toBeGreaterThan(-1);
    expect(output.indexOf('Unités de vente (conversions)')).toBeGreaterThan(-1);
    expect(output.indexOf('Type de produit & stock')).toBeLessThan(output.indexOf('Unités de vente (conversions)'));
  });

  it('explains what will be saved before submission', async () => {
    await renderScreen();

    expect(screen.getByText('Ce qui sera enregistré')).toBeTruthy();
    expect(screen.getByText(/Le produit sera enregistré avec son prix, son stock et son unité de base\./)).toBeTruthy();
  });

  it('applies dark theme styles to the screen and header', async () => {
    const tree = (await renderScreen()).toJSON();
    const output = JSON.stringify(tree);

    expect(output).toContain('#040c18');
    expect(output).toContain('#091221');
    expect(navigation.setOptions).toHaveBeenCalledWith(expect.objectContaining({
      headerStyle: expect.objectContaining({ backgroundColor: '#081120' }),
      headerTintColor: '#f8fafc',
    }));
  });

  it('renders expiration day choices inside a scrollable list', async () => {
    await renderScreen();

    fireEvent.press(screen.getByText('Jour'));

    expect(screen.getByTestId('picker-options-scroll')).toBeTruthy();
    expect(screen.getByText('28')).toBeTruthy();
  });
});