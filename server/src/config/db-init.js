const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

/**
 * Initialize database on startup:
 * 1. Connect to MySQL without specifying a database
 * 2. Create the database if it doesn't exist
 * 3. Create all tables from init.sql
 * 4. Seed default admin/user accounts if empty
 * 5. If MySQL fails, fall back to SQLite and perform the same steps
 * 6. Return true on success, false on failure
 */
const initializeDatabase = async () => {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    multipleStatements: true,
    connectTimeout: 10000
  };

  const dbName = process.env.DB_NAME || 'road_construction_erp';

  let connection;
  try {
    console.log('🔄 Connecting to MySQL server...');
    const isRemote = process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1';
    if (isRemote) {
      dbConfig.database = dbName;
    }
    
    connection = await mysql.createConnection(dbConfig);
    console.log('✓ Connected to MySQL server');

    if (!isRemote) {
      // Step 1: Check if database exists, create if not
      console.log(`🔄 Checking database '${dbName}'...`);
      const [databases] = await connection.query(
        `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
        [dbName]
      );

      if (databases.length === 0) {
        console.log(`🔄 Creating database '${dbName}'...`);
        await connection.query(
          `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
        );
        console.log(`✓ Database '${dbName}' created`);
      } else {
        console.log(`✓ Database '${dbName}' already exists`);
      }

      // Step 2: Use the database and check if tables exist
      await connection.query(`USE \`${dbName}\``);
    }

    const [tables] = await connection.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?`,
      [dbName]
    );

    const existingTables = tables.map(t => t.TABLE_NAME);

    if (existingTables.length === 0) {
      // Step 3: Run schema from init.sql
      console.log('🔄 Creating database schema...');
      const initSqlPath = path.join(__dirname, '../../init.sql');
      
      if (fs.existsSync(initSqlPath)) {
        const initSql = fs.readFileSync(initSqlPath, 'utf8');
        
        // Extract only the schema part (before seed INSERT statements)
        const schemaEnd = initSql.lastIndexOf('-- ============================================================');
        const schemaPart = schemaEnd > 0 
          ? initSql.substring(0, schemaEnd)
          : initSql;
        
        // Execute each statement separately to avoid multi-statement issues
        const statements = schemaPart
          .split(';')
          .map(s => s.trim())
          .filter(s => s.length > 0 && !s.startsWith('--'));
        
        for (const statement of statements) {
          try {
            await connection.query(statement);
          } catch (stmtErr) {
            const errMsg = stmtErr?.message || '';
            // Ignore "already exists" errors for CREATE DATABASE / USE
            if (!errMsg.includes('already exists') && 
                !errMsg.includes('Unknown database')) {
              console.warn(`  ⚠ Statement warning: ${errMsg.substring(0, 100)}`);
            }
          }
        }
        console.log('✓ Schema created successfully');
      } else {
        console.warn('⚠ init.sql not found at:', initSqlPath);
      }
    } else {
      console.log(`✓ Found ${existingTables.length} existing tables`);
      
      // Migration: Add firebase_uid column if it doesn't exist
      try {
        await connection.query(
          `ALTER TABLE users ADD COLUMN firebase_uid VARCHAR(255) DEFAULT NULL AFTER password`
        );
        console.log('✓ Added firebase_uid column to users table');
      } catch (alterErr) {
        // Column already exists - this is fine
        if (!alterErr.message?.includes('Duplicate column')) {
          console.warn(`  ⚠ Could not add firebase_uid: ${alterErr.message?.substring(0, 100)}`);
        }
      }

      // Migration: Add rejection_reason column if it doesn't exist
      try {
        await connection.query(
          `ALTER TABLE users ADD COLUMN rejection_reason VARCHAR(255) DEFAULT NULL AFTER status`
        );
        console.log('✓ Added rejection_reason column to users table');
      } catch (alterErr) {
        if (!alterErr.message?.includes('Duplicate column')) {
          console.warn(`  ⚠ Could not add rejection_reason: ${alterErr.message?.substring(0, 100)}`);
        }
      }

      // Migration: Modify status column ENUM to support pending and rejected
      try {
        await connection.query(
          `ALTER TABLE users MODIFY COLUMN status ENUM('active', 'inactive', 'suspended', 'pending', 'rejected') DEFAULT 'pending'`
        );
        console.log('✓ Updated users status ENUM migration');
      } catch (alterErr) {
        console.warn(`  ⚠ Could not modify status ENUM: ${alterErr.message?.substring(0, 100)}`);
      }

      // Migration: Create new tables if they don't exist
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS fuel_entries (
            id INT PRIMARY KEY AUTO_INCREMENT,
            equipment_id INT NOT NULL,
            fuel_date DATE NOT NULL,
            quantity DECIMAL(10, 2) NOT NULL,
            unit_price DECIMAL(10, 2) NOT NULL,
            total_cost DECIMAL(12, 2) NOT NULL,
            operator_id INT,
            odometer_reading INT,
            location VARCHAR(255),
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
            FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
          )
        `);
        console.log('✓ Verified/Created MySQL fuel_entries table');
      } catch (err) {
        console.warn(`  ⚠ Could not create fuel_entries table: ${err.message}`);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS staff_expenses (
            id INT PRIMARY KEY AUTO_INCREMENT,
            user_id INT NOT NULL,
            expense_date DATE NOT NULL,
            category VARCHAR(100) NOT NULL,
            amount DECIMAL(12, 2) NOT NULL,
            payment_status ENUM('pending', 'approved', 'rejected', 'paid') DEFAULT 'pending',
            description TEXT,
            rejection_reason VARCHAR(255) DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Verified/Created MySQL staff_expenses table');
      } catch (err) {
        console.warn(`  ⚠ Could not create staff_expenses table: ${err.message}`);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS trips (
            id INT PRIMARY KEY AUTO_INCREMENT,
            trip_code VARCHAR(50) UNIQUE NOT NULL,
            equipment_id INT NOT NULL,
            driver_id INT NOT NULL,
            start_date DATETIME NOT NULL,
            end_date DATETIME DEFAULT NULL,
            start_location VARCHAR(255) NOT NULL,
            end_location VARCHAR(255) NOT NULL,
            distance_covered DECIMAL(10, 2) DEFAULT 0.00,
            fuel_used DECIMAL(10, 2) DEFAULT 0.00,
            status ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
            FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Verified/Created MySQL trips table');
      } catch (err) {
        console.warn(`  ⚠ Could not create trips table: ${err.message}`);
      }

      // Projects module migrations
      try {
        await connection.query(`ALTER TABLE projects ADD COLUMN project_name VARCHAR(255) DEFAULT NULL`);
        console.log('✓ Verified/Added MySQL project_name column to projects table');
      } catch (err) {
        if (!err.message?.includes('Duplicate column')) {
          console.warn(`  ⚠ Could not add project_name: ${err.message}`);
        }
      }

      try {
        await connection.query(`ALTER TABLE projects ADD COLUMN manager_name VARCHAR(255) DEFAULT NULL`);
        console.log('✓ Verified/Added MySQL manager_name column to projects table');
      } catch (err) {
        if (!err.message?.includes('Duplicate column')) {
          console.warn(`  ⚠ Could not add manager_name: ${err.message}`);
        }
      }

      // Documents module migrations (MySQL)
      const mysqlDocCols = [
        { name: 'vehicle_number', sql: 'ALTER TABLE documents ADD COLUMN vehicle_number VARCHAR(50) DEFAULT NULL' },
        { name: 'vehicle_model', sql: 'ALTER TABLE documents ADD COLUMN vehicle_model VARCHAR(100) DEFAULT NULL' },
        { name: 'vehicle_type', sql: 'ALTER TABLE documents ADD COLUMN vehicle_type VARCHAR(50) DEFAULT NULL' },
        { name: 'document_category', sql: 'ALTER TABLE documents ADD COLUMN document_category VARCHAR(50) DEFAULT NULL' },
        { name: 'document_number', sql: 'ALTER TABLE documents ADD COLUMN document_number VARCHAR(100) DEFAULT NULL' },
        { name: 'issue_date', sql: 'ALTER TABLE documents ADD COLUMN issue_date DATE DEFAULT NULL' },
        { name: 'expiry_date', sql: 'ALTER TABLE documents ADD COLUMN expiry_date DATE DEFAULT NULL' },
        { name: 'remarks', sql: 'ALTER TABLE documents ADD COLUMN remarks TEXT DEFAULT NULL' },
        { name: 'original_name', sql: 'ALTER TABLE documents ADD COLUMN original_name VARCHAR(255) DEFAULT NULL' },
        { name: 'company_name', sql: 'ALTER TABLE documents ADD COLUMN company_name VARCHAR(255) DEFAULT NULL' },
        { name: 'brand', sql: 'ALTER TABLE documents ADD COLUMN brand VARCHAR(255) DEFAULT NULL' },
        { name: 'year', sql: 'ALTER TABLE documents ADD COLUMN year INT DEFAULT NULL' },
        { name: 'fuel_type', sql: 'ALTER TABLE documents ADD COLUMN fuel_type VARCHAR(50) DEFAULT NULL' },
        { name: 'engine_number', sql: 'ALTER TABLE documents ADD COLUMN engine_number VARCHAR(100) DEFAULT NULL' },
        { name: 'chassis_number', sql: 'ALTER TABLE documents ADD COLUMN chassis_number VARCHAR(100) DEFAULT NULL' },
        { name: 'operator_name', sql: 'ALTER TABLE documents ADD COLUMN operator_name VARCHAR(255) DEFAULT NULL' },
        { name: 'insurance_expiry', sql: 'ALTER TABLE documents ADD COLUMN insurance_expiry DATE DEFAULT NULL' },
        { name: 'fitness_expiry', sql: 'ALTER TABLE documents ADD COLUMN fitness_expiry DATE DEFAULT NULL' },
        { name: 'pollution_expiry', sql: 'ALTER TABLE documents ADD COLUMN pollution_expiry DATE DEFAULT NULL' }
      ];
      for (const col of mysqlDocCols) {
        try {
          await connection.query(col.sql);
        } catch (err) {
          if (!err.message?.includes('Duplicate column')) {
            console.warn(`  ⚠ Could not add ${col.name} column to MySQL documents table: ${err.message}`);
          }
        }
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS project_staff (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            staff_name VARCHAR(255) NOT NULL,
            work_role VARCHAR(255) DEFAULT NULL,
            joining_date DATE DEFAULT NULL,
            end_date DATE DEFAULT NULL,
            salary DECIMAL(15, 2) DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Verified/Created MySQL project_staff table');
      } catch (err) {
        console.warn(`  ⚠ Could not create project_staff table: ${err.message}`);
      }

      // Migration: Add work_role column if it doesn't exist
      try {
        await connection.query(
          `ALTER TABLE project_staff ADD COLUMN work_role VARCHAR(255) DEFAULT NULL`
        );
        console.log('✓ Added work_role column to MySQL project_staff table');
      } catch (alterErr) {
        if (!alterErr.message?.includes('Duplicate column')) {
          console.warn(`  ⚠ Could not add work_role column: ${alterErr.message}`);
        }
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS project_vehicles (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            vehicle_name VARCHAR(255) NOT NULL,
            vehicle_number VARCHAR(255) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Verified/Created MySQL project_vehicles table');
      } catch (err) {
        console.warn(`  ⚠ Could not create project_vehicles table: ${err.message}`);
      }

      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS project_expenses (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            amount DECIMAL(15, 2) NOT NULL,
            description TEXT NOT NULL,
            paid_by VARCHAR(255) NOT NULL,
            expense_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Verified/Created MySQL project_expenses table');
      } catch (err) {
        console.warn(`  ⚠ Could not create project_expenses table: ${err.message}`);
      }

      // Project Fuel Entries table
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS project_fuel_entries (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            quantity DECIMAL(10, 2) NOT NULL,
            cost DECIMAL(12, 2) NOT NULL,
            purchased_by VARCHAR(255) NOT NULL,
            fuel_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Verified/Created MySQL project_fuel_entries table');
      } catch (err) {
        console.warn(`  ⚠ Could not create project_fuel_entries table: ${err.message}`);
      }

      // Project Staff Expenses table
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS project_staff_expenses (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            staff_name VARCHAR(255) NOT NULL,
            paid_by VARCHAR(255) NOT NULL,
            amount DECIMAL(12, 2) NOT NULL,
            expense_date DATE NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Verified/Created MySQL project_staff_expenses table');
      } catch (err) {
        console.warn(`  ⚠ Could not create project_staff_expenses table: ${err.message}`);
      }

      // Project Trips table
      try {
        await connection.query(`
          CREATE TABLE IF NOT EXISTS project_trips (
            id INT PRIMARY KEY AUTO_INCREMENT,
            project_id INT NOT NULL,
            trip_type VARCHAR(50) NOT NULL,
            trip_date DATE NOT NULL,
            trip_number VARCHAR(100) NOT NULL,
            vehicle_number VARCHAR(100) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
          )
        `);
        console.log('✓ Verified/Created MySQL project_trips table');
      } catch (err) {
        console.warn(`  ⚠ Could not create project_trips table: ${err.message}`);
      }
    }

    // Step 4: Seed default users if users table is empty
    await connection.query(`USE \`${dbName}\``);
    const [userCount] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    if (userCount[0].count === 0) {
      console.log('🔄 Seeding default users...');
      
      const adminHash = await bcrypt.hash('Admin@123', 10);
      const userHash = await bcrypt.hash('User@123', 10);
      
      await connection.query(
        `INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['ADM001', 'System Administrator', 'admin@roadconstruction.com', adminHash, 'admin', '+1-555-0100', 'Project Director', 'Management', 'active']
      );
      
      await connection.query(
        `INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['EMP001', 'John Engineer', 'user@roadconstruction.com', userHash, 'user', '+1-555-0101', 'Site Engineer', 'Engineering', 'active']
      );
      
      // Seed budget categories
      const categories = [
        ['Materials', 'Cost of raw materials and supplies'],
        ['Labor', 'Workforce and contractor costs'],
        ['Equipment', 'Machinery and equipment costs'],
        ['Transportation', 'Logistics and transport costs'],
        ['Permits & Licenses', 'Government fees and permits'],
        ['Administrative', 'Office and administrative expenses'],
        ['Contingency', 'Emergency and contingency funds']
      ];
      
      for (const [name, desc] of categories) {
        await connection.query(
          'INSERT INTO budget_categories (name, description) VALUES (?, ?)',
          [name, desc]
        );
      }
      
      console.log('✓ Default users and data seeded');
    } else {
      console.log(`→ Skipping seed: ${userCount[0].count} users already exist`);
    }

    console.log('✅ Database initialization complete');
    return true;
  } catch (error) {
    console.warn('⚠️ Could not initialize MySQL database. Falling back to SQLite.');
    console.warn('  MySQL connection refused or access denied. Error:', error.message);
    
    // SQLite Fallback
    try {
      const { setUseSqlite, getSqliteDb } = require('./db');
      setUseSqlite(true);
      
      const db = getSqliteDb();
      
      // Check if users table already exists in SQLite
      let tablesExist = false;
      try {
        const count = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users'").all();
        tablesExist = count.length > 0;
      } catch (e) {
        // ignore
      }
      
      if (!tablesExist) {
        console.log('🔄 Creating SQLite database schema...');
        const initSqlPath = path.join(__dirname, '../../init.sql');
        
        if (fs.existsSync(initSqlPath)) {
          const initSql = fs.readFileSync(initSqlPath, 'utf8');
          const schemaEnd = initSql.lastIndexOf('-- ============================================================');
          const schemaPart = schemaEnd > 0 ? initSql.substring(0, schemaEnd) : initSql;
          
          const removeComments = (sql) => {
            return sql
              .split('\n')
              .filter(line => !line.trim().startsWith('--'))
              .join('\n')
              .trim();
          };

          const statements = schemaPart
            .split(';')
            .map(s => removeComments(s))
            .filter(s => s.length > 0);
            
          const cleanSqlForSqlite = (sql) => {
            if (sql.toUpperCase().includes('CREATE DATABASE') || 
                sql.toUpperCase().startsWith('USE ') || 
                sql.toUpperCase().includes('ADD FOREIGN KEY')) {
              return '';
            }
            
            if (sql.toUpperCase().startsWith('CREATE TABLE')) {
              let lines = sql.split('\n');
              let filteredLines = [];
              for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();
                if (line.toUpperCase().startsWith('INDEX ') || 
                    line.toUpperCase().startsWith('UNIQUE INDEX ') ||
                    line.toUpperCase().startsWith('KEY ') ||
                    line.toUpperCase().startsWith('UNIQUE KEY ')) {
                  continue;
                }
                filteredLines.push(lines[i]);
              }
              
              sql = filteredLines.join('\n');
              sql = sql.replace(/,\s*\)/g, '\n)');
              
              sql = sql.replace(/ENUM\s*\([^)]*\)/gi, 'TEXT');
              sql = sql.replace(/INT\s+PRIMARY\s+KEY\s+AUTO_INCREMENT/gi, 'INTEGER PRIMARY KEY AUTOINCREMENT');
              sql = sql.replace(/INT\s+PRIMARY\s+KEY/gi, 'INTEGER PRIMARY KEY');
              sql = sql.replace(/AUTO_INCREMENT/gi, 'AUTOINCREMENT');
              sql = sql.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP/gi, '');
              sql = sql.replace(/TINYINT\(1\)/gi, 'INTEGER');
            }
            
            return sql.trim();
          };

          for (const statement of statements) {
            const cleaned = cleanSqlForSqlite(statement);
            if (!cleaned) continue;
            try {
              db.exec(cleaned);
            } catch (stmtErr) {
              console.warn(`  ⚠️ SQLite schema statement warning: ${stmtErr.message}`);
            }
          }
          console.log('✓ SQLite schema created successfully');
        } else {
          console.warn('⚠️ init.sql not found at:', initSqlPath);
        }
      } else {
        console.log('✓ SQLite database already contains tables');
        
        // Migration: Add rejection_reason column to SQLite if it doesn't exist
        try {
          db.prepare(`ALTER TABLE users ADD COLUMN rejection_reason TEXT DEFAULT NULL`).run();
          console.log('✓ Added rejection_reason column to SQLite users table');
        } catch (sqliteAlterErr) {
          if (!sqliteAlterErr.message?.includes('duplicate column')) {
            console.warn(`  ⚠️ SQLite migration warning (rejection_reason): ${sqliteAlterErr.message}`);
          }
        }

        // Migration: Create new tables in SQLite if they don't exist
        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS fuel_entries (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              equipment_id INTEGER NOT NULL,
              fuel_date TEXT NOT NULL,
              quantity REAL NOT NULL,
              unit_price REAL NOT NULL,
              total_cost REAL NOT NULL,
              operator_id INTEGER,
              odometer_reading INTEGER,
              location TEXT,
              notes TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
              FOREIGN KEY (operator_id) REFERENCES users(id) ON DELETE SET NULL
            )
          `).run();
          console.log('✓ Verified/Created SQLite fuel_entries table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (fuel_entries): ${sqliteErr.message}`);
        }

        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS staff_expenses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              user_id INTEGER NOT NULL,
              expense_date TEXT NOT NULL,
              category TEXT NOT NULL,
              amount REAL NOT NULL,
              payment_status TEXT DEFAULT 'pending',
              description TEXT,
              rejection_reason TEXT DEFAULT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `).run();
          console.log('✓ Verified/Created SQLite staff_expenses table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (staff_expenses): ${sqliteErr.message}`);
        }

        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS trips (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              trip_code TEXT UNIQUE NOT NULL,
              equipment_id INTEGER NOT NULL,
              driver_id INTEGER NOT NULL,
              start_date TEXT NOT NULL,
              end_date TEXT DEFAULT NULL,
              start_location TEXT NOT NULL,
              end_location TEXT NOT NULL,
              distance_covered REAL DEFAULT 0.00,
              fuel_used REAL DEFAULT 0.00,
              status TEXT DEFAULT 'scheduled',
              notes TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE CASCADE,
              FOREIGN KEY (driver_id) REFERENCES users(id) ON DELETE CASCADE
            )
          `).run();
          console.log('✓ Verified/Created SQLite trips table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (trips): ${sqliteErr.message}`);
        }

        // Projects module migrations for SQLite
        try {
          db.prepare(`ALTER TABLE projects ADD COLUMN project_name TEXT DEFAULT NULL`).run();
          console.log('✓ Verified/Added SQLite project_name column to projects table');
        } catch (sqliteErr) {
          if (!sqliteErr.message?.includes('duplicate column')) {
            console.warn(`  ⚠️ SQLite migration error (projects project_name): ${sqliteErr.message}`);
          }
        }

        try {
          db.prepare(`ALTER TABLE projects ADD COLUMN manager_name TEXT DEFAULT NULL`).run();
          console.log('✓ Verified/Added SQLite manager_name column to projects table');
        } catch (sqliteErr) {
          if (!sqliteErr.message?.includes('duplicate column')) {
            console.warn(`  ⚠️ SQLite migration error (projects manager_name): ${sqliteErr.message}`);
          }
        }

        // Documents module migrations (SQLite)
        const sqliteDocCols = [
          { name: 'vehicle_number', sql: 'ALTER TABLE documents ADD COLUMN vehicle_number TEXT DEFAULT NULL' },
          { name: 'vehicle_model', sql: 'ALTER TABLE documents ADD COLUMN vehicle_model TEXT DEFAULT NULL' },
          { name: 'vehicle_type', sql: 'ALTER TABLE documents ADD COLUMN vehicle_type TEXT DEFAULT NULL' },
          { name: 'document_category', sql: 'ALTER TABLE documents ADD COLUMN document_category TEXT DEFAULT NULL' },
          { name: 'document_number', sql: 'ALTER TABLE documents ADD COLUMN document_number TEXT DEFAULT NULL' },
          { name: 'issue_date', sql: 'ALTER TABLE documents ADD COLUMN issue_date TEXT DEFAULT NULL' },
          { name: 'expiry_date', sql: 'ALTER TABLE documents ADD COLUMN expiry_date TEXT DEFAULT NULL' },
          { name: 'remarks', sql: 'ALTER TABLE documents ADD COLUMN remarks TEXT DEFAULT NULL' },
          { name: 'original_name', sql: 'ALTER TABLE documents ADD COLUMN original_name TEXT DEFAULT NULL' },
          { name: 'company_name', sql: 'ALTER TABLE documents ADD COLUMN company_name TEXT DEFAULT NULL' },
          { name: 'brand', sql: 'ALTER TABLE documents ADD COLUMN brand TEXT DEFAULT NULL' },
          { name: 'year', sql: 'ALTER TABLE documents ADD COLUMN year INTEGER DEFAULT NULL' },
          { name: 'fuel_type', sql: 'ALTER TABLE documents ADD COLUMN fuel_type TEXT DEFAULT NULL' },
          { name: 'engine_number', sql: 'ALTER TABLE documents ADD COLUMN engine_number TEXT DEFAULT NULL' },
          { name: 'chassis_number', sql: 'ALTER TABLE documents ADD COLUMN chassis_number TEXT DEFAULT NULL' },
          { name: 'operator_name', sql: 'ALTER TABLE documents ADD COLUMN operator_name TEXT DEFAULT NULL' },
          { name: 'insurance_expiry', sql: 'ALTER TABLE documents ADD COLUMN insurance_expiry TEXT DEFAULT NULL' },
          { name: 'fitness_expiry', sql: 'ALTER TABLE documents ADD COLUMN fitness_expiry TEXT DEFAULT NULL' },
          { name: 'pollution_expiry', sql: 'ALTER TABLE documents ADD COLUMN pollution_expiry TEXT DEFAULT NULL' }
        ];
        for (const col of sqliteDocCols) {
          try {
            db.prepare(col.sql).run();
          } catch (sqliteErr) {
            if (!sqliteErr.message?.includes('duplicate column')) {
              console.warn(`  ⚠️ SQLite migration warning (documents ${col.name}): ${sqliteErr.message}`);
            }
          }
        }

        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS project_staff (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id INTEGER NOT NULL,
              staff_name TEXT NOT NULL,
              work_role TEXT DEFAULT NULL,
              joining_date TEXT,
              end_date TEXT,
              salary REAL DEFAULT 0.00,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
          `).run();
          console.log('✓ Verified/Created SQLite project_staff table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (project_staff): ${sqliteErr.message}`);
        }

        // Migration: Add work_role column if it doesn't exist
        try {
          db.prepare(`ALTER TABLE project_staff ADD COLUMN work_role TEXT DEFAULT NULL`).run();
          console.log('✓ Added work_role column to SQLite project_staff table');
        } catch (sqliteAlterErr) {
          if (!sqliteAlterErr.message?.includes('duplicate column')) {
            console.warn(`  ⚠️ SQLite migration warning (project_staff work_role): ${sqliteAlterErr.message}`);
          }
        }

        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS project_vehicles (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id INTEGER NOT NULL,
              vehicle_name TEXT NOT NULL,
              vehicle_number TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
          `).run();
          console.log('✓ Verified/Created SQLite project_vehicles table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (project_vehicles): ${sqliteErr.message}`);
        }

        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS project_expenses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id INTEGER NOT NULL,
              amount REAL NOT NULL,
              description TEXT NOT NULL,
              paid_by TEXT NOT NULL,
              expense_date TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
          `).run();
          console.log('✓ Verified/Created SQLite project_expenses table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (project_expenses): ${sqliteErr.message}`);
        }

        // Project Fuel Entries table
        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS project_fuel_entries (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id INTEGER NOT NULL,
              quantity REAL NOT NULL,
              cost REAL NOT NULL,
              purchased_by TEXT NOT NULL,
              fuel_date TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
          `).run();
          console.log('✓ Verified/Created SQLite project_fuel_entries table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (project_fuel_entries): ${sqliteErr.message}`);
        }

        // Project Staff Expenses table
        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS project_staff_expenses (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id INTEGER NOT NULL,
              staff_name TEXT NOT NULL,
              paid_by TEXT NOT NULL,
              amount REAL NOT NULL,
              expense_date TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
          `).run();
          console.log('✓ Verified/Created SQLite project_staff_expenses table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (project_staff_expenses): ${sqliteErr.message}`);
        }

        // Project Trips table
        try {
          db.prepare(`
            CREATE TABLE IF NOT EXISTS project_trips (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              project_id INTEGER NOT NULL,
              trip_type TEXT NOT NULL,
              trip_date TEXT NOT NULL,
              trip_number TEXT NOT NULL,
              vehicle_number TEXT NOT NULL,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )
          `).run();
          console.log('✓ Verified/Created SQLite project_trips table');
        } catch (sqliteErr) {
          console.warn(`  ⚠️ SQLite migration error (project_trips): ${sqliteErr.message}`);
        }
      }
      
      // Seed default users in SQLite if empty
      const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
      if (userCount.count === 0) {
        console.log('🔄 Seeding default users in SQLite...');
        const adminHash = await bcrypt.hash('Admin@123', 10);
        const userHash = await bcrypt.hash('User@123', 10);
        
        db.prepare(`INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          'ADM001', 'System Administrator', 'admin@roadconstruction.com', adminHash, 'admin', '+1-555-0100', 'Project Director', 'Management', 'active'
        );
        
        db.prepare(`INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
          'EMP001', 'John Engineer', 'user@roadconstruction.com', userHash, 'user', '+1-555-0101', 'Site Engineer', 'Engineering', 'active'
        );
        
        const categories = [
          ['Materials', 'Cost of raw materials and supplies'],
          ['Labor', 'Workforce and contractor costs'],
          ['Equipment', 'Machinery and equipment costs'],
          ['Transportation', 'Logistics and transport costs'],
          ['Permits & Licenses', 'Government fees and permits'],
          ['Administrative', 'Office and administrative expenses'],
          ['Contingency', 'Emergency and contingency funds']
        ];
        
        for (const [name, desc] of categories) {
          db.prepare('INSERT INTO budget_categories (name, description) VALUES (?, ?)').run(name, desc);
        }
        
        console.log('✓ Default SQLite users and data seeded');
      } else {
        console.log(`→ Skipping SQLite seed: ${userCount.count} users already exist`);
      }
      
      console.log('✅ Database initialization complete (SQLite)');
      return true;
    } catch (sqliteInitErr) {
      console.error('❌ Failed to initialize SQLite database fallback:', sqliteInitErr.message);
      return false;
    }
  } finally {
    if (connection) {
      try {
        await connection.end();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
};

module.exports = { initializeDatabase };
