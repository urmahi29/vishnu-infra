const db = require('../config/db');

// Helper to parse pagination
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const getExpenses = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, category, status, employeeId, startDate, endDate } = req.query;

    let query = `
      SELECT se.*, u.name as employee_name, u.employee_id as employee_code
      FROM staff_expenses se
      LEFT JOIN users u ON se.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (employeeId) {
      query += ` AND se.user_id = ?`;
      params.push(parseInt(employeeId));
    }

    if (category) {
      query += ` AND se.category = ?`;
      params.push(category);
    }

    if (status) {
      query += ` AND se.payment_status = ?`;
      params.push(status);
    }

    if (startDate) {
      query += ` AND se.expense_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND se.expense_date <= ?`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (u.name LIKE ? OR se.description LIKE ? OR se.category LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard);
    }

    // Clone query for counting
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS temp`;
    
    // Add sorting & limit
    query += ` ORDER BY se.expense_date DESC, se.id DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];

    const [expenses, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, params)
    ]);

    const total = countResult[0].total;

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const expenses = await db.query(
      `SELECT se.*, u.name as employee_name, u.employee_id as employee_code
       FROM staff_expenses se
       LEFT JOIN users u ON se.user_id = u.id
       WHERE se.id = ?`,
      [id]
    );

    if (expenses.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    res.json({
      success: true,
      data: expenses[0]
    });
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const { user_id, expense_date, category, amount, payment_status, description } = req.body;

    if (!user_id || !expense_date || !category || !amount) {
      return res.status(400).json({ success: false, message: 'Employee, expense date, category, and amount are required' });
    }

    const result = await db.query(
      `INSERT INTO staff_expenses (user_id, expense_date, category, amount, payment_status, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        expense_date,
        category,
        amount,
        payment_status || 'pending',
        description || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Expense record created successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { user_id, expense_date, category, amount, payment_status, description, rejection_reason } = req.body;

    const expenses = await db.query('SELECT id FROM staff_expenses WHERE id = ?', [id]);
    if (expenses.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await db.query(
      `UPDATE staff_expenses 
       SET user_id = ?, expense_date = ?, category = ?, amount = ?, payment_status = ?, description = ?, rejection_reason = ?
       WHERE id = ?`,
      [
        user_id,
        expense_date,
        category,
        amount,
        payment_status || 'pending',
        description || null,
        rejection_reason || null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Expense record updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const expenses = await db.query('SELECT id FROM staff_expenses WHERE id = ?', [id]);
    if (expenses.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await db.query('DELETE FROM staff_expenses WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Expense record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Reports: Employee-wise summary
const getEmployeeExpenseReport = async (req, res, next) => {
  try {
    const report = await db.query(`
      SELECT 
        u.id as user_id, 
        u.name as employee_name, 
        u.employee_id as employee_code,
        COUNT(se.id) as expense_count,
        SUM(se.amount) as total_amount,
        SUM(CASE WHEN se.payment_status = 'paid' THEN se.amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN se.payment_status = 'pending' THEN se.amount ELSE 0 END) as pending_amount
      FROM users u
      JOIN staff_expenses se ON se.user_id = u.id
      GROUP BY u.id, u.name, u.employee_id
      ORDER BY total_amount DESC
    `);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Reports: Monthly staff expenses summary
const getMonthlyExpenseReport = async (req, res, next) => {
  try {
    const report = await db.query(`
      SELECT 
        strftime('%Y-%m', expense_date) as month,
        COUNT(id) as expense_count,
        SUM(amount) as total_amount
      FROM staff_expenses
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    try {
      const mysqlReport = await db.query(`
        SELECT 
          DATE_FORMAT(expense_date, '%Y-%m') as month,
          COUNT(id) as expense_count,
          SUM(amount) as total_amount
        FROM staff_expenses
        GROUP BY month
        ORDER BY month DESC
        LIMIT 12
      `);
      res.json({
        success: true,
        data: mysqlReport
      });
    } catch (mysqlErr) {
      next(error);
    }
  }
};

module.exports = {
  getExpenses,
  getExpense,
  createExpense,
  updateExpense,
  deleteExpense,
  getEmployeeExpenseReport,
  getMonthlyExpenseReport
};
