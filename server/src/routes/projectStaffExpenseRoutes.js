const express = require('express');
const router = express.Router();
const projectStaffExpenseController = require('../controllers/projectStaffExpenseController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/project/:projectId', projectStaffExpenseController.getExpenses);
router.post('/', authorize('admin'), projectStaffExpenseController.createExpense);
router.put('/:id', authorize('admin'), projectStaffExpenseController.updateExpense);
router.delete('/:id', authorize('admin'), projectStaffExpenseController.deleteExpense);

module.exports = router;
