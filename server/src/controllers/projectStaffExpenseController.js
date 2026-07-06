const db = require('../config/db');

const getExpenses = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const entries = await db.query(
      `SELECT * FROM project_staff_expenses WHERE project_id = ? ORDER BY expense_date DESC, id DESC`,
      [projectId]
    );
    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const { project_id, staff_name, paid_by, amount, expense_date } = req.body;

    if (!project_id || !staff_name || !paid_by || !amount || !expense_date) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const result = await db.query(
      `INSERT INTO project_staff_expenses (project_id, staff_name, paid_by, amount, expense_date) VALUES (?, ?, ?, ?, ?)`,
      [project_id, staff_name, paid_by, parseFloat(amount), expense_date]
    );

    res.status(201).json({
      success: true,
      message: 'Staff expense saved successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

const updateExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { staff_name, paid_by, amount, expense_date } = req.body;

    const entries = await db.query('SELECT id FROM project_staff_expenses WHERE id = ?', [id]);
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await db.query(
      `UPDATE project_staff_expenses SET staff_name = ?, paid_by = ?, amount = ?, expense_date = ? WHERE id = ?`,
      [staff_name, paid_by, parseFloat(amount), expense_date, id]
    );

    res.json({ success: true, message: 'Expense record updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entries = await db.query('SELECT id FROM project_staff_expenses WHERE id = ?', [id]);
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense record not found' });
    }

    await db.query('DELETE FROM project_staff_expenses WHERE id = ?', [id]);
    res.json({ success: true, message: 'Expense record deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense
};
