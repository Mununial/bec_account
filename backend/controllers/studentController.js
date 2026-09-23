/**
 * Student Financial Portal Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');
const { success, error } = require('../utils/response');
const { getStudentBalance } = require('../services/ledgerService');
const { logAudit } = require('../services/auditService');

/**
 * Get Student Profile
 * GET /api/student/profile
 */
async function getProfile(req, res) {
  const studentId = req.user.studentId;

  try {
    const [rows] = await query(
      `SELECT s.id, s.reg_no, s.full_name, s.gender, s.dob, s.category,
              s.phone, s.parent_name, s.parent_phone, s.address,
              s.hostel_opted, s.transport_opted, s.admission_year,
              c.name AS course_name, c.code AS course_code,
              b.name AS branch_name, b.code AS branch_code,
              sem.label AS semester_label, sem.semester_number,
              a.name AS session_name, u.email
       FROM students s
       JOIN users u ON s.user_id = u.id
       JOIN courses c ON s.course_id = c.id
       JOIN branches b ON s.branch_id = b.id
       JOIN semesters sem ON s.current_semester_id = sem.id
       JOIN academic_sessions a ON s.academic_session_id = a.id
       WHERE s.id = ? LIMIT 1`,
      [studentId]
    );

    if (rows.length === 0) {
      return error(res, 'Student profile not found.', 404);
    }

    return success(res, rows[0], 'Profile retrieved.');
  } catch (err) {
    console.error('getProfile error:', err);
    return error(res, 'Unable to load profile data.', 500);
  }
}

/**
 * Student Dashboard Summary
 * GET /api/student/dashboard
 */
async function getDashboard(req, res) {
  const studentId = req.user.studentId;

  try {
    // 1. Financial balance stats
    const balance = await getStudentBalance(studentId);

    // 2. Pending invoices
    const [pendingInvoices] = await query(
      `SELECT id, invoice_no, subtotal, total_payable, paid_amount, outstanding_amount, due_date, status
       FROM invoices
       WHERE student_id = ? AND status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
       ORDER BY due_date ASC LIMIT 5`,
      [studentId]
    );

    // 3. Recent successful payments
    const [recentPayments] = await query(
      `SELECT p.id, p.payment_no, p.amount, p.payment_method, p.transaction_id, p.status, p.created_at,
              r.receipt_no
       FROM payments p
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.student_id = ?
       ORDER BY p.created_at DESC LIMIT 5`,
      [studentId]
    );

    // 4. Upcoming dues (due within 15 days)
    const [upcomingDues] = await query(
      `SELECT id, description, outstanding_amount, due_date
       FROM student_fee_ledgers
       WHERE student_id = ? AND outstanding_amount > 0 
         AND due_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
       ORDER BY due_date ASC`,
      [studentId]
    );

    // 5. Unread notifications count
    const [notifCount] = await query(
      `SELECT COUNT(*) AS unread_count FROM notifications WHERE user_id = ? AND is_read = 0`,
      [req.user.id]
    );

    return success(
      res,
      {
        balance,
        pendingInvoices,
        recentPayments,
        upcomingDues,
        unreadNotifications: notifCount[0].unread_count
      },
      'Dashboard data loaded.'
    );
  } catch (err) {
    console.error('getDashboard error:', err);
    return error(res, 'Unable to load dashboard data. Please try again.', 500);
  }
}

/**
 * Student Fee Ledger
 * GET /api/student/ledger
 */
async function getLedger(req, res) {
  const studentId = req.user.studentId;

  try {
    const [entries] = await query(
      `SELECT l.id, l.academic_session_id, l.semester_id, l.description,
              fc.name AS fee_category, fc.code AS category_code,
              l.amount_charged, l.scholarship_amount, l.discount_amount, l.fine_amount,
              l.adjustment_amount, l.amount_paid, l.outstanding_amount, l.due_date,
              l.status, l.created_at, l.updated_at,
              inv.invoice_no, sem.label AS semester_label, a.name AS session_name
       FROM student_fee_ledgers l
       JOIN fee_categories fc ON l.fee_category_id = fc.id
       JOIN semesters sem ON l.semester_id = sem.id
       JOIN academic_sessions a ON l.academic_session_id = a.id
       LEFT JOIN invoices inv ON l.invoice_id = inv.id
       WHERE l.student_id = ?
       ORDER BY l.academic_session_id DESC, l.semester_id DESC, l.id ASC`,
      [studentId]
    );

    const balance = await getStudentBalance(studentId);

    return success(res, { balance, ledger: entries }, 'Fee ledger retrieved.');
  } catch (err) {
    console.error('getLedger error:', err);
    return error(res, 'Unable to load your fee ledger. Please try again.', 500);
  }
}

