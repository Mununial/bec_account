/**
 * Fee Structure & Configuration Routes
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const express = require('express');
const router = express.Router();
const feeController = require('../controllers/feeController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

router.get('/structures', feeController.getFeeStructures);
router.post(
  '/structures',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  feeController.createFeeStructure
);
router.post(
  '/structures/:id/assign-bulk',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  feeController.assignFeeStructureBulk
);
router.get('/categories', feeController.getCategories);
router.get('/fine-rules', feeController.getFineRules);
router.post(
  '/fine-rules',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  feeController.updateFineRule
);

module.exports = router;
