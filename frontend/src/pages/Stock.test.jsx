import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Stock from './Stock';

const { authState, apiGet, apiPost, toastSuccess, toastError } = vi.hoisted(() => ({
  authState: { isAdmin: true },
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const inventoryData = {
  produits: [
    { id: 1, nom: 'Riz local', categorie: { nom: 'Céréales' }, stock: 2, stockAlerte: 5, uniteBase: 'kg', unitesVente: [], valeurStock: 500, enAlerte: true },
    { id: 2, nom: 'Savon doux', categorie: { nom: 'Hygiène' }, stock: 12, stockAlerte: 3, uniteBase: 'piece', unitesVente: [], valeurStock: 2400, enAlerte: false },
  ],
  totalProduits: 2,
  totalValeurStock: 2900,
  produitsEnAlerte: 1,
};

vi.mock('../services/api', () => ({
  default: {
    get: apiGet,
    post: apiPost,
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

describe('Stock page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockImplementation(async (url) => {
      if (url === '/stock/inventaire') return { data: { data: inventoryData } };
      if (url === '/stock/historique') return { data: { data: [] } };
      if (url === '/produits') return { data: { data: inventoryData.produits } };
      if (url === '/fournisseurs') return { data: { data: [{ id: 2, nom: 'Fournisseur Dakar' }] } };
      throw new Error(`Unexpected GET ${url}`);
    });
    apiPost.mockResolvedValue({ data: { success: true } });
  });

  it('filtre la liste d’inventaire avec la recherche', async () => {
    render(<Stock />);

    await waitFor(() => expect(screen.getByText('Riz local')).toBeInTheDocument());
    expect(screen.getByText('Savon doux')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Rechercher un produit...'), { target: { value: 'riz' } });

    expect(screen.getByText('Riz local')).toBeInTheDocument();
    expect(screen.queryByText('Savon doux')).not.toBeInTheDocument();
  });

  it('enregistre une entrée de stock puis recharge les données', async () => {
    const { container } = render(<Stock />);

    await waitFor(() => expect(screen.getByRole('button', { name: /Entrée de stock/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Entrée de stock/i }));

    await waitFor(() => expect(container.querySelector('.stk-modal')).not.toBeNull());
    const dialog = container.querySelector('.stk-modal');
    const selects = dialog.querySelectorAll('select');
    const inputs = dialog.querySelectorAll('input');

    fireEvent.change(selects[0], { target: { value: '1' } });
    fireEvent.change(inputs[0], { target: { value: '5' } });
    fireEvent.change(inputs[1], { target: { value: '120' } });
    fireEvent.change(selects[1], { target: { value: '2' } });
    fireEvent.click(dialog.querySelector('button[type="submit"]'));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/stock/entree', {
        produitId: '1',
        quantite: '5',
        prixAchat: '120',
        fournisseurId: '2',
        uniteVenteId: undefined,
      });
      expect(toastSuccess).toHaveBeenCalledWith('Stock mis à jour avec succès.');
    });
  });
});