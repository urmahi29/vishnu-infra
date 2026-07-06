const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/dashboard/kpis', reportController.getDashboardKPIs);
router.get('/projects/status', reportController.getProjectStatusDistribution);
router.get('/expenses/monthly', reportController.getMonthlyExpenses);
router.get('/equipment/utilization', reportController.getEquipmentUtilization);
router.get('/workforce/distribution', reportController.getWorkforceDistribution);
router.get('/budget/vs-actual', authorize('admin'), reportController.getBudgetVsActual);
router.get('/safety/overview', reportController.getSafetyReport);
router.get('/export/:type', authorize('admin'), reportController.getExportReport);

module.exports = router;
