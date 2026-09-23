# Bhubaneswar Engineering College (BEC)
## College Accounts & Finance Management System

A production-grade, secure, and responsive **College Accounts & Finance Management System** engineered for **Bhubaneswar Engineering College (BEC)**. The platform provides full lifecycle financial operations across students, accounts staff, accounts head, college administration, and external auditors.

Built strictly with **HTML5, CSS3, Vanilla JavaScript, Node.js, Express.js, and Hostinger MySQL (`mysql2`)** with zero frontend framework overhead and absolute single-source-of-truth database integrity.

---

## Key Highlights

- **Zero Client Trust Architecture:** All balances, late fines, scholarships, discounts, and payment allocations are strictly calculated server-side in MySQL and Express.js.
- **Guaranteed Student Data Isolation:** Students are permanently locked to their authenticated JWT session; cross-student financial inspection is mathematically impossible.
- **ACID Financial Transactions:** Payments and ledger settlements execute inside MySQL `START TRANSACTION ... FOR UPDATE` blocks, eliminating double-credits, race conditions, and ledger drift.
- **Replay & Tampering Prevention:** Server-side HMAC signature verification, order token hashing, and idempotency key checks.
- **Comprehensive 5-Tier RBAC:** `STUDENT`, `ACCOUNTS_STAFF`, `ACCOUNTS_HEAD`, `ADMIN`, and `AUDITOR_READ_ONLY`.
- **Authentic BEC Cohort Integration:** Pre-seeded from Bhubaneswar Engineering College 1st-year reporting records (`final 1st Year database from reporting.xlsx`) across all 7 engineering departments.
- **Official Digital Receipts:** Verifiable digital receipts with unique numbers (`BEC-REC-YYYY-XXXXX`) and printable A4 layouts.
- **Automated Financial Intelligence:** Deterministic SQL-driven analytics flagging students with dues expiring in 3 days, overdue aging, and settlement discrepancies.
- **Hostinger Production Ready:** Native configuration for Hostinger Node.js application management and Hostinger MySQL database hosting.

---

## System Architecture

```
                                +--------------------------------------------------+
                                |              CLIENT APPLICATION                  |
                                |  HTML5 / CSS3 (Vanilla) / Vanilla ES6+ JS        |
                                |  Responsive (Mobile, Tablet, Desktop)            |
                                |  A4 Print-Ready Invoices & Digital Receipts      |
                                +------------------------+-------------------------+
                                                         | HTTPS / REST APIs
                                                         | JWT Bearer Token
                                                         v
                                +--------------------------------------------------+
                                |             EXPRESS.JS REST BACKEND              |
                                |  Helmet | CORS | Rate-Limiter | Request Sanitizer|
                                |  JWT Authentication & Strict RBAC Middleware     |
                                |  Student Data Isolation Engine                   |
                                |  Financial Ledger & Billing Engine               |
                                |  Payment Gateway Abstraction & Signature Verifier|
                                |  Immutable Audit Logger & Notification Pipeline  |
                                +------------------------+-------------------------+
                                                         | mysql2 Connection Pool
                                                         | Parameterized SQL Queries
                                                         | ACID DB Transactions (FOR UPDATE)
                                                         v
                                +--------------------------------------------------+
                                |             HOSTINGER MYSQL DATABASE             |
                                |  28 Normalized Tables with Foreign Keys          |
                                |  Indexes on Search, Filter & Foreign Key Columns |
                                |  Audit Trail & Immutable Financial History       |
                                +------------------------+-------------------------+
```

---

## Core Modules (24 Modules)

