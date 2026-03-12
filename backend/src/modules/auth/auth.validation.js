const { body, param } = require('express-validator');

const normalizePhone = (value) => {
  if (typeof value !== 'string') return value;
  return value.replace(/[\s.-]/g, '');
};

const phoneRule = (field, message = 'Numéro de téléphone invalide') => body(field)
  .optional({ values: 'falsy' })
  .trim()
  .customSanitizer(normalizePhone)
  .matches(/^\+?[0-9]{9,15}$/)
  .withMessage(message);

const nameRule = (field, label) => body(field)
  .trim()
  .isLength({ min: 2, max: 80 })
  .withMessage(`${label} doit contenir entre 2 et 80 caractères`);

const emailRule = (field = 'email') => body(field)
  .trim()
  .isEmail()
  .withMessage('Email invalide')
  .normalizeEmail();

const passwordRule = (field = 'password') => body(field)
  .isString()
  .withMessage('Mot de passe invalide')
  .isLength({ min: 8, max: 128 })
  .withMessage('Le mot de passe doit contenir entre 8 et 128 caractères');

const tokenRule = (field = 'token') => body(field)
  .trim()
  .isLength({ min: 64, max: 64 })
  .withMessage('Token invalide')
  .isHexadecimal()
  .withMessage('Token invalide');

const registerValidation = [
  body('nomBoutique')
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
  nameRule('nom', 'Le nom'),
  nameRule('prenom', 'Le prénom'),
  emailRule(),
  passwordRule(),
  phoneRule('telephone'),
];

const loginValidation = [
  emailRule(),
  body('password')
    .isString()
    .withMessage('Mot de passe invalide')
    .notEmpty()
    .withMessage('Mot de passe requis')
    .isLength({ max: 128 })
    .withMessage('Mot de passe invalide'),
];

const emailActionValidation = [emailRule()];

const verifyEmailValidation = [tokenRule()];

const resetPasswordValidation = [
  tokenRule(),
  passwordRule(),
];

const addEmployeeValidation = [
  nameRule('nom', 'Le nom'),
  nameRule('prenom', 'Le prénom'),
  emailRule(),
  passwordRule(),
  phoneRule('telephone'),
];

const toggleEmployeeValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant employé invalide')
    .toInt(),
];

module.exports = {
  addEmployeeValidation,
  emailActionValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
  toggleEmployeeValidation,
  verifyEmailValidation,
};