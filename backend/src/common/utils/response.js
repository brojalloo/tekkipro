// Helpers pour les réponses API standardisées

const DEFAULT_ERROR_CODES = Object.freeze({
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
});

function getDefaultErrorCode(statusCode = 500) {
  return DEFAULT_ERROR_CODES[statusCode] || 'INTERNAL_ERROR';
}

function buildErrorPayload(message, statusCode = 500, options = {}) {
  const { code = getDefaultErrorCode(statusCode), details, ...extra } = options;
  const payload = { success: false, code, message };

  if (details !== undefined) {
    payload.details = details;
  }

  return Object.assign(payload, extra);
}

function success(res, data, statusCode = 200, message = null) {
  const payload = { success: true };
  if (message) payload.message = message;
  if (data !== undefined && data !== null) payload.data = data;
  return res.status(statusCode).json(payload);
}

function created(res, data, message = 'Créé avec succès') {
  return success(res, data, 201, message);
}

function error(res, message, statusCode = 500, options = {}) {
  return res.status(statusCode).json(buildErrorPayload(message, statusCode, options));
}

function notFound(res, message = 'Ressource introuvable', options = {}) {
  return error(res, message, 404, options);
}

function unauthorized(res, message = 'Non autorisé', options = {}) {
  return error(res, message, 401, options);
}

function forbidden(res, message = 'Accès refusé', options = {}) {
  return error(res, message, 403, options);
}

function badRequest(res, message = 'Données invalides', options = {}) {
  return error(res, message, 400, options);
}

function conflict(res, message = 'Conflit sur la ressource', options = {}) {
  return error(res, message, 409, options);
}

function tooManyRequests(res, message = 'Trop de requêtes', options = {}) {
  return error(res, message, 429, options);
}

function serviceUnavailable(res, message = 'Service indisponible', options = {}) {
  return error(res, message, 503, options);
}

module.exports = {
  badRequest,
  buildErrorPayload,
  conflict,
  created,
  error,
  forbidden,
  getDefaultErrorCode,
  notFound,
  serviceUnavailable,
  success,
  tooManyRequests,
  unauthorized,
};

