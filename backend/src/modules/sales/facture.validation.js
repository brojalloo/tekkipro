const { param } = require('express-validator');

const factureIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Identifiant vente invalide')
    .toInt(),
];

module.exports = { factureIdValidation };