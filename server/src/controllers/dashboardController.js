const db = require('../config/db');

const getAdminDashboard = async (req, res, next) => {
  try {
    const useSqlite = db.getUseSqlite();
    let summaryQuery, upcomingMaintQuery;

    if (useSqlite) {
      summaryQuery = `SELECT
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'in_progress') as active_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'completed') as completed_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'on_hold') as on_hold_projects,
        (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM equipment WHERE status = 'maintenance') as equipment_in_maintenance,
        (SELECT COUNT(*) FROM workforce WHERE status = 'active') as active_workers,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE status = 'approved' AND strftime('%Y-%m', expense_date) = strftime('%Y-%m', 'now')) as monthly_expenses,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'paid' AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')) as monthly_revenue
      `;
      upcomingMaintQuery = `SELECT id, name, equipment_code, next_maintenance_date FROM equipment WHERE next_maintenance_date IS NOT NULL AND next_maintenance_date <= date('now', '+30 days') ORDER BY next_maintenance_date ASC LIMIT 5`;
    } else {
      summaryQuery = `SELECT
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'in_progress') as active_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'completed') as completed_projects,
        (SELECT COUNT(*) FROM projects WHERE status = 'on_hold') as on_hold_projects,
        (SELECT COUNT(*) FROM tasks WHERE status != 'completed') as pending_tasks,
        (SELECT COUNT(*) FROM tasks WHERE status = 'completed') as completed_tasks,
        (SELECT COUNT(*) FROM equipment WHERE status = 'maintenance') as equipment_in_maintenance,
        (SELECT COUNT(*) FROM workforce WHERE status = 'active') as active_workers,
        (SELECT COALESCE(SUM(amount), 0) FROM expenses WHERE status = 'approved' AND MONTH(expense_date) = MONTH(CURDATE()) AND YEAR(expense_date) = YEAR(CURDATE())) as monthly_expenses,
        (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'paid' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())) as monthly_revenue
      `;
      upcomingMaintQuery = `SELECT id, name, equipment_code, next_maintenance_date FROM equipment WHERE next_maintenance_date IS NOT NULL AND next_maintenance_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) ORDER BY next_maintenance_date ASC LIMIT 5`;
    }

    const [summary, recentProjects, recentTasks, upcomingMaintenance, recentExpenses, topWorkers] = await Promise.all([
      db.query(summaryQuery),
      db.query('SELECT id, project_code, name, status, priority, completion_percentage, created_at FROM projects ORDER BY created_at DESC LIMIT 5'),
      db.query("SELECT t.id, t.title, t.status, t.priority, t.due_date, p.name as project_name FROM tasks t LEFT JOIN projects p ON t.project_id = p.id WHERE t.status != 'completed' ORDER BY t.due_date ASC LIMIT 10"),
      db.query(upcomingMaintQuery),
      db.query("SELECT e.id, e.description, e.amount, e.expense_date, e.category, p.name as project_name FROM expenses e LEFT JOIN projects p ON e.project_id = p.id WHERE e.status = 'approved' ORDER BY e.expense_date DESC LIMIT 5"),
      db.query("SELECT w.id, w.name, w.designation, w.worker_type, p.name as project_name FROM workforce w LEFT JOIN projects p ON w.current_project_id = p.id WHERE w.status = 'active' ORDER BY w.id ASC LIMIT 5")
    ]);

    res.json({
      success: true,
      data: {
        summary: summary[0],
        recent_projects: recentProjects,
        pending_tasks: recentTasks,
        upcoming_maintenance: upcomingMaintenance,
        recent_expenses: recentExpenses,
        top_workers: topWorkers
      }
    });
  } catch (error) {
    next(error);
  }
};

const getUserDashboard = async (req, res, next) => {
  try {
    const useSqlite = db.getUseSqlite();

    let summaryQuery;
    if (useSqlite) {
      summaryQuery = `SELECT
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM project_vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM project_staff) as total_workers,
        (SELECT COUNT(*) FROM project_fuel_entries) as total_fuel_entries,
        (SELECT COUNT(*) FROM project_expenses) as total_budget_entries,
        (SELECT COUNT(*) FROM project_trips) as total_trips,
        (SELECT COUNT(*) FROM documents) as total_documents
      `;
    } else {
      summaryQuery = `SELECT
        (SELECT COUNT(*) FROM projects) as total_projects,
        (SELECT COUNT(*) FROM project_vehicles) as total_vehicles,
        (SELECT COUNT(*) FROM project_staff) as total_workers,
        (SELECT COUNT(*) FROM project_fuel_entries) as total_fuel_entries,
        (SELECT COUNT(*) FROM project_expenses) as total_budget_entries,
        (SELECT COUNT(*) FROM project_trips) as total_trips,
        (SELECT COUNT(*) FROM documents) as total_documents
      `;
    }

    const [summaryResult, recentProjects, recentFuelEntries, recentBudgetEntries, recentTrips, recentDocuments] = await Promise.all([
      db.query(summaryQuery),
      db.query(useSqlite
        ? "SELECT id, project_name AS name, manager_name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 5"
        : "SELECT id, name, manager_name, status, created_at FROM projects ORDER BY created_at DESC LIMIT 5"
      ),
      db.query(useSqlite
        ? "SELECT fe.id, fe.quantity, fe.cost, fe.purchased_by, fe.fuel_date, p.project_name as project_name FROM project_fuel_entries fe LEFT JOIN projects p ON fe.project_id = p.id ORDER BY fe.fuel_date DESC LIMIT 5"
        : "SELECT fe.id, fe.quantity, fe.cost, fe.purchased_by, fe.fuel_date, p.name as project_name FROM project_fuel_entries fe LEFT JOIN projects p ON fe.project_id = p.id ORDER BY fe.fuel_date DESC LIMIT 5"
      ),
      db.query(useSqlite
        ? "SELECT e.id, e.amount, e.description, e.paid_by, e.expense_date, p.project_name as project_name FROM project_expenses e LEFT JOIN projects p ON e.project_id = p.id ORDER BY e.expense_date DESC LIMIT 5"
        : "SELECT e.id, e.amount, e.description, e.paid_by, e.expense_date, p.name as project_name FROM project_expenses e LEFT JOIN projects p ON e.project_id = p.id ORDER BY e.expense_date DESC LIMIT 5"
      ),
      db.query(useSqlite
        ? "SELECT t.id, t.trip_type, t.trip_date, t.trip_number, t.vehicle_number, p.project_name as project_name FROM project_trips t LEFT JOIN projects p ON t.project_id = p.id ORDER BY t.trip_date DESC LIMIT 5"
        : "SELECT t.id, t.trip_type, t.trip_date, t.trip_number, t.vehicle_number, p.name as project_name FROM project_trips t LEFT JOIN projects p ON t.project_id = p.id ORDER BY t.trip_date DESC LIMIT 5"
      ),
      db.query(useSqlite
        ? "SELECT d.id, d.title, d.document_type, d.file_path, d.file_size, d.created_at, p.project_name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id ORDER BY d.created_at DESC LIMIT 5"
        : "SELECT d.id, d.title, d.document_type, d.file_path, d.file_size, d.created_at, p.name as project_name FROM documents d LEFT JOIN projects p ON d.project_id = p.id ORDER BY d.created_at DESC LIMIT 5"
      )
    ]);

    res.json({
      success: true,
      data: {
        summary: summaryResult[0],
        recent_projects: recentProjects,
        recent_fuel_entries: recentFuelEntries,
        recent_budget_entries: recentBudgetEntries,
        recent_trips: recentTrips,
        recent_documents: recentDocuments
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminDashboard,
  getUserDashboard
};
