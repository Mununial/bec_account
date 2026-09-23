/**
 * Database Connection Manager & Query Executor
 * Bhubaneswar Engineering College (BEC) Accounts System
 * 
 * Supports:
 * 1. Live Hostinger-hosted MySQL via mysql2 connection pool (Production Standard)
 * 2. Automatic In-Memory Simulation Fallback for local offline developer testing
 */

const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mockDb = require('./mockDb');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bec_accounts_db',
  waitForConnections: process.env.DB_WAIT_FOR_CONNECTIONS === 'true',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT, 10) || 20,
  queueLimit: parseInt(process.env.DB_QUEUE_LIMIT, 10) || 0,
  timezone: '+05:30',
  dateStrings: true,
  multipleStatements: true
};

let pool = null;
let useSimulationMode = false;
let simulationInitialized = false;

function getPool() {
  if (!pool && !useSimulationMode) {
    try {
      pool = mysql.createPool(dbConfig);
      pool.on('error', (err) => {
        console.warn('[MySQL Pool Warning]', err.message);
      });
    } catch (e) {
      pool = null;
    }
  }
  return pool;
}

/**
 * Execute parameterized query
 * @param {string} sql
 * @param {Array} params
 */
async function query(sql, params = []) {
  if (!useSimulationMode) {
    try {
      const p = getPool();
      if (p) {
        return await p.query(sql, params);
      }
    } catch (err) {
      if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST' || err.code === 'ER_BAD_DB_ERROR') {
        if (!useSimulationMode) {
          console.warn(`[Database Notice] MySQL server (${dbConfig.host}:${dbConfig.port}) not reachable (${err.code}).`);
          console.warn(`  Switching seamlessly to In-Memory Preview Mode for local development.`);
          console.warn(`  To use Hostinger MySQL, ensure credentials in backend/.env are set.`);
          useSimulationMode = true;
          await mockDb.init();
        }
      } else {
        throw err;
      }
    }
  }

  // Simulation Fallback Executor
  if (!simulationInitialized) {
    await mockDb.init();
    simulationInitialized = true;
  }
  return executeMockQuery(sql, params);
}

/**
 * Get dedicated connection or mock connection
 */
async function getConnection() {
  if (!useSimulationMode) {
    try {
      const p = getPool();
      if (p) {
        return await p.getConnection();
      }
    } catch (err) {
      useSimulationMode = true;
      await mockDb.init();
    }
  }

  // Return mock transaction-compatible connection
  return {
    query: async (sql, params) => query(sql, params),
    beginTransaction: async () => {},
    commit: async () => {},
    rollback: async () => {},
    release: () => {}
  };
}

/**
 * Execute callback within an ACID transaction
 */
async function withTransaction(callback) {
  const connection = await getConnection();
  try {
    if (connection.beginTransaction) await connection.beginTransaction();
    const result = await callback(connection);
    if (connection.commit) await connection.commit();
    return result;
  } catch (error) {
    if (connection.rollback) await connection.rollback();
    throw error;
  } finally {
    if (connection.release) connection.release();
  }
}

/**
 * Test connectivity
 */
async function testConnection() {
  try {
    const p = getPool();
    if (!p) throw new Error('Pool not created');
    const [rows] = await p.query('SELECT 1 + 1 AS result, NOW() as server_time');
    return {
      connected: true,
      mode: 'HOSTINGER_MYSQL',
      serverTime: rows[0].server_time,
      database: dbConfig.database,
      host: dbConfig.host
    };
  } catch (error) {
    // Check if fallback mode is operational
    if (!simulationInitialized) {
      await mockDb.init();
      simulationInitialized = true;
    }
    return {
      connected: true,
      mode: 'SIMULATION_FALLBACK',
      message: 'Operating in in-memory preview mode (MySQL server not detected on localhost). Set DB_HOST in .env for production Hostinger MySQL.',
      database: 'bec_accounts_memory',
      host: 'localhost (in-memory)'
    };
  }
}

/**
 * Emulated Query Parser for Mock Store
 */
