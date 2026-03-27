import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import DettesScreen from './DettesScreen';
import { getDettes, rembourserDette } from '../lib/api';

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR' }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock('../lib/api', () => ({
  getDettes: jest.fn(),
  rembourserDette: jest.fn(),
}));

describe('DettesScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getDettes.mockResolvedValue({
      data: {
        success: true,
        data: {
          dettes: [{
            id: 1,
            statut: 'EN_COURS',
            createdAt: '2026-03-11T10:00:00.000Z',
            montantTotal: 1000,
            montantPaye: 400,
            montantRestant: 600,
            client: { prenom: 'Awa', nom: 'Ndiaye', telephone: '770000000' },
            vente: { numero: 'VNT-50', details: [{ produit: { nom: 'Riz local' } }] },
            remboursements: [],
          }],
          totalDettes: 600,
          nombreEnCours: 1,
        },
      },
    });
    rembourserDette.mockResolvedValue({ data: { success: true, message: 'Paiement enregistré avec succès.' } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('rembourse une dette avec le bouton tout payer puis recharge la liste', async () => {
    render(<DettesScreen />);

    await waitFor(() => expect(screen.getByText('Vente #VNT-50')).toBeTruthy());
    fireEvent.press(screen.getByText('Rembourser'));
    fireEvent.press(screen.getByText('Tout payer'));

    expect(screen.getByText('Cette dette sera entièrement remboursée.')).toBeTruthy();

    fireEvent.press(screen.getByText('Confirmer le paiement'));

    await waitFor(() => {
      expect(rembourserDette).toHaveBeenCalledWith(1, 600);
      expect(Alert.alert).toHaveBeenCalledWith('Succès', 'Paiement enregistré avec succès.');
    });
    expect(getDettes).toHaveBeenCalledTimes(2);
  });

  it('bloque un remboursement supérieur au restant dû', async () => {
    render(<DettesScreen />);

    await waitFor(() => expect(screen.getByText('Vente #VNT-50')).toBeTruthy());
    fireEvent.press(screen.getByText('Rembourser'));
    fireEvent.changeText(screen.getByPlaceholderText('Max 600 CFA'), '700');
    fireEvent.press(screen.getByText('Confirmer le paiement'));

    await waitFor(() => {
      expect(rembourserDette).not.toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Validation', 'Le montant ne peut pas dépasser 600 CFA.');
    });
  });
});