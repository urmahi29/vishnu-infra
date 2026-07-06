const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

// Projects CRUD
router.get('/', projectController.getProjects);
router.get('/:id', projectController.getProject);
router.post('/', authorize('admin'), projectController.createProject);
router.put('/:id', authorize('admin'), projectController.updateProject);
router.delete('/:id', authorize('admin'), projectController.deleteProject);

// Staff CRUD
router.get('/:projectId/staff', projectController.getStaffByProject);
router.post('/:projectId/staff', authorize('admin'), projectController.addStaff);
router.put('/:projectId/staff/:id', authorize('admin'), projectController.editStaff);
router.delete('/:projectId/staff/:id', authorize('admin'), projectController.deleteStaff);

// Vehicle CRUD
router.get('/:projectId/vehicles', projectController.getVehiclesByProject);
router.post('/:projectId/vehicles', authorize('admin'), projectController.addVehicle);
router.put('/:projectId/vehicles/:id', authorize('admin'), projectController.editVehicle);
router.delete('/:projectId/vehicles/:id', authorize('admin'), projectController.deleteVehicle);

// Milestones CRUD (kept for compatibility)
router.get('/:projectId/milestones', projectController.getMilestones);
router.post('/:projectId/milestones', authorize('admin'), projectController.createMilestone);
router.put('/:projectId/milestones/:id', authorize('admin'), projectController.updateMilestone);

module.exports = router;