function executeMockQuery(sql, params) {
  const cleanSql = sql.trim().replace(/\s+/g, ' ');

  // 1. SELECT Users by Email
  if (/FROM users u .* WHERE u\.email = \?/i.test(cleanSql)) {
    const email = params[0].toLowerCase();
    const user = mockDb.users.find(u => u.email.toLowerCase() === email);
    if (user) {
      const role = mockDb.roles.find(r => r.id === user.role_id);
      return [[{ ...user, role_name: role ? role.name : 'STUDENT' }]];
    }
    return [[]];
  }

  // 1b. SELECT Student User by reg_no or full_name (for login lookup)
  if (/WHERE LOWER\(s\.reg_no\) = \? OR LOWER\(s\.full_name\) LIKE \?/i.test(cleanSql)) {
    const term = String(params[0] || '').toLowerCase().replace(/%/g, '');
    const student = mockDb.students.find(s => 
      (s.reg_no && s.reg_no.toLowerCase() === term) || 
      (s.full_name && s.full_name.toLowerCase().includes(term))
    );
    if (student) {
      const user = mockDb.users.find(u => u.id === student.user_id);
      if (user) {
        const role = mockDb.roles.find(r => r.id === user.role_id);
        return [[{ ...user, role_name: role ? role.name : 'STUDENT' }]];
      }
    }
    return [[]];
  }

  // 2. SELECT User by ID
  if (/FROM users u .* WHERE u\.id = \?/i.test(cleanSql) || /FROM users WHERE id = \?/i.test(cleanSql)) {
    const id = parseInt(params[0], 10);
    const user = mockDb.users.find(u => u.id === id);
    if (user) {
      const role = mockDb.roles.find(r => r.id === user.role_id);
      return [[{ ...user, role_name: role ? role.name : 'STUDENT' }]];
    }
    return [[]];
  }

  // 3. SELECT Student by User ID or ID
  if (/FROM students(?:\s+s)?\s+.*WHERE\s+(?:s\.)?user_id = \?/i.test(cleanSql) || /FROM students WHERE user_id = \?/i.test(cleanSql)) {
    const userId = parseInt(params[0], 10);
    const st = mockDb.students.find(s => s.user_id === userId);
    if (st) {
      const b = mockDb.branches.find(br => br.id === st.branch_id);
      const c = mockDb.courses.find(cr => cr.id === st.course_id);
      const sem = mockDb.semesters.find(sm => sm.id === st.current_semester_id);
      const sess = mockDb.academicSessions.find(as => as.id === st.academic_session_id);
      return [[{
        ...st,
        branch_name: b ? b.name : 'CSE',
        branch_code: b ? b.code : 'CSE',
        course_name: c ? c.name : 'B.Tech',
        course_code: 'B.TECH',
        semester_label: sem ? sem.label : '1st Semester',
        session_name: sess ? sess.name : '2026-27'
      }]];
    }
    return [[]];
  }

  if (/FROM students(?:\s+s)?\s+.*WHERE\s+(?:s\.)?id = \?/i.test(cleanSql) || /FROM students WHERE id = \?/i.test(cleanSql)) {
    const id = parseInt(params[0], 10);
    const st = mockDb.students.find(s => s.id === id);
    if (st) {
      const b = mockDb.branches.find(br => br.id === st.branch_id);
      const c = mockDb.courses.find(cr => cr.id === st.course_id);
      const sem = mockDb.semesters.find(sm => sm.id === st.current_semester_id);
      const sess = mockDb.academicSessions.find(as => as.id === st.academic_session_id);
      const u = mockDb.users.find(usr => usr.id === st.user_id);
      return [[{
        ...st,
        email: u ? u.email : '',
        branch_name: b ? b.name : 'CSE',
        branch_code: b ? b.code : 'CSE',
        course_name: c ? c.name : 'B.Tech',
        course_code: 'B.TECH',
        semester_label: sem ? sem.label : '1st Semester',
        session_name: sess ? sess.name : '2026-27'
      }]];
    }
    return [[]];
  }

  // 4. SELECT Staff by User ID
  if (/FROM staff WHERE user_id = \?/i.test(cleanSql)) {
    const userId = parseInt(params[0], 10);
    const stf = mockDb.staff.find(s => s.user_id === userId);
    return [stf ? [stf] : []];
  }

  // 5. SELECT Student Ledger
  if (/FROM student_fee_ledgers l .* WHERE l\.student_id = \?/i.test(cleanSql)) {
    const studentId = parseInt(params[0], 10);
    const rows = mockDb.ledgers
      .filter(l => l.student_id === studentId)
      .map(l => {
        const cat = mockDb.feeCategories.find(c => c.id === l.fee_category_id);
        const inv = mockDb.invoices.find(i => i.id === l.invoice_id);
        return {
          ...l,
          fee_category: cat ? cat.name : 'Fee Item',
          category_code: cat ? cat.code : 'FEE',
          invoice_no: inv ? inv.invoice_no : 'INV-GEN',
          semester_label: '1st Semester',
          session_name: '2026-27'
        };
      });
    return [rows];
  }

  // 5.b SELECT Ledger row by invoice and category FOR UPDATE
  if (/FROM student_fee_ledgers/i.test(cleanSql) && cleanSql.includes('invoice_id =') && cleanSql.includes('fee_category_id =')) {
    const invId = parseInt(params[0], 10);
    const catId = parseInt(params[1], 10);
    const row = mockDb.ledgers.find(l => l.invoice_id === invId && l.fee_category_id === catId);
    return [row ? [row] : []];
  }

  // 6. Student Balance Aggregate Query
  if (/total_charged.*FROM student_fee_ledgers/i.test(cleanSql)) {
    const studentId = parseInt(params[0], 10);
    const list = mockDb.ledgers.filter(l => l.student_id === studentId);
    let charged = 0, scholarship = 0, discount = 0, fine = 0, adjustment = 0, paid = 0, outstanding = 0;
    list.forEach(l => {
      charged += parseFloat(l.amount_charged || 0);
      scholarship += parseFloat(l.scholarship_amount || 0);
      discount += parseFloat(l.discount_amount || 0);
      fine += parseFloat(l.fine_amount || 0);
      adjustment += parseFloat(l.adjustment_amount || 0);
      paid += parseFloat(l.amount_paid || 0);
      outstanding += parseFloat(l.outstanding_amount || 0);
    });
    return [[{
      total_charged: charged,
      total_scholarship: scholarship,
      total_discount: discount,
      total_fine: fine,
      total_adjustment: adjustment,
      total_paid: paid,
      total_outstanding: outstanding
    }]];
  }

  // 7. Student Overdue Ledger Query
  if (/overdue_amount.*FROM student_fee_ledgers/i.test(cleanSql)) {
    const studentId = parseInt(params[0], 10);
    const list = mockDb.ledgers.filter(l => l.student_id === studentId && l.outstanding_amount > 0);
    const overdue = list.reduce((sum, l) => sum + parseFloat(l.outstanding_amount), 0);
    return [[{ overdue_amount: overdue, overdue_items: list.length }]];
  }

  // 8. Pending Invoices for Student
  if (/FROM invoices(?:\s+.*)?\s+WHERE\s+(?:i\.)?student_id = \?\s+AND\s+(?:i\.)?status IN/i.test(cleanSql)) {
    const studentId = parseInt(params[0], 10);
    const rows = mockDb.invoices.filter(i => i.student_id === studentId && ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE', 'UNPAID'].includes(i.status));
    return [rows];
  }

  // 9. All Invoices for Student
  if (/FROM invoices(?:\s+.*)?\s+WHERE\s+(?:i\.)?student_id = \?/i.test(cleanSql)) {
    const studentId = parseInt(params[0], 10);
    const rows = mockDb.invoices
      .filter(i => i.student_id === studentId)
      .map(i => ({ ...i, semester_label: '1st Semester', session_name: '2026-27' }));
    return [rows];
  }

  // Payments for Student
  if (/FROM payments(?:\s+.*)?\s+WHERE\s+(?:p\.)?student_id = \?/i.test(cleanSql)) {
    const studentId = parseInt(params[0], 10);
    const rows = mockDb.payments
      .filter(p => p.student_id === studentId)
      .map(p => {
        const rec = mockDb.receipts.find(r => r.payment_id === p.id);
        const inv = mockDb.invoices.find(i => i.id === p.invoice_id);
        return {
          ...p,
          receipt_no: rec ? rec.receipt_no : null,
          invoice_no: inv ? inv.invoice_no : ''
        };
      });
    return [rows];
  }

  // Payments by gateway_order_id
  if (/FROM payments/i.test(cleanSql) && cleanSql.includes('gateway_order_id')) {
    const orderId = params[0];
    const p = mockDb.payments.find(pay => pay.gateway_order_id === orderId);
    return [p ? [p] : []];
  }

  // Payments by ID
  if (/FROM payments/i.test(cleanSql) && /WHERE\s+(?:p\.)?id =/i.test(cleanSql)) {
    const payId = parseInt(params[0], 10);
    const p = mockDb.payments.find(pay => pay.id === payId);
    if (p) {
      const inv = mockDb.invoices.find(i => i.id === p.invoice_id);
      const st = mockDb.students.find(s => s.id === p.student_id);
      const rec = mockDb.receipts.find(r => r.payment_id === p.id);
      return [[{
        ...p,
        invoice_no: inv ? inv.invoice_no : '',
        reg_no: st ? st.reg_no : '',
        full_name: st ? st.full_name : '',
        receipt_no: rec ? rec.receipt_no : null,
        receipt_id: rec ? rec.id : null
      }]];
    }
    return [[]];
  }

  // Receipts by payment_id
  if (/FROM receipts WHERE payment_id = \?/i.test(cleanSql)) {
    const pId = parseInt(params[0], 10);
    const r = mockDb.receipts.find(rec => rec.payment_id === pId);
    return [r ? [r] : []];
  }

  // Invoices FOR UPDATE by ID or student
  if (/FROM invoices/i.test(cleanSql) && /WHERE\s+(?:i\.)?id =/i.test(cleanSql)) {
    const invId = parseInt(params[0], 10);
    const inv = mockDb.invoices.find(i => i.id === invId);
    if (inv) {
      const st = mockDb.students.find(s => s.id === inv.student_id);
      const u = st ? mockDb.users.find(usr => usr.id === st.user_id) : null;
      return [[{
        ...inv,
        reg_no: st ? st.reg_no : '',
        full_name: st ? st.full_name : '',
        gender: st ? st.gender : 'Male',
        category: st ? st.category : 'General',
        branch_name: 'Computer Science & Engineering',
        course_name: 'B.Tech',
        semester_label: '1st Semester',
        session_name: '2026-27',
        email: u ? u.email : '',
        student_email: u ? u.email : '',
        user_id: u ? u.id : 1
      }]];
    }
    return [[]];
  }

  // Student user_id lookup
  if (/SELECT user_id FROM students WHERE id = \?/i.test(cleanSql)) {
    const stId = parseInt(params[0], 10);
    const st = mockDb.students.find(s => s.id === stId);
    return [st ? [{ user_id: st.user_id }] : []];
  }

  // 11. Invoice Items
  if (/FROM invoice_items .* WHERE invoice_id = \?/i.test(cleanSql) || /FROM invoice_items it .* WHERE it\.invoice_id = \?/i.test(cleanSql)) {
    const invId = parseInt(params[0], 10);
    const items = mockDb.invoiceItems.filter(it => it.invoice_id === invId).map(it => {
      const cat = mockDb.feeCategories.find(c => c.id === it.fee_category_id);
      return {
        ...it,
        category_name: cat ? cat.name : 'Fee Category',
        category_code: cat ? cat.code : 'FEE'
      };
    });
    return [items];
  }

  // 12. Student Payments
  if (/FROM payments p .* WHERE p\.student_id = \?/i.test(cleanSql)) {
    const studentId = parseInt(params[0], 10);
    const rows = mockDb.payments
      .filter(p => p.student_id === studentId)
      .map(p => {
        const inv = mockDb.invoices.find(i => i.id === p.invoice_id);
        const rec = mockDb.receipts.find(r => r.payment_id === p.id);
        return {
          ...p,
          invoice_no: inv ? inv.invoice_no : '',
          receipt_no: rec ? rec.receipt_no : null,
          receipt_id: rec ? rec.id : null
        };
      });
    return [rows];
  }

  // 13. Student Receipts
  if (/FROM receipts r .* WHERE r\.student_id = \?/i.test(cleanSql)) {
    const studentId = parseInt(params[0], 10);
    const rows = mockDb.receipts.filter(r => r.student_id === studentId);
    return [rows];
  }

  if (/FROM receipts r .* WHERE r\.id = \?/i.test(cleanSql)) {
    const recId = parseInt(params[0], 10);
    const rec = mockDb.receipts.find(r => r.id === recId);
    if (rec) {
      const st = mockDb.students.find(s => s.id === rec.student_id);
      const inv = mockDb.invoices.find(i => i.id === rec.invoice_id);
      return [[{
        ...rec,
        reg_no: st ? st.reg_no : '',
        full_name: st ? st.full_name : '',
        branch_name: 'Computer Science & Engineering',
        course_name: 'B.Tech',
        semester_label: '1st Semester',
        session_name: '2026-27',
        invoice_no: inv ? inv.invoice_no : ''
      }]];
    }
    return [[]];
  }

  // 14. Notifications
  if (/FROM notifications WHERE user_id = \?/i.test(cleanSql)) {
    const userId = parseInt(params[0], 10);
    const rows = mockDb.notifications.filter(n => n.user_id === userId);
    return [rows];
  }

  if (/SELECT COUNT\(\*\) AS unread_count FROM notifications WHERE user_id = \?/i.test(cleanSql)) {
    const userId = parseInt(params[0], 10);
    const count = mockDb.notifications.filter(n => n.user_id === userId && n.is_read === 0).length;
    return [[{ unread_count: count }]];
  }

  // 15. Admin Executive Dashboard KPIs
  if (/SELECT \(SELECT COALESCE\(SUM\(amount\), 0\) FROM payments WHERE status = 'SUCCESS' AND DATE\(created_at\) = CURDATE\(\)\)/i.test(cleanSql)) {
    let totalColl = 0;
    mockDb.payments.filter(p => p.status === 'SUCCESS').forEach(p => totalColl += parseFloat(p.amount));
    let totalOut = 0;
    mockDb.invoices.filter(i => i.status !== 'CANCELLED').forEach(i => totalOut += parseFloat(i.outstanding_amount));

    return [[{
      today_collection: 20000.00,
      month_collection: totalColl,
      total_collection: totalColl,
      total_outstanding: totalOut,
      overdue_amount: totalOut * 0.45,
      pending_payments_count: mockDb.payments.filter(p => p.status === 'PENDING').length,
      pending_refunds_count: mockDb.refunds.filter(r => r.status === 'REQUESTED').length,
      pending_recon_count: 0,
      students_with_dues_count: mockDb.invoices.filter(i => i.outstanding_amount > 0).length,
      total_students_count: mockDb.students.length
    }]];
  }

  // 16. Branch-wise Collection Stats
  if (/FROM branches b LEFT JOIN students s ON s\.branch_id = b\.id/i.test(cleanSql)) {
    const stats = mockDb.branches.map(b => {
      const stList = mockDb.students.filter(s => s.branch_id === b.id);
      let coll = 0, out = 0;
      stList.forEach(s => {
        const invs = mockDb.invoices.filter(i => i.student_id === s.id);
        invs.forEach(i => {
          coll += parseFloat(i.paid_amount || 0);
          out += parseFloat(i.outstanding_amount || 0);
        });
      });
      return {
        branch_name: b.name,
        branch_code: b.code,
        branch_collected: coll,
        branch_outstanding: out
      };
    });
    return [stats];
  }

  // 17. Fee Category Stats
  if (/FROM fee_categories fc LEFT JOIN invoice_items ii/i.test(cleanSql)) {
    const stats = mockDb.feeCategories.map(fc => {
      const items = mockDb.invoiceItems.filter(it => it.fee_category_id === fc.id);
      let billed = 0, paid = 0;
      items.forEach(it => {
        billed += parseFloat(it.amount || 0);
        paid += parseFloat(it.paid_amount || 0);
      });
      return {
        category_name: fc.name,
        billed_amount: billed || 50000.00,
        collected_amount: paid || 20000.00
      };
    });
    return [stats];
  }

  // 18. Monthly Trend
  if (/SELECT DATE_FORMAT\(created_at, '%b %Y'\) AS month_label/i.test(cleanSql)) {
    return [[
      { month_label: 'May 2026', collection_amount: 150000.00, transaction_count: 5 },
      { month_label: 'Jun 2026', collection_amount: 280000.00, transaction_count: 9 },
      { month_label: 'Jul 2026', collection_amount: 450000.00, transaction_count: 14 },
      { month_label: 'Aug 2026', collection_amount: 620000.00, transaction_count: 22 },
      { month_label: 'Sep 2026', collection_amount: 380000.00, transaction_count: 18 }
    ]];
  }

  // 19. Recent Transactions
  if (/FROM payments p JOIN students s ON p\.student_id = s\.id .* LIMIT 10/i.test(cleanSql)) {
    const txns = mockDb.payments.slice(-10).reverse().map(p => {
      const s = mockDb.students.find(st => st.id === p.student_id);
      const b = s ? mockDb.branches.find(br => br.id === s.branch_id) : null;
      const inv = mockDb.invoices.find(i => i.id === p.invoice_id);
      const rec = mockDb.receipts.find(r => r.payment_id === p.id);
      return {
        ...p,
        reg_no: s ? s.reg_no : '260101001',
        full_name: s ? s.full_name : 'Student',
        branch_code: b ? b.code : 'CSE',
        invoice_no: inv ? inv.invoice_no : 'INV-2026-0001',
        receipt_no: rec ? rec.receipt_no : null
      };
    });
    return [txns];
  }

  // 20. Intelligence Alerts
  if (/WHERE i\.outstanding_amount > 0 AND i\.status != 'CANCELLED' AND i\.due_date BETWEEN/i.test(cleanSql)) {
    const dues = mockDb.invoices.filter(i => i.outstanding_amount > 0).slice(0, 5).map(i => {
      const s = mockDb.students.find(st => st.id === i.student_id);
      return {
        id: s ? s.id : 1,
        reg_no: s ? s.reg_no : '',
        full_name: s ? s.full_name : '',
        branch_code: 'CSE',
        invoice_no: i.invoice_no,
        outstanding_amount: i.outstanding_amount,
        due_date: i.due_date
      };
    });
    return [dues];
  }

  if (/WHERE i\.outstanding_amount > 0 AND i\.status != 'CANCELLED' AND i\.due_date < DATE_SUB/i.test(cleanSql)) {
    return [[]];
  }

  if (/FROM reconciliation_records WHERE status IN/i.test(cleanSql)) {
    return [[{ count: 0, total_discrepancy: 0.00 }]];
  }

  // 21. Students Directory
  if (/FROM students s JOIN users u ON s\.user_id = u\.id/i.test(cleanSql)) {
    if (/SELECT COUNT\(\*\) AS total/i.test(cleanSql)) {
      return [[{ total: mockDb.students.length }]];
    }

    const rows = mockDb.students.map(s => {
      const u = mockDb.users.find(usr => usr.id === s.user_id);
      const b = mockDb.branches.find(br => br.id === s.branch_id);
      const sem = mockDb.semesters.find(sm => sm.id === s.current_semester_id);
      const sess = mockDb.academicSessions.find(as => as.id === s.academic_session_id);
      const invs = mockDb.invoices.filter(i => i.student_id === s.id);
      let billed = 0, paid = 0, out = 0;
      invs.forEach(i => {
        billed += parseFloat(i.total_payable || 0);
        paid += parseFloat(i.paid_amount || 0);
        out += parseFloat(i.outstanding_amount || 0);
      });
      return {
        ...s,
        id: s.id,
        reg_no: s.reg_no,
        roll_no: s.roll_no || s.reg_no,
        full_name: s.full_name,
        gender: s.gender,
        dob: s.dob,
        category: s.category,
        admission_year: s.admission_year || 2026,
        phone: s.phone || '',
        branch_name: b ? b.name : 'Engineering',
        branch_code: b ? b.code : 'ENG',
        semester_label: sem ? sem.label : '1st Semester',
        session_name: sess ? sess.name : '2026-27',
        email: u ? u.email : '',
        is_active: u ? u.is_active : 1,
        total_billed: billed,
        total_paid: paid,
        total_outstanding: out
      };
    });
    return [rows];
  }

  // 22. Fee Structures
  if (/FROM fee_structures fs/i.test(cleanSql)) {
    const list = mockDb.feeStructures.map(fs => ({
      ...fs,
      session_name: '2026-27',
      course_name: 'Bachelor of Technology',
      branch_name: 'Computer Science & Engineering',
      semester_label: '1st Semester',
      created_by_email: 'accounts.head@bec.ac.in'
    }));
    return [list];
  }

  if (/FROM fee_structure_items fsi/i.test(cleanSql)) {
    const structId = parseInt(params[0], 10);
    const items = mockDb.feeStructureItems.filter(it => it.fee_structure_id === structId).map(it => {
      const cat = mockDb.feeCategories.find(c => c.id === it.fee_category_id);
      return {
        ...it,
        category_name: cat ? cat.name : 'Component',
        category_code: cat ? cat.code : 'FEE'
      };
    });
    return [items];
  }

  if (/FROM fee_categories/i.test(cleanSql)) {
    return [mockDb.feeCategories];
  }

  if (/FROM fine_rules/i.test(cleanSql)) {
    const rules = mockDb.fineRules.map(fr => {
      const cat = mockDb.feeCategories.find(c => c.id === fr.fee_category_id);
      return { ...fr, category_name: cat ? cat.name : 'Tuition Fee', category_code: cat ? cat.code : 'TUI' };
    });
    return [rules];
  }

  // 23. Invoices Global List
  if (/SELECT COUNT\(\*\) AS total FROM invoices i/i.test(cleanSql)) {
    return [[{ total: mockDb.invoices.length }]];
  }

  if (/SELECT i\.id, i\.invoice_no .* FROM invoices i/i.test(cleanSql)) {
    const rows = mockDb.invoices.map(i => {
      const s = mockDb.students.find(st => st.id === i.student_id);
      const b = s ? mockDb.branches.find(br => br.id === s.branch_id) : null;
      return {
        ...i,
        student_id: s ? s.id : 1,
        reg_no: s ? s.reg_no : '',
        full_name: s ? s.full_name : '',
        branch_name: b ? b.name : 'CSE',
        branch_code: b ? b.code : 'CSE',
        semester_label: '1st Semester',
        session_name: '2026-27'
      };
    });
    return [rows];
  }

  // 24. Refunds & Adjustments
  if (/FROM refunds r/i.test(cleanSql)) {
    return [mockDb.refunds];
  }

  if (/FROM adjustments a/i.test(cleanSql)) {
    return [mockDb.adjustments];
  }

  // 25. Reconciliation
  if (/FROM reconciliation_records rr/i.test(cleanSql)) {
    return [mockDb.reconciliations];
  }

  if (/SELECT \(SELECT COALESCE\(SUM\(amount\), 0\) FROM payments WHERE status = 'SUCCESS'\) AS system_total/i.test(cleanSql)) {
    return [[{
      system_total: 20000.00,
      gateway_total: 20000.00,
      matched_count: 1,
      unmatched_count: 0,
      investigation_count: 0,
      resolved_count: 0
    }]];
  }

  // 26. Reports
  if (/FROM payments p JOIN students s ON p\.student_id = s\.id WHERE p\.status = 'SUCCESS'/i.test(cleanSql)) {
    const list = mockDb.payments.map(p => {
      const s = mockDb.students.find(st => st.id === p.student_id);
      const b = s ? mockDb.branches.find(br => br.id === s.branch_id) : null;
      const inv = mockDb.invoices.find(i => i.id === p.invoice_id);
      const rec = mockDb.receipts.find(r => r.payment_id === p.id);
      return {
        ...p,
        reg_no: s ? s.reg_no : '',
        full_name: s ? s.full_name : '',
        branch_name: b ? b.name : 'Engineering',
        branch_code: b ? b.code : 'ENG',
        invoice_no: inv ? inv.invoice_no : '',
        receipt_no: rec ? rec.receipt_no : ''
      };
    });
    return [list];
  }

  // 27. Settings & Taxonomy
  if (/FROM academic_sessions/i.test(cleanSql)) {
    return [mockDb.academicSessions];
  }

  if (/FROM courses/i.test(cleanSql)) {
    return [mockDb.courses];
  }

  if (/FROM branches/i.test(cleanSql)) {
    return [mockDb.branches.map(b => ({ ...b, course_name: 'Bachelor of Technology' }))];
  }

  if (/FROM semesters/i.test(cleanSql)) {
    return [mockDb.semesters];
  }

  if (/FROM system_settings/i.test(cleanSql)) {
    const rows = Object.entries(mockDb.systemSettings).map(([k, v]) => ({ setting_key: k, setting_value: v }));
    return [rows];
  }

  // 28. Audit Logs
  if (/FROM audit_logs/i.test(cleanSql)) {
    return [mockDb.auditLogs];
  }

  // 29. Users Management
  if (/SELECT u\.id, u\.email, u\.role_id, u\.is_active/i.test(cleanSql)) {
    const rows = mockDb.users.map(u => {
      const r = mockDb.roles.find(ro => ro.id === u.role_id);
      const s = mockDb.students.find(st => st.user_id === u.id);
      const stf = mockDb.staff.find(sf => sf.user_id === u.id);
      return {
        ...u,
        role_name: r ? r.name : 'STUDENT',
        full_name: s ? s.full_name : (stf ? stf.full_name : 'System')
      };
    });
    return [rows];
  }

  // 30. INSERT Queries
  if (/INSERT INTO payments/i.test(cleanSql)) {
    const id = mockDb.payments.length + 1;
    let paymentMethod = 'ONLINE_GATEWAY';
    let gatewayOrderId = null;
    let txnId = null;

    if (cleanSql.includes("'ONLINE_GATEWAY'")) {
      paymentMethod = 'ONLINE_GATEWAY';
      gatewayOrderId = params[4];
    } else {
      paymentMethod = params[4];
      txnId = params[5];
    }

    const payObj = {
      id,
      payment_no: params[0],
      invoice_id: params[1],
      student_id: params[2],
      amount: params[3],
      payment_method: paymentMethod,
      gateway_order_id: gatewayOrderId,
      transaction_id: txnId,
      status: cleanSql.includes("'SUCCESS'") ? 'SUCCESS' : 'PENDING',
      idempotency_key: params[5] || null,
      ip_address: params[params.length - 1],
      created_at: new Date().toISOString()
    };
    mockDb.payments.push(payObj);
    return [{ insertId: id, affectedRows: 1 }];
  }

  if (/INSERT INTO receipts/i.test(cleanSql)) {
    const id = mockDb.receipts.length + 1;
    mockDb.receipts.push({
      id,
      receipt_no: params[0],
      payment_id: params[1],
      student_id: params[2],
      invoice_id: params[3],
      amount_paid: params[4],
      payment_method: params[5],
      transaction_id: params[6],
      issued_date: new Date().toISOString(),
      receipt_data_json: params[7],
      created_by: params[8]
    });
    return [{ insertId: id, affectedRows: 1 }];
  }

  if (/INSERT INTO audit_logs/i.test(cleanSql)) {
    mockDb.auditLogs.unshift({
      id: mockDb.auditLogs.length + 1,
      user_id: params[0],
      role: params[1],
      action: params[2],
      module: params[3],
      record_id: params[4],
      old_value: params[5],
      new_value: params[6],
      reason: params[7],
      ip_address: params[8],
      created_at: new Date().toISOString()
    });
    return [{ insertId: mockDb.auditLogs.length, affectedRows: 1 }];
  }

  if (/INSERT INTO notifications/i.test(cleanSql)) {
    const id = mockDb.notifications.length + 1;
    mockDb.notifications.unshift({
      id,
      user_id: params[0],
      title: params[1],
      message: params[2],
      category: params[3],
      is_read: 0,
      created_at: new Date().toISOString()
    });
    return [{ insertId: id, affectedRows: 1 }];
  }

  if (/INSERT INTO refunds/i.test(cleanSql)) {
    const id = mockDb.refunds.length + 1;
    mockDb.refunds.push({
      id,
      refund_no: params[0],
      payment_id: params[1],
      student_id: params[2],
      invoice_id: params[3],
      amount: params[4],
      reason: params[5],
      status: params[6] || 'REQUESTED',
      requested_by: params[7],
      created_at: new Date().toISOString()
    });
    return [{ insertId: id, affectedRows: 1 }];
  }

  if (/INSERT INTO adjustments/i.test(cleanSql)) {
    const id = mockDb.adjustments.length + 1;
    mockDb.adjustments.push({
      id,
      student_id: params[0],
      invoice_id: params[1],
      fee_category_id: params[2],
      adjustment_type: params[3],
      amount: params[4],
      reason: params[5],
      status: params[6] || 'PENDING',
      requested_by: params[7],
      approved_by: params[8] || null,
      created_at: new Date().toISOString()
    });
    return [{ insertId: id, affectedRows: 1 }];
  }

  // 31. UPDATE Queries
  if (/UPDATE users SET last_login_at = NOW\(\) WHERE id = \?/i.test(cleanSql)) {
    return [{ affectedRows: 1 }];
  }

  if (/UPDATE users SET password_hash = \?/i.test(cleanSql)) {
    const userId = parseInt(params[params.length - 1], 10);
    const u = mockDb.users.find(usr => usr.id === userId);
    if (u) {
      u.password_hash = params[0];
      u.must_change_password = 0;
    }
    return [{ affectedRows: 1 }];
  }

  if (/UPDATE invoices SET paid_amount = \?/i.test(cleanSql)) {
    const invId = parseInt(params[3], 10);
    const inv = mockDb.invoices.find(i => i.id === invId);
    if (inv) {
      inv.paid_amount = parseFloat(params[0]);
      inv.outstanding_amount = parseFloat(params[1]);
      inv.status = params[2];
    }
    return [{ affectedRows: 1 }];
  }

  if (/UPDATE payments SET status = 'SUCCESS'/i.test(cleanSql)) {
    const pId = parseInt(params[2], 10);
    const p = mockDb.payments.find(pay => pay.id === pId);
    if (p) {
      p.status = 'SUCCESS';
      p.transaction_id = params[0];
      p.gateway_signature = params[1];
    }
    return [{ affectedRows: 1 }];
  }

  if (/UPDATE notifications SET is_read = 1/i.test(cleanSql)) {
    mockDb.notifications.forEach(n => n.is_read = 1);
    return [{ affectedRows: 1 }];
  }

  if (/UPDATE student_fee_ledgers/i.test(cleanSql)) {
    const lId = parseInt(params[params.length - 1], 10);
    const led = mockDb.ledgers.find(l => l.id === lId);
    if (led) {
      led.amount_paid = parseFloat(params[0]);
      led.outstanding_amount = parseFloat(params[1]);
      led.status = params[2];
    }
    return [{ affectedRows: 1 }];
  }

  if (/UPDATE invoice_items/i.test(cleanSql)) {
    const itId = parseInt(params[params.length - 1], 10);
    const it = mockDb.invoiceItems.find(item => item.id === itId);
    if (it) {
      it.paid_amount = parseFloat(params[0]);
    }
    return [{ affectedRows: 1 }];
  }

  // Generic fallback for any other unhandled queries
  return [[], {}];
}

module.exports = {
  getPool,
  query,
  getConnection,
  withTransaction,
  testConnection,
  dbConfig
};
