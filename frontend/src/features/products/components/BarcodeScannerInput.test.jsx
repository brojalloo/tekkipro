import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import BarcodeScannerInput from './BarcodeScannerInput';

describe('BarcodeScannerInput', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('soumet un code saisi manuellement puis vide le champ', () => {
    const onScan = vi.fn();

    render(<BarcodeScannerInput onScan={onScan} active={true} showInput={true} />);

    const input = screen.getByPlaceholderText('Scanner ou saisir un code-barres…');
    fireEvent.change(input, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Rechercher/i }));

    expect(onScan).toHaveBeenCalledWith('123456');
    expect(input).toHaveValue('');
  });

  it('détecte un scan HID terminé par Entrée', () => {
    const onScan = vi.fn();

    render(<BarcodeScannerInput onScan={onScan} active={true} showInput={false} />);

    fireEvent.keyDown(window, { key: '7' });
    fireEvent.keyDown(window, { key: '8' });
    fireEvent.keyDown(window, { key: '9' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onScan).toHaveBeenCalledWith('789');
  });

  it('soumet automatiquement le buffer après le délai quand aucun Entrée n’arrive', () => {
    const onScan = vi.fn();

    render(<BarcodeScannerInput onScan={onScan} active={true} showInput={false} />);

    fireEvent.keyDown(window, { key: '4' });
    fireEvent.keyDown(window, { key: '5' });
    fireEvent.keyDown(window, { key: '6' });

    act(() => {
      vi.advanceTimersByTime(250);
    });

    expect(onScan).toHaveBeenCalledWith('456');
  });
});