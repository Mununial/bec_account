-- ==============================================================================
-- BHUBANESWAR ENGINEERING COLLEGE (BEC) - ACCOUNTS & FINANCE MANAGEMENT SYSTEM
-- Baseline Seed Data (Roles, Permissions, Academic, Fee Categories, Settings)
-- ==============================================================================

-- 1. ROLES
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'STUDENT', 'Enrolled college student with portal access to ledger and payments'),
(2, 'ACCOUNTS_STAFF', 'Accounts operations staff managing invoices, counter payments, and receipts'),
(3, 'ACCOUNTS_HEAD', 'Accounts executive approving refunds, adjustments, fee structures, and reconciliation'),
(4, 'ADMIN', 'System Administrator with full management permissions'),
(5, 'AUDITOR_READ_ONLY', 'Compliance and financial auditor with read-only inspection access')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 2. PERMISSIONS
INSERT INTO `permissions` (`id`, `code`, `description`, `module`) VALUES
(1, 'student.profile.view', 'View own or student profile', 'STUDENT'),
(2, 'student.ledger.view', 'View fee ledger breakdown', 'LEDGER'),
(3, 'invoice.view', 'View invoices', 'INVOICE'),
(4, 'invoice.create', 'Generate invoices', 'INVOICE'),
(5, 'invoice.cancel', 'Cancel issued invoices', 'INVOICE'),
(6, 'payment.view', 'View payment transactions', 'PAYMENT'),
(7, 'payment.pay', 'Initiate online payment', 'PAYMENT'),
(8, 'payment.offline', 'Record offline counter payments', 'PAYMENT'),
(9, 'payment.verify', 'Verify payments', 'PAYMENT'),
(10, 'receipt.view', 'View digital receipts', 'RECEIPT'),
(11, 'receipt.download', 'Download or print receipts', 'RECEIPT'),
(12, 'refund.request', 'Submit refund request', 'REFUND'),
(13, 'refund.approve', 'Approve or reject refunds', 'REFUND'),
(14, 'adjustment.request', 'Submit fee adjustment', 'ADJUSTMENT'),
(15, 'adjustment.approve', 'Approve fee adjustments', 'ADJUSTMENT'),
(16, 'fee_structure.manage', 'Create or edit fee structures', 'FEE_STRUCTURE'),
(17, 'scholarship.manage', 'Assign and manage scholarships', 'SCHOLARSHIP'),
(18, 'fine.manage', 'Configure late fine rules', 'FINE'),
(19, 'reconciliation.view', 'View bank & gateway reconciliation', 'RECONCILIATION'),
(20, 'reconciliation.resolve', 'Resolve reconciliation discrepancies', 'RECONCILIATION'),
(21, 'reports.view', 'View accounts reports and charts', 'REPORTS'),
(22, 'reports.export', 'Export financial records to CSV/PDF', 'REPORTS'),
(23, 'audit.view', 'Inspect immutable audit logs', 'AUDIT'),
(24, 'user.manage', 'Create, update, and manage users', 'USER'),
(25, 'system.manage', 'Configure college settings', 'SYSTEM')
ON DUPLICATE KEY UPDATE `description` = VALUES(`description`);

