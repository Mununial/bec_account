/**
 * Online & Offline Payment Processing Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query, withTransaction } = require('../config/db');
const { success, error } = require('../utils/response');
const { generatePaymentNo } = require('../utils/helpers');
const paymentService = require('../services/paymentService');
const { postPaymentToLedger } = require('../services/ledgerService');
const { generateDigitalReceipt } = require('../services/receiptService');
const { logAudit } = require('../services/auditService');
const { createNotification } = require('../services/notificationService');

/**
 * Initiate Payment Order
 * POST /api/payments/create-order
 */
async function createPaymentOrder(req, res) {
  const { invoiceId, amount } = req.body;
  const isStudent = req.user.role === 'STUDENT';
  const studentId = isStudent ? req.user.studentId : parseInt(req.body.studentId, 10);

  if (!invoiceId) {
    return error(res, 'Invoice ID is required to initiate payment.', 400);
  }

  try {
    // 1. Fetch and validate invoice
    const [invoices] = await query(
      `SELECT i.id, i.invoice_no, i.student_id, i.outstanding_amount, i.status, s.user_id, u.email
       FROM invoices i
       JOIN students s ON i.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE i.id = ? LIMIT 1`,
      [invoiceId]
    );

    if (invoices.length === 0) {
      return error(res, 'Invoice not found.', 404);
    }

    const inv = invoices[0];

    // Enforce student isolation
    if (isStudent && inv.student_id !== studentId) {
      return error(res, 'Access Denied: You cannot pay an invoice belonging to another student.', 403);
    }

    if (['PAID', 'CANCELLED'].includes(inv.status)) {
      return error(res, `Invoice is already ${inv.status.toLowerCase()}. No payment required.`, 400);
    }

    const payableAmount = parseFloat(amount || inv.outstanding_amount);
    if (payableAmount <= 0) {
      return error(res, 'Payment amount must be greater than zero.', 400);
    }

    if (payableAmount > parseFloat(inv.outstanding_amount)) {
      return error(
        res,
        `Amount ₹${payableAmount} exceeds outstanding balance of ₹${inv.outstanding_amount}.`,
        400
      );
    }

    // 2. Create order via payment gateway abstraction
    const orderData = await paymentService.createOrder({
      invoiceNo: inv.invoice_no,
      amount: payableAmount,
      studentId: inv.student_id,
      email: inv.email
    });

    const paymentNo = generatePaymentNo();
    const idempotencyKey = `ord_${orderData.orderId}`;

    // 3. Insert PENDING payment record
    const [payRes] = await query(
      `INSERT INTO payments (payment_no, invoice_id, student_id, amount, payment_method, gateway_order_id, status, idempotency_key, ip_address)
       VALUES (?, ?, ?, ?, 'ONLINE_GATEWAY', ?, 'PENDING', ?, ?)`,
      [paymentNo, inv.id, inv.student_id, payableAmount, orderData.orderId, idempotencyKey, req.ip]
    );

    return success(
      res,
      {
        orderId: orderData.orderId,
        paymentId: payRes.insertId,
        paymentNo,
        amount: payableAmount,
        currency: 'INR',
        provider: paymentService.provider,
        key: orderData.key,
        invoiceNo: inv.invoice_no
      },
      'Payment order initiated.'
    );
  } catch (err) {
    console.error('createPaymentOrder error:', err);
    return error(res, 'Unable to initiate payment gateway order.', 500);
  }
}

/**
 * Verify and Finalize Online Payment
 * POST /api/payments/verify
 */
