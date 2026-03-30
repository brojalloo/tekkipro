import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import AuditLogTable from './AuditLogTable';

const { apiGet } = vi.hoisted(() => ({
  apiGet: vi.fn(),
}));

vi.mock('../services/api', () => ({
  default: { get: apiGet },
}));

vi.mock('../context/useAuth', () => ({
  useAuth: () => ({ plan: 'PRO', planUsage: null }),
}));

const mockLogs = {
  data: [
    {
      id: 1,
      action: 'UPDATE',
      entite: 'boutique',
      entiteId: 5,
      message: "Plan change: GRATUIT vers PRO",
      createdAt: '2026-03-30T10:00:00Z',
      boutique: { id: 5, nom: 'Boutique Koffi' },
      user: { id: 7, prenom: 'Super', nom: 'Admin' },
    },
    {
      id: 2,
      action: 'DELETE',
      entite: 'boutique',
      entiteId: 3,
      message: 'Boutique supprimee',
      createdAt: '2026-03-29T08:00:00Z',
      boutique: null,
      user: null,
    },
  ],
  pagination: { page: 1, limit: 30, total: 2, totalPages: 1 },
};

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AuditLogTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockResolvedValue({ data: mockLogs });
  });

  it('affiche les logs apres chargement', async () => {
    wrap(<AuditLogTable />);
    await waitFor(() => {
      expect(screen.getByText("Plan change: GRATUIT vers PRO")).toBeInTheDocument();
    });
    expect(screen.getByText('Boutique Koffi')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('affiche tiret quand boutique est null', async () => {
    wrap(<AuditLogTable />);
    await waitFor(() => {
      expect(screen.getByText('Boutique supprimee')).toBeInTheDocument();
    });
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
  });

  it("appelle l'API avec boutiqueId quand prop fournie", async () => {
    wrap(<AuditLogTable boutiqueId={5} />);
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith(
        '/superadmin/audit-logs',
        expect.objectContaining({ params: expect.objectContaining({ boutiqueId: 5 }) })
      );
    });
  });

  it('affiche le badge action', async () => {
    wrap(<AuditLogTable />);
    await waitFor(() => {
      expect(screen.getByText('UPDATE')).toBeInTheDocument();
      expect(screen.getByText('DELETE')).toBeInTheDocument();
    });
  });

  it('affiche Aucun log quand la liste est vide', async () => {
    apiGet.mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 30, total: 0, totalPages: 0 } },
    });
    wrap(<AuditLogTable />);
    await waitFor(() => {
      expect(screen.getByText(/Aucun log/)).toBeInTheDocument();
    });
  });
});
