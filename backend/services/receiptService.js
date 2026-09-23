/**
 * Digital Receipt Generation and Verification Service
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');
const { generateReceiptNo } = require('../utils/helpers');

/**
 * Generate official digital receipt record
 * @param {Object} connection - Optional transaction connection
 * @param {Object} params - { paymentId, studentId, invoiceId, amountPaid, paymentMethod, transactionId, createdBy }
 */
async function generateDigitalReceipt(connection, {
  paymentId,
  studentId,
  invoiceId,
  amountPaid,
  paymentMethod,
  transactionId,
  createdBy = null
}) {
  const db = connection || { query };

  // Check if receipt already exists for this payment (idempotency)
  const [existing] = await db.query(
    `SELECT id, receipt_no FROM receipts WHERE payment_id = ?`,
    [paymentId]
  );
  if (existing.length > 0) {
    return existing[0];
  }

  // Fetch student, branch, course details
  const [studentRows] = await db.query(
    `SELECT s.reg_no, s.full_name, c.name AS course_name, b.name AS branch_name, sem.label AS semester_label
     FROM students s
     JOIN courses c ON s.course_id = c.id
     JOIN branches b ON s.branch_id = b.id
     JOIN semesters sem ON s.current_semester_id = sem.id
     WHERE s.id = ?`,
    [studentId]
  );

  const [invoiceRows] = await db.query(
    `SELECT invoice_no, total_payable, outstanding_amount, status FROM invoices WHERE id = ?`,
    [invoiceId]
  );

  const student = studentRows[0] || {};
  const invoice = invoiceRows[0] || {};
  const receiptNo = generateReceiptNo();

  const receiptMetadata = {
    institution: 'Bhubaneswar Engineering College',
    affiliation: 'Affiliated to BPUT, Odisha & Approved by AICTE',
    address: 'At-Paniora, NK Nagar, Pittapally, Bhubaneswar, Odisha 752054',
    receiptNo,
    issuedAt: new Date().toISOString(),
    student: {
      regNo: student.reg_no,
      name: student.full_name,
      course: student.course_name,
      branch: student.branch_name,
      semester: student.semester_label
    },
    payment: {
      amount: parseFloat(amountPaid),
      method: paymentMethod,
      transactionId,
      invoiceNo: invoice.invoice_no,
      remainingOutstanding: parseFloat(invoice.outstanding_amount || 0)
    }
  };

  const [res] = await db.query(
    `INSERT INTO receipts (receipt_no, payment_id, student_id, invoice_id, amount_paid, payment_method, transaction_id, issued_date, receipt_data_json, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
    [
      receiptNo,
      paymentId,
      studentId,
      invoiceId,
      amountPaid,
      paymentMethod,
      transactionId,
      JSON.stringify(receiptMetadata),
      createdBy
    ]
  );

  return {
    id: res.insertId,
    receiptNo,
    receiptMetadata
  };
}

module.exports = {
  generateDigitalReceipt
};
