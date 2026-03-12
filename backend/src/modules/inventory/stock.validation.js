const { body, query, param } = require('express-validator');

const isEmptyValue = (value) => value === undefined || value === null || value === '';
const isIsoDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value));

const optionalPositiveInt = (builder, label) => builder.custom((value) => {
  if (isEmptyValue(value)) return true;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${label} invalide`);
  }
  return true;
});

const positiveNumberRule = (builder, label, { optional = false } = {}) => {
  const chain = optional ? builder.optional({ values: 'falsy' }) : builder;
  return chain.custom((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error(`${label} invalide`);
    }
    return true;
  });
};

const stockEntryValidation = [
  body('produitId')
    .isInt({ min: 1 })
    .withMessage('Identifiant produit invalide')
    .toInt(),
  positiveNumberRule(body('quantite'), 'Quantité'),
  positiveNumberRule(body('prixAchat'), 'Prix d’achat', { optional: true }),
  optionalPositiveInt(body('fournisseurId'), 'Fournisseur'),
  optionalPositiveInt(body('uniteVenteId'), 'Unité de vente'),
];

const stockHistoryValidation = [
  optionalPositiveInt(query('produitId'), 'Produit'),
  optionalPositiveInt(query('fournisseurId'), 'Fournisseur'),
  query('dateDebut')
    .optional({ values: 'falsy' })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('dateDebut doit être au format AAAA-MM-JJ'),
  query('dateFin')
    .optional({ values: 'falsy' })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('dateFin doit être au format AAAA-MM-JJ')
    .custom((value, { req }) => {
      if (isEmptyValue(value) || isEmptyValue(req.query.dateDebut)) return true;
      if (!isIsoDate(value) || !isIsoDate(req.query.dateDebut)) return true;
      if (String(value) < String(req.query.dateDebut)) {
        throw new Error('dateFin doit être postérieure ou égale à dateDebut');
      }
      return true;
    }),
];

const stockProductIdValidation = [
  param('id')
    .optional({ values: 'falsy' })
    .isInt({ min: 1 })
    .withMessage('Identifiant invalide')
    .toInt(),
];

module.exports = {
  stockEntryValidation,
  stockHistoryValidation,
  stockProductIdValidation,
};