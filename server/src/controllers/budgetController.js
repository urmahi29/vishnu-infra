const db = require('../config/db');
const { generateCode, parsePagination } = require('../utils/helpers');

// Budget Items
const getBudgetItems = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    let whereClause = [];
    let params = [];

    if (project_id) { whereClause.push('bi.project_id = ?'); params.push(project_id); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const items = await db.query(
      `SELECT bi.*, bc.name as category_name, p.name as project_name
       FROM budget_items bi
       LEFT JOIN budget_categories bc ON bi.category_id = bc.id
       LEFT JOIN projects p ON bi.project_id = p.id
       ${whereStr}
       ORDER BY bi.created_at DESC`,
      params
    );

    res.json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

const createBudgetItem = async (req, res, next) => {
  try {
    const { project_id, category_id, description, estimated_amount, approved_amount } = req.body;

    if (!project_id || !description) {
      return res.status(400).json({ success: false, message: 'Project ID and description are required' });
    }

    const result = await db.query(
      'INSERT INTO budget_items (project_id, category_id, description, estimated_amount, approved_amount) VALUES (?, ?, ?, ?, ?)',
      [project_id, category_id || null, description, estimated_amount || 0, approved_amount || 0]
    );

    // Update project allocated budget
    await db.query('UPDATE projects SET allocated_budget = allocated_budget + ? WHERE id = ?', [approved_amount || estimated_amount || 0, project_id]);

    res.status(201).json({ success: true, message: 'Budget item created', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const updateBudgetItem = async (req, res, next) => {
  try {
    const { description, estimated_amount, approved_amount, status, notes } = req.body;
    await db.query(
      `UPDATE budget_items SET description = COALESCE(?, description), estimated_amount = COALESCE(?, estimated_amount),
       approved_amount = COALESCE(?, approved_amount), status = COALESCE(?, status), notes = COALESCE(?, notes)
       WHERE id = ?`,
      [description, estimated_amount, approved_amount, status, notes, req.params.id]
    );

    res.json({ success: true, message: 'Budget item updated' });
  } catch (error) {
    next(error);
  }
};

// Expenses
const getExpenses = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { project_id, category, status } = req.query;

    let whereClause = [];
    let params = [];

    if (project_id) { whereClause.push('e.project_id = ?'); params.push(project_id); }
    if (category) { whereClause.push('e.category = ?'); params.push(category); }
    if (status) { whereClause.push('e.status = ?'); params.push(status); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const [expenses, countResult] = await Promise.all([
      db.query(
        `SELECT e.*, p.name as project_name, u.name as created_by_name, u2.name as approved_by_name
         FROM expenses e
         LEFT JOIN projects p ON e.project_id = p.id
         LEFT JOIN users u ON e.created_by = u.id
         LEFT JOIN users u2 ON e.approved_by = u2.id
         ${whereStr}
         ORDER BY e.expense_date DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) as total, COALESCE(SUM(amount), 0) as total_amount FROM expenses e ${whereStr}`, params)
    ]);

    res.json({
      success: true,
      data: expenses,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      },
      summary: { total_amount: countResult[0].total_amount }
    });
  } catch (error) {
    next(error);
  }
};

const createExpense = async (req, res, next) => {
  try {
    const { project_id, budget_item_id, description, amount, expense_date, category, payment_method, paid_to, bill_reference, notes } = req.body;

    if (!description || !amount || !category) {
      return res.status(400).json({ success: false, message: 'Description, amount, and category are required' });
    }

    const expenseCode = generateCode('EXP');

    const result = await db.query(
      'INSERT INTO expenses (project_id, budget_item_id, expense_code, description, amount, expense_date, category, payment_method, paid_to, bill_reference, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [project_id || null, budget_item_id || null, expenseCode, description, amount, expense_date || new Date(), category, payment_method || 'bank_transfer', paid_to || null, bill_reference || null, notes || null, req.user.id]
    );

    // Update budget item spent amount if linked
    if (budget_item_id) {
      await db.query('UPDATE budget_items SET spent_amount = spent_amount + ? WHERE id = ?', [amount, budget_item_id]);
    }

    res.status(201).json({ success: true, message: 'Expense recorded', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const updateExpenseStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }

    await db.query('UPDATE expenses SET status = ?, approved_by = ? WHERE id = ?', [status, req.user.id, req.params.id]);

    res.json({ success: true, message: `Expense ${status}` });
  } catch (error) {
    next(error);
  }
};

// Invoices
const getInvoices = async (req, res, next) => {
  try {
    const { status, project_id } = req.query;
    let whereClause = [];
    let params = [];

    if (status) { whereClause.push('i.status = ?'); params.push(status); }
    if (project_id) { whereClause.push('i.project_id = ?'); params.push(project_id); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const useSqlite = db.getUseSqlite();
    const dateDiffExpr = useSqlite 
      ? `CAST(julianday(i.due_date) - julianday('now') AS INTEGER) as days_until_due`
      : `DATEDIFF(i.due_date, CURDATE()) as days_until_due`;

    const invoices = await db.query(
      `SELECT i.*, p.name as project_name,
       (i.total_amount - i.amount_paid) as balance_due,
       ${dateDiffExpr}
       FROM invoices i
       LEFT JOIN projects p ON i.project_id = p.id
       ${whereStr}
       ORDER BY i.created_at DESC`,
      params
    );

    res.json({ success: true, data: invoices });
  } catch (error) {
    next(error);
  }
};

const createInvoice = async (req, res, next) => {
  try {
    const { project_id, client_name, invoice_date, due_date, subtotal, tax_percentage, notes } = req.body;

    if (!client_name || !subtotal) {
      return res.status(400).json({ success: false, message: 'Client name and subtotal are required' });
    }

    const invoiceNumber = generateCode('INV');
    const taxAmount = subtotal * (tax_percentage || 0) / 100;
    const totalAmount = subtotal + taxAmount;

    const result = await db.query(
      'INSERT INTO invoices (invoice_number, project_id, client_name, invoice_date, due_date, subtotal, tax_percentage, tax_amount, total_amount, balance, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [invoiceNumber, project_id || null, client_name, invoice_date || new Date(), due_date || new Date(), subtotal, tax_percentage || 0, taxAmount, totalAmount, totalAmount, notes || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Invoice created', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const recordPayment = async (req, res, next) => {
  try {
    const { amount, payment_date, payment_method, reference_number, notes } = req.body;

    if (!amount || !payment_method) {
      return res.status(400).json({ success: false, message: 'Amount and payment method are required' });
    }

    // Record payment
    await db.query(
      'INSERT INTO invoice_payments (invoice_id, amount, payment_date, payment_method, reference_number, notes, received_by) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.params.invoiceId, amount, payment_date || new Date(), payment_method, reference_number || null, notes || null, req.user.id]
    );

    // Update invoice
    await db.query(
      'UPDATE invoices SET amount_paid = amount_paid + ?, balance = total_amount - (amount_paid + ?) WHERE id = ?',
      [amount, amount, req.params.invoiceId]
    );

    // Check if fully paid
    const invoice = await db.query('SELECT total_amount, amount_paid FROM invoices WHERE id = ?', [req.params.invoiceId]);
    if (invoice[0].amount_paid >= invoice[0].total_amount) {
      await db.query("UPDATE invoices SET status = 'paid' WHERE id = ?", [req.params.invoiceId]);
    } else {
      await db.query("UPDATE invoices SET status = 'partial' WHERE id = ?", [req.params.invoiceId]);
    }

    res.json({ success: true, message: 'Payment recorded successfully' });
  } catch (error) {
    next(error);
  }
};

// Budget summary for a project
const getBudgetSummary = async (req, res, next) => {
  try {
    const projectId = req.params.projectId;

    const summary = await db.query(
      `SELECT 
        COUNT(*) as total_items,
        COALESCE(SUM(estimated_amount), 0) as total_estimated,
        COALESCE(SUM(approved_amount), 0) as total_approved,
        COALESCE(SUM(spent_amount), 0) as total_spent,
        COALESCE(SUM(approved_amount) - SUM(spent_amount), 0) as remaining
       FROM budget_items WHERE project_id = ?`,
      [projectId]
    );

    const categoryBreakdown = await db.query(
      `SELECT bc.name as category, COALESCE(SUM(bi.approved_amount), 0) as approved, COALESCE(SUM(bi.spent_amount), 0) as spent
       FROM budget_items bi
       LEFT JOIN budget_categories bc ON bi.category_id = bc.id
       WHERE bi.project_id = ?
       GROUP BY bc.name`,
      [projectId]
    );

    res.json({ success: true, data: { ...summary[0], category_breakdown: categoryBreakdown } });
  } catch (error) {
    next(error);
  }
};

// Project Expenses CRUD
const getProjectExpenses = async (req, res, next) => {
  try {
    const { project_id } = req.query;
    if (!project_id) {
      return res.status(400).json({ success: false, message: 'Project ID is required' });
    }
    const expenses = await db.query(
      'SELECT * FROM project_expenses WHERE project_id = ? ORDER BY expense_date DESC, id DESC',
      [project_id]
    );
    res.json({ success: true, data: expenses });
  } catch (error) {
    next(error);
  }
};

const createProjectExpense = async (req, res, next) => {
  try {
    const { project_id, amount, description, paid_by, expense_date } = req.body;
    if (!project_id || amount === undefined || !description || !paid_by || !expense_date) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const result = await db.query(
      'INSERT INTO project_expenses (project_id, amount, description, paid_by, expense_date) VALUES (?, ?, ?, ?, ?)',
      [project_id, amount, description, paid_by, expense_date]
    );
    res.status(201).json({
      success: true,
      message: 'Expense saved successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

const updateProjectExpense = async (req, res, next) => {
  try {
    const { amount, description, paid_by, expense_date } = req.body;
    if (amount === undefined || !description || !paid_by || !expense_date) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }
    const result = await db.query(
      'UPDATE project_expenses SET amount = ?, description = ?, paid_by = ?, expense_date = ? WHERE id = ?',
      [amount, description, paid_by, expense_date, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteProjectExpense = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM project_expenses WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBudgetItems,
  createBudgetItem,
  updateBudgetItem,
  getExpenses,
  createExpense,
  updateExpenseStatus,
  getInvoices,
  createInvoice,
  recordPayment,
  getBudgetSummary,
  getProjectExpenses,
  createProjectExpense,
  updateProjectExpense,
  deleteProjectExpense
};
