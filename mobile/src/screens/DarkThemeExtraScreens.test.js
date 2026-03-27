import React from 'react';
import { render, screen } from '@testing-library/react-native';
import EmployesScreen from './EmployesScreen';
import ClientsScreen from './ClientsScreen';
import DettesScreen from './DettesScreen';
import AbonnementScreen from './AbonnementScreen';

const never = () => new Promise(() => {});
const mockRefreshBoutique = jest.fn().mockResolvedValue();

jest.mock('@react-navigation/native', () => {
  const ReactLib = require('react');
  return {
    useFocusEffect: (callback) => {
      ReactLib.useEffect(() => callback(), [callback]);
    },
  };
});

jest.mock('../context/AuthContext', () => ({
  useAuth: () => ({ plan: 'PRO', user: { role: 'ADMIN' }, activeBoutique: { id: 1 }, refreshBoutique: mockRefreshBoutique }),
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR', t: (key) => key }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true, isLight: false, theme: 'dark' }),
}));

jest.mock('../lib/api', () => ({
  createClient: jest.fn(), createEmployee: jest.fn(), deleteClient: jest.fn(), deleteEmployee: jest.fn(),
  updateClient: jest.fn(), updateEmployee: jest.fn(), toggleEmployee: jest.fn(), rembourserDette: jest.fn(),
  annulerAbonnement: jest.fn(), createStripeSession: jest.fn(), initiateFreeMoneyPayment: jest.fn(),
  renouvelerAbonnement: jest.fn(), souscrireAbonnement: jest.fn(),
  getEmployees: jest.fn(() => never()), getClients: jest.fn(() => never()), getDettes: jest.fn(() => never()), getAbonnement: jest.fn(() => never()),
}));

describe('dark theme on extra screens', () => {
  let consoleErrorSpy;

  const hasColor = (node, color, seen = new WeakSet()) => {
    if (!node || typeof node !== 'object') return false;
    if (seen.has(node)) return false;
    seen.add(node);
    const styles = Array.isArray(node.props?.style) ? node.props.style.flat(Infinity) : [node.props?.style];
    if (styles.some((style) => style && typeof style === 'object' && Object.values(style).includes(color))) return true;
    if (Array.isArray(node.children) && node.children.some((child) => hasColor(child, color, seen))) return true;
    return Object.values(node).some((value) => Array.isArray(value) ? value.some((child) => hasColor(child, color, seen)) : hasColor(value, color, seen));
  };

  beforeEach(() => {
    jest.clearAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    const actWarnings = consoleErrorSpy.mock.calls.filter((args) => String(args[0] || '').includes('not wrapped in act'));
    expect(actWarnings).toHaveLength(0);
    consoleErrorSpy.mockRestore();
  });

  it('renders ClientsScreen loading state in dark mode', () => {
    const tree = render(<ClientsScreen navigation={{ navigate: jest.fn() }} />);
    expect(hasColor(tree.toJSON(), '#040c18')).toBe(true);
  });

  it('renders EmployesScreen loading state in dark mode', () => {
    const tree = render(<EmployesScreen navigation={{ navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() }} />);
    expect(hasColor(tree.toJSON(), '#040c18')).toBe(true);
  });

  it('renders DettesScreen loading state in dark mode', () => {
    const tree = render(<DettesScreen />);
    expect(hasColor(tree.toJSON(), '#040c18')).toBe(true);
  });

  it('renders AbonnementScreen loading state in dark mode', () => {
    const tree = render(<AbonnementScreen />);
    expect(screen.getByTestId('abonnement-loader')).toBeTruthy();
    expect(hasColor(tree.toJSON(), '#040c18')).toBe(true);
  });
});

