const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', tripController.getTrips);
router.get('/:id', tripController.getTrip);
router.post('/', authorize('admin'), tripController.createTrip);
router.put('/:id', authorize('admin'), tripController.updateTrip);
router.delete('/:id', authorize('admin'), tripController.deleteTrip);

router.patch('/:id/start', tripController.startTrip);
router.patch('/:id/complete', tripController.completeTrip);

module.exports = router;
