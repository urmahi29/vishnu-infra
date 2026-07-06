const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', materialController.getMaterials);
router.get('/:id', materialController.getMaterial);
router.post('/', authorize('admin'), materialController.createMaterial);
router.put('/:id', authorize('admin'), materialController.updateMaterial);
router.delete('/:id', authorize('admin'), materialController.deleteMaterial);

// Stock Movements
router.post('/stock-movement', authorize('admin'), materialController.createStockMovement);

// Suppliers
router.get('/suppliers/list', materialController.getSuppliers);
router.post('/suppliers', authorize('admin'), materialController.createSupplier);

// Purchase Orders
router.get('/purchase-orders/list', materialController.getPurchaseOrders);

module.exports = router;
