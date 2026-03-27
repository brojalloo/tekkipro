import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import ProTooltip from './ProTooltip';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ProTooltip', () => {
  it('n\'affiche pas le tooltip si locked=false', () => {
    wrap(
      <ProTooltip locked={false} featureLabel="Fournisseurs" requiredPlan="PRO">
        <button>Action</button>
      </ProTooltip>
    );
    expect(screen.queryByText(/Fournisseurs/)).not.toBeInTheDocument();
  });

  it('affiche le tooltip au survol si locked=true', async () => {
    wrap(
      <ProTooltip locked={true} featureLabel="Fournisseurs" requiredPlan="PRO">
        <button>Action</button>
      </ProTooltip>
    );
    fireEvent.mouseEnter(screen.getByText('Action').closest('[data-tooltip-wrapper]'));
    expect(await screen.findByText(/Fournisseurs/)).toBeInTheDocument();
    expect(screen.getByText(/plan PRO/)).toBeInTheDocument();
  });

  it('masque le tooltip à la sortie de la souris', async () => {
    wrap(
      <ProTooltip locked={true} featureLabel="Fournisseurs" requiredPlan="PRO">
        <button>Action</button>
      </ProTooltip>
    );
    const wrapper = screen.getByText('Action').closest('[data-tooltip-wrapper]');
    fireEvent.mouseEnter(wrapper);
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByText(/Fournisseurs/)).not.toBeInTheDocument();
  });
});
