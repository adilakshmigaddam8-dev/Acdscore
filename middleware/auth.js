const { verifyToken } = require('../utils/jwt');
const User = require('../models/User');
const logger = require('../utils/logger');

// Protect routes – require valid JWT
const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
    }

    const decoded = verifyToken(token);
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired.' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token.' });
  }
};

// Optional auth – attach user if token present, but don't block
const optionalAuth = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (token) {
      const decoded = verifyToken(token);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (_) {}
  next();
};

// Admin-only access
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

module.exports = { protect, optionalAuth, adminOnly };
