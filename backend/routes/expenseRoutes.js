/**
 * Expense & Accounts Master Routes
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

router.use(authenticateToken);

// 1. Search Expenses
router.get(
  '/',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  expenseController.getExpenses
);

// 2. Record New Expense Voucher
router.post(
  '/',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN'),
  expenseController.createExpense
);

// 3. Expense & Income Categories Master
router.get(
  '/categories',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  expenseController.getCategories
);

router.post(
  '/categories',
  requireRole('ACCOUNTS_HEAD', 'ADMIN'),
  expenseController.createCategory
);

// 4. Party Master (Vendors / Suppliers / Contractors)
router.get(
  '/parties',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  expenseController.getParties
);

router.post(
  '/parties',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN'),
  expenseController.createParty
);

// 5. Profit & Loss Statement (Income vs Expense)
router.get(
  '/profit-loss',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  expenseController.getProfitLoss
);

// 6. Day Book Journal (Daily Cash & Bank Statement)
router.get(
  '/daybook',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  expenseController.getDayBook
);

// 7. Export Expenses to CSV
router.get(
  '/export',
  requireRole('ACCOUNTS_STAFF', 'ACCOUNTS_HEAD', 'ADMIN', 'AUDITOR_READ_ONLY'),
  expenseController.exportExpensesCSV
);

module.exports = router;