/**
 * Student Invoices
 * GET /api/student/invoices
 */
async function getInvoices(req, res) {
  const studentId = req.user.studentId;

  try {
    const [invoices] = await query(
      `SELECT i.id, i.invoice_no, i.subtotal, i.discount_amount, i.fine_amount,
              i.total_payable, i.paid_amount, i.outstanding_amount, i.due_date,
              i.status, i.notes, i.created_at,
              sem.label AS semester_label, a.name AS session_name
       FROM invoices i
       JOIN semesters sem ON i.semester_id = sem.id
       JOIN academic_sessions a ON i.academic_session_id = a.id
       WHERE i.student_id = ?
       ORDER BY i.created_at DESC`,
      [studentId]
    );

    return success(res, invoices, 'Invoices retrieved.');
  } catch (err) {
    console.error('getInvoices error:', err);
    return error(res, 'Unable to load invoices.', 500);
  }
}

/**
 * Single Invoice Details with Line Items
 * GET /api/student/invoices/:id
 */
async function getInvoiceById(req, res) {
  const studentId = req.user.studentId;
  const invoiceId = parseInt(req.params.id, 10);

  try {
    const [invoiceRows] = await query(
      `SELECT i.*, sem.label AS semester_label, a.name AS session_name,
              s.reg_no, s.full_name, b.name AS branch_name, c.name AS course_name
       FROM invoices i
       JOIN students s ON i.student_id = s.id
       JOIN branches b ON s.branch_id = b.id
       JOIN courses c ON s.course_id = c.id
       JOIN semesters sem ON i.semester_id = sem.id
       JOIN academic_sessions a ON i.academic_session_id = a.id
       WHERE i.id = ? AND i.student_id = ? LIMIT 1`,
      [invoiceId, studentId]
    );

    if (invoiceRows.length === 0) {
      return error(res, 'Invoice not found or access restricted.', 404);
    }

    const invoice = invoiceRows[0];

    const [items] = await query(
      `SELECT it.id, it.description, it.amount, it.paid_amount, fc.name AS category_name, fc.code AS category_code
       FROM invoice_items it
       JOIN fee_categories fc ON it.fee_category_id = fc.id
       WHERE it.invoice_id = ?`,
      [invoiceId]
    );

    invoice.items = items;
    return success(res, invoice, 'Invoice details loaded.');
  } catch (err) {
    console.error('getInvoiceById error:', err);
    return error(res, 'Unable to load invoice details.', 500);
  }
}

/**
 * Student Payment History
 * GET /api/student/payments
 */
async function getPayments(req, res) {
  const studentId = req.user.studentId;

  try {
    const [payments] = await query(
      `SELECT p.id, p.payment_no, p.amount, p.payment_method, p.transaction_id,
              p.status, p.created_at, p.verified_at,
              i.invoice_no, r.receipt_no, r.id AS receipt_id
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.student_id = ?
       ORDER BY p.created_at DESC`,
      [studentId]
    );

    return success(res, payments, 'Payment history retrieved.');
  } catch (err) {
    console.error('getPayments error:', err);
    return error(res, 'Unable to load payment history.', 500);
  }
}

/**
 * Student Receipts List
 * GET /api/student/receipts
 */
async function getReceipts(req, res) {
  const studentId = req.user.studentId;

  try {
    const [receipts] = await query(
      `SELECT r.id, r.receipt_no, r.amount_paid, r.payment_method, r.transaction_id,
              r.issued_date, i.invoice_no, p.payment_no
       FROM receipts r
       JOIN invoices i ON r.invoice_id = i.id
       JOIN payments p ON r.payment_id = p.id
       WHERE r.student_id = ?
       ORDER BY r.issued_date DESC`,
      [studentId]
    );

    return success(res, receipts, 'Receipts retrieved.');
  } catch (err) {
    console.error('getReceipts error:', err);
    return error(res, 'Unable to load receipts.', 500);
  }
}

/**
 * Single Digital Receipt for Printing / Download
 * GET /api/student/receipts/:id
 */
