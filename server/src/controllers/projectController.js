const db = require('../config/db');
const { generateCode } = require('../utils/helpers');

// --- Projects CRUD ---

// Get all projects
const getProjects = async (req, res, next) => {
  try {
    const projects = await db.query(
      'SELECT *, COALESCE(project_name, name) as name, COALESCE(project_name, name) as project_name FROM projects ORDER BY created_at DESC'
    );
    
    res.json({
      success: true,
      data: projects,
      pagination: {
        page: 1,
        limit: projects.length,
        total: projects.length,
        totalPages: 1
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get single project with details
const getProject = async (req, res, next) => {
  try {
    const projects = await db.query(
      'SELECT *, COALESCE(project_name, name) as name, COALESCE(project_name, name) as project_name FROM projects WHERE id = ?',
      [req.params.id]
    );

    if (projects.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    // Get staff and vehicles
    const [staff, vehicles] = await Promise.all([
      db.query('SELECT * FROM project_staff WHERE project_id = ? ORDER BY created_at DESC', [req.params.id]),
      db.query('SELECT * FROM project_vehicles WHERE project_id = ? ORDER BY created_at DESC', [req.params.id])
    ]);

    res.json({
      success: true,
      data: {
        ...projects[0],
        staff,
        vehicles
      }
    });
  } catch (error) {
    next(error);
  }
};

// Create project
const createProject = async (req, res, next) => {
  try {
    const { project_name, manager_name } = req.body;

    if (!project_name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }
    if (!manager_name) {
      return res.status(400).json({ success: false, message: 'Manager name is required' });
    }

    const projectCode = generateCode('PRJ');

    const result = await db.query(
      'INSERT INTO projects (project_name, name, manager_name, project_code, status) VALUES (?, ?, ?, ?, ?)',
      [project_name, project_name, manager_name, projectCode, 'in_progress']
    );

    const project = await db.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: project[0]
    });
  } catch (error) {
    next(error);
  }
};

// Update project
const updateProject = async (req, res, next) => {
  try {
    const { project_name, manager_name } = req.body;

    if (!project_name) {
      return res.status(400).json({ success: false, message: 'Project name is required' });
    }
    if (!manager_name) {
      return res.status(400).json({ success: false, message: 'Manager name is required' });
    }

    await db.query(
      'UPDATE projects SET project_name = ?, name = ?, manager_name = ? WHERE id = ?',
      [project_name, project_name, manager_name, req.params.id]
    );

    const updated = await db.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project updated successfully',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

// Delete project
const deleteProject = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// --- Staff CRUD ---

const getStaffByProject = async (req, res, next) => {
  try {
    const staff = await db.query(
      'SELECT * FROM project_staff WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json({ success: true, data: staff });
  } catch (error) {
    next(error);
  }
};

const addStaff = async (req, res, next) => {
  try {
    const { staff_name, work_role, joining_date, end_date, salary } = req.body;
    if (!staff_name) {
      return res.status(400).json({ success: false, message: 'Staff name is required' });
    }

    const defaultJoiningDate = joining_date || new Date().toISOString().split('T')[0];
    const defaultSalary = salary !== undefined ? salary : 0.00;

    const result = await db.query(
      'INSERT INTO project_staff (project_id, staff_name, work_role, joining_date, end_date, salary) VALUES (?, ?, ?, ?, ?, ?)',
      [req.params.projectId, staff_name, work_role || null, defaultJoiningDate, end_date || null, defaultSalary]
    );

    const newStaff = await db.query('SELECT * FROM project_staff WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Staff member added successfully',
      data: newStaff[0]
    });
  } catch (error) {
    next(error);
  }
};

const editStaff = async (req, res, next) => {
  try {
    const { staff_name, work_role, joining_date, end_date, salary } = req.body;
    if (!staff_name) {
      return res.status(400).json({ success: false, message: 'Staff name is required' });
    }

    const defaultJoiningDate = joining_date || new Date().toISOString().split('T')[0];
    const defaultSalary = salary !== undefined ? salary : 0.00;

    await db.query(
      'UPDATE project_staff SET staff_name = ?, work_role = ?, joining_date = ?, end_date = ?, salary = ? WHERE id = ? AND project_id = ?',
      [staff_name, work_role || null, defaultJoiningDate, end_date || null, defaultSalary, req.params.id, req.params.projectId]
    );

    const updated = await db.query('SELECT * FROM project_staff WHERE id = ?', [req.params.id]);

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.json({
      success: true,
      message: 'Staff member updated successfully',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

const deleteStaff = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM project_staff WHERE id = ? AND project_id = ?',
      [req.params.id, req.params.projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.json({ success: true, message: 'Staff member deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Vehicle CRUD ---

const getVehiclesByProject = async (req, res, next) => {
  try {
    const vehicles = await db.query(
      'SELECT * FROM project_vehicles WHERE project_id = ? ORDER BY created_at DESC',
      [req.params.projectId]
    );
    res.json({ success: true, data: vehicles });
  } catch (error) {
    next(error);
  }
};

const addVehicle = async (req, res, next) => {
  try {
    const { vehicle_name, vehicle_number } = req.body;
    if (!vehicle_name || !vehicle_number) {
      return res.status(400).json({ success: false, message: 'Vehicle name and number plate are required' });
    }

    const result = await db.query(
      'INSERT INTO project_vehicles (project_id, vehicle_name, vehicle_number) VALUES (?, ?, ?)',
      [req.params.projectId, vehicle_name, vehicle_number]
    );

    const newVehicle = await db.query('SELECT * FROM project_vehicles WHERE id = ?', [result.insertId]);

    res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: newVehicle[0]
    });
  } catch (error) {
    next(error);
  }
};

const editVehicle = async (req, res, next) => {
  try {
    const { vehicle_name, vehicle_number } = req.body;
    if (!vehicle_name || !vehicle_number) {
      return res.status(400).json({ success: false, message: 'Vehicle name and number plate are required' });
    }

    await db.query(
      'UPDATE project_vehicles SET vehicle_name = ?, vehicle_number = ? WHERE id = ? AND project_id = ?',
      [vehicle_name, vehicle_number, req.params.id, req.params.projectId]
    );

    const updated = await db.query('SELECT * FROM project_vehicles WHERE id = ?', [req.params.id]);

    if (updated.length === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: updated[0]
    });
  } catch (error) {
    next(error);
  }
};

const deleteVehicle = async (req, res, next) => {
  try {
    const result = await db.query(
      'DELETE FROM project_vehicles WHERE id = ? AND project_id = ?',
      [req.params.id, req.params.projectId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// --- Dummy/Stub Milestones to prevent router import breakages ---
const getMilestones = async (req, res, next) => {
  try { res.json({ success: true, data: [] }); } catch (error) { next(error); }
};
const createMilestone = async (req, res, next) => {
  try { res.status(201).json({ success: true, data: {} }); } catch (error) { next(error); }
};
const updateMilestone = async (req, res, next) => {
  try { res.json({ success: true, message: 'Milestone updated' }); } catch (error) { next(error); }
};

module.exports = {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getStaffByProject,
  addStaff,
  editStaff,
  deleteStaff,
  getVehiclesByProject,
  addVehicle,
  editVehicle,
  deleteVehicle,
  getMilestones,
  createMilestone,
  updateMilestone
};
