const CODE_MESSAGE_MAPS = Object.freeze({
  fr: Object.freeze({
    AUTH_REQUIRED: 'Votre session a expiré. Reconnectez-vous.',
    INVALID_TOKEN: 'Votre session n\u2019est plus valide. Reconnectez-vous.',
    USER_INACTIVE_OR_MISSING: 'Votre compte n\u2019est plus actif.',
    INVALID_CREDENTIALS: 'Email ou mot de passe incorrect.',
    ACCOUNT_DISABLED: 'Votre compte est désactivé.',
    BOUTIQUE_SUSPENDED: 'Cette boutique est suspendue. Contactez le support.',
    BOUTIQUE_INACTIVE: 'Cette boutique est suspendue. Contactez le support.',
    SESSION_INVALIDATED: 'Votre session a été déconnectée. Reconnectez-vous.',
    EMAIL_NOT_VERIFIED: 'Veuillez vérifier votre email avant de vous connecter.',
    EMAIL_REQUIRED: 'Email requis.',
    EMAIL_ALREADY_USED: 'Cet email est déjà utilisé.',
    EMAIL_ALREADY_VERIFIED: 'Cet email est déjà vérifié.',
    BOUTIQUE_SLUG_TAKEN: 'Ce nom de boutique est déjà pris.',
    VERIFICATION_TOKEN_REQUIRED: 'Lien de vérification invalide.',
    INVALID_VERIFICATION_TOKEN: 'Le lien de vérification est invalide ou expiré.',
    INVALID_RESET_TOKEN: 'Le lien de réinitialisation est invalide ou expiré.',
    RESET_PASSWORD_FIELDS_REQUIRED: 'Le lien de réinitialisation est invalide.',
    WEAK_PASSWORD: 'Le mot de passe doit contenir au moins 8 caractères, avec une minuscule, une majuscule, un chiffre et un caractère spécial.',
    SALE_ALREADY_CANCELLED: 'Cette vente est déjà annulée.',
    ADMIN_ONLY: 'Accès réservé aux administrateurs.',
    LAST_ADMIN_PROTECTION: 'Impossible de désactiver le seul administrateur actif.',
    PLAN_UPGRADE_REQUIRED: 'Cette fonctionnalité nécessite un plan supérieur.',
  }),
  en: Object.freeze({
    AUTH_REQUIRED: 'Your session has expired. Please sign in again.',
    INVALID_TOKEN: 'Your session is no longer valid. Please sign in again.',
    USER_INACTIVE_OR_MISSING: 'This account is no longer active.',
    INVALID_CREDENTIALS: 'Incorrect email or password.',
    ACCOUNT_DISABLED: 'Your account is disabled.',
    BOUTIQUE_SUSPENDED: 'This store is suspended. Please contact support.',
    BOUTIQUE_INACTIVE: 'This store is suspended. Please contact support.',
    EMAIL_NOT_VERIFIED: 'Please verify your email before signing in.',
    EMAIL_REQUIRED: 'Email is required.',
    EMAIL_ALREADY_USED: 'This email is already in use.',
    EMAIL_ALREADY_VERIFIED: 'This email is already verified.',
    BOUTIQUE_SLUG_TAKEN: 'This store name is already taken.',
    VERIFICATION_TOKEN_REQUIRED: 'Invalid verification link.',
    INVALID_VERIFICATION_TOKEN: 'The verification link is invalid or expired.',
    INVALID_RESET_TOKEN: 'The reset link is invalid or expired.',
    RESET_PASSWORD_FIELDS_REQUIRED: 'The reset link is invalid.',
    WEAK_PASSWORD: 'The password must contain at least 8 characters, including a lowercase letter, an uppercase letter, a number, and a special character.',
    SALE_ALREADY_CANCELLED: 'This sale is already cancelled.',
    ADMIN_ONLY: 'Access restricted to administrators.',
    LAST_ADMIN_PROTECTION: 'Cannot disable the only active administrator.',
    PLAN_UPGRADE_REQUIRED: 'This feature requires a higher plan.',
  }),
});

