import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, PermissionsAndroid, Platform } from 'react-native';

const SELECTED_PRINTER_KEY = 'tekkipro.selectedPrinter';
const THERMAL_PRINTER_SUPPORT_MESSAGE = 'L’impression thermique nécessite le build Android TekkiPro. Expo Go ne peut pas piloter l’imprimante Bluetooth.';

let thermalModule = null;
let thermalModuleError = null;

const prepareThermalNativeModules = () => {
  const bluetoothStateManager = NativeModules?.BluetoothStateManager;
  if (!bluetoothStateManager) return;
  if (typeof bluetoothStateManager.addListener !== 'function') {
    bluetoothStateManager.addListener = () => {};
  }
  if (typeof bluetoothStateManager.removeListeners !== 'function') {
    bluetoothStateManager.removeListeners = () => {};
  }
};

const getThermalBindings = () => {
  if (thermalModule) {
    return {
      ThermalPrinter: thermalModule?.ThermalPrinter,
      BluetoothStateManager: thermalModule?.BluetoothStateManager,
    };
  }

  if (thermalModuleError) {
    return {
      ThermalPrinter: null,
      BluetoothStateManager: null,
    };
  }

  try {
    prepareThermalNativeModules();
    thermalModule = require('@finan-me/react-native-thermal-printer');
  } catch (error) {
    thermalModuleError = error;
  }

  return {
    ThermalPrinter: thermalModule?.ThermalPrinter,
    BluetoothStateManager: thermalModule?.BluetoothStateManager,
  };
};

const parseJson = (value, fallback) => {
  try { return JSON.parse(value); } catch { return fallback; }
};

const parseJsonOrValue = (value, fallback) => {
  if (value == null) return fallback;
  return typeof value === 'string' ? parseJson(value, fallback) : value;
};

const uniquePrinters = (devices = []) => {
  const map = new Map();
  devices.forEach((device) => {
    const printer = normalizePrinter(device);
    if (printer?.address) map.set(printer.address, printer);
  });
  return Array.from(map.values());
};

export function ensureThermalPrintingAvailable() {
  const { ThermalPrinter, BluetoothStateManager } = getThermalBindings();
  if (!ThermalPrinter || !BluetoothStateManager) {
    throw new Error(THERMAL_PRINTER_SUPPORT_MESSAGE);
  }
  return { ThermalPrinter, BluetoothStateManager };
}

export function normalizePrinter(device) {
  const rawAddress = String(device?.rawAddress || device?.address || '').trim();
  const hasProtocol = rawAddress.startsWith('bt:') || rawAddress.startsWith('ble:') || rawAddress.startsWith('lan:');
  const protocol = device?.deviceType === 'ble' ? 'ble' : 'bt';

  return {
    name: String(device?.name || 'Imprimante thermique').trim() || 'Imprimante thermique',
    deviceType: device?.deviceType || (hasProtocol ? rawAddress.split(':')[0] : 'bt'),
    rawAddress: hasProtocol ? rawAddress.split(':').slice(1).join(':') : rawAddress,
    address: hasProtocol ? rawAddress : (rawAddress ? `${protocol}:${rawAddress}` : ''),
  };
}

export async function getSavedPrinter() {
  const raw = await AsyncStorage.getItem(SELECTED_PRINTER_KEY);
  return raw ? normalizePrinter(parseJson(raw, {})) : null;
}

export async function saveSelectedPrinter(printer) {
  if (!printer) {
    await AsyncStorage.removeItem(SELECTED_PRINTER_KEY);
    return null;
  }

  const normalized = normalizePrinter(printer);
  await AsyncStorage.setItem(SELECTED_PRINTER_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function requestBluetoothPermissions() {
  const { BluetoothStateManager } = ensureThermalPrintingAvailable();

  if (Platform.OS !== 'android') {
    throw new Error('L’impression Bluetooth thermique est actuellement configurée pour Android.');
  }

  if (Platform.Version >= 31) {
    const result = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
    ]);

    const granted = Object.values(result).every((value) => value === PermissionsAndroid.RESULTS.GRANTED);
    if (!granted) throw new Error('Autorise l’accès Bluetooth / appareils à proximité pour rechercher l’imprimante.');
  } else {
    const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error('Autorise la localisation pour détecter les imprimantes Bluetooth sur cet Android.');
    }
  }

  const state = await BluetoothStateManager.getState();
  if (state !== 'PoweredOn') {
    try {
      await BluetoothStateManager.enable();
    } catch {
      throw new Error('Active le Bluetooth pour rechercher et imprimer les tickets.');
    }
  }

  return true;
}

