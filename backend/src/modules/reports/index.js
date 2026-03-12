const express = require('express');
const router = express.Router();

const statistiqueRoutes = require('./statistique.routes');
const publicStatsRoutes = require('./publicStats.routes');

router.use('/statistiques', statistiqueRoutes);
router.use('/public-stats', publicStatsRoutes);

module.exports = router;

