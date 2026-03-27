import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Dettes from './Dettes';

const { apiGet, apiPost, toastSuccess, toastError } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../services/api', () => ({ default: { get: apiGet, post: apiPost } }));
vi.mock('react-hot-toast', () => ({ default: { success: toastSuccess, error: toastError } }));
vi.mock('../context/useAuth', () => ({ useAuth: () => ({ plan: 'PRO', planUsage: null, isPro: true }) }));

describe('Dettes page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockResolvedValue({
      data: {
        data: {
          dettes: [{
            id: 1,
            statut: 'EN_COURS',
            createdAt: '2026-03-11T10:00:00.000Z',
            montantTotal: 1000,
            montantPaye: 400,
            montantRestant: 600,
            client: { prenom: 'Awa', nom: 'Ndiaye', telephone: '770000000' },
            vente: { numero: 'VNT-50', details: [{ produit: { nom: 'Riz local' } }] },
            remboursements: [],
          }],
          totalDettes: 600,
          nombreEnCours: 1,
        },
      },
    });
    apiPost.mockResolvedValue({ data: { success: true } });
  });

  it('rembourse une dette puis recharge la liste', async () => {
    render(<Dettes />);

    await waitFor(() => expect(screen.getByText('VNT-50')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Rembourser/i }));
    fireEvent.click(screen.getByRole('button', { name: /Tout payer/i }));

    expect(screen.getByText('Cette dette sera entièrement remboursée !')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Confirmer le paiement/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/dettes/1/rembourser', { montant: 600 });
      expect(toastSuccess).toHaveBeenCalledWith('Paiement enregistré avec succès.');
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });

  it('bloque un remboursement supérieur au restant dû', async () => {
    render(<Dettes />);

    await waitFor(() => expect(screen.getByText('VNT-50')).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Rembourser/i }));
    fireEvent.change(document.querySelector('.modal input[type="number"]'), { target: { value: '700' } });
    fireEvent.submit(document.querySelector('.modal form'));

    expect(apiPost).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Le montant ne peut pas dépasser 600 CFA');
    });
  });
});