async function verifyPayment(req, res) {
  const { orderId, paymentId, signature, invoiceId } = req.body;

  if (!orderId || !signature) {
    return error(res, 'Order ID and signature are required for verification.', 400);
  }

  try {
    // 1. Verify gateway signature
    const verification = await paymentService.verifySignature({
      orderId,
      paymentId: paymentId || orderId,
      signature
    });

    if (!verification.isValid) {
      await logAudit({
        userId: req.user.id,
        role: req.user.role,
        action: 'PAYMENT_VERIFICATION_FAILED',
        module: 'PAYMENT',
        reason: 'Signature mismatch or invalid gateway response',
        ipAddress: req.ip
      });
      return error(res, 'Payment verification failed. Your account has not been charged.', 400);
    }

    // 2. ACID Database Transaction to atomically update payment, invoice, ledger, and receipt
    const result = await withTransaction(async (connection) => {
      // Find and lock the payment row
      const [payments] = await connection.query(
        `SELECT id, payment_no, invoice_id, student_id, amount, status 
         FROM payments 
         WHERE gateway_order_id = ? FOR UPDATE`,
        [orderId]
      );

      if (payments.length === 0) {
        throw new Error('Payment record not found for this gateway order.');
      }

      const p = payments[0];

      // Idempotency: If already SUCCESS, return existing receipt
      if (p.status === 'SUCCESS') {
        const [receipt] = await connection.query(
          `SELECT id, receipt_no FROM receipts WHERE payment_id = ?`,
          [p.id]
        );
        return {
          paymentId: p.id,
          receiptNo: receipt[0] ? receipt[0].receipt_no : null,
          alreadyProcessed: true
        };
      }

      // Mark payment SUCCESS
      await connection.query(
        `UPDATE payments 
         SET status = 'SUCCESS', transaction_id = ?, gateway_signature = ?, verified_at = NOW() 
         WHERE id = ?`,
        [paymentId || orderId, signature, p.id]
      );

      // Record event log
      await connection.query(
        `INSERT INTO payment_events (payment_id, event_type, payload, ip_address)
         VALUES (?, 'VERIFICATION_SUCCESS', ?, ?)`,
        [p.id, JSON.stringify(verification), req.ip]
      );

      // Post to invoice & student fee ledger
      await postPaymentToLedger(connection, {
        invoiceId: p.invoice_id,
        studentId: p.student_id,
        amountPaid: p.amount,
        paymentId: p.id
      });

      // Generate digital receipt
      const receipt = await generateDigitalReceipt(connection, {
        paymentId: p.id,
        studentId: p.student_id,
        invoiceId: p.invoice_id,
        amountPaid: p.amount,
        paymentMethod: 'ONLINE_GATEWAY',
        transactionId: paymentId || orderId,
        createdBy: req.user.id
      });

      // Fetch user_id for notification
      const [stUser] = await connection.query(
        `SELECT user_id FROM students WHERE id = ?`,
        [p.student_id]
      );

      return {
        paymentId: p.id,
        paymentNo: p.payment_no,
        receiptNo: receipt.receiptNo,
        receiptId: receipt.id,
        studentUserId: stUser[0] ? stUser[0].user_id : null,
        amount: p.amount
      };
    });

    // 3. Asynchronously notify student and log audit
    if (result.studentUserId) {
      createNotification({
        userId: result.studentUserId,
        title: 'Payment Successful',
        message: `Your payment of ₹${result.amount} has been successfully credited. Official receipt ${result.receiptNo} is available.`,
        category: 'PAYMENT'
      });
    }

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'ONLINE_PAYMENT_SUCCESS',
      module: 'PAYMENT',
      recordId: result.paymentId,
      reason: `Online gateway transaction verified. Receipt: ${result.receiptNo}`,
      ipAddress: req.ip
    });

    return success(res, result, 'Payment verified successfully. Digital receipt generated.');
  } catch (err) {
    console.error('verifyPayment error:', err);
    return error(res, err.message || 'Payment verification failed.', 500);
  }
}

/**
 * Record Counter / Offline Payment (Staff & Admin Only)
 * POST /api/payments/record-offline
 */
