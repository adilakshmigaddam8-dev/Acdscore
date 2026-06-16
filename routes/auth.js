const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const {
  register, login, getProfile, refreshToken,
  forgotPassword, resetPassword, logout,
} = require('../controllers/authController');

router.post(
  '/register',
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2, max: 100 }),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  validate,
  register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  login
);

router.get('/profile', protect, getProfile);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);

router.post(
  '/forgot-password',
  [body('email').isEmail().normalizeEmail()],
  validate,
  forgotPassword
);

router.post(
  '/reset-password',
  [
    body('email').isEmail().normalizeEmail(),
    body('otp').notEmpty().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  resetPassword
);

module.exports = router;
