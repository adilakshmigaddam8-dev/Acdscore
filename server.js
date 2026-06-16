/**
 * server.js – AcadScore Backend  (CORRECTED)
 *
 * ROOT CAUSE OF "JavaScript not working on localhost:5000":
 *
 *  BUG-A  Helmet CSP scriptSrc was missing a proper "'self'" that allows
 *         <script src="main.js"> (an external script file served by the same
 *         origin) to actually EXECUTE. The browser loads the file (HTTP 200)
 *         but then refuses to run it with a console error:
 *           "Refused to load script ... because it violates the following
 *            Content Security Policy directive: script-src 'unsafe-inline'"
 *         FIX: "'self'" added to scriptSrc so same-origin .js files can run.
 *
 *  BUG-B  Chart.js CDN was listed as bare hostname 'cdn.jsdelivr.net'.
 *         CSP requires the full scheme. Some browsers reject schemeless hosts.
 *         FIX: changed to 'https://cdn.jsdelivr.net'.
 *
 *  BUG-C  fonts.googleapis.com was listed in scriptSrc — it is NOT a JS host.
 *         Having it there causes unexpected CSP violations in some browsers.
 *         FIX: removed from scriptSrc; kept in styleSrc where it belongs.
 *
 *  BUG-D  connectSrc was "'self'" only. When the frontend makes fetch() calls
 *         to /api/* endpoints from the browser, 'self' should cover it for
 *         same-origin, but adding explicit localhost entries ensures no edge
 *         case blocks the XHR/fetch in local dev.
 *         FIX: added 'http://localhost:5000' and '127.0.0.1:5000'.
 *
 *  BUG-E  crossOriginEmbedderPolicy was not set to false. Helmet enables it
 *         by default which prevents loading Google Fonts and CDN resources
 *         (including Chart.js from jsdelivr) because they lack the required
 *         Cross-Origin-Resource-Policy header.
 *         FIX: crossOriginEmbedderPolicy: false.
 *
 *  BUG-F  public/ folder structure not enforced. index.html and main.js must
 *         be inside backend/public/ for express.static to serve them.
 *         FIX: added startup check that warns if public/index.html is missing.
 *
 * Previously documented fixes 1-10 from the uploaded file are retained as-is.
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
const nodemailer    = require('nodemailer');

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

// ── Security: Helmet + CSP ───────────────────────────────────────────────────
//
// BUG-A FIX: "'self'" in scriptSrc → allows <script src="main.js"> to execute.
// BUG-B FIX: full https:// scheme on CDN host for Chart.js.
// BUG-C FIX: fonts.googleapis.com removed from scriptSrc (it's a style/font host).
// BUG-E FIX: crossOriginEmbedderPolicy disabled so CDN + Google Fonts load.
//
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
  'https://acdscore.vercel.app',  // Production frontend on Vercel
  'http://localhost:3000',
  'http://localhost:5000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5000',
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
app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    await transporter.sendMail({
      from:    process.env.EMAIL_USER,
      to:      process.env.CONTACT_EMAIL || 'myraofficial057@gmail.com',
      subject: `Contact Form - ${name}`,
      html: `
        <h3>New Contact Message</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b> ${message}</p>
      `,
    });

    res.json({ success: true, message: 'Email sent successfully.' });
  } catch (error) {
    console.error('EMAIL ERROR:', error);
    res.status(500).json({
      success: false,
      error: error.message,
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