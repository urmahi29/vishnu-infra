const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);
router.use(authorize('admin'));

router.get('/registrations/pending', userController.getPendingRegistrations);
router.get('/registrations/pending-count', userController.getPendingCount);
router.put('/:id/approve', userController.approveRegistration);
router.put('/:id/reject', userController.rejectRegistration);

router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.put('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

// Audit Logs
router.get('/audit/logs', userController.getAuditLogs);

module.exports = router;
