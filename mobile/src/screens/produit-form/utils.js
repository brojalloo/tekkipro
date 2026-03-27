import { COMMERCIAL_FLOWS } from './constants';

export const buildInitialForm = (codeBarre = '') => ({
  nom: '',
  description: '',
  codeBarre,
  datePeremption: '',
  alertePeremptionJours: '',
  prixVente: '',
  prixAchat: '',
  stock: '0',
  stockAlerte: '0',
  uniteBase: 'piece',
  categorieId: '',
  fournisseurId: '',
  commercialMode: '',
  commercialSize: '',
  commercialCount: '',
  prixVenteConditionnement: '',
  prixAchatConditionnement: '',
  prixVenteDetail: '',
});

export const toNumber = (value) => {
  const normalized = String(value ?? '').replace(',', '.').trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const toOptionalNumber = (value) => {
  const normalized = String(value ?? '').replace(',', '.').trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? undefined : parsed;
};

export const toOptionalInt = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

export const toFieldValue = (value, digits = 4) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '';
  return Number.isInteger(parsed) ? String(parsed) : String(Number(parsed.toFixed(digits)));
};

export const getCommercialFactor = (mode, size) => {
  const parsedSize = toOptionalNumber(size);
  if (!COMMERCIAL_FLOWS[mode] || !parsedSize || parsedSize <= 0) return 0;
  return mode === 'carton' ? parsedSize : parsedSize * 1000;
};

export const formatQuantity = (value, locale, digits = 2) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return '0';
  if (Number.isInteger(parsed)) return parsed.toLocaleString(locale);
  return parsed.toLocaleString(locale, { minimumFractionDigits: 0, maximumFractionDigits: digits });
};

export const normalizeDateInput = (value) => {
  const digits = String(value ?? '').replace(/[^0-9]/g, '').slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
};

export const parseDateInput = (value) => {
  const normalized = String(value ?? '').trim();
  const match = normalized.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return normalized;
};

export const toDateInputValue = (value) => {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }

  const normalized = String(value).trim();
  return normalized.length >= 10 ? normalized.slice(0, 10) : normalizeDateInput(normalized);
};

export const formatPickerDateValue = (value) => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) return '';
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const buildPickerDate = (value) => {
  const normalized = parseDateInput(toDateInputValue(value));
  if (!normalized) {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
  }

  const [year, month, day] = normalized.split('-').map(Number);
  return new Date(year, month - 1, day, 12, 0, 0, 0);
};

export const buildCalendarDays = (monthDate) => {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1, 12, 0, 0, 0).getDay();
  const offset = (firstDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0, 12, 0, 0, 0).getDate();
  const items = [];

  for (let index = 0; index < offset; index += 1) items.push(null);

  for (let day = 1; day <= daysInMonth; day += 1) {
    items.push(new Date(year, month, day, 12, 0, 0, 0));
  }

  while (items.length % 7 !== 0) items.push(null);
  return items;
};

export const buildClampedCalendarDate = (year, month, day) => {
  const maxDay = new Date(year, month + 1, 0, 12, 0, 0, 0).getDate();
  return new Date(year, month, Math.min(day, maxDay), 12, 0, 0, 0);
};

