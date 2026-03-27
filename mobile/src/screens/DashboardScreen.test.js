import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import DashboardScreen from './DashboardScreen';
import { getDashboard, getInventaire, getTopProduits, getVentesParJour } from '../lib/api';

const translate = (key, params = {}) => {
  const dict = {
    'dashboard.expirationAlerts': 'Péremptions à surveiller',
    'dashboard.expirationHint': 'Repère immédiatement les produits expirés ou proches de la date limite.',
    'dashboard.viewStock': 'Voir le stock',
    'dashboard.expirationHealthy': 'Aucune péremption urgente pour le moment.',
    'dashboard.quickActions': 'Actions rapides',
    'dashboard.expiresToday': 'Expire aujourd’hui',
  };
  if (key === 'dashboard.expiredCount') return `${params.count} expiré(s)`;
  if (key === 'dashboard.expiringSoonCount') return `${params.count} bientôt expiré(s)`;
  if (key === 'dashboard.expiresInDays') return `Dans ${params.count} j`;
  if (key === 'dashboard.expiredDaysAgo') return `Dépassé depuis ${params.count} j`;
  if (key === 'dashboard.moreExpirationItems') return `+${params.count} autre(s) à surveiller`;
  return dict[key] || key;
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN', nom: 'Boss' },
    logout: jest.fn(),
    boutique: { id: 1, nom: 'Tekki Shop', plan: 'PRO' },
    activeBoutique: null,
    mesBoutiques: [],
    switchBoutique: jest.fn(),
    getActiveBoutiqueName: () => 'Tekki Shop',
    isBusiness: false,
    plan: 'PRO',
  }),
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ locale: 'fr-FR', t: translate }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock('../lib/api', () => ({
  getDashboard: jest.fn(),
  getInventaire: jest.fn(),
  getTopProduits: jest.fn(),
  getVentesParJour: jest.fn(),
}));

describe('DashboardScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(global, 'setInterval').mockImplementation(() => 0);
    jest.spyOn(global, 'clearInterval').mockImplementation(() => {});

    getDashboard.mockResolvedValue({
      data: {
        success: true,
        data: {
          ventesJour: { total: 25000, nombre: 3 },
          ventesMois: { total: 190000, nombre: 12 },
          dettesEnCours: { total: 5000, nombre: 1 },
          stock: { produitsEnAlerte: 2 },
          produitsActifs: 18,
          clients: 9,
          beneficeJour: 7000,
          beneficeMois: 45000,
        },
      },
    });
    getInventaire.mockResolvedValue({
      data: {
        success: true,
        data: {
          produits: [
            { id: 1, nom: 'Lait caillé', datePeremption: '2026-03-01', joursAvantPeremption: -2, estExpire: true, enAlertePeremption: false },
            { id: 2, nom: 'Yaourt frais', datePeremption: '2026-03-05', joursAvantPeremption: 2, estExpire: false, enAlertePeremption: true },
          ],
        },
      },
    });
    getTopProduits.mockResolvedValue({ data: { success: true, data: [] } });
    getVentesParJour.mockResolvedValue({ data: { success: true, data: [] } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche le panneau de péremption et navigue vers le stock', async () => {
    const navigation = { navigate: jest.fn() };
    const { UNSAFE_getAllByType } = render(<DashboardScreen navigation={navigation} />);

    await waitFor(() => expect(getDashboard).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Péremptions à surveiller')).toBeTruthy());

    expect(screen.getByText('1 expiré(s)')).toBeTruthy();
    expect(screen.getByText('1 bientôt expiré(s)')).toBeTruthy();

    const textNodes = UNSAFE_getAllByType(Text)
      .map((node) => node.props.children)
      .filter((value) => typeof value === 'string');
    expect(textNodes.indexOf('Actions rapides')).toBeLessThan(textNodes.indexOf('Péremptions à surveiller'));

    fireEvent.press(screen.getByText('Voir le stock'));
    expect(navigation.navigate).toHaveBeenCalledWith('Stock');
  });
});