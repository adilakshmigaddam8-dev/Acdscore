const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { optionalAuth, protect } = require('../middleware/auth');
const { sgpa, cgpa, cgpaToPercentage, percentageToCGPA, attendance, history } = require('../controllers/calculatorController');

// Calculators are public (optionalAuth saves userId if logged in)
router.post(
  '/sgpa',
  optionalAuth,
  [body('subjects').isArray({ min: 1 }).withMessage('At least 1 subject required')],
  validate,
  sgpa
);

router.post(
  '/cgpa',
  optionalAuth,
  [body('semesters').isArray({ min: 1 }).withMessage('At least 1 semester required')],
  validate,
  cgpa
);

router.post(
  '/cgpa-to-percentage',
  optionalAuth,
  [body('cgpa').isFloat({ min: 0, max: 10 }).withMessage('CGPA must be 0–10')],
  validate,
  cgpaToPercentage
);

router.post(
  '/percentage-to-cgpa',
  optionalAuth,
  [body('percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be 0–100')],
  validate,
  percentageToCGPA
);

router.post(
  '/attendance',
  optionalAuth,
  [
    body('totalClasses').isInt({ min: 1 }).withMessage('Total classes must be at least 1'),
    body('attendedClasses').isInt({ min: 0 }).withMessage('Attended classes must be 0 or more'),
  ],
  validate,
  attendance
);

// History requires auth
router.get('/history', protect, history);

module.exports = router;
