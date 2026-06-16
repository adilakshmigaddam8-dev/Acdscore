const User = require('../models/User');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../utils/jwt');
const { sendOTPEmail, sendWelcomeEmail } = require('../utils/email');
const logger = require('../utils/logger');

// Helper – generate 6-digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({ name, email, password });

    const token = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token
    await User.findByIdAndUpdate(user._id, { refreshToken });

    // Welcome email (non-blocking)
    sendWelcomeEmail(email, name).catch(() => {});

    logger.info(`New user registered: ${email}`);

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    const token = generateToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    user.lastLogin = new Date();
    user.loginCount += 1;
    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    logger.info(`User logged in: ${email}`);

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/auth/profile
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/refresh-token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;
    if (!token) {
      return res.status(401).json({ success: false, message: 'Refresh token required.' });
    }

    const decoded = verifyRefreshToken(token);
    const user = await User.findById(decoded.id).select('+refreshToken');

    if (!user || user.refreshToken !== token) {
      return res.status(401).json({ success: false, message: 'Invalid refresh token.' });
    }

    const newToken = generateToken(user._id, user.role);
    const newRefreshToken = generateRefreshToken(user._id);

    await User.findByIdAndUpdate(user._id, { refreshToken: newRefreshToken });

    res.json({ success: true, token: newToken, refreshToken: newRefreshToken });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Security: don't reveal if email exists
      return res.json({ success: true, message: 'If that email exists, an OTP has been sent.' });
    }

    const otp = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await User.findByIdAndUpdate(user._id, { otp: { code: otp, expiresAt } });
    await sendOTPEmail(email, user.name, otp);

    logger.info(`OTP sent for password reset: ${email}`);
    res.json({ success: true, message: 'OTP sent to your email.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/reset-password
const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email }).select('+otp');
    if (!user || !user.otp || !user.otp.code) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
    }

    if (user.otp.code !== otp) {
      return res.status(400).json({ success: false, message: 'Incorrect OTP.' });
    }

    if (new Date() > user.otp.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP has expired.' });
    }

    user.password = newPassword;
    user.otp = undefined;
    await user.save();

    logger.info(`Password reset successful: ${email}`);
    res.json({ success: true, message: 'Password reset successfully.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login, getProfile, refreshToken, forgotPassword, resetPassword, logout };
