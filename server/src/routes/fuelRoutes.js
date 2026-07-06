const express = require('express');
const router = express.Router();
const fuelController = require('../controllers/fuelController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/reports/vehicles', authorize('admin'), fuelController.getVehicleFuelReport);
router.get('/reports/monthly', authorize('admin'), fuelController.getMonthlyFuelReport);

router.get('/', fuelController.getFuelEntries);
router.get('/:id', fuelController.getFuelEntry);
router.post('/', authorize('admin'), fuelController.createFuelEntry);
router.put('/:id', authorize('admin'), fuelController.updateFuelEntry);
router.delete('/:id', authorize('admin'), fuelController.deleteFuelEntry);

module.exports = router;