-- 3. ROLE_PERMISSIONS
-- Student: 1, 2, 3, 6, 7, 10, 11, 12, 14
INSERT IGNORE INTO `role_permissions` (`role_id`, `permission_id`) VALUES
(1, 1), (1, 2), (1, 3), (1, 6), (1, 7), (1, 10), (1, 11), (1, 12), (1, 14),
-- Accounts Staff: 1, 2, 3, 4, 6, 8, 9, 10, 11, 12, 14, 21
(2, 1), (2, 2), (2, 3), (2, 4), (2, 6), (2, 8), (2, 9), (2, 10), (2, 11), (2, 12), (2, 14), (2, 21),
-- Accounts Head: 1 to 23
(3, 1), (3, 2), (3, 3), (3, 4), (3, 5), (3, 6), (3, 8), (3, 9), (3, 10), (3, 11),
(3, 12), (3, 13), (3, 14), (3, 15), (3, 16), (3, 17), (3, 18), (3, 19), (3, 20), (3, 21), (3, 22), (3, 23),
-- Admin: All 1 to 25
(4, 1), (4, 2), (4, 3), (4, 4), (4, 5), (4, 6), (4, 7), (4, 8), (4, 9), (4, 10),
(4, 11), (4, 12), (4, 13), (4, 14), (4, 15), (4, 16), (4, 17), (4, 18), (4, 19), (4, 20),
(4, 21), (4, 22), (4, 23), (4, 24), (4, 25),
-- Auditor (Read-Only): 1, 2, 3, 6, 10, 11, 19, 21, 22, 23
(5, 1), (5, 2), (5, 3), (5, 6), (5, 10), (5, 11), (5, 19), (5, 21), (5, 22), (5, 23);

-- 4. ACADEMIC SESSIONS
INSERT INTO `academic_sessions` (`id`, `name`, `start_date`, `end_date`, `is_current`) VALUES
(1, '2026-27', '2026-07-01', '2027-06-30', 1),
(2, '2025-26', '2025-07-01', '2026-06-30', 0)
ON DUPLICATE KEY UPDATE `is_current` = VALUES(`is_current`);

-- 5. COURSES
INSERT INTO `courses` (`id`, `code`, `name`, `duration_years`) VALUES
(1, 'B.TECH', 'Bachelor of Technology', 4),
(2, 'M.TECH', 'Master of Technology', 2),
(3, 'MBA', 'Master of Business Administration', 2)
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 6. BRANCHES
INSERT INTO `branches` (`id`, `course_id`, `code`, `name`) VALUES
(1, 1, 'CSE', 'Computer Science & Engineering'),
(2, 1, 'CSE_DS', 'CSE (Data Science)'),
(3, 1, 'AGRI', 'Agricultural Engineering'),
(4, 1, 'EE', 'Electrical Engineering'),
(5, 1, 'MECH', 'Mechanical Engineering'),
(6, 1, 'AERO', 'Aeronautical Engineering'),
(7, 1, 'CIVIL', 'Civil Engineering'),
(8, 1, 'ECE', 'Electronics & Communication Engineering')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- 7. SEMESTERS
INSERT INTO `semesters` (`id`, `semester_number`, `label`) VALUES
(1, 1, '1st Semester'),
(2, 2, '2nd Semester'),
(3, 3, '3rd Semester'),
(4, 4, '4th Semester'),
(5, 5, '5th Semester'),
(6, 6, '6th Semester'),
(7, 7, '7th Semester'),
(8, 8, '8th Semester')
ON DUPLICATE KEY UPDATE `label` = VALUES(`label`);

-- 8. FEE CATEGORIES
INSERT INTO `fee_categories` (`id`, `name`, `code`, `is_refundable`) VALUES
(1, 'Tuition Fee', 'TUI', 0),
(2, 'Development Fee', 'DEV', 0),
(3, 'Examination Fee', 'EXAM', 0),
(4, 'Library Fee', 'LIB', 0),
(5, 'Laboratory Fee', 'LAB', 0),
(6, 'Hostel Fee', 'HOSTEL', 0),
(7, 'Mess Fee', 'MESS', 0),
(8, 'Transport Fee', 'TRANS', 0),
(9, 'Registration Fee', 'REG', 0),
(10, 'Caution Deposit', 'CAUTION', 1),
(11, 'Fine / Late Fee', 'FINE', 0),
(12, 'Other Charges', 'OTHER', 0)
ON DUPLICATE KEY UPDATE `code` = VALUES(`code`);

