-- ==============================================================================
-- BHUBANESWAR ENGINEERING COLLEGE (BEC) - ACCOUNTS & FINANCE MANAGEMENT SYSTEM
-- Complete Relational Database Schema (MySQL 8.0+ / Hostinger Compatible)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. ROLES TABLE
DROP TABLE IF EXISTS `role_permissions`;
DROP TABLE IF EXISTS `permissions`;
DROP TABLE IF EXISTS `roles`;
CREATE TABLE `roles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. PERMISSIONS TABLE
CREATE TABLE `permissions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) NULL,
  `module` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. ROLE_PERMISSIONS TABLE
CREATE TABLE `role_permissions` (
  `role_id` INT NOT NULL,
  `permission_id` INT NOT NULL,
  PRIMARY KEY (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. ACADEMIC SESSIONS TABLE
DROP TABLE IF EXISTS `academic_sessions`;
CREATE TABLE `academic_sessions` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(20) NOT NULL UNIQUE, -- e.g. '2026-27'
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `is_current` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. COURSES TABLE
DROP TABLE IF EXISTS `courses`;
CREATE TABLE `courses` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `code` VARCHAR(20) NOT NULL UNIQUE, -- e.g. 'B.TECH'
  `name` VARCHAR(100) NOT NULL,
  `duration_years` INT DEFAULT 4,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. BRANCHES TABLE
DROP TABLE IF EXISTS `branches`;
CREATE TABLE `branches` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `course_id` INT NOT NULL,
  `code` VARCHAR(20) NOT NULL UNIQUE, -- e.g. 'CSE', 'AGRI'
  `name` VARCHAR(100) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. SEMESTERS TABLE
DROP TABLE IF EXISTS `semesters`;
CREATE TABLE `semesters` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `semester_number` INT NOT NULL UNIQUE,
  `label` VARCHAR(50) NOT NULL -- e.g. '1st Semester'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. USERS TABLE
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(150) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT NOT NULL,
  `must_change_password` TINYINT(1) DEFAULT 0,
  `is_active` TINYINT(1) DEFAULT 1,
  `last_login_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT,
  INDEX `idx_users_email` (`email`),
  INDEX `idx_users_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. STUDENTS TABLE
DROP TABLE IF EXISTS `students`;
CREATE TABLE `students` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `reg_no` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(150) NOT NULL,
  `gender` ENUM('Male', 'Female', 'Other') DEFAULT 'Male',
  `dob` DATE NULL,
  `category` VARCHAR(50) DEFAULT 'General', -- General, OBC, SC, ST, SEBC
  `course_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `current_semester_id` INT NOT NULL,
  `academic_session_id` INT NOT NULL,
  `admission_year` INT DEFAULT 2026,
  `phone` VARCHAR(20) NULL,
  `parent_name` VARCHAR(150) NULL,
  `parent_phone` VARCHAR(20) NULL,
  `address` TEXT NULL,
  `hostel_opted` TINYINT(1) DEFAULT 0,
  `transport_opted` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`current_semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE RESTRICT,
  INDEX `idx_students_reg` (`reg_no`),
  INDEX `idx_students_branch` (`branch_id`),
  INDEX `idx_students_session` (`academic_session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 10. STAFF TABLE
DROP TABLE IF EXISTS `staff`;
CREATE TABLE `staff` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL UNIQUE,
  `staff_code` VARCHAR(50) NOT NULL UNIQUE,
  `full_name` VARCHAR(150) NOT NULL,
  `designation` VARCHAR(100) NOT NULL,
  `department` VARCHAR(100) DEFAULT 'Accounts & Finance',
  `phone` VARCHAR(20) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 11. FEE CATEGORIES TABLE
DROP TABLE IF EXISTS `fee_categories`;
CREATE TABLE `fee_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `is_refundable` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 12. FEE STRUCTURES TABLE
DROP TABLE IF EXISTS `fee_structures`;
CREATE TABLE `fee_structures` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `academic_session_id` INT NOT NULL,
  `course_id` INT NOT NULL,
  `branch_id` INT NOT NULL,
  `semester_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `total_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_fee_struct_lookup` (`academic_session_id`, `branch_id`, `semester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 13. FEE STRUCTURE ITEMS TABLE
DROP TABLE IF EXISTS `fee_structure_items`;
CREATE TABLE `fee_structure_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `fee_structure_id` INT NOT NULL,
  `fee_category_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `due_date` DATE NULL,
  `grace_period_days` INT DEFAULT 15,
  FOREIGN KEY (`fee_structure_id`) REFERENCES `fee_structures`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`fee_category_id`) REFERENCES `fee_categories`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 14. INVOICES TABLE
DROP TABLE IF EXISTS `invoices`;
CREATE TABLE `invoices` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_no` VARCHAR(60) NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `academic_session_id` INT NOT NULL,
  `semester_id` INT NOT NULL,
  `subtotal` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `fine_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `total_payable` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `outstanding_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `due_date` DATE NOT NULL,
  `status` ENUM('DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED') DEFAULT 'ISSUED',
  `notes` VARCHAR(255) NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_invoices_student` (`student_id`),
  INDEX `idx_invoices_status` (`status`),
  INDEX `idx_invoices_due` (`due_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 15. INVOICE ITEMS TABLE
DROP TABLE IF EXISTS `invoice_items`;
CREATE TABLE `invoice_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_id` INT NOT NULL,
  `fee_category_id` INT NOT NULL,
  `description` VARCHAR(255) NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `paid_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`fee_category_id`) REFERENCES `fee_categories`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 16. STUDENT FEE LEDGER TABLE
DROP TABLE IF EXISTS `student_fee_ledgers`;
CREATE TABLE `student_fee_ledgers` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `academic_session_id` INT NOT NULL,
  `semester_id` INT NOT NULL,
  `fee_category_id` INT NOT NULL,
  `invoice_id` INT NULL,
  `description` VARCHAR(255) NULL,
  `amount_charged` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `scholarship_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `fine_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `adjustment_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `amount_paid` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `outstanding_amount` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `due_date` DATE NULL,
  `status` ENUM('UNPAID', 'PARTIALLY_PAID', 'PAID', 'WAIVED') DEFAULT 'UNPAID',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`semester_id`) REFERENCES `semesters`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`fee_category_id`) REFERENCES `fee_categories`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE SET NULL,
  INDEX `idx_ledger_student` (`student_id`),
  INDEX `idx_ledger_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 17. PAYMENTS TABLE
DROP TABLE IF EXISTS `payments`;
CREATE TABLE `payments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_no` VARCHAR(60) NOT NULL UNIQUE,
  `invoice_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `payment_method` ENUM('ONLINE_GATEWAY', 'CASH', 'CHEQUE', 'DD', 'NEFT_RTGS', 'UPI') DEFAULT 'ONLINE_GATEWAY',
  `transaction_id` VARCHAR(100) NULL,
  `gateway_order_id` VARCHAR(100) NULL,
  `gateway_signature` VARCHAR(255) NULL,
  `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REFUNDED', 'PARTIALLY_REFUNDED') DEFAULT 'PENDING',
  `verified_by` INT NULL,
  `verified_at` DATETIME NULL,
  `ip_address` VARCHAR(45) NULL,
  `idempotency_key` VARCHAR(100) NULL UNIQUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_payments_invoice` (`invoice_id`),
  INDEX `idx_payments_student` (`student_id`),
  INDEX `idx_payments_status` (`status`),
  INDEX `idx_payments_txn` (`transaction_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 18. PAYMENT EVENTS TABLE
DROP TABLE IF EXISTS `payment_events`;
CREATE TABLE `payment_events` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NOT NULL,
  `event_type` VARCHAR(50) NOT NULL,
  `payload` JSON NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 19. RECEIPTS TABLE
DROP TABLE IF EXISTS `receipts`;
CREATE TABLE `receipts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `receipt_no` VARCHAR(60) NOT NULL UNIQUE,
  `payment_id` INT NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `invoice_id` INT NOT NULL,
  `amount_paid` DECIMAL(12,2) NOT NULL,
  `payment_method` VARCHAR(50) NOT NULL,
  `transaction_id` VARCHAR(100) NULL,
  `issued_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `receipt_data_json` JSON NULL,
  `created_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_receipts_student` (`student_id`),
  INDEX `idx_receipts_invoice` (`invoice_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 20. REFUNDS TABLE
DROP TABLE IF EXISTS `refunds`;
CREATE TABLE `refunds` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `refund_no` VARCHAR(60) NOT NULL UNIQUE,
  `payment_id` INT NOT NULL,
  `student_id` INT NOT NULL,
  `invoice_id` INT NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('REQUESTED', 'APPROVED', 'REJECTED', 'PROCESSED') DEFAULT 'REQUESTED',
  `requested_by` INT NOT NULL,
  `approved_by` INT NULL,
  `processed_by` INT NULL,
  `remarks` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`processed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_refunds_student` (`student_id`),
  INDEX `idx_refunds_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 21. ADJUSTMENTS TABLE
DROP TABLE IF EXISTS `adjustments`;
CREATE TABLE `adjustments` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `student_id` INT NOT NULL,
  `invoice_id` INT NOT NULL,
  `fee_category_id` INT NOT NULL,
  `adjustment_type` ENUM('CREDIT', 'DEBIT') NOT NULL,
  `amount` DECIMAL(12,2) NOT NULL,
  `reason` TEXT NOT NULL,
  `status` ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  `requested_by` INT NOT NULL,
  `approved_by` INT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`invoice_id`) REFERENCES `invoices`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`fee_category_id`) REFERENCES `fee_categories`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_adjustments_student` (`student_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 22. SCHOLARSHIPS TABLE
DROP TABLE IF EXISTS `scholarships`;
CREATE TABLE `scholarships` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `student_id` INT NOT NULL,
  `academic_session_id` INT NOT NULL,
  `fee_category_id` INT NOT NULL,
  `amount_type` ENUM('FIXED', 'PERCENTAGE') DEFAULT 'FIXED',
  `value` DECIMAL(12,2) NOT NULL,
  `approved_by` INT NULL,
  `status` ENUM('ACTIVE', 'INACTIVE') DEFAULT 'ACTIVE',
  `reason` TEXT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`academic_session_id`) REFERENCES `academic_sessions`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`fee_category_id`) REFERENCES `fee_categories`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 23. DISCOUNTS TABLE
