/**
 * Accounts Executive & Administrative Intelligence Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../services/auditService');

/**
 * Accounts & Admin Executive Dashboard Metrics
 * GET /api/admin/dashboard
 */
async function getDashboard(req, res) {
  try {
    // 1. KPI Collections & Balances
    const [stats] = await query(`
      SELECT 
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'SUCCESS' AND DATE(created_at) = CURDATE()) AS today_collection,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'SUCCESS' AND YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())) AS month_collection,
        (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'SUCCESS') AS total_collection,
        (SELECT COALESCE(SUM(outstanding_amount), 0) FROM invoices WHERE status != 'CANCELLED') AS total_outstanding,
        (SELECT COALESCE(SUM(outstanding_amount), 0) FROM invoices WHERE status != 'CANCELLED' AND due_date < CURDATE()) AS overdue_amount,
        (SELECT COUNT(*) FROM payments WHERE status = 'PENDING') AS pending_payments_count,
        (SELECT COUNT(*) FROM refunds WHERE status = 'REQUESTED') AS pending_refunds_count,
        (SELECT COUNT(*) FROM reconciliation_records WHERE status = 'UNMATCHED') AS pending_recon_count,
        (SELECT COUNT(DISTINCT student_id) FROM invoices WHERE outstanding_amount > 0 AND status != 'CANCELLED') AS students_with_dues_count,
        (SELECT COUNT(*) FROM students) AS total_students_count
    `);

    // 2. Branch-wise Collection & Outstanding Breakdown
    const [branchStats] = await query(`
      SELECT 
        b.name AS branch_name,
        b.code AS branch_code,
        COALESCE(SUM(i.paid_amount), 0) AS branch_collected,
        COALESCE(SUM(i.outstanding_amount), 0) AS branch_outstanding
      FROM branches b
      LEFT JOIN students s ON s.branch_id = b.id
      LEFT JOIN invoices i ON i.student_id = s.id AND i.status != 'CANCELLED'
      GROUP BY b.id, b.name, b.code
      ORDER BY branch_collected DESC
    `);

    // 3. Fee Category Breakdown
    const [categoryStats] = await query(`
      SELECT 
        fc.name AS category_name,
        COALESCE(SUM(ii.amount), 0) AS billed_amount,
        COALESCE(SUM(ii.paid_amount), 0) AS collected_amount
      FROM fee_categories fc
      LEFT JOIN invoice_items ii ON ii.fee_category_id = fc.id
      GROUP BY fc.id, fc.name
      ORDER BY billed_amount DESC
    `);

    // 4. Monthly Collection Trends (Last 6 Months)
    const [monthlyTrend] = await query(`
      SELECT 
        DATE_FORMAT(created_at, '%b %Y') AS month_label,
        COALESCE(SUM(amount), 0) AS collection_amount,
        COUNT(*) AS transaction_count
      FROM payments
      WHERE status = 'SUCCESS' AND created_at >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m'), DATE_FORMAT(created_at, '%b %Y')
      ORDER BY DATE_FORMAT(created_at, '%Y-%m') ASC
    `);

    // 5. Recent System-Wide Payments
    const [recentTransactions] = await query(`
      SELECT p.id, p.payment_no, p.amount, p.payment_method, p.transaction_id, p.status, p.created_at,
             s.reg_no, s.full_name, b.code AS branch_code, i.invoice_no, r.receipt_no
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN receipts r ON r.payment_id = p.id
      ORDER BY p.created_at DESC LIMIT 10
    `);

    return success(
      res,
      {
        kpis: stats[0],
        branchStats,
        categoryStats,
        monthlyTrend,
        recentTransactions
      },
      'Dashboard metrics loaded.'
    );
  } catch (err) {
    console.error('admin getDashboard error:', err);
    return error(res, 'Failed to load executive dashboard data.', 500);
  }
}

/**
 * System-Generated Financial Intelligence Insights
 * GET /api/admin/intelligence
 */
