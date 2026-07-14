const db = require('../config/db');

// Dashboard KPIs
const getDashboardKPIs = async (req, res, next) => {
  try {
    const useSqlite = db.getUseSqlite();
    const workforceQuery = useSqlite
      ? `SELECT 
          COUNT(*) as total_workers,
          SUM(CASE WHEN end_date IS NULL OR end_date >= date('now') THEN 1 ELSE 0 END) as active_workers
         FROM project_staff`
      : `SELECT 
          COUNT(*) as total_workers,
          SUM(CASE WHEN end_date IS NULL OR end_date >= CURDATE() THEN 1 ELSE 0 END) as active_workers
         FROM project_staff`;

    const [projectStats, taskStats, equipmentStats, workforceStats, financialStats] = await Promise.all([
      db.query(`SELECT 
        COUNT(*) as total_projects,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as active_projects,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_projects,
        SUM(CASE WHEN status = 'on_hold' THEN 1 ELSE 0 END) as on_hold_projects,
        COALESCE(SUM(total_budget), 0) as total_budget
       FROM projects`),
      db.query(`SELECT 
        COUNT(*) as total_tasks,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo_tasks,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_tasks,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
       FROM tasks`),
      db.query(`SELECT 
        COUNT(*) as total_equipment,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as under_maintenance
       FROM equipment`),
      db.query(workforceQuery),
      db.query(`SELECT 
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'approved' THEN amount ELSE 0 END), 0) as total_expenses,
        COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income
       FROM (
         SELECT 'expense' as type, amount, status FROM expenses
         UNION ALL
         SELECT 'income', amount_paid, 'approved' FROM invoice_payments ip JOIN invoices i ON ip.invoice_id = i.id
       ) as fin`)
    ]);

    res.json({
      success: true,
      data: {
        projects: projectStats[0],
        tasks: taskStats[0],
        equipment: equipmentStats[0],
        workforce: workforceStats[0],
        finances: financialStats[0]
      }
    });
  } catch (error) {
    next(error);
  }
};

