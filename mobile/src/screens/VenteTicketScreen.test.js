import React from 'react';
import { Alert, Linking, Platform, Share } from 'react-native';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VenteTicketScreen from './VenteTicketScreen';
import { getFacturePdfUrl, getVenteById } from '../lib/api';
import { getSavedPrinter, printSaleReceipt, saveSelectedPrinter, scanBluetoothPrinters, testPrinterConnection } from '../lib/thermalPrinter';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
}));

const mockAuthState = {
  boutique: { nom: 'Tekki Shop' },
  plan: 'GRATUIT',
};

jest.mock('../context/AuthContext', () => ({
  useAuth: () => mockAuthState,
}));

jest.mock('../context/LanguageContext', () => ({
  useI18n: () => ({ language: 'fr', locale: 'fr-FR' }),
}));

jest.mock('../lib/api', () => ({
  getVenteById: jest.fn(),
  getFacturePdfUrl: jest.fn((id, token) => `https://tekki.test/factures/${id}?token=${token}`),
}));

jest.mock('../lib/thermalPrinter', () => ({
  THERMAL_PRINTER_SUPPORT_MESSAGE: 'Thermal printer unsupported',
  getSavedPrinter: jest.fn().mockResolvedValue(null),
  printSaleReceipt: jest.fn(),
  saveSelectedPrinter: jest.fn(),
  scanBluetoothPrinters: jest.fn(),
  testPrinterConnection: jest.fn(),
}));