async function getIntelligence(req, res) {
  try {
    // 1. Students with dues within the next 3 days
    const [duesIn3Days] = await query(`
      SELECT s.id, s.reg_no, s.full_name, b.code AS branch_code, i.invoice_no, i.outstanding_amount, i.due_date
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      WHERE i.outstanding_amount > 0 AND i.status != 'CANCELLED'
        AND i.due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)
      ORDER BY i.due_date ASC LIMIT 10
    `);

    // 2. High Overdue Accounts (> 30 days overdue)
    const [severeOverdue] = await query(`
      SELECT s.id, s.reg_no, s.full_name, b.code AS branch_code, i.invoice_no, i.outstanding_amount,
             DATEDIFF(CURDATE(), i.due_date) AS days_overdue
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      WHERE i.outstanding_amount > 0 AND i.status != 'CANCELLED'
        AND i.due_date < DATE_SUB(CURDATE(), INTERVAL 30 DAY)
      ORDER BY days_overdue DESC LIMIT 10
    `);

    // 3. Unmatched reconciliation alerts
    const [unmatchedRecon] = await query(`
      SELECT COUNT(*) AS count, COALESCE(SUM(difference), 0) AS total_discrepancy
      FROM reconciliation_records WHERE status IN ('UNMATCHED', 'INVESTIGATION')
    `);

    return success(
      res,
      {
        duesIn3Days,
        severeOverdue,
        reconAlerts: unmatchedRecon[0]
      },
      'Financial intelligence generated.'
    );
  } catch (err) {
    console.error('getIntelligence error:', err);
    return error(res, 'Failed to calculate financial intelligence.', 500);
  }
}

/**
 * Student Directory with Financial Balances
 * GET /api/admin/students
 */
async function getStudents(req, res) {
  const { branchId, semesterId, category, search, page = 1, limit = 25 } = req.query;
  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (branchId) {
      where += ' AND s.branch_id = ?';
      params.push(branchId);
    }
    if (semesterId) {
      where += ' AND s.current_semester_id = ?';
      params.push(semesterId);
    }
    if (category) {
      where += ' AND s.category = ?';
      params.push(category);
    }
    if (search) {
      where += ' AND (s.reg_no LIKE ? OR s.full_name LIKE ? OR u.email LIKE ?)';
      const sTerm = `%${search}%`;
      params.push(sTerm, sTerm, sTerm);
    }

    const [countRows] = await query(
      `SELECT COUNT(*) AS total FROM students s JOIN users u ON s.user_id = u.id ${where}`,
      params
    );
    const total = countRows[0].total;

    const dataParams = [...params, parseInt(limit, 10), parseInt(offset, 10)];
    const [students] = await query(
      `SELECT s.id, s.reg_no, s.roll_no, s.full_name, s.gender, s.dob, s.category, s.admission_year, s.phone,
              b.name AS branch_name, b.code AS branch_code,
              sem.label AS semester_label, u.email, u.is_active,
              COALESCE(SUM(i.total_payable), 0) AS total_billed,
              COALESCE(SUM(i.paid_amount), 0) AS total_paid,
              COALESCE(SUM(i.outstanding_amount), 0) AS total_outstanding
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN branches b ON s.branch_id = b.id
       JOIN semesters sem ON s.current_semester_id = sem.id
       LEFT JOIN invoices i ON i.student_id = s.id AND i.status != 'CANCELLED'
       ${where}
       GROUP BY s.id, s.reg_no, s.roll_no, s.full_name, s.gender, s.dob, s.category, s.admission_year, s.phone, b.name, b.code, sem.label, u.email, u.is_active
       ORDER BY s.id ASC
       LIMIT ? OFFSET ?`,
      dataParams
    );

    return success(
      res,
      {
        students,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      },
      'Students loaded.'
    );
  } catch (err) {
    console.error('getStudents error:', err);
    return error(res, 'Failed to load students directory.', 500);
  }
}

