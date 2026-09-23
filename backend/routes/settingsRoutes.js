/**
 * System Settings & Taxonomy Routes
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const express = require('express');
const router = express.Router();
const settingsController = require('../controllers/settingsController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/sessions', settingsController.getSessions);
router.get('/courses-branches', settingsController.getCoursesAndBranches);
router.get('/system', settingsController.getSystemSettings);
router.put('/system', requireRole('ADMIN'), settingsController.updateSystemSettings);

module.exports = router;
