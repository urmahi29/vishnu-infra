require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwt: {
    secret: process.env.JWT_SECRET || 'road_construction_erp_jwt_secret_key_2024',
    expire: process.env.JWT_EXPIRE || '7d'
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    name: process.env.DB_NAME || 'road_construction_erp'
  },
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
    path: process.env.UPLOAD_PATH || './uploads'
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173'
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX) || 100
  }
};