/**
 * Get Specific Student Financial Profile & Ledger
 * GET /api/admin/students/:id/ledger
 */
async function getStudentLedger(req, res) {
  const studentId = parseInt(req.params.id, 10);

  try {
    const [stRows] = await query(
      `SELECT s.*, u.email, b.name AS branch_name, c.name AS course_name, sem.label AS semester_label
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN branches b ON s.branch_id = b.id
       JOIN courses c ON s.course_id = c.id
       JOIN semesters sem ON s.current_semester_id = sem.id
       WHERE s.id = ? LIMIT 1`,
      [studentId]
    );

    if (stRows.length === 0) {
      return error(res, 'Student not found.', 404);
    }

    const student = stRows[0];

    // Ledger records
    const [ledger] = await query(
      `SELECT l.*, fc.name AS category_name, inv.invoice_no
       FROM student_fee_ledgers l
       JOIN fee_categories fc ON l.fee_category_id = fc.id
       LEFT JOIN invoices inv ON l.invoice_id = inv.id
       WHERE l.student_id = ?
       ORDER BY l.academic_session_id DESC, l.semester_id DESC, l.id ASC`,
      [studentId]
    );

    // Invoices
    const [invoices] = await query(
      `SELECT * FROM invoices WHERE student_id = ? ORDER BY created_at DESC`,
      [studentId]
    );

    // Payments
    const [payments] = await query(
      `SELECT p.*, r.receipt_no FROM payments p 
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.student_id = ? ORDER BY p.created_at DESC`,
      [studentId]
    );

    return success(res, { student, ledger, invoices, payments }, 'Student ledger loaded.');
  } catch (err) {
    console.error('getStudentLedger error:', err);
    return error(res, 'Failed to load student ledger.', 500);
  }
}

/**
 * Immutable Audit Logs Viewer
 * GET /api/admin/audit-logs
 */
async function getAuditLogs(req, res) {
  const { module, userId, limit = 50 } = req.query;

  try {
    let sql = `
      SELECT al.*, u.email AS user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (module) {
      sql += ' AND al.module = ?';
      params.push(module);
    }
    if (userId) {
      sql += ' AND al.user_id = ?';
      params.push(userId);
    }

    sql += ' ORDER BY al.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [logs] = await query(sql, params);
    return success(res, logs, 'Audit logs retrieved.');
  } catch (err) {
    console.error('getAuditLogs error:', err);
    return error(res, 'Failed to retrieve audit logs.', 500);
  }
}

/**
 * User Accounts Management
 * GET /api/admin/users
 * POST /api/admin/users/:id/status
 */
async function getUsers(req, res) {
  try {
    const [users] = await query(`
      SELECT u.id, u.email, u.role_id, u.is_active, u.last_login_at, u.created_at,
             r.name AS role_name,
             COALESCE(s.full_name, st.full_name, 'System') AS full_name
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN students s ON s.user_id = u.id
      LEFT JOIN staff st ON st.user_id = u.id
      ORDER BY u.id ASC
    `);

    return success(res, users, 'Users retrieved.');
  } catch (err) {
    return error(res, 'Failed to load users.', 500);
  }
}

async function updateUserStatus(req, res) {
  const userId = parseInt(req.params.id, 10);
  const { isActive } = req.body;

  try {
    await query(`UPDATE users SET is_active = ?, updated_at = NOW() WHERE id = ?`, [isActive ? 1 : 0, userId]);

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'UPDATE_USER_STATUS',
      module: 'USER',
      recordId: userId,
      reason: `Account status toggled to ${isActive ? 'ACTIVE' : 'DEACTIVATED'}`,
      ipAddress: req.ip
    });

    return success(res, null, 'User status updated.');
  } catch (err) {
    return error(res, 'Failed to update user status.', 500);
  }
}

module.exports = {
  getDashboard,
  getIntelligence,
  getStudents,
  getStudentLedger,
  getAuditLogs,
  getUsers,
  updateUserStatus
};
