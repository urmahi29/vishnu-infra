const db = require('../config/db');
const { generateCode, parsePagination } = require('../utils/helpers');

const getMaterials = async (req, res, next) => {
  try {
    const { page, limit, offset } = parsePagination(req.query);
    const { category, status, search } = req.query;

    let whereClause = [];
    let params = [];

    if (category) { whereClause.push('m.category = ?'); params.push(category); }
    if (status) { whereClause.push('m.status = ?'); params.push(status); }
    if (search) { whereClause.push('(m.name LIKE ? OR m.material_code LIKE ?)'); params.push(`%${search}%`, `%${search}%`); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const [materials, countResult] = await Promise.all([
      db.query(
        `SELECT m.*, s.name as supplier_name,
         CASE WHEN m.current_stock <= m.minimum_stock THEN 1 ELSE 0 END as low_stock
         FROM materials m
         LEFT JOIN suppliers s ON m.supplier_id = s.id
         ${whereStr}
         ORDER BY m.name ASC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      ),
      db.query(`SELECT COUNT(*) as total FROM materials m ${whereStr}`, params)
    ]);

    res.json({
      success: true,
      data: materials,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

const getMaterial = async (req, res, next) => {
  try {
    const [materials, movements] = await Promise.all([
      db.query(
        'SELECT m.*, s.name as supplier_name FROM materials m LEFT JOIN suppliers s ON m.supplier_id = s.id WHERE m.id = ?',
        [req.params.id]
      ),
      db.query(
        'SELECT sm.*, p.name as project_name, u.name as performed_by_name FROM stock_movements sm LEFT JOIN projects p ON sm.project_id = p.id LEFT JOIN users u ON sm.performed_by = u.id WHERE sm.material_id = ? ORDER BY sm.movement_date DESC LIMIT 20',
        [req.params.id]
      )
    ]);

    if (materials.length === 0) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }

    res.json({ success: true, data: { ...materials[0], stock_movements: movements } });
  } catch (error) {
    next(error);
  }
};

const createMaterial = async (req, res, next) => {
  try {
    const { name, category, unit, unit_price, current_stock, minimum_stock, maximum_stock, location, supplier_id, description } = req.body;

    if (!name || !category || !unit) {
      return res.status(400).json({ success: false, message: 'Name, category, and unit are required' });
    }

    const materialCode = generateCode('MAT');

    const result = await db.query(
      `INSERT INTO materials (material_code, name, category, unit, unit_price, current_stock, minimum_stock, maximum_stock, location, supplier_id, description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [materialCode, name, category, unit, unit_price || 0, current_stock || 0, minimum_stock || 0, maximum_stock || 0, location || null, supplier_id || null, description || null]
    );

    const material = await db.query('SELECT * FROM materials WHERE id = ?', [result.insertId]);

    res.status(201).json({ success: true, message: 'Material added successfully', data: material[0] });
  } catch (error) {
    next(error);
  }
};

const updateMaterial = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'category', 'unit', 'unit_price', 'current_stock', 'minimum_stock', 'maximum_stock', 'location', 'supplier_id', 'description', 'status'];
    const updates = [];
    const values = [];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(req.params.id);
    await db.query(`UPDATE materials SET ${updates.join(', ')} WHERE id = ?`, values);

    const material = await db.query('SELECT * FROM materials WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Material updated successfully', data: material[0] });
  } catch (error) {
    next(error);
  }
};

const deleteMaterial = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM materials WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Material not found' });
    }
    res.json({ success: true, message: 'Material deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// Stock Movements
const createStockMovement = async (req, res, next) => {
  try {
    const { material_id, project_id, movement_type, quantity, unit_price, remarks } = req.body;

    if (!material_id || !movement_type || !quantity) {
      return res.status(400).json({ success: false, message: 'Material ID, movement type, and quantity are required' });
    }

    const totalPrice = unit_price ? quantity * unit_price : null;

    const result = await db.query(
      'INSERT INTO stock_movements (material_id, project_id, movement_type, quantity, unit_price, total_price, remarks, performed_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [material_id, project_id || null, movement_type, quantity, unit_price || null, totalPrice, remarks || null, req.user.id]
    );

    // Update stock quantity
    const sign = movement_type === 'purchase' || movement_type === 'return' ? '+' : '-';
    await db.query(`UPDATE materials SET current_stock = current_stock ${sign} ? WHERE id = ?`, [quantity, material_id]);

    // Check if low stock
    const material = await db.query('SELECT current_stock, minimum_stock FROM materials WHERE id = ?', [material_id]);
    if (material[0].current_stock <= material[0].minimum_stock) {
      // Create notification
      await db.query(
        'INSERT INTO notifications (title, message, type, category, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)',
        ['Low Stock Alert', `Material #${material_id} is below minimum stock level`, 'warning', 'material', 'material', material_id]
      );
    }

    res.status(201).json({ success: true, message: 'Stock movement recorded', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// Suppliers
const getSuppliers = async (req, res, next) => {
  try {
    const suppliers = await db.query('SELECT * FROM suppliers ORDER BY name ASC');
    res.json({ success: true, data: suppliers });
  } catch (error) {
    next(error);
  }
};

const createSupplier = async (req, res, next) => {
  try {
    const { name, contact_person, email, phone, address, city, state, gst_number, payment_terms } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Supplier name is required' });
    }

    const supplierCode = generateCode('SUP');
    const result = await db.query(
      'INSERT INTO suppliers (supplier_code, name, contact_person, email, phone, address, city, state, gst_number, payment_terms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [supplierCode, name, contact_person || null, email || null, phone || null, address || null, city || null, state || null, gst_number || null, payment_terms || null]
    );

    res.status(201).json({ success: true, message: 'Supplier created', data: { id: result.insertId } });
  } catch (error) {
    next(error);
  }
};

// Purchase Orders
const getPurchaseOrders = async (req, res, next) => {
  try {
    const { status } = req.query;
    let whereClause = [];
    let params = [];

    if (status) { whereClause.push('po.status = ?'); params.push(status); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const orders = await db.query(
      `SELECT po.*, s.name as supplier_name, p.name as project_name, u.name as created_by_name
       FROM purchase_orders po
       LEFT JOIN suppliers s ON po.supplier_id = s.id
       LEFT JOIN projects p ON po.project_id = p.id
       LEFT JOIN users u ON po.created_by = u.id
       ${whereStr}
       ORDER BY po.created_at DESC`,
      params
    );

    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMaterials,
  getMaterial,
  createMaterial,
  updateMaterial,
  deleteMaterial,
  createStockMovement,
  getSuppliers,
  createSupplier,
  getPurchaseOrders
};
