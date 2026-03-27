import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import NouvelleVente from './NouvelleVente';

const { apiGet, apiPost, mockNavigate, toastBase, toastSuccess, toastError, toastDismiss, showUpgradeToast } = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  mockNavigate: vi.fn(),
  toastBase: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  toastDismiss: vi.fn(),
  showUpgradeToast: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    get: apiGet,
    post: apiPost,
  },
}));

vi.mock('../features/products/components/BarcodeScannerInput', () => ({
  default: ({ onScan, active }) => (
    <div>
      <span>{active ? 'scanner-active' : 'scanner-inactive'}</span>
      <button type="button" onClick={() => active && onScan('111')}>Mock scan known</button>
      <button type="button" onClick={() => active && onScan('999')}>Mock scan unknown</button>
      <button type="button" onClick={() => active && onScan('444')}>Mock scan invalid</button>
      <button type="button" onClick={() => active && onScan('500')}>Mock scan error</button>
    </div>
  ),
}));

vi.mock('../lib/upgradeToast', () => ({
  showUpgradeToast,
}));

vi.mock('react-hot-toast', () => ({
  default: Object.assign(toastBase, {
    success: toastSuccess,
    error: toastError,
    dismiss: toastDismiss,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../context/useAuth', () => ({ useAuth: () => ({ plan: 'PRO', planUsage: null }) }));

describe('NouvelleVente page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              { id: 1, nom: 'Lait frais', actif: true, stock: 8, stockAlerte: 2, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
            ],
          },
        };
      }
      if (url === '/clients') {
        return {
          data: {
            data: [{ id: 2, prenom: 'Awa', nom: 'Ndiaye', telephone: '771234567' }],
          },
        };
      }
      if (url === '/barcodes/lookup/111') {
        return {
          data: {
            data: {
              produit: {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 8,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [
                  { id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true },
                ],
                codeBarre: '111',
              },
              uniteId: 9,
            },
          },
        };
      }
      if (url === '/barcodes/lookup/999') {
        throw { response: { status: 404 } };
      }
      if (url === '/barcodes/lookup/444') {
        return {
          data: {
            data: {
              produit: {
                nom: 'Produit fantôme',
              },
            },
          },
        };
      }
      if (url === '/barcodes/lookup/500') {
        throw { response: { status: 500 } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });
    apiPost.mockResolvedValue({ data: { success: true, data: { numero: 'VNT-50' } } });
  });

  it('bloque la validation d’une vente à crédit sans client', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    expect(toastError).toHaveBeenCalledWith('Sélectionnez un client pour le crédit');
    expect(apiPost).not.toHaveBeenCalled();
  }, 10000);

  it('affiche l’état panier vide au chargement', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    expect(screen.getByText('Panier vide')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Valider la vente/i })).not.toBeInTheDocument();
  });

  it('affiche une erreur quand le chargement initial des données échoue', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') throw new Error('network down');
      if (url === '/clients') return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/clients'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Erreur de chargement des données'));
    expect(screen.getByText('Panier vide')).toBeInTheDocument();
  });

  it('filtre la liste des produits via la recherche par nom ou code-barres', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              { id: 1, nom: 'Lait frais', actif: true, stock: 8, stockAlerte: 2, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
              { id: 2, nom: 'Biscuit', actif: true, stock: 20, stockAlerte: 4, prixVente: 150, uniteBase: 'piece', unitesVente: [], codeBarre: '222' },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    const searchInput = screen.getByPlaceholderText('Rechercher un produit…');

    fireEvent.change(searchInput, { target: { value: '222' } });
    expect(screen.getByText('Biscuit')).toBeInTheDocument();
    expect(screen.queryByText('Lait frais')).not.toBeInTheDocument();
    expect(screen.getByText('1 produit')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: 'zzz' } });
    expect(screen.getByText('Aucun produit trouvé')).toBeInTheDocument();

    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByText('Lait frais')).toBeInTheDocument();
    expect(screen.getByText('Biscuit')).toBeInTheDocument();
    expect(screen.getByText('2 produits')).toBeInTheDocument();
  });

  it('ignore un second scan tant que le lookup précédent est en cours', async () => {
    let resolveLookup;
    const lookupPromise = new Promise((resolve) => { resolveLookup = resolve; });

    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              { id: 1, nom: 'Lait frais', actif: true, stock: 8, stockAlerte: 2, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      if (url === '/barcodes/lookup/111') return lookupPromise;
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    apiGet.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));

    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));
    expect(apiGet).toHaveBeenCalledTimes(1);

    resolveLookup({
      data: {
        data: {
          produit: {
            id: 1,
            nom: 'Lait frais',
            actif: true,
            stock: 8,
            stockAlerte: 2,
            prixVente: 350,
            uniteBase: 'piece',
            unitesVente: [],
            codeBarre: '111',
          },
        },
      },
    });

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Produit Lait frais ajouté à la vente.'));
  });

  it('permet d’activer et désactiver le scanner HID', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    expect(screen.getByText('Scanner ON')).toBeInTheDocument();
    expect(screen.getByText('scanner-active')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Scanner ON/i }));

    expect(screen.getByText('Scanner OFF')).toBeInTheDocument();
    expect(screen.getByText('scanner-inactive')).toBeInTheDocument();

    apiGet.mockClear();
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));
    expect(apiGet).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Scanner OFF/i }));
    expect(screen.getByText('Scanner ON')).toBeInTheDocument();
  });

  it('ajoute au panier le produit retrouvé via scan code-barres', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Produit Lait frais ajouté à la vente.'));
    expect(screen.getAllByText('Lait frais').length).toBeGreaterThan(1);
    expect(screen.getByText('Pack')).toBeInTheDocument();
    expect(screen.getAllByText(/1.?800 FCFA/).length).toBeGreaterThan(0);
  });

  it('ajoute aussi le produit scanné quand le lookup renvoie directement le produit sans wrapper', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              { id: 1, nom: 'Lait frais', actif: true, stock: 8, stockAlerte: 2, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      if (url === '/barcodes/lookup/111') {
        return {
          data: {
            data: {
              id: 1,
              nom: 'Lait frais',
              actif: true,
              stock: 8,
              stockAlerte: 2,
              prixVente: 350,
              uniteBase: 'piece',
              unitesVente: [
                { id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true },
              ],
              codeBarre: '111',
            },
          },
        };
      }
      if (url === '/barcodes/lookup/999') throw { response: { status: 404 } };
      if (url === '/barcodes/lookup/444') return { data: { data: { produit: { nom: 'Produit fantôme' } } } };
      if (url === '/barcodes/lookup/500') throw { response: { status: 500 } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Produit Lait frais ajouté à la vente.'));

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('ajoute en unité de base quand le lookup scan ne renvoie aucune unité de vente', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              { id: 1, nom: 'Lait frais', actif: true, stock: 8, stockAlerte: 2, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      if (url === '/barcodes/lookup/111') {
        return {
          data: {
            data: {
              produit: {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 8,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [],
                codeBarre: '111',
              },
            },
          },
        };
      }
      if (url === '/barcodes/lookup/999') throw { response: { status: 404 } };
      if (url === '/barcodes/lookup/444') return { data: { data: { produit: { nom: 'Produit fantôme' } } } };
      if (url === '/barcodes/lookup/500') throw { response: { status: 500 } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    expect(screen.getAllByText('Lait frais').length).toBeGreaterThan(1);
    expect(screen.getAllByText(/350 FCFA/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('utilise l’unité par défaut quand le lookup scan ne renvoie pas de uniteId', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              { id: 1, nom: 'Lait frais', actif: true, stock: 8, stockAlerte: 2, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      if (url === '/barcodes/lookup/111') {
        return {
          data: {
            data: {
              produit: {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 8,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [
                  { id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true },
                  { id: 10, nom: 'Unité', facteurConversion: 1, prix: 350, estDefaut: false },
                ],
                codeBarre: '111',
              },
            },
          },
        };
      }
      if (url === '/barcodes/lookup/999') throw { response: { status: 404 } };
      if (url === '/barcodes/lookup/444') return { data: { data: { produit: { nom: 'Produit fantôme' } } } };
      if (url === '/barcodes/lookup/500') throw { response: { status: 500 } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    expect(screen.getByText('Pack')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  }, 15000);

  it('propose de créer un produit quand le code-barres est inconnu', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan unknown/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/999'));
    expect(toastBase).toHaveBeenCalled();

    const toastRenderer = toastBase.mock.calls[0][0];
    render(toastRenderer({ id: 'toast-1' }));

    fireEvent.click(screen.getByRole('button', { name: /Créer le produit/i }));

    expect(toastDismiss).toHaveBeenCalledWith('toast-1');
    expect(mockNavigate).toHaveBeenCalledWith('/app/produits/nouveau?codeBarre=999&returnTo=vente');
  });

  it('préremplit la recherche depuis le code-barres présent dans l’URL', async () => {
    render(
      <MemoryRouter initialEntries={['/app/ventes/nouvelle?codeBarre=111']}>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    expect(screen.getByPlaceholderText('Rechercher un produit…').value).toBe('111');
  });

  it('ajoute automatiquement au panier le produit retrouvé via le code-barres de reprise', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 8,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [{ id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true }],
                codeBarre: '111',
              },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/app/ventes/nouvelle?codeBarre=111']}>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    await waitFor(() => expect(screen.getByText('Pack')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('Rechercher un produit…').value).toBe('111');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  }, 15000);

  it('n’auto-ajoute rien quand le code-barres de reprise ne correspond à aucun produit actif', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              {
                id: 1,
                nom: 'Lait frais',
                actif: false,
                stock: 8,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [{ id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true }],
                codeBarre: '111',
              },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/app/ventes/nouvelle?codeBarre=111']}>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    expect(screen.getByPlaceholderText('Rechercher un produit…').value).toBe('111');
    expect(screen.queryByText('Lait frais')).not.toBeInTheDocument();
    expect(screen.getByText('Panier vide')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Valider la vente/i })).not.toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('n’auto-ajoute rien quand le produit repris via code-barres est actif mais sans stock', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 0,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [{ id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true }],
                codeBarre: '111',
              },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/app/ventes/nouvelle?codeBarre=111']}>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    expect(screen.getByPlaceholderText('Rechercher un produit…').value).toBe('111');
    expect(screen.getByText('Lait frais')).toBeInTheDocument();
    expect(screen.getByText('0 Pack')).toBeInTheDocument();
    expect(screen.getByText('Panier vide')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Valider la vente/i })).not.toBeInTheDocument();
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('reprend avec une unité vendable plus petite quand l’unité par défaut dépasse le stock disponible', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 3,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [
                  { id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true },
                  { id: 10, nom: 'Unité', facteurConversion: 1, prix: 350, estDefaut: false },
                ],
                codeBarre: '111',
              },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/app/ventes/nouvelle?codeBarre=111']}>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    await waitFor(() => expect(screen.getByText('Unité')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('Rechercher un produit…').value).toBe('111');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: 10 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  }, 15000);

  it('privilégie encore l’unité par défaut quand plusieurs unités vendables sont disponibles', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 12,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [
                  { id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true },
                  { id: 10, nom: 'Demi-pack', facteurConversion: 3, prix: 950, estDefaut: false },
                  { id: 11, nom: 'Unité', facteurConversion: 1, prix: 350, estDefaut: false },
                ],
                codeBarre: '111',
              },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter initialEntries={['/app/ventes/nouvelle?codeBarre=111']}>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    await waitFor(() => expect(screen.getByText('Pack')).toBeInTheDocument());
    expect(screen.getByPlaceholderText('Rechercher un produit…').value).toBe('111');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  }, 15000);

  it('ferme le toast de scan inconnu puis permet de reprendre la vente normalement', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan unknown/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/999'));
    const toastRenderer = toastBase.mock.calls[0][0];
    render(toastRenderer({ id: 'toast-2' }));

    fireEvent.click(screen.getByRole('button', { name: /Annuler/i }));
    expect(toastDismiss).toHaveBeenCalledWith('toast-2');

    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('reprend normalement le flux de vente après un scan inconnu', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan unknown/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/999'));
    expect(toastBase).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Produit Lait frais ajouté à la vente.'));

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('signale un produit invalide retourné par le lookup de scan', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan invalid/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/444'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Produit invalide pour le code : 444'));
  });

  it('affiche une erreur générique quand le scan échoue côté API', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan error/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/500'));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith('Erreur lors du scan'));
  });

  it('valide une vente après ajout via scan et envoie l’unité scannée', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
      expect(toastSuccess).toHaveBeenCalledWith('Vente VNT-50 enregistrée avec succès.');
    });
  });

  it('recharge les produits et clients après une vente réussie', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    apiGet.mockClear();

    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => expect(apiPost).toHaveBeenCalledWith('/ventes', {
      details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
      clientId: undefined,
      modePaiement: 'CASH',
      montantPaye: undefined,
    }));

    await waitFor(() => {
      expect(apiGet.mock.calls.map((call) => call[0])).toEqual(expect.arrayContaining(['/produits', '/clients']));
      expect(screen.getByText('Panier vide')).toBeInTheDocument();
    });
  });

  it('valide une vente multi-produits en envoyant chaque ligne du panier', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              { id: 1, nom: 'Lait frais', actif: true, stock: 8, stockAlerte: 2, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
              { id: 2, nom: 'Biscuit', actif: true, stock: 20, stockAlerte: 4, prixVente: 150, uniteBase: 'piece', unitesVente: [], codeBarre: '222' },
            ],
          },
        };
      }
      if (url === '/clients') {
        return {
          data: {
            data: [{ id: 2, prenom: 'Awa', nom: 'Ndiaye', telephone: '771234567' }],
          },
        };
      }
      if (url === '/barcodes/lookup/111') {
        return {
          data: {
            data: {
              produit: {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 8,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [{ id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true }],
                codeBarre: '111',
              },
              uniteId: 9,
            },
          },
        };
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getAllByRole('button', { name: /1 piece/i })[1]);
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    expect(screen.getAllByText('Biscuit').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Lait frais').length).toBeGreaterThan(1);

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [
          { produitId: 2, quantite: 1, uniteVenteId: undefined },
          { produitId: 1, quantite: 1, uniteVenteId: 9 },
        ],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
      expect(toastSuccess).toHaveBeenCalledWith('Vente VNT-50 enregistrée avec succès.');
    });
  });

  it('garde des lignes distinctes pour le même produit vendu en base et en unité dérivée', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 8,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [
                  { id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true },
                  { id: 10, nom: 'Unité', facteurConversion: 1, prix: 350, estDefaut: false },
                ],
                codeBarre: '111',
              },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      throw new Error(`Unexpected GET ${url}`);
    });

    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 Unité/i }));
    fireEvent.click(screen.getByRole('button', { name: /1 Pack/i }));

    expect(container.querySelectorAll('.nv-cart-item')).toHaveLength(2);
    expect(Array.from(container.querySelectorAll('.nv-item-price')).map((node) => node.textContent)).toEqual([
      '350 FCFA × 1',
      '1 800 FCFA × 1',
    ]);

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [
          { produitId: 1, quantite: 1, uniteVenteId: 10 },
          { produitId: 1, quantite: 1, uniteVenteId: 9 },
        ],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('additionne le scan à la ligne existante quand la même unité scannée est déjà au panier', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));
    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));

    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledTimes(2));

    expect(container.querySelector('.nv-item-price').textContent).toBe('1 800 FCFA × 2');
    expect(container.querySelector('.nv-item-total').textContent).toBe('3 600 FCFA');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 2, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('additionne aussi la même unité dérivée ajoutée plusieurs fois depuis le bouton produit', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              {
                id: 1,
                nom: 'Lait frais',
                actif: true,
                stock: 12,
                stockAlerte: 2,
                prixVente: 350,
                uniteBase: 'piece',
                unitesVente: [
                  { id: 9, nom: 'Pack', facteurConversion: 6, prix: 1800, estDefaut: true },
                ],
                codeBarre: '111',
              },
            ],
          },
        };
      }
      if (url === '/clients') return { data: { data: [] } };
      if (url === '/barcodes/lookup/999') throw { response: { status: 404 } };
      if (url === '/barcodes/lookup/444') return { data: { data: { produit: { nom: 'Produit fantôme' } } } };
      if (url === '/barcodes/lookup/500') throw { response: { status: 500 } };
      throw new Error(`Unexpected GET ${url}`);
    });

    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 Pack/i }));
    fireEvent.click(screen.getByRole('button', { name: /1 Pack/i }));

    expect(container.querySelectorAll('.nv-cart-item')).toHaveLength(1);
    expect(container.querySelector('.nv-item-price').textContent).toBe('1 800 FCFA × 2');
    expect(container.querySelector('.nv-item-total').textContent).toBe('3 600 FCFA');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 2, uniteVenteId: 9 }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('permet de supprimer puis réajouter l’unité de base sans toucher la ligne scannée', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    expect(container.querySelectorAll('.nv-cart-item')).toHaveLength(2);

    fireEvent.click(container.querySelectorAll('.nv-remove-btn')[0]);
    expect(container.querySelector('.nv-item-price').textContent).toBe('1 800 FCFA × 1');

    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));

    expect(Array.from(container.querySelectorAll('.nv-item-price')).map((node) => node.textContent)).toEqual([
      '1 800 FCFA × 1',
      '350 FCFA × 1',
    ]);
    expect(container.querySelector('.nv-total-amount').textContent).toBe('2 150 FCFA');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [
          { produitId: 1, quantite: 1, uniteVenteId: 9 },
          { produitId: 1, quantite: 1, uniteVenteId: undefined },
        ],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('recrée la ligne scannée après sa suppression sans fusionner avec la ligne de base restante', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    fireEvent.click(container.querySelectorAll('.nv-remove-btn')[1]);

    expect(container.querySelectorAll('.nv-cart-item')).toHaveLength(1);
    expect(container.querySelector('.nv-item-price').textContent).toBe('350 FCFA × 1');

    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith('Produit Lait frais ajouté à la vente.'));

    expect(Array.from(container.querySelectorAll('.nv-item-price')).map((node) => node.textContent)).toEqual([
      '350 FCFA × 1',
      '1 800 FCFA × 1',
    ]);
    expect(container.querySelector('.nv-total-amount').textContent).toBe('2 150 FCFA');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [
          { produitId: 1, quantite: 1, uniteVenteId: undefined },
          { produitId: 1, quantite: 1, uniteVenteId: 9 },
        ],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('supprime uniquement la ligne scannée quand le même produit existe aussi en unité de base', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Mock scan known/i }));

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/barcodes/lookup/111'));
    expect(container.querySelectorAll('.nv-cart-item')).toHaveLength(2);

    fireEvent.click(container.querySelectorAll('.nv-remove-btn')[1]);

    expect(container.querySelectorAll('.nv-cart-item')).toHaveLength(1);
    expect(container.querySelector('.nv-item-price').textContent).toBe('350 FCFA × 1');
    expect(container.querySelector('.nv-total-amount').textContent).toBe('350 FCFA');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('envoie une vente à crédit avec client sélectionné et acompte', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100' } });

    expect(screen.getByText(/Crédit restant:/i)).toBeInTheDocument();
    expect(screen.getByText(/250 FCFA/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: 100,
      });
    });
  });

  it('envoie undefined si le montant payé crédit reste vide', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });

    expect(screen.queryByText(/Crédit restant:/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: undefined,
      });
    });
  });

  it('envoie 0 quand le montant payé crédit vaut zéro', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '0' } });

    expect(container.querySelector('.nv-credit-info').textContent).toContain('350 FCFA');
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: 0,
      });
    });
  });

  it('traite un montant payé crédit négatif comme zéro', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '-15' } });

    expect(container.querySelector('.nv-credit-info').textContent).toContain('350 FCFA');
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: 0,
      });
    });
  });

  it('ignore une saisie invalide du montant payé crédit', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: 'abc' } });

    expect(screen.queryByText(/Crédit restant:/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: undefined,
      });
    });
  });

  it('conserve les décimales du montant payé crédit et arrondit seulement l’affichage du reste', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100.75' } });

    expect(container.querySelector('.nv-credit-info').textContent).toContain('249 FCFA');
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: 100.75,
      });
    });
  });

  it('efface le montant payé si on repasse du crédit au cash', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '100' } });
    expect(screen.getByDisplayValue('100')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Cash$/i }));

    expect(screen.queryByPlaceholderText('0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: undefined,
        modePaiement: 'CASH',
        montantPaye: undefined,
      });
    });
  });

  it('envoie une vente Mobile Money sans montant payé supplémentaire', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /MoMo/i }));

    expect(screen.queryByPlaceholderText('0')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: undefined,
        modePaiement: 'MOBILE_MONEY',
        montantPaye: undefined,
      });
    });
  });

  it('permet d’augmenter puis diminuer la quantité d’une ligne panier', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));

    expect(screen.getByText('350 FCFA × 1')).toBeInTheDocument();
    expect(container.querySelector('.nv-total-amount').textContent).toBe('350 FCFA');

    const qtyButtons = container.querySelectorAll('.nv-qty-btn');
    fireEvent.click(qtyButtons[1]);

    expect(screen.getByText('350 FCFA × 2')).toBeInTheDocument();
    expect(container.querySelector('.nv-item-total').textContent).toBe('700 FCFA');
    expect(container.querySelector('.nv-total-amount').textContent).toBe('700 FCFA');

    fireEvent.click(qtyButtons[0]);

    expect(screen.getByText('350 FCFA × 1')).toBeInTheDocument();
    expect(container.querySelector('.nv-item-total').textContent).toBe('350 FCFA');
    expect(container.querySelector('.nv-total-amount').textContent).toBe('350 FCFA');
  });

  it('bloque la quantité minimale du panier à 1', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));

    fireEvent.click(container.querySelectorAll('.nv-qty-btn')[0]);

    expect(screen.getByText('350 FCFA × 1')).toBeInTheDocument();
    expect(container.querySelector('.nv-item-total').textContent).toBe('350 FCFA');
    expect(container.querySelector('.nv-total-amount').textContent).toBe('350 FCFA');
  });

  it('supprime seulement la ligne ciblée dans un panier multi-produits', async () => {
    apiGet.mockImplementation(async (url) => {
      if (url === '/produits') {
        return {
          data: {
            data: [
              { id: 1, nom: 'Lait frais', actif: true, stock: 8, stockAlerte: 2, prixVente: 350, uniteBase: 'piece', unitesVente: [], codeBarre: '111' },
              { id: 2, nom: 'Biscuit', actif: true, stock: 20, stockAlerte: 4, prixVente: 150, uniteBase: 'piece', unitesVente: [], codeBarre: '222' },
            ],
          },
        };
      }
      if (url === '/clients') {
        return { data: { data: [{ id: 2, prenom: 'Awa', nom: 'Ndiaye', telephone: '771234567' }] } };
      }
      throw new Error(`Unexpected GET ${url}`);
    });

    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getAllByRole('button', { name: /1 piece/i })[0]);
    fireEvent.click(screen.getAllByRole('button', { name: /1 piece/i })[1]);

    expect(container.querySelectorAll('.nv-cart-item')).toHaveLength(2);
    fireEvent.click(container.querySelectorAll('.nv-remove-btn')[1]);

    expect(container.querySelectorAll('.nv-cart-item')).toHaveLength(1);
    expect(container.querySelector('.nv-cart-item strong').textContent).toBe('Lait frais');
    expect(container.querySelector('.nv-total-amount').textContent).toBe('350 FCFA');
  });

  it('rebloque la vente à crédit si le client sélectionné est retiré ensuite', async () => {
    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    expect(screen.getByDisplayValue(/Awa Ndiaye/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    expect(toastError).toHaveBeenCalledWith('Sélectionnez un client pour le crédit');
    expect(apiPost).not.toHaveBeenCalled();
  });

  it('accepte un crédit soldé quand le montant payé couvre exactement le total', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '350' } });

    expect(screen.getByText(/Crédit restant:/i)).toBeInTheDocument();
    expect(container.querySelector('.nv-credit-info').textContent).toContain('0 FCFA');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: 350,
      });
    });
  });

  it('plafonne le montant payé crédit au total pour éviter un reste négatif', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '999' } });

    expect(screen.getByText(/Crédit restant:/i)).toBeInTheDocument();
    expect(container.querySelector('.nv-credit-info').textContent).toContain('0 FCFA');

    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: 350,
      });
    });
  });

  it('plafonne aussi un montant payé crédit décimal au total', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Crédit/i }));
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2' } });
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '350.99' } });

    expect(container.querySelector('.nv-credit-info').textContent).toContain('0 FCFA');
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/ventes', {
        details: [{ produitId: 1, quantite: 1, uniteVenteId: undefined }],
        clientId: '2',
        modePaiement: 'CREDIT',
        montantPaye: 350,
      });
    });
  });

  it('permet de supprimer une ligne du panier', async () => {
    const { container } = render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));

    expect(container.querySelector('.nv-cart-item strong').textContent).toBe('Lait frais');
    fireEvent.click(container.querySelector('.nv-remove-btn'));

    expect(screen.getByText('Panier vide')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Valider la vente/i })).not.toBeInTheDocument();
  });

  it('utilise showUpgradeToast quand la validation de vente renvoie une limite plan', async () => {
    apiPost.mockRejectedValueOnce({
      response: {
        status: 403,
        data: {
          code: 'PLAN_UPGRADE_REQUIRED',
          message: 'Passez au plan supérieur pour enregistrer plus de ventes.',
          upgrade: true,
        },
      },
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => {
      expect(showUpgradeToast).toHaveBeenCalledWith({
        message: 'Passez au plan supérieur pour enregistrer plus de ventes.',
        navigate: mockNavigate,
      });
    });
    expect(toastError).not.toHaveBeenCalled();
  });

  it('affiche l’erreur API standard quand la validation de vente échoue sans upgrade', async () => {
    apiPost.mockRejectedValueOnce({
      response: {
        status: 500,
        data: {
          code: 'SALE_CREATE_FAILED',
          message: 'Stock verrouillé',
        },
      },
    });

    render(
      <MemoryRouter>
        <NouvelleVente />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiGet).toHaveBeenCalledWith('/produits'));
    fireEvent.click(screen.getByRole('button', { name: /1 piece/i }));
    fireEvent.click(screen.getByRole('button', { name: /Valider la vente/i }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith('[500] Stock verrouillé', { duration: 8000 }));
    expect(showUpgradeToast).not.toHaveBeenCalled();
  });
});