async function getReceiptById(req, res) {
  const studentId = req.user.studentId;
  const receiptId = parseInt(req.params.id, 10);

  try {
    const [receiptRows] = await query(
      `SELECT r.*, s.reg_no, s.full_name, b.name AS branch_name, c.name AS course_name,
              sem.label AS semester_label, a.name AS session_name, i.invoice_no
       FROM receipts r
       JOIN students s ON r.student_id = s.id
       JOIN branches b ON s.branch_id = b.id
       JOIN courses c ON s.course_id = c.id
       JOIN invoices i ON r.invoice_id = i.id
       JOIN semesters sem ON i.semester_id = sem.id
       JOIN academic_sessions a ON i.academic_session_id = a.id
       WHERE r.id = ? AND r.student_id = ? LIMIT 1`,
      [receiptId, studentId]
    );

    if (receiptRows.length === 0) {
      return error(res, 'Receipt not found or access restricted.', 404);
    }

    const receipt = receiptRows[0];
    if (typeof receipt.receipt_data_json === 'string') {
      try {
        receipt.receipt_data_json = JSON.parse(receipt.receipt_data_json);
      } catch (e) {}
    }

    return success(res, receipt, 'Receipt loaded.');
  } catch (err) {
    console.error('getReceiptById error:', err);
    return error(res, 'Unable to load digital receipt.', 500);
  }
}

/**
 * Submit Payment / Refund / Adjustment Request
 * POST /api/student/requests
 */
async function submitRequest(req, res) {
  const studentId = req.user.studentId;
  const { requestType, invoiceId, amount, reason } = req.body;

  if (!requestType || !reason) {
    return error(res, 'Request type and detailed reason are required.', 400);
  }

  try {
    if (requestType === 'REFUND') {
      const refundAmount = parseFloat(amount);
      if (!refundAmount || refundAmount <= 0) {
        return error(res, 'A valid refund amount must be specified.', 400);
      }

      // Verify student paid on this invoice
      const [paymentRows] = await query(
        `SELECT id FROM payments WHERE invoice_id = ? AND student_id = ? AND status = 'SUCCESS' LIMIT 1`,
        [invoiceId, studentId]
      );

      if (paymentRows.length === 0) {
        return error(res, 'No verified payment found for this invoice to refund.', 400);
      }

      const paymentId = paymentRows[0].id;
      const refundNo = `REF-${Date.now().toString().slice(-6)}`;

      await query(
        `INSERT INTO refunds (refund_no, payment_id, student_id, invoice_id, amount, reason, status, requested_by)
         VALUES (?, ?, ?, ?, ?, ?, 'REQUESTED', ?)`,
        [refundNo, paymentId, studentId, invoiceId, refundAmount, reason, req.user.id]
      );

      await logAudit({
        userId: req.user.id,
        role: req.user.role,
        action: 'SUBMIT_REFUND_REQUEST',
        module: 'REFUND',
        reason,
        ipAddress: req.ip
      });

      return success(res, { refundNo }, 'Refund request submitted for Accounts Head approval.');
    } else {
      // Fee adjustment or scholarship request
      await query(
        `INSERT INTO adjustments (student_id, invoice_id, fee_category_id, adjustment_type, amount, reason, status, requested_by)
         VALUES (?, ?, 1, 'CREDIT', ?, ?, 'PENDING', ?)`,
        [studentId, invoiceId || null, parseFloat(amount || 0), reason, req.user.id]
      );

      return success(res, null, 'Fee adjustment request submitted for review.');
    }
  } catch (err) {
    console.error('submitRequest error:', err);
    return error(res, 'Unable to submit your request at this time.', 500);
  }
}

/**
 * Student In-Portal Notifications
 * GET /api/student/notifications
 */
async function getNotifications(req, res) {
  try {
    const [rows] = await query(
      `SELECT id, title, message, category, is_read, created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC LIMIT 30`,
      [req.user.id]
    );

    return success(res, rows, 'Notifications retrieved.');
  } catch (err) {
    console.error('getNotifications error:', err);
    return error(res, 'Unable to load notifications.', 500);
  }
}

module.exports = {
  getProfile,
  getDashboard,
  getLedger,
  getInvoices,
  getInvoiceById,
  getPayments,
  getReceipts,
  getReceiptById,
  submitRequest,
  getNotifications
};
