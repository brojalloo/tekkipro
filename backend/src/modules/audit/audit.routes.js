// Routes Audit — admin uniquement
const router = require('express').Router();
const ctrl = require('./audit.controller');
const { auth, adminOnly } = require('../../middleware/auth.middleware');

router.get('/', auth, adminOnly, ctrl.getAuditLogs);

module.exports = router;
