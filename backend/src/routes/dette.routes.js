// Routes Dettes
const router = require('express').Router();
const ctrl = require('../controllers/dette.controller');
const { auth } = require('../middleware/auth.middleware');

router.get('/', auth, ctrl.getAll);
router.post('/:id/rembourser', auth, ctrl.rembourser);

module.exports = router;
