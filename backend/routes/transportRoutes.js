/**
 * Transport Routes
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

// 1. Get Students Transport Directory
router.get(
  '/students',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  transportController.getStudentsTransport
);

// 2. Pickup Points Master
router.get(
  '/pickup-points',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  transportController.getPickupPoints
);

router.post(
  '/pickup-points',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  transportController.addPickupPoint
);

// 3. Assign / Modify Transport
router.post(
  '/assign',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN'),
  transportController.assignStudentTransport
);

// 4. Collect Transport Fee Digitally
router.post(
  '/collect-fee',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN'),
  transportController.collectTransportFee
);

// 5. Export to Excel/CSV
router.get(
  '/export',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  transportController.exportTransportCSV
);

module.exports = router;
