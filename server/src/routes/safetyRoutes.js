const express = require('express');
const router = express.Router();
const safetyController = require('../controllers/safetyController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// Incidents
router.get('/incidents', safetyController.getIncidents);
router.post('/incidents', authorize('admin'), safetyController.createIncident);
router.put('/incidents/:id', authorize('admin'), safetyController.updateIncident);

// Inspections
router.get('/inspections', safetyController.getInspections);
router.post('/inspections', authorize('admin'), safetyController.createInspection);

// Training
router.get('/training', safetyController.getTraining);
router.post('/training', authorize('admin'), safetyController.createTraining);
router.post('/training/:trainingId/attendees', authorize('admin'), safetyController.addTrainingAttendee);

module.exports = router;
