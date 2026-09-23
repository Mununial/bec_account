/**
 * Financial Reports & Analytics Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');
const { success, error } = require('../utils/response');

/**
 * Collection Report with Filters
 * GET /api/reports/collections
 */
async function getCollectionsReport(req, res) {
  const { startDate, endDate, branchId, paymentMethod } = req.query;

  try {
    let where = `WHERE p.status = 'SUCCESS'`;
    const params = [];

    if (startDate) {
      where += ` AND DATE(p.created_at) >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      where += ` AND DATE(p.created_at) <= ?`;
      params.push(endDate);
    }
    if (branchId) {
      where += ` AND s.branch_id = ?`;
      params.push(branchId);
    }
    if (paymentMethod) {
      where += ` AND p.payment_method = ?`;
      params.push(paymentMethod);
    }

    const [rows] = await query(`
      SELECT p.id, p.payment_no, p.amount, p.payment_method, p.transaction_id, p.created_at,
             s.reg_no, s.full_name, b.name AS branch_name, b.code AS branch_code,
             i.invoice_no, r.receipt_no
      FROM payments p
      JOIN students s ON p.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN receipts r ON r.payment_id = p.id
      ${where}
      ORDER BY p.created_at DESC
    `, params);

    const totalCollected = rows.reduce((sum, r) => sum + parseFloat(r.amount), 0);

    return success(res, { totalCollected, count: rows.length, collections: rows }, 'Collection report generated.');
  } catch (err) {
    console.error('getCollectionsReport error:', err);
    return error(res, 'Failed to generate collection report.', 500);
  }
}

/**
 * Defaulters / Overdue Report
 * GET /api/reports/defaulters
 */
async function getDefaultersReport(req, res) {
  const { branchId, semesterId } = req.query;

  try {
    let where = `WHERE i.status != 'CANCELLED' AND i.outstanding_amount > 0 AND i.due_date < CURDATE()`;
    const params = [];

    if (branchId) {
      where += ` AND s.branch_id = ?`;
      params.push(branchId);
    }
    if (semesterId) {
      where += ` AND s.current_semester_id = ?`;
      params.push(semesterId);
    }

    const [defaulters] = await query(`
      SELECT s.id, s.reg_no, s.full_name, s.phone, s.parent_name, s.parent_phone,
             b.name AS branch_name, b.code AS branch_code, sem.label AS semester_label,
             i.invoice_no, i.total_payable, i.paid_amount, i.outstanding_amount, i.due_date,
             DATEDIFF(CURDATE(), i.due_date) AS days_overdue
      FROM invoices i
      JOIN students s ON i.student_id = s.id
      JOIN branches b ON s.branch_id = b.id
      JOIN semesters sem ON s.current_semester_id = sem.id
      ${where}
      ORDER BY i.outstanding_amount DESC, days_overdue DESC
    `, params);

    const totalOverdue = defaulters.reduce((sum, d) => sum + parseFloat(d.outstanding_amount), 0);

    return success(res, { totalOverdue, count: defaulters.length, defaulters }, 'Defaulters report generated.');
  } catch (err) {
    console.error('getDefaultersReport error:', err);
    return error(res, 'Failed to generate defaulters report.', 500);
  }
}

/**
 * CSV Export for Financial Audits
 * GET /api/reports/export-csv
 */
async function exportCsv(req, res) {
  const { type = 'collections' } = req.query;

  try {
    let csvData = '';
    let filename = `bec_report_${type}_${Date.now()}.csv`;

    if (type === 'collections') {
      const [rows] = await query(`
        SELECT p.payment_no, p.amount, p.payment_method, p.transaction_id, p.created_at,
               s.reg_no, s.full_name, b.code AS branch, i.invoice_no, r.receipt_no
        FROM payments p
        JOIN students s ON p.student_id = s.id
        JOIN branches b ON s.branch_id = b.id
        JOIN invoices i ON p.invoice_id = i.id
        LEFT JOIN receipts r ON r.payment_id = p.id
        WHERE p.status = 'SUCCESS'
        ORDER BY p.created_at DESC
      `);

      csvData = 'Receipt No,Payment No,Roll No,Student Name,Branch,Amount (INR),Method,Txn ID,Invoice No,Date\n';
      for (const r of rows) {
        csvData += `"${r.receipt_no || ''}","${r.payment_no}","${r.reg_no}","${r.full_name}","${r.branch}","${r.amount}","${r.payment_method}","${r.transaction_id || ''}","${r.invoice_no}","${r.created_at}"\n`;
      }
    } else if (type === 'defaulters') {
      const [rows] = await query(`
        SELECT s.reg_no, s.full_name, s.phone, b.code AS branch, sem.label AS semester,
               i.invoice_no, i.total_payable, i.paid_amount, i.outstanding_amount, i.due_date,
               DATEDIFF(CURDATE(), i.due_date) AS days_overdue
        FROM invoices i
        JOIN students s ON i.student_id = s.id
        JOIN branches b ON s.branch_id = b.id
        JOIN semesters sem ON s.current_semester_id = sem.id
        WHERE i.status != 'CANCELLED' AND i.outstanding_amount > 0 AND i.due_date < CURDATE()
        ORDER BY i.outstanding_amount DESC
      `);

      csvData = 'Roll No,Student Name,Phone,Branch,Semester,Invoice No,Total Billed,Paid,Outstanding,Due Date,Days Overdue\n';
      for (const r of rows) {
        csvData += `"${r.reg_no}","${r.full_name}","${r.phone || ''}","${r.branch}","${r.semester}","${r.invoice_no}","${r.total_payable}","${r.paid_amount}","${r.outstanding_amount}","${r.due_date}","${r.days_overdue}"\n`;
      }
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvData);
  } catch (err) {
    console.error('exportCsv error:', err);
    return error(res, 'Failed to export CSV report.', 500);
  }
}

module.exports = {
  getCollectionsReport,
  getDefaultersReport,
  exportCsv
};
