const { body, param } = require('express-validator');

const normalizePhone = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s.-]/g, '');
};

const fournisseurIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant fournisseur invalide')
    .toInt(),
];

const baseSupplierRules = [
  body('nom')
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Le nom du fournisseur est obligatoire et doit contenir au plus 120 caractères'),
  body('telephone')
    .optional({ values: 'falsy', nullable: true })
    .trim()
    .customSanitizer(normalizePhone)
    .matches(/^\+?[0-9]{9,15}$/)
    .withMessage('Numéro de téléphone invalide'),
  body('adresse')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 255 })
    .withMessage('L’adresse ne peut pas dépasser 255 caractères'),
  body('email')
    .optional({ values: 'falsy', nullable: true })
    .trim()
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
];

const createSupplierValidation = baseSupplierRules;
const updateSupplierValidation = [...fournisseurIdValidation, ...baseSupplierRules];

module.exports = {
  createSupplierValidation,
  fournisseurIdValidation,
  updateSupplierValidation,
};