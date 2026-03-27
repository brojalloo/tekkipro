import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import ProBadge from './ProBadge';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ProBadge', () => {
  it('affiche le label PRO en variante label', () => {
    wrap(<ProBadge variant="label" requiredPlan="PRO" />);
    expect(screen.getByText('PRO')).toBeInTheDocument();
  });

  it('affiche uniquement une icône en variante icon-only', () => {
    const { container } = wrap(<ProBadge variant="icon-only" requiredPlan="PRO" />);
    expect(screen.queryByText('PRO')).not.toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('est un lien vers /app/abonnement', () => {
    wrap(<ProBadge variant="label" requiredPlan="PRO" />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/app/abonnement');
  });
});
