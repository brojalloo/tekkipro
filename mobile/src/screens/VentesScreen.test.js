import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import VentesScreen from './VentesScreen';
import { createClient, createVente, getClients, getProduits, getVentes } from '../lib/api';

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR' }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock('../lib/api', () => ({
  createClient: jest.fn(),
  createVente: jest.fn(),
  getClients: jest.fn(),
  getProduits: jest.fn(),
  getVentes: jest.fn(),
}));

const flushUiTimers = async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
    await Promise.resolve();
  });
};

describe('VentesScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    getVentes.mockResolvedValue({ data: { success: true, data: [] } });
    getProduits.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 1, nom: 'Lait frais', stock: 8, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111', datePeremption: '2026-03-10', alertePeremptionJours: 5 },
          { id: 2, nom: 'Jus mangue', stock: 6, prixVente: 400, uniteBase: 'bouteille', unitesVente: [], codeBarre: '222', datePeremption: '2026-03-12', alertePeremptionJours: 4 },
        ],
      },
    });
    getClients.mockResolvedValue({
      data: {
        success: true,
        data: [
          { id: 2, nom: 'Ndiaye', prenom: 'Awa', telephone: '771234567', totalDettes: 500 },
        ],
      },
    });
    createClient.mockResolvedValue({ data: { success: true, data: { id: 3 } } });
    createVente.mockResolvedValue({ data: { success: true, data: { id: 99, numero: 'VNT-99' } } });
  });

  afterEach(async () => {
    await flushUiTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('empêche la validation d’une vente à crédit sans client sélectionné', async () => {
    render(
      <VentesScreen
        navigation={{ navigate: jest.fn(), setParams: jest.fn() }}
        route={{
          params: {
            scannedProduit: { id: 1, nom: 'Lait frais', stock: 8, prixVente: 350, uniteBase: 'piece', unitesVente: [], datePeremption: '2026-03-10', alertePeremptionJours: 5 },
          },
        }}
      />
    );

    await flushUiTimers();

    await waitFor(() => expect(getVentes).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('Lait frais').length).toBeGreaterThan(0));

    fireEvent.press(screen.getAllByText('Crédit')[0]);
    fireEvent.press(screen.getByText('Valider la vente'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Client requis', 'Sélectionnez un client pour enregistrer une vente à crédit.');
      expect(createVente).not.toHaveBeenCalled();
    });
  });

  it('valide une vente cash puis ouvre le ticket depuis l’alerte de succès', async () => {
    const navigation = { navigate: jest.fn(), setParams: jest.fn() };

    render(
      <VentesScreen
        navigation={navigation}
        route={{
          params: {
            scannedProduit: { id: 1, nom: 'Lait frais', stock: 8, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
          },
        }}
      />
    );

    await flushUiTimers();

    await waitFor(() => expect(getVentes).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('Lait frais').length).toBeGreaterThan(0));

    fireEvent.press(screen.getByText('Valider la vente'));

    await waitFor(() => {
      expect(createVente).toHaveBeenCalledWith({
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });

    const successCall = Alert.alert.mock.calls.find(([title]) => title === 'Vente enregistrée');
    expect(successCall[1]).toContain('VNT-99');
    successCall[2][1].onPress();
    expect(navigation.navigate).toHaveBeenCalledWith('VenteTicket', {
      venteId: 99,
      vente: { id: 99, numero: 'VNT-99' },
    });
  });

  it('valide une vente à crédit avec client sélectionné et montant partiel', async () => {
    const navigation = { navigate: jest.fn(), setParams: jest.fn() };

    render(
      <VentesScreen
        navigation={navigation}
        route={{
          params: {
            scannedProduit: { id: 1, nom: 'Lait frais', stock: 8, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
          },
        }}
      />
    );

    await flushUiTimers();

    await waitFor(() => expect(getClients).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('Awa Ndiaye').length).toBeGreaterThan(0));

    fireEvent.press(screen.getAllByText('Awa Ndiaye')[0]);
    fireEvent.press(screen.getAllByText('Crédit')[0]);
    fireEvent.changeText(screen.getByPlaceholderText('Montant payé maintenant'), '100');
    fireEvent.press(screen.getByText('Valider la vente'));

    await waitFor(() => {
      expect(createVente).toHaveBeenCalledWith({
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: 100,
      });
    });

    const successCall = Alert.alert.mock.calls.find(([title]) => title === 'Vente enregistrée');
    expect(successCall[1]).toContain('VNT-99');
    successCall[2][1].onPress();
    expect(navigation.navigate).toHaveBeenCalledWith('VenteTicket', {
      venteId: 99,
      vente: { id: 99, numero: 'VNT-99' },
    });
  });

  it('augmente la quantité d’un article du panier avant validation', async () => {
    render(
      <VentesScreen
        navigation={{ navigate: jest.fn(), setParams: jest.fn() }}
        route={{
          params: {
            scannedProduit: { id: 1, nom: 'Lait frais', stock: 8, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
          },
        }}
      />
    );

    await flushUiTimers();

    await waitFor(() => expect(getVentes).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('Lait frais').length).toBeGreaterThan(0));

    fireEvent.press(screen.getByText('＋').parent);

    await waitFor(() => expect(screen.getAllByText('700 FCFA').length).toBeGreaterThan(0));

    fireEvent.press(screen.getByText('Valider la vente'));

    await waitFor(() => {
      expect(createVente).toHaveBeenCalledWith({
        details: [{ produitId: 1, quantite: 2, uniteVenteId: undefined }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('retire une ligne du panier et affiche l’état vide', async () => {
    render(
      <VentesScreen
        navigation={{ navigate: jest.fn(), setParams: jest.fn() }}
        route={{
          params: {
            scannedProduit: { id: 1, nom: 'Lait frais', stock: 8, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
          },
        }}
      />
    );

    await flushUiTimers();

    await waitFor(() => expect(getVentes).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Retirer')).toBeTruthy());

    fireEvent.press(screen.getByText('Retirer'));

    await waitFor(() => {
      expect(screen.getByText('Panier vide')).toBeTruthy();
    });
  });

  it('injecte les produits scannés multiples dans le panier et nettoie les params de navigation', async () => {
    const navigation = { navigate: jest.fn(), setParams: jest.fn() };

    render(
      <VentesScreen
        navigation={navigation}
        route={{
          params: {
            scannedItems: [
              { produit: { id: 1, nom: 'Lait frais', stock: 8, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111', datePeremption: '2026-03-10', alertePeremptionJours: 5 } },
              { produit: { id: 2, nom: 'Jus mangue', stock: 6, prixVente: 400, uniteBase: 'bouteille', unitesVente: [], codeBarre: '222', datePeremption: '2026-03-12', alertePeremptionJours: 4 } },
            ],
          },
        }}
      />
    );

    await flushUiTimers();

    await waitFor(() => expect(getVentes).toHaveBeenCalled());
    await waitFor(() => expect(screen.getAllByText('Lait frais').length).toBeGreaterThan(0));
    await waitFor(() => expect(screen.getAllByText('Jus mangue').length).toBeGreaterThan(0));

    expect(screen.getAllByText('750 FCFA').length).toBeGreaterThan(0);
    expect(navigation.setParams).toHaveBeenCalledWith({
      scannedItems: undefined,
      scannedLookup: undefined,
      scannedProduit: undefined,
    });
  });

  it('détecte une erreur d’upgrade par code et propose l’ouverture des abonnements', async () => {
    const navigation = { navigate: jest.fn(), setParams: jest.fn() };
    createVente.mockRejectedValue({
      response: {
        status: 403,
        data: {
          code: 'PLAN_UPGRADE_REQUIRED',
          message: 'Passez au plan supérieur pour enregistrer plus de ventes.',
        },
      },
    });

    render(
      <VentesScreen
        navigation={navigation}
        route={{
          params: {
            scannedProduit: { id: 1, nom: 'Lait frais', stock: 8, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
          },
        }}
      />
    );

    await flushUiTimers();
    await waitFor(() => expect(screen.getAllByText('Lait frais').length).toBeGreaterThan(0));

    fireEvent.press(screen.getByText('Valider la vente'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Erreur',
        'Passez au plan supérieur pour enregistrer plus de ventes.',
        expect.any(Array)
      );
    });

    const upgradeCall = Alert.alert.mock.calls.find(([title, message]) => title === 'Erreur' && message.includes('Passez au plan supérieur'));
    upgradeCall[2][1].onPress();
    expect(navigation.navigate).toHaveBeenCalledWith('Abonnement');
  });
});