DROP TABLE IF EXISTS `discounts`;
CREATE TABLE `discounts` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(150) NOT NULL,
  `code` VARCHAR(50) NOT NULL UNIQUE,
  `discount_type` ENUM('FIXED', 'PERCENTAGE') DEFAULT 'FIXED',
  `value` DECIMAL(12,2) NOT NULL,
  `criteria` TEXT NULL,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 24. FINE RULES TABLE
DROP TABLE IF EXISTS `fine_rules`;
CREATE TABLE `fine_rules` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `fee_category_id` INT NOT NULL,
  `grace_period_days` INT DEFAULT 15,
  `fine_type` ENUM('FIXED', 'DAILY') DEFAULT 'FIXED',
  `fine_value` DECIMAL(12,2) NOT NULL DEFAULT 500.00,
  `max_fine_limit` DECIMAL(12,2) NOT NULL DEFAULT 5000.00,
  `is_active` TINYINT(1) DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`fee_category_id`) REFERENCES `fee_categories`(`id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 25. RECONCILIATION RECORDS TABLE
DROP TABLE IF EXISTS `reconciliation_records`;
CREATE TABLE `reconciliation_records` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `payment_id` INT NULL,
  `transaction_ref` VARCHAR(100) NOT NULL,
  `gateway_amount` DECIMAL(12,2) NOT NULL,
  `system_amount` DECIMAL(12,2) NOT NULL,
  `difference` DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  `gateway_status` VARCHAR(50) NOT NULL,
  `internal_status` VARCHAR(50) NOT NULL,
  `status` ENUM('MATCHED', 'UNMATCHED', 'INVESTIGATION', 'RESOLVED') DEFAULT 'UNMATCHED',
  `remarks` TEXT NULL,
  `reconciled_by` INT NULL,
  `reconciled_at` DATETIME NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reconciled_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_recon_status` (`status`),
  INDEX `idx_recon_txn` (`transaction_ref`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 26. NOTIFICATIONS TABLE
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `title` VARCHAR(150) NOT NULL,
  `message` TEXT NOT NULL,
  `category` ENUM('INVOICE', 'PAYMENT', 'RECEIPT', 'REMINDER', 'REFUND', 'ADJUSTMENT', 'ALERT') DEFAULT 'ALERT',
  `is_read` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_notif_user` (`user_id`, `is_read`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 27. AUDIT LOGS TABLE
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NULL,
  `role` VARCHAR(50) NULL,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `record_id` INT NULL,
  `old_value` JSON NULL,
  `new_value` JSON NULL,
  `reason` TEXT NULL,
  `ip_address` VARCHAR(45) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 28. SYSTEM SETTINGS TABLE
DROP TABLE IF EXISTS `system_settings`;
CREATE TABLE `system_settings` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT NOT NULL,
  `description` VARCHAR(255) NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
