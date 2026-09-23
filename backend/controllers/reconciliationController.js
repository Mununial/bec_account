/**
 * Bank & Payment Gateway Reconciliation Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../services/auditService');

/**
 * Get Reconciliation Dashboard & Discrepancies
 * GET /api/admin/reconciliation
 */
async function getReconciliation(req, res) {
  try {
    // 1. Reconciliation Records
    const [records] = await query(`
      SELECT rr.*, p.payment_no, p.amount AS payment_amount, p.created_at AS payment_date,
             u.email AS reconciled_by_email
      FROM reconciliation_records rr
      LEFT JOIN payments p ON rr.payment_id = p.id
      LEFT JOIN users u ON rr.reconciled_by = u.id
      ORDER BY rr.status ASC, rr.created_at DESC
    `);

    // 2. Summary stats
    const [summary] = await query(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'SUCCESS') AS system_total,
        (SELECT COALESCE(SUM(gateway_amount), 0) FROM reconciliation_records) AS gateway_total,
        (SELECT COUNT(*) FROM reconciliation_records WHERE status = 'MATCHED') AS matched_count,
        (SELECT COUNT(*) FROM reconciliation_records WHERE status = 'UNMATCHED') AS unmatched_count,
        (SELECT COUNT(*) FROM reconciliation_records WHERE status = 'INVESTIGATION') AS investigation_count,
        (SELECT COUNT(*) FROM reconciliation_records WHERE status = 'RESOLVED') AS resolved_count
    `);

    return success(res, { summary: summary[0], records }, 'Reconciliation data retrieved.');
  } catch (err) {
    console.error('getReconciliation error:', err);
    return error(res, 'Failed to load reconciliation records.', 500);
  }
}

/**
 * Resolve or Update Reconciliation Item
 * POST /api/admin/reconciliation/:id/resolve
 */
async function resolveReconciliation(req, res) {
  const recordId = parseInt(req.params.id, 10);
  const { status, remarks } = req.body;

  const validStatuses = ['MATCHED', 'INVESTIGATION', 'RESOLVED'];
  if (!status || !validStatuses.includes(status)) {
    return error(res, `Invalid status. Allowed: ${validStatuses.join(', ')}`, 400);
  }

  try {
    await query(
      `UPDATE reconciliation_records 
       SET status = ?, remarks = ?, reconciled_by = ?, reconciled_at = NOW()
       WHERE id = ?`,
      [status, remarks || 'Marked by Accounts Head', req.user.id, recordId]
    );

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'RESOLVE_RECONCILIATION',
      module: 'RECONCILIATION',
      recordId,
      reason: `Status changed to ${status}. Remarks: ${remarks}`,
      ipAddress: req.ip
    });

    return success(res, null, 'Reconciliation record updated.');
  } catch (err) {
    return error(res, 'Failed to update reconciliation.', 500);
  }
}

module.exports = {
  getReconciliation,
  resolveReconciliation
};
