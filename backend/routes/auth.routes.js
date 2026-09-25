const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login, logout, forgotPassword, resetPassword, getMe, updateFCMToken, getPublicDepartments } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { authRateLimiter } = require('../middleware/rateLimiter');

// Validation rules
const registerRules = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
];
const loginRules = [
  body('email').isEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password is required'),
];

router.get('/departments', getPublicDepartments);
router.post('/register', authRateLimiter, registerRules, validate, register);
router.post('/login', authRateLimiter, loginRules, validate, login);
router.post('/logout', protect, logout);
router.post('/forgot-password', authRateLimiter, [body('email').isEmail()], validate, forgotPassword);
router.put('/reset-password/:token', [body('password').isLength({ min: 6 })], validate, resetPassword);
router.get('/me', protect, getMe);
router.put('/update-fcm-token', protect, [body('fcmToken').notEmpty()], validate, updateFCMToken);

module.exports = router;
