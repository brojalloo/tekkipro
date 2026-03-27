import React from 'react';
import { Alert, Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AbonnementScreen from './AbonnementScreen';
import { annulerAbonnement, createStripeSession, getAbonnement } from '../lib/api';

const mockAuthState = {
  activeBoutique: { id: 1 },
  refreshBoutique: jest.fn().mockResolvedValue(),
  user: { role: 'ADMIN' },
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR' }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('../lib/api', () => ({
  annulerAbonnement: jest.fn(),
  createStripeSession: jest.fn(),
  getAbonnement: jest.fn(),
  initiateFreeMoneyPayment: jest.fn(),
  renouvelerAbonnement: jest.fn(),
  souscrireAbonnement: jest.fn(),
}));

function abonnementResponse(plan = 'GRATUIT') {
  return {
    data: {
      success: true,
      data: {
        plan,
        planNom: plan === 'GRATUIT' ? 'Starter' : plan,
        abonnementActif: plan === 'GRATUIT' ? null : { plan, dateFin: '2026-12-31T00:00:00.000Z' },
        utilisation: {
          utilisateurs: { actuel: 1, limite: plan === 'GRATUIT' ? 1 : 5 },
          produits: { actuel: 12, limite: plan === 'GRATUIT' ? 50 : 999999 },
          clients: { actuel: 24, limite: plan === 'GRATUIT' ? 100 : 999999 },
          ventesParMois: { actuel: 18, limite: plan === 'GRATUIT' ? 100 : 999999 },
        },
        plans: {
          GRATUIT: { prix: 0 },
          PRO: { prix: 9900 },
          BUSINESS: { prix: 19900 },
        },
        historique: [],
      },
    },
  };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

async function renderScreen() {
  const rendered = render(<AbonnementScreen />);
  await act(async () => {
    await flushMicrotasks();
  });
  return rendered;
}

describe('AbonnementScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockAuthState.user = { role: 'ADMIN' };
    mockAuthState.refreshBoutique.mockResolvedValue();
    getAbonnement.mockResolvedValue(abonnementResponse('GRATUIT'));
    createStripeSession.mockResolvedValue({ data: { success: true, data: { url: 'https://stripe.test/session' } } });
    annulerAbonnement.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('ouvre Stripe pour souscrire au plan PRO puis recharge l’abonnement', async () => {
    await renderScreen();

    await waitFor(() => expect(screen.getByText('Plans disponibles')).toBeTruthy());
    getAbonnement.mockClear();
    fireEvent.press(screen.getByText('Passer à Pro'));
    expect(screen.getByText('Passer au plan PRO')).toBeTruthy();

    await act(async () => {
      fireEvent.press(screen.getByText('Confirmer'));
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(createStripeSession).toHaveBeenCalledWith({ plan: 'PRO', type: 'souscrire' });
      expect(Linking.openURL).toHaveBeenCalledWith('https://stripe.test/session');
      expect(Alert.alert).toHaveBeenCalledWith('Paiement lancé', 'La page de paiement Stripe a été ouverte. Reviens ensuite dans l’app pour actualiser.');
      expect(getAbonnement).toHaveBeenCalled();
    });
  });

  it('annule un abonnement actif après confirmation', async () => {
    getAbonnement.mockResolvedValue(abonnementResponse('PRO'));

    await renderScreen();

    await waitFor(() => expect(screen.getByText('Renouveler')).toBeTruthy());
    getAbonnement.mockClear();
    fireEvent.press(screen.getByText('Annuler'));

    const confirmCall = Alert.alert.mock.calls.find(([title]) => title === 'Annuler l’abonnement ?');
    expect(confirmCall).toBeTruthy();

    await act(async () => {
      await confirmCall[2][1].onPress();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(annulerAbonnement).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Succès', 'Abonnement annulé.');
      expect(getAbonnement).toHaveBeenCalled();
    });
  });
});