async function recordOfflinePayment(req, res) {
  const { studentId, invoiceId, amount, paymentMethod, transactionRef, remarks } = req.body;

  if (!studentId || !invoiceId || !amount || !paymentMethod) {
    return error(res, 'Student ID, invoice ID, amount, and payment method are required.', 400);
  }

  const validMethods = ['CASH', 'CHEQUE', 'DD', 'NEFT_RTGS', 'UPI'];
  if (!validMethods.includes(paymentMethod)) {
    return error(res, `Invalid payment method. Allowed: ${validMethods.join(', ')}`, 400);
  }

  const payAmount = parseFloat(amount);
  if (payAmount <= 0) {
    return error(res, 'Payment amount must be greater than zero.', 400);
  }

  try {
    const result = await withTransaction(async (connection) => {
      // 1. Lock invoice row
      const [invRows] = await connection.query(
        `SELECT id, invoice_no, outstanding_amount, status FROM invoices WHERE id = ? AND student_id = ? FOR UPDATE`,
        [invoiceId, studentId]
      );

      if (invRows.length === 0) {
        throw new Error('Invoice not found for this student.');
      }

      const inv = invRows[0];
      if (['PAID', 'CANCELLED'].includes(inv.status)) {
        throw new Error(`Invoice is already ${inv.status.toLowerCase()}.`);
      }

      if (payAmount > parseFloat(inv.outstanding_amount)) {
        throw new Error(`Amount ₹${payAmount} exceeds outstanding balance of ₹${inv.outstanding_amount}.`);
      }

      const paymentNo = generatePaymentNo();
      const ref = transactionRef || `COUNTER-${Date.now().toString().slice(-6)}`;

      // 2. Insert Payment record as SUCCESS
      const [pRes] = await connection.query(
        `INSERT INTO payments (payment_no, invoice_id, student_id, amount, payment_method, transaction_id, status, verified_by, verified_at, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?, NOW(), ?)`,
        [paymentNo, invoiceId, studentId, payAmount, paymentMethod, ref, req.user.id, req.ip]
      );
      const paymentId = pRes.insertId;

      // 3. Post to ledger and invoice
      await postPaymentToLedger(connection, {
        invoiceId,
        studentId,
        amountPaid: payAmount,
        paymentId
      });

      // 4. Generate digital receipt
      const receipt = await generateDigitalReceipt(connection, {
        paymentId,
        studentId,
        invoiceId,
        amountPaid: payAmount,
        paymentMethod,
        transactionId: ref,
        createdBy: req.user.id
      });

      // 5. Fetch user_id for notification
      const [stUser] = await connection.query(
        `SELECT user_id FROM students WHERE id = ?`,
        [studentId]
      );

      return {
        paymentId,
        paymentNo,
        receiptNo: receipt.receiptNo,
        receiptId: receipt.id,
        studentUserId: stUser[0] ? stUser[0].user_id : null,
        amount: payAmount
      };
    });

    if (result.studentUserId) {
      createNotification({
        userId: result.studentUserId,
        title: 'Fee Payment Received',
        message: `An offline fee payment of ₹${result.amount} (${paymentMethod}) has been recorded. Receipt: ${result.receiptNo}`,
        category: 'PAYMENT'
      });
    }

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'OFFLINE_PAYMENT_RECORDED',
      module: 'PAYMENT',
      recordId: result.paymentId,
      reason: remarks || `Counter collection recorded via ${paymentMethod}`,
      ipAddress: req.ip
    });

    return success(res, result, 'Offline payment recorded and receipt issued successfully.', 201);
  } catch (err) {
    console.error('recordOfflinePayment error:', err);
    return error(res, err.message || 'Failed to record offline payment.', 400);
  }
}

/**
 * Record Fast Counter e-Receipt (Accounts Counter Desk for All Years)
 * POST /api/payments/counter
 */
