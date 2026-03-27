// TekkiPro — Normalisation et helpers pour les erreurs API

// ── Messages mappés par code métier ─────────────────────────────────────
const CODE_MESSAGES = {
  // Auth
  INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
  EMAIL_REQUIRED: 'Email requis.',
  INVALID_VERIFICATION_TOKEN: 'Le lien de vérification est invalide ou expiré.',
  INVALID_RESET_TOKEN: 'Le lien de réinitialisation est invalide ou expiré.',
  INVALID_TOKEN: 'Votre session n\u2019est plus valide. Reconnectez-vous.',
  TOKEN_EXPIRED: 'Votre session n\u2019est plus valide. Reconnectez-vous.',
  SESSION_EXPIRED: 'Votre session n\u2019est plus valide. Reconnectez-vous.',
  UNAUTHORIZED: 'Accès non autorisé.',
  // Compte
  EMAIL_ALREADY_EXISTS: 'Un compte avec cet email existe déjà.',
  USER_NOT_FOUND: 'Utilisateur introuvable.',
  ACCOUNT_DISABLED: 'Ce compte a été désactivé.',
  EMAIL_NOT_VERIFIED: 'Veuillez vérifier votre email avant de vous connecter.',
  // Abonnement
  PLAN_UPGRADE_REQUIRED: 'Cette fonctionnalité nécessite un abonnement supérieur.',
  // Général
  VALIDATION_ERROR: null, // géré dynamiquement
  NOT_FOUND: 'Ressource introuvable.',
  FORBIDDEN: 'Vous n\u2019avez pas les droits pour cette action.',
  INTERNAL_ERROR: 'Une erreur interne est survenue. Réessayez.',
};

// ── Codes qui nécessitent de vider la session ────────────────────────────
const AUTH_CLEAR_CODES = new Set([
  'INVALID_TOKEN',
  'TOKEN_EXPIRED',
  'SESSION_EXPIRED',
]);

// ── Helpers ──────────────────────────────────────────────────────────────

/**
 * Retourne le code métier de l'erreur API, ou null.
 */
export function getApiErrorCode(error) {
  return error?.response?.data?.code ?? null;
}

/**
 * Retourne le message UI à afficher pour une erreur API.
 *
 * Options :
 *   - fallback  {string}  Message affiché si rien d'autre ne correspond
 *   - includeStatus {boolean} Préfixe le message par [status]
 */
export function getApiErrorMessage(error, { fallback = 'Une erreur est survenue.', includeStatus = false } = {}) {
  const data = error?.response?.data ?? {};
  const status = error?.response?.status;
  const code = data.code;

  let message = null;

  // 1. Code connu avec message statique
  if (code && CODE_MESSAGES[code] !== undefined && CODE_MESSAGES[code] !== null) {
    message = CODE_MESSAGES[code];
  }

  // 2. Erreur de validation — on remonte le premier champ
  if (!message && code === 'VALIDATION_ERROR' && Array.isArray(data.errors) && data.errors.length > 0) {
    const first = data.errors[0].message;
    const rest = data.errors.length - 1;
    message = rest > 0 ? `${first} (+${rest} autre${rest > 1 ? 's' : ''} erreur${rest > 1 ? 's' : ''})` : first;
  }

  // 3. Message serveur brut (on s'assure qu'il se termine par un point)
  if (!message && data.message) {
    const raw = data.message.trim();
    message = raw.endsWith('.') ? raw : `${raw}.`;
  }

  // 4. Fallback
  if (!message) message = fallback;

  return includeStatus && status ? `[${status}] ${message}` : message;
}

/**
 * Détecte si l'erreur est une demande d'upgrade de plan.
 */
export function isUpgradeRequiredError(error) {
  const data = error?.response?.data ?? {};
  return data.code === 'PLAN_UPGRADE_REQUIRED' || data.upgrade === true;
}

/**
 * Indique si l'erreur doit provoquer une déconnexion forcée.
 */
export function shouldClearAuthSession(error) {
  const code = getApiErrorCode(error);
  return code !== null && AUTH_CLEAR_CODES.has(code);
}

/**
 * Retourne un objet normalisé attaché à error.apiError dans l'interceptor.
 */
export function normalizeApiError(error) {
  const code = getApiErrorCode(error);
  const message = getApiErrorMessage(error);
  const status = error?.response?.status ?? null;
  const isUpgrade = isUpgradeRequiredError(error);
  const needsReauth = shouldClearAuthSession(error);

  return { code, message, status, isUpgrade, needsReauth };
}
