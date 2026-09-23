/**
 * Invoice Management Controller (Staff & Admin Operations)
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query, withTransaction } = require('../config/db');
const { success, error } = require('../utils/response');
const { generateInvoiceNo } = require('../utils/helpers');
const { logAudit } = require('../services/auditService');

/**
 * List Invoices with Filters & Pagination
 * GET /api/invoices
 */
async function getInvoices(req, res) {
  const {
    sessionId,
    branchId,
    status,
    search,
    page = 1,
    limit = 20
  } = req.query;

  const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

  try {
    let where = 'WHERE 1=1';
    const params = [];

    if (sessionId) {
      where += ' AND i.academic_session_id = ?';
      params.push(sessionId);
    }
    if (branchId) {
      where += ' AND s.branch_id = ?';
      params.push(branchId);
    }
    if (status) {
      where += ' AND i.status = ?';
      params.push(status);
    }
    if (search) {
      where += ' AND (i.invoice_no LIKE ? OR s.reg_no LIKE ? OR s.full_name LIKE ?)';
      const sTerm = `%${search}%`;
      params.push(sTerm, sTerm, sTerm);
    }

    // Count query
    const [countRows] = await query(
      `SELECT COUNT(*) AS total 
       FROM invoices i 
       JOIN students s ON i.student_id = s.id 
       ${where}`,
      params
    );
    const total = countRows[0].total;

    // Data query
    const dataParams = [...params, parseInt(limit, 10), parseInt(offset, 10)];
    const [invoices] = await query(
      `SELECT i.id, i.invoice_no, i.subtotal, i.discount_amount, i.fine_amount,
              i.total_payable, i.paid_amount, i.outstanding_amount, i.due_date,
              i.status, i.created_at,
              s.id AS student_id, s.reg_no, s.full_name,
              b.name AS branch_name, b.code AS branch_code,
              sem.label AS semester_label, a.name AS session_name
       FROM invoices i
       JOIN students s ON i.student_id = s.id
       JOIN branches b ON s.branch_id = b.id
       JOIN semesters sem ON i.semester_id = sem.id
       JOIN academic_sessions a ON i.academic_session_id = a.id
       ${where}
       ORDER BY i.created_at DESC
       LIMIT ? OFFSET ?`,
      dataParams
    );

    return success(
      res,
      {
        invoices,
        pagination: {
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / parseInt(limit, 10))
        }
      },
      'Invoices retrieved.'
    );
  } catch (err) {
    console.error('getInvoices error:', err);
    return error(res, 'Failed to load invoices.', 500);
  }
}

/**
 * Get Detailed Invoice by ID
 * GET /api/invoices/:id
 */
async function getInvoiceById(req, res) {
  const invoiceId = parseInt(req.params.id, 10);

  try {
    const [invRows] = await query(
      `SELECT i.*, s.reg_no, s.full_name, s.gender, s.dob, s.category,
              b.name AS branch_name, c.name AS course_name,
              sem.label AS semester_label, a.name AS session_name,
              u.email AS student_email
       FROM invoices i
       JOIN students s ON i.student_id = s.id
       JOIN users u ON s.user_id = u.id
       JOIN branches b ON s.branch_id = b.id
       JOIN courses c ON s.course_id = c.id
       JOIN semesters sem ON i.semester_id = sem.id
       JOIN academic_sessions a ON i.academic_session_id = a.id
       WHERE i.id = ? LIMIT 1`,
      [invoiceId]
    );

    if (invRows.length === 0) {
      return error(res, 'Invoice not found.', 404);
    }

    const invoice = invRows[0];

    // Items
    const [items] = await query(
      `SELECT it.*, fc.name AS category_name, fc.code AS category_code
       FROM invoice_items it
       JOIN fee_categories fc ON it.fee_category_id = fc.id
       WHERE it.invoice_id = ?`,
      [invoiceId]
    );
    invoice.items = items;

    // Payments
    const [payments] = await query(
      `SELECT p.id, p.payment_no, p.amount, p.payment_method, p.transaction_id, p.status, p.created_at,
              r.receipt_no
       FROM payments p
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.invoice_id = ?
       ORDER BY p.created_at DESC`,
      [invoiceId]
    );
    invoice.payments = payments;

    return success(res, invoice, 'Invoice loaded.');
  } catch (err) {
    console.error('getInvoiceById error:', err);
    return error(res, 'Failed to load invoice.', 500);
  }
}

