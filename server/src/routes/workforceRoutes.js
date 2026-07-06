const express = require('express');
const router = express.Router();
const workforceController = require('../controllers/workforceController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', workforceController.getWorkforce);
router.get('/:id', workforceController.getWorker);
router.post('/', authorize('admin'), workforceController.createWorker);
router.put('/:id', authorize('admin'), workforceController.updateWorker);
router.delete('/:id', authorize('admin'), workforceController.deleteWorker);

// Attendance
router.post('/attendance', authorize('admin'), workforceController.markAttendance);

// Payroll
router.post('/payroll/process', authorize('admin'), workforceController.processPayroll);

// Document Management
router.get('/:employeeId/documents', workforceController.getEmployeeDocuments);
router.post('/:employeeId/documents', authorize('admin'), upload.single('file'), workforceController.uploadEmployeeDocument);
router.delete('/:employeeId/documents/:docId', authorize('admin'), workforceController.deleteEmployeeDocument);

module.exports = router;
