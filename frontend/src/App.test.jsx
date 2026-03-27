import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import App from './App';

const authState = vi.hoisted(() => ({
  loading: false,
  user: null,
  isAdmin: false,
}));

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }) => children,
}));

vi.mock('./context/useAuth', () => ({
  useAuth: () => authState,
}));

vi.mock('./components/Layout', async () => {
  const React = await vi.importActual('react');
  const { Outlet } = await vi.importActual('react-router-dom');
  return {
    default: () => React.createElement('div', null, React.createElement('div', { 'data-testid': 'layout' }, 'Layout'), React.createElement(Outlet)),
  };
});

vi.mock('./pages/Login', () => ({ default: () => <div>Page login</div> }));
vi.mock('./pages/Landing', () => ({ default: () => <div>Page landing</div> }));
vi.mock('./pages/Dashboard', () => ({ default: () => <div>Dashboard page</div> }));
vi.mock('./pages/Employes', () => ({ default: () => <div>Employes page</div> }));

describe('App routes', () => {
  beforeEach(() => {
    authState.loading = false;
    authState.user = null;
    authState.isAdmin = false;
  });

  it('redirige un visiteur anonyme de /app vers /login', async () => {
    window.history.pushState({}, '', '/app/produits');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Page login')).toBeInTheDocument();
    });
  });

  it('redirige un utilisateur connecté de /login vers /app', async () => {
    authState.user = { id: 1, role: 'EMPLOYE' };
    window.history.pushState({}, '', '/login');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard page')).toBeInTheDocument();
    });
  });

  it('bloque une route adminOnly pour un employé et le renvoie vers /app', async () => {
    authState.user = { id: 2, role: 'EMPLOYE' };
    authState.isAdmin = false;
    window.history.pushState({}, '', '/app/employes');

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Dashboard page')).toBeInTheDocument();
      expect(screen.queryByText('Employes page')).not.toBeInTheDocument();
    });
  });
});