import { getApiSuccessMessage, getApiSuccessPayload, getLocalSuccessMessage } from '@tekkipro/shared/apiSuccess';

describe('mobile apiSuccess helper', () => {
  it('returns the response payload when given an axios response', () => {
    const response = { data: { success: true, message: 'Client ajouté et sélectionné pour cette vente.' } };

    expect(getApiSuccessPayload(response)).toEqual(response.data);
  });

  it('prefers the API message when present', () => {
    const response = { data: { success: true, message: 'Abonnement souscrit.' } };

    expect(getApiSuccessMessage(response, { language: 'fr', fallback: 'Opération effectuée avec succès.' })).toBe('Abonnement souscrit.');
  });

  it('falls back to the provided localized message', () => {
    expect(getApiSuccessMessage({ data: { success: true } }, { language: 'en', fallback: 'The sale VNT-99 was validated.' })).toBe('The sale VNT-99 was validated.');
  });

  it('uses a default action-based message', () => {
    expect(getApiSuccessMessage(null, { language: 'fr', action: 'delete' })).toBe('Suppression effectuée avec succès.');
  });

  it('can resolve a localized entity success message', () => {
    expect(getLocalSuccessMessage({ language: 'fr', entity: 'vente', action: 'save', params: { numero: 'VNT-99' } })).toBe('Vente VNT-99 enregistrée avec succès.');
  });

  it('uses the normalized default update message in French', () => {
    expect(getLocalSuccessMessage({ language: 'fr', action: 'update' })).toBe('Mise à jour effectuée avec succès.');
  });
});