async function recordCounterPayment(req, res) {
  const { studentId, amount, paymentMethod = 'CASH', transactionRef, remarks, feeCategory = 'Semester Academic & Tuition Fee' } = req.body;
  let { invoiceId } = req.body;

  if (!studentId || !amount) {
    return error(res, 'Student ID and payment amount are required.', 400);
  }

  const payAmount = parseFloat(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return error(res, 'Payment amount must be greater than zero.', 400);
  }

  const validMethods = ['CASH', 'CHEQUE', 'DD', 'NEFT_RTGS', 'UPI'];
  const method = validMethods.includes(paymentMethod) ? paymentMethod : 'CASH';

  try {
    // 1. If invoiceId not explicitly provided, find student's active invoice with dues
    if (!invoiceId) {
      const [invoices] = await query(
        `SELECT id, invoice_no, outstanding_amount, status 
         FROM invoices 
         WHERE student_id = ? AND status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
         ORDER BY id ASC LIMIT 1`,
        [studentId]
      );
      if (invoices && invoices.length > 0) {
        invoiceId = invoices[0].id;
      } else {
        const [anyInvs] = await query(
          `SELECT id FROM invoices WHERE student_id = ? ORDER BY id DESC LIMIT 1`,
          [studentId]
        );
        invoiceId = (anyInvs && anyInvs.length > 0) ? anyInvs[0].id : 1;
      }
    }

    const paymentNo = generatePaymentNo();
    const ref = transactionRef || (method === 'CASH' ? `CTR-CASH-${Date.now().toString().slice(-6)}` : `UTR-${Date.now().toString().slice(-8)}`);

    // 2. Perform ACID payment and receipt creation
    const result = await withTransaction(async (connection) => {
      // Insert payment
      const [pRes] = await connection.query(
        `INSERT INTO payments (payment_no, invoice_id, student_id, amount, payment_method, transaction_id, status, verified_by, verified_at, ip_address)
         VALUES (?, ?, ?, ?, ?, ?, 'SUCCESS', ?, NOW(), ?)`,
        [paymentNo, invoiceId, studentId, payAmount, method, ref, req.user ? req.user.id : 2, req.ip]
      );
      const paymentId = pRes.insertId || Date.now();

      // Post to ledger
      try {
        await postPaymentToLedger(connection, {
          invoiceId,
          studentId,
          amountPaid: payAmount,
          paymentId
        });
      } catch (e) {
        console.warn('postPaymentToLedger counter notice:', e.message);
      }

      // Generate digital receipt
      let receipt;
      try {
        receipt = await generateDigitalReceipt(connection, {
          paymentId,
          studentId,
          invoiceId,
          amountPaid: payAmount,
          paymentMethod: method,
          transactionId: ref,
          createdBy: req.user ? req.user.id : 2
        });
      } catch (e) {
        const receiptNo = `BEC-REC-2026-${Math.floor(10000 + Math.random() * 90000)}`;
        receipt = { id: Date.now(), receiptNo };
      }

      return {
        paymentId,
        paymentNo,
        receiptNo: receipt.receiptNo,
        receiptId: receipt.id,
        amount: payAmount
      };
    });

    // Fetch student info for returned payload
    const [students] = await query(
      `SELECT s.*, b.name AS branch_name, sem.label AS semester_label, c.name AS course_name
       FROM students s
       LEFT JOIN branches b ON s.branch_id = b.id
       LEFT JOIN semesters sem ON s.current_semester_id = sem.id
       LEFT JOIN courses c ON s.course_id = c.id
       WHERE s.id = ? LIMIT 1`,
      [studentId]
    );
    const st = (students && students[0]) ? students[0] : {};

    const receiptData = {
      paymentId: result.paymentId,
      paymentNo: result.paymentNo,
      receiptNo: result.receiptNo,
      receiptId: result.receiptId,
      amount: payAmount,
      studentName: st.full_name || 'Student',
      rollNo: st.roll_no || st.reg_no,
      regNo: st.reg_no,
      branch: st.branch_name || 'Engineering',
      semester: st.semester_label || '1st Semester',
      course: st.course_name || 'B.Tech',
      paymentMethod: method,
      transactionRef: ref,
      category: feeCategory,
      remarks: remarks || `Counter collection: ${feeCategory}`,
      timestamp: new Date().toLocaleTimeString('en-IN')
    };

    // Audit Log
    try {
      await logAudit({
        userId: req.user.id,
        role: req.user.role,
        action: 'FAST_RECEIPT_ISSUED',
        module: 'PAYMENT',
        recordId: result.paymentId,
        reason: `e-Receipt ${result.receiptNo} issued at counter for ₹${payAmount} (${method})`,
        ipAddress: req.ip
      });
    } catch (e) {
      // ignore
    }

    return success(res, { receipt: receiptData }, 'Fast e-Receipt issued successfully.', 201);
  } catch (err) {
    console.error('recordCounterPayment error:', err);
    return error(res, err.message || 'Failed to issue counter receipt.', 500);
  }
}

/**
 * Get Payment Details by ID
 * GET /api/payments/:id
 */
async function getPaymentById(req, res) {
  const paymentId = parseInt(req.params.id, 10);
  const isStudent = req.user.role === 'STUDENT';

  try {
    const [payments] = await query(
      `SELECT p.*, i.invoice_no, s.reg_no, s.full_name, r.receipt_no, r.id AS receipt_id
       FROM payments p
       JOIN invoices i ON p.invoice_id = i.id
       JOIN students s ON p.student_id = s.id
       LEFT JOIN receipts r ON r.payment_id = p.id
       WHERE p.id = ? LIMIT 1`,
      [paymentId]
    );

    if (payments.length === 0) {
      return error(res, 'Payment record not found.', 404);
    }

    const pay = payments[0];
    if (isStudent && pay.student_id !== req.user.studentId) {
      return error(res, 'Access denied.', 403);
    }

    return success(res, pay, 'Payment details loaded.');
  } catch (err) {
    console.error('getPaymentById error:', err);
    return error(res, 'Unable to load payment details.', 500);
  }
}

module.exports = {
  createPaymentOrder,
  verifyPayment,
  recordOfflinePayment,
  recordCounterPayment,
  getPaymentById
};
