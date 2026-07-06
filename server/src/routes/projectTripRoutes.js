const express = require('express');
const router = express.Router();
const projectTripController = require('../controllers/projectTripController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/project/:projectId', projectTripController.getTrips);
router.post('/sheet', authorize('admin'), projectTripController.saveTripSheet);
router.delete('/sheet', authorize('admin'), projectTripController.deleteTripSheet);
router.post('/', authorize('admin'), projectTripController.createTrip);
router.put('/:id', authorize('admin'), projectTripController.updateTrip);
router.delete('/:id', authorize('admin'), projectTripController.deleteTrip);

module.exports = router;
