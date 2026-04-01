import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ProduitForm from './ProduitForm';

const { apiGet, apiPost, apiPut, apiDelete, mockNavigate, toastSuccess, toastError, showUpgradeToast } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiPut: vi.fn(),
  apiDelete: vi.fn(),
  mockNavigate: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  showUpgradeToast: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    get: apiGet,
    post: apiPost,
    put: apiPut,
    delete: apiDelete,
  },
}));

vi.mock('../features/products/components/BarcodeScannerInput', () => ({
  default: ({ active, onScan }) => (active ? (
    <button type="button" onClick={() => onScan('777888999')}>
      Mock scanner submit
    </button>
  ) : null),
}));

vi.mock('../lib/upgradeToast', () => ({
  showUpgradeToast,
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ProduitForm page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockImplementation(async (url) => {
      if (url === '/categories') return { data: { data: [{ id: 1, nom: 'Épicerie' }] } };
      if (url === '/fournisseurs') return { data: { data: [{ id: 2, nom: 'Grossiste Dakar' }] } };
      throw new Error(`Unexpected GET ${url}`);
    });
    apiPost.mockResolvedValue({ data: { success: true, data: { id: 22 } } });
    apiPut.mockResolvedValue({ data: { success: true, data: { id: 7 } } });
    apiDelete.mockResolvedValue({ data: { success: true } });
  });

  it('crée un produit manuel puis redirige vers la liste', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/nouveau']}>
        <Routes>
          <Route path="/app/produits/nouveau" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/categories'));

    fireEvent.change(container.querySelector('input[name="nom"]'), { target: { value: 'Riz local premium' } });
    fireEvent.change(container.querySelector('input[placeholder="Ex: 20"]'), { target: { value: '20' } });
    fireEvent.change(container.querySelector('input[name="prixVente"]'), { target: { value: '500' } });
    fireEvent.change(container.querySelector('input[name="prixAchat"]'), { target: { value: '350' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/produits', expect.objectContaining({
        nom: 'Riz local premium',
        stock: 20,
        uniteBase: 'g',
        prixVente: '500',
        prixAchat: '350',
        unitesVente: [],
      }));
      expect(toastSuccess).toHaveBeenCalledWith('Produit créé avec succès.');
      expect(mockNavigate).toHaveBeenCalledWith('/app/produits');
    });
  }, 10000);

  it('charge un produit en édition puis enregistre la mise à jour', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/categories') return { data: { data: [{ id: 1, nom: 'Épicerie' }] } };
      if (url === '/fournisseurs') return { data: { data: [{ id: 2, nom: 'Grossiste Dakar' }] } };
      if (url === '/produits/7') {
        return {
          data: {
            data: {
              id: 7,
              nom: 'Riz local',
              description: 'Sachet',
              prixVente: 400,
              prixAchat: 250,
              stock: 12,
              stockAlerte: 3,
              uniteBase: 'g',
              codeBarre: '111222',
              categorieId: 1,
              fournisseurId: 2,
              unitesVente: [],
            },
          },
        };
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/7']}>
        <Routes>
          <Route path="/app/produits/:id" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits/7'));
    expect(container.querySelector('input[name="nom"]').value).toBe('Riz local');

    fireEvent.change(container.querySelector('input[name="nom"]'), { target: { value: 'Riz local modifié' } });
    fireEvent.change(container.querySelector('input[name="prixVente"]'), { target: { value: '450' } });
    fireEvent.change(container.querySelector('input[name="codeBarre"]'), { target: { value: '777888' } });
    fireEvent.click(screen.getByRole('button', { name: /Mettre à jour/i }));

    await waitFor(() => {
      expect(apiPut).toHaveBeenCalledWith('/produits/7', expect.objectContaining({
        nom: 'Riz local modifié',
        prixVente: '450',
        codeBarre: '777888',
        stock: 12,
        uniteBase: 'g',
      }));
      expect(toastSuccess).toHaveBeenCalledWith('Produit mis à jour avec succès.');
      expect(mockNavigate).toHaveBeenCalledWith('/app/produits');
    });
  });

  it('redirige vers la liste si le produit à éditer est introuvable', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/categories') return { data: { data: [{ id: 1, nom: 'Épicerie' }] } };
      if (url === '/fournisseurs') return { data: { data: [{ id: 2, nom: 'Grossiste Dakar' }] } };
      if (url === '/produits/404') throw new Error('not found');
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/app/produits/404']}>
        <Routes>
          <Route path="/app/produits/:id" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits/404'));
    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith('Produit non trouvé');
      expect(mockNavigate).toHaveBeenCalledWith('/app/produits');
    });
  });

  it('affiche une erreur de suppression d’unité mais retire la ligne de l’UI', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/categories') return { data: { data: [{ id: 1, nom: 'Épicerie' }] } };
      if (url === '/fournisseurs') return { data: { data: [{ id: 2, nom: 'Grossiste Dakar' }] } };
      if (url === '/produits/7') {
        return {
          data: {
            data: {
              id: 7,
              nom: 'Riz local',
              description: 'Sachet',
              prixVente: 400,
              prixAchat: 250,
              stock: 12,
              stockAlerte: 3,
              uniteBase: 'g',
              codeBarre: '111222',
              categorieId: 1,
              fournisseurId: 2,
              unitesVente: [{ id: 15, nom: 'Sac 25kg', facteurConversion: 25000, prix: 13000, estDefaut: true }],
            },
          },
        };
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    apiDelete.mockRejectedValueOnce(new Error('delete failed'));

    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/7']}>
        <Routes>
          <Route path="/app/produits/:id" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue('Sac 25kg')).toBeInTheDocument());

    fireEvent.click(container.querySelector('.pf-fraction-delete'));

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/produits/unites/15'));
    expect(toastError).toHaveBeenCalledWith('Erreur de suppression');
    await waitFor(() => expect(screen.queryByDisplayValue('Sac 25kg')).not.toBeInTheDocument());
  });

  it('supprime une unité existante avec succès sans afficher d’erreur', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/categories') return { data: { data: [{ id: 1, nom: 'Épicerie' }] } };
      if (url === '/fournisseurs') return { data: { data: [{ id: 2, nom: 'Grossiste Dakar' }] } };
      if (url === '/produits/7') {
        return {
          data: {
            data: {
              id: 7,
              nom: 'Riz local',
              description: 'Sachet',
              prixVente: 400,
              prixAchat: 250,
              stock: 12,
              stockAlerte: 3,
              uniteBase: 'g',
              codeBarre: '111222',
              categorieId: 1,
              fournisseurId: 2,
              unitesVente: [{ id: 15, nom: 'Sac 25kg', facteurConversion: 25000, prix: 13000, estDefaut: true }],
            },
          },
        };
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/7']}>
        <Routes>
          <Route path="/app/produits/:id" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue('Sac 25kg')).toBeInTheDocument());

    fireEvent.click(container.querySelector('.pf-fraction-delete'));

    await waitFor(() => expect(apiDelete).toHaveBeenCalledWith('/produits/unites/15'));
    expect(toastError).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByDisplayValue('Sac 25kg')).not.toBeInTheDocument());
  });

  it('renseigne le code-barres depuis le scanner intégré', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/nouveau']}>
        <Routes>
          <Route path="/app/produits/nouveau" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/categories'));

    fireEvent.click(screen.getByRole('button', { name: /Scanner/i }));
    fireEvent.click(screen.getByRole('button', { name: /Mock scanner submit/i }));

    await waitFor(() => {
      expect(container.querySelector('input[name="codeBarre"]').value).toBe('777888999');
      expect(toastSuccess).toHaveBeenCalledWith('Code-barres scanné : 777888999');
    });
  }, 15000);

  it('préremplit le code-barres depuis l’URL et revient vers la vente après création depuis un scan inconnu', async () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/nouveau?codeBarre=999&returnTo=vente']}>
        <Routes>
          <Route path="/app/produits/nouveau" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/categories'));
    expect(container.querySelector('input[name="codeBarre"]').value).toBe('999');

    fireEvent.change(container.querySelector('input[name="nom"]'), { target: { value: 'Produit scanné' } });
    fireEvent.change(container.querySelector('input[placeholder="Ex: 20"]'), { target: { value: '5' } });
    fireEvent.change(container.querySelector('input[name="prixVente"]'), { target: { value: '600' } });
    fireEvent.change(container.querySelector('input[name="prixAchat"]'), { target: { value: '400' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/produits', expect.objectContaining({
        nom: 'Produit scanné',
        codeBarre: '999',
        stock: 5,
      }));
      expect(mockNavigate).toHaveBeenCalledWith('/app/ventes/nouvelle?codeBarre=999');
    });
  }, 15000);

  it('revient vers la vente via le bouton retour quand le formulaire vient d’un scan inconnu', async () => {
    render(
      <MemoryRouter initialEntries={['/app/produits/nouveau?codeBarre=999&returnTo=vente']}>
        <Routes>
          <Route path="/app/produits/nouveau" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/categories'));
    fireEvent.click(screen.getByRole('button', { name: /Retour aux produits/i }));

    expect(mockNavigate).toHaveBeenCalledWith('/app/ventes/nouvelle?codeBarre=999');
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('utilise showUpgradeToast quand l’API renvoie une erreur upgrade', async () => {
    apiPost.mockRejectedValueOnce({
      response: {
        data: {
          code: 'PLAN_UPGRADE_REQUIRED',
          message: 'Passez au plan supérieur pour créer plus de produits.',
          upgrade: true,
        },
      },
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/nouveau']}>
        <Routes>
          <Route path="/app/produits/nouveau" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/categories'));

    fireEvent.change(container.querySelector('input[name="nom"]'), { target: { value: 'Huile premium' } });
    fireEvent.change(container.querySelector('input[placeholder="Ex: 20"]'), { target: { value: '8' } });
    fireEvent.change(container.querySelector('input[name="prixVente"]'), { target: { value: '2500' } });
    fireEvent.change(container.querySelector('input[name="prixAchat"]'), { target: { value: '2100' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/i }));

    await waitFor(() => {
      expect(showUpgradeToast).toHaveBeenCalledWith({
        message: 'Passez au plan supérieur pour créer plus de produits.',
        navigate: mockNavigate,
      });
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('affiche l’erreur API standard quand la création échoue sans upgrade', async () => {
    apiPost.mockRejectedValueOnce({
      response: {
        data: {
          code: 'CONFLICT',
          message: 'Code-barres déjà utilisé',
        },
      },
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/nouveau']}>
        <Routes>
          <Route path="/app/produits/nouveau" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/categories'));

    fireEvent.change(container.querySelector('input[name="nom"]'), { target: { value: 'Huile premium' } });
    fireEvent.change(container.querySelector('input[placeholder="Ex: 20"]'), { target: { value: '8' } });
    fireEvent.change(container.querySelector('input[name="prixVente"]'), { target: { value: '2500' } });
    fireEvent.change(container.querySelector('input[name="prixAchat"]'), { target: { value: '2100' } });
    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Code-barres déjà utilisé'));
    expect(showUpgradeToast).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('affiche l’erreur API standard quand la mise à jour échoue', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/categories') return { data: { data: [{ id: 1, nom: 'Épicerie' }] } };
      if (url === '/fournisseurs') return { data: { data: [{ id: 2, nom: 'Grossiste Dakar' }] } };
      if (url === '/produits/7') {
        return {
          data: {
            data: {
              id: 7,
              nom: 'Riz local',
              description: 'Sachet',
              prixVente: 400,
              prixAchat: 250,
              stock: 12,
              stockAlerte: 3,
              uniteBase: 'g',
              codeBarre: '111222',
              categorieId: 1,
              fournisseurId: 2,
              unitesVente: [],
            },
          },
        };
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    apiPut.mockRejectedValueOnce({
      response: {
        data: {
          code: 'CONFLICT',
          message: 'Conflit de mise à jour',
        },
      },
    });

    const { container } = render(
      <MemoryRouter initialEntries={['/app/produits/7']}>
        <Routes>
          <Route path="/app/produits/:id" element={<ProduitForm />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits/7'));
    fireEvent.change(container.querySelector('input[name="nom"]'), { target: { value: 'Riz local modifié' } });
    fireEvent.click(screen.getByRole('button', { name: /Mettre à jour/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Conflit de mise à jour'));
    expect(showUpgradeToast).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalledWith('/app/produits');
  });
});