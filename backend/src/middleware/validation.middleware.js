const { validationResult } = require('express-validator');

const inferValidationCode = (message) => {
  const normalized = String(message || '').toLowerCase();

  if (normalized.includes('requis') || normalized.includes('obligatoire')) {
    return 'REQUIRED_FIELD';
  }

  if (normalized.includes('identifiant')) {
    return 'INVALID_IDENTIFIER';
  }

  if (normalized.includes('format')) {
    return 'INVALID_FORMAT';
  }

  if (normalized.includes('caract') || normalized.includes('dépasser')) {
    return 'INVALID_LENGTH';
  }

  return 'INVALID_VALUE';
};

const formatValidationError = (error) => ({
  field: error.path,
  message: error.msg,
  location: error.location,
  code: inferValidationCode(error.msg),
});

const handleValidationErrors = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) {
    return next();
  }

  const errors = result.array({ onlyFirstError: true }).map(formatValidationError);

  return res.status(400).json({
    success: false,
    code: 'VALIDATION_ERROR',
    message: 'La requête contient des données invalides.',
    errorCount: errors.length,
    errors,
  });
};

module.exports = {
  formatValidationError,
  handleValidationErrors,
  inferValidationCode,
};