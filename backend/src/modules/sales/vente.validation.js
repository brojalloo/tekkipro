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

const optionalNonNegativeNumber = (builder, label) => builder.custom((value) => {
  if (isEmptyValue(value)) return true;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${label} invalide`);
  }
  return true;
});

const saleIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant vente invalide')
    .toInt(),
];

const createSaleValidation = [
  body('details')
    .isArray({ min: 1 })
    .withMessage('Au moins une ligne de vente est requise'),
  body('details.*.produitId')
    .isInt({ min: 1 })
    .withMessage('Identifiant produit invalide')
    .toInt(),
  body('details.*.quantite')
    .custom((value) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error('Quantité invalide');
      }
      return true;
    }),
  optionalPositiveInt(body('details.*.uniteVenteId'), 'Identifiant unité de vente'),
  optionalPositiveInt(body('clientId'), 'Identifiant client'),
  body('modePaiement')
    .optional({ values: 'falsy' })
    .trim()
    .toUpperCase()
    .isIn(['CASH', 'MOBILE_MONEY', 'CREDIT'])
    .withMessage('Mode de paiement invalide'),
  optionalNonNegativeNumber(body('montantPaye'), 'Le montant payé'),
];

const listSalesValidation = [
  query('dateDebut')
    .optional({ values: 'falsy' })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('dateDebut doit être au format AAAA-MM-JJ'),
  query('dateFin')
    .optional({ values: 'falsy' })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage('dateFin doit être au format AAAA-MM-JJ'),
  query('statut')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(['COMPLETEE', 'EN_CREDIT', 'ANNULEE'])
    .withMessage('Statut de vente invalide'),
  optionalPositiveInt(query('userId'), 'Identifiant utilisateur'),
  query('dateFin').custom((value, { req }) => {
    if (isEmptyValue(value) || isEmptyValue(req.query.dateDebut)) return true;
    if (String(value) < String(req.query.dateDebut)) {
      throw new Error('dateFin doit être postérieure ou égale à dateDebut');
    }
    return true;
  }),
];

module.exports = {
  createSaleValidation,
  listSalesValidation,
  saleIdValidation,
};