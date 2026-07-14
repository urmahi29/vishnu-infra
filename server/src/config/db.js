const mysql = require('mysql2/promise');
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

let useSqlite = false;
let sqliteDb = null;

const getSqliteDb = () => {
  if (!sqliteDb) {
    const dbPath = path.join(__dirname, '../../road_construction_erp.sqlite');
    sqliteDb = new DatabaseSync(dbPath);
    // Register custom case-insensitive functions for MySQL compatibility
    sqliteDb.function('now', () => new Date().toISOString().replace('T', ' ').substring(0, 19));
  }
  return sqliteDb;
};

const setUseSqlite = (val) => {
  useSqlite = val;
};

const getUseSqlite = () => {
  return useSqlite;
};

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'root123',
  database: process.env.DB_NAME || 'road_construction_erp',
  waitForConnections: true,
  connectionLimit: 3,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// Test database connection
const testConnection = async () => {
  if (useSqlite) {
    console.log('✓ Database connected successfully (SQLite)');
    return true;
  }
  try {
    const connection = await pool.getConnection();
    console.log('✓ Database connected successfully (MySQL)');
    connection.release();
    return true;
  } catch (error) {
    console.warn('✗ MySQL database connection failed, trying SQLite fallback...');
    useSqlite = true;
    try {
      getSqliteDb();
      console.log('✓ Database connected successfully (SQLite Fallback)');
      return true;
    } catch (sqliteErr) {
      console.error('✗ SQLite connection failed:', sqliteErr.message);
      return false;
    }
  }
};

// Execute a query with parameters
const query = async (sql, params) => {
  if (useSqlite) {
    try {
      const db = getSqliteDb();
      const cleanParams = params ? params.map(p => p === undefined ? null : p) : [];
      const stmt = db.prepare(sql);
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || 
                       sql.trim().toUpperCase().startsWith('WITH') ||
                       sql.trim().toUpperCase().startsWith('PRAGMA') ||
                       sql.trim().toUpperCase().startsWith('SHOW');
      
      if (isSelect) {
        return stmt.all(...cleanParams);
      } else {
        const result = stmt.run(...cleanParams);
        return {
          insertId: Number(result.lastInsertRowid),
          affectedRows: result.changes
        };
      }
    } catch (error) {
      console.error('SQLite query error:', error.message);
      console.error('SQL:', sql);
      throw error;
    }
  }

  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('Database query error:', error.message);
    throw error;
  }
};

// Execute a transaction with multiple queries
const transaction = async (queries) => {
  if (useSqlite) {
    const db = getSqliteDb();
    try {
      db.exec('BEGIN TRANSACTION');
      const results = [];
      for (const { sql, params } of queries) {
        const cleanParams = params ? params.map(p => p === undefined ? null : p) : [];
        const stmt = db.prepare(sql);
        const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || 
                         sql.trim().toUpperCase().startsWith('WITH') ||
                         sql.trim().toUpperCase().startsWith('PRAGMA') ||
                         sql.trim().toUpperCase().startsWith('SHOW');
        
        if (isSelect) {
          results.push(stmt.all(...cleanParams));
        } else {
          const result = stmt.run(...cleanParams);
          results.push({
            insertId: Number(result.lastInsertRowid),
            affectedRows: result.changes
          });
        }
      }
      db.exec('COMMIT');
      return results;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const results = [];
    for (const { sql, params } of queries) {
      const [result] = await connection.execute(sql, params);
      results.push(result);
    }
    await connection.commit();
    return results;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  query,
  transaction,
  testConnection,
  setUseSqlite,
  getUseSqlite,
  getSqliteDb
};

