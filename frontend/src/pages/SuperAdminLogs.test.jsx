import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SuperAdminLogs from './SuperAdminLogs';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../services/api', () => ({ default: { get: apiGet } }));
vi.mock('../context/useAuth', () => ({ useAuth: () => ({ plan: 'PRO', planUsage: null }) }));

describe('SuperAdminLogs', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 30, total: 0, totalPages: 0 } },
    });
  });

  it("affiche le titre de la page", async () => {
    render(<MemoryRouter><SuperAdminLogs /></MemoryRouter>);
    expect(screen.getByText(/Logs/i)).toBeInTheDocument();
  });

  it("appelle l'API audit-logs au montage", async () => {
    render(<MemoryRouter><SuperAdminLogs /></MemoryRouter>);
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith(
        '/superadmin/audit-logs',
        expect.any(Object)
      );
    });
  });
});
