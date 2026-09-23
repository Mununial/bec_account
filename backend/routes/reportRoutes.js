/**
 * Financial Reports & Analytics Routes
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(
  authenticateToken,
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY')
);

router.get('/collections', reportController.getCollectionsReport);
router.get('/defaulters', reportController.getDefaultersReport);
router.get('/export-csv', reportController.exportCsv);

module.exports = router;
