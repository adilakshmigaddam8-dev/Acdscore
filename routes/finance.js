const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');
const { emi, sip, fd, rd, salary } = require('../controllers/financeController');

router.post(
  '/emi',
  optionalAuth,
  [
    body('loanAmount').isFloat({ min: 1 }).withMessage('Loan amount must be positive'),
    body('annualInterestRate').isFloat({ min: 0 }).withMessage('Interest rate required'),
    body('tenureMonths').isInt({ min: 1 }).withMessage('Tenure must be at least 1 month'),
  ],
  validate,
  emi
);

router.post(
  '/sip',
  optionalAuth,
  [
    body('monthlyInvestment').isFloat({ min: 1 }).withMessage('Monthly investment must be positive'),
    body('annualInterestRate').isFloat({ min: 0 }).withMessage('Interest rate required'),
    body('durationMonths').isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),
  ],
  validate,
  sip
);

router.post(
  '/fd',
  optionalAuth,
  [
    body('principal').isFloat({ min: 1 }).withMessage('Principal must be positive'),
    body('annualRate').isFloat({ min: 0 }).withMessage('Annual rate required'),
    body('years').isFloat({ min: 0.1 }).withMessage('Duration must be positive'),
  ],
  validate,
  fd
);

router.post(
  '/rd',
  optionalAuth,
  [
    body('monthlyDeposit').isFloat({ min: 1 }).withMessage('Monthly deposit must be positive'),
    body('annualRate').isFloat({ min: 0 }).withMessage('Annual rate required'),
    body('months').isInt({ min: 1 }).withMessage('Duration must be at least 1 month'),
  ],
  validate,
  rd
);

router.post(
  '/salary',
  optionalAuth,
  [body('annualCTC').isFloat({ min: 1 }).withMessage('Annual CTC must be positive')],
  validate,
  salary
);

module.exports = router;
