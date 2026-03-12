// Routes Authentification
const router = require('express').Router();
const { register, login, getMe, addEmployee, getEmployees, toggleEmployee, verifyEmail, resendVerification, forgotPassword, resetPassword } = require('./auth.controller');
const { auth, adminOnly, checkPlanUtilisateurs } = require('../../middleware/auth.middleware');
const { authRateLimiter, passwordResetRateLimiter } = require('../../middleware/security.middleware');
const { handleValidationErrors } = require('../../middleware/validation.middleware');
const {
  addEmployeeValidation,
  emailActionValidation,
  loginValidation,
  registerValidation,
  resetPasswordValidation,
  toggleEmployeeValidation,
  verifyEmailValidation,
} = require('./auth.validation');

router.post('/register', authRateLimiter, registerValidation, handleValidationErrors, register);
router.post('/login', authRateLimiter, loginValidation, handleValidationErrors, login);
router.post('/verify-email', authRateLimiter, verifyEmailValidation, handleValidationErrors, verifyEmail);
router.post('/resend-verification', authRateLimiter, emailActionValidation, handleValidationErrors, resendVerification);
router.post('/forgot-password', passwordResetRateLimiter, emailActionValidation, handleValidationErrors, forgotPassword);
router.post('/reset-password', passwordResetRateLimiter, resetPasswordValidation, handleValidationErrors, resetPassword);
router.get('/me', auth, getMe);
router.post('/employees', auth, adminOnly, checkPlanUtilisateurs, addEmployeeValidation, handleValidationErrors, addEmployee);
router.get('/employees', auth, adminOnly, getEmployees);
router.patch('/employees/:id/toggle', auth, adminOnly, toggleEmployeeValidation, handleValidationErrors, toggleEmployee);

module.exports = router;
