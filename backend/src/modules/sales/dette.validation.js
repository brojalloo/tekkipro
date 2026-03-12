const { body, param, query } = require('express-validator');

const isEmptyValue = (value) => value === undefined || value === null || value === '';

const optionalPositiveInt = (builder, label) => builder.custom((value) => {
  if (isEmptyValue(value)) return true;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} invalide`);
  }
  return true;
});

const detteIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant dette invalide')
    .toInt(),
];

const listDettesValidation = [
  query('statut')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(['EN_COURS', 'PAYEE'])
    .withMessage('Statut de dette invalide'),
  optionalPositiveInt(query('clientId'), 'Identifiant client'),
];

const rembourserDetteValidation = [
  ...detteIdValidation,
  body('montant')
    .custom((value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Montant invalide');
      }
      return true;
    }),
];

module.exports = {
  detteIdValidation,
  listDettesValidation,
  rembourserDetteValidation,
};