-- 9. FINE RULES
INSERT INTO `fine_rules` (`id`, `fee_category_id`, `grace_period_days`, `fine_type`, `fine_value`, `max_fine_limit`, `is_active`) VALUES
(1, 1, 15, 'FIXED', 500.00, 5000.00, 1),
(2, 6, 10, 'DAILY', 50.00, 3000.00, 1)
ON DUPLICATE KEY UPDATE `fine_value` = VALUES(`fine_value`);

-- 10. SYSTEM SETTINGS
INSERT INTO `system_settings` (`setting_key`, `setting_value`, `description`) VALUES
('college_name', 'Bhubaneswar Engineering College', 'Official college name'),
('college_code', 'BEC', 'College short code'),
('college_address', 'At-Paniora, NK Nagar, Pittapally, Bhubaneswar, Odisha 752054', 'Postal address'),
('college_affiliation', 'Affiliated to BPUT, Odisha & Approved by AICTE, New Delhi', 'Accreditation details'),
('college_email', 'accounts@bec.ac.in', 'Official finance email'),
('college_phone', '+91-674-2970000', 'Accounts contact phone'),
('currency', 'INR', 'System currency code'),
('currency_symbol', '₹', 'Currency display symbol'),
('payment_gateway_provider', 'MOCK', 'Active payment gateway (MOCK, RAZORPAY, CASHFREE)'),
('academic_session_active', '2026-27', 'Currently active billing session')
ON DUPLICATE KEY UPDATE `setting_value` = VALUES(`setting_value`);

-- 11. BASELINE USERS (Password hashes using bcrypt with 12 rounds)
-- Admin: Admin@BEC2026!
-- Accounts Head: Head@BEC2026!
-- Accounts Staff: Staff@BEC2026!
-- Auditor: Auditor@BEC2026!
-- Student: Student@BEC2026! (jitendranial@bec.ac.in)

INSERT INTO `users` (`id`, `email`, `password_hash`, `role_id`, `must_change_password`, `is_active`) VALUES
(1, 'admin@bec.ac.in', '$2b$12$9OnJ6GT1Zycz2K1V1hZInOJ7Tv7IPkUpnC2LfbwyD6cIWy.G40WZO', 4, 0, 1),
(2, 'accounts.head@bec.ac.in', '$2b$12$cg5ujOpcEejlo4l8UjxTEuVgadOal3NVF2OnTpMhgu8gwpctJO9ty', 3, 0, 1),
(3, 'accounts.staff@bec.ac.in', '$2b$12$NGjYc337UL.RNfyvPNbEjulE8y8SUKXkdcKq4rzTjETCqOqe5SJUu', 2, 0, 1),
(4, 'auditor@bec.ac.in', '$2b$12$q3wX8eqxnjVhOB9YT5iAf.khyV7SCR4ys5UP6ricccVB570vjRP/G', 5, 0, 1),
(5, 'jitendranial@bec.ac.in', '$2b$12$uqKvqnkz7/viRIG//c2yzu3UqFnFDPBU4OHc8MUaLKxIyPOaHEFqW', 1, 1, 1)
ON DUPLICATE KEY UPDATE `email` = VALUES(`email`);

-- 12. STAFF RECORDS
INSERT INTO `staff` (`id`, `user_id`, `staff_code`, `full_name`, `designation`, `department`, `phone`) VALUES
(1, 1, 'BEC-ADM-001', 'System Administrator', 'Senior IT Administrator', 'IT & Systems', '+91-9437000001'),
(2, 2, 'BEC-ACC-001', 'Prof. B. K. Mohapatra', 'Accounts Head & CFO', 'Accounts & Finance', '+91-9437000002'),
(3, 3, 'BEC-ACC-002', 'Sujit Kumar Das', 'Senior Accounts Officer', 'Accounts & Finance', '+91-9437000003'),
(4, 4, 'BEC-AUD-001', 'K. R. Panda & Associates', 'Statutory Financial Auditor', 'Internal Audit', '+91-9437000004')
ON DUPLICATE KEY UPDATE `full_name` = VALUES(`full_name`);

