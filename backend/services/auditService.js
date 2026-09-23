/**
 * Immutable Audit Logging Service
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');

async function logAudit({
  userId = null,
  role = null,
  action,
  module,
  recordId = null,
  oldValue = null,
  newValue = null,
  reason = null,
  ipAddress = null
}) {
  try {
    const oldValJson = oldValue ? JSON.stringify(oldValue) : null;
    const newValJson = newValue ? JSON.stringify(newValue) : null;

    await query(
      `INSERT INTO audit_logs (user_id, role, action, module, record_id, old_value, new_value, reason, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, role, action, module, recordId, oldValJson, newValJson, reason, ipAddress]
    );
  } catch (error) {
    console.error('[AuditService Error]', error.message);
    // Never fail the primary transaction because of audit log failure, but log to stderr
  }
}

module.exports = {
  logAudit
};
