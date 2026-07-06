const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.use(authenticate);

router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTask);
router.post('/', authorize('admin'), taskController.createTask);
router.put('/:id', authorize('admin'), taskController.updateTask);
router.delete('/:id', authorize('admin'), taskController.deleteTask);

// Comments
router.post('/:taskId/comments', authorize('admin'), taskController.addComment);

module.exports = router;
