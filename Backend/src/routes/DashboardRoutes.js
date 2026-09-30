const express = require('express');
const controller = require('../controllers/DashboardController');
const reportController = require('../controllers/AdministrativeReportController');
const { authenticate, authorize } = require('../middleware/AuthMiddleware');

const router = express.Router();
router.use(authenticate);
router.get('/overview', controller.overview);
router.get('/administrative-report', authorize('administrador'), reportController.show);
router.get('/administrative-report/export/:format', authorize('administrador'), reportController.download);

module.exports = router;