-- 13. TEST STUDENT RECORD (Jitendra Nial)
INSERT INTO `students` (`id`, `user_id`, `reg_no`, `full_name`, `gender`, `dob`, `category`, `course_id`, `branch_id`, `current_semester_id`, `academic_session_id`, `admission_year`, `phone`, `parent_name`, `parent_phone`, `address`, `hostel_opted`, `transport_opted`) VALUES
(1, 5, '260101001', 'Jitendra Nial', 'Male', '2008-05-15', 'OBC', 1, 1, 1, 1, 2026, '+91-9861000001', 'Kishore Nial', '+91-9861000002', 'Plot 45, Chandrasekharpur, Bhubaneswar, Odisha', 1, 0)
ON DUPLICATE KEY UPDATE `reg_no` = VALUES(`reg_no`);

-- 14. DEFAULT FEE STRUCTURE FOR B.TECH 1ST SEMESTER 2026-27
INSERT INTO `fee_structures` (`id`, `academic_session_id`, `course_id`, `branch_id`, `semester_id`, `title`, `total_amount`, `is_active`, `created_by`) VALUES
(1, 1, 1, 1, 1, 'B.Tech CSE - 1st Semester Fee Structure 2026-27', 68500.00, 1, 2),
(2, 1, 1, 2, 1, 'B.Tech CSE(DS) - 1st Semester Fee Structure 2026-27', 68500.00, 1, 2),
(3, 1, 1, 3, 1, 'B.Tech Agriculture - 1st Semester Fee Structure 2026-27', 62500.00, 1, 2),
(4, 1, 1, 4, 1, 'B.Tech Electrical - 1st Semester Fee Structure 2026-27', 62500.00, 1, 2),
(5, 1, 1, 5, 1, 'B.Tech Mechanical - 1st Semester Fee Structure 2026-27', 62500.00, 1, 2),
(6, 1, 1, 6, 1, 'B.Tech Aeronautical - 1st Semester Fee Structure 2026-27', 65500.00, 1, 2),
(7, 1, 1, 7, 1, 'B.Tech Civil - 1st Semester Fee Structure 2026-27', 62500.00, 1, 2),
(8, 1, 1, 8, 1, 'B.Tech ECE - 1st Semester Fee Structure 2026-27', 65500.00, 1, 2)
ON DUPLICATE KEY UPDATE `total_amount` = VALUES(`total_amount`);

-- Items for CSE Structure (id: 1)
INSERT INTO `fee_structure_items` (`fee_structure_id`, `fee_category_id`, `amount`, `due_date`, `grace_period_days`) VALUES
(1, 1, 45000.00, '2026-10-31', 15), -- Tuition Fee
(1, 2, 8000.00, '2026-10-31', 15),  -- Development Fee
(1, 3, 2500.00, '2026-10-31', 15),  -- Exam Fee
(1, 4, 3000.00, '2026-10-31', 15),  -- Library Fee
(1, 5, 5000.00, '2026-10-31', 15),  -- Lab Fee
(1, 9, 5000.00, '2026-10-31', 15);  -- Registration Fee

-- 15. INITIAL INVOICE & LEDGER FOR TEST STUDENT (Jitendra Nial)
INSERT INTO `invoices` (`id`, `invoice_no`, `student_id`, `academic_session_id`, `semester_id`, `subtotal`, `discount_amount`, `fine_amount`, `total_payable`, `paid_amount`, `outstanding_amount`, `due_date`, `status`, `notes`, `created_by`) VALUES
(1, 'INV-2026-0001', 1, 1, 1, 68500.00, 5000.00, 0.00, 63500.00, 20000.00, 43500.00, '2026-10-31', 'PARTIALLY_PAID', 'B.Tech 1st Semester Admission & Tuition Fee', 2)
ON DUPLICATE KEY UPDATE `total_payable` = VALUES(`total_payable`);