1. **Dashboard:** Role-tailored dashboards for students and accounts executives.
2. **Student Profile:** Academic details, branch, roll number, admission category, and contacts.
3. **Student Fee Ledger:** Complete itemized ledger history with fee components, charged amounts, scholarships, fines, and outstanding balances.
4. **Fee Structure Management:** Configurable session fee structures for courses, branches, and semesters with bulk cohort assignment.
5. **Invoice Management:** Unique invoice numbers (`INV-YYYY-XXXXX`), status tracking (`ISSUED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `CANCELLED`).
6. **Student Dues & Aging:** Breakdown of current and past-due balances.
7. **Online Fee Payments:** Safe payment order flow with server-side signature validation and atomic ledger posting.
8. **Counter / Offline Collections:** Accounts staff cash, cheque, DD, and NEFT recording with instant receipt issuance.
9. **Payment History:** Searchable payment records with verification timestamps.
10. **Digital Receipts:** Unique receipt generator (`BEC-REC-YYYY-XXXXX`) with printable A4 templates.
11. **Refund Management:** Multi-tier refund request, approval, and adjustment workflow.
12. **Fee Adjustments:** Credit and debit adjustments with mandatory audit justification.
13. **Scholarships & Discounts:** Merited fee deductions and criteria tracking.
14. **Fine Management:** Configurable grace periods, daily/fixed fines, and caps.
15. **Payment Reconciliation:** Gateway feed vs internal system total discrepancy matcher.
16. **Accounts Dashboard:** Executive KPIs (Today's, Month's, Total collections, Overdue, Outstanding).
17. **Reports & Analytics:** Date-range collection statements and overdue defaulter reports.
18. **CSV Data Export:** One-click compliance CSV export for audits.
19. **Finance Intelligence:** System-generated SQL alerts without fake AI metrics.
20. **Notification System:** In-portal alerts for invoices, receipts, and payment confirmations.
21. **Immutable Audit Logging:** User ID, role, action, module, old/new values, IP, and timestamp.
22. **User Management:** Administrative user provisioning and status toggling.
23. **Academic Session Management:** Active billing session switching (`2026-27`).
24. **Course & Branch Taxonomy:** B.Tech branches (CSE, CSE-DS, Agri, EE, Mech, Aero, Civil, ECE).

---

## User Roles & Permissions

| Role | Email | Password | Primary Permissions |
| :--- | :--- | :--- | :--- |
| **STUDENT** | `jitendranial@bec.ac.in` | `Student@BEC2026!` | View own profile, ledger, invoices; pay online; print receipts; submit refund appeals. |
| **ACCOUNTS_STAFF** | `accounts.staff@bec.ac.in` | `Staff@BEC2026!` | Search students; record counter payments (Cash/Cheque/DD/NEFT); issue receipts; view invoices. |
| **ACCOUNTS_HEAD** | `accounts.head@bec.ac.in` | `Head@BEC2026!` | Approve refunds; apply adjustments; configure fee structures; manage fine rules; reconcile bank feeds. |
| **ADMIN** | `admin@bec.ac.in` | `Admin@BEC2026!` | Full system management; user provisioning; academic session control; full audit log access. |
| **AUDITOR_READ_ONLY** | `auditor@bec.ac.in` | `Auditor@BEC2026!` | Read-only inspection of ledgers, reconciliations, collections, and audit logs. Modifying calls return 403. |

---

## Database Architecture (28 Tables)

- `users`, `roles`, `permissions`, `role_permissions`
- `academic_sessions`, `courses`, `branches`, `semesters`
- `students`, `staff`
- `fee_categories`, `fee_structures`, `fee_structure_items`
- `invoices`, `invoice_items`, `student_fee_ledgers`
- `payments`, `payment_events`, `receipts`
- `refunds`, `adjustments`, `scholarships`, `discounts`, `fine_rules`
- `reconciliation_records`, `notifications`, `audit_logs`, `system_settings`

---

## REST API Documentation

### Authentication (`/api/auth`)
- `POST /api/auth/login`: Authenticates user, issues JWT token (8h expiry).
- `POST /api/auth/change-password`: Self-service password change with complexity check.
- `GET /api/auth/me`: Validates session and returns active profile.
- `POST /api/auth/logout`: Invalidates session.

### Student Portal (`/api/student`) - *Strict Student Isolation*
- `GET /api/student/profile`: Student personal, branch, and contact metadata.
- `GET /api/student/dashboard`: Card totals, pending invoices, recent transactions.
- `GET /api/student/ledger`: Itemized fee categories, charges, paid, and balance.
- `GET /api/student/invoices`: Invoices list.
- `GET /api/student/invoices/:id`: Single invoice with line items.
- `GET /api/student/payments`: Payment settlement log.
- `GET /api/student/receipts`: Issued digital receipts.
- `GET /api/student/receipts/:id`: Printable receipt payload.
- `POST /api/student/requests`: Submit refund or fee adjustment appeal.

### Payments (`/api/payments`)
- `POST /api/payments/create-order`: Validates invoice, initiates gateway order token.
- `POST /api/payments/verify`: Server-side signature verification & atomic ledger post.
- `POST /api/payments/record-offline`: Staff counter collection (Cash/Cheque/DD/NEFT).
- `GET /api/payments/:id`: Payment details and verification audit.

### Accounts & Admin Operations (`/api/admin`)
- `GET /api/admin/dashboard`: Executive collection metrics and branch charts.
- `GET /api/admin/intelligence`: SQL financial alerts (3-day dues, severe overdue).
- `GET /api/admin/students`: Student directory with billing and balance totals.
- `GET /api/admin/students/:id/ledger`: Staff ledger inspection.
- `GET /api/admin/refunds`: Refund requests queue.
- `POST /api/admin/refunds/:id/approve`: Approve refund and adjust balance.
- `POST /api/admin/adjustments`: Apply credit/debit fee adjustment.
- `GET /api/admin/reconciliation`: Gateway vs system reconciliation statement.
- `POST /api/admin/reconciliation/:id/resolve`: Mark discrepancy resolved.
- `GET /api/admin/audit-logs`: Immutable system audit trail.

### Fee Structures (`/api/fees`)
- `GET /api/fees/structures`: List active fee structures.
- `POST /api/fees/structures`: Create fee structure.
- `POST /api/fees/structures/:id/assign-bulk`: Bulk generate invoices for branch cohort.
- `GET /api/fees/fine-rules`: Configure late fine rules.

### Reports (`/api/reports`)
- `GET /api/reports/collections`: Filterable collections statement.
- `GET /api/reports/defaulters`: Overdue student defaulter list.
- `GET /api/reports/export-csv`: Streaming CSV export.

---

## Local Installation & Quick Start

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-org/bec_account.git
cd bec_account/backend
npm install
```

### 2. Configure Environment (.env)
Copy template:
```bash
cp .env.example .env
```
Edit `backend/.env` with your database credentials.

### 3. Initialize & Seed Database
```bash
# If running local MySQL or remote Hostinger MySQL:
node database/init_db.js
```
*(Note: If MySQL is not running on localhost, the backend automatically operates in an In-Memory High-Fidelity Simulation Mode populated with the real BEC cohort for local preview).*

### 4. Run Automated Test Suite
```bash
node tests/run_tests.js
```
*(Runs 34 automated unit and security tests verifying authentication, RBAC, student isolation, payments, and reporting).*

### 5. Start Application Server
```bash
npm start
```
Open your browser at `http://localhost:5000` or `http://localhost:5000/login.html`.

---

## Hostinger Production Deployment

For complete, step-by-step instructions on setting up MySQL, Node.js applications, and Let's Encrypt SSL on Hostinger hPanel, refer to:
[HOSTINGER_DEPLOYMENT.md](file:///c:/Users/munun/OneDrive/Desktop/bec_account/HOSTINGER_DEPLOYMENT.md)

---

## Production Security Measures

- **Password Hashing:** `bcryptjs` with 12 salt rounds; plain-text passwords are never stored.
- **Brute Force Protection:** Strict rate-limiting (`express-rate-limit`) on authentication endpoints.
- **Parameterized SQL:** All queries use `mysql2` parameterized inputs (`?`) to prevent SQL Injection.
- **HTTP Headers:** `helmet` enabled for XSS, MIME-sniffing, and frameguard protection.
- **Student Isolation:** Verified at the middleware layer; tokens permanently lock student queries to their own records.
- **Audit Logging:** Every financial mutation (payments, cancellations, refunds, adjustments) writes an immutable record to `audit_logs`.
- **Zero Framework Vulnerabilities:** Pure Vanilla JavaScript on the frontend eliminates frontend supply-chain risks and bundler bloat.

---

## License & Attribution
Proprietary software developed for **Bhubaneswar Engineering College (BEC)**.  
Affiliated to BPUT, Odisha & Approved by AICTE, New Delhi.