describe('VenteTicketScreen', () => {
  const vente = {
    id: 99,
    numero: 'VNT-99',
    createdAt: '2026-03-10T10:00:00.000Z',
    modePaiement: 'CREDIT',
    montantTotal: 700,
    montantPaye: 100,
    client: { prenom: 'Awa', nom: 'Ndiaye' },
    user: { prenom: 'Boss', nom: 'Tekki' },
    dette: { montantRestant: 600 },
    details: [
      { id: 1, quantite: 2, uniteNom: 'piece', prixUnitaire: 350, sousTotal: 700, produit: { nom: 'Lait frais', uniteBase: 'piece' } },
    ],
  };

  const getPressableNode = (label) => {
    let node = screen.getByText(label);
    while (node && !('disabled' in node.props) && !node.props.accessibilityState && node.parent) {
      node = node.parent;
    }
    return node;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthState.plan = 'GRATUIT';
    mockAuthState.boutique = { nom: 'Tekki Shop' };
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    AsyncStorage.getItem.mockResolvedValue(null);
    getVenteById.mockResolvedValue({ data: { success: true, data: vente } });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    jest.spyOn(Share, 'share').mockResolvedValue({ action: 'sharedAction' });
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('partage un ticket formaté avec le client, les lignes et les totaux', async () => {
    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('VNT-99')).toBeTruthy());
    fireEvent.press(screen.getByText('Partager le ticket'));

    await waitFor(() => {
      expect(Share.share).toHaveBeenCalledWith({
        message: expect.stringContaining('Tekki Shop - Ticket VNT-99'),
      });
    });
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('Client: Awa Ndiaye');
    expect(sharedMessage).toContain('Lait frais');
    expect(sharedMessage).toContain('Total: 700 FCFA');
    expect(sharedMessage).toContain('Reste: 600 FCFA');
  });

  it('privilégie la dette restante sur le calcul total - payé dans l’affichage et le partage', async () => {
    const venteAvecDettePrioritaire = {
      ...vente,
      montantTotal: 1000,
      montantPaye: 900,
      dette: { montantRestant: 500 },
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteAvecDettePrioritaire } }} />);

    await waitFor(() => expect(screen.getByText('Résumé')).toBeTruthy());
    expect(screen.getByText('500 FCFA')).toBeTruthy();

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    expect(Share.share.mock.calls[0][0].message).toContain('Reste: 500 FCFA');
  });

  it('garde la dette restante prioritaire même si les autres montants et métadonnées sont incohérents', async () => {
    mockAuthState.boutique = null;
    const venteAvecDettePrioritaireDegradee = {
      numero: 'VNT-DETTE',
      createdAt: 'date-invalide',
      montantTotal: 'abc',
      montantPaye: 'oops',
      modePaiement: null,
      client: { email: 'client@tekki.test' },
      user: { username: 'vendeur-1' },
      dette: { montantRestant: '125' },
      details: [
        { produit: { nom: 'Savon', uniteBase: 'piece' }, quantite: '2', uniteNom: '', prixUnitaire: '50', sousTotal: '100' },
      ],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteAvecDettePrioritaireDegradee } }} />);

    await waitFor(() => expect(screen.getByText('VNT-DETTE')).toBeTruthy());
    expect(screen.getByText('125 FCFA')).toBeTruthy();
    expect(screen.queryByText('NaN FCFA')).toBeNull();

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('Date: —');
    expect(sharedMessage).toContain('Client: client@tekki.test');
    expect(sharedMessage).toContain('Paiement: —');
    expect(sharedMessage).toContain('Reste: 125 FCFA');
    expect(sharedMessage).not.toContain('NaN');
  });

  it('partage correctement une vente à crédit avec dette, boutique absente et identités partielles', async () => {
    mockAuthState.boutique = null;
    const venteCreditPartielle = {
      numero: 'VNT-CREDIT',
      createdAt: '2026-03-10T10:00:00.000Z',
      modePaiement: 'CREDIT',
      montantTotal: 200,
      montantPaye: 10,
      client: { telephone: '770011223' },
      user: { username: 'vendeur-partiel' },
      dette: { montantRestant: 75 },
      details: [
        { id: 6, produit: { nom: 'Riz', uniteBase: 'kg' }, quantite: 1, uniteNom: 'sac', prixUnitaire: 200, sousTotal: 200 },
      ],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteCreditPartielle } }} />);

    await waitFor(() => expect(screen.getByText('VNT-CREDIT')).toBeTruthy());
    expect(screen.getByText('Ma boutique')).toBeTruthy();
    expect(screen.getByText('770011223')).toBeTruthy();
    expect(screen.getByText('vendeur-partiel')).toBeTruthy();
    expect(screen.getByText('75 FCFA')).toBeTruthy();

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('TekkiPro - Ticket VNT-CREDIT');
    expect(sharedMessage).toContain('Client: 770011223');
    expect(sharedMessage).toContain('Paiement: Crédit');
    expect(sharedMessage).toContain('- Riz: 1 sac x 200 FCFA = 200 FCFA');
    expect(sharedMessage).toContain('Reste: 75 FCFA');
    expect(sharedMessage).not.toContain('Client de passage');
  });

  it('partage un ticket minimal avec les libellés de fallback', async () => {
    mockAuthState.boutique = {};
    const minimalVente = {
      id: 7,
      numero: 'VNT-07',
      createdAt: '2026-03-10T10:00:00.000Z',
      modePaiement: 'CASH',
      montantTotal: 150,
      montantPaye: 150,
      details: [
        { id: 1, quantite: 1, prixUnitaire: 150, sousTotal: 150, produit: null },
      ],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: minimalVente } }} />);

    await waitFor(() => expect(screen.getByText('VNT-07')).toBeTruthy());
    fireEvent.press(screen.getByText('Partager le ticket'));

    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('TekkiPro - Ticket VNT-07');
    expect(sharedMessage).toContain('Client: Client de passage');
    expect(sharedMessage).toContain('- Produit: 1 u x 150 FCFA = 150 FCFA');
  });

  it('affiche une erreur si le partage du ticket échoue', async () => {
    Share.share.mockRejectedValueOnce(new Error('share failed'));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Partager le ticket')).toBeTruthy());
    fireEvent.press(screen.getByText('Partager le ticket'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Impossible de partager ce ticket pour le moment.');
    });
  });

  it('charge le ticket depuis venteId quand la vente n’est pas fournie en params', async () => {
    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { venteId: 99 } }} />);

    await waitFor(() => expect(getVenteById).toHaveBeenCalledWith(99));
    await waitFor(() => expect(screen.getByText('VNT-99')).toBeTruthy());
    expect(screen.getByText('Lait frais')).toBeTruthy();
  });

  it('charge aussi un ticket minimal via venteId et affiche les fallbacks utiles', async () => {
    getVenteById.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          id: 7,
          numero: 'VNT-07',
          createdAt: '2026-03-10T10:00:00.000Z',
          modePaiement: 'CASH',
          montantTotal: 0,
          montantPaye: 0,
          details: [],
        },
      },
    });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { venteId: 7 } }} />);

    await waitFor(() => expect(getVenteById).toHaveBeenCalledWith(7));
    await waitFor(() => expect(screen.getByText('VNT-07')).toBeTruthy());
    expect(screen.getAllByText('Client de passage').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tekki Shop').length).toBeGreaterThan(0);
  });

  it('affiche des fallbacks sûrs quand le ticket fourni est très incomplet', async () => {
    mockAuthState.boutique = null;
    const venteIncomplete = {
      numero: 'BROUILLON',
      montantTotal: 0,
      montantPaye: null,
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteIncomplete } }} />);

    await waitFor(() => expect(screen.getByText('BROUILLON')).toBeTruthy());
    expect(screen.getByText('Ma boutique')).toBeTruthy();
    expect(screen.getAllByText('Client de passage').length).toBeGreaterThan(0);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it('affiche aussi des fallbacks sûrs quand modePaiement, createdAt et montantTotal sont absents', async () => {
    const venteSansChamps = {
      montantPaye: 50,
      details: [],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteSansChamps } }} />);

    await waitFor(() => expect(screen.getByText('Résumé')).toBeTruthy());
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('50 FCFA')).toBeTruthy();
    expect(screen.getAllByText('0 FCFA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Client de passage').length).toBeGreaterThan(0);
  });

  it('affiche un vendeur partiel via son email sans le confondre avec un client de passage', async () => {
    mockAuthState.boutique = {};
    const venteAvecVendeurPartiel = {
      numero: 'VNT-EMAIL',
      createdAt: '2026-03-10T10:00:00.000Z',
      montantTotal: 150,
      montantPaye: 150,
      client: null,
      user: { email: 'boss@tekki.test' },
      details: [],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteAvecVendeurPartiel } }} />);

    await waitFor(() => expect(screen.getByText('VNT-EMAIL')).toBeTruthy());
    expect(screen.getByText('Ma boutique')).toBeTruthy();
    expect(screen.getByText('boss@tekki.test')).toBeTruthy();
    expect(screen.getAllByText('Client de passage').length).toBeGreaterThan(0);
  });

  it('utilise le téléphone du client comme fallback avant Client de passage', async () => {
    mockAuthState.boutique = null;
    const venteAvecClientPartiel = {
      numero: 'VNT-CLIENT',
      createdAt: '2026-03-10T10:00:00.000Z',
      montantTotal: 300,
      montantPaye: 300,
      client: { telephone: '771234567' },
      user: null,
      details: [],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteAvecClientPartiel } }} />);

    await waitFor(() => expect(screen.getByText('VNT-CLIENT')).toBeTruthy());
    expect(screen.getByText('771234567')).toBeTruthy();

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    expect(Share.share.mock.calls[0][0].message).toContain('Client: 771234567');
  });

  it('combine les fallbacks boutique du ticket, client email et vendeur email dans le rendu et le partage', async () => {
    mockAuthState.boutique = null;
    const venteAvecFallbacksCombines = {
      numero: 'VNT-COMBINE',
      createdAt: '2026-03-10T10:00:00.000Z',
      modePaiement: 'CASH',
      montantTotal: 150,
      montantPaye: 150,
      boutique: { nom: 'Boutique portée' },
      client: { email: 'client@tekki.test' },
      user: { email: 'vendeur@tekki.test' },
      details: [
        null,
        { id: 5, produit: null, quantite: 1, uniteNom: null, prixUnitaire: 150, sousTotal: 150 },
      ],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteAvecFallbacksCombines } }} />);

    await waitFor(() => expect(screen.getByText('VNT-COMBINE')).toBeTruthy());
    expect(screen.getByText('Boutique portée')).toBeTruthy();
    expect(screen.getByText('client@tekki.test')).toBeTruthy();
    expect(screen.getByText('vendeur@tekki.test')).toBeTruthy();
    expect(screen.getByText('1 u × 150 FCFA')).toBeTruthy();

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('Boutique portée - Ticket VNT-COMBINE');
    expect(sharedMessage).toContain('Client: client@tekki.test');
    expect(sharedMessage).toContain('- Produit: 1 u x 150 FCFA = 150 FCFA');
    expect(sharedMessage).not.toContain('Client de passage');
  });

  it('normalise aussi les valeurs numériques invalides dans un ticket très dégradé sans produire de NaN au rendu ni au partage', async () => {
    mockAuthState.boutique = null;
    const venteTresDegradee = {
      numero: 'VNT-MESSY',
      createdAt: 'date-invalide',
      montantTotal: 'abc',
      montantPaye: 'oops',
      modePaiement: null,
      client: {},
      user: {},
      details: [
        { produit: { nom: null, uniteBase: '' }, quantite: 'abc', uniteNom: '', prixUnitaire: 'abc', sousTotal: 'abc' },
        { produit: { nom: 'Eau fraîche', uniteBase: 'piece' }, quantite: '2', uniteNom: 'btl', prixUnitaire: '50', sousTotal: '100' },
        null,
      ],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteTresDegradee } }} />);

    await waitFor(() => expect(screen.getByText('VNT-MESSY')).toBeTruthy());
    expect(screen.getByText('Ma boutique')).toBeTruthy();
    expect(screen.getByText('Produit')).toBeTruthy();
    expect(screen.getByText('0 u × 0 FCFA')).toBeTruthy();
    expect(screen.getByText('2 btl × 50 FCFA')).toBeTruthy();
    expect(screen.queryByText('NaN FCFA')).toBeNull();

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('TekkiPro - Ticket VNT-MESSY');
    expect(sharedMessage).toContain('Date: —');
    expect(sharedMessage).toContain('Client: Client de passage');
    expect(sharedMessage).toContain('- Produit: 0 u x 0 FCFA = 0 FCFA');
    expect(sharedMessage).toContain('- Eau fraîche: 2 btl x 50 FCFA = 100 FCFA');
    expect(sharedMessage).not.toContain('NaN');
    expect(sharedMessage).not.toContain('undefined');
  });

  it('utilise le nom de boutique porté par le ticket quand la boutique courante est absente', async () => {
    mockAuthState.boutique = null;
    const venteAvecBoutiqueDansLeTicket = {
      numero: 'VNT-BOUTIQUE',
      createdAt: '2026-03-10T10:00:00.000Z',
      montantTotal: 200,
      montantPaye: 200,
      boutique: { nom: 'Boutique du ticket' },
      user: { username: 'caissier-1' },
      details: [
        { id: 1, quantite: 1, prixUnitaire: 200, sousTotal: 200, produit: { nom: 'Eau fraîche', uniteBase: 'piece' } },
      ],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteAvecBoutiqueDansLeTicket } }} />);

    await waitFor(() => expect(screen.getByText('VNT-BOUTIQUE')).toBeTruthy());
    expect(screen.getByText('Boutique du ticket')).toBeTruthy();
    expect(screen.getByText('caissier-1')).toBeTruthy();

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('Boutique du ticket - Ticket VNT-BOUTIQUE');
    expect(sharedMessage).toContain('Eau fraîche');
  });

  it('affiche une ligne article très incomplète avec des fallbacks sûrs pour le vendeur et le détail', async () => {
    mockAuthState.boutique = null;
    const venteAvecLigneIncomplete = {
      numero: null,
      createdAt: null,
      montantTotal: null,
      montantPaye: null,
      modePaiement: null,
      client: null,
      user: null,
      details: [{ id: 1, produit: null, quantite: null, uniteNom: null, prixUnitaire: null, sousTotal: null }],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteAvecLigneIncomplete } }} />);

    await waitFor(() => expect(screen.getByText('Produit')).toBeTruthy());
    expect(screen.getByText('0 u × 0 FCFA')).toBeTruthy();
    expect(screen.getAllByText('Client de passage').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('Client: Client de passage');
    expect(sharedMessage).toContain('Paiement: —');
    expect(sharedMessage).toContain('- Produit: 0 u x 0 FCFA = 0 FCFA');
  });

  it('ignore les entrées de détail nulles dans le rendu et le partage', async () => {
    mockAuthState.boutique = null;
    const venteAvecDetailNull = {
      numero: 'VNT-NULL',
      createdAt: '2026-03-10T10:00:00.000Z',
      montantTotal: 150,
      montantPaye: 150,
      details: [
        null,
        { id: 2, produit: null, quantite: 1, uniteNom: null, prixUnitaire: 150, sousTotal: 150 },
      ],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteAvecDetailNull } }} />);

    await waitFor(() => expect(screen.getByText('VNT-NULL')).toBeTruthy());
    expect(screen.getByText('1 u × 150 FCFA')).toBeTruthy();

    fireEvent.press(screen.getByText('Partager le ticket'));
    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('- Produit: 1 u x 150 FCFA = 150 FCFA');
    expect(sharedMessage).not.toContain('undefined');
  });

  it('affiche plusieurs lignes incomplètes même sans identifiants de détail', async () => {
    const venteSansIdsDeDetails = {
      numero: 'VNT-NOKEY',
      createdAt: '2026-03-10T10:00:00.000Z',
      montantTotal: 85,
      montantPaye: 0,
      details: [
        { produit: null, quantite: 1, uniteNom: null, prixUnitaire: 25, sousTotal: 25 },
        { produit: null, quantite: 2, uniteNom: null, prixUnitaire: 30, sousTotal: 60 },
      ],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteSansIdsDeDetails } }} />);

    await waitFor(() => expect(screen.getByText('VNT-NOKEY')).toBeTruthy());
    expect(screen.getByText('1 u × 25 FCFA')).toBeTruthy();
    expect(screen.getByText('2 u × 30 FCFA')).toBeTruthy();
    expect(screen.getAllByText('Produit').length).toBeGreaterThanOrEqual(2);
  });

  it('partage aussi un ticket sans numéro ni détails avec des fallbacks sûrs', async () => {
    mockAuthState.boutique = null;
    const venteSansNumero = {
      createdAt: 'not-a-date',
      montantTotal: 0,
      montantPaye: null,
      details: null,
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteSansNumero } }} />);

    await waitFor(() => expect(screen.getByText('Partager le ticket')).toBeTruthy());
    fireEvent.press(screen.getByText('Partager le ticket'));

    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('TekkiPro - Ticket —');
    expect(sharedMessage).toContain('Date: —');
    expect(sharedMessage).toContain('Client: Client de passage');
    expect(sharedMessage).toContain('Paiement: —');
  });

  it('affiche et partage aussi un ticket sans numéro, sans détails et sans montant payé', async () => {
    mockAuthState.boutique = null;
    const venteUltraIncomplete = {
      createdAt: null,
      montantTotal: undefined,
      montantPaye: undefined,
      details: undefined,
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteUltraIncomplete } }} />);

    await waitFor(() => expect(screen.getAllByText('—').length).toBeGreaterThan(0));
    expect(screen.getAllByText('0 FCFA').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Client de passage').length).toBeGreaterThan(0);

    fireEvent.press(screen.getByText('Partager le ticket'));

    await waitFor(() => expect(Share.share).toHaveBeenCalled());
    const sharedMessage = Share.share.mock.calls[0][0].message;
    expect(sharedMessage).toContain('TekkiPro - Ticket —');
    expect(sharedMessage).toContain('Date: —');
    expect(sharedMessage).toContain('Payé: 0 FCFA');
    expect(sharedMessage).toContain('Reste: 0 FCFA');
  });

  it('affiche une alerte puis l’état ticket introuvable si le chargement par venteId échoue', async () => {
    getVenteById.mockRejectedValueOnce({ response: { data: { message: 'Ticket indisponible' } } });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { venteId: 404 } }} />);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Ticket indisponible');
    });
    await waitFor(() => expect(screen.getByText('Ticket introuvable')).toBeTruthy());
  });

  it('affiche aussi le fallback ticket introuvable quand l’API répond success=false', async () => {
    getVenteById.mockResolvedValueOnce({ data: { success: false, message: 'Ticket absent' } });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { venteId: 405 } }} />);

    await waitFor(() => expect(getVenteById).toHaveBeenCalledWith(405));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Ticket absent'));
    await waitFor(() => expect(screen.getByText('Ticket introuvable')).toBeTruthy());
  });

  it('permet de revenir en arrière depuis l’état ticket introuvable', async () => {
    const goBack = jest.fn();
    getVenteById.mockRejectedValueOnce({ response: { data: { message: 'Ticket indisponible' } } });

    render(<VenteTicketScreen navigation={{ goBack }} route={{ params: { venteId: 404 } }} />);

    await waitFor(() => expect(screen.getByText('Ticket introuvable')).toBeTruthy());
    fireEvent.press(screen.getByText('Retour'));

    expect(goBack).toHaveBeenCalledTimes(1);
  });

  it('affiche bien le résumé et les totaux du ticket', async () => {
    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Résumé')).toBeTruthy());
    expect(screen.getByText('Montant total')).toBeTruthy();
    expect(screen.getByText('Montant payé')).toBeTruthy();
    expect(screen.getByText('Reste à payer')).toBeTruthy();
    expect(screen.getAllByText('700 FCFA').length).toBeGreaterThan(0);
    expect(screen.getAllByText('600 FCFA').length).toBeGreaterThan(0);
  });

  it('bloque l’ouverture PDF quand le plan n’est pas Pro ou Business', async () => {
    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Ouvrir PDF')).toBeTruthy());
    fireEvent.press(screen.getByText('Ouvrir PDF'));

    expect(Alert.alert).toHaveBeenCalledWith('Plan requis', 'La facture PDF est disponible avec le plan Pro ou Business.');
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('ouvre la facture PDF quand le plan et le token sont disponibles', async () => {
    mockAuthState.plan = 'PRO';
    AsyncStorage.getItem.mockResolvedValueOnce('token-abc');

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Ouvrir PDF')).toBeTruthy());
    fireEvent.press(screen.getByText('Ouvrir PDF'));

    await waitFor(() => {
      expect(getFacturePdfUrl).toHaveBeenCalledWith(99, 'token-abc');
      expect(Linking.openURL).toHaveBeenCalledWith('https://tekki.test/factures/99?token=token-abc');
    });
  });

  it('ouvre aussi le PDF pour une vente minimale dès que l’id, le plan et le token sont présents', async () => {
    mockAuthState.plan = 'BUSINESS';
    AsyncStorage.getItem.mockResolvedValueOnce('token-mini');
    const minimalVente = {
      id: 7,
      numero: 'VNT-07',
      createdAt: '2026-03-10T10:00:00.000Z',
      montantTotal: 0,
      montantPaye: 0,
      details: [],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: minimalVente } }} />);

    await waitFor(() => expect(screen.getByText('Ouvrir PDF')).toBeTruthy());
    fireEvent.press(screen.getByText('Ouvrir PDF'));

    await waitFor(() => {
      expect(getFacturePdfUrl).toHaveBeenCalledWith(7, 'token-mini');
      expect(Linking.openURL).toHaveBeenCalledWith('https://tekki.test/factures/7?token=token-mini');
    });
  });

  it('affiche un fallback si on tente d’ouvrir le PDF sans identifiant de vente', async () => {
    mockAuthState.plan = 'PRO';
    const venteSansId = {
      numero: 'BROUILLON',
      createdAt: '2026-03-10T10:00:00.000Z',
      montantTotal: 0,
      montantPaye: 0,
      details: [],
    };

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente: venteSansId } }} />);

    await waitFor(() => expect(screen.getByText('Ouvrir PDF')).toBeTruthy());
    fireEvent.press(screen.getByText('Ouvrir PDF'));

    expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Impossible d’ouvrir la facture PDF.');
    expect(AsyncStorage.getItem).not.toHaveBeenCalled();
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('affiche une erreur si l’ouverture du PDF échoue', async () => {
    mockAuthState.plan = 'PRO';
    AsyncStorage.getItem.mockResolvedValueOnce('token-abc');
    Linking.openURL.mockRejectedValueOnce(new Error('cannot open'));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Ouvrir PDF')).toBeTruthy());
    fireEvent.press(screen.getByText('Ouvrir PDF'));

    await waitFor(() => {
      expect(getFacturePdfUrl).toHaveBeenCalledWith(99, 'token-abc');
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Impossible d’ouvrir la facture PDF.');
    });
  });

  it('demande une reconnexion si le plan autorise le PDF mais qu’aucun token n’est disponible', async () => {
    mockAuthState.plan = 'BUSINESS';
    AsyncStorage.getItem.mockResolvedValueOnce(null);

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Ouvrir PDF')).toBeTruthy());
    fireEvent.press(screen.getByText('Ouvrir PDF'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Session expirée', 'Reconnectez-vous pour ouvrir la facture PDF.');
    });
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it('affiche l’état sans imprimante sélectionnée au chargement', async () => {
    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('À configurer')).toBeTruthy());
    expect(screen.getByText('Aucune imprimante sélectionnée pour le moment.')).toBeTruthy();
    expect(screen.queryByText('Retirer')).toBeNull();
  });

  it('permet de rechercher, sélectionner puis tester une imprimante', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    scanBluetoothPrinters.mockResolvedValueOnce({ printers: [printer] });
    saveSelectedPrinter.mockResolvedValueOnce(printer);
    testPrinterConnection.mockResolvedValueOnce({ success: true });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Rechercher')).toBeTruthy());
    fireEvent.press(screen.getByText('Rechercher'));

    await waitFor(() => expect(scanBluetoothPrinters).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('ZJ-58')).toBeTruthy());

    fireEvent.press(screen.getByText('ZJ-58'));

    await waitFor(() => {
      expect(saveSelectedPrinter).toHaveBeenCalledWith(printer);
      expect(Alert.alert).toHaveBeenCalledWith('Imprimante sélectionnée', 'ZJ-58 sera utilisée pour les prochains tickets.');
    });

    fireEvent.press(screen.getByText('Tester'));

    await waitFor(() => {
      expect(testPrinterConnection).toHaveBeenCalledWith(printer);
      expect(Alert.alert).toHaveBeenCalledWith('Connexion OK', 'ZJ-58 répond correctement.');
    });
  });

  it('affiche une erreur si la sauvegarde de l’imprimante sélectionnée échoue', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    scanBluetoothPrinters.mockResolvedValueOnce({ printers: [printer] });
    saveSelectedPrinter.mockRejectedValueOnce(new Error('Sauvegarde impossible'));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Rechercher')).toBeTruthy());
    fireEvent.press(screen.getByText('Rechercher'));

    await waitFor(() => expect(screen.getByText('ZJ-58')).toBeTruthy());
    fireEvent.press(screen.getByText('ZJ-58'));

    await waitFor(() => {
      expect(saveSelectedPrinter).toHaveBeenCalledWith(printer);
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Sauvegarde impossible');
    });
    expect(screen.getByText('Aucune imprimante sélectionnée pour le moment.')).toBeTruthy();
  });

  it('utilise le message fallback si la sauvegarde imprimante échoue sans détail', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    scanBluetoothPrinters.mockResolvedValueOnce({ printers: [printer] });
    saveSelectedPrinter.mockRejectedValueOnce({});

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Rechercher')).toBeTruthy());
    fireEvent.press(screen.getByText('Rechercher'));

    await waitFor(() => expect(screen.getByText('ZJ-58')).toBeTruthy());
    fireEvent.press(screen.getByText('ZJ-58'));

    await waitFor(() => {
      expect(saveSelectedPrinter).toHaveBeenCalledWith(printer);
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Thermal printer unsupported');
    });
  });

  it('signale quand la recherche d’imprimantes ne trouve aucun résultat', async () => {
    scanBluetoothPrinters.mockResolvedValueOnce({ printers: [] });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Rechercher')).toBeTruthy());
    fireEvent.press(screen.getByText('Rechercher'));

    await waitFor(() => {
      expect(scanBluetoothPrinters).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Bluetooth', 'Aucune imprimante trouvée. Vérifie qu’elle est allumée et déjà appairée si nécessaire.');
    });
  });

  it('affiche l’état Recherche... pendant un scan Bluetooth en cours', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    let resolveSearch;
    getSavedPrinter.mockResolvedValueOnce(printer);
    scanBluetoothPrinters.mockImplementationOnce(() => new Promise((resolve) => { resolveSearch = resolve; }));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Rechercher'));

    await waitFor(() => expect(screen.getByText('Recherche...')).toBeTruthy());
    const searchButton = getPressableNode('Recherche...');
    expect(searchButton.props.disabled ?? searchButton.props.accessibilityState?.disabled).toBe(true);
    const testButton = getPressableNode('Tester');
    const printButton = getPressableNode('Imprimer ticket');
    const removeButton = getPressableNode('Retirer');
    expect(testButton.props.disabled ?? testButton.props.accessibilityState?.disabled).toBe(true);
    expect(printButton.props.disabled ?? printButton.props.accessibilityState?.disabled).toBe(true);
    expect(removeButton.props.disabled ?? removeButton.props.accessibilityState?.disabled).toBe(true);
    resolveSearch({ printers: [] });
    await waitFor(() => expect(screen.getByText('Rechercher')).toBeTruthy());
  });

  it('remonte l’erreur de recherche d’imprimantes', async () => {
    scanBluetoothPrinters.mockRejectedValueOnce(new Error('Bluetooth désactivé'));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Rechercher')).toBeTruthy());
    fireEvent.press(screen.getByText('Rechercher'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Bluetooth', 'Bluetooth désactivé');
    });
  });

  it('utilise le message fallback si la recherche d’imprimantes échoue sans détail', async () => {
    scanBluetoothPrinters.mockRejectedValueOnce({});

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Rechercher')).toBeTruthy());
    fireEvent.press(screen.getByText('Rechercher'));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Bluetooth', 'Thermal printer unsupported');
    });
  });

  it('signale un échec de test de connexion imprimante', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    getSavedPrinter.mockResolvedValueOnce(printer);
    testPrinterConnection.mockResolvedValueOnce({ success: false, error: { message: 'Imprimante hors ligne' } });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Tester'));

    await waitFor(() => {
      expect(testPrinterConnection).toHaveBeenCalledWith(printer);
      expect(Alert.alert).toHaveBeenCalledWith('Connexion impossible', 'Imprimante hors ligne');
    });
  });

  it('affiche l’état Test... pendant un test imprimante en cours', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    let resolveTest;
    getSavedPrinter.mockResolvedValueOnce(printer);
    testPrinterConnection.mockImplementationOnce(() => new Promise((resolve) => { resolveTest = resolve; }));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Tester'));

    await waitFor(() => expect(screen.getByText('Test...')).toBeTruthy());
    const testButton = getPressableNode('Test...');
    expect(testButton.props.disabled ?? testButton.props.accessibilityState?.disabled).toBe(true);
    const searchButton = getPressableNode('Rechercher');
    const printButton = getPressableNode('Imprimer ticket');
    const removeButton = getPressableNode('Retirer');
    expect(searchButton.props.disabled ?? searchButton.props.accessibilityState?.disabled).toBe(true);
    expect(printButton.props.disabled ?? printButton.props.accessibilityState?.disabled).toBe(true);
    expect(removeButton.props.disabled ?? removeButton.props.accessibilityState?.disabled).toBe(true);
    resolveTest({ success: true });
    await waitFor(() => expect(screen.getByText('Tester')).toBeTruthy());
  });

  it('utilise le message fallback si le test imprimante échoue sans détail', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    getSavedPrinter.mockResolvedValueOnce(printer);
    testPrinterConnection.mockRejectedValueOnce({});

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Tester'));

    await waitFor(() => {
      expect(testPrinterConnection).toHaveBeenCalledWith(printer);
      expect(Alert.alert).toHaveBeenCalledWith('Connexion impossible', 'Thermal printer unsupported');
    });
  });

  it('permet d’oublier une imprimante déjà sélectionnée', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    getSavedPrinter.mockResolvedValueOnce(printer);
    saveSelectedPrinter.mockResolvedValueOnce(null);

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Retirer'));

    await waitFor(() => expect(saveSelectedPrinter).toHaveBeenCalledWith(null));
    await waitFor(() => expect(screen.getByText('Aucune imprimante sélectionnée pour le moment.')).toBeTruthy());
  });

  it('affiche une erreur si l’oubli de l’imprimante échoue', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    getSavedPrinter.mockResolvedValueOnce(printer);
    saveSelectedPrinter.mockRejectedValueOnce(new Error('Suppression impossible'));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Retirer'));

    await waitFor(() => {
      expect(saveSelectedPrinter).toHaveBeenCalledWith(null);
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Suppression impossible');
    });
    expect(screen.getByText('ZJ-58')).toBeTruthy();
  });

  it('utilise le message fallback si l’oubli de l’imprimante échoue sans détail', async () => {
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    getSavedPrinter.mockResolvedValueOnce(printer);
    saveSelectedPrinter.mockRejectedValueOnce({});

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Retirer'));

    await waitFor(() => {
      expect(saveSelectedPrinter).toHaveBeenCalledWith(null);
      expect(Alert.alert).toHaveBeenCalledWith('Erreur', 'Thermal printer unsupported');
    });
  });

  it('affiche l’erreur partielle remontée par l’impression Android', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    getSavedPrinter.mockResolvedValueOnce(printer);
    printSaleReceipt.mockResolvedValueOnce({
      success: false,
      results: new Map([
        ['bt', { success: false, error: { message: 'Papier manquant' } }],
      ]),
    });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Imprimer ticket'));

    await waitFor(() => {
      expect(printSaleReceipt).toHaveBeenCalledWith({ printer, boutique: mockAuthState.boutique, vente });
      expect(Alert.alert).toHaveBeenCalledWith('Impression échouée', 'Papier manquant');
    });
  });

  it('remonte le premier échec rencontré dans un résultat d’impression Android mixte', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    getSavedPrinter.mockResolvedValueOnce(printer);
    printSaleReceipt.mockResolvedValueOnce({
      success: false,
      results: new Map([
        ['bt', { success: true }],
        ['ble', { success: false, error: { message: 'Port BLE occupé' } }],
      ]),
    });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Imprimer ticket'));

    await waitFor(() => {
      expect(printSaleReceipt).toHaveBeenCalledWith({ printer, boutique: mockAuthState.boutique, vente });
      expect(Alert.alert).toHaveBeenCalledWith('Impression échouée', 'Port BLE occupé');
    });
  });

  it('bloque l’impression thermique hors Android même avec une imprimante configurée', async () => {
    getSavedPrinter.mockResolvedValueOnce({ name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Imprimer ticket'));

    expect(Alert.alert).toHaveBeenCalledWith('Android requis', 'L’impression thermique Bluetooth est actuellement configurée pour Android.');
    expect(printSaleReceipt).not.toHaveBeenCalled();
  });

  it('désactive l’action d’impression tant qu’aucune imprimante n’est sélectionnée', async () => {
    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Imprimer ticket')).toBeTruthy());
    const printButton = getPressableNode('Imprimer ticket');
    expect(printButton.props.disabled ?? printButton.props.accessibilityState?.disabled).toBe(true);
    expect(printSaleReceipt).not.toHaveBeenCalled();
  });

  it('affiche une erreur d’impression sur Android quand l’envoi échoue', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    getSavedPrinter.mockResolvedValueOnce({ name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' });
    printSaleReceipt.mockRejectedValueOnce(new Error('Bluetooth indisponible'));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Imprimer ticket'));

    await waitFor(() => {
      expect(printSaleReceipt).toHaveBeenCalled();
      expect(Alert.alert).toHaveBeenCalledWith('Impression échouée', 'Bluetooth indisponible');
    });
  });

  it('utilise le message fallback quand l’impression Android échoue sans détail exploitable', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    getSavedPrinter.mockResolvedValueOnce(printer);
    printSaleReceipt.mockResolvedValueOnce({ success: false });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Imprimer ticket'));

    await waitFor(() => {
      expect(printSaleReceipt).toHaveBeenCalledWith({ printer, boutique: mockAuthState.boutique, vente });
      expect(Alert.alert).toHaveBeenCalledWith('Impression échouée', 'Le ticket n’a pas pu être imprimé.');
    });
  });

  it('confirme l’impression envoyée sur Android quand le ticket part correctement', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    getSavedPrinter.mockResolvedValueOnce({ name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' });
    printSaleReceipt.mockResolvedValueOnce({ success: true });

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Imprimer ticket'));

    await waitFor(() => {
      expect(printSaleReceipt).toHaveBeenCalledWith({
        printer: { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' },
        boutique: mockAuthState.boutique,
        vente,
      });
      expect(Alert.alert).toHaveBeenCalledWith('Impression envoyée', 'Le ticket a été envoyé vers ZJ-58.');
    });
  });

  it('affiche l’état Impression... pendant un envoi d’impression Android en cours', async () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'android' });
    const printer = { name: 'ZJ-58', address: 'AA:BB', deviceType: 'bt' };
    let resolvePrint;
    getSavedPrinter.mockResolvedValueOnce(printer);
    printSaleReceipt.mockImplementationOnce(() => new Promise((resolve) => { resolvePrint = resolve; }));

    render(<VenteTicketScreen navigation={{ goBack: jest.fn() }} route={{ params: { vente } }} />);

    await waitFor(() => expect(screen.getByText('Prête')).toBeTruthy());
    fireEvent.press(screen.getByText('Imprimer ticket'));

    await waitFor(() => expect(screen.getByText('Impression...')).toBeTruthy());
    const printButton = getPressableNode('Impression...');
    expect(printButton.props.disabled ?? printButton.props.accessibilityState?.disabled).toBe(true);
    const searchButton = getPressableNode('Rechercher');
    const testButton = getPressableNode('Tester');
    const removeButton = getPressableNode('Retirer');
    expect(searchButton.props.disabled ?? searchButton.props.accessibilityState?.disabled).toBe(true);
    expect(testButton.props.disabled ?? testButton.props.accessibilityState?.disabled).toBe(true);
    expect(removeButton.props.disabled ?? removeButton.props.accessibilityState?.disabled).toBe(true);
    resolvePrint({ success: true });
    await waitFor(() => expect(screen.getByText('Imprimer ticket')).toBeTruthy());
  });
});