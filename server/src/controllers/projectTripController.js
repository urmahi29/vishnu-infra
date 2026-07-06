const db = require('../config/db');

const getTrips = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const entries = await db.query(
      `SELECT * FROM project_trips WHERE project_id = ? ORDER BY trip_date DESC, id DESC`,
      [projectId]
    );
    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
};

const createTrip = async (req, res, next) => {
  try {
    const { project_id, trip_type, trip_date, trip_number, vehicle_number } = req.body;

    if (!project_id || !trip_type || !trip_date || !trip_number || !vehicle_number) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const result = await db.query(
      `INSERT INTO project_trips (project_id, trip_type, trip_date, trip_number, vehicle_number) VALUES (?, ?, ?, ?, ?)`,
      [project_id, trip_type, trip_date, trip_number, vehicle_number]
    );

    res.status(201).json({
      success: true,
      message: 'Trip saved successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

const updateTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { trip_type, trip_date, trip_number, vehicle_number } = req.body;

    const entries = await db.query('SELECT id FROM project_trips WHERE id = ?', [id]);
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    await db.query(
      `UPDATE project_trips SET trip_type = ?, trip_date = ?, trip_number = ?, vehicle_number = ? WHERE id = ?`,
      [trip_type, trip_date, trip_number, vehicle_number, id]
    );

    res.json({ success: true, message: 'Trip updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entries = await db.query('SELECT id FROM project_trips WHERE id = ?', [id]);
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    await db.query('DELETE FROM project_trips WHERE id = ?', [id]);
    res.json({ success: true, message: 'Trip deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const saveTripSheet = async (req, res, next) => {
  try {
    const { project_id, trip_type, trip_date, vehicles } = req.body;

    if (!project_id || !trip_type || !trip_date || !Array.isArray(vehicles)) {
      return res.status(400).json({ success: false, message: 'Project, trip type, date, and vehicles list are required' });
    }

    const queries = [
      {
        sql: `DELETE FROM project_trips WHERE project_id = ? AND trip_date = ? AND trip_type = ?`,
        params: [project_id, trip_date, trip_type]
      }
    ];

    for (const v of vehicles) {
      if (!v.vehicle_number || !v.trip_number) {
        return res.status(400).json({ success: false, message: 'Each vehicle entry must have a number plate and trip count' });
      }
      queries.push({
        sql: `INSERT INTO project_trips (project_id, trip_type, trip_date, trip_number, vehicle_number) VALUES (?, ?, ?, ?, ?)`,
        params: [project_id, trip_type, trip_date, v.trip_number.toString(), v.vehicle_number]
      });
    }

    await db.transaction(queries);

    res.status(201).json({
      success: true,
      message: 'Trip sheet saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

const deleteTripSheet = async (req, res, next) => {
  try {
    const { project_id, trip_date, trip_type } = req.query;

    if (!project_id || !trip_date || !trip_type) {
      return res.status(400).json({ success: false, message: 'Project, date, and trip type are required' });
    }

    await db.query(
      `DELETE FROM project_trips WHERE project_id = ? AND trip_date = ? AND trip_type = ?`,
      [project_id, trip_date, trip_type]
    );

    res.json({ success: true, message: 'Trip sheet deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTrips,
  createTrip,
  updateTrip,
  deleteTrip,
  saveTripSheet,
  deleteTripSheet
};
