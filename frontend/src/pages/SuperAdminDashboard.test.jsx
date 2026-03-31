import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SuperAdminDashboard from './SuperAdminDashboard';

const { apiGet } = vi.hoisted(() => ({ apiGet: vi.fn() }));

vi.mock('../services/api', () => ({ default: { get: apiGet } }));
vi.mock('../context/useAuth', () => ({ useAuth: () => ({ plan: 'PRO', planUsage: null }) }));
vi.mock('recharts', () => ({
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  Tooltip: () => null,
  CartesianGrid: () => null,
  ResponsiveContainer: ({ children }) => <div>{children}</div>,
}));

const mockData = {
  boutiques: {
    total: 10, actives: 8, suspendues: 2,
    parPlan: { GRATUIT: 5, PRO: 3, BUSINESS: 2 },
    nouveauxCeMois: 1,
  },
  utilisateurs: {
    total: 20, actifs: 18,
    parRole: { ADMIN: 10, EMPLOYE: 10 },
  },
  revenus: {
    totalEncaisse: 50000,
    parPlan: { PRO: 20000, BUSINESS: 30000 },
    mrr: 35000,
    mrrParPlan: { PRO: 15000, BUSINESS: 20000 },
    parMois: [{ mois: '2026-03', montant: 50000 }],
  },
};

describe('SuperAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiGet.mockResolvedValue({ data: { data: mockData } });
  });

  it('affiche le titre de la page', async () => {
    render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
    expect(screen.getByText(/Tableau de bord/i)).toBeInTheDocument();
  });

  it("appelle l'API dashboard au montage", async () => {
    render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
    await waitFor(() => {
      expect(apiGet).toHaveBeenCalledWith('/superadmin/dashboard');
    });
  });

  it('affiche les stats boutiques apres chargement', async () => {
    render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });

  it('rend le graphique BarChart', async () => {
    render(<MemoryRouter><SuperAdminDashboard /></MemoryRouter>);
    await waitFor(() => {
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });
});
