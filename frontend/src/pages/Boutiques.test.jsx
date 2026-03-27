import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Boutiques from './Boutiques';

const { authState, mockNavigate, apiGet, toastError } = vi.hoisted(() => ({
  authState: {
    boutique: { id: 1, plan: 'GRATUIT' },
    isAdmin: true,
    isBusiness: false,
    loadMesBoutiques: vi.fn(),
    switchBoutique: vi.fn(),
    activeBoutique: null,
  },
  mockNavigate: vi.fn(),
  apiGet: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    get: apiGet,
    delete: vi.fn(),
  },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: toastError,
    success: vi.fn(),
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Boutiques page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState.boutique = { id: 1, plan: 'GRATUIT' };
    authState.isAdmin = true;
    authState.isBusiness = false;
    authState.activeBoutique = null;
  });

  it('affiche le bandeau upgrade Business quand la fonctionnalité est verrouillée', () => {
    render(
      <MemoryRouter>
        <Boutiques />
      </MemoryRouter>
    );

    expect(screen.getByText('Pilotez plusieurs boutiques depuis un seul espace')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Passer au plan Business/i })).toBeInTheDocument();
    expect(apiGet).not.toHaveBeenCalled();
  });

  it('charge les boutiques quand un admin Business est autorisé', async () => {
    authState.boutique = { id: 1, plan: 'BUSINESS' };
    authState.isBusiness = true;
    apiGet.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, nom: 'Boutique Dakar', _count: { produits: 4, ventes: 2, clients: 3 } },
          { id: 2, nom: 'Boutique Thiès', parentBoutiqueId: 1, _count: { produits: 2, ventes: 1, clients: 1 } },
        ],
      },
    });

    render(
      <MemoryRouter>
        <Boutiques />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/boutique/mes-boutiques'));
    expect(await screen.findByText('Mes Boutiques')).toBeInTheDocument();
    expect(screen.getByText('Boutique Dakar')).toBeInTheDocument();
    expect(screen.getByText('Boutique Thiès')).toBeInTheDocument();
  });
});