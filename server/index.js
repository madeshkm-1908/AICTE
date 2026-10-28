const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');
const db = require('./db/database');
const { addClient } = require('./events');
const { router: authRouter } = require('./routes/auth');
const dashboardRouter = require('./routes/dashboard');
const casesRouter = require('./routes/cases');
const institutionsRouter = require('./routes/institutions');
const overlapsRouter = require('./routes/overlaps');
const alertsRouter = require('./routes/alerts');
const reportsRouter = require('./routes/reports');
const auditRouter = require('./routes/audit');
const searchRouter = require('./routes/search');
const importRouter = require('./routes/import');
const complainantRouter = require('./routes/complainant');
const { startAlertScheduler } = require('./services/alertGenerator');

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for reverse proxy environments (Render, Cloudflare, Nginx)
app.set('trust proxy', 1);

// Security Headers via Helmet (relaxed CSP to permit SPA assets and data charts)
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiter for authentication endpoint (20 attempts per 15 minutes)
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/auth/login', loginRateLimiter);
app.use('/api/auth/complainant/login', loginRateLimiter);
app.use('/api/auth/complainant/register', loginRateLimiter);

// General API Rate Limiter (300 requests per minute per IP)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api', generalLimiter);

// Server-Sent Events endpoint for real-time live data stream
app.get('/api/events', (req, res) => {
  addClient(req, res);
});

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/cases', casesRouter);
app.use('/api/institutions', institutionsRouter);
app.use('/api/overlaps', overlapsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);
app.use('/api/search', searchRouter);
app.use('/api/import', importRouter);
app.use('/api/complainant', complainantRouter);

// Enhanced Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'AICTE Integrated Complaint Monitoring Service',
    version: '1.0.0-PROD',
    database_engine: db.type,
    uptime_seconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Serve frontend production build if present (SPA fallback middleware compatible with Express 5)
const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');
const indexHtmlPath = path.resolve(clientDistPath, 'index.html');

console.log(`[Frontend] Target static assets directory: ${clientDistPath}`);
console.log(`[Frontend] Assets directory exists: ${fs.existsSync(clientDistPath)}`);
console.log(`[Frontend] index.html exists: ${fs.existsSync(indexHtmlPath)}`);

if (fs.existsSync(clientDistPath)) {
  console.log(`[Frontend] Serving static client build from: ${clientDistPath}`);
  app.use(express.static(clientDistPath, { index: 'index.html' }));
  
  // SPA Catch-All fallback: Any non-/api GET route returns index.html for client-side routing
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
      if (fs.existsSync(indexHtmlPath)) {
        return res.sendFile(indexHtmlPath);
      }
    }
    next();
  });
} else {
  console.warn(`[Frontend] WARNING: client/dist directory does NOT exist at: ${clientDistPath}`);
  app.get('/', (req, res) => {
    res.status(503).send(`
      <div style="font-family:sans-serif;padding:40px;text-align:center;">
        <h2>Frontend Build Not Found</h2>
        <p>The frontend static build was not located in client/dist.</p>
        <p>Build Command: <code>npm install --include=dev --prefix client && npm run build --prefix client</code></p>
        <p>API Health: <a href="/api/health">/api/health</a></p>
      </div>
    `);
  });
}

app.listen(PORT, () => {
  // Start automated alert surveillance scheduler (60-second cycle)
  startAlertScheduler(60000);

  console.log(`=======================================================`);
  console.log(`  AICTE Complaint Monitoring & Status Portal ONLINE    `);
  console.log(`  URL: http://localhost:${PORT}                       `);
  console.log(`  Database Engine: ${db.type.toUpperCase()}           `);
  console.log(`  API Health: http://localhost:${PORT}/api/health      `);
  console.log(`  SSE Stream: http://localhost:${PORT}/api/events      `);
  console.log(`=======================================================`);
});
