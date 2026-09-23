/**
 * Financial Ledger & Calculation Engine
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');

/**
 * Get comprehensive financial balance for a student
 * @param {number} studentId
 */
async function getStudentBalance(studentId) {
  const [rows] = await query(
    `SELECT 
       COALESCE(SUM(amount_charged), 0) AS total_charged,
       COALESCE(SUM(scholarship_amount), 0) AS total_scholarship,
       COALESCE(SUM(discount_amount), 0) AS total_discount,
       COALESCE(SUM(fine_amount), 0) AS total_fine,
       COALESCE(SUM(adjustment_amount), 0) AS total_adjustment,
       COALESCE(SUM(amount_paid), 0) AS total_paid,
       COALESCE(SUM(outstanding_amount), 0) AS total_outstanding
     FROM student_fee_ledgers 
     WHERE student_id = ?`,
    [studentId]
  );

  const stats = rows[0];

  // Overdue calculation (outstanding where due_date < today)
  const [overdueRows] = await query(
    `SELECT COALESCE(SUM(outstanding_amount), 0) AS overdue_amount, COUNT(*) as overdue_items
     FROM student_fee_ledgers
     WHERE student_id = ? AND outstanding_amount > 0 AND due_date IS NOT NULL AND due_date < CURDATE()`,
    [studentId]
  );

  const overdue = overdueRows[0];

  return {
    totalCharged: parseFloat(stats.total_charged),
    totalScholarship: parseFloat(stats.total_scholarship),
    totalDiscount: parseFloat(stats.total_discount),
    totalFine: parseFloat(stats.total_fine),
    totalAdjustment: parseFloat(stats.total_adjustment),
    totalPaid: parseFloat(stats.total_paid),
    totalOutstanding: parseFloat(stats.total_outstanding),
    overdueAmount: parseFloat(overdue.overdue_amount),
    overdueItemsCount: parseInt(overdue.overdue_items, 10)
  };
}

/**
 * Recalculate late payment fines for overdue ledgers
 * @param {number} studentId
 */
async function applyLateFines(studentId, connection) {
  const db = connection || { query };

  // Find overdue ledger items without fines applied yet
  const [overdueItems] = await db.query(
    `SELECT l.id, l.fee_category_id, l.outstanding_amount, l.due_date,
            DATEDIFF(CURDATE(), l.due_date) AS days_overdue
     FROM student_fee_ledgers l
     WHERE l.student_id = ? AND l.outstanding_amount > 0 
       AND l.due_date IS NOT NULL AND l.due_date < CURDATE() AND l.fine_amount = 0`,
    [studentId]
  );

  for (const item of overdueItems) {
    const [rules] = await db.query(
      `SELECT grace_period_days, fine_type, fine_value, max_fine_limit
       FROM fine_rules
       WHERE fee_category_id = ? AND is_active = 1 LIMIT 1`,
      [item.fee_category_id]
    );

    if (rules.length > 0) {
      const rule = rules[0];
      const overdueDays = item.days_overdue - rule.grace_period_days;

      if (overdueDays > 0) {
        let fine = 0;
        if (rule.fine_type === 'FIXED') {
          fine = parseFloat(rule.fine_value);
        } else if (rule.fine_type === 'DAILY') {
          fine = Math.min(
            overdueDays * parseFloat(rule.fine_value),
            parseFloat(rule.max_fine_limit)
          );
        }

        if (fine > 0) {
          await db.query(
            `UPDATE student_fee_ledgers 
             SET fine_amount = ?, outstanding_amount = outstanding_amount + ?, updated_at = NOW()
             WHERE id = ?`,
            [fine, fine, item.id]
          );
        }
      }
    }
  }
}

/**
 * Atomically post payment against invoice items and fee ledger
 * MUST be executed inside an active MySQL transaction!
 * @param {Object} connection - Active mysql2 transaction connection
 * @param {Object} params - { invoiceId, studentId, amountPaid, paymentId }
 */
async function postPaymentToLedger(connection, { invoiceId, studentId, amountPaid, paymentId }) {
  let remainingPayment = parseFloat(amountPaid);

  // 1. Lock invoice row FOR UPDATE
  const [invoiceRows] = await connection.query(
    `SELECT id, total_payable, paid_amount, outstanding_amount, status 
     FROM invoices 
     WHERE id = ? FOR UPDATE`,
    [invoiceId]
  );

  if (invoiceRows.length === 0) {
    throw new Error(`Invoice #${invoiceId} not found`);
  }

  const inv = invoiceRows[0];
  const newInvoicePaid = parseFloat(inv.paid_amount) + remainingPayment;
  const newInvoiceOutstanding = Math.max(0, parseFloat(inv.total_payable) - newInvoicePaid);
  const newInvoiceStatus = newInvoiceOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';

  await connection.query(
    `UPDATE invoices 
     SET paid_amount = ?, outstanding_amount = ?, status = ?, updated_at = NOW() 
     WHERE id = ?`,
    [newInvoicePaid, newInvoiceOutstanding, newInvoiceStatus, invoiceId]
  );

  // 2. Lock and fetch invoice items
  const [items] = await connection.query(
    `SELECT id, fee_category_id, amount, paid_amount 
     FROM invoice_items 
     WHERE invoice_id = ? FOR UPDATE`,
    [invoiceId]
  );

  for (const item of items) {
    if (remainingPayment <= 0) break;

    const itemDue = parseFloat(item.amount) - parseFloat(item.paid_amount);
    if (itemDue > 0) {
      const allocate = Math.min(remainingPayment, itemDue);
      const updatedItemPaid = parseFloat(item.paid_amount) + allocate;

      await connection.query(
        `UPDATE invoice_items SET paid_amount = ? WHERE id = ?`,
        [updatedItemPaid, item.id]
      );

      // 3. Update corresponding ledger record
      const [ledgerRows] = await connection.query(
        `SELECT id, amount_charged, amount_paid, outstanding_amount 
         FROM student_fee_ledgers 
         WHERE invoice_id = ? AND fee_category_id = ? FOR UPDATE`,
        [invoiceId, item.fee_category_id]
      );

      if (ledgerRows.length > 0) {
        const led = ledgerRows[0];
        const newLedgerPaid = parseFloat(led.amount_paid) + allocate;
        const newLedgerOutstanding = Math.max(0, parseFloat(led.outstanding_amount) - allocate);
        const newLedgerStatus = newLedgerOutstanding <= 0 ? 'PAID' : 'PARTIALLY_PAID';

        await connection.query(
          `UPDATE student_fee_ledgers 
           SET amount_paid = ?, outstanding_amount = ?, status = ?, updated_at = NOW() 
           WHERE id = ?`,
          [newLedgerPaid, newLedgerOutstanding, newLedgerStatus, led.id]
        );
      }

      remainingPayment -= allocate;
    }
  }

  return {
    invoiceId,
    newStatus: newInvoiceStatus,
    outstandingAmount: newInvoiceOutstanding
  };
}

module.exports = {
  getStudentBalance,
  applyLateFines,
  postPaymentToLedger
};
