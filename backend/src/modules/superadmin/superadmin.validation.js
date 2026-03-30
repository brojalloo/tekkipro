const { param, body, query } = require('express-validator');
const { handleValidationErrors } = require('../../middleware/validation.middleware');

const validateBoutiqueId = [
  param('id').isInt({ min: 1 }).withMessage('ID boutique invalide'),
  handleValidationErrors,
];

const validateChangePlan = [
  param('id').isInt({ min: 1 }).withMessage('ID boutique invalide'),
  body('plan').isIn(['GRATUIT', 'PRO', 'BUSINESS']).withMessage('Plan invalide'),
  body('dateFin').optional().isISO8601().withMessage('Date de fin invalide'),
  body('montant').optional().isFloat({ min: 0 }).withMessage('Montant invalide'),
  handleValidationErrors,
];

const validateCreateAdmin = [
  body('prenom').trim().notEmpty().withMessage("Prénom requis"),
  body('nom').trim().notEmpty().withMessage('Nom requis'),
  body('email').isEmail().normalizeEmail().withMessage('Email invalide'),
  body('password').notEmpty().withMessage('Mot de passe requis'),
  handleValidationErrors,
];

const validateAuditLogsQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit invalide'),
  query('boutiqueId').optional().isInt({ min: 1 }).withMessage('boutiqueId invalide'),
  query('action').optional().isIn(['CREATE', 'UPDATE', 'DELETE', 'CANCEL', 'STOCK_ADJUST']).withMessage('Action invalide'),
  query('from').optional().isISO8601().withMessage('Date from invalide'),
  query('to').optional().isISO8601().withMessage('Date to invalide'),
  handleValidationErrors,
];

const validateBoutiquesQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page invalide'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('Limit invalide'),
  query('plan').optional().isIn(['GRATUIT', 'PRO', 'BUSINESS']).withMessage('Plan invalide'),
  query('statut').optional().isIn(['ACTIVE', 'SUSPENDUE']).withMessage('Statut invalide'),
  handleValidationErrors,
];

module.exports = { validateBoutiqueId, validateChangePlan, validateCreateAdmin, validateAuditLogsQuery, validateBoutiquesQuery };
