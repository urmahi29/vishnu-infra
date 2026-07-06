const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// Budget Items
router.get('/items', budgetController.getBudgetItems);
router.post('/items', authorize('admin'), budgetController.createBudgetItem);
router.put('/items/:id', authorize('admin'), budgetController.updateBudgetItem);

// Expenses
router.get('/expenses', budgetController.getExpenses);
router.post('/expenses', authorize('admin'), budgetController.createExpense);
router.put('/expenses/:id/status', authorize('admin'), budgetController.updateExpenseStatus);

// Budget Summary
router.get('/summary/:projectId', budgetController.getBudgetSummary);

// Project Expenses
router.get('/project-expenses', budgetController.getProjectExpenses);
router.post('/project-expenses', authorize('admin'), budgetController.createProjectExpense);
router.put('/project-expenses/:id', authorize('admin'), budgetController.updateProjectExpense);
router.delete('/project-expenses/:id', authorize('admin'), budgetController.deleteProjectExpense);

// Invoices
router.get('/invoices', budgetController.getInvoices);
router.post('/invoices', authorize('admin'), budgetController.createInvoice);
router.post('/invoices/:invoiceId/payments', authorize('admin'), budgetController.recordPayment);

module.exports = router;
