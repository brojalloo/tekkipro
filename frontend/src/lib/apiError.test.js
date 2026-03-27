import { describe, expect, it } from 'vitest';
import {
  getApiErrorCode,
  getApiErrorMessage,
  isUpgradeRequiredError,
  shouldClearAuthSession,
} from './apiError';

describe('apiError helpers', () => {
  it('mappe un code métier connu vers un message frontend stable', () => {
    const error = {
      response: {
        status: 401,
        data: { code: 'INVALID_CREDENTIALS', message: 'Email ou mot de passe incorrect' },
      },
    };

    expect(getApiErrorCode(error)).toBe('INVALID_CREDENTIALS');
    expect(getApiErrorMessage(error, { fallback: 'Erreur connexion' })).toBe('Email ou mot de passe incorrect.');
    expect(shouldClearAuthSession(error)).toBe(false);
  });

  it('mappe les codes auth secondaires vers des messages UI dédiés', () => {
    expect(getApiErrorMessage({ response: { data: { code: 'EMAIL_REQUIRED' } } })).toBe('Email requis.');
    expect(getApiErrorMessage({ response: { data: { code: 'INVALID_VERIFICATION_TOKEN' } } })).toBe('Le lien de vérification est invalide ou expiré.');
    expect(getApiErrorMessage({ response: { data: { code: 'INVALID_RESET_TOKEN' } } })).toBe('Le lien de réinitialisation est invalide ou expiré.');
  });

  it('utilise le premier message de validation et résume le reste', () => {
    const error = {
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'La requête contient des données invalides.',
          errorCount: 2,
          errors: [
            { field: 'email', message: 'Email invalide', location: 'body', code: 'INVALID_FORMAT' },
            { field: 'password', message: 'Mot de passe requis', location: 'body', code: 'REQUIRED_FIELD' },
          ],
        },
      },
    };

    expect(getApiErrorMessage(error, { fallback: 'Erreur validation' })).toBe('Email invalide (+1 autre erreur)');
  });

  it('détecte les erreurs demandant une reconnexion', () => {
    const error = {
      response: {
        status: 401,
        data: { code: 'INVALID_TOKEN', message: 'Token invalide' },
      },
    };

    expect(getApiErrorMessage(error)).toBe('Votre session n’est plus valide. Reconnectez-vous.');
    expect(shouldClearAuthSession(error)).toBe(true);
  });

  it('détecte un upgrade requis via code métier ou flag legacy', () => {
    expect(isUpgradeRequiredError({ response: { data: { code: 'PLAN_UPGRADE_REQUIRED' } } })).toBe(true);
    expect(isUpgradeRequiredError({ response: { data: { upgrade: true } } })).toBe(true);
    expect(isUpgradeRequiredError({ response: { data: { code: 'PRODUCT_NOT_FOUND' } } })).toBe(false);
  });

  it('préfixe le status quand demandé pour les toasts techniques', () => {
    const error = {
      response: {
        status: 500,
        data: { message: 'Stock verrouillé' },
      },
    };

    expect(getApiErrorMessage(error, { includeStatus: true, fallback: 'Erreur vente' })).toBe('[500] Stock verrouillé');
  });
});