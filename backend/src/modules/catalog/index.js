const express = require('express');
const router = express.Router();

const produitRoutes = require('./produit.routes');
const categorieRoutes = require('./categorie.routes');

router.use('/produits', produitRoutes);
router.use('/categories', categorieRoutes);

module.exports = router;

