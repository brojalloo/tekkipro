// Routes Clients
const router = require('express').Router();
const ctrl = require('./client.controller');
const { auth, checkPlanClients } = require('../../middleware/auth.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const {
  clientIdValidation,
  createClientValidation,
  listClientsValidation,
  updateClientValidation,
} = require('./client.validation');
const { attachQuotaHeaders } = require('../../middleware/quota.middleware');

router.get('/', auth, listClientsValidation, handleValidationErrors, ctrl.getAll);
router.get('/:id', auth, clientIdValidation, handleValidationErrors, ctrl.getById);
router.post('/', auth, checkPlanClients, createClientValidation, handleValidationErrors, ctrl.create, attachQuotaHeaders('Clients'));
router.put('/:id', auth, updateClientValidation, handleValidationErrors, ctrl.update);
router.delete('/:id', auth, clientIdValidation, handleValidationErrors, ctrl.remove);

module.exports = router;
