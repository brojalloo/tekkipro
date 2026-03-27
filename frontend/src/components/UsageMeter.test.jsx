import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import UsageMeter from './UsageMeter';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('UsageMeter', () => {
  it('affiche le label, used et limit', () => {
    wrap(<UsageMeter label="Ventes ce mois" used={45} limit={100} />);
    expect(screen.getByText(/Ventes ce mois/)).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });

  it('affiche le CTA upgrade à ≥80% d\'utilisation', () => {
    wrap(<UsageMeter label="Ventes" used={80} limit={100} />);
    expect(screen.getByText(/Passer au PRO/)).toBeInTheDocument();
  });

  it('n\'affiche pas le CTA upgrade à <80%', () => {
    wrap(<UsageMeter label="Ventes" used={50} limit={100} />);
    expect(screen.queryByText(/Passer au PRO/)).not.toBeInTheDocument();
  });

  it('n\'affiche rien si limit est null ou 999999', () => {
    const { container } = wrap(<UsageMeter label="Ventes" used={100} limit={999999} />);
    expect(container.firstChild).toBeNull();
  });

  it('affiche rouge à ≥90%', () => {
    wrap(<UsageMeter label="Ventes" used={95} limit={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar.className).toMatch(/bg-red/);
  });
});
