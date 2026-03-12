// Classe d'erreur métier standard
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR', options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = options.details;
    this.expose = options.expose ?? statusCode < 500;
    this.meta = options.meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Ressource introuvable', code = 'NOT_FOUND', options = {}) {
    super(message, 404, code, options);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Non autorisé', code = 'UNAUTHORIZED', options = {}) {
    super(message, 401, code, options);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Accès refusé', code = 'FORBIDDEN', options = {}) {
    super(message, 403, code, options);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Données invalides', code = 'BAD_REQUEST', options = {}) {
    super(message, 400, code, options);
  }
}

class ConflictError extends AppError {
  constructor(message = 'Conflit sur la ressource', code = 'CONFLICT', options = {}) {
    super(message, 409, code, options);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = 'Trop de requêtes', code = 'RATE_LIMITED', options = {}) {
    super(message, 429, code, options);
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service indisponible', code = 'SERVICE_UNAVAILABLE', options = {}) {
    super(message, 503, code, options);
  }
}

module.exports = {
  AppError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ServiceUnavailableError,
  TooManyRequestsError,
  UnauthorizedError,
  ValidationError,
};

