import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import VerifyEmail from './VerifyEmail';

const { apiPost } = vi.hoisted(() => ({
  apiPost: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: {
    post: apiPost,
  },
}));

describe('VerifyEmail page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('confirme l’activation quand le token est valide', async () => {
    apiPost.mockResolvedValueOnce({
      data: { success: true, message: 'Email vérifié avec succès. Vous pouvez maintenant vous connecter.' },
    });

    render(
      <MemoryRouter initialEntries={['/verify-email?token=abc']}>
        <VerifyEmail />
      </MemoryRouter>
    );

    expect(await screen.findByText('Email vérifié !')).toBeInTheDocument();
    expect(screen.getByText('Email vérifié avec succès. Vous pouvez maintenant vous connecter.')).toBeInTheDocument();
  });
});