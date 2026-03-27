import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Clients from './Clients';

const { authState, apiGet, apiPost, apiPut, apiDelete, toastSuccess, toastError, mockNavigate, showUpgradeToast } = vi.hoisted(() => ({
  authState: { planLimits: { clients: 100 } },
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  mockNavigate: vi.fn(),
  showUpgradeToast: vi.fn(),
}));

vi.mock('../services/api', () => ({ default: { get: apiGet, post: apiPost, put: apiPut, delete: apiDelete } }));
vi.mock('../context/useAuth', () => ({ useAuth: () => authState }));
vi.mock('../lib/upgradeToast', () => ({ showUpgradeToast }));
vi.mock('react-hot-toast', () => ({ default: { success: toastSuccess, error: toastError } }));
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

describe('Clients page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    apiGet.mockResolvedValue({
      data: { data: [{ id: 1, nom: 'Ndiaye', prenom: 'Awa', telephone: '770000000', adresse: 'Dakar', totalDettes: 1000, nombreVentes: 2 }] },
    });
    apiPost.mockResolvedValue({ data: { success: true } });
    apiDelete.mockResolvedValue({ data: { success: true } });
  });

  it('ajoute un client puis recharge la liste', async () => {
    render(<MemoryRouter><Clients /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/Awa Ndiaye/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Nouveau Client/i }));

    fireEvent.change(screen.getByPlaceholderText('Prénom'), { target: { value: 'Moussa' } });
    fireEvent.change(screen.getByPlaceholderText('Nom de famille'), { target: { value: 'Fall' } });
    fireEvent.change(screen.getByPlaceholderText('+221 77 000 0000'), { target: { value: '780000000' } });
    fireEvent.change(screen.getByPlaceholderText('Adresse complète'), { target: { value: 'Thiès' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/clients', {
        nom: 'Fall', prenom: 'Moussa', telephone: '780000000', adresse: 'Thiès',
      });
      expect(toastSuccess).toHaveBeenCalledWith('Client ajouté avec succès.');
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it('supprime un client puis recharge la liste', async () => {
    render(<MemoryRouter><Clients /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/Awa Ndiaye/i)).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Supprimer'));

    await waitFor(() => {
      expect(apiDelete).toHaveBeenCalledWith('/clients/1');
      expect(toastSuccess).toHaveBeenCalledWith('Client supprimé avec succès.');
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});