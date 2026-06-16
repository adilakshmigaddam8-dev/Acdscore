const express = require('express');
const router = express.Router();
const { optionalAuth, protect, adminOnly } = require('../middleware/auth');
const { track, overview } = require('../controllers/analyticsController');

router.post('/track', optionalAuth, track);
router.get('/overview', protect, adminOnly, overview);

module.exports = router;
