const app = require('./app');
const config = require('./config/env');
const { testConnection } = require('./config/db');
const { initializeDatabase } = require('./config/db-init');

const startServer = async () => {
  // Ensure UPLOAD_PATH directory exists
  const fs = require('fs');
  const uploadPath = process.env.UPLOAD_PATH || './uploads';
  if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath, { recursive: true });
    console.log(`📁 Created uploads directory at: ${uploadPath}`);
  }

  // Step 1: Initialize database (create, migrate, and seed if needed)
  console.log('');
  console.log('=========================================');
  console.log('  Road Construction & Infrastructure');
  console.log('  Management System - Initialization');
  console.log('=========================================');
  
  const dbInitialized = await initializeDatabase();
  
  if (!dbInitialized) {
    console.error('');
    console.error('❌ Could not initialize database. The server cannot start without a database.');
    console.error('   Possible solutions:');
    console.error('   1. Make sure MySQL is running (or run: docker-compose up -d mysql)');
    console.error('   2. Check your .env file for correct DB_HOST, DB_PORT, DB_USER, DB_PASSWORD');
    console.error('   3. Docker users: docker-compose up -d will start both MySQL and the API');
    console.error('');
    process.exit(1);
  }

  // Step 2: Test the full database connection
  console.log('');
  const dbConnected = await testConnection();
  
  if (!dbConnected) {
    console.error('❌ Database connection test failed after initialization.');
    process.exit(1);
  }

  // Step 3: Start the Express server
  console.log('');
  console.log('=========================================');
  console.log('  Road Construction & Infrastructure');
  console.log('  Management System - API Server');
  console.log('=========================================');
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  Port:        ${config.port}`);
  console.log(`  Database:    ✓ Connected`);
  console.log(`  Host:        ${config.db.host}:${config.db.port}`);
  console.log('=========================================');

  const server = app.listen(config.port, () => {
    console.log(`🚀 Server is running on port ${config.port}`);
    console.log(`   API: http://localhost:${config.port}/api`);
    console.log(`   Health: http://localhost:${config.port}/api/health`);
    console.log('');
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Handle unhandled rejections
  process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
  });
};

startServer();
