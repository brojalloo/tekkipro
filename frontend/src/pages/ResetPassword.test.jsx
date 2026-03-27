import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import ResetPassword from './ResetPassword';

const { mockPost, mockToastError } = vi.hoisted(() => ({
  mockPost: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    post: (...args) => mockPost(...args),
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

describe('ResetPassword page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('bloque les mots de passe faibles avant l’appel API', async () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), { target: { value: 'Secret12' } });
    fireEvent.change(screen.getByLabelText(/confirmer le mot de passe/i), { target: { value: 'Secret12' } });
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser le mot de passe/i }));

    await waitFor(() => {
      expect(mockPost).not.toHaveBeenCalled();
      expect(mockToastError).toHaveBeenCalledWith('Le mot de passe doit contenir au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial.');
      expect(screen.getByRole('alert')).toHaveTextContent('Le mot de passe doit contenir au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial.');
    });
  });

  it('permet d’afficher puis masquer la saisie des deux champs', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );

    const passwordInput = screen.getByLabelText(/nouveau mot de passe/i);
    const confirmInput = screen.getByLabelText(/confirmer le mot de passe/i);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(confirmInput).toHaveAttribute('type', 'text');
    expect(passwordInput).toHaveAttribute('data-visibility', 'masked');
    expect(confirmInput).toHaveAttribute('data-visibility', 'masked');

    fireEvent.click(screen.getByLabelText(/afficher les mots de passe/i));

    expect(passwordInput).toHaveAttribute('data-visibility', 'visible');
    expect(confirmInput).toHaveAttribute('data-visibility', 'visible');

    fireEvent.click(screen.getByLabelText(/masquer les mots de passe/i));

    expect(passwordInput).toHaveAttribute('data-visibility', 'masked');
    expect(confirmInput).toHaveAttribute('data-visibility', 'masked');
  });

  it('soumet quand le mot de passe respecte les règles et la confirmation correspond', async () => {
    mockPost.mockResolvedValueOnce({ data: { message: 'Mot de passe réinitialisé avec succès' } });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), { target: { value: 'MotDe!26' } });
    fireEvent.change(screen.getByLabelText(/confirmer le mot de passe/i), { target: { value: 'MotDe!26' } });
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser le mot de passe/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith('/auth/reset-password', {
        token: 'test-token',
        password: 'MotDe!26',
      });
      expect(screen.getByText('Mot de passe modifié !')).toBeInTheDocument();
    });
  });

  it('ne remplit pas automatiquement le champ de confirmation', () => {
    render(
      <MemoryRouter initialEntries={['/reset-password?token=test-token']}>
        <Routes>
          <Route path="/reset-password" element={<ResetPassword />} />
        </Routes>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/nouveau mot de passe/i), { target: { value: 'Passer@123' } });

    expect(screen.getByLabelText(/confirmer le mot de passe/i)).toHaveValue('');
  });
});