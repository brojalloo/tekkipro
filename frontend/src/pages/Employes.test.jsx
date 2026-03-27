import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Employes from './Employes';

const { authState, apiGet, apiPost, apiPatch, toastSuccess, toastError } = vi.hoisted(() => ({
  authState: { isPro: false, plan: 'GRATUIT' },
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPatch: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../services/api', () => ({ default: { get: apiGet, post: apiPost, patch: apiPatch } }));
vi.mock('../context/useAuth', () => ({ useAuth: () => authState }));
vi.mock('react-hot-toast', () => ({ default: { success: toastSuccess, error: toastError } }));

describe('Employes page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.isPro = false;
    authState.plan = 'GRATUIT';
    apiGet.mockResolvedValue({ data: { data: [{ id: 1, prenom: 'Awa', nom: 'Ndiaye', email: 'awa@test.dev', telephone: '770000000', role: 'EMPLOYE', actif: true }] } });
    apiPost.mockResolvedValue({ data: { success: true } });
    apiPatch.mockResolvedValue({ data: { message: 'Employé désactivé avec succès.' } });
  });

  it('affiche le bandeau upgrade pour le plan gratuit', () => {
    render(<MemoryRouter><Employes /></MemoryRouter>);

    expect(screen.getByText('Structurez votre équipe sans perdre le contrôle')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Débloquer la gestion d’équipe/i })).toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('ajoute un employé quand le plan pro est actif', async () => {
    authState.isPro = true;
    authState.plan = 'PRO';

    render(<MemoryRouter><Employes /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/Awa Ndiaye/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Ajouter un employé/i }));
    const inputs = document.querySelectorAll('.modal input');
    fireEvent.change(inputs[0], { target: { value: 'Moussa' } });
    fireEvent.change(inputs[1], { target: { value: 'Fall' } });
    fireEvent.change(inputs[2], { target: { value: 'moussa@tekki.dev' } });
    fireEvent.change(inputs[3], { target: { value: 'secret12' } });
    fireEvent.change(inputs[4], { target: { value: '781112233' } });
    fireEvent.click(screen.getByRole('button', { name: /^Ajouter$/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/auth/employees', {
        nom: 'Fall', prenom: 'Moussa', email: 'moussa@tekki.dev', password: 'secret12', telephone: '781112233',
      });
      expect(toastSuccess).toHaveBeenCalledWith('Employé ajouté avec succès.');
    });
  });

  it('désactive un employé puis recharge la liste', async () => {
    authState.isPro = true;
    authState.plan = 'PRO';

    render(<MemoryRouter><Employes /></MemoryRouter>);

    await waitFor(() => expect(screen.getByText(/Awa Ndiaye/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Désactiver/i }));

    await waitFor(() => {
      expect(apiPatch).toHaveBeenCalledWith('/auth/employees/1/toggle');
      expect(toastSuccess).toHaveBeenCalledWith('Employé désactivé avec succès.');
    });
    expect(apiGet).toHaveBeenCalledTimes(2);
  });
});