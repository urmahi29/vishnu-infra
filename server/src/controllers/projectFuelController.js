const db = require('../config/db');

const getFuelEntries = async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const entries = await db.query(
      `SELECT * FROM project_fuel_entries WHERE project_id = ? ORDER BY fuel_date DESC, id DESC`,
      [projectId]
    );
    res.json({ success: true, data: entries });
  } catch (error) {
    next(error);
  }
};

const createFuelEntry = async (req, res, next) => {
  try {
    const { project_id, quantity, cost, purchased_by, fuel_date } = req.body;

    if (!project_id || !quantity || !purchased_by || !fuel_date) {
      return res.status(400).json({ success: false, message: 'Project, quantity, purchased by, and date are required' });
    }

    const parsedCost = (cost === undefined || cost === null || cost === '') ? 0 : parseFloat(cost);

    const result = await db.query(
      `INSERT INTO project_fuel_entries (project_id, quantity, cost, purchased_by, fuel_date) VALUES (?, ?, ?, ?, ?)`,
      [project_id, parseFloat(quantity), parsedCost, purchased_by, fuel_date]
    );

    res.status(201).json({
      success: true,
      message: 'Fuel entry saved successfully',
      data: { id: result.insertId }
    });
  } catch (error) {
    next(error);
  }
};

const updateFuelEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { quantity, cost, purchased_by, fuel_date } = req.body;

    const entries = await db.query('SELECT id FROM project_fuel_entries WHERE id = ?', [id]);
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Fuel entry not found' });
    }

    if (!quantity || !purchased_by || !fuel_date) {
      return res.status(400).json({ success: false, message: 'Quantity, purchased by, and date are required' });
    }

    const parsedCost = (cost === undefined || cost === null || cost === '') ? 0 : parseFloat(cost);

    await db.query(
      `UPDATE project_fuel_entries SET quantity = ?, cost = ?, purchased_by = ?, fuel_date = ? WHERE id = ?`,
      [parseFloat(quantity), parsedCost, purchased_by, fuel_date, id]
    );

    res.json({ success: true, message: 'Fuel entry updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteFuelEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const entries = await db.query('SELECT id FROM project_fuel_entries WHERE id = ?', [id]);
    if (entries.length === 0) {
      return res.status(404).json({ success: false, message: 'Fuel entry not found' });
    }

    await db.query('DELETE FROM project_fuel_entries WHERE id = ?', [id]);
    res.json({ success: true, message: 'Fuel entry deleted successfully' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getFuelEntries,
  createFuelEntry,
  updateFuelEntry,
  deleteFuelEntry
};
