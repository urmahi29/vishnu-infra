const db = require('../config/db');

// Helper to generate unique trip code
const generateTripCode = () => {
  return 'TRP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const getTrips = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, status, equipmentId, driverId } = req.query;

    let query = `
      SELECT t.*, e.name as equipment_name, e.vehicle_number, u.name as driver_name
      FROM trips t
      LEFT JOIN equipment e ON t.equipment_id = e.id
      LEFT JOIN users u ON t.driver_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (equipmentId) {
      query += ` AND t.equipment_id = ?`;
      params.push(parseInt(equipmentId));
    }

    if (driverId) {
      query += ` AND t.driver_id = ?`;
      params.push(parseInt(driverId));
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (t.trip_code LIKE ? OR e.name LIKE ? OR e.vehicle_number LIKE ? OR u.name LIKE ? OR t.start_location LIKE ? OR t.end_location LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS temp`;
    
    query += ` ORDER BY t.start_date DESC, t.id DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];

    const [trips, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, params)
    ]);

    const total = countResult[0].total;

    res.json({
      success: true,
      data: trips,
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

const getTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trips = await db.query(
      `SELECT t.*, e.name as equipment_name, e.vehicle_number, u.name as driver_name
       FROM trips t
       LEFT JOIN equipment e ON t.equipment_id = e.id
       LEFT JOIN users u ON t.driver_id = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    res.json({
      success: true,
      data: trips[0]
    });
  } catch (error) {
    next(error);
  }
};

const createTrip = async (req, res, next) => {
  try {
    const { equipment_id, driver_id, start_date, start_location, end_location, notes } = req.body;

    if (!equipment_id || !driver_id || !start_date || !start_location || !end_location) {
      return res.status(400).json({ success: false, message: 'Vehicle, driver, start date, start location, and destination are required' });
    }

    const tripCode = generateTripCode();

    const result = await db.query(
      `INSERT INTO trips (trip_code, equipment_id, driver_id, start_date, start_location, end_location, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, 'scheduled', ?)`,
      [
        tripCode,
        equipment_id,
        driver_id,
        start_date,
        start_location,
        end_location,
        notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Trip scheduled successfully',
      data: { id: result.insertId, trip_code: tripCode }
    });
  } catch (error) {
    next(error);
  }
};

const updateTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { equipment_id, driver_id, start_date, end_date, start_location, end_location, distance_covered, fuel_used, status, notes } = req.body;

    const trips = await db.query('SELECT id FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    await db.query(
      `UPDATE trips 
       SET equipment_id = ?, driver_id = ?, start_date = ?, end_date = ?, start_location = ?, end_location = ?, distance_covered = ?, fuel_used = ?, status = ?, notes = ?
       WHERE id = ?`,
      [
        equipment_id,
        driver_id,
        start_date,
        end_date || null,
        start_location,
        end_location,
        distance_covered || 0.00,
        fuel_used || 0.00,
        status || 'scheduled',
        notes || null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Trip updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

const deleteTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trips = await db.query('SELECT id FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    await db.query('DELETE FROM trips WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Trip deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Start Trip action
const startTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const trips = await db.query('SELECT status FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    // Set status to in_progress and start_date to current time
    await db.query(
      "UPDATE trips SET status = 'in_progress', start_date = CURRENT_TIMESTAMP WHERE id = ?",
      [id]
    );

    res.json({
      success: true,
      message: 'Trip started successfully'
    });
  } catch (error) {
    // CURRENT_TIMESTAMP query works fine for both MySQL/SQLite. But in case of errors, let's catch:
    try {
      await db.query(
        "UPDATE trips SET status = 'in_progress', start_date = datetime('now','localtime') WHERE id = ?",
        [id]
      );
      res.json({
        success: true,
        message: 'Trip started successfully'
      });
    } catch (sqliteErr) {
      next(error);
    }
  }
};

// End/Complete Trip action
const completeTrip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { distance_covered, fuel_used, notes } = req.body;

    if (!distance_covered || !fuel_used) {
      return res.status(400).json({ success: false, message: 'Distance covered and fuel used are required to complete the trip' });
    }

    const trips = await db.query('SELECT status FROM trips WHERE id = ?', [id]);
    if (trips.length === 0) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    await db.query(
      `UPDATE trips 
       SET status = 'completed', end_date = CURRENT_TIMESTAMP, distance_covered = ?, fuel_used = ?, notes = COALESCE(?, notes)
       WHERE id = ?`,
      [distance_covered, fuel_used, notes || null, id]
    );

    res.json({
      success: true,
      message: 'Trip completed successfully'
    });
  } catch (error) {
    try {
      const { id } = req.params;
      const { distance_covered, fuel_used, notes } = req.body;
      await db.query(
        `UPDATE trips 
         SET status = 'completed', end_date = datetime('now','localtime'), distance_covered = ?, fuel_used = ?, notes = COALESCE(?, notes)
         WHERE id = ?`,
        [distance_covered, fuel_used, notes || null, id]
      );
      res.json({
        success: true,
        message: 'Trip completed successfully'
      });
    } catch (sqliteErr) {
      next(error);
    }
  }
};

module.exports = {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  deleteTrip,
  startTrip,
  completeTrip
};