/**
 * Generate Individual Invoice
 * POST /api/invoices/generate
 */
async function generateInvoice(req, res) {
  const { studentId, sessionId, semesterId, items, dueDate, notes } = req.body;

  if (!studentId || !sessionId || !semesterId || !Array.isArray(items) || items.length === 0 || !dueDate) {
    return error(res, 'Student, session, semester, items, and due date are required.', 400);
  }

  try {
    const subtotal = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);
    const invoiceNo = generateInvoiceNo();

    const result = await withTransaction(async (connection) => {
      const [invRes] = await connection.query(
        `INSERT INTO invoices (invoice_no, student_id, academic_session_id, semester_id, subtotal, total_payable, outstanding_amount, due_date, status, notes, created_by)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?)`,
        [invoiceNo, studentId, sessionId, semesterId, subtotal, subtotal, subtotal, dueDate, notes || null, req.user.id]
      );
      const invoiceId = invRes.insertId;

      for (const item of items) {
        await connection.query(
          `INSERT INTO invoice_items (invoice_id, fee_category_id, description, amount)
           VALUES (?, ?, ?, ?)`,
          [invoiceId, item.categoryId, item.description || 'Fee Item', parseFloat(item.amount)]
        );

        await connection.query(
          `INSERT INTO student_fee_ledgers (student_id, academic_session_id, semester_id, fee_category_id, invoice_id, description, amount_charged, outstanding_amount, due_date, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'UNPAID')`,
          [
            studentId,
            sessionId,
            semesterId,
            item.categoryId,
            invoiceId,
            item.description || 'Fee Item',
            parseFloat(item.amount),
            parseFloat(item.amount),
            dueDate
          ]
        );
      }

      return { invoiceId, invoiceNo };
    });

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'GENERATE_INVOICE',
      module: 'INVOICE',
      recordId: result.invoiceId,
      reason: `Issued ${result.invoiceNo} for student #${studentId} totaling ₹${subtotal}`,
      ipAddress: req.ip
    });

    return success(res, result, 'Invoice generated successfully.', 201);
  } catch (err) {
    console.error('generateInvoice error:', err);
    return error(res, 'Failed to generate invoice.', 500);
  }
}

/**
 * Cancel Invoice (Accounts Head / Admin Only)
 * POST /api/invoices/:id/cancel
 */
async function cancelInvoice(req, res) {
  const invoiceId = parseInt(req.params.id, 10);
  const { reason } = req.body;

  if (!reason) {
    return error(res, 'A justification reason is mandatory to cancel an invoice.', 400);
  }

  try {
    const result = await withTransaction(async (connection) => {
      const [invRows] = await connection.query(
        `SELECT id, invoice_no, paid_amount, status FROM invoices WHERE id = ? FOR UPDATE`,
        [invoiceId]
      );

      if (invRows.length === 0) {
        throw new Error('Invoice not found.');
      }

      const inv = invRows[0];
      if (parseFloat(inv.paid_amount) > 0) {
        throw new Error('Cannot cancel an invoice with payments applied. Process refunds first.');
      }

      if (inv.status === 'CANCELLED') {
        throw new Error('Invoice is already cancelled.');
      }

      // Mark invoice CANCELLED
      await connection.query(
        `UPDATE invoices SET status = 'CANCELLED', notes = CONCAT(COALESCE(notes, ''), ' [CANCELLED: ', ?, ']'), updated_at = NOW() WHERE id = ?`,
        [reason, invoiceId]
      );

      // Waive or mark ledger records
      await connection.query(
        `UPDATE student_fee_ledgers SET status = 'WAIVED', outstanding_amount = 0, updated_at = NOW() WHERE invoice_id = ?`,
        [invoiceId]
      );

      return inv.invoice_no;
    });

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'CANCEL_INVOICE',
      module: 'INVOICE',
      recordId: invoiceId,
      reason,
      ipAddress: req.ip
    });

    return success(res, null, `Invoice ${result} has been cancelled.`);
  } catch (err) {
    console.error('cancelInvoice error:', err);
    return error(res, err.message || 'Failed to cancel invoice.', 400);
  }
}

module.exports = {
  getInvoices,
  getInvoiceById,
  generateInvoice,
  cancelInvoice
};