// Project Status Distribution
const getProjectStatusDistribution = async (req, res, next) => {
  try {
    const data = await db.query(
      `SELECT status, COUNT(*) as count, COALESCE(SUM(total_budget), 0) as total_budget
       FROM projects GROUP BY status`
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Monthly Expenses
const getMonthlyExpenses = async (req, res, next) => {
  try {
    const year = req.query.year || new Date().getFullYear();
    const useSqlite = db.getUseSqlite();
    let queryStr;

    if (useSqlite) {
      queryStr = `SELECT 
        CAST(strftime('%m', expense_date) AS INTEGER) as month,
        category,
        COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE strftime('%Y', expense_date) = ? AND status = 'approved'
       GROUP BY strftime('%m', expense_date), category
       ORDER BY month`;
    } else {
      queryStr = `SELECT 
        MONTH(expense_date) as month,
        category,
        COALESCE(SUM(amount), 0) as total
       FROM expenses WHERE YEAR(expense_date) = ? AND status = 'approved'
       GROUP BY MONTH(expense_date), category
       ORDER BY month`;
    }

    const data = await db.query(queryStr, [year]);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Equipment Utilization
const getEquipmentUtilization = async (req, res, next) => {
  try {
    const data = await db.query(
      `SELECT type, 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'in_use' THEN 1 ELSE 0 END) as in_use,
        SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) as available,
        SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) as maintenance
       FROM equipment
       GROUP BY type`
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getWorkforceDistribution = async (req, res, next) => {
  try {
    const useSqlite = db.getUseSqlite();
    const activeCondition = useSqlite
      ? "(ps.end_date IS NULL OR ps.end_date >= date('now'))"
      : "(ps.end_date IS NULL OR ps.end_date >= CURDATE())";

    const [byType, byDesignation, byProject] = await Promise.all([
      db.query(useSqlite
        ? "SELECT 'Contract' as worker_type, COUNT(*) as count FROM project_staff ps WHERE ps.end_date IS NULL OR ps.end_date >= date('now')"
        : "SELECT 'Contract' as worker_type, COUNT(*) as count FROM project_staff ps WHERE ps.end_date IS NULL OR ps.end_date >= CURDATE()"
      ),
      db.query(useSqlite
        ? "SELECT ps.work_role as designation, COUNT(*) as count FROM project_staff ps WHERE ps.end_date IS NULL OR ps.end_date >= date('now') GROUP BY ps.work_role"
        : "SELECT ps.work_role as designation, COUNT(*) as count FROM project_staff ps WHERE ps.end_date IS NULL OR ps.end_date >= CURDATE() GROUP BY ps.work_role"
      ),
      db.query(useSqlite
        ? `SELECT p.project_name as project_name, COUNT(ps.id) as count FROM project_staff ps JOIN projects p ON ps.project_id = p.id WHERE ${activeCondition} GROUP BY p.project_name`
        : `SELECT p.name as project_name, COUNT(ps.id) as count FROM project_staff ps JOIN projects p ON ps.project_id = p.id WHERE ${activeCondition} GROUP BY p.name`
      )
    ]);

    res.json({ success: true, data: { by_type: byType, by_designation: byDesignation, by_project: byProject } });
  } catch (error) {
    next(error);
  }
};

// Budget vs Actual Report
const getBudgetVsActual = async (req, res, next) => {
  try {
    const data = await db.query(
      `SELECT p.id, p.name as project_name, p.total_budget,
        COALESCE(SUM(bi.approved_amount), 0) as total_approved,
        COALESCE(SUM(bi.spent_amount), 0) as total_spent,
        (COALESCE(SUM(bi.approved_amount), 0) - COALESCE(SUM(bi.spent_amount), 0)) as remaining,
        CASE WHEN COALESCE(SUM(bi.approved_amount), 0) > 0 
          THEN ROUND((COALESCE(SUM(bi.spent_amount), 0) / COALESCE(SUM(bi.approved_amount), 0)) * 100, 2) 
          ELSE 0 END as utilization_percentage
       FROM projects p
       LEFT JOIN budget_items bi ON p.id = bi.project_id
       GROUP BY p.id
       ORDER BY utilization_percentage DESC`
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// Safety Report
const getSafetyReport = async (req, res, next) => {
  try {
    const [incidentsBySeverity, incidentsByType, recentIncidents] = await Promise.all([
      db.query('SELECT severity, COUNT(*) as count FROM safety_incidents GROUP BY severity'),
      db.query('SELECT type, COUNT(*) as count FROM safety_incidents GROUP BY type'),
      db.query(
        `SELECT si.*, p.name as project_name, u.name as reported_by_name
         FROM safety_incidents si
         LEFT JOIN projects p ON si.project_id = p.id
         LEFT JOIN users u ON si.reported_by = u.id
         ORDER BY si.created_at DESC LIMIT 10`
      )
    ]);

    res.json({ success: true, data: { by_severity: incidentsBySeverity, by_type: incidentsByType, recent: recentIncidents } });
  } catch (error) {
    next(error);
  }
};

// Export Report (CSV)
const getExportReport = async (req, res, next) => {
  try {
    const { type } = req.params;
    let data, headers, rows;

    switch (type) {
      case 'projects':
        data = await db.query(
          'SELECT project_code, name, project_type, location, status, priority, total_budget, completion_percentage, start_date, expected_end_date FROM projects'
        );
        headers = ['Code', 'Name', 'Type', 'Location', 'Status', 'Priority', 'Budget', 'Completion %', 'Start Date', 'End Date'];
        rows = data.map(r => [r.project_code, r.name, r.project_type, r.location, r.status, r.priority, r.total_budget, r.completion_percentage, r.start_date, r.expected_end_date]);
        break;
      case 'expenses':
        data = await db.query(
          'SELECT e.expense_code, e.description, e.amount, e.expense_date, e.category, e.status, p.name as project FROM expenses e LEFT JOIN projects p ON e.project_id = p.id'
        );
        headers = ['Code', 'Description', 'Amount', 'Date', 'Category', 'Status', 'Project'];
        rows = data.map(r => [r.expense_code, r.description, r.amount, r.expense_date, r.category, r.status, r.project]);
        break;
      default:
        return res.status(400).json({ success: false, message: 'Invalid report type' });
    }

    // Build CSV
    const csvHeader = headers.join(',');
    const csvRows = rows.map(r => r.map(v => `"${v || ''}"`).join(','));
    const csv = [csvHeader, ...csvRows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report.csv`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardKPIs,
  getProjectStatusDistribution,
  getMonthlyExpenses,
  getEquipmentUtilization,
  getWorkforceDistribution,
  getBudgetVsActual,
  getSafetyReport,
  getExportReport
};
