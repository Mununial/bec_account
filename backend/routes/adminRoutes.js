/**
 * Administrative & Accounts Executive Operations Routes
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const refundController = require('../controllers/refundController');
const adjustmentController = require('../controllers/adjustmentController');
const reconciliationController = require('../controllers/reconciliationController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

// Executive Dashboard & Intelligence
router.get(
  '/dashboard',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  adminController.getDashboard
);
router.get(
  '/intelligence',
  requireRole('ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  adminController.getIntelligence
);

// Students Directory
router.get(
  '/students',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  adminController.getStudents
);
router.get(
  '/students/:id/ledger',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  adminController.getStudentLedger
);

// Refunds Workflow
router.get(
  '/refunds',
  requireRole('ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  refundController.getRefunds
);
router.post(
  '/refunds/:id/approve',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  refundController.approveRefund
);
router.post(
  '/refunds/:id/reject',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  refundController.rejectRefund
);

// Fee Adjustments & Waivers
router.get(
  '/adjustments',
  requireRole('ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  adjustmentController.getAdjustments
);
router.post(
  '/adjustments',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  adjustmentController.applyAdjustment
);

// Payment Reconciliation
router.get(
  '/reconciliation',
  requireRole('ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  reconciliationController.getReconciliation
);
router.post(
  '/reconciliation/:id/resolve',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  reconciliationController.resolveReconciliation
);

// Audit Logs
router.get(
  '/audit-logs',
  requireRole('ADMIN', 'AUDITOR_READ_ONLY'),
  adminController.getAuditLogs
);

// User Accounts Management
router.get('/users', requireRole('ADMIN'), adminController.getUsers);
router.post('/users/:id/status', requireRole('ADMIN'), adminController.updateUserStatus);

module.exports = router;
