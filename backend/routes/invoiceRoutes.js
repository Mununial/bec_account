/**
 * Invoice Management Routes
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get(
  '/',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  invoiceController.getInvoices
);
router.get(
  '/:id',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  invoiceController.getInvoiceById
);
router.post(
  '/generate',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN'),
  invoiceController.generateInvoice
);
router.post(
  '/:id/cancel',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  invoiceController.cancelInvoice
);

module.exports = router;
