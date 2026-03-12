const { body, param } = require('express-validator');

const normalizePhone = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s.-]/g, '');
};

const optionalTrimmedMax = (field, max, message) => body(field)
  .optional({ nullable: true })
  .trim()
  .custom((value) => value === '' || String(value).length <= max)
  .withMessage(message);

const boutiqueIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant boutique invalide')
    .toInt(),
];

const updateBoutiqueValidation = [
  optionalTrimmedMax('nom', 120, 'Le nom de la boutique ne peut pas dépasser 120 caractères'),
  optionalTrimmedMax('adresse', 255, 'L’adresse ne peut pas dépasser 255 caractères'),
  body('telephone')
    .optional({ nullable: true })
    .trim()
    .custom((value) => value === '' || /^\+?[0-9]{9,15}$/.test(normalizePhone(value)))
    .withMessage('Numéro de téléphone invalide')
    .customSanitizer((value) => {
      if (typeof value !== 'string') return value;
      return value.trim() === '' ? '' : normalizePhone(value);
    }),
  body('email')
    .optional({ nullable: true })
    .trim()
    .custom((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    .withMessage('Email invalide')
    .customSanitizer((value) => (typeof value === 'string' && value.trim() !== '' ? value.trim().toLowerCase() : value)),
  body('devise')
    .optional({ nullable: true })
    .trim()
    .custom((value) => value === '' || /^[A-Za-z]{2,10}$/.test(value))
    .withMessage('Devise invalide')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
  body('ninea')
    .optional({ nullable: true })
    .trim()
    .custom((value) => value === '' || /^[A-Za-z0-9-]{5,30}$/.test(value))
    .withMessage('NINEA invalide')
    .customSanitizer((value) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
];

const createBoutiqueValidation = [
  body('nom')
    .trim()
    .isLength({ min: 2, max: 120 })
    .withMessage('Le nom de la boutique doit contenir entre 2 et 120 caractères'),
  body('slug')
    .trim()
    .toLowerCase()
    .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .withMessage('Le slug ne doit contenir que des lettres minuscules, chiffres et tirets')
    .isLength({ min: 3, max: 60 })
    .withMessage('Le slug doit contenir entre 3 et 60 caractères'),
  optionalTrimmedMax('adresse', 255, 'L’adresse ne peut pas dépasser 255 caractères'),
  body('telephone')
    .optional({ nullable: true })
    .trim()
    .custom((value) => value === '' || /^\+?[0-9]{9,15}$/.test(normalizePhone(value)))
    .withMessage('Numéro de téléphone invalide')
    .customSanitizer((value) => (typeof value === 'string' && value.trim() !== '' ? normalizePhone(value) : value)),
  body('email')
    .optional({ nullable: true })
    .trim()
    .custom((value) => value === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
    .withMessage('Email invalide')
    .customSanitizer((value) => (typeof value === 'string' && value.trim() !== '' ? value.trim().toLowerCase() : value)),
];

module.exports = {
  boutiqueIdValidation,
  createBoutiqueValidation,
  updateBoutiqueValidation,
};