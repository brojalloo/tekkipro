import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import EmployesScreen from './EmployesScreen';
import { createEmployee, getEmployees, toggleEmployee } from '../lib/api';

const authState = { user: { role: 'ADMIN' }, plan: 'PRO' };

jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback) => {
    const ReactLib = require('react');
    ReactLib.useEffect(() => callback(), []);
  },
}));

jest.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({
    language: 'fr',
    t: (key) => key,
  }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock('../lib/api', () => ({
  createEmployee: jest.fn(),
  deleteEmployee: jest.fn(),
  getEmployees: jest.fn(),
  toggleEmployee: jest.fn(),
  updateEmployee: jest.fn(),
}));

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

async function renderEmployesScreen(navigation) {
  const rendered = render(<EmployesScreen navigation={navigation} />);
  await act(async () => {
    await flushMicrotasks();
  });
  return rendered;
}

describe('EmployesScreen', () => {
  const navigation = { navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    authState.user = { role: 'ADMIN' };
    authState.plan = 'PRO';
    getEmployees.mockResolvedValue({
      data: {
        success: true,
        data: [{
          id: 1,
          prenom: 'Awa',
          nom: 'Ndiaye',
          email: 'awa@test.dev',
          telephone: '770000000',
          role: 'EMPLOYE',
          actif: true,
          nombreVentes: 0,
          isCurrentUser: false,
          peutSupprimer: true,
        }],
      },
    });
    createEmployee.mockResolvedValue({ data: { success: true, message: 'Employé ajouté avec succès.' } });
    toggleEmployee.mockResolvedValue({ data: { success: true, message: 'Employé désactivé avec succès.' } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('affiche le verrou admin quand l’utilisateur n’est pas administrateur', async () => {
    authState.user = { role: 'EMPLOYE' };

    await renderEmployesScreen(navigation);

    expect(screen.getByText('employees.accessAdminTitle')).toBeTruthy();
    expect(getEmployees).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('common.back'));
    expect(navigation.goBack).toHaveBeenCalled();
  });

  it('crée un employé puis recharge la liste', async () => {
    await renderEmployesScreen(navigation);

    await waitFor(() => expect(screen.getByText('Awa Ndiaye')).toBeTruthy());
    fireEvent.press(screen.getByText('employees.addEmployee'));
    fireEvent.changeText(screen.getByPlaceholderText('Ex: Awa'), 'Moussa');
    fireEvent.changeText(screen.getByPlaceholderText('Ex: Diop'), 'Fall');
    fireEvent.changeText(screen.getByPlaceholderText('nom@exemple.com'), 'moussa@tekki.dev');
    fireEvent.changeText(screen.getByPlaceholderText('employees.passwordCreatePlaceholder'), 'secret12');
    fireEvent.changeText(screen.getByPlaceholderText('common.optional'), '781112233');
    await act(async () => {
      fireEvent.press(screen.getByText('common.add'));
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(createEmployee).toHaveBeenCalledWith({
        nom: 'Fall',
        prenom: 'Moussa',
        email: 'moussa@tekki.dev',
        telephone: '781112233',
        role: 'EMPLOYE',
        password: 'secret12',
      });
      expect(Alert.alert).toHaveBeenCalledWith('common.success', 'Employé ajouté avec succès.');
    });
    expect(getEmployees).toHaveBeenCalledTimes(2);
  });

  it('désactive un employé puis recharge la liste', async () => {
    await renderEmployesScreen(navigation);

    await waitFor(() => expect(screen.getByText('Awa Ndiaye')).toBeTruthy());
    fireEvent.press(screen.getByText('common.disable'));

    const confirmCall = Alert.alert.mock.calls.find(([title]) => title === 'employees.toggleDisableTitle');
    expect(confirmCall).toBeTruthy();

    await act(async () => {
      await confirmCall[2][1].onPress();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(toggleEmployee).toHaveBeenCalledWith(1);
      expect(Alert.alert).toHaveBeenCalledWith('common.success', 'Employé désactivé avec succès.');
    });
    expect(getEmployees).toHaveBeenCalledTimes(2);
  });
});