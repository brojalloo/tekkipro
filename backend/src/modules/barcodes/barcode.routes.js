// Routes Barcodes
const router = require('express').Router();
const { auth, adminOnly } = require('../../middleware/auth.middleware');
const {
  lookupByBarcode,
  getByProduit,
  addBarcode,
  removeBarcode,
} = require('./barcode.controller');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const {
  addBarcodeValidation,
  barcodeIdValidation,
  barcodeLookupValidation,
  produitBarcodeValidation,
} = require('./barcode.validation');

// Lookup rapide — tous les utilisateurs connectés peuvent scanner
router.get('/lookup/:code', auth, barcodeLookupValidation, handleValidationErrors, lookupByBarcode);

// Gestion des codes-barres d'un produit
router.get('/produit/:produitId', auth, produitBarcodeValidation, handleValidationErrors, getByProduit);
router.post('/produit/:produitId', auth, adminOnly, addBarcodeValidation, handleValidationErrors, addBarcode);
router.delete('/:id', auth, adminOnly, barcodeIdValidation, handleValidationErrors, removeBarcode);

module.exports = router;

