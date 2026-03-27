import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import ClientsScreen from './ClientsScreen';
import { createClient, deleteClient, getClients } from '../lib/api';

const authState = { plan: 'PRO', user: { role: 'ADMIN' } };

jest.mock('../context/AuthContext', () => ({
  useAuth: () => authState,
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR' }),
}));

jest.mock('../context/ThemeContext', () => ({
  useTheme: () => ({ isDark: true }),
}));

jest.mock('../lib/api', () => ({
  createClient: jest.fn(),
  deleteClient: jest.fn(),
  getClients: jest.fn(),
  updateClient: jest.fn(),
}));

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

async function renderClientsScreen(navigation) {
  const rendered = render(<ClientsScreen navigation={navigation} />);
  await act(async () => {
    await flushMicrotasks();
  });
  return rendered;
}

describe('ClientsScreen', () => {
  const navigation = { navigate: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    authState.plan = 'PRO';
    authState.user = { role: 'ADMIN' };
    getClients.mockResolvedValue({
      data: {
        success: true,
        data: [{ id: 1, nom: 'Ndiaye', prenom: 'Awa', telephone: '770000000', adresse: 'Dakar', totalDettes: 1000, nombreVentes: 2 }],
      },
    });
    createClient.mockResolvedValue({ data: { success: true } });
    deleteClient.mockResolvedValue({ data: { success: true } });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('crée un client puis recharge la liste', async () => {
    await renderClientsScreen(navigation);

    await waitFor(() => expect(screen.getByText('Awa Ndiaye')).toBeTruthy());

    fireEvent.press(screen.getByText('Ajouter un client'));
    fireEvent.changeText(screen.getByPlaceholderText('Nom'), 'Fall');
    fireEvent.changeText(screen.getByPlaceholderText('Prénom'), 'Moussa');
    fireEvent.changeText(screen.getByPlaceholderText('77 123 45 67'), '781234567');
    fireEvent.changeText(screen.getByPlaceholderText('Adresse / quartier'), 'Thiès');
    await act(async () => {
      fireEvent.press(screen.getByText('Créer'));
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(createClient).toHaveBeenCalledWith({ nom: 'Fall', prenom: 'Moussa', telephone: '781234567', adresse: 'Thiès' });
      expect(Alert.alert).toHaveBeenCalledWith('Succès', 'Client ajouté avec succès.');
    });
    expect(getClients).toHaveBeenCalledTimes(2);
  });

  it('supprime un client puis recharge la liste', async () => {
    await renderClientsScreen(navigation);

    await waitFor(() => expect(screen.getByText('Awa Ndiaye')).toBeTruthy());
    fireEvent.press(screen.getByText('Supprimer'));

    const confirmCall = Alert.alert.mock.calls.find(([title]) => title === 'Supprimer ce client ?');
    expect(confirmCall).toBeTruthy();

    await act(async () => {
      await confirmCall[2][1].onPress();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(deleteClient).toHaveBeenCalledWith(1);
      expect(Alert.alert).toHaveBeenCalledWith('Succès', 'Client supprimé avec succès.');
    });
    expect(getClients).toHaveBeenCalledTimes(2);
  });
});