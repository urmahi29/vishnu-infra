const db = require('../config/db');
const { generateCode, parsePagination } = require('../utils/helpers');

const getTasks = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, priority, project_id, assigned_to } = req.query;

    let whereClause = [];
    let params = [];

    if (status) { whereClause.push('t.status = ?'); params.push(status); }
    if (priority) { whereClause.push('t.priority = ?'); params.push(priority); }
    if (project_id) { whereClause.push('t.project_id = ?'); params.push(project_id); }
    if (assigned_to) { whereClause.push('t.assigned_to = ?'); params.push(assigned_to); }

    // Non-admin users see only their tasks or tasks in their projects
    if (req.user.role !== 'admin') {
      whereClause.push('(t.assigned_to = ? OR t.created_by = ? OR t.project_id IN (SELECT id FROM projects WHERE assigned_manager_id = ?))');
      params.push(req.user.id, req.user.id, req.user.id);
    }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const [tasks, countResult] = await Promise.all([
      db.query(
        `SELECT t.*, p.name as project_name, p.project_code,
         u.name as assigned_to_name, u2.name as created_by_name
         FROM tasks t
         LEFT JOIN projects p ON t.project_id = p.id
         LEFT JOIN users u ON t.assigned_to = u.id
         LEFT JOIN users u2 ON t.created_by = u2.id
         ${whereStr}
         ORDER BY t.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) as total FROM tasks t ${whereStr}`, params)
    ]);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getTask = async (req, res, next) => {
  try {
    const tasks = await db.query(
      `SELECT t.*, p.name as project_name, p.project_code,
       u.name as assigned_to_name, u2.name as created_by_name
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN users u ON t.assigned_to = u.id
       LEFT JOIN users u2 ON t.created_by = u2.id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const [comments, attachments] = await Promise.all([
      db.query(
        'SELECT tc.*, u.name as user_name FROM task_comments tc LEFT JOIN users u ON tc.user_id = u.id WHERE tc.task_id = ? ORDER BY tc.created_at',
        [req.params.id]
      ),
      db.query('SELECT * FROM task_attachments WHERE task_id = ?', [req.params.id])
    ]);

    res.json({
      success: true,
      data: { ...tasks[0], comments, attachments }
    });
  } catch (error) {
    next(error);
  }
};

const createTask = async (req, res, next) => {
  try {
    const { project_id, title, description, task_type, priority, assigned_to, start_date, due_date, estimated_hours, location_details, notes } = req.body;

    if (!project_id || !title) {
      return res.status(400).json({ success: false, message: 'Project ID and title are required' });
    }

    const taskCode = generateCode('TSK');

    const result = await db.query(
      `INSERT INTO tasks (task_code, project_id, title, description, task_type, priority, assigned_to, start_date, due_date, estimated_hours, location_details, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [taskCode, project_id, title, description || null, task_type || 'other', priority || 'medium', assigned_to || null, start_date || null, due_date || null, estimated_hours || null, location_details || null, notes || null, req.user.id]
    );

    const task = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);

    // Create notification for assigned user
    if (assigned_to) {
      await db.query(
        'INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [assigned_to, 'New Task Assigned', `You have been assigned a new task: ${title}`, 'info', 'task', 'task', result.insertId]
      );
    }

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task[0]
    });
  } catch (error) {
    next(error);
  }
};

const updateTask = async (req, res, next) => {
  try {
    const allowedFields = ['title', 'description', 'task_type', 'priority', 'status', 'assigned_to', 'start_date', 'due_date', 'estimated_hours', 'actual_hours', 'progress_percentage', 'location_details', 'notes'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (req.body.status === 'completed') {
      updates.push('completed_at = NOW()');
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(req.params.id);
    await db.query(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`, values);

    const task = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: task[0]
    });
  } catch (error) {
    next(error);
  }
};

const deleteTask = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    res.json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const addComment = async (req, res, next) => {
  try {
    const { comment } = req.body;
    if (!comment) {
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    const result = await db.query(
      'INSERT INTO task_comments (task_id, user_id, comment) VALUES (?, ?, ?)',
      [req.params.taskId, req.user.id, comment]
    );

    const newComment = await db.query(
      'SELECT tc.*, u.name as user_name FROM task_comments tc LEFT JOIN users u ON tc.user_id = u.id WHERE tc.id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Comment added successfully',
      data: newComment[0]
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  addComment
};
