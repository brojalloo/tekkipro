const express = require('express');
const router = express.Router();

const venteRoutes = require('./vente.routes');
const factureRoutes = require('./facture.routes');
const detteRoutes = require('./dette.routes');

router.use('/ventes', venteRoutes);
router.use('/factures', factureRoutes);
router.use('/dettes', detteRoutes);

module.exports = router;

