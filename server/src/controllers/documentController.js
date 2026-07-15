const db = require('../config/db');
const { generateCode, parsePagination } = require('../utils/helpers');

const getDocuments = async (req, res, next) => {
  try {
    const all = req.query.all === 'true';
    const { page, limit, offset } = parsePagination(req.query);
    const { project_id, document_type, status } = req.query;

    let whereClause = [];
    let params = [];

    if (project_id) { whereClause.push('d.project_id = ?'); params.push(project_id); }
    if (document_type) { whereClause.push('d.document_type = ?'); params.push(document_type); }
    if (status) { whereClause.push('d.status = ?'); params.push(status); }

    const whereStr = whereClause.length > 0 ? 'WHERE ' + whereClause.join(' AND ') : '';

    const queryParams = [...params];
    if (!all) {
      queryParams.push(limit, offset);
    }

    const limitOffsetStr = all ? '' : 'LIMIT ? OFFSET ?';

    const [documents, countResult] = await Promise.all([
      db.query(
        `SELECT d.*, p.name as project_name, u.name as uploaded_by_name
         FROM documents d
         LEFT JOIN projects p ON d.project_id = p.id
         LEFT JOIN users u ON d.uploaded_by = u.id
         ${whereStr}
         ORDER BY d.created_at DESC
         ${limitOffsetStr}`,
        queryParams
      ),
      db.query(`SELECT COUNT(*) as total FROM documents d ${whereStr}`, params)
    ]);

    res.json({
      success: true,
      data: documents,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) }
    });
  } catch (error) {
    next(error);
  }
};

const getDocument = async (req, res, next) => {
  try {
    const [documents, versions] = await Promise.all([
      db.query(
        `SELECT d.*, p.name as project_name, u.name as uploaded_by_name
         FROM documents d
         LEFT JOIN projects p ON d.project_id = p.id
         LEFT JOIN users u ON d.uploaded_by = u.id
         WHERE d.id = ?`,
        [req.params.id]
      ),
      db.query(
        'SELECT * FROM document_versions WHERE document_id = ? ORDER BY version DESC',
        [req.params.id]
      )
    ]);

    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    res.json({ success: true, data: { ...documents[0], versions } });
  } catch (error) {
    next(error);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    const {
      project_id,
      vehicle_number,
      vehicle_model,
      vehicle_type,
      metadata
    } = req.body;

    if (!vehicle_number || !vehicle_model || !vehicle_type) {
      return res.status(400).json({ success: false, message: 'Vehicle number, model, and type are required' });
    }

    let parsedMetadata = [];
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (e) {
        return res.status(400).json({ success: false, message: 'Invalid metadata format' });
      }
    }

    // Check if vehicle exists in equipment table, otherwise auto-create folder
    const normalizedPlate = vehicle_number.toUpperCase().trim();
    const existingVehicles = await db.query(
      'SELECT id FROM equipment WHERE UPPER(TRIM(vehicle_number)) = ?',
      [normalizedPlate]
    );

    if (existingVehicles.length === 0) {
      const eqCode = generateCode('EQP');
      // Normalize type for mysql/sqlite enum checks
      const normalizeVehicleType = (type) => {
        const t = (type || '').toLowerCase().trim();
        if (['excavator', 'bulldozer', 'crane', 'roller', 'grader', 'drill', 'compressor', 'generator', 'other'].includes(t)) {
          return t;
        }
        if (t === 'dump truck' || t === 'dumper' || t === 'truck' || t === 'dump_truck') return 'dump_truck';
        if (t === 'concrete mixer' || t === 'concrete_mixer') return 'concrete_mixer';
        if (t === 'paver') return 'paver';
        return 'other';
      };
      
      await db.query(
        `INSERT INTO equipment (
          equipment_code, name, type, vehicle_number, current_project_id, status
        ) VALUES (?, ?, ?, ?, ?, 'available')`,
        [
          eqCode,
          vehicle_model.trim(),
          normalizeVehicleType(vehicle_type),
          normalizedPlate,
          project_id ? parseInt(project_id) : null
        ]
      );
    }

    const queries = [];
    if (parsedMetadata.length > 0) {
      let fileIdx = 0;
      for (let i = 0; i < parsedMetadata.length; i++) {
        const meta = parsedMetadata[i];
        const docCode = generateCode('DOC');
        const docCategory = meta.category || meta.document_category || 'Other';
        const title = meta.title || `${normalizedPlate} - ${docCategory}`;
        
        let fileUrl = '';
        let filename = '';
        let originalname = '';
        let size = 0;
        let mimetype = '';

        if (req.files && req.files.length > fileIdx) {
          const file = req.files[fileIdx];
          fileUrl = `/uploads/${file.filename}`;
          filename = file.filename;
          originalname = file.originalname;
          size = file.size;
          mimetype = file.mimetype;
          fileIdx++;
        }

        queries.push({
          sql: `INSERT INTO documents (
            document_code, project_id, title, description, document_type,
            file_path, file_name, original_name, file_size, file_type, uploaded_by,
            vehicle_number, vehicle_model, vehicle_type, document_category,
            document_number, issue_date, expiry_date, remarks
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            docCode,
            project_id ? parseInt(project_id) : null,
            title,
            meta.remarks || null,
            'other',
            fileUrl,
            filename,
            originalname,
            size,
            mimetype,
            req.user.id,
            normalizedPlate,
            vehicle_model.trim(),
            vehicle_type,
            docCategory,
            meta.document_number || null,
            meta.issue_date || null,
            meta.expiry_date || null,
            meta.remarks || null
          ]
        });
      }
    } else {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ success: false, message: 'No documents or files provided' });
      }
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const docCode = generateCode('DOC');
        const fileUrl = `/uploads/${file.filename}`;
        queries.push({
          sql: `INSERT INTO documents (
            document_code, project_id, title, description, document_type,
            file_path, file_name, original_name, file_size, file_type, uploaded_by,
            vehicle_number, vehicle_model, vehicle_type, document_category
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          params: [
            docCode,
            project_id ? parseInt(project_id) : null,
            `${normalizedPlate} - Document`,
            null,
            'other',
            fileUrl,
            file.filename,
            file.originalname,
            file.size,
            file.mimetype,
            req.user.id,
            normalizedPlate,
            vehicle_model.trim(),
            vehicle_type,
            'Other'
          ]
        });
      }
    }

    await db.transaction(queries);

    res.status(201).json({
      success: true,
      message: 'Document(s) saved successfully'
    });
  } catch (error) {
    next(error);
  }
};

