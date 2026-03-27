import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from './AuthContext';
import { useAuth } from './useAuth';
import api from '../services/api';

vi.mock('../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function Probe() {
  const auth = useAuth();

  return (
    <div>
      <div data-testid="state">{JSON.stringify({
        user: auth.user,
        boutique: auth.boutique,
        plan: auth.plan,
        isPro: auth.isPro,
        isBusiness: auth.isBusiness,
        activeBoutique: auth.activeBoutique,
      })}</div>
      <div data-testid="boutique-name">{auth.getActiveBoutiqueName()}</div>
      <button type="button" onClick={() => auth.login('boss@tekki.test', 'secret')}>login</button>
      <button type="button" onClick={() => auth.refreshBoutique()}>refresh</button>
      <button type="button" onClick={() => auth.logout()}>logout</button>
    </div>
  );
}

const readState = () => JSON.parse(screen.getByTestId('state').textContent);

describe('AuthProvider', () => {
  beforeEach(() => {
    sessionStorage.clear();
    localStorage.clear();
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: { data: [] } });
  });

  it('restaure la session depuis le sessionStorage', () => {
    sessionStorage.setItem('tekkipro_token', 'stored-token');
    sessionStorage.setItem('tekkipro_user', JSON.stringify({ id: 7, email: 'user@test.dev', role: 'EMPLOYE' }));
    sessionStorage.setItem('tekkipro_boutique', JSON.stringify({ id: 3, nom: 'Boutique Test', plan: 'PRO' }));
    sessionStorage.setItem('tekkipro_active_boutique', '12');

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(readState()).toMatchObject({
      user: { email: 'user@test.dev', role: 'EMPLOYE' },
      boutique: { nom: 'Boutique Test', plan: 'PRO' },
      plan: 'PRO',
      isPro: true,
      isBusiness: false,
      activeBoutique: 12,
    });
    expect(screen.getByTestId('boutique-name')).toHaveTextContent('Boutique Test');
  });

  it('migre une ancienne session localStorage vers sessionStorage', () => {
    localStorage.setItem('tekkipro_token', 'legacy-token');
    localStorage.setItem('tekkipro_user', JSON.stringify({ id: 8, email: 'legacy@test.dev', role: 'EMPLOYE' }));
    localStorage.setItem('tekkipro_boutique', JSON.stringify({ id: 4, nom: 'Legacy Shop', plan: 'GRATUIT' }));

    render(<AuthProvider><Probe /></AuthProvider>);

    expect(readState()).toMatchObject({
      user: { email: 'legacy@test.dev' },
      boutique: { nom: 'Legacy Shop', plan: 'GRATUIT' },
      plan: 'GRATUIT',
    });
    expect(sessionStorage.getItem('tekkipro_token')).toBe('legacy-token');
    expect(localStorage.getItem('tekkipro_token')).toBeNull();
  });

  it('persiste les données au login et calcule les indicateurs de plan', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        data: {
          token: 'login-token',
          user: { id: 1, email: 'boss@tekki.test', role: 'ADMIN' },
          boutique: { id: 5, nom: 'Tekki Shop', plan: 'BUSINESS' },
        },
      },
    });

    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText('login'));

    await waitFor(() => {
      expect(readState()).toMatchObject({
        user: { email: 'boss@tekki.test', role: 'ADMIN' },
        boutique: { nom: 'Tekki Shop', plan: 'BUSINESS' },
        plan: 'BUSINESS',
        isPro: true,
        isBusiness: true,
      });
    });

    expect(sessionStorage.getItem('tekkipro_token')).toBe('login-token');
    expect(JSON.parse(sessionStorage.getItem('tekkipro_user'))).toMatchObject({ email: 'boss@tekki.test' });
    expect(JSON.parse(sessionStorage.getItem('tekkipro_boutique'))).toMatchObject({ plan: 'BUSINESS' });
    expect(sessionStorage.getItem('tekkipro_active_boutique')).toBeNull();
    expect(localStorage.getItem('tekkipro_token')).toBeNull();
  });

  it('rafraîchit la boutique et le user depuis /auth/me', async () => {
    sessionStorage.setItem('tekkipro_token', 'stored-token');
    sessionStorage.setItem('tekkipro_user', JSON.stringify({ id: 2, email: 'owner@tekki.test', role: 'ADMIN' }));
    sessionStorage.setItem('tekkipro_boutique', JSON.stringify({ id: 9, nom: 'Boutique Starter', plan: 'GRATUIT' }));

    api.get.mockResolvedValueOnce({
      data: {
        data: {
          id: 2,
          email: 'owner@tekki.test',
          role: 'ADMIN',
          boutique: { id: 9, nom: 'Boutique Pro', plan: 'PRO' },
        },
      },
    });

    render(<AuthProvider><Probe /></AuthProvider>);
    fireEvent.click(screen.getByText('refresh'));

    await waitFor(() => {
      expect(readState()).toMatchObject({
        boutique: { nom: 'Boutique Pro', plan: 'PRO' },
        plan: 'PRO',
        isPro: true,
      });
    });

    expect(JSON.parse(sessionStorage.getItem('tekkipro_boutique'))).toMatchObject({ nom: 'Boutique Pro', plan: 'PRO' });
  });
});