const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');
const { createRecord, getAllRecords, getRecord, updateRecord, deleteRecord } = require('../controllers/academicController');

const recordValidation = [
  body('semester').isInt({ min: 1, max: 12 }).withMessage('Semester must be 1–12'),
  body('sgpa').isFloat({ min: 0, max: 10 }).withMessage('SGPA must be 0–10'),
];

router.use(protect);

router.post('/create', recordValidation, validate, createRecord);
router.get('/all', getAllRecords);
router.get('/:id', getRecord);
router.put('/update/:id', updateRecord);
router.delete('/delete/:id', deleteRecord);

module.exports = router;
