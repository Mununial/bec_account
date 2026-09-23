/**
 * Fee Structure & Fine Management Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query, withTransaction } = require('../config/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../services/auditService');
const { generateInvoiceNo } = require('../utils/helpers');

/**
 * List Fee Structures
 * GET /api/fees/structures
 */
async function getFeeStructures(req, res) {
  const { sessionId, courseId, branchId, semesterId } = req.query;

  try {
    let sql = `
      SELECT fs.id, fs.title, fs.total_amount, fs.is_active, fs.created_at,
             a.name AS session_name, c.name AS course_name, b.name AS branch_name,
             sem.label AS semester_label, u.email AS created_by_email
      FROM fee_structures fs
      JOIN academic_sessions a ON fs.academic_session_id = a.id
      JOIN courses c ON fs.course_id = c.id
      JOIN branches b ON fs.branch_id = b.id
      JOIN semesters sem ON fs.semester_id = sem.id
      LEFT JOIN users u ON fs.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (sessionId) {
      sql += ' AND fs.academic_session_id = ?';
      params.push(sessionId);
    }
    if (courseId) {
      sql += ' AND fs.course_id = ?';
      params.push(courseId);
    }
    if (branchId) {
      sql += ' AND fs.branch_id = ?';
      params.push(branchId);
    }
    if (semesterId) {
      sql += ' AND fs.semester_id = ?';
      params.push(semesterId);
    }

    sql += ' ORDER BY fs.academic_session_id DESC, fs.branch_id ASC, fs.semester_id ASC';

    const [structures] = await query(sql, params);

    // Fetch items for each structure
    for (const s of structures) {
      const [items] = await query(
        `SELECT fsi.id, fsi.amount, fsi.due_date, fsi.grace_period_days,
                fc.name AS category_name, fc.code AS category_code
         FROM fee_structure_items fsi
         JOIN fee_categories fc ON fsi.fee_category_id = fc.id
         WHERE fsi.fee_structure_id = ?`,
        [s.id]
      );
      s.items = items;
    }

    return success(res, structures, 'Fee structures loaded.');
  } catch (err) {
    console.error('getFeeStructures error:', err);
    return error(res, 'Failed to load fee structures.', 500);
  }
}

/**
 * Create Fee Structure with Components
 * POST /api/fees/structures
 */
async function createFeeStructure(req, res) {
  const { sessionId, courseId, branchId, semesterId, title, items } = req.body;

  if (!sessionId || !courseId || !branchId || !semesterId || !title || !Array.isArray(items) || items.length === 0) {
    return error(res, 'Session, course, branch, semester, title, and at least one fee component are required.', 400);
  }

  try {
    const totalAmount = items.reduce((sum, it) => sum + (parseFloat(it.amount) || 0), 0);

    const result = await withTransaction(async (connection) => {
      const [structRes] = await connection.query(
        `INSERT INTO fee_structures (academic_session_id, course_id, branch_id, semester_id, title, total_amount, is_active, created_by)
         VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
        [sessionId, courseId, branchId, semesterId, title, totalAmount, req.user.id]
      );
      const structureId = structRes.insertId;

      for (const item of items) {
        await connection.query(
          `INSERT INTO fee_structure_items (fee_structure_id, fee_category_id, amount, due_date, grace_period_days)
           VALUES (?, ?, ?, ?, ?)`,
          [structureId, item.categoryId, parseFloat(item.amount), item.dueDate || null, parseInt(item.gracePeriodDays, 10) || 15]
        );
      }

      return structureId;
    });

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'CREATE_FEE_STRUCTURE',
      module: 'FEE_STRUCTURE',
      recordId: result,
      reason: `Created structure: ${title} with total ₹${totalAmount}`,
      ipAddress: req.ip
    });

    return success(res, { structureId: result, totalAmount }, 'Fee structure created successfully.', 201);
  } catch (err) {
    console.error('createFeeStructure error:', err);
    return error(res, 'Failed to create fee structure.', 500);
  }
}

/**
 * Bulk Assign Fee Structure to Students (Generates Invoices & Ledgers)
 * POST /api/fees/structures/:id/assign-bulk
 */
