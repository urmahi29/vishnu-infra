const db = require('../config/db');

// Helper to parse pagination
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 10;
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const getFuelEntries = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { search, equipmentId, startDate, endDate } = req.query;

    let query = `
      SELECT f.*, e.name as equipment_name, e.vehicle_number, u.name as operator_name
      FROM fuel_entries f
      LEFT JOIN equipment e ON f.equipment_id = e.id
      LEFT JOIN users u ON f.operator_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (equipmentId) {
      query += ` AND f.equipment_id = ?`;
      params.push(parseInt(equipmentId));
    }

    if (startDate) {
      query += ` AND f.fuel_date >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND f.fuel_date <= ?`;
      params.push(endDate);
    }

    if (search) {
      query += ` AND (e.name LIKE ? OR e.vehicle_number LIKE ? OR u.name LIKE ? OR f.location LIKE ?)`;
      const searchWildcard = `%${search}%`;
      params.push(searchWildcard, searchWildcard, searchWildcard, searchWildcard);
    }

    // Clone query for counting
    const countQuery = `SELECT COUNT(*) as total FROM (${query}) AS temp`;
    
    // Add sorting & limit
    query += ` ORDER BY f.fuel_date DESC, f.id DESC LIMIT ? OFFSET ?`;
    const queryParams = [...params, limit, offset];

    const [entries, countResult] = await Promise.all([
      db.query(query, queryParams),
      db.query(countQuery, params)
    ]);

    const total = countResult[0].total;

    res.json({
      success: true,
      data: entries,
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

const getFuelEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entries = await db.query(
      `SELECT f.*, e.name as equipment_name, e.vehicle_number, u.name as operator_name
       FROM fuel_entries f
       LEFT JOIN equipment e ON f.equipment_id = e.id
       LEFT JOIN users u ON f.operator_id = u.id
       WHERE f.id = ?`,
      [id]
    );

    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Fuel entry not found' });
    }

    res.json({
      success: true,
      data: entries[0]
    });
  } catch (error) {
    next(error);
  }
};

const createFuelEntry = async (req, res, next) => {
  try {
    const { equipment_id, fuel_date, quantity, unit_price, operator_id, odometer_reading, location, notes } = req.body;

    if (!equipment_id || !fuel_date || !quantity || !unit_price) {
      return res.status(400).json({ success: false, message: 'Equipment, fuel date, quantity, and unit price are required' });
    }

    const total_cost = parseFloat(quantity) * parseFloat(unit_price);

    const result = await db.query(
      `INSERT INTO fuel_entries (equipment_id, fuel_date, quantity, unit_price, total_cost, operator_id, odometer_reading, location, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        equipment_id,
        fuel_date,
        quantity,
        unit_price,
        total_cost,
        operator_id || null,
        odometer_reading || null,
        location || null,
        notes || null
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Fuel entry created successfully',
      data: { id: result.insertId, total_cost }
    });
  } catch (error) {
    next(error);
  }
};

const updateFuelEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { equipment_id, fuel_date, quantity, unit_price, operator_id, odometer_reading, location, notes } = req.body;

    const entries = await db.query('SELECT id FROM fuel_entries WHERE id = ?', [id]);
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Fuel entry not found' });
    }

    const total_cost = parseFloat(quantity) * parseFloat(unit_price);

    await db.query(
      `UPDATE fuel_entries 
       SET equipment_id = ?, fuel_date = ?, quantity = ?, unit_price = ?, total_cost = ?, operator_id = ?, odometer_reading = ?, location = ?, notes = ?
       WHERE id = ?`,
      [
        equipment_id,
        fuel_date,
        quantity,
        unit_price,
        total_cost,
        operator_id || null,
        odometer_reading || null,
        location || null,
        notes || null,
        id
      ]
    );

    res.json({
      success: true,
      message: 'Fuel entry updated successfully',
      data: { total_cost }
    });
  } catch (error) {
    next(error);
  }
};

const deleteFuelEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entries = await db.query('SELECT id FROM fuel_entries WHERE id = ?', [id]);
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Fuel entry not found' });
    }

    await db.query('DELETE FROM fuel_entries WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Fuel entry deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

// Reports: Vehicle consumption summary
const getVehicleFuelReport = async (req, res, next) => {
  try {
    const report = await db.query(`
      SELECT 
        e.id as equipment_id, 
        e.name as equipment_name, 
        e.vehicle_number,
        COUNT(f.id) as total_refuels,
        SUM(f.quantity) as total_quantity,
        SUM(f.total_cost) as total_cost,
        AVG(f.unit_price) as avg_unit_price,
        MIN(f.odometer_reading) as min_odometer,
        MAX(f.odometer_reading) as max_odometer,
        (MAX(f.odometer_reading) - MIN(f.odometer_reading)) as distance_travelled
      FROM equipment e
      JOIN fuel_entries f ON f.equipment_id = e.id
      GROUP BY e.id, e.name, e.vehicle_number
      ORDER BY total_cost DESC
    `);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    next(error);
  }
};

// Reports: Monthly fuel consumption summary
const getMonthlyFuelReport = async (req, res, next) => {
  try {
    const report = await db.query(`
      SELECT 
        strftime('%Y-%m', fuel_date) as month,
        COUNT(id) as refuel_count,
        SUM(quantity) as total_quantity,
        SUM(total_cost) as total_cost
      FROM fuel_entries
      GROUP BY month
      ORDER BY month DESC
      LIMIT 12
    `);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    // strftime is SQLite, MySQL uses DATE_FORMAT.
    // If strftime fails, let's catch and do MySQL fallback.
    try {
      const mysqlReport = await db.query(`
        SELECT 
          DATE_FORMAT(fuel_date, '%Y-%m') as month,
          COUNT(id) as refuel_count,
          SUM(quantity) as total_quantity,
          SUM(total_cost) as total_cost
        FROM fuel_entries
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
  getFuelEntries,
  getFuelEntry,
  createFuelEntry,
  updateFuelEntry,
  deleteFuelEntry,
  getVehicleFuelReport,
  getMonthlyFuelReport
};
