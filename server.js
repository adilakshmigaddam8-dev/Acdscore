/**
 * server.js – AcadScore Backend
 *
 * NOTE ON CSP: Content Security Policy is disabled below
 * (contentSecurityPolicy: false) so that the same-origin main.js,
 * Chart.js from jsdelivr, and Google Fonts all load without CSP
 * violations in development. If you re-enable CSP later, scriptSrc
 * needs 'self' (for main.js), connectSrc needs 'self' (for /api/*
 * fetch calls), and styleSrc/fontSrc need fonts.googleapis.com /
 * fonts.gstatic.com. crossOriginEmbedderPolicy should stay disabled
 * too, since the CDN/font resources don't send a CORP header.
 */

'use strict';

require('dotenv').config();
require('express-async-errors');

const express       = require('express');
const helmet        = require('helmet');
const cors          = require('cors');
const morgan        = require('morgan');
const rateLimit     = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const compression   = require('compression');
const hpp           = require('hpp');
const path          = require('path');
const fs            = require('fs');
const { Resend }    = require('resend');

const connectDB  = require('./config/db');
const logger     = require('./utils/logger');
const { errorHandler, notFound } = require('./middleware/errorHandler');


// ── Route imports ────────────────────────────────────────────────────────────
const authRoutes       = require('./routes/auth');
const academicRoutes   = require('./routes/academic');
const calculatorRoutes = require('./routes/calculator');
const financeRoutes    = require('./routes/finance');
const reportRoutes     = require('./routes/reports');
const adminRoutes      = require('./routes/admin');
const analyticsRoutes  = require('./routes/analytics');

// ── Connect to MongoDB ───────────────────────────────────────────────────────
connectDB();

const app = express();

// ── Rate Limiters (declared before use) ─────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 200,
  message:  { success: false, message: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: 'Too many auth attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders:   false,
});

// ── Security: Helmet ─────────────────────────────────────────────────────────
//
// CSP is disabled (see note above) so same-origin scripts, the Chart.js CDN,
// and Google Fonts all load without violations.
const isDev = process.env.NODE_ENV !== 'production';

app.use(
  helmet({
    contentSecurityPolicy: false
  })
);

// ── Other Security Middleware ────────────────────────────────────────────────
app.use(mongoSanitize()); // NoSQL injection prevention
app.use(hpp());           // HTTP parameter pollution prevention

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
  'https://acdscore.vercel.app',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // Allow Postman/curl (no origin) and whitelisted browser origins
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    logger.warn(`CORS blocked for origin: ${origin}`);
    return cb(null, false);
  },
  credentials: true,
  methods:     ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Body Parsing + Compression ───────────────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── HTTP Request Logging ─────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
  }));
}

// ── General Rate Limiter ──────────────────────────────────────────────────────
app.use(generalLimiter);

// ── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    success:     true,
    status:      'OK',
    timestamp:   new Date().toISOString(),
    uptime:      Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    version:     '1.0.0',
  });
});

// ── API Info ──────────────────────────────────────────────────────────────────
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'AcadScore API v1.0',
    endpoints: {
      auth:       '/api/auth',
      academic:   '/api/academic',
      calculator: '/api/calculator',
      finance:    '/api/finance',
      reports:    '/api/reports',
      admin:      '/api/admin',
      analytics:  '/api/analytics',
    },
  });
});

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',       authLimiter, authRoutes);
app.use('/api/academic',   academicRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/finance',    financeRoutes);
app.use('/api/reports',    reportRoutes);
app.use('/api/admin',      adminRoutes);
app.use('/api/analytics',  analyticsRoutes);

// ── Contact Route ─────────────────────────────────────────────────────────────
const resend = new Resend(process.env.RESEND_API_KEY);

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }

  try {
    console.log("Contact API called");
    console.log("RESEND_API_KEY exists:", !!process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      // 'onboarding@resend.dev' works immediately with no domain setup.
      // Once you verify your own domain in Resend, switch this to something
      // like 'AcadScore Contact Form <contact@yourdomain.com>'.
      from: 'AcadScore Contact Form <onboarding@resend.dev>',
      to: process.env.EMAIL_USER,
      replyTo: "myraofficial057@gmail.com",
      subject: `New contact form message from ${name}`,
      html: `
        <h3>Contact Form Submission</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b> ${message}</p>
      `,
    });

    if (error) {
      logger.error(`Contact form email error: ${error.message}`);
      return res.status(500).json({
        success: false,
        message: 'Failed to send email. Please try again later.',
      });
    }

    console.log("Email sent, id:", data?.id);
    res.status(200).json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    logger.error(`Contact form email error: ${error.message}`);
    res.status(500).json({
      success: false,
      message: 'Failed to send email. Please try again later.',
    });
  }
});

// ── Static Files ─────────────────────────────────────────────────────────────
// Serves index.html, main.js, and any other frontend assets from public/
// MUST be after all API routes so /api/* paths are never caught by static.
const PUBLIC_DIR = path.join(__dirname, 'public');

app.use(express.static(PUBLIC_DIR, {
  // BUG-F: serve with correct MIME types; Express does this by default but
  // explicitly setting etag and cache headers avoids stale file issues in dev.
  maxAge: isDev ? 0 : '1d',
  etag:   true,
  // Ensure .js files get 'application/javascript' not 'text/plain'
  // (Express sets this correctly by default based on extension)
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
    if (isDev) {
      // No caching in dev so changes to main.js are picked up immediately
      res.setHeader('Cache-Control', 'no-store');
    }
  },
}));

// ── SPA Fallback ─────────────────────────────────────────────────────────────
// Sends index.html for any non-API path (client-side routing support).
// /api/* paths fall through to the notFound handler below.
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  const indexFile = path.join(PUBLIC_DIR, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) next(err);
  });
});

// ── 404 + Error Handlers (must be last) ──────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start Server ─────────────────────────────────────────────────────────────
const PORT   = parseInt(process.env.PORT, 10) || 5000;
const server = app.listen(PORT, () => {
  logger.info(`✅  AcadScore running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  logger.info(`    Health : http://localhost:${PORT}/health`);
  logger.info(`    API    : http://localhost:${PORT}/api`);
  logger.info(`    App    : http://localhost:${PORT}/`);

  // BUG-F: Warn at startup if index.html is not in public/
  if (!fs.existsSync(path.join(PUBLIC_DIR, 'index.html'))) {
    logger.warn('⚠️  public/index.html not found!');
    logger.warn('   Copy your frontend files into the public/ folder:');
    logger.warn('     backend/');
    logger.warn('       public/');
    logger.warn('         index.html   ← your HTML');
    logger.warn('         main.js      ← your JS');
    logger.warn('         (any other assets)');
  } else {
    logger.info(`    Static : serving frontend from ${PUBLIC_DIR}`);
    // Log which JS files are present so you can confirm main.js is found
    const jsFiles = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.js'));
    if (jsFiles.length) logger.info(`    JS files: ${jsFiles.join(', ')}`);
    else logger.warn('⚠️  No .js files found in public/. main.js may be missing!');
  }
});

// ── Graceful Shutdown ─────────────────────────────────────────────────────────
process.on('SIGTERM', () => {
  logger.info('SIGTERM received – shutting down gracefully');
  server.close(() => { logger.info('Server closed.'); process.exit(0); });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received – shutting down gracefully');
  server.close(() => { logger.info('Server closed.'); process.exit(0); });
});

process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Promise Rejection: ${err?.message || err}`);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err.message}`);
  process.exit(1);
});
module.exports = app;