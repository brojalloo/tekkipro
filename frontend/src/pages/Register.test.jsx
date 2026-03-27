import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Register from './Register';

const { mockNavigate, mockRegister, mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockRegister: vi.fn(),
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ register: mockRegister }),
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

describe('Register page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permet d’afficher puis masquer le mot de passe', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText('Mot de passe');
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /afficher le mot de passe/i }));
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /masquer le mot de passe/i }));
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute('type', 'password');
  });

  it('redirige vers la connexion avec confirmation d’activation quand l’email doit être vérifié', async () => {
    mockRegister.mockResolvedValueOnce({
      message: 'Boutique créée avec succès. Vérifiez votre email pour activer votre compte.',
      data: {
        requiresEmailVerification: true,
        emailVerificationSentTo: 'awa@example.com',
      },
    });

    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Nom de la boutique'), { target: { value: 'Boutique Awa' } });
    fireEvent.change(screen.getByLabelText('Prénom'), { target: { value: 'Awa' } });
    fireEvent.change(screen.getByLabelText('Nom'), { target: { value: 'Diallo' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'awa@example.com' } });
    fireEvent.change(screen.getByLabelText('Téléphone'), { target: { value: '770000000' } });
    fireEvent.change(screen.getByLabelText('Mot de passe'), { target: { value: 'Passer@123' } });
    fireEvent.click(screen.getByRole('button', { name: /créer ma boutique/i }));

    await waitFor(() => {
      expect(mockToastSuccess).toHaveBeenCalledWith('Boutique créée avec succès. Vérifiez votre email pour activer votre compte.');
      expect(mockNavigate).toHaveBeenCalledWith('/login', {
        replace: true,
        state: {
          activationMessage: 'Boutique créée avec succès. Vérifiez votre email pour activer votre compte.',
          activationEmail: 'awa@example.com',
        },
      });
    });
  });
});