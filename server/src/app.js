const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const errorHandler = require('./middleware/errorHandler');
const config = require('./config/env');

// Import Routes
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const materialRoutes = require('./routes/materialRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const workforceRoutes = require('./routes/workforceRoutes');
const reportRoutes = require('./routes/reportRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const documentRoutes = require('./routes/documentRoutes');
const safetyRoutes = require('./routes/safetyRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const userRoutes = require('./routes/userRoutes');
const fuelRoutes = require('./routes/fuelRoutes');
const staffExpenseRoutes = require('./routes/staffExpenseRoutes');
const tripRoutes = require('./routes/tripRoutes');
const projectFuelRoutes = require('./routes/projectFuelRoutes');
const projectStaffExpenseRoutes = require('./routes/projectStaffExpenseRoutes');
const projectTripRoutes = require('./routes/projectTripRoutes');

const app = express();

// Security middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// CORS
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.nodeEnv === 'development' ? 100000 : config.rateLimit.max,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  }
});

app.use('/api', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
}

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Road Construction ERP API is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv
  });
});

// API Routes
app.use('/api/contact', contactRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/budget', budgetRoutes);
app.use('/api/workforce', workforceRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/safety', safetyRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/staff-expenses', staffExpenseRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/project-fuel', projectFuelRoutes);
app.use('/api/project-staff-expenses', projectStaffExpenseRoutes);
app.use('/api/project-trips', projectTripRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handler
app.use(errorHandler);

module.exports = app;
