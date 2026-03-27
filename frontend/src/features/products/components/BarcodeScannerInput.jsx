// Composant de scan code-barres
// Compatible scanner USB, Bluetooth (mode clavier HID) et saisie manuelle
import { useEffect, useRef, useState } from 'react';

const SCAN_TIMEOUT_MS = 80; // Délai max entre chaque caractère du scanner (ms)
const MIN_BARCODE_LENGTH = 3;

/**
 * BarcodeScannerInput
 * @param {function} onScan - callback appelé avec le code-barres détecté
 * @param {boolean} active - activer/désactiver l'écoute
 * @param {boolean} showInput - afficher ou non le champ de saisie visible
 */
export default function BarcodeScannerInput({ onScan, active = true, showInput = false }) {
  const [manualCode, setManualCode] = useState('');
  const timerRef = useRef(null);
  const bufferRef = useRef('');

  useEffect(() => {
    if (!active) return;

    function handleKeyDown(e) {
      // Ignorer si focus dans un input/textarea sauf notre composant
      const tag = document.activeElement?.tagName?.toLowerCase();
      if ((tag === 'input' || tag === 'textarea') && !document.activeElement?.dataset?.scannerInput) {
        return;
      }

      if (e.key === 'Enter') {
        if (timerRef.current) clearTimeout(timerRef.current);
        const code = bufferRef.current.trim();
        if (code.length >= MIN_BARCODE_LENGTH) {
          onScan(code);
        }
        bufferRef.current = '';
        return;
      }

      if (e.key.length === 1) {
        // Réinitialiser le timer à chaque nouveau caractère
        if (timerRef.current) clearTimeout(timerRef.current);

        bufferRef.current += e.key;

        // Si pas d'Enter reçu dans le délai, on soumet quand même si code assez long
        timerRef.current = setTimeout(() => {
          const code = bufferRef.current.trim();
          if (code.length >= MIN_BARCODE_LENGTH) {
            onScan(code);
          }
          bufferRef.current = '';
        }, SCAN_TIMEOUT_MS * 3);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, onScan]);

  // Saisie manuelle
  function handleManualSubmit(e) {
    e.preventDefault();
    if (manualCode.trim().length >= MIN_BARCODE_LENGTH) {
      onScan(manualCode.trim());
      setManualCode('');
    }
  }

  if (!showInput) return null;

  return (
    <form onSubmit={handleManualSubmit} style={{ display: 'flex', gap: 8 }}>
      <input
        type="text"
        data-scanner-input="true"
        value={manualCode}
        onChange={(e) => setManualCode(e.target.value)}
        placeholder="Scanner ou saisir un code-barres…"
        style={{ flex: 1, padding: '8px 12px', borderRadius: 6, border: '1px solid #ccc' }}
        autoFocus
      />
      <button type="submit" style={{ padding: '8px 16px' }}>
        Rechercher
      </button>
    </form>
  );
}

