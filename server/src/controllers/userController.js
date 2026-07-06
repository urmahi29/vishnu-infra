const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { generateCode, parsePagination } = require('../utils/helpers');

const getUsers = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { role, status, search } = req.query;

    let whereClause = [];
    let params = [];

    if (role) { whereClause.push('u.role = ?'); params.push(role); }
    if (status) { whereClause.push('u.status = ?'); params.push(status); }
    if (search) { whereClause.push('(u.name LIKE ? OR u.email LIKE ? OR u.employee_id LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const [users, countResult] = await Promise.all([
      db.query(
        `SELECT u.id, u.employee_id, u.name, u.email, u.role, u.phone, u.designation, u.department, 
                u.status, u.last_login_at, u.created_at
         FROM users u
         ${whereStr}
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) as total FROM users u ${whereStr}`, params)
    ]);

    res.json({
      success: true,
      data: users,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getUser = async (req, res, next) => {
  try {
    const users = await db.query(
      'SELECT id, employee_id, name, email, role, phone, designation, department, avatar, address, status, last_login_at, created_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: users[0] });
  } catch (error) {
    next(error);
  }
};

const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, designation, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existing = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const employeeId = generateCode('EMP');

    await db.query(
      'INSERT INTO users (employee_id, name, email, password, role, phone, designation, department) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [employeeId, name, email, hashedPassword, role || 'user', phone || null, designation || null, department || null]
    );

    res.status(201).json({ success: true, message: 'User created successfully' });
  } catch (error) {
    next(error);
  }
};

const updateUser = async (req, res, next) => {
  try {
    const { name, email, role, phone, designation, department, status, password } = req.body;

    let updateFields = [];
    let params = [];

    if (name) { updateFields.push('name = ?'); params.push(name); }
    if (email) { updateFields.push('email = ?'); params.push(email); }
    if (role) { updateFields.push('role = ?'); params.push(role); }
    if (phone !== undefined) { updateFields.push('phone = ?'); params.push(phone); }
    if (designation !== undefined) { updateFields.push('designation = ?'); params.push(designation); }
    if (department !== undefined) { updateFields.push('department = ?'); params.push(department); }
    if (status) { updateFields.push('status = ?'); params.push(status); }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      params.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    params.push(req.params.id);
    await db.query(`UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`, params);

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    const result = await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);

    const [logs, countResult] = await Promise.all([
      db.query(
        `SELECT al.*, u.name as user_name
         FROM audit_logs al
         LEFT JOIN users u ON al.user_id = u.id
         ORDER BY al.created_at DESC
         LIMIT ? OFFSET ?`,
        [limit, offset]
      ),
      db.query('SELECT COUNT(*) as total FROM audit_logs')
    ]);

    res.json({
      success: true,
      data: logs,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getPendingRegistrations = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const status = req.query.status || 'pending';

    const [requests, countResult] = await Promise.all([
      db.query(
        `SELECT id, employee_id, name, email, role, phone, designation, department, created_at, status, rejection_reason
         FROM users
         WHERE status = ?
         ORDER BY created_at DESC
         LIMIT ? OFFSET ?`,
        [status, limit, offset]
      ),
      db.query('SELECT COUNT(*) as total FROM users WHERE status = ?', [status])
    ]);

    res.json({
      success: true,
      data: requests,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getPendingCount = async (req, res, next) => {
  try {
    const result = await db.query("SELECT COUNT(*) as count FROM users WHERE status = 'pending'");
    res.json({
      success: true,
      count: result[0].count
    });
  } catch (error) {
    next(error);
  }
};

const approveRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const users = await db.query('SELECT status FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    await db.query("UPDATE users SET status = 'active', rejection_reason = NULL WHERE id = ?", [id]);
    
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'approve_registration', 'user', id]
    );
    
    res.json({ success: true, message: 'User approved successfully.' });
  } catch (error) {
    next(error);
  }
};

const rejectRegistration = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;
    
    const users = await db.query('SELECT status FROM users WHERE id = ?', [id]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    await db.query("UPDATE users SET status = 'rejected', rejection_reason = ? WHERE id = ?", [rejectionReason || null, id]);
    
    await db.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'reject_registration', 'user', id, JSON.stringify({ rejection_reason: rejectionReason || null })]
    );
    
    res.json({ success: true, message: 'User registration rejected.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
  getAuditLogs,
  getPendingRegistrations,
  getPendingCount,
  approveRegistration,
  rejectRegistration
};