export async function scanBluetoothPrinters(timeoutMs = 12000) {
  const { ThermalPrinter } = ensureThermalPrintingAvailable();
  await requestBluetoothPermissions();

  return new Promise(async (resolve, reject) => {
    let paired = [];
    let found = [];
    let done = false;
    let timeoutId = null;
    const subscriptions = [];

    const cleanup = async () => {
      subscriptions.forEach((subscription) => {
        try { ThermalPrinter.removeDiscoveryEventListener(subscription); } catch {}
      });
      if (timeoutId) clearTimeout(timeoutId);
      try { await ThermalPrinter.stopScanDevices(); } catch {}
    };

    const finish = async () => {
      if (done) return;
      done = true;
      await cleanup();
      resolve({ paired: uniquePrinters(paired), found: uniquePrinters(found), printers: uniquePrinters([...paired, ...found]) });
    };

    const fail = async (message) => {
      if (done) return;
      done = true;
      await cleanup();
      reject(new Error(message));
    };

    subscriptions.push(
      ThermalPrinter.addDiscoveryEventListener(ThermalPrinter.EVENT_DEVICE_ALREADY_PAIRED, (data) => {
        paired = parseJsonOrValue(data?.devices, []);
      })
    );
    subscriptions.push(
      ThermalPrinter.addDiscoveryEventListener(ThermalPrinter.EVENT_DEVICE_FOUND, (data) => {
        const device = parseJsonOrValue(data?.device, null);
        if (device) found = uniquePrinters([...found, device]);
      })
    );
    subscriptions.push(
      ThermalPrinter.addDiscoveryEventListener(ThermalPrinter.EVENT_DEVICE_DISCOVER_DONE, (data) => {
        paired = parseJsonOrValue(data?.paired, paired);
        found = parseJsonOrValue(data?.found, found);
        finish();
      })
    );
    subscriptions.push(
      ThermalPrinter.addDiscoveryEventListener(ThermalPrinter.EVENT_BLUETOOTH_NOT_SUPPORT, () => {
        fail('Le Bluetooth n’est pas supporté sur cet appareil Android.');
      })
    );

    timeoutId = setTimeout(() => finish(), timeoutMs);

    try {
      const result = await ThermalPrinter.scanDevices();
      if (!result?.success) {
        if (paired.length || found.length) {
          await finish();
        } else {
          await fail(result?.error || 'Impossible de démarrer la recherche Bluetooth.');
        }
      }
    } catch (error) {
      if (paired.length || found.length) {
        await finish();
      } else {
        await fail(error.message || 'Erreur pendant la recherche des imprimantes.');
      }
    }
  });
}

export async function testPrinterConnection(printer) {
  const { ThermalPrinter } = ensureThermalPrintingAvailable();
  const target = normalizePrinter(printer);
  if (target.address.startsWith('bt:') || target.address.startsWith('ble:')) {
    await requestBluetoothPermissions();
  }
  return ThermalPrinter.testConnection(target.address);
}

const formatMoney = (value) => `${Number(value || 0).toLocaleString('fr-FR')} FCFA`;
const formatPerson = (person) => [person?.prenom, person?.nom].filter(Boolean).join(' ').trim() || person?.nom || 'Client de passage';
const paymentLabel = (value) => ({ CASH: 'Espèces', MOBILE_MONEY: 'Mobile Money', CREDIT: 'Crédit' }[value] || value || '—');
const formatDateTime = (value) => new Date(value || Date.now()).toLocaleString('fr-FR');
const compactText = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const hasRealClient = (client) => !!(client?.nom || client?.prenom || client?.telephone);
const hasBoutiqueInfo = (boutique) => boutique && typeof boutique === 'object';

const buildBoutiqueHeader = (boutique) => {
  const name = compactText(hasBoutiqueInfo(boutique) ? boutique?.nom : boutique) || 'TekkiPro';
  const lines = [{ type: 'text', content: name.toUpperCase(), style: { align: 'center', bold: true, size: 2 } }];

  const extraLines = [boutique?.adresse, boutique?.telephone ? `Tél : ${boutique.telephone}` : null, boutique?.email]
    .map(compactText)
    .filter(Boolean);

  extraLines.forEach((line) => {
    lines.push({ type: 'text', content: line, style: { align: 'center' } });
  });

  return lines;
};

const buildSaleItemBlocks = (details = []) => details.flatMap((detail, index) => {
  const quantity = Number(detail?.quantite || 0).toLocaleString('fr-FR');
  const unitName = compactText(detail?.uniteNom || detail?.produit?.uniteBase || 'u');
  const unitPrice = formatMoney(detail?.prixUnitaire || 0);
  const subTotal = formatMoney(detail?.sousTotal || 0);

  return [
    { type: 'text', content: compactText(detail?.produit?.nom || 'Produit'), style: { bold: true } },
    {
      type: 'columns',
      columns: [
        { content: `${quantity} ${unitName} x ${unitPrice}`, width: 64 },
        { content: subTotal, width: 36, align: 'right', style: { bold: true } },
      ],
    },
    ...(index < details.length - 1 ? [{ type: 'line' }] : []),
  ];
});

export async function printSaleReceipt({ printer, boutique, vente, paperWidthMm = 58 }) {
  const { ThermalPrinter } = ensureThermalPrintingAvailable();

  const target = normalizePrinter(printer);
  if (!target.address) throw new Error('Aucune imprimante thermique sélectionnée.');
  if (target.address.startsWith('bt:') || target.address.startsWith('ble:')) {
    await requestBluetoothPermissions();
  }

  const reste = Math.max(0, Number(vente?.dette?.montantRestant || Number(vente?.montantTotal || 0) - Number(vente?.montantPaye || 0)));
  const boutiqueHeader = buildBoutiqueHeader(boutique);
  const itemBlocks = buildSaleItemBlocks(vente?.details || []);
  const clientLabel = hasRealClient(vente?.client) ? formatPerson(vente?.client) : 'Client de passage';
  const sellerLabel = compactText(formatPerson(vente?.user));

  return ThermalPrinter.printReceipt({
    printers: [{ address: target.address, options: { paperWidthMm, encoding: 'utf8', marginMm: 1 } }],
    documents: [[
      ...boutiqueHeader,
      { type: 'text', content: 'TICKET DE CAISSE', style: { align: 'center', bold: true } },
      { type: 'text', content: `N° ${compactText(vente?.numero || '-')}`, style: { align: 'center', bold: true } },
      { type: 'text', content: formatDateTime(vente?.createdAt), style: { align: 'center' } },
      { type: 'line', style: 'double' },
      { type: 'text', content: `Client : ${clientLabel}` },
      ...(vente?.client?.telephone ? [{ type: 'text', content: `Tél. client : ${compactText(vente.client.telephone)}` }] : []),
      { type: 'text', content: `Paiement : ${paymentLabel(vente?.modePaiement)}` },
      { type: 'text', content: `Vendeur : ${sellerLabel}` },
      { type: 'line' },
      { type: 'text', content: 'ARTICLES', style: { bold: true } },
      ...(itemBlocks.length ? itemBlocks : [{ type: 'text', content: 'Aucun article' }]),
      { type: 'line' },
      { type: 'columns', columns: [{ content: 'TOTAL', width: 60, style: { bold: true } }, { content: formatMoney(vente?.montantTotal || 0), width: 40, align: 'right', style: { bold: true } }] },
      { type: 'columns', columns: [{ content: 'PAYÉ', width: 60 }, { content: formatMoney(vente?.montantPaye || 0), width: 40, align: 'right' }] },
      { type: 'columns', columns: [{ content: 'RESTE', width: 60, style: reste > 0 ? { bold: true } : undefined }, { content: formatMoney(reste), width: 40, align: 'right', style: reste > 0 ? { bold: true } : undefined }] },
      { type: 'line', style: 'double' },
      reste > 0
        ? { type: 'text', content: 'Paiement partiel / vente à crédit.', style: { align: 'center', bold: true } }
        : { type: 'text', content: 'Paiement soldé.', style: { align: 'center', bold: true } },
      { type: 'feed', lines: 1 },
      { type: 'text', content: 'Merci pour votre achat !', style: { align: 'center', bold: true } },
      { type: 'text', content: 'À bientôt chez nous.', style: { align: 'center' } },
      { type: 'feed', lines: 2 },
      { type: 'text', content: 'Ticket généré par TekkiPro', style: { align: 'center' } },
      { type: 'feed', lines: 3 },
      { type: 'cut' },
    ]],
  });
}

export { THERMAL_PRINTER_SUPPORT_MESSAGE };