async function assignFeeStructureBulk(req, res) {
  const structureId = parseInt(req.params.id, 10);
  const { dueDate } = req.body;

  if (!dueDate) {
    return error(res, 'Payment due date is required for invoice issuance.', 400);
  }

  try {
    const [structRows] = await query(
      `SELECT fs.*, a.name AS session_name, sem.label AS semester_label
       FROM fee_structures fs
       JOIN academic_sessions a ON fs.academic_session_id = a.id
       JOIN semesters sem ON fs.semester_id = sem.id
       WHERE fs.id = ? LIMIT 1`,
      [structureId]
    );

    if (structRows.length === 0) {
      return error(res, 'Fee structure not found.', 404);
    }

    const structure = structRows[0];

    // Fetch items
    const [items] = await query(
      `SELECT fee_category_id, amount FROM fee_structure_items WHERE fee_structure_id = ?`,
      [structureId]
    );

    if (items.length === 0) {
      return error(res, 'Fee structure has no components defined.', 400);
    }

    // Find all enrolled students matching course, branch, semester
    const [students] = await query(
      `SELECT id, reg_no, full_name 
       FROM students 
       WHERE course_id = ? AND branch_id = ? AND current_semester_id = ?`,
      [structure.course_id, structure.branch_id, structure.semester_id]
    );

    if (students.length === 0) {
      return error(res, 'No students found matching this branch and semester.', 404);
    }

    let assignedCount = 0;
    let skippedCount = 0;

    await withTransaction(async (connection) => {
      for (const st of students) {
        // Check if invoice already issued for this session & semester
        const [existing] = await connection.query(
          `SELECT id FROM invoices 
           WHERE student_id = ? AND academic_session_id = ? AND semester_id = ? AND status != 'CANCELLED' LIMIT 1`,
          [st.id, structure.academic_session_id, structure.semester_id]
        );

        if (existing.length > 0) {
          skippedCount++;
          continue;
        }

        const invoiceNo = generateInvoiceNo();
        const [invRes] = await connection.query(
          `INSERT INTO invoices (invoice_no, student_id, academic_session_id, semester_id, subtotal, total_payable, outstanding_amount, due_date, status, notes, created_by)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ISSUED', ?, ?)`,
          [
            invoiceNo,
            st.id,
            structure.academic_session_id,
            structure.semester_id,
            structure.total_amount,
            structure.total_amount,
            structure.total_amount,
            dueDate,
            `${structure.title} (${structure.session_name})`,
            req.user.id
          ]
        );
        const invoiceId = invRes.insertId;

        // Insert items and ledger rows
        for (const item of items) {
          await connection.query(
            `INSERT INTO invoice_items (invoice_id, fee_category_id, description, amount)
             VALUES (?, ?, 'Semester Fee Component', ?)`,
            [invoiceId, item.fee_category_id, item.amount]
          );

          await connection.query(
            `INSERT INTO student_fee_ledgers (student_id, academic_session_id, semester_id, fee_category_id, invoice_id, description, amount_charged, outstanding_amount, due_date, status)
             VALUES (?, ?, ?, ?, ?, 'Fee Structure Charge', ?, ?, ?, 'UNPAID')`,
            [
              st.id,
              structure.academic_session_id,
              structure.semester_id,
              item.fee_category_id,
              invoiceId,
              item.amount,
              item.amount,
              dueDate
            ]
          );
        }

        assignedCount++;
      }
    });

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'BULK_ASSIGN_FEE_STRUCTURE',
      module: 'FEE_STRUCTURE',
      recordId: structureId,
      reason: `Bulk assigned to ${assignedCount} students. Skipped ${skippedCount} existing.`,
      ipAddress: req.ip
    });

    return success(
      res,
      { assignedCount, skippedCount, totalEligible: students.length },
      `Bulk assignment complete. ${assignedCount} invoices generated.`
    );
  } catch (err) {
    console.error('assignFeeStructureBulk error:', err);
    return error(res, 'Failed to assign fee structure in bulk.', 500);
  }
}

/**
 * List Fee Categories
 * GET /api/fees/categories
 */
async function getCategories(req, res) {
  try {
    const [categories] = await query(`SELECT * FROM fee_categories ORDER BY id ASC`);
    return success(res, categories, 'Fee categories loaded.');
  } catch (err) {
    return error(res, 'Unable to load fee categories.', 500);
  }
}

/**
 * List & Update Fine Rules
 * GET /api/fees/fine-rules
 * POST /api/fees/fine-rules
 */
async function getFineRules(req, res) {
  try {
    const [rules] = await query(
      `SELECT fr.*, fc.name AS category_name, fc.code AS category_code
       FROM fine_rules fr
       JOIN fee_categories fc ON fr.fee_category_id = fc.id
       ORDER BY fr.id ASC`
    );
    return success(res, rules, 'Fine rules loaded.');
  } catch (err) {
    return error(res, 'Unable to load fine rules.', 500);
  }
}

async function updateFineRule(req, res) {
  const { id, gracePeriodDays, fineType, fineValue, maxFineLimit, isActive } = req.body;

  if (!id || !fineValue) {
    return error(res, 'Rule ID and fine value are required.', 400);
  }

  try {
    await query(
      `UPDATE fine_rules 
       SET grace_period_days = ?, fine_type = ?, fine_value = ?, max_fine_limit = ?, is_active = ?
       WHERE id = ?`,
      [
        parseInt(gracePeriodDays, 10) || 15,
        fineType || 'FIXED',
        parseFloat(fineValue),
        parseFloat(maxFineLimit || 5000),
        isActive ? 1 : 0,
        id
      ]
    );

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'UPDATE_FINE_RULE',
      module: 'FINE',
      recordId: id,
      reason: `Updated rule: ${fineType} ₹${fineValue}`,
      ipAddress: req.ip
    });

    return success(res, null, 'Fine rule updated successfully.');
  } catch (err) {
    return error(res, 'Failed to update fine rule.', 500);
  }
}

module.exports = {
  getFeeStructures,
  createFeeStructure,
  assignFeeStructureBulk,
  getCategories,
  getFineRules,
  updateFineRule
};
