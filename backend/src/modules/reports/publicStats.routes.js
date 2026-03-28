const express = require('express');
const router = express.Router();
const { getPublicStats } = require('./publicStats.controller');
// Route publique — pas d'auth requise (landing page)
router.get('/', getPublicStats);

module.exports = router;