const DEFAULT_MESSAGES = Object.freeze({
  fr: Object.freeze({
    fallback: 'Une erreur est survenue.',
    network: 'Connexion au serveur impossible. Vérifiez votre connexion.',
  }),
  en: Object.freeze({
    fallback: 'Something went wrong.',
    network: 'Unable to reach the server. Please check your connection.',
  }),
});

const VALIDATION_SUMMARY_LABELS = Object.freeze({
  fr: Object.freeze({ singular: 'autre erreur', plural: 'autres erreurs' }),
  en: Object.freeze({ singular: 'other error', plural: 'other errors' }),
});

const SESSION_ERROR_CODES = new Set([
  'AUTH_REQUIRED',
  'INVALID_TOKEN',
  'USER_INACTIVE_OR_MISSING',
  'UNAUTHORIZED',
  'BOUTIQUE_INACTIVE',
  'BOUTIQUE_SUSPENDED',
  'SESSION_INVALIDATED',
]);

function resolveLanguage(language) {
  return language === 'en' ? 'en' : 'fr';
}

export function getApiErrorPayload(error) {
  return error?.response?.data || error?.apiError?.payload || null;
}

export function getApiErrorStatus(error) {
  return error?.response?.status || error?.apiError?.status || null;
}

export function getApiErrorCode(error) {
  return getApiErrorPayload(error)?.code || error?.apiError?.code || null;
}

export function isUpgradeRequiredError(error) {
  const payload = getApiErrorPayload(error);
  return getApiErrorCode(error) === 'PLAN_UPGRADE_REQUIRED' || payload?.upgrade === true;
}

export function shouldClearAuthSession(error) {
  const code = getApiErrorCode(error);
  const status = getApiErrorStatus(error);

  if (code) {
    return SESSION_ERROR_CODES.has(code);
  }

  return status === 401;
}

function getValidationMessage(payload, language) {
  const firstError = payload?.errors?.[0];

  if (!firstError?.message) {
    return payload?.message;
  }

  if ((payload?.errorCount || payload?.errors?.length || 0) <= 1) {
    return firstError.message;
  }

  const count = (payload.errorCount || payload.errors.length) - 1;
  const labels = VALIDATION_SUMMARY_LABELS[language];
  return `${firstError.message} (+${count} ${count > 1 ? labels.plural : labels.singular})`;
}

export function getApiErrorMessage(error, options = {}) {
  const language = resolveLanguage(options.language);
  const fallback = options.fallback || DEFAULT_MESSAGES[language].fallback;
  const networkFallback = options.networkFallback || DEFAULT_MESSAGES[language].network;
  const payload = getApiErrorPayload(error);
  const status = getApiErrorStatus(error);
  const code = payload?.code;

  let message;

  if (!payload) {
    message = error?.message && !String(error.message).startsWith('Request failed with status code')
      ? error.message
      : networkFallback;
  } else if (code === 'VALIDATION_ERROR') {
    message = getValidationMessage(payload, language) || fallback;
  } else {
    message = CODE_MESSAGE_MAPS[language][code] || payload?.message || fallback;
  }

  if (options.includeStatus && status) {
    return `[${status}] ${message}`;
  }

  return message;
}

export function normalizeApiError(error, options = {}) {
  return {
    code: getApiErrorCode(error),
    status: getApiErrorStatus(error),
    message: getApiErrorMessage(error, options),
    upgrade: isUpgradeRequiredError(error),
    payload: getApiErrorPayload(error),
  };
}

export function createApiErrorFromPayload(payload, status = null) {
  const error = new Error(payload?.message || DEFAULT_MESSAGES.fr.fallback);
  error.response = { status, data: payload };
  error.apiError = normalizeApiError(error);
  return error;
}
