import {
  createApiErrorFromPayload,
  getApiErrorMessage,
  shouldClearAuthSession,
} from '@tekkipro/shared/apiError';

describe('apiError mobile helper', () => {
  it('maps invalid credentials by code in French', () => {
    const error = {
      response: {
        status: 401,
        data: { code: 'INVALID_CREDENTIALS', message: 'Backend raw message' },
      },
    };

    expect(getApiErrorMessage(error, { language: 'fr' })).toBe('Email ou mot de passe incorrect.');
  });

  it('maps invalid credentials by code in English', () => {
    const error = {
      response: {
        status: 401,
        data: { code: 'INVALID_CREDENTIALS', message: 'Backend raw message' },
      },
    };

    expect(getApiErrorMessage(error, { language: 'en' })).toBe('Incorrect email or password.');
  });

  it('summarizes validation errors', () => {
    const error = {
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errorCount: 2,
          errors: [{ message: 'Email requis.' }, { message: 'Mot de passe requis.' }],
        },
      },
    };

    expect(getApiErrorMessage(error, { language: 'fr' })).toBe('Email requis. (+1 autre erreur)');
  });

  it('summarizes validation errors in English too', () => {
    const error = {
      response: {
        status: 400,
        data: {
          code: 'VALIDATION_ERROR',
          message: 'Validation failed',
          errorCount: 3,
          errors: [{ message: 'Email is required.' }, { message: 'Password is required.' }, { message: 'Phone is invalid.' }],
        },
      },
    };

    expect(getApiErrorMessage(error, { language: 'en' })).toBe('Email is required. (+2 other errors)');
  });

  it('only clears auth session for real session errors', () => {
    const sessionError = { response: { status: 401, data: { code: 'AUTH_REQUIRED' } } };
    const functional401 = { response: { status: 401, data: { code: 'INVALID_CREDENTIALS' } } };

    expect(shouldClearAuthSession(sessionError)).toBe(true);
    expect(shouldClearAuthSession(functional401)).toBe(false);
  });

  it('can create an api-like error from a payload', () => {
    const error = createApiErrorFromPayload({ code: 'EMAIL_REQUIRED', message: 'Backend raw message' });

    expect(error.response.data.code).toBe('EMAIL_REQUIRED');
    expect(getApiErrorMessage(error, { language: 'fr' })).toBe('Email requis.');
  });
});