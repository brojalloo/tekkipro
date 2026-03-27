import { DAY_IN_MS } from './constants';

export const formatCFA = (value, locale) => `${(value || 0).toLocaleString(locale)} FCFA`;

export const formatClientName = (client, fallback) => [client?.prenom, client?.nom].filter(Boolean).join(' ').trim() || client?.nom || fallback;

export const formatStockHuman = (stock, uniteBase, unitesVente = []) => {
  const numericStock = Number(stock || 0);
  if (!unitesVente.length) return `${numericStock} ${uniteBase || 'u'}`;

  const defaultUnit = unitesVente.find((unit) => unit.estDefaut) || unitesVente[0];
  const factor = Number(defaultUnit?.facteurConversion || 0);

  if (!factor) return `${numericStock} ${uniteBase || 'u'}`;

  const displayQty = numericStock / factor;
  const normalizedQty = Number.isInteger(displayQty) ? displayQty : Number(displayQty.toFixed(2));
  return `${normalizedQty} ${defaultUnit.nom}`;
};

export const parseDateOnly = (value) => {
  if (!value) return null;
  const normalized = String(value).trim().slice(0, 10);
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

  return parsed;
};

export const formatDateLabel = (value, locale) => {
  const parsed = parseDateOnly(value);
  if (!parsed) return '';

  return parsed.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const getExpirationInfo = (produit, locale) => {
  const parsedDate = parseDateOnly(produit?.datePeremption);
  if (!parsedDate) return null;

  const today = new Date();
  const referenceDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 12, 0, 0));
  const rawDaysRemaining = Number(produit?.joursAvantPeremption);
  const daysRemaining = Number.isFinite(rawDaysRemaining)
    ? rawDaysRemaining
    : Math.round((parsedDate.getTime() - referenceDate.getTime()) / DAY_IN_MS);
  const threshold = Number.isFinite(Number(produit?.alertePeremptionJours))
    ? Number(produit.alertePeremptionJours)
    : 30;
  const isExpired = produit?.estExpire === true || daysRemaining < 0;
  const isSoon = !isExpired && (produit?.enAlertePeremption === true || daysRemaining <= threshold);

  return {
    dateLabel: formatDateLabel(produit.datePeremption, locale),
    daysRemaining,
    isExpired,
    isSoon,
  };
};

export const getExpirationBadge = (produit, text, locale) => {
  const expirationInfo = getExpirationInfo(produit, locale);
  if (!expirationInfo || (!expirationInfo.isExpired && !expirationInfo.isSoon)) return null;

  if (expirationInfo.isExpired) {
    return {
      ...expirationInfo,
      icon: 'alert-octagon',
      title: text.expiredProductTitle,
      label: text.expiredProductBadge(expirationInfo.dateLabel, Math.abs(expirationInfo.daysRemaining)),
    };
  }

  return {
    ...expirationInfo,
    icon: 'alert-triangle',
    title: text.expirationSoonTitle,
    label: text.expirationSoonBadge(expirationInfo.dateLabel, expirationInfo.daysRemaining),
  };
};

export const getExpirationAlert = (produit, text, locale) => {
  const expirationBadge = getExpirationBadge(produit, text, locale);
  if (!expirationBadge) return null;

  return {
    title: expirationBadge.title,
    message: expirationBadge.isExpired
      ? text.expiredProductMessage(produit.nom, expirationBadge.dateLabel, Math.abs(expirationBadge.daysRemaining))
      : text.expirationSoonMessage(produit.nom, expirationBadge.dateLabel, expirationBadge.daysRemaining),
  };
};

export const buildCartKey = (produitId, uniteVenteId = null) => `${produitId}:${uniteVenteId || 'base'}`;

export const getPreferredUnit = (produit, uniteId = null) => {
  if (!produit?.unitesVente?.length) return null;
  if (uniteId) {
    const fromBarcode = produit.unitesVente.find((unit) => unit.id === Number(uniteId));
    if (fromBarcode) return fromBarcode;
  }
  return produit.unitesVente.find((unit) => unit.estDefaut) || produit.unitesVente[0] || null;
};

export const getCartItemMaxQty = (item) => {
  const stockDispo = Number(item.stockDispo || 0);
  const factor = Number(item.facteurConversion || 1);
  if (factor <= 0) return 0;
  return Math.floor(stockDispo / factor);
};

export const filterVentesByPeriod = (ventes, period) => {
  const now = new Date();
  return ventes.filter((v) => {
    const d = new Date(v.createdAt);
    if (period === 'TODAY') {
      return d.getFullYear() === now.getFullYear()
        && d.getMonth() === now.getMonth()
        && d.getDate() === now.getDate();
    }
    if (period === 'WEEK') {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return d >= startOfWeek;
    }
    if (period === 'MONTH') {
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }
    return true;
  });
};
