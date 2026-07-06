const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const seed = async () => {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root123',
    multipleStatements: true
  });

  try {
    console.log('📦 Setting up database schema...');
    
    // Read and execute init.sql (without the seed INSERT statements)
    const initSql = fs.readFileSync(path.join(__dirname, '../init.sql'), 'utf8');
    
    // Split and execute schema first (everything before seed INSERT)
    const schemaEnd = initSql.lastIndexOf('-- ============================================================');
    const schemaPart = initSql.substring(0, schemaEnd);
    
    await connection.query(schemaPart);
    console.log('✓ Schema created');
    
    // Now seed users with programmatically generated hashes
    await connection.query('USE road_construction_erp');
    
    const adminHash = await bcrypt.hash('Admin@123', 10);
    const userHash = await bcrypt.hash('User@123', 10);
    
    // Check if users already exist
    const [existing] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    if (existing[0].count === 0) {
      await connection.query(
        `INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['ADM001', 'System Administrator', 'admin@roadconstruction.com', adminHash, 'admin', '+1-555-0100', 'Project Director', 'Management', 'active']
      );
      
      await connection.query(
        `INSERT INTO users (employee_id, name, email, password, role, phone, designation, department, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ['EMP001', 'John Engineer', 'user@roadconstruction.com', userHash, 'user', '+1-555-0101', 'Site Engineer', 'Engineering', 'active']
      );
      
      // Insert budget categories
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
        await connection.query('INSERT INTO budget_categories (name, description) VALUES (?, ?)', [name, desc]);
      }
      
      console.log('✓ Seed users and data created');
    } else {
      console.log('→ Users already exist, skipping seed');
    }
    
    console.log('\n✅ Database setup complete!');
    console.log('\n🔑 Default Login Credentials:');
    console.log('   Admin: admin@roadconstruction.com / Admin@123');
    console.log('   User:  user@roadconstruction.com / User@123');
    console.log('\n🚀 Start the server with: npm run dev');
    console.log('   Or with Docker: docker-compose up');

  } catch (error) {
    console.error('❌ Seed error:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
    process.exit(0);
  }
};

seed();