const updateDocument = async (req, res, next) => {
  try {
    const {
      project_id,
      vehicle_number,
      vehicle_model,
      vehicle_type,
      document_category,
      document_number,
      issue_date,
      expiry_date,
      remarks,
      status,
      title
    } = req.body;

    const docTitle = title || (vehicle_number && document_category ? `${vehicle_number.toUpperCase().trim()} - ${document_category}` : undefined);

    await db.query(
      `UPDATE documents SET 
        project_id = COALESCE(?, project_id),
        title = COALESCE(?, title),
        description = COALESCE(?, remarks, description),
        vehicle_number = COALESCE(?, vehicle_number),
        vehicle_model = COALESCE(?, vehicle_model),
        vehicle_type = COALESCE(?, vehicle_type),
        document_category = COALESCE(?, document_category),
        document_number = COALESCE(?, document_number),
        issue_date = COALESCE(?, issue_date),
        expiry_date = COALESCE(?, expiry_date),
        remarks = COALESCE(?, remarks),
        status = COALESCE(?, status)
       WHERE id = ?`,
      [
        project_id,
        docTitle,
        remarks,
        vehicle_number ? vehicle_number.toUpperCase().trim() : null,
        vehicle_model,
        vehicle_type,
        document_category,
        document_number,
        issue_date,
        expiry_date,
        remarks,
        status,
        req.params.id
      ]
    );

    res.json({ success: true, message: 'Document updated successfully' });
  } catch (error) {
    next(error);
  }
};

