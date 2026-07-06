const express = require('express');
const router = express.Router();
const staffExpenseController = require('../controllers/staffExpenseController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/reports/employees', authorize('admin'), staffExpenseController.getEmployeeExpenseReport);
router.get('/reports/monthly', authorize('admin'), staffExpenseController.getMonthlyExpenseReport);

router.get('/', staffExpenseController.getExpenses);
router.get('/:id', staffExpenseController.getExpense);
router.post('/', staffExpenseController.createExpense);
router.put('/:id', authorize('admin'), staffExpenseController.updateExpense);
router.delete('/:id', authorize('admin'), staffExpenseController.deleteExpense);

module.exports = router;
