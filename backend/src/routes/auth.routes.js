// Routes Authentification
const router = require('express').Router();
const { register, login, getMe, addEmployee, getEmployees, toggleEmployee, verifyEmail, resendVerification, forgotPassword, resetPassword } = require('../controllers/auth.controller');
const { auth, adminOnly, checkPlanUtilisateurs } = require('../middleware/auth.middleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-email', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', auth, getMe);
router.post('/employees', auth, adminOnly, checkPlanUtilisateurs, addEmployee);
router.get('/employees', auth, adminOnly, getEmployees);
router.patch('/employees/:id/toggle', auth, adminOnly, toggleEmployee);

module.exports = router;
