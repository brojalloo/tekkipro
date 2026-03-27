import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Fournisseurs from './Fournisseurs';

const { authState, apiGet, apiPost, apiPut, apiDelete, toastSuccess, toastError } = vi.hoisted(() => ({
  authState: { isPro: false, plan: 'GRATUIT' },
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../services/api', () => ({ default: { get: apiGet, post: apiPost, put: apiPut, delete: apiDelete } }));
vi.mock('../context/useAuth', () => ({ useAuth: () => authState }));
vi.mock('react-hot-toast', () => ({ default: { success: toastSuccess, error: toastError } }));

describe('Fournisseurs page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    authState.isPro = false;
    authState.plan = 'GRATUIT';
    apiGet.mockResolvedValue({ data: { data: [{ id: 1, nom: 'Alpha SARL', telephone: '770000000', email: 'alpha@test.dev', adresse: 'Dakar', _count: { produits: 2, entreeStocks: 1 } }] } });
    apiPost.mockResolvedValue({ data: { success: true } });
    apiDelete.mockResolvedValue({ data: { success: true } });
  });

  it('affiche le bandeau upgrade pour le plan gratuit', () => {
    render(<MemoryRouter><Fournisseurs /></MemoryRouter>);

    expect(screen.getByText('Transformez vos achats en réseau fiable')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Débloquer les fournisseurs/i })).toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('ajoute un fournisseur quand le plan pro est actif', async () => {
    authState.isPro = true;
    authState.plan = 'PRO';

    render(<MemoryRouter><Fournisseurs /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Alpha SARL')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Nouveau Fournisseur/i }));
    fireEvent.change(screen.getByPlaceholderText('Nom du fournisseur'), { target: { value: 'Beta Market' } });
    fireEvent.change(screen.getByPlaceholderText('+221 77 000 0000'), { target: { value: '781234567' } });
    fireEvent.change(screen.getByPlaceholderText('email@exemple.com'), { target: { value: 'beta@test.dev' } });
    fireEvent.change(screen.getByPlaceholderText('Adresse complète'), { target: { value: 'Thiès' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/fournisseurs', {
        nom: 'Beta Market', telephone: '781234567', email: 'beta@test.dev', adresse: 'Thiès',
      });
      expect(toastSuccess).toHaveBeenCalledWith('Fournisseur ajouté avec succès.');
    });
  });

  it('supprime un fournisseur puis recharge la liste', async () => {
    authState.isPro = true;
    authState.plan = 'PRO';

    render(<MemoryRouter><Fournisseurs /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText('Alpha SARL')).toBeInTheDocument());
    fireEvent.click(screen.getByTitle('Supprimer'));

    await waitFor(() => {
      expect(apiDelete).toHaveBeenCalledWith('/fournisseurs/1');
      expect(toastSuccess).toHaveBeenCalledWith('Fournisseur supprimé avec succès.');
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});