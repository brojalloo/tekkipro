import { getApiSuccessMessage, getApiSuccessPayload, getLocalSuccessMessage } from './apiSuccess';

describe('apiSuccess helper', () => {
  it('returns the nested payload from an axios response', () => {
    const response = { data: { success: true, message: 'Client ajouté avec succès' } };

    expect(getApiSuccessPayload(response)).toEqual(response.data);
  });

  it('prefers the API success message when present', () => {
    const response = { data: { success: true, message: 'Boutique supprimée avec succès' } };

    expect(getApiSuccessMessage(response, { fallback: 'Suppression effectuée avec succès.' })).toBe('Boutique supprimée avec succès');
  });

  it('falls back to the provided UI success message', () => {
    expect(getApiSuccessMessage({ data: { success: true } }, { fallback: 'Vente VNT-50 enregistrée !' })).toBe('Vente VNT-50 enregistrée !');
  });

  it('can use a default action-based message', () => {
    expect(getApiSuccessMessage(null, { action: 'delete' })).toBe('Suppression effectuée avec succès.');
  });

  it('can resolve a localized local success message for an entity', () => {
    expect(getLocalSuccessMessage({ entity: 'vente', action: 'save', params: { numero: 'VNT-50' } })).toBe('Vente VNT-50 enregistrée avec succès.');
  });

  it('falls back to the normalized default update message', () => {
    expect(getLocalSuccessMessage({ action: 'update' })).toBe('Mise à jour effectuée avec succès.');
  });

  it('supports additional frontend entity messages', () => {
    expect(getLocalSuccessMessage({ entity: 'fournisseur', action: 'create' })).toBe('Fournisseur ajouté avec succès.');
    expect(getLocalSuccessMessage({ entity: 'auth', action: 'login' })).toBe('Connexion réussie.');
    expect(getLocalSuccessMessage({ entity: 'stock', action: 'update' })).toBe('Stock mis à jour avec succès.');
    expect(getLocalSuccessMessage({ entity: 'dette', action: 'repay' })).toBe('Paiement enregistré avec succès.');
    expect(getLocalSuccessMessage({ entity: 'produit', action: 'barcodeScanned', params: { code: '777888999' } })).toBe('Code-barres scanné : 777888999');
  });
});