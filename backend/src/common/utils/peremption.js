const DEFAULT_PEREMPTION_ALERT_DAYS = 30;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

const hasValue = (value) => value !== undefined && value !== null && value !== '';

const toDateOnly = (value) => {
  if (!value) return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate(), 12, 0, 0));
  }

  const normalized = String(value).trim();
  const match = normalized.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})/);
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

const normalizePeremptionPayload = (payload = {}, current = {}) => {
  const hasDate = Object.prototype.hasOwnProperty.call(payload, 'datePeremption');
  const hasAlert = Object.prototype.hasOwnProperty.call(payload, 'alertePeremptionJours');

  if (!hasDate && !hasAlert) {
    return { data: {} };
  }

  const rawDate = hasDate ? payload.datePeremption : current.datePeremption;
  if (rawDate === '' || rawDate === null) {
    return { data: { datePeremption: null, alertePeremptionJours: null } };
  }

  if (!rawDate) {
    const rawAlert = hasAlert ? payload.alertePeremptionJours : current.alertePeremptionJours;
    if (hasValue(rawAlert)) {
      return { error: 'Renseignez une date de péremption avant de définir une alerte.' };
    }

    return { data: { datePeremption: null, alertePeremptionJours: null } };
  }

  const parsedDate = toDateOnly(rawDate);
  if (!parsedDate) {
    return { error: 'La date de péremption doit être au format AAAA-MM-JJ.' };
  }

  const rawAlert = hasAlert ? payload.alertePeremptionJours : current.alertePeremptionJours;
  if (!hasValue(rawAlert)) {
    return {
      data: {
        datePeremption: parsedDate,
        alertePeremptionJours: DEFAULT_PEREMPTION_ALERT_DAYS,
      },
    };
  }

  const parsedAlert = Number.parseInt(rawAlert, 10);
  if (!Number.isInteger(parsedAlert) || parsedAlert < 0) {
    return { error: 'Le seuil d’alerte de péremption doit être un nombre positif ou nul.' };
  }

  return {
    data: {
      datePeremption: parsedDate,
      alertePeremptionJours: parsedAlert,
    },
  };
};

const getPeremptionStatus = (produit, now = new Date()) => {
  const datePeremption = toDateOnly(produit?.datePeremption);
  if (!datePeremption) {
    return {
      joursAvantPeremption: null,
      estExpire: false,
      enAlertePeremption: false,
      statutPeremption: null,
    };
  }

  const referenceDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0));
  const joursAvantPeremption = Math.round((datePeremption.getTime() - referenceDate.getTime()) / DAY_IN_MS);
  const alertePeremptionJours = Number.isInteger(Number(produit?.alertePeremptionJours))
    ? Number(produit.alertePeremptionJours)
    : DEFAULT_PEREMPTION_ALERT_DAYS;
  const estExpire = joursAvantPeremption < 0;
  const enAlertePeremption = !estExpire && joursAvantPeremption <= alertePeremptionJours;

  return {
    joursAvantPeremption,
    estExpire,
    enAlertePeremption,
    statutPeremption: estExpire ? 'EXPIRE' : (enAlertePeremption ? 'BIENTOT' : 'OK'),
  };
};

const hasPeremptionAlert = (produit, now) => {
  const status = getPeremptionStatus(produit, now);
  return status.estExpire || status.enAlertePeremption;
};

module.exports = {
  DEFAULT_PEREMPTION_ALERT_DAYS,
  normalizePeremptionPayload,
  getPeremptionStatus,
  hasPeremptionAlert,
};