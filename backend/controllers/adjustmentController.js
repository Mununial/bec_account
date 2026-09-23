/**
 * Fee Adjustment Controller (Scholarship & Waivers)
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query, withTransaction } = require('../config/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

/**
 * List Adjustments
 * GET /api/admin/adjustments
 */
async function getAdjustments(req, res) {
  try {
    const [adjustments] = await query(`
      SELECT a.*, s.reg_no, s.full_name, b.code AS branch_code, i.invoice_no, fc.name AS category_name,
             u.email AS requested_by_email, au.email AS approved_by_email
      FROM adjustments a
      JOIN students s ON a.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      LEFT JOIN invoices i ON a.invoice_id = i.id
      JOIN fee_categories fc ON a.fee_category_id = fc.id
      JOIN users u ON a.requested_by = u.id
      LEFT JOIN users au ON a.approved_by = au.id
      ORDER BY a.created_at DESC
    `);

    return success(res, adjustments, 'Fee adjustments loaded.');
  } catch (err) {
    return error(res, 'Failed to load adjustments.', 500);
  }
}

/**
 * Apply Credit/Debit Adjustment (Accounts Head & Admin Only)
 * POST /api/admin/adjustments
 */
async function applyAdjustment(req, res) {
  const { studentId, invoiceId, categoryId, adjustmentType, amount, reason } = req.body;

  if (!studentId || !categoryId || !adjustmentType || !amount || !reason) {
    return error(res, 'Student, fee category, type (CREDIT/DEBIT), amount, and reason are required.', 400);
  }

  const adjAmount = parseFloat(amount);
  if (adjAmount <= 0) {
    return error(res, 'Adjustment amount must be greater than zero.', 400);
  }

  try {
    const result = await withTransaction(async (connection) => {
      // Insert adjustment record as APPROVED
      const [adjRes] = await connection.query(
        `INSERT INTO adjustments (student_id, invoice_id, fee_category_id, adjustment_type, amount, reason, status, requested_by, approved_by)
         VALUES (?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?)`,
        [studentId, invoiceId || null, categoryId, adjustmentType, adjAmount, reason, req.user.id, req.user.id]
      );
      const adjustmentId = adjRes.insertId;

      // Update invoice if linked
      if (invoiceId) {
        if (adjustmentType === 'CREDIT') {
          // Credit reduces outstanding balance
          await connection.query(
            `UPDATE invoices 
             SET discount_amount = discount_amount + ?,
                 total_payable = GREATEST(0, total_payable - ?),
                 outstanding_amount = GREATEST(0, outstanding_amount - ?),
                 updated_at = NOW()
             WHERE id = ?`,
            [adjAmount, adjAmount, adjAmount, invoiceId]
          );
        } else {
          // Debit increases total payable
          await connection.query(
            `UPDATE invoices 
             SET total_payable = total_payable + ?,
                 outstanding_amount = outstanding_amount + ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [adjAmount, adjAmount, invoiceId]
          );
        }
      }

      // Update student fee ledger row
      const [ledgerRows] = await connection.query(
        `SELECT id, outstanding_amount FROM student_fee_ledgers 
         WHERE student_id = ? AND fee_category_id = ? ${invoiceId ? 'AND invoice_id = ?' : ''} LIMIT 1`,
        invoiceId ? [studentId, categoryId, invoiceId] : [studentId, categoryId]
      );

      if (ledgerRows.length > 0) {
        const delta = adjustmentType === 'CREDIT' ? -adjAmount : adjAmount;
        await connection.query(
          `UPDATE student_fee_ledgers 
           SET adjustment_amount = adjustment_amount + ?,
               outstanding_amount = GREATEST(0, outstanding_amount + ?),
               updated_at = NOW()
           WHERE id = ?`,
          [adjAmount, delta, ledgerRows[0].id]
        );
      }

      // Fetch user_id for notification
      const [stUser] = await connection.query(`SELECT user_id FROM students WHERE id = ?`, [studentId]);

      return {
        adjustmentId,
        studentUserId: stUser[0] ? stUser[0].user_id : null
      };
    });

    if (result.studentUserId) {
      createNotification({
        userId: result.studentUserId,
        title: 'Fee Adjustment Applied',
        message: `An adjustment of ₹${adjAmount} (${adjustmentType}) has been applied to your ledger. Reason: ${reason}`,
        category: 'ADJUSTMENT'
      });
    }

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'APPLY_FEE_ADJUSTMENT',
      module: 'ADJUSTMENT',
      recordId: result.adjustmentId,
      reason: `Adjustment ${adjustmentType} of ₹${adjAmount}: ${reason}`,
      ipAddress: req.ip
    });

    return success(res, null, 'Fee adjustment applied and reflected on ledger.', 201);
  } catch (err) {
    console.error('applyAdjustment error:', err);
    return error(res, 'Failed to apply fee adjustment.', 500);
  }
}

module.exports = {
  getAdjustments,
  applyAdjustment
};
