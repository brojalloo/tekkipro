import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ScannerScreen from './ScannerScreen';
import { getProduitByBarcode } from '../lib/api';

const authState = { user: { role: 'ADMIN' } };

jest.mock('expo-camera', () => {
  const React = require('react');
  const { TouchableOpacity, Text } = require('react-native');
  return {
    Camera: {
      requestCameraPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    },
    CameraView: ({ onBarcodeScanned }) => (
      <TouchableOpacity testID="camera-view" onPress={() => onBarcodeScanned?.({ data: '111' })}>
        <Text>Simuler scan</Text>
      </TouchableOpacity>
    ),
  };
});

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR' }),
}));

jest.mock('../lib/scanFeedback', () => ({
  useScanSuccessBeep: () => jest.fn(),
}));

jest.mock('../lib/api', () => ({
  getProduitByBarcode: jest.fn(),
}));

describe('ScannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState.user.role = 'ADMIN';
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getProduitByBarcode.mockResolvedValue({
      data: {
        data: {
          produit: {
            id: 1,
            nom: 'Lait frais',
            stock: 8,
            prixVente: 350,
            uniteBase: 'piece',
            unitesVente: [],
          },
        },
      },
    });
  });

  it('finalise un scan en mode panier et renvoie les items vers Ventes', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };

    render(<ScannerScreen navigation={navigation} route={{ params: { mode: 'cart' } }} />);

    await waitFor(() => expect(screen.getByText('Simuler scan')).toBeTruthy());
    fireEvent.press(screen.getByText('Simuler scan'));

    await waitFor(() => expect(getProduitByBarcode).toHaveBeenCalledWith('111'));
    await waitFor(() => expect(screen.getByText('1 scan(s)')).toBeTruthy());
    expect(screen.getByText('Lait frais')).toBeTruthy();

    fireEvent.press(screen.getByText('Terminer (1)'));

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith('Ventes', {
        scannedItems: [
          {
            produit: {
              id: 1,
              nom: 'Lait frais',
              stock: 8,
              prixVente: 350,
              uniteBase: 'piece',
              unitesVente: [],
            },
          },
        ],
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('propose de vendre immédiatement après un scan hors mode panier', async () => {
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };

    render(<ScannerScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Simuler scan')).toBeTruthy());
    fireEvent.press(screen.getByText('Simuler scan'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const [title, , buttons] = Alert.alert.mock.calls[0];
    expect(title).toBe('Lait frais');

    await act(async () => {
      buttons[0].onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Ventes', {
      scannedLookup: {
        produit: {
          id: 1,
          nom: 'Lait frais',
          stock: 8,
          prixVente: 350,
          uniteBase: 'piece',
          unitesVente: [],
        },
      },
    });
  });

  it('indique au non-admin qu’il ne peut pas créer le produit sur code inconnu', async () => {
    authState.user.role = 'EMPLOYE';
    getProduitByBarcode.mockRejectedValueOnce({ response: { status: 404 } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };

    render(<ScannerScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Simuler scan')).toBeTruthy());
    fireEvent.press(screen.getByText('Simuler scan'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const [title, message, buttons] = Alert.alert.mock.calls[0];
    expect(title).toBe('Produit introuvable');
    expect(message).toContain('Seul un administrateur peut créer ce produit.');

    await act(async () => {
      buttons[0].onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('Ventes');
  });

  it('permet à un admin d’ouvrir le formulaire produit quand le code est inconnu', async () => {
    authState.user.role = 'ADMIN';
    getProduitByBarcode.mockRejectedValueOnce({ response: { status: 404 } });
    const navigation = { navigate: jest.fn(), goBack: jest.fn() };

    render(<ScannerScreen navigation={navigation} route={{ params: {} }} />);

    await waitFor(() => expect(screen.getByText('Simuler scan')).toBeTruthy());
    fireEvent.press(screen.getByText('Simuler scan'));

    await waitFor(() => expect(Alert.alert).toHaveBeenCalled());
    const [title, message, buttons] = Alert.alert.mock.calls[0];
    expect(title).toBe('Produit introuvable');
    expect(message).toContain('Voulez-vous créer ce produit ?');

    await act(async () => {
      buttons[0].onPress();
    });
    expect(navigation.navigate).toHaveBeenCalledWith('ProduitForm', { codeBarre: '111' });
  });
});