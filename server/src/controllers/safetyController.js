const db = require('../config/db');
const { generateCode, parsePagination } = require('../utils/helpers');

// Incidents
const getIncidents = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { status, severity, project_id } = req.query;

    let whereClause = [];
    let params = [];

    if (status) { whereClause.push('si.status = ?'); params.push(status); }
    if (severity) { whereClause.push('si.severity = ?'); params.push(severity); }
    if (project_id) { whereClause.push('si.project_id = ?'); params.push(project_id); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const [incidents, countResult] = await Promise.all([
      db.query(
        `SELECT si.*, p.name as project_name, u.name as reported_by_name
         FROM safety_incidents si
         LEFT JOIN projects p ON si.project_id = p.id
         LEFT JOIN users u ON si.reported_by = u.id
         ${whereStr}
         ORDER BY si.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) as total FROM safety_incidents si ${whereStr}`, params)
    ]);

    res.json({
      success: true,
      data: incidents,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const createIncident = async (req, res, next) => {
  try {
    const { project_id, title, description, incident_date, incident_time, location, severity, type, root_cause, action_taken, corrective_actions, affected_persons, property_damage_estimate, lost_work_hours } = req.body;

    if (!title || !description) {
      return res.status(400).json({ success: false, message: 'Title and description are required' });
    }

    const incidentCode = generateCode('INC');

    const result = await db.query(
      `INSERT INTO safety_incidents (incident_code, project_id, title, description, incident_date, incident_time, location, severity, type, root_cause, action_taken, corrective_actions, affected_persons, property_damage_estimate, lost_work_hours, reported_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [incidentCode, project_id || null, title, description, incident_date || new Date(), incident_time || null, location || null, severity || 'minor', type || 'other', root_cause || null, action_taken || null, corrective_actions || null, affected_persons || 0, property_damage_estimate || 0, lost_work_hours || 0, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Incident reported', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const updateIncident = async (req, res, next) => {
  try {
    const { status, severity, root_cause, action_taken, corrective_actions, investigated_by } = req.body;
    await db.query(
      `UPDATE safety_incidents SET status = COALESCE(?, status), severity = COALESCE(?, severity),
       root_cause = COALESCE(?, root_cause), action_taken = COALESCE(?, action_taken),
       corrective_actions = COALESCE(?, corrective_actions), investigated_by = COALESCE(?, investigated_by)
       WHERE id = ?`,
      [status, severity, root_cause, action_taken, corrective_actions, investigated_by, req.params.id]
    );

    res.json({ success: true, message: 'Incident updated' });
  } catch (error) {
    next(error);
  }
};

// Inspections
const getInspections = async (req, res, next) => {
  try {
    const { status, project_id } = req.query;
    let whereClause = [];
    let params = [];

    if (status) { whereClause.push('s.status = ?'); params.push(status); }
    if (project_id) { whereClause.push('s.project_id = ?'); params.push(project_id); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const inspections = await db.query(
      `SELECT s.*, p.name as project_name
       FROM safety_inspections s
       LEFT JOIN projects p ON s.project_id = p.id
       ${whereStr}
       ORDER BY s.inspection_date DESC`,
      params
    );

    res.json({ success: true, data: inspections });
  } catch (error) {
    next(error);
  }
};

const createInspection = async (req, res, next) => {
  try {
    const { project_id, title, inspection_date, inspector_name, area_inspected, findings, recommendations, overall_rating, follow_up_date } = req.body;

    if (!title || !inspector_name) {
      return res.status(400).json({ success: false, message: 'Title and inspector name are required' });
    }

    const inspectionCode = generateCode('INS');

    const result = await db.query(
      'INSERT INTO safety_inspections (inspection_code, project_id, title, inspection_date, inspector_name, area_inspected, findings, recommendations, overall_rating, follow_up_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [inspectionCode, project_id || null, title, inspection_date || new Date(), inspector_name, area_inspected || null, findings || null, recommendations || null, overall_rating || 'good', follow_up_date || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Inspection created', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// Training
const getTraining = async (req, res, next) => {
  try {
    const trainings = await db.query(
      `SELECT st.*,
       (SELECT COUNT(*) FROM safety_training_attendees WHERE training_id = st.id) as total_attendees
       FROM safety_training st ORDER BY st.training_date DESC`
    );
    res.json({ success: true, data: trainings });
  } catch (error) {
    next(error);
  }
};

const createTraining = async (req, res, next) => {
  try {
    const { title, description, training_date, trainer_name, duration_hours, location, topics } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Title is required' });
    }

    const trainingCode = generateCode('TRN');

    const result = await db.query(
      'INSERT INTO safety_training (training_code, title, description, training_date, trainer_name, duration_hours, location, topics, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [trainingCode, title, description || null, training_date || new Date(), trainer_name || null, duration_hours || null, location || null, topics || null, req.user.id]
    );

    res.status(201).json({ success: true, message: 'Training created', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

const addTrainingAttendee = async (req, res, next) => {
  try {
    const { worker_id, user_id } = req.body;

    if (!worker_id && !user_id) {
      return res.status(400).json({ success: false, message: 'Worker or user ID required' });
    }

    await db.query(
      'INSERT INTO safety_training_attendees (training_id, worker_id, user_id) VALUES (?, ?, ?)',
      [req.params.trainingId, worker_id || null, user_id || null]
    );

    res.status(201).json({ success: true, message: 'Attendee added' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getIncidents,
  createIncident,
  updateIncident,
  getInspections,
  createInspection,
  getTraining,
  createTraining,
  addTrainingAttendee
};
