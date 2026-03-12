const express = require('express');
const router = express.Router();
const { getPublicStats } = require('./publicStats.controller');
const { auth, adminOnly } = require('../../middleware/auth.middleware');

// Route désormais restreinte aux administrateurs authentifiés
router.get('/', auth, adminOnly, getPublicStats);

module.exports = router;
