import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import StockScreen from './StockScreen';
import { deleteProduit, getHistoriqueStock, getInventaire } from '../lib/api';

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const React = require('react');
    React.useEffect(() => callback(), [callback]);
  },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ADMIN' } }),
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR', t: (key) => key }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock('../lib/api', () => ({
  getInventaire: jest.fn(),
  getHistoriqueStock: jest.fn(),
  deleteProduit: jest.fn(),
}));

describe('StockScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    deleteProduit.mockResolvedValue({ data: { success: true } });
    getHistoriqueStock.mockResolvedValue({ data: { success: true, data: [] } });
    getInventaire.mockResolvedValue({
      data: {
        success: true,
        data: {
          produits: [
            {
              id: 1,
              nom: 'Lait caillé',
              stock: 4,
              stockAlerte: 1,
              uniteBase: 'piece',
              prixAchat: 200,
              valeurStock: 800,
              categorie: { nom: 'Frais' },
              unitesVente: [],
              datePeremption: '2026-03-01',
              joursAvantPeremption: -2,
              estExpire: true,
              enAlertePeremption: false,
              enAlerte: true,
              peutSupprimer: true,
            },
            {
              id: 2,
              nom: 'Yaourt frais',
              stock: 6,
              stockAlerte: 1,
              uniteBase: 'piece',
              prixAchat: 250,
              valeurStock: 1500,
              categorie: { nom: 'Frais' },
              unitesVente: [],
              datePeremption: '2026-03-05',
              joursAvantPeremption: 2,
              estExpire: false,
              enAlertePeremption: true,
              enAlerte: true,
              peutSupprimer: true,
            },
          ],
          totalProduits: 2,
          totalValeurStock: 2300,
          produitsEnAlerte: 2,
        },
      },
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche les filtres de péremption et filtre correctement les expirés', async () => {
    render(<StockScreen navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => expect(getInventaire).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Gestion du stock')).toBeTruthy());

    expect(screen.getAllByText('Expire bientôt').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Expirés').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Péremption :/i).length).toBeGreaterThan(0);

    fireEvent.press(screen.getAllByText('Expirés')[0]);

    await waitFor(() => {
      expect(screen.getByText('Lait caillé')).toBeTruthy();
      expect(screen.queryByText('Yaourt frais')).toBeNull();
      expect(screen.getByText('1 produit(s) visible(s)')).toBeTruthy();
    });
  });

  it('mappe les erreurs de suppression par code côté mobile', async () => {
    deleteProduit.mockRejectedValue({
      response: {
        status: 403,
        data: { code: 'ADMIN_ONLY', message: 'Backend raw message' },
      },
    });

    render(<StockScreen navigation={{ navigate: jest.fn() }} />);

    await waitFor(() => expect(screen.getByText('Lait caillé')).toBeTruthy());

    fireEvent.press(screen.getAllByText('Supprimer')[0]);

    const confirmCall = Alert.alert.mock.calls.find(([title]) => title === 'Supprimer le produit');
    expect(confirmCall).toBeTruthy();

    await confirmCall[2][1].onPress();

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Suppression impossible', 'Accès réservé aux administrateurs.');
    });
  });
});