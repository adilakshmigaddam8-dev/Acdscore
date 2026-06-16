const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getDashboard, getUsers, deleteUser, getCalculations } = require('../controllers/adminController');

router.use(protect, adminOnly);

router.get('/dashboard', getDashboard);
router.get('/users', getUsers);
router.delete('/users/:id', deleteUser);
router.get('/calculations', getCalculations);

module.exports = router;
