// Routes Statistiques
const router = require('express').Router();
const ctrl = require('./statistique.controller');
const { auth, adminOnly, requirePlan } = require('../../middleware/auth.middleware');

router.get('/dashboard', auth, ctrl.getDashboard);
router.get('/top-produits', auth, ctrl.getTopProduits);
router.get('/performance-employes', auth, adminOnly, requirePlan('PRO', 'BUSINESS'), ctrl.getPerformanceEmployes);
router.get('/ventes-par-jour', auth, ctrl.getVentesParJour);

module.exports = router;
