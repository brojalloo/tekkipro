import { describe, expect, it, beforeEach } from 'vitest';
import {
  clearStoredAuth,
  getStoredAuthData,
  persistAuthSession,
} from './authStorage';

describe('authStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
  });

  it('persiste la session dans sessionStorage uniquement', () => {
    persistAuthSession({
      token: 'session-token',
      user: { id: 1, email: 'boss@tekki.test' },
      boutique: { id: 5, nom: 'Tekki Shop', plan: 'PRO' },
    });

    expect(sessionStorage.getItem('tekkipro_token')).toBe('session-token');
    expect(localStorage.getItem('tekkipro_token')).toBeNull();
  });

  it('migre automatiquement les anciennes données localStorage', () => {
    localStorage.setItem('tekkipro_token', 'legacy-token');
    localStorage.setItem('tekkipro_user', JSON.stringify({ id: 2, email: 'legacy@tekki.test' }));
    localStorage.setItem('tekkipro_boutique', JSON.stringify({ id: 8, nom: 'Legacy', plan: 'BUSINESS' }));

    const auth = getStoredAuthData();

    expect(auth.token).toBe('legacy-token');
    expect(auth.user).toMatchObject({ email: 'legacy@tekki.test' });
    expect(sessionStorage.getItem('tekkipro_token')).toBe('legacy-token');
    expect(localStorage.getItem('tekkipro_token')).toBeNull();
  });

  it('efface la session des deux stockages', () => {
    sessionStorage.setItem('tekkipro_token', 'session-token');
    localStorage.setItem('tekkipro_token', 'legacy-token');

    clearStoredAuth();

    expect(sessionStorage.getItem('tekkipro_token')).toBeNull();
    expect(localStorage.getItem('tekkipro_token')).toBeNull();
  });
});