INSERT INTO `invoice_items` (`invoice_id`, `fee_category_id`, `description`, `amount`, `paid_amount`) VALUES
(1, 1, 'Tuition Fee - 1st Semester', 45000.00, 20000.00),
(1, 2, 'Development Fee', 8000.00, 0.00),
(1, 3, 'Examination Fee (BPUT)', 2500.00, 0.00),
(1, 4, 'Digital Library Access', 3000.00, 0.00),
(1, 5, 'Advanced Computing Laboratory Fee', 5000.00, 0.00),
(1, 9, 'University Registration Fee', 5000.00, 0.00);

-- Initial Ledger entries for Jitendra Nial
INSERT INTO `student_fee_ledgers` (`student_id`, `academic_session_id`, `semester_id`, `fee_category_id`, `invoice_id`, `description`, `amount_charged`, `scholarship_amount`, `discount_amount`, `fine_amount`, `adjustment_amount`, `amount_paid`, `outstanding_amount`, `due_date`, `status`) VALUES
(1, 1, 1, 1, 1, 'Tuition Fee - 1st Semester', 45000.00, 5000.00, 0.00, 0.00, 0.00, 20000.00, 20000.00, '2026-10-31', 'PARTIALLY_PAID'),
(1, 1, 1, 2, 1, 'Development Fee', 8000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 8000.00, '2026-10-31', 'UNPAID'),
(1, 1, 1, 3, 1, 'Examination Fee (BPUT)', 2500.00, 0.00, 0.00, 0.00, 0.00, 0.00, 2500.00, '2026-10-31', 'UNPAID'),
(1, 1, 1, 4, 1, 'Digital Library Access', 3000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 3000.00, '2026-10-31', 'UNPAID'),
(1, 1, 1, 5, 1, 'Advanced Computing Laboratory Fee', 5000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 5000.00, '2026-10-31', 'UNPAID'),
(1, 1, 1, 9, 1, 'University Registration Fee', 5000.00, 0.00, 0.00, 0.00, 0.00, 0.00, 5000.00, '2026-10-31', 'UNPAID');

-- Payment record of initial ₹20,000 paid at counter
INSERT INTO `payments` (`id`, `payment_no`, `invoice_id`, `student_id`, `amount`, `payment_method`, `transaction_id`, `status`, `verified_by`, `verified_at`, `created_at`) VALUES
(1, 'PAY-2026-0001', 1, 1, 20000.00, 'CASH', 'COUNTER-RCP-001', 'SUCCESS', 3, NOW(), NOW())
ON DUPLICATE KEY UPDATE `amount` = VALUES(`amount`);

-- Digital Receipt for the counter payment
INSERT INTO `receipts` (`id`, `receipt_no`, `payment_id`, `student_id`, `invoice_id`, `amount_paid`, `payment_method`, `transaction_id`, `issued_date`, `receipt_data_json`, `created_by`) VALUES
(1, 'BEC-REC-2026-0001', 1, 1, 1, 20000.00, 'CASH', 'COUNTER-RCP-001', NOW(), '{"particulars": "Tuition Fee Initial Installment", "student_name": "Jitendra Nial", "branch": "Computer Science & Engineering", "course": "B.Tech", "semester": "1st Semester"}', 3)
ON DUPLICATE KEY UPDATE `receipt_no` = VALUES(`receipt_no`);

-- Notification for student
INSERT INTO `notifications` (`user_id`, `title`, `message`, `category`, `is_read`) VALUES
(5, 'Admission Fee Invoice Issued', 'Invoice INV-2026-0001 of ₹63,500 for B.Tech 1st Semester has been issued with due date 31-Oct-2026.', 'INVOICE', 0),
(5, 'Payment Receipt Generated', 'Payment of ₹20,000 received. Digital receipt BEC-REC-2026-0001 is ready for download.', 'RECEIPT', 0);
