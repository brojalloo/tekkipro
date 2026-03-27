import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Produits from './Produits';

const { authState, apiGet, apiDelete, toastSuccess, toastError } = vi.hoisted(() => ({
  authState: {
    isAdmin: true,
    planLimits: { produits: 100 },
  },
  apiGet: vi.fn(),
  apiDelete: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    get: apiGet,
    delete: apiDelete,
  },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccess,
    error: toastError,
  },
}));

describe('Produits page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('confirm', vi.fn(() => true));
    apiGet.mockResolvedValue({
      data: {
        data: [
          { id: 1, nom: 'Riz local', categorie: { nom: 'Céréales' }, prixVente: 400, prixAchat: 250, stock: 2, stockAlerte: 5, actif: true, uniteBase: 'kg', unitesVente: [] },
          { id: 2, nom: 'Savon doux', categorie: { nom: 'Hygiène' }, prixVente: 300, prixAchat: 200, stock: 12, stockAlerte: 3, actif: true, uniteBase: 'piece', unitesVente: [] },
        ],
      },
    });
    apiDelete.mockResolvedValue({ data: { success: true } });
  });

  it('filtre les produits en alerte de stock via la carte statistique', async () => {
    render(
      <MemoryRouter>
        <Produits />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalled());
    expect(screen.getByText('Riz local')).toBeInTheDocument();
    expect(screen.getByText('Savon doux')).toBeInTheDocument();

    fireEvent.click(screen.getByText('En alerte stock'));

    expect(screen.getByText('Riz local')).toBeInTheDocument();
    expect(screen.queryByText('Savon doux')).not.toBeInTheDocument();
    expect(screen.getByText('1 produit')).toBeInTheDocument();
  });

  it('désactive un produit puis recharge la liste', async () => {
    render(
      <MemoryRouter>
        <Produits />
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText('Riz local')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Désactiver le produit Riz local/i }));

    await waitFor(() => {
      expect(apiDelete).toHaveBeenCalledWith('/produits/1');
      expect(toastSuccess).toHaveBeenCalledWith('Produit désactivé avec succès.');
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});