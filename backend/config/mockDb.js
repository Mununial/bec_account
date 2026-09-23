/**
 * High-Fidelity In-Memory Fallback Database Engine
 * Used strictly for local developer preview when no local MySQL server is installed.
 * Seamlessly yields to Hostinger MySQL (mysql2) whenever a live database is configured.
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { parseReportingExcel } = require('../../database/import_students');

class MockDatabase {
  constructor() {
    this.initialized = false;
    this.users = [];
    this.roles = [
      { id: 1, name: 'STUDENT', description: 'Enrolled college student' },
      { id: 2, name: 'ACCOUNTS_STAFF', description: 'Accounts operations staff' },
      { id: 3, name: 'ACCOUNTS_HEAD', description: 'Accounts executive' },
      { id: 4, name: 'ADMIN', description: 'System Administrator' },
      { id: 5, name: 'AUDITOR_READ_ONLY', description: 'Financial auditor' }
    ];
    this.academicSessions = [
      { id: 1, name: '2026-27', is_current: 1 },
      { id: 2, name: '2025-26', is_current: 0 },
      { id: 3, name: '2024-25', is_current: 0 },
      { id: 4, name: '2023-24', is_current: 0 }
    ];
    this.courses = [
      { id: 1, code: 'B.TECH', name: 'Bachelor of Technology', duration_years: 4 }
    ];
    this.branches = [
      { id: 1, course_id: 1, code: 'CSE', name: 'Computer Science & Engineering' },
      { id: 2, course_id: 1, code: 'CSE_DS', name: 'CSE (Data Science)' },
      { id: 3, course_id: 1, code: 'AGRI', name: 'Agricultural Engineering' },
      { id: 4, course_id: 1, code: 'EE', name: 'Electrical Engineering' },
      { id: 5, course_id: 1, code: 'MECH', name: 'Mechanical Engineering' },
      { id: 6, course_id: 1, code: 'AERO', name: 'Aeronautical Engineering' },
      { id: 7, course_id: 1, code: 'CIVIL', name: 'Civil Engineering' },
      { id: 8, course_id: 1, code: 'ECE', name: 'Electronics & Communication Engineering' }
    ];
    this.semesters = [
      { id: 1, semester_number: 1, label: '1st Semester' },
      { id: 2, semester_number: 2, label: '2nd Semester' },
      { id: 3, semester_number: 3, label: '3rd Semester' },
      { id: 4, semester_number: 4, label: '4th Semester' },
      { id: 5, semester_number: 5, label: '5th Semester' },
      { id: 6, semester_number: 6, label: '6th Semester' },
      { id: 7, semester_number: 7, label: '7th Semester' },
      { id: 8, semester_number: 8, label: '8th Semester' }
    ];
    this.feeCategories = [
      { id: 1, name: 'Tuition Fee', code: 'TUI', is_refundable: 0 },
      { id: 2, name: 'Development Fee', code: 'DEV', is_refundable: 0 },
      { id: 3, name: 'Examination Fee', code: 'EXAM', is_refundable: 0 },
      { id: 4, name: 'Library Fee', code: 'LIB', is_refundable: 0 },
      { id: 5, name: 'Laboratory Fee', code: 'LAB', is_refundable: 0 },
      { id: 6, name: 'Hostel Fee', code: 'HOSTEL', is_refundable: 0 },
      { id: 7, name: 'Mess Fee', code: 'MESS', is_refundable: 0 },
      { id: 8, name: 'Transport Fee', code: 'TRANS', is_refundable: 0 },
      { id: 9, name: 'Registration Fee', code: 'REG', is_refundable: 0 },
      { id: 10, name: 'Caution Deposit', code: 'CAUTION', is_refundable: 1 },
      { id: 11, name: 'Fine / Late Fee', code: 'FINE', is_refundable: 0 },
      { id: 12, name: 'Other Charges', code: 'OTHER', is_refundable: 0 }
    ];
    this.feeStructures = [
      { id: 1, academic_session_id: 1, course_id: 1, branch_id: 1, semester_id: 1, title: 'B.Tech CSE - 1st Semester Fee Structure 2026-27', total_amount: 68500.00, is_active: 1 }
    ];
    this.feeStructureItems = [
      { id: 1, fee_structure_id: 1, fee_category_id: 1, amount: 45000.00, due_date: '2026-10-31', grace_period_days: 15 },
      { id: 2, fee_structure_id: 1, fee_category_id: 2, amount: 8000.00, due_date: '2026-10-31', grace_period_days: 15 },
      { id: 3, fee_structure_id: 1, fee_category_id: 3, amount: 2500.00, due_date: '2026-10-31', grace_period_days: 15 },
      { id: 4, fee_structure_id: 1, fee_category_id: 4, amount: 3000.00, due_date: '2026-10-31', grace_period_days: 15 },
      { id: 5, fee_structure_id: 1, fee_category_id: 5, amount: 5000.00, due_date: '2026-10-31', grace_period_days: 15 },
      { id: 6, fee_structure_id: 1, fee_category_id: 9, amount: 5000.00, due_date: '2026-10-31', grace_period_days: 15 }
    ];
    this.students = [];
    this.staff = [];
    this.invoices = [];
    this.invoiceItems = [];
    this.ledgers = [];
    this.payments = [];
    this.receipts = [];
    this.refunds = [];
    this.adjustments = [];
    this.fineRules = [
      { id: 1, fee_category_id: 1, grace_period_days: 15, fine_type: 'FIXED', fine_value: 500.00, max_fine_limit: 5000.00, is_active: 1 },
      { id: 2, fee_category_id: 6, grace_period_days: 10, fine_type: 'DAILY', fine_value: 50.00, max_fine_limit: 3000.00, is_active: 1 }
    ];
    this.reconciliations = [
      { id: 1, payment_id: 1, transaction_ref: 'COUNTER-RCP-001', gateway_amount: 20000.00, system_amount: 20000.00, difference: 0.00, gateway_status: 'SUCCESS', internal_status: 'SUCCESS', status: 'MATCHED', remarks: 'Auto-reconciled', reconciled_by: 2, reconciled_at: '2026-09-21 10:00:00', created_at: '2026-09-21 10:00:00' }
    ];
    this.notifications = [];
    this.auditLogs = [];
    this.pickupPoints = [
      { id: 1, route_name: 'Route 1 - BBSR Central', location_name: 'Master Canteen', annual_fee: 18000.00, semester_fee: 9000.00 },
      { id: 2, route_name: 'Route 2 - NH16 South', location_name: 'Khandagiri Square', annual_fee: 16000.00, semester_fee: 8000.00 },
      { id: 3, route_name: 'Route 1 - BBSR Central', location_name: 'Rasulgarh Square', annual_fee: 18000.00, semester_fee: 9000.00 },
      { id: 4, route_name: 'Route 2 - NH16 South', location_name: 'Baramunda Bus Stand', annual_fee: 16000.00, semester_fee: 8000.00 },
      { id: 5, route_name: 'Route 3 - Janpath Express', location_name: 'Vani Vihar Square', annual_fee: 18000.00, semester_fee: 9000.00 },
      { id: 6, route_name: 'Route 4 - Cuttack Shuttle', location_name: 'Cuttack Badambadi', annual_fee: 24000.00, semester_fee: 12000.00 },
      { id: 7, route_name: 'Route 5 - Khordha Link', location_name: 'Khordha Bypass', annual_fee: 15000.00, semester_fee: 7500.00 },
      { id: 8, route_name: 'Route 2 - NH16 South', location_name: 'Fire Station Square', annual_fee: 16000.00, semester_fee: 8000.00 },
      { id: 9, route_name: 'Route 3 - Janpath Express', location_name: 'Nayapalli / CRP Square', annual_fee: 17000.00, semester_fee: 8500.00 },
      { id: 10, route_name: 'Route 6 - Infocity Link', location_name: 'Patia / KIIT Square', annual_fee: 20000.00, semester_fee: 10000.00 },
      { id: 11, route_name: 'Route 7 - Kalinga Nagar', location_name: 'Tamando Square', annual_fee: 12000.00, semester_fee: 6000.00 },
      { id: 12, route_name: 'Route 8 - Jatni Shuttle', location_name: 'Jatni Gate', annual_fee: 14000.00, semester_fee: 7000.00 }
    ];
    this.studentTransports = [];
    this.expenseCategories = [
      { id: 1, name: 'Electricity & Power Utilities', code: 'EXP-ELEC', type: 'EXPENSE', description: 'TPCODL monthly HT power supply and substation maintenance' },
      { id: 2, name: 'Bus Fuel & Fleet Maintenance', code: 'EXP-BUS', type: 'EXPENSE', description: 'Diesel, tyre replacement, RTO fitness & regular bus servicing' },
      { id: 3, name: 'Lab Consumables & Equipment', code: 'EXP-LAB', type: 'EXPENSE', description: 'Engineering laboratory chemicals, testing kits & machinery spares' },
      { id: 4, name: 'Campus Civil & Garden Maintenance', code: 'EXP-MAINT', type: 'EXPENSE', description: 'Civil repairs, painting, sanitation & landscaping upkeep' },
      { id: 5, name: 'Staff Salary & Guest Faculty Remuneration', code: 'EXP-SAL', type: 'EXPENSE', description: 'Monthly faculty compensation & technical staff honorarium' },
      { id: 6, name: 'Examination, Printing & Stationery', code: 'EXP-PRINT', type: 'EXPENSE', description: 'Answer scripts, college prospectus, receipts & office paper' },
      { id: 7, name: 'Internet Leased Line & Cloud ERP', code: 'EXP-IT', type: 'EXPENSE', description: 'Fiber-optic bandwidth, server hosting & institutional software' },
      { id: 8, name: 'Digital Library Books & Journals', code: 'EXP-LIB', type: 'EXPENSE', description: 'IEEE subscriptions, technical engineering volumes & e-resources' },
      { id: 9, name: 'Student Tech Fest & Sports Activities', code: 'EXP-EVENTS', type: 'EXPENSE', description: 'Annual cultural festival, athletic meets & technical conclaves' },
      { id: 10, name: 'BPUT Affiliation & Regulatory Fees', code: 'EXP-BPUT', type: 'EXPENSE', description: 'University affiliation dues, AICTE approvals & audit certifications' },
      { id: 11, name: 'Miscellaneous Administrative Contingency', code: 'EXP-MISC', type: 'EXPENSE', description: 'General administrative refreshments, courier & emergency office costs' },
      { id: 12, name: 'Student Academic Fee Collections', code: 'INC-FEES', type: 'INCOME', description: 'Tuition, development and lab fees collected from students' },
      { id: 13, name: 'Student Transport Fee Collections', code: 'INC-TRANS', type: 'INCOME', description: 'Bus pass and route charges collected from student commuters' },
      { id: 14, name: 'Hostel Accommodation & Mess Revenue', code: 'INC-HOSTEL', type: 'INCOME', description: 'Boarding charges and hostel maintenance fees' }
    ];
    this.parties = [
      { id: 1, party_name: 'Indian Oil Fleet Services (Patia)', party_type: 'VENDOR', contact_person: 'Subrat Patnaik', phone: '+91-9437100011', email: 'patia.fleet@iocl.in', gstin: '21AAACI1681G1Z5', address: 'Plot 12, Chandrasekharpur, Bhubaneswar' },
      { id: 2, party_name: 'TP Central Odisha Distribution Ltd (TPCODL)', party_type: 'UTILITY', contact_person: 'Executive Engineer - Jatni', phone: '+91-674-2971100', email: 'billing@tpcodl.com', gstin: '21AACCT4387E1ZQ', address: 'Jatni Electrical Division, Khordha' },
      { id: 3, party_name: 'Utkal Paper, Offset & Stationery Mart', party_type: 'SUPPLIER', contact_person: 'Dhiren Mohanty', phone: '+91-9861200022', email: 'utkal.printers@gmail.com', gstin: '21AABPU2345F1ZY', address: 'Station Square, Master Canteen, Bhubaneswar' },
      { id: 4, party_name: 'Jagannath Motor Works (Bus Fleet Garage)', party_type: 'CONTRACTOR', contact_person: 'Purna Chandra Rout', phone: '+91-9437300033', email: 'jagannath.motors@yahoo.co.in', gstin: '21AAMPJ8765D1Z2', address: 'NH16 Pitapally Toll Gate, Bhubaneswar' },
      { id: 5, party_name: 'Hi-Tech Scientific Instruments & Lab Supplies', party_type: 'SUPPLIER', contact_person: 'Sujata Mishra', phone: '+91-9777400044', email: 'sales@hitechscientific.co.in', gstin: '21AABCH9912K1ZW', address: 'Saheed Nagar Commercial Complex, Bhubaneswar' },
      { id: 6, party_name: 'Bharti Airtel Enterprise Business Solutions', party_type: 'SERVICE_PROVIDER', contact_person: 'A. K. Sengupta', phone: '+91-9861500055', email: 'odisha.enterprise@airtel.com', gstin: '21AAACB2894G1Z8', address: 'Fortune Towers, Maitree Vihar, Bhubaneswar' },
      { id: 7, party_name: 'S. Chand & Co. Book Publishers', party_type: 'SUPPLIER', contact_person: 'Rabi Narayan Dash', phone: '+91-9437600066', email: 'bbsr@schandpublishing.com', gstin: '21AAACS0012L1ZV', address: 'Bapuji Nagar, Janpath, Bhubaneswar' }
    ];
    this.expenses = [
      { id: 1, voucher_no: 'EXP-2026-0001', voucher_date: '2026-09-02', party_id: 1, category_id: 2, payment_mode: 'BANK_TRANSFER', party_reference: 'IOCL/SEP/0192', amount: 48500.00, narration: 'Diesel refill for BEC College Buses (Fleet Route 1 to 5)', paid_by: 3, created_at: '2026-09-02 10:30:00' },
      { id: 2, voucher_no: 'EXP-2026-0002', voucher_date: '2026-09-05', party_id: 2, category_id: 1, payment_mode: 'BANK_TRANSFER', party_reference: 'TPCODL/AUG-BILL/772', amount: 92400.00, narration: 'High-Tension substation electricity bill for Main Campus & Labs', paid_by: 3, created_at: '2026-09-05 14:15:00' },
      { id: 3, voucher_no: 'EXP-2026-0003', voucher_date: '2026-09-08', party_id: 3, category_id: 6, payment_mode: 'CHEQUE', party_reference: 'UTK/2026/881', amount: 24600.00, narration: 'Printing of Mid-Term Semester Answer Booklets and Official Receipts', paid_by: 3, created_at: '2026-09-08 11:00:00' },
      { id: 4, voucher_no: 'EXP-2026-0004', voucher_date: '2026-09-12', party_id: 4, category_id: 2, payment_mode: 'BANK_TRANSFER', party_reference: 'JMW/REP/441', amount: 35000.00, narration: 'Annual RTO fitness inspection and brake overhaul for Bus OD-02-X-9901', paid_by: 3, created_at: '2026-09-12 16:45:00' },
      { id: 5, voucher_no: 'EXP-2026-0005', voucher_date: '2026-09-15', party_id: 5, category_id: 3, payment_mode: 'BANK_TRANSFER', party_reference: 'HTS/EQUIP/2026-19', amount: 56000.00, narration: 'Digital Multimeters, Breadboards and IC chips for ECE & Electrical Labs', paid_by: 3, created_at: '2026-09-15 15:20:00' },
      { id: 6, voucher_no: 'EXP-2026-0006', voucher_date: '2026-09-18', party_id: 6, category_id: 7, payment_mode: 'BANK_TRANSFER', party_reference: 'AIRTEL/LL/SEP26', amount: 28500.00, narration: '1 Gbps dedicated high-speed optical fiber internet lease line for campus', paid_by: 3, created_at: '2026-09-18 09:30:00' },
      { id: 7, voucher_no: 'EXP-2026-0007', voucher_date: '2026-09-21', party_id: 3, category_id: 11, payment_mode: 'CASH', party_reference: 'CASH-VOUCHER-012', amount: 4500.00, narration: 'Emergency courier charges and official department dispatch stamps', paid_by: 3, created_at: '2026-09-21 12:10:00' }
    ];
    this.systemSettings = {
      college_name: 'Bhubaneswar Engineering College',
      college_code: 'BEC',
      college_address: 'At-Paniora, NK Nagar, Pittapally, Bhubaneswar, Odisha 752054',
      college_affiliation: 'Affiliated to BPUT, Odisha & Approved by AICTE, New Delhi',
      college_email: 'accounts@bec.ac.in',
      college_phone: '+91-674-2970000',
      currency: 'INR',
      currency_symbol: '₹',
      payment_gateway_provider: 'MOCK',
      academic_session_active: '2026-27'
    };
  }

  async init() {
    if (this.initialized) return;

    // 1. Seed Core Staff Accounts (for administration and counter logins)
    const adminHash = await bcrypt.hash('Admin@BEC2026!', 12);
    const headHash = await bcrypt.hash('Head@BEC2026!', 12);
    const staffHash = await bcrypt.hash('Staff@BEC2026!', 12);
    const auditorHash = await bcrypt.hash('Auditor@BEC2026!', 12);

    this.users.push(
      { id: 1, email: 'admin@bec.ac.in', password_hash: adminHash, role_id: 4, is_active: 1, must_change_password: 0 },
      { id: 2, email: 'accounts.head@bec.ac.in', password_hash: headHash, role_id: 3, is_active: 1, must_change_password: 0 },
      { id: 3, email: 'accounts.staff@bec.ac.in', password_hash: staffHash, role_id: 2, is_active: 1, must_change_password: 0 },
      { id: 4, email: 'auditor@bec.ac.in', password_hash: auditorHash, role_id: 5, is_active: 1, must_change_password: 0 }
    );

    this.staff.push(
      { id: 1, user_id: 1, staff_code: 'BEC-ADM-001', full_name: 'System Administrator', designation: 'Senior IT Administrator', department: 'IT' },
      { id: 2, user_id: 2, staff_code: 'BEC-ACC-001', full_name: 'Prof. B. K. Mohapatra', designation: 'Accounts Head & CFO', department: 'Accounts' },
      { id: 3, user_id: 3, staff_code: 'BEC-ACC-002', full_name: 'Sujit Kumar Das', designation: 'Senior Accounts Officer', department: 'Accounts' },
      { id: 4, user_id: 4, staff_code: 'BEC-AUD-001', full_name: 'K. R. Panda & Associates', designation: 'Statutory Auditor', department: 'Audit' }
    );

    // 2. Import REAL Cohort from Excel Spreadsheet ONLY (No demo or fake data)
    const excelPath = path.join(__dirname, '..', '..', 'final 1st Year database from reporting.xlsx');
    if (fs.existsSync(excelPath)) {
      try {
        const students = await parseReportingExcel(excelPath);
        let userCounter = 5;
        let studentCounter = 1;

        for (const st of students) {
          this.users.push({
            id: userCounter,
            email: st.email,
            password_hash: st.passwordHash,
            role_id: 1,
            is_active: 1,
            must_change_password: 0
          });

          this.students.push({
            id: studentCounter,
            user_id: userCounter,
            reg_no: st.regNo,
            roll_no: st.rollNo,
            serial_no: st.serialNo,
            full_name: st.fullName,
            first_name: st.firstName,
            middle_name: st.middleName,
            last_name: st.lastName,
            title: st.title,
            gender: st.gender,
            dob: st.dob,
            category: st.category,
            course_id: 1,
            branch_id: st.branchId,
            current_semester_id: 1,
            academic_session_id: 1,
            admission_year: 2026,
            section: st.section,
            mentor: st.mentor,
            batch: st.batch,
            domain_email: st.email,
            personal_email: st.personalEmail,
            email: st.email,
            phone: st.phone,
            whatsapp: st.whatsapp,
            aadhaar_no: st.aadhaarNo,
            voter_id: st.voterId,
            pan_no: st.panNo,
            driving_license: st.drivingLicense,
            father_name: st.fatherName,
            mother_name: st.motherName,
            guardian_phone: st.guardianPhone,
            religion: st.religion,
            bloodgroup: st.bloodgroup,
            birthplace: st.birthplace,
            identification_mark: st.identificationMark,
            thumb_id: st.thumbId,
            hostel: st.hostel,
            transport: st.transport,
            lunch: st.lunch,
            nss: st.nss,
            languages_known: st.languagesKnown,
            address: st.address,
            permanent_address: st.permanentAddress,
            total_billed: 115000.00,
            total_paid: 0.00,
            total_outstanding: 115000.00
          });

          // Seed Student Transport Record if opted
          if (st.transport && st.transport.includes('Yes')) {
            const pp = this.pickupPoints[studentCounter % this.pickupPoints.length];
            this.studentTransports.push({
              id: this.studentTransports.length + 1,
              student_id: studentCounter,
              student_name: st.fullName,
              pickup_point_id: pp.id,
              pickup_point: pp.location_name,
              route_name: pp.route_name,
              session: '2026-27',
              course: 'B.Tech',
              department_id: st.branchId,
              academic_year: '1st Year',
              semester: '1st Semester',
              section: st.section,
              father_name: st.fatherName,
              fee_period: 'Annual',
              total_transport_fees: pp.annual_fee,
              fees_paid: 0.00,
              balance: pp.annual_fee,
              status: 'UNPAID',
              created_at: new Date().toISOString()
            });
          }

          // Generate Institutional Fee Invoice (₹1,15,000 Total Dues per student)
          const invId = this.invoices.length + 1;
          const invNo = `INV-2026-${String(studentCounter).padStart(4, '0')}`;
          const totalAmt = 115000.00;
          const paidAmt = 0.00;
          const outAmt = 115000.00;

          this.invoices.push({
            id: invId,
            invoice_no: invNo,
            student_id: studentCounter,
            academic_session_id: 1,
            semester_id: 1,
            subtotal: totalAmt,
            discount_amount: 0.00,
            fine_amount: 0.00,
            total_payable: totalAmt,
            paid_amount: paidAmt,
            outstanding_amount: outAmt,
            due_date: '2026-10-31',
            status: 'ISSUED',
            notes: 'B.Tech 1st Year Annual Tuition & Institutional Fee Structure',
            created_by: 2,
            created_at: new Date().toISOString()
          });

          // Itemized Fee Components for ₹1,15,000 Structure
          const feeBreakdown = [
            { catId: 1, name: 'Tuition Fee (Annual Academic)', amount: 85000.00 },
            { catId: 2, name: 'Institutional Development Fee', amount: 15000.00 },
            { catId: 3, name: 'BPUT University Examination Fee', amount: 5000.00 },
            { catId: 5, name: 'Advanced Engineering Lab & Computing Fee', amount: 5000.00 },
            { catId: 9, name: 'University Registration & Caution Fee', amount: 5000.00 }
          ];

          for (const item of feeBreakdown) {
            this.invoiceItems.push({
              id: this.invoiceItems.length + 1,
              invoice_id: invId,
              fee_category_id: item.catId,
              description: item.name,
              amount: item.amount,
              paid_amount: 0.00
            });

            this.ledgers.push({
              id: this.ledgers.length + 1,
              student_id: studentCounter,
              academic_session_id: 1,
              semester_id: 1,
              fee_category_id: item.catId,
              invoice_id: invId,
              description: item.name,
              amount_charged: item.amount,
              scholarship_amount: 0.00,
              discount_amount: 0.00,
              fine_amount: 0.00,
              adjustment_amount: 0.00,
              amount_paid: 0.00,
              outstanding_amount: item.amount,
              due_date: '2026-10-31',
              status: 'UNPAID'
            });
          }

          // Initial Welcome Notification
          this.notifications.push({
            id: this.notifications.length + 1,
            user_id: userCounter,
            title: 'Welcome to Bhubaneswar Engineering College',
            message: `Enrollment confirmed for ${st.fullName}. Annual Fee Invoice ${invNo} for ₹1,15,000 is generated with due date 31-Oct-2026.`,
            category: 'INVOICE',
            is_read: 0,
            created_at: new Date().toISOString()
          });

          userCounter++;
          studentCounter++;
        }

        // Seed Tushar Mhato (user ID 1644, student ID 1644, admission 2644)
        const tusharHash = await bcrypt.hash('Tushar', 10);
        this.users.push({
          id: 1644,
          email: 'tushar.mhato@bec.ac.in',
          username: 'tushar2644',
          password_hash: tusharHash,
          role_id: 1,
          is_active: 1,
          must_change_password: 0
        });

        this.students.push({
          id: 1644,
          user_id: 1644,
          reg_no: '2644',
          roll_no: 'F24094004061',
          serial_no: '2644',
          full_name: 'Tushar Mhato',
          first_name: 'Tushar',
          middle_name: '',
          last_name: 'Mhato',
          title: 'Mr.',
          gender: 'MALE',
          dob: '2004-02-27',
          category: 'GENERAL',
          course_id: 1,
          course_name: 'Diploma',
          branch_id: 5,
          branch_name: 'Mechanical Engineering',
          current_semester_id: 2,
          semester_label: '2nd Semester',
          academic_session_id: 1,
          session_name: '2024-2027',
          admission_year: 2024,
          section: 'Section A',
          mentor: 'Prof. S. R. Jena',
          batch: '2024-2027',
          email: 'tushar.mhato@bec.ac.in',
          personal_email: 'tushar2644@gmail.com',
          phone: '5555555555',
          whatsapp: '5555555555',
          father_name: 'Sanjeev Kumar Mahato',
          mother_name: 'Mrs. Mahato',
          address: 'Bhubaneswar, Odisha',
          permanent_address: 'Bhubaneswar, Odisha',
          total_billed: 200000.00,
          total_paid: 14000.00,
          total_outstanding: 186000.00
        });

        // Seed Invoices for Tushar Mhato (5th & 6th Semesters)
        const tusharInv1 = this.invoices.length + 1;
        this.invoices.push({
          id: tusharInv1,
          invoice_no: 'INV-2026-DIP-5001',
          student_id: 1644,
          academic_session_id: 1,
          semester_id: 5,
          subtotal: 100000.00,
          discount_amount: 2000.00,
          fine_amount: 0.00,
          total_payable: 98000.00,
          paid_amount: 12000.00,
          outstanding_amount: 86000.00,
          due_date: '2026-10-31',
          status: 'PARTIALLY_PAID',
          notes: '5th Semester Diploma (Mechanical Engineering) - Outstanding Balance',
          created_by: 2,
          created_at: new Date().toISOString()
        });

        const tusharInv2 = this.invoices.length + 1;
        this.invoices.push({
          id: tusharInv2,
          invoice_no: 'INV-2026-DIP-5002',
          student_id: 1644,
          academic_session_id: 1,
          semester_id: 6,
          subtotal: 100000.00,
          discount_amount: 0.00,
          fine_amount: 0.00,
          total_payable: 100000.00,
          paid_amount: 0.00,
          outstanding_amount: 100000.00,
          due_date: '2026-11-30',
          status: 'ISSUED',
          notes: '6th Semester Diploma (Mechanical Engineering) - Pending Dues',
          created_by: 2,
          created_at: new Date().toISOString()
        });

        // Seed Receipts for Tushar Mhato (Exact Receipts #1, #2, #3, #4, #6 from live portal)
        this.receipts.push(
          { id: 1, receipt_no: '1', invoice_id: 1, student_id: 1644, amount: 100000.00, discount: 0.00, payment_mode: 'CASH', payment_method: 'Cash', semester: '1st Semester', receipt_date: '2026-04-06 10:00:00', created_at: '2026-04-06 10:00:00', remarks: 'Amount', created_by: 2 },
          { id: 9, receipt_no: '2', invoice_id: 1, student_id: 1644, amount: 99000.00, discount: -1000.00, payment_mode: 'CASH', payment_method: 'Cash', semester: '2nd Semester', receipt_date: '2026-04-07 11:30:00', created_at: '2026-04-07 11:30:00', remarks: 'Fee Payment', created_by: 2 },
          { id: 15, receipt_no: '3', invoice_id: 1, student_id: 1644, amount: 100000.00, discount: 0.00, payment_mode: 'CASH', payment_method: 'Cash', semester: '3rd Semester', receipt_date: '2026-04-28 14:00:00', created_at: '2026-04-28 14:00:00', remarks: 'Abc', created_by: 2 },
          { id: 16, receipt_no: '4', invoice_id: 1, student_id: 1644, amount: 99000.00, discount: -1000.00, payment_mode: 'CASH', payment_method: 'Cash', semester: '4th Semester', receipt_date: '2026-04-28 15:30:00', created_at: '2026-04-28 15:30:00', remarks: 'Amount', created_by: 2 },
          { id: 18, receipt_no: '6', invoice_id: 1, student_id: 1644, amount: 90000.00, discount: -10000.00, payment_mode: 'CASH', payment_method: 'Cash', semester: '3rd Semester', receipt_date: '2026-04-29 12:00:00', created_at: '2026-04-29 12:00:00', remarks: 'Receipt', created_by: 2 }
        );

        console.log(`[MockDb] Successfully loaded ${students.length} real students from reporting spreadsheet, plus Tushar Mhato.`);
      } catch (err) {
        console.error('[MockDb] Error reading reporting excel:', err.message);
      }
    }

    this.initialized = true;
  }
}

const mockDb = new MockDatabase();

module.exports = mockDb;
