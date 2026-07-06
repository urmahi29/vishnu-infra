const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/admin', authorize('admin'), dashboardController.getAdminDashboard);
router.get('/user', dashboardController.getUserDashboard);

module.exports = router;
