const db = require('../config/db');
const { generateCode, parsePagination } = require('../utils/helpers');

const getWorkforce = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, worker_type, project_id, designation, search } = req.query;

    let whereClause = [];
    let params = [];

    if (status) { whereClause.push('w.status = ?'); params.push(status); }
    if (worker_type) { whereClause.push('w.worker_type = ?'); params.push(worker_type); }
    if (project_id) { whereClause.push('w.current_project_id = ?'); params.push(project_id); }
    if (designation) { whereClause.push('w.designation = ?'); params.push(designation); }
    if (search) { whereClause.push('(w.name LIKE ? OR w.worker_code LIKE ? OR w.phone LIKE ? OR w.email LIKE ?)'); params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const [workers, countResult] = await Promise.all([
      db.query(
        `SELECT w.*, p.name as project_name, ws.name as supervisor_name
         FROM workforce w
         LEFT JOIN projects p ON w.current_project_id = p.id
         LEFT JOIN workforce ws ON w.supervisor_id = ws.id
         ${whereStr}
         ORDER BY w.name ASC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) as total FROM workforce w ${whereStr}`, params)
    ]);

    res.json({
      success: true,
      data: workers,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getWorker = async (req, res, next) => {
  try {
    const [workers, attendance, payrolls] = await Promise.all([
      db.query(
        `SELECT w.*, p.name as project_name, ws.name as supervisor_name
         FROM workforce w
         LEFT JOIN projects p ON w.current_project_id = p.id
         LEFT JOIN workforce ws ON w.supervisor_id = ws.id
         WHERE w.id = ?`,
        [req.params.id]
      ),
      db.query('SELECT * FROM attendance WHERE worker_id = ? ORDER BY attendance_date DESC LIMIT 30', [req.params.id]),
      db.query('SELECT * FROM payroll WHERE worker_id = ? ORDER BY payroll_month DESC LIMIT 12', [req.params.id])
    ]);

    if (workers.length === 0) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    // Get attendance stats
    const useSqlite = db.getUseSqlite();
    let statsQuery;
    if (useSqlite) {
      statsQuery = `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'overtime' THEN 1 ELSE 0 END) as overtime_days
       FROM attendance WHERE worker_id = ? AND strftime('%Y-%m', attendance_date) = strftime('%Y-%m', 'now')`;
    } else {
      statsQuery = `SELECT 
        COUNT(*) as total_days,
        SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
        SUM(CASE WHEN status = 'absent' THEN 1 ELSE 0 END) as absent_days,
        SUM(CASE WHEN status = 'overtime' THEN 1 ELSE 0 END) as overtime_days
       FROM attendance WHERE worker_id = ? AND MONTH(attendance_date) = MONTH(CURDATE()) AND YEAR(attendance_date) = YEAR(CURDATE())`;
    }
    const stats = await db.query(statsQuery, [req.params.id]);

    res.json({ success: true, data: { ...workers[0], attendance, payrolls, attendance_stats: stats[0] } });
  } catch (error) {
    next(error);
  }
};

const createWorker = async (req, res, next) => {
  try {
    const { name, email, phone, emergency_contact, address, city, state, date_of_birth, gender, designation, department, worker_type, skill_set, experience_years, qualification, avatar, pan_number, current_project_id, supervisor_id, date_of_joining, leaving_date, basic_salary, hourly_rate, bank_name, bank_account, ifsc_code, aadhar_number, notes } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required' });
    }

    const workerCode = generateCode('WRK');

    const result = await db.query(
      `INSERT INTO workforce (worker_code, name, email, phone, emergency_contact, address, city, state, date_of_birth, gender, designation, department, worker_type, skill_set, experience_years, qualification, avatar, pan_number, current_project_id, supervisor_id, date_of_joining, leaving_date, basic_salary, hourly_rate, bank_name, bank_account, ifsc_code, aadhar_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [workerCode, name, email || null, phone, emergency_contact || null, address || null, city || null, state || null, date_of_birth || null, gender || 'male', designation || null, department || null, worker_type || 'contract', skill_set || null, experience_years || 0, qualification || null, avatar || null, pan_number || null, current_project_id || null, supervisor_id || null, date_of_joining || null, leaving_date || null, basic_salary || 0, hourly_rate || 0, bank_name || null, bank_account || null, ifsc_code || null, aadhar_number || null, notes || null]
    );

    res.status(201).json({ success: true, message: 'Employee added successfully', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const updateWorker = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'email', 'phone', 'emergency_contact', 'address', 'city', 'state', 'designation', 'department', 'worker_type', 'skill_set', 'experience_years', 'qualification', 'avatar', 'pan_number', 'current_project_id', 'supervisor_id', 'date_of_joining', 'leaving_date', 'basic_salary', 'hourly_rate', 'bank_name', 'bank_account', 'ifsc_code', 'status', 'notes'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(req.params.id);
    await db.query(`UPDATE workforce SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ success: true, message: 'Worker updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteWorker = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM workforce WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }
    res.json({ success: true, message: 'Worker deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Attendance
const markAttendance = async (req, res, next) => {
  try {
    const { worker_id, attendance_date, check_in, check_out, status, notes } = req.body;

    if (!worker_id) {
      return res.status(400).json({ success: false, message: 'Worker ID is required' });
    }

    const hoursWorked = check_in && check_out ? 
      (new Date(`2000-01-01T${check_out}`) - new Date(`2000-01-01T${check_in}`)) / (1000 * 60 * 60) : null;

    // Upsert attendance
    await db.query(
      `INSERT INTO attendance (worker_id, attendance_date, check_in, check_out, hours_worked, status, notes, marked_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE check_in = COALESCE(?, check_in), check_out = COALESCE(?, check_out),
       hours_worked = COALESCE(?, hours_worked), status = COALESCE(?, status), notes = COALESCE(?, notes)`,
      [worker_id, attendance_date || new Date(), check_in || null, check_out || null, hoursWorked, status || 'present', notes || null, req.user.id, check_in, check_out, hoursWorked, status, notes]
    );

    res.json({ success: true, message: 'Attendance marked successfully' });
  } catch (error) {
    next(error);
  }
};

// Payroll
const processPayroll = async (req, res, next) => {
  try {
    const { worker_id, payroll_month } = req.body;

    if (!worker_id || !payroll_month) {
      return res.status(400).json({ success: false, message: 'Worker ID and payroll month are required' });
    }

    // Get worker salary info
    const workers = await db.query('SELECT basic_salary, hourly_rate FROM workforce WHERE id = ?', [worker_id]);
    if (workers.length === 0) {
      return res.status(404).json({ success: false, message: 'Worker not found' });
    }

    const worker = workers[0];

    // Get attendance for the month
    const useSqlite = db.getUseSqlite();
    let attendanceQuery;
    let attendanceParams = [worker_id, payroll_month, payroll_month];
    if (useSqlite) {
      attendanceQuery = `SELECT SUM(hours_worked) as total_hours,
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
       SUM(CASE WHEN status = 'overtime' THEN overtime_hours ELSE 0 END) as total_overtime
       FROM attendance
       WHERE worker_id = ? AND strftime('%Y-%m', attendance_date) = strftime('%Y-%m', ?)`;
      attendanceParams = [worker_id, payroll_month];
    } else {
      attendanceQuery = `SELECT SUM(hours_worked) as total_hours,
       SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) as present_days,
       SUM(CASE WHEN status = 'overtime' THEN overtime_hours ELSE 0 END) as total_overtime
       FROM attendance
       WHERE worker_id = ? AND MONTH(attendance_date) = MONTH(?) AND YEAR(attendance_date) = YEAR(?)`;
    }
    const attendance = await db.query(attendanceQuery, attendanceParams);

    const att = attendance[0];
    const basicPay = worker.basic_salary || 0;
    const overtimePay = (att.total_overtime || 0) * (worker.hourly_rate * 1.5 || 0);
    const netPay = basicPay + overtimePay;

    // Upsert payroll
    await db.query(
      `INSERT INTO payroll (worker_id, payroll_month, basic_pay, overtime_pay, net_pay, status, processed_by)
       VALUES (?, ?, ?, ?, ?, 'processed', ?)
       ON DUPLICATE KEY UPDATE basic_pay = ?, overtime_pay = ?, net_pay = ?, status = 'processed'`,
      [worker_id, payroll_month, basicPay, overtimePay, netPay, req.user.id, basicPay, overtimePay, netPay]
    );

    res.json({ success: true, message: 'Payroll processed successfully' });
  } catch (error) {
    next(error);
  }
};

// Employee Document Management
const getEmployeeDocuments = async (req, res, next) => {
  try {
    const docs = await db.query(
      `SELECT d.*, u.name as uploaded_by_name
       FROM documents d
       LEFT JOIN users u ON d.uploaded_by = u.id
       WHERE d.workforce_id = ?
       ORDER BY d.created_at DESC`,
      [req.params.employeeId]
    );
    res.json({ success: true, data: docs });
  } catch (error) {
    next(error);
  }
};

const uploadEmployeeDocument = async (req, res, next) => {
  try {
    const { title, document_type, description } = req.body;

    if (!title || !req.file) {
      return res.status(400).json({ success: false, message: 'Title and file are required' });
    }

    const docCode = generateCode('DOC');
    // Store relative path for browser access via /uploads/ static middleware
    const fileUrl = `/uploads/${req.file.filename}`;

    const result = await db.query(
      `INSERT INTO documents (document_code, workforce_id, title, description, document_type, file_path, file_name, file_size, file_type, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [docCode, req.params.employeeId, title, description || null, document_type || 'other', fileUrl, req.file.filename, req.file.size, req.file.mimetype, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: { id: result.insertId, file_path: fileUrl }
    });
  } catch (error) {
    next(error);
  }
};

const deleteEmployeeDocument = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM documents WHERE id = ? AND workforce_id = ?', [req.params.docId, req.params.employeeId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWorkforce,
  getWorker,
  createWorker,
  updateWorker,
  deleteWorker,
  markAttendance,
  processPayroll,
  getEmployeeDocuments,
  uploadEmployeeDocument,
  deleteEmployeeDocument
};
