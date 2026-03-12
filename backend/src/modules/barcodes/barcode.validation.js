const { body, param } = require('express-validator');

const normalizeBooleanLike = (value) => {
  if (typeof value === 'boolean') return String(value);
  if (typeof value === 'number') return value !== 0 ? 'true' : 'false';
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'on', 'yes', 'oui'].includes(normalized)) return 'true';
    if (['false', '0', 'off', 'no', 'non', ''].includes(normalized)) return 'false';
  }
  return value;
};

const isBooleanLike = (value) => ['true', 'false'].includes(normalizeBooleanLike(value));

const barcodeIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant code-barres invalide')
    .toInt(),
];

const barcodeLookupValidation = [
  param('code')
    .trim()
    .isLength({ min: 4, max: 128 })
    .withMessage('Code-barres invalide')
    .matches(/^[A-Za-z0-9_.\-]+$/)
    .withMessage('Code-barres invalide'),
];

const produitBarcodeValidation = [
  param('produitId')
    .isInt({ min: 1 })
    .withMessage('Identifiant produit invalide')
    .toInt(),
];

const addBarcodeValidation = [
  ...produitBarcodeValidation,
  body('barcode')
    .trim()
    .isLength({ min: 4, max: 128 })
    .withMessage('Code-barres invalide')
    .matches(/^[A-Za-z0-9_.\-]+$/)
    .withMessage('Code-barres invalide'),
  body('uniteId')
    .optional({ values: 'falsy', nullable: true })
    .isInt({ min: 1 })
    .withMessage('Identifiant unité invalide')
    .toInt(),
  body('isPrimary')
    .optional({ nullable: true })
    .custom((value) => isBooleanLike(value))
    .withMessage('Le statut principal est invalide')
    .customSanitizer(normalizeBooleanLike),
];

module.exports = {
  addBarcodeValidation,
  barcodeIdValidation,
  barcodeLookupValidation,
  produitBarcodeValidation,
};