/**
 * Database Initialization and Seed Automation Runner
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.join(__dirname, '..', 'backend', '.env') });
const { parseReportingExcel } = require('./import_students');

async function initializeDatabase() {
  console.log('================================================================');
  console.log('BHUBANESWAR ENGINEERING COLLEGE - DATABASE PROVISIONER & SEEDER');
  console.log('================================================================\n');

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = parseInt(process.env.DB_PORT, 10) || 3306;
  const user = process.env.DB_USER || 'root';
  const password = process.env.DB_PASSWORD || '';
  const database = process.env.DB_NAME || 'bec_accounts_db';

  console.log(`[1/5] Connecting to MySQL server at ${host}:${port}...`);
  let rootConnection;
  try {
    rootConnection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      multipleStatements: true
    });
    console.log('  -> Connected to MySQL server successfully.');
  } catch (err) {
    console.error('  -> Failed to connect to MySQL server:', err.message);
    console.error('  -> Please ensure MySQL is running or Hostinger credentials in backend/.env are correct.');
    process.exit(1);
  }

  try {
    console.log(`[2/5] Ensuring database \`${database}\` exists...`);
    await rootConnection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
    );
    await rootConnection.query(`USE \`${database}\`;`);
    console.log(`  -> Database \`${database}\` is active.`);

    console.log('[3/5] Applying normalized schema (schema.sql)...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await rootConnection.query(schemaSql);
    console.log('  -> All 28 relational tables and constraints applied.');

    console.log('[4/5] Seeding core roles, permissions, settings & staff accounts (seed.sql)...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await rootConnection.query(seedSql);
    console.log('  -> System roles, permissions, fee categories, and staff accounts seeded.');

    console.log('[5/5] Importing first-year student cohort from reporting spreadsheet...');
    const excelPath = path.join(__dirname, '..', 'final 1st Year database from reporting.xlsx');
    if (fs.existsSync(excelPath)) {
      const students = await parseReportingExcel(excelPath);
      console.log(`  -> Found ${students.length} student records across 7 engineering branches.`);

      let importedCount = 0;
      for (const st of students) {
        // 1. Insert user
        const [userRes] = await rootConnection.query(
          `INSERT INTO users (email, password_hash, role_id, must_change_password, is_active)
           VALUES (?, ?, 1, 1, 1)
           ON DUPLICATE KEY UPDATE updated_at = NOW()`,
          [st.email, st.passwordHash]
        );
        const userId = userRes.insertId;
        if (!userId) continue;

        // 2. Insert student
        const [studentRes] = await rootConnection.query(
          `INSERT INTO students (user_id, reg_no, full_name, gender, dob, category, course_id, branch_id, current_semester_id, academic_session_id, admission_year)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)`,
          [
            userId,
            st.regNo,
            st.fullName,
            st.gender,
            st.dob,
            st.category,
            st.courseId,
            st.branchId,
            st.currentSemesterId,
            st.academicSessionId,
            st.admissionYear
          ]
        );
        const studentId = studentRes.insertId;

        // 3. Generate initial 1st-semester admission invoice based on branch fee structure
        if (studentId) {
          const [structRows] = await rootConnection.query(
            `SELECT fs.id, fs.total_amount FROM fee_structures fs 
             WHERE fs.branch_id = ? AND fs.semester_id = 1 AND fs.academic_session_id = 1 LIMIT 1`,
            [st.branchId]
          );

          if (structRows.length > 0) {
            const structure = structRows[0];
            const invoiceNo = `INV-2026-${String(st.regNo).slice(-4)}`;
            const dueDate = '2026-10-31';

            const [invRes] = await rootConnection.query(
              `INSERT INTO invoices (invoice_no, student_id, academic_session_id, semester_id, subtotal, total_payable, outstanding_amount, due_date, status, notes, created_by)
               VALUES (?, ?, 1, 1, ?, ?, ?, ?, 'ISSUED', 'B.Tech 1st Semester Academic & College Fees', 2)
               ON DUPLICATE KEY UPDATE total_payable = VALUES(total_payable)`,
              [invoiceNo, studentId, structure.total_amount, structure.total_amount, structure.total_amount, dueDate]
            );
            const invoiceId = invRes.insertId;

            // Copy structure items into invoice items and ledger
            const [items] = await rootConnection.query(
              `SELECT fee_category_id, amount FROM fee_structure_items WHERE fee_structure_id = ?`,
              [structure.id]
            );

            for (const it of items) {
              await rootConnection.query(
                `INSERT INTO invoice_items (invoice_id, fee_category_id, description, amount)
                 VALUES (?, ?, 'Component Fee', ?)`,
                [invoiceId, it.fee_category_id, it.amount]
              );

              await rootConnection.query(
                `INSERT INTO student_fee_ledgers (student_id, academic_session_id, semester_id, fee_category_id, invoice_id, description, amount_charged, outstanding_amount, due_date, status)
                 VALUES (?, 1, 1, ?, ?, '1st Semester Fee Component', ?, ?, ?, 'UNPAID')`,
                [studentId, it.fee_category_id, invoiceId, it.amount, it.amount, dueDate]
              );
            }
          }
        }

        importedCount++;
      }
      console.log(`  -> Successfully imported ${importedCount} students with user credentials, branches, and fee ledgers.`);
    } else {
      console.log('  -> Excel file not found. Skipping cohort import.');
    }

    console.log('\n================================================================');
    console.log('DATABASE INITIALIZATION COMPLETE & READY FOR PRODUCTION');
    console.log('================================================================');
    console.log('Seed Accounts Ready:');
    console.log('  - Admin:         admin@bec.ac.in          (Pass: Admin@BEC2026!)');
    console.log('  - Accounts Head: accounts.head@bec.ac.in  (Pass: Head@BEC2026!)');
    console.log('  - Accounts Staff:accounts.staff@bec.ac.in (Pass: Staff@BEC2026!)');
    console.log('  - Auditor:       auditor@bec.ac.in        (Pass: Auditor@BEC2026!)');
    console.log('  - Student Test:  jitendranial@bec.ac.in   (Pass: Student@BEC2026!)');
    console.log('================================================================\n');

  } catch (err) {
    console.error('Initialization error:', err);
  } finally {
    await rootConnection.end();
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = { initializeDatabase };
