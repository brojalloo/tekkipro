import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Login from './Login';

const { mockNavigate, mockLogin, mockToastSuccess, mockToastError, apiPost } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogin: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
  apiPost: vi.fn(),
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

vi.mock('../services/api', () => ({
  default: {
    post: apiPost,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    success: mockToastSuccess,
    error: mockToastError,
  },
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Login page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('connecte l’utilisateur et redirige vers /app', async () => {
    mockLogin.mockResolvedValueOnce({ success: true });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'boss@tekki.test' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('boss@tekki.test', 'secret');
      expect(mockToastSuccess).toHaveBeenCalledWith('Connexion réussie.');
      expect(mockNavigate).toHaveBeenCalledWith('/app', { replace: true });
    });
  });

  it('affiche l’erreur backend en cas d’échec de connexion', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { status: 401, data: { code: 'INVALID_CREDENTIALS' } },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'boss@tekki.test' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'wrong-password' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email ou mot de passe incorrect.');
      expect(screen.getByRole('alert')).toHaveTextContent('Email ou mot de passe incorrect.');
    });
  });

  it('permet d’afficher puis masquer le mot de passe', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText('Mot de passe');
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /afficher le mot de passe/i }));
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /masquer le mot de passe/i }));
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password');
  });

  it('affiche le message d’activation et pré-remplit l’email après inscription', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { activationMessage: 'Vérifiez votre email pour activer votre compte.', activationEmail: 'boss@tekki.test' } }]}>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('status')).toHaveTextContent('Vérifiez votre email pour activer votre compte.');
    expect(screen.getByLabelText('Email')).toHaveValue('boss@tekki.test');
  });

  it('permet de renvoyer l’email d’activation après un blocage EMAIL_NOT_VERIFIED', async () => {
    mockLogin.mockRejectedValueOnce({
      response: { status: 403, data: { code: 'EMAIL_NOT_VERIFIED' } },
    });
    apiPost.mockResolvedValueOnce({
      data: { success: true, message: 'Si cet email existe, un lien de vérification a été envoyé.' },
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'boss@tekki.test' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: /se connecter/i }));

    expect(await screen.findByRole('button', { name: /renvoyer l’email d’activation/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /renvoyer l’email d’activation/i }));

    await waitFor(() => {
      expect(apiPost).toHaveBeenCalledWith('/auth/resend-verification', { email: 'boss@tekki.test' });
      expect(mockToastSuccess).toHaveBeenCalledWith('Si cet email existe, un lien de vérification a été envoyé.');
      expect(screen.getByRole('status')).toHaveTextContent('Si cet email existe, un lien de vérification a été envoyé.');
    });
  });
});