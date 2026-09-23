/**
 * Refund Management Controller (Accounts Head & Admin)
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query, withTransaction } = require('../config/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

/**
 * List Refund Requests
 * GET /api/admin/refunds
 */
async function getRefunds(req, res) {
  try {
    const [refunds] = await query(`
      SELECT r.*, s.reg_no, s.full_name, b.code AS branch_code, i.invoice_no, p.payment_no,
             u.email AS requested_by_email, au.email AS approved_by_email
      FROM refunds r
      JOIN students s ON r.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      JOIN invoices i ON r.invoice_id = i.id
      JOIN payments p ON r.payment_id = p.id
      JOIN users u ON r.requested_by = u.id
      LEFT JOIN users au ON r.approved_by = au.id
      ORDER BY r.created_at DESC
    `);

    return success(res, refunds, 'Refund requests retrieved.');
  } catch (err) {
    console.error('getRefunds error:', err);
    return error(res, 'Failed to load refund requests.', 500);
  }
}

/**
 * Approve Refund Request (Accounts Head / Admin Only)
 * POST /api/admin/refunds/:id/approve
 */
async function approveRefund(req, res) {
  const refundId = parseInt(req.params.id, 10);
  const { remarks } = req.body;

  try {
    const result = await withTransaction(async (connection) => {
      const [refRows] = await connection.query(
        `SELECT r.*, s.user_id FROM refunds r JOIN students s ON r.student_id = s.id WHERE r.id = ? FOR UPDATE`,
        [refundId]
      );

      if (refRows.length === 0) {
        throw new Error('Refund record not found.');
      }

      const r = refRows[0];
      if (r.status !== 'REQUESTED') {
        throw new Error(`Refund is already ${r.status.toLowerCase()}.`);
      }

      // Mark refund APPROVED
      await connection.query(
        `UPDATE refunds 
         SET status = 'APPROVED', approved_by = ?, remarks = ?, updated_at = NOW() 
         WHERE id = ?`,
        [req.user.id, remarks || 'Approved by Accounts Head', refundId]
      );

      // Update payment status to REFUNDED / PARTIALLY_REFUNDED
      await connection.query(
        `UPDATE payments SET status = 'REFUNDED' WHERE id = ?`,
        [r.payment_id]
      );

      // Adjust invoice paid amount
      await connection.query(
        `UPDATE invoices 
         SET paid_amount = GREATEST(0, paid_amount - ?), 
             outstanding_amount = outstanding_amount + ?,
             status = 'PARTIALLY_PAID',
             updated_at = NOW()
         WHERE id = ?`,
        [r.amount, r.amount, r.invoice_id]
      );

      return r;
    });

    // Notify student
    createNotification({
      userId: result.user_id,
      title: 'Refund Request Approved',
      message: `Your refund request ${result.refund_no} of ₹${result.amount} has been approved by Accounts Head.`,
      category: 'REFUND'
    });

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'APPROVE_REFUND',
      module: 'REFUND',
      recordId: refundId,
      reason: remarks || `Refund of ₹${result.amount} approved`,
      ipAddress: req.ip
    });

    return success(res, null, `Refund ${result.refund_no} approved successfully.`);
  } catch (err) {
    console.error('approveRefund error:', err);
    return error(res, err.message || 'Failed to approve refund.', 400);
  }
}

/**
 * Reject Refund Request
 * POST /api/admin/refunds/:id/reject
 */
async function rejectRefund(req, res) {
  const refundId = parseInt(req.params.id, 10);
  const { reason } = req.body;

  if (!reason) {
    return error(res, 'Rejection reason is required.', 400);
  }

  try {
    const [refRows] = await query(
      `SELECT r.*, s.user_id FROM refunds r JOIN students s ON r.student_id = s.id WHERE r.id = ?`,
      [refundId]
    );

    if (refRows.length === 0) {
      return error(res, 'Refund request not found.', 404);
    }

    const r = refRows[0];
    await query(
      `UPDATE refunds SET status = 'REJECTED', approved_by = ?, remarks = ?, updated_at = NOW() WHERE id = ?`,
      [req.user.id, reason, refundId]
    );

    createNotification({
      userId: r.user_id,
      title: 'Refund Request Rejected',
      message: `Your refund request ${r.refund_no} was not approved. Reason: ${reason}`,
      category: 'REFUND'
    });

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'REJECT_REFUND',
      module: 'REFUND',
      recordId: refundId,
      reason,
      ipAddress: req.ip
    });

    return success(res, null, `Refund request rejected.`);
  } catch (err) {
    return error(res, 'Failed to reject refund.', 500);
  }
}

module.exports = {
  getRefunds,
  approveRefund,
  rejectRefund
};
