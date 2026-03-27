import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Ventes from './Ventes';

const { authState, apiGet, apiPatch, toastSuccess, toastError } = vi.hoisted(() => ({
  authState: {
    isAdmin: true,
    isPro: false,
    planLimits: { ventesParMois: 100 },
  },
  apiGet: vi.fn(),
  apiPatch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    get: apiGet,
    patch: apiPatch,
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

describe('Ventes page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isPro = false;
    vi.stubGlobal('confirm', vi.fn(() => true));
    vi.stubGlobal('open', vi.fn());
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:facture-1'),
      revokeObjectURL: vi.fn(),
    });
    apiGet.mockResolvedValue({
      data: {
        data: [
          {
            id: 1,
            numero: 'VNT-001',
            createdAt: '2026-03-10T10:00:00.000Z',
            client: { prenom: 'Awa', nom: 'Ndiaye' },
            user: { prenom: 'Boss', nom: 'Tekki' },
            details: [{ produit: { nom: 'Riz local' }, quantite: 2, uniteNom: 'kg' }],
            montantTotal: 800,
            modePaiement: 'CASH',
            statut: 'COMPLETEE',
          },
        ],
      },
    });
    apiPatch.mockResolvedValue({ data: { success: true } });
  });

  it('bloque l’ouverture PDF pour un plan non Pro', async () => {
    render(<Ventes />);

    await waitFor(() => expect(screen.getByText('VNT-001')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Facture PDF indisponible pour la vente VNT-001/i }));

    expect(toastError).toHaveBeenCalledWith('Export PDF réservé au plan Pro. Passez à un plan supérieur.');
  });

  it('annule une vente puis recharge la liste', async () => {
    render(<Ventes />);

    await waitFor(() => expect(screen.getByText('VNT-001')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Annuler la vente VNT-001/i }));

    await waitFor(() => {
      expect(apiPatch).toHaveBeenCalledWith('/ventes/1/annuler');
      expect(toastSuccess).toHaveBeenCalledWith('Vente annulée avec succès.');
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it('affiche un message mappé par code quand une vente est déjà annulée', async () => {
    apiPatch.mockRejectedValueOnce({ response: { status: 400, data: { code: 'SALE_ALREADY_CANCELLED' } } });

    render(<Ventes />);

    await waitFor(() => expect(screen.getByText('VNT-001')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Annuler la vente VNT-001/i }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Cette vente est déjà annulée.');
    });
  });

  it('ouvre la facture via une requête authentifiée sans mettre le token dans l’URL', async () => {
    authState.isPro = true;
    apiGet
      .mockResolvedValueOnce({
        data: {
          data: [
            {
              id: 1,
              numero: 'VNT-001',
              createdAt: '2026-03-10T10:00:00.000Z',
              client: { prenom: 'Awa', nom: 'Ndiaye' },
              user: { prenom: 'Boss', nom: 'Tekki' },
              details: [{ produit: { nom: 'Riz local' }, quantite: 2, uniteNom: 'kg' }],
              montantTotal: 800,
              modePaiement: 'CASH',
              statut: 'COMPLETEE',
            },
          ],
        },
      })
      .mockResolvedValueOnce({ data: new Blob(['pdf'], { type: 'application/pdf' }) });

    render(<Ventes />);

    await waitFor(() => expect(screen.getByText('VNT-001')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Voir la facture PDF de la vente VNT-001/i }));

    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith('/factures/1/pdf', { responseType: 'blob' });
      expect(window.open).toHaveBeenCalledWith('blob:facture-1', '_blank', 'noopener,noreferrer');
      expect(window.URL.createObjectURL).toHaveBeenCalled();
    });
  });
});