export const formatDateLabel = (value, locale) => {
  const normalized = parseDateInput(toDateInputValue(value));
  if (!normalized) return '';
  return new Date(`${normalized}T12:00:00.000Z`).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const prepareExpirationForSubmit = ({ datePeremption, alertePeremptionJours }) => {
  const rawDate = String(datePeremption ?? '').trim();
  const rawAlert = String(alertePeremptionJours ?? '').trim();
  const normalizedDate = parseDateInput(rawDate);

  if (!rawDate && !rawAlert) {
    return { datePeremption: null, alertePeremptionJours: null };
  }

  if (!rawDate && rawAlert) {
    return { error: 'DATE_REQUIRED' };
  }

  if (!normalizedDate) {
    return { error: 'INVALID_DATE' };
  }

  if (rawAlert && !/^[0-9]+$/.test(rawAlert)) {
    return { error: 'INVALID_ALERT_DAYS' };
  }

  return {
    datePeremption: normalizedDate,
    alertePeremptionJours: rawAlert ? Number(rawAlert) : undefined,
  };
};

export const buildExpirationPreview = (datePeremption, alertePeremptionJours, locale) => {
  const normalizedDate = parseDateInput(datePeremption);
  if (!normalizedDate) return null;

  const rawAlert = String(alertePeremptionJours ?? '').trim();
  const threshold = rawAlert && /^[0-9]+$/.test(rawAlert) ? Number(rawAlert) : 30;
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  const target = new Date(`${normalizedDate}T12:00:00.000Z`);
  const daysRemaining = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

  return {
    dateLabel: formatDateLabel(normalizedDate, locale),
    daysRemaining,
    isExpired: daysRemaining < 0,
    isSoon: daysRemaining >= 0 && daysRemaining <= threshold,
  };
};

export const detectCommercialMode = (produit) => {
  const defaultUnit = produit?.unitesVente?.find((item) => item.estDefaut) || produit?.unitesVente?.[0];
  const unitName = String(defaultUnit?.nom || '').trim();
  const patterns = {
    poids: /^Sac\s+([0-9]+(?:[.,][0-9]+)?)\s*kg$/i,
    volume: /^Bidon\s+([0-9]+(?:[.,][0-9]+)?)\s*l$/i,
    carton: /^Carton\s+([0-9]+(?:[.,][0-9]+)?)\s*unit[ée]s?$/i,
  };

  const entry = Object.entries(patterns).find(([, pattern]) => pattern.test(unitName));
  if (!entry || !defaultUnit?.facteurConversion) return null;

  const match = unitName.match(entry[1]);
  const size = toOptionalNumber(match?.[1]);
  if (!size) return null;

  return { mode: entry[0], size, defaultUnit };
};

export const buildFormFromProduit = (produit) => {
  const detectedMode = detectCommercialMode(produit);
  const baseForm = buildInitialForm(produit?.codeBarre || '');
  const expirationFields = {
    datePeremption: toDateInputValue(produit?.datePeremption),
    alertePeremptionJours: produit?.alertePeremptionJours != null ? String(produit.alertePeremptionJours) : '',
  };

  if (detectedMode?.mode && detectedMode.size) {
    const { mode, size, defaultUnit } = detectedMode;
    const factor = Number(defaultUnit.facteurConversion || 1);
    const detailUnit = (produit?.unitesVente || []).find((item) => !item.estDefaut && Number(item.facteurConversion) === 1);

    return {
      ...baseForm,
      ...expirationFields,
      nom: produit?.nom || '',
      description: produit?.description || '',
      categorieId: produit?.categorieId ? String(produit.categorieId) : '',
      fournisseurId: produit?.fournisseurId ? String(produit.fournisseurId) : '',
      uniteBase: produit?.uniteBase || COMMERCIAL_FLOWS[mode].uniteBase,
      commercialMode: mode,
      commercialSize: toFieldValue(size, 2),
      commercialCount: toFieldValue(Number(produit?.stock || 0) / factor, 2),
      stockAlerte: toFieldValue(Number(produit?.stockAlerte || 0) / factor, 2),
      prixVenteConditionnement: toFieldValue(defaultUnit?.prix ?? Number(produit?.prixVente || 0) * factor, 2),
      prixAchatConditionnement: toFieldValue(defaultUnit?.prixAchat ?? Number(produit?.prixAchat || 0) * factor, 2),
      prixVenteDetail: mode === 'carton' && detailUnit?.prix != null ? toFieldValue(detailUnit.prix, 2) : '',
    };
  }

  return {
    ...baseForm,
    ...expirationFields,
    nom: produit?.nom || '',
    description: produit?.description || '',
    prixVente: toFieldValue(produit?.prixVente, 2),
    prixAchat: toFieldValue(produit?.prixAchat, 2),
    stock: toFieldValue(produit?.stock, 2),
    stockAlerte: toFieldValue(produit?.stockAlerte, 2),
    uniteBase: produit?.uniteBase || 'piece',
    categorieId: produit?.categorieId ? String(produit.categorieId) : '',
    fournisseurId: produit?.fournisseurId ? String(produit.fournisseurId) : '',
  };
};

export const buildUnitRowsFromProduit = (produit) => (produit?.unitesVente || []).map((unit) => ({
  id: unit.id,
  nom: unit.nom || '',
  facteurConversion: toFieldValue(unit.facteurConversion, 4),
  prix: toFieldValue(unit.prix, 2),
  prixAchat: toFieldValue(unit.prixAchat, 2),
  estDefaut: Boolean(unit.estDefaut),
  isNew: false,
}));

export const isUnitRowBlank = (unit) => !String(unit?.nom || '').trim()
  && !String(unit?.facteurConversion || '').trim()
  && !String(unit?.prix || '').trim();

export const prepareManualUnitsForSubmit = (rows = []) => {
  let hasIncompleteRow = false;
  const validUnits = [];

  rows.forEach((unit) => {
    if (isUnitRowBlank(unit)) return;

    const nom = String(unit?.nom || '').trim();
    const facteurConversion = toOptionalNumber(unit?.facteurConversion);
    const prix = toOptionalNumber(unit?.prix);
    const prixAchat = toOptionalNumber(unit?.prixAchat);

    if (!nom || !Number.isFinite(facteurConversion) || facteurConversion <= 0 || prix === undefined || prix < 0) {
      hasIncompleteRow = true;
      return;
    }

    validUnits.push({
      id: unit?.id,
      isNew: Boolean(unit?.isNew),
      nom,
      facteurConversion,
      prix,
      prixAchat,
      estDefaut: Boolean(unit?.estDefaut),
    });
  });

  if (validUnits.length > 0 && !validUnits.some((unit) => unit.estDefaut)) {
    validUnits[0].estDefaut = true;
  }

  return { hasIncompleteRow, units: validUnits };
};

export const buildStockEquivalenceLines = (stockBase, uniteBase, units, locale) => {
  const numericStock = Number(stockBase || 0);
  if (!Number.isFinite(numericStock) || numericStock <= 0) return [];

  return units
    .map((unit) => {
      const factor = Number(unit?.facteurConversion || 0);
      if (!factor) return null;
      const qty = numericStock / factor;
      if (!Number.isFinite(qty) || qty <= 0) return null;
      return `${formatQuantity(qty, locale)} ${unit.nom}`;
    })
    .filter(Boolean);
};
