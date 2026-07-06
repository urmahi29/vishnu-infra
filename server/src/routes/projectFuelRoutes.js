const express = require('express');
const router = express.Router();
const projectFuelController = require('../controllers/projectFuelController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/project/:projectId', projectFuelController.getFuelEntries);
router.post('/', authorize('admin'), projectFuelController.createFuelEntry);
router.put('/:id', authorize('admin'), projectFuelController.updateFuelEntry);
router.delete('/:id', authorize('admin'), projectFuelController.deleteFuelEntry);

module.exports = router;