const deleteDocument = async (req, res, next) => {
  try {
    const result = await db.query('DELETE FROM documents WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }
    res.json({ success: true, message: 'Document deleted successfully' });
  } catch (error) {
    next(error);
  }
};

const viewDocument = async (req, res, next) => {
  try {
    const documents = await db.query(
      'SELECT file_path, file_name, file_type FROM documents WHERE id = ?',
      [req.params.id]
    );

    if (documents.length === 0) {
      return res.status(404).send('Document not found');
    }

    const doc = documents[0];
    if (!doc.file_path || doc.file_path.trim() === '') {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(`
        <html>
          <head>
            <title>File Not Attached</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f7fafc; margin: 0; }
              .card { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05); text-align: center; max-width: 450px; border: 1px solid #edf2f7; }
              .icon { font-size: 3rem; margin-bottom: 1rem; }
              h1 { color: #d97706; font-size: 1.5rem; margin-top: 0; margin-bottom: 0.75rem; font-weight: 700; }
              p { color: #4a5568; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
              button { background: #4b5563; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: background 0.2s; }
              button:hover { background: #374151; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">ℹ️</div>
              <h1>No File Attached</h1>
              <p>This document log exists as a record only. No image or PDF file was uploaded for it.</p>
              <button onclick="window.close()">Close Tab</button>
            </div>
          </body>
        </html>
      `);
    }

    const path = require('path');
    const fs = require('fs');
    const filePath = path.resolve(__dirname, '../..', doc.file_path.replace(/^\//, ''));

    if (!fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'text/html');
      return res.status(404).send(`
        <html>
          <head>
            <title>File Not Found</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; background-color: #f7fafc; margin: 0; }
              .card { background: white; padding: 2.5rem; border-radius: 16px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.05); text-align: center; max-width: 450px; border: 1px solid #edf2f7; }
              .icon { font-size: 3rem; margin-bottom: 1rem; }
              h1 { color: #e53e3e; font-size: 1.5rem; margin-top: 0; margin-bottom: 0.75rem; font-weight: 700; }
              p { color: #4a5568; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1.5rem; }
              button { background: #3182ce; color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: background 0.2s; }
              button:hover { background: #2b6cb0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="icon">⚠️</div>
              <h1>File Not Found</h1>
              <p>File not found. Please upload the document again.</p>
              <button onclick="window.close()">Close Tab</button>
            </div>
          </body>
        </html>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    let contentType = doc.file_type || 'application/octet-stream';
    if (ext === '.pdf') contentType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.gif') contentType = 'image/gif';
    else if (ext === '.webp') contentType = 'image/webp';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', 'inline');
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

const downloadDocument = async (req, res, next) => {
  try {
    const documents = await db.query(
      'SELECT file_path, file_name, original_name FROM documents WHERE id = ?',
      [req.params.id]
    );

    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const doc = documents[0];
    if (!doc.file_path || doc.file_path.trim() === '') {
      return res.status(404).json({ success: false, message: 'No file is attached to this document log.' });
    }

    const path = require('path');
    const fs = require('fs');
    const filePath = path.resolve(__dirname, '../..', doc.file_path.replace(/^\//, ''));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found. Please upload the document again.' });
    }

    const downloadName = doc.original_name || doc.file_name;
    res.download(filePath, downloadName);
  } catch (error) {
    next(error);
  }
};

const checkFileExists = async (req, res, next) => {
  try {
    const documents = await db.query(
      'SELECT file_path FROM documents WHERE id = ?',
      [req.params.id]
    );

    if (documents.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const doc = documents[0];
    if (!doc.file_path || doc.file_path.trim() === '') {
      return res.status(404).json({ success: false, message: 'No file is attached to this document log.' });
    }

    const path = require('path');
    const fs = require('fs');
    const filePath = path.resolve(__dirname, '../..', doc.file_path.replace(/^\//, ''));

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'File not found. Please upload the document again.' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

const updateVehicleFolder = async (req, res, next) => {
  try {
    const oldVehicleNumber = req.params.vehicleNumber.toUpperCase().trim();
    const {
      vehicle_number,
      name,
      type,
      company_name,
      brand,
      model,
      year,
      fuel_type,
      engine_number,
      chassis_number,
      assigned_operator_id,
      current_project_id,
      insurance_expiry,
      fitness_certificate,
      pollution_certificate
    } = req.body;

    if (!vehicle_number || !name || !type) {
      return res.status(400).json({ success: false, message: 'Vehicle number, model/name, and type are required' });
    }

    const newVehicleNumber = vehicle_number.toUpperCase().trim();

    // Check if equipment record exists
    const existing = await db.query(
      'SELECT id FROM equipment WHERE UPPER(TRIM(vehicle_number)) = ?',
      [oldVehicleNumber]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE equipment SET
          vehicle_number = ?,
          name = ?,
          type = ?,
          company_name = ?,
          brand = ?,
          model = ?,
          year = ?,
          fuel_type = ?,
          engine_number = ?,
          chassis_number = ?,
          assigned_operator_id = ?,
          current_project_id = ?,
          insurance_expiry = ?,
          fitness_certificate = ?,
          pollution_certificate = ?
         WHERE id = ?`,
        [
          newVehicleNumber,
          name,
          type,
          company_name || null,
          brand || null,
          model || null,
          year ? parseInt(year) : null,
          fuel_type || 'diesel',
          engine_number || null,
          chassis_number || null,
          assigned_operator_id ? parseInt(assigned_operator_id) : null,
          current_project_id ? parseInt(current_project_id) : null,
          insurance_expiry || null,
          fitness_certificate || null,
          pollution_certificate || null,
          existing[0].id
        ]
      );
    } else {
      const eqCode = generateCode('EQP');
      await db.query(
        `INSERT INTO equipment (
          equipment_code, vehicle_number, name, type, company_name, brand, model, year, fuel_type,
          engine_number, chassis_number, assigned_operator_id, current_project_id,
          insurance_expiry, fitness_certificate, pollution_certificate, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'available')`,
        [
          eqCode,
          newVehicleNumber,
          name,
          type,
          company_name || null,
          brand || null,
          model || null,
          year ? parseInt(year) : null,
          fuel_type || 'diesel',
          engine_number || null,
          chassis_number || null,
          assigned_operator_id ? parseInt(assigned_operator_id) : null,
          current_project_id ? parseInt(current_project_id) : null,
          insurance_expiry || null,
          fitness_certificate || null,
          pollution_certificate || null
        ]
      );
    }

    // Sync matching fields on all documents in documents table
    await db.query(
      `UPDATE documents SET
        vehicle_number = ?,
        vehicle_model = ?,
        vehicle_type = ?,
        project_id = ?
       WHERE vehicle_number = ?`,
      [
        newVehicleNumber,
        name.trim(),
        type,
        current_project_id ? parseInt(current_project_id) : null,
        oldVehicleNumber
      ]
    );

    res.json({ success: true, message: 'Vehicle folder updated successfully' });
  } catch (error) {
    next(error);
  }
};

const getVehicleInfo = async (req, res, next) => {
  try {
    const vehicleNumber = req.params.vehicleNumber.toUpperCase().trim();
    const vehicles = await db.query(
      `SELECT e.*, p.name as project_name, u.name as operator_name 
       FROM equipment e 
       LEFT JOIN projects p ON e.current_project_id = p.id 
       LEFT JOIN users u ON e.assigned_operator_id = u.id 
       WHERE UPPER(TRIM(e.vehicle_number)) = ? OR UPPER(TRIM(e.plate_number)) = ?`,
      [vehicleNumber, vehicleNumber]
    );

    if (vehicles.length > 0) {
      res.json({ success: true, data: vehicles[0] });
    } else {
      // Fallback: build details from first matching document row
      const docVehicles = await db.query(
        `SELECT DISTINCT vehicle_number, vehicle_model, vehicle_type, project_id
         FROM documents
         WHERE UPPER(TRIM(vehicle_number)) = ?`,
        [vehicleNumber]
      );
      if (docVehicles.length > 0) {
        const dv = docVehicles[0];
        res.json({
          success: true,
          data: {
            vehicle_number: dv.vehicle_number,
            name: dv.vehicle_model,
            type: dv.vehicle_type,
            current_project_id: dv.project_id
          }
        });
      } else {
        res.json({ success: true, data: null });
      }
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDocuments,
  getDocument,
  uploadDocument,
  updateDocument,
  deleteDocument,
  viewDocument,
  downloadDocument,
  checkFileExists,
  updateVehicleFolder,
  getVehicleInfo
};
