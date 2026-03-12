const { body, query, param } = require('express-validator');

const normalizePhone = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s.-]/g, '');
};

const clientIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant client invalide')
    .toInt(),
];

const listClientsValidation = [
  query('search')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Le terme de recherche est trop long'),
];

const baseClientRules = [
  body('nom')
    .trim()
    .isLength({ min: 1, max: 120 })
    .withMessage('Le nom du client est obligatoire et doit contenir au plus 120 caractères'),
  body('prenom')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 120 })
    .withMessage('Le prénom ne peut pas dépasser 120 caractères'),
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
];

const createClientValidation = baseClientRules;
const updateClientValidation = [...clientIdValidation, ...baseClientRules];

module.exports = {
  clientIdValidation,
  createClientValidation,
  listClientsValidation,
  updateClientValidation,
};