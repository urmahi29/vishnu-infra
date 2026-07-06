const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const authenticate = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const upload = require('../middleware/upload');

router.use(authenticate);

router.get('/', documentController.getDocuments);
router.get('/download/:id', documentController.downloadDocument);
router.get('/view/:id', documentController.viewDocument);
router.get('/check-file/:id', documentController.checkFileExists);
router.get('/vehicle-info/:vehicleNumber', documentController.getVehicleInfo);
router.get('/:id', documentController.getDocument);
router.post('/', authorize('admin'), upload.array('files'), documentController.uploadDocument);
router.put('/vehicle/:vehicleNumber', authorize('admin'), documentController.updateVehicleFolder);
router.put('/:id', authorize('admin'), documentController.updateDocument);
router.delete('/:id', authorize('admin'), documentController.deleteDocument);

module.exports = router;
