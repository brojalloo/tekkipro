import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import ForgotPassword from './ForgotPassword';
import ResetPassword from './ResetPassword';
import VerifyEmail from './VerifyEmail';

const { apiPost, mockToastError } = vi.hoisted(() => ({
  apiPost: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    post: apiPost,
  },
}));

vi.mock('react-hot-toast', () => ({
  default: {
    error: mockToastError,
    success: vi.fn(),
  },
}));

describe('Auth secondary error flows', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('mappe EMAIL_REQUIRED sur ForgotPassword', async () => {
    apiPost.mockRejectedValueOnce({ response: { status: 400, data: { code: 'EMAIL_REQUIRED' } } });

    render(
      <MemoryRouter>
        <ForgotPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText(/adresse email/i), { target: { value: 'boss@tekki.test' } });
    fireEvent.click(screen.getByRole('button', { name: /envoyer le lien/i }));

    await waitFor(() => {
      expect(mockToastError).toHaveBeenCalledWith('Email requis.');
      expect(screen.getByRole('alert')).toHaveTextContent('Email requis.');
    });
  });

  it('mappe INVALID_RESET_TOKEN sur ResetPassword', async () => {
    apiPost.mockRejectedValueOnce({ response: { status: 400, data: { code: 'INVALID_RESET_TOKEN' } } });

    render(
      <MemoryRouter initialEntries={['/reset-password?token=abc']}>
        <ResetPassword />
      </MemoryRouter>
    );

    fireEvent.change(screen.getByLabelText('Nouveau mot de passe'), { target: { value: 'Passer@123' } });
    fireEvent.change(screen.getByLabelText('Confirmer le mot de passe'), { target: { value: 'Passer@123' } });
    fireEvent.click(screen.getByRole('button', { name: /réinitialiser le mot de passe/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Le lien de réinitialisation est invalide ou expiré.');
  });

  it('mappe INVALID_VERIFICATION_TOKEN sur VerifyEmail', async () => {
    apiPost.mockRejectedValueOnce({ response: { status: 400, data: { code: 'INVALID_VERIFICATION_TOKEN' } } });

    render(
      <MemoryRouter initialEntries={['/verify-email?token=abc']}>
        <VerifyEmail />
      </MemoryRouter>
    );

    expect(await screen.findByText('Le lien de vérification est invalide ou expiré.')).toBeInTheDocument();
  });
});