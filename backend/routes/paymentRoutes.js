/**
 * Payment Routes
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.post('/create-order', paymentController.createPaymentOrder);
router.post('/verify', paymentController.verifyPayment);
router.post(
  '/record-offline',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN'),
  paymentController.recordOfflinePayment
);
router.post(
  '/counter',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN'),
  paymentController.recordCounterPayment
);
router.get('/:id', paymentController.getPaymentById);

module.exports = router;
