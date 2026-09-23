/**
 * ==============================================================================
 * BHUBANESWAR ENGINEERING COLLEGE (BEC)
 * ACCOUNTS & FINANCE MANAGEMENT SYSTEM - MAIN EXPRESS BACKEND SERVER
 * ==============================================================================
 */

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const { testConnection } = require('./config/db');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Route Handlers
const authRoutes = require('./routes/authRoutes');
const studentRoutes = require('./routes/studentRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const feeRoutes = require('./routes/feeRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const transportRoutes = require('./routes/transportRoutes');
const expenseRoutes = require('./routes/expenseRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// 1. Security Headers (Helmet)
app.use(
  helmet({
    contentSecurityPolicy: false, // Enabled for inline scripts in Vanilla SPA
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// 2. CORS Configuration
const allowedOrigins = [
  'http://localhost:5000',
  'http://127.0.0.1:5000',
  'http://localhost:3000',
  process.env.BASE_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, true); // Allow during production deployment flexibility
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  })
);

// 3. Request Parsers & Rate Limiter
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/', apiLimiter);

// 4. Serve Frontend Static Assets
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));

// 5. System Healthcheck Endpoint
app.get('/api/health', async (req, res) => {
  const dbHealth = await testConnection();
  res.status(dbHealth.connected ? 200 : 503).json({
    status: dbHealth.connected ? 'HEALTHY' : 'DATABASE_DISCONNECTED',
    college: 'Bhubaneswar Engineering College (BEC)',
    timestamp: new Date().toISOString(),
    database: dbHealth
  });
});

// 6. REST API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/expenses', expenseRoutes);

// 7. HTML Page Routes & Fallbacks
app.get('/login', (req, res) => {
  res.sendFile(path.join(frontendPath, 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

app.get('/receipt-desk', (req, res) => {
  res.sendFile(path.join(frontendPath, 'receipt-desk.html'));
});

app.get('/students', (req, res) => {
  res.sendFile(path.join(frontendPath, 'students.html'));
});

app.get('/student-fee', (req, res) => {
  res.sendFile(path.join(frontendPath, 'student-fee.html'));
});

app.get('/student-transport-fee', (req, res) => {
  res.sendFile(path.join(frontendPath, 'student-transport-fee.html'));
});

app.get('/expenses', (req, res) => {
  res.sendFile(path.join(frontendPath, 'expenses.html'));
});

app.get('/receipts', (req, res) => {
  res.sendFile(path.join(frontendPath, 'receipts.html'));
});

app.get('/invoices', (req, res) => {
  res.sendFile(path.join(frontendPath, 'invoices.html'));
});

app.get('/reports', (req, res) => {
  res.sendFile(path.join(frontendPath, 'reports.html'));
});

app.get('/student-portal', (req, res) => {
  res.sendFile(path.join(frontendPath, 'student-portal.html'));
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: `API endpoint '${req.originalUrl}' not found.` });
  }
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// 8. Global Centralized Error Handler
app.use(errorHandler);

// 9. Start Server
if (require.main === module) {
  const server = app.listen(PORT, async () => {
    console.log('================================================================');
    console.log(`BHUBANESWAR ENGINEERING COLLEGE - ACCOUNTS & FINANCE SYSTEM`);
    console.log(`Server listening on port ${PORT} in [${process.env.NODE_ENV || 'development'}] mode`);
    console.log(`Application URL: http://localhost:${PORT}`);
    console.log('================================================================');

    const health = await testConnection();
    if (health.connected) {
      console.log(`[Database] Connected to MySQL (${health.database}) on ${health.host}`);
    } else {
      console.warn(`[Database Warning] MySQL connection failed: ${health.error}`);
      console.warn(`  Run 'npm run db:init' after configuring Hostinger credentials in .env`);
    }
  });

  // Graceful Shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received: closing HTTP server');
    server.close(() => {
      console.log('HTTP server closed');
    });
  });
}

module.exports = app;
