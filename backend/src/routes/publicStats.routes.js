const express = require('express');
const router = express.Router();
const { getPublicStats } = require('../controllers/publicStats.controller');

// Route publique — pas d'auth
router.get('/', getPublicStats);

module.exports = router;
