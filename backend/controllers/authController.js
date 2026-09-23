/**
 * Authentication Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../services/auditService');
const { JWT_SECRET } = require('../middleware/auth');

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * User Login
 * POST /api/auth/login
 */
async function login(req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return error(res, 'Email and password are required.', 400);
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // Support login by email, username shortcut, or student registration number
    let lookupTerm = normalizedEmail;
    if (normalizedEmail === 'admin') lookupTerm = 'admin@bec.ac.in';
    else if (normalizedEmail === 'staff' || normalizedEmail === 'account') lookupTerm = 'accounts.staff@bec.ac.in';
    else if (normalizedEmail === 'head') lookupTerm = 'accounts.head@bec.ac.in';
    else if (normalizedEmail === 'auditor') lookupTerm = 'auditor@bec.ac.in';
    else if (normalizedEmail === 'student' || normalizedEmail === 'bablu' || normalizedEmail === 'bablu bag') lookupTerm = 'bablu.bag@bec.ac.in';

    let [users] = await query(
      `SELECT u.id, u.email, u.password_hash, u.role_id, u.must_change_password, u.is_active,
              r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.email = ? LIMIT 1`,
      [lookupTerm]
    );

    // If not found by email, try matching by student reg_no or admission number
    if (users.length === 0) {
      const [students] = await query(
        `SELECT u.id, u.email, u.password_hash, u.role_id, u.must_change_password, u.is_active,
                r.name AS role_name
         FROM students s
         JOIN users u ON s.user_id = u.id
         JOIN roles r ON u.role_id = r.id
         WHERE LOWER(s.reg_no) = ? OR LOWER(s.full_name) LIKE ? LIMIT 1`,
        [normalizedEmail, `%${normalizedEmail}%`]
      );
      if (students.length > 0) {
        users = students;
      }
    }

    if (users.length === 0) {
      return error(res, 'User account not found. Enter your email, username (e.g. admin, staff, student), or Student ID.', 401);
    }

    const user = users[0];

    if (!user.is_active) {
      return error(res, 'Your account has been deactivated. Please contact Accounts Office.', 403);
    }

    // Check password via bcrypt OR easy access bypass for fast operational usage
    const isBcryptMatch = await bcrypt.compare(password, user.password_hash).catch(() => false);
    const isEasyMatch = [
      '123456', '12345678', 'password', 'bec123', 'admin', 'staff', 'head', 'student',
      'Student@BEC2026!', 'Staff@BEC2026!', 'Head@BEC2026!', 'Admin@BEC2026!', 'Auditor@BEC2026!'
    ].includes(password);

    if (!isBcryptMatch && !isEasyMatch) {
      return error(res, 'Invalid password. Tip: Use 123456 or click the quick demo buttons.', 401);
    }

    // Update last login
    await query(`UPDATE users SET last_login_at = NOW() WHERE id = ?`, [user.id]);

    // Fetch student or staff info
    let profile = {
      userId: user.id,
      email: user.email,
      role: user.role_name,
      roleId: user.role_id,
      mustChangePassword: Boolean(user.must_change_password)
    };

    if (user.role_name === 'STUDENT') {
      const [stRows] = await query(
        `SELECT s.id, s.reg_no, s.full_name, s.gender, s.dob, s.category,
                c.name AS course_name, b.name AS branch_name, b.code AS branch_code,
                sem.label AS semester_label, a.name AS session_name
         FROM students s
         JOIN courses c ON s.course_id = c.id
         JOIN branches b ON s.branch_id = b.id
         JOIN semesters sem ON s.current_semester_id = sem.id
         JOIN academic_sessions a ON s.academic_session_id = a.id
         WHERE s.user_id = ? LIMIT 1`,
        [user.id]
      );
      if (stRows.length > 0) {
        profile.student = stRows[0];
        profile.studentId = stRows[0].id;
      }
    } else {
      const [staffRows] = await query(
        `SELECT id, staff_code, full_name, designation, department, phone 
         FROM staff WHERE user_id = ? LIMIT 1`,
        [user.id]
      );
      if (staffRows.length > 0) {
        profile.staff = staffRows[0];
        profile.staffId = staffRows[0].id;
      }
    }

    // Sign JWT
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role_name,
        roleId: user.role_id,
        studentId: profile.studentId || null,
        staffId: profile.staffId || null
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    // Audit log login
    await logAudit({
      userId: user.id,
      role: user.role_name,
      action: 'USER_LOGIN',
      module: 'AUTH',
      ipAddress: req.ip
    });

    return success(res, { token, user: profile }, 'Login successful.');
  } catch (err) {
    console.error('Login error:', err);
    return error(res, 'Authentication service temporarily unavailable.', 500);
  }
}

/**
 * Change Password
 * POST /api/auth/change-password
 */
async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!currentPassword || !newPassword) {
    return error(res, 'Current password and new password are required.', 400);
  }

  if (newPassword.length < 8) {
    return error(res, 'New password must be at least 8 characters long.', 400);
  }

  try {
    const [users] = await query(`SELECT password_hash FROM users WHERE id = ?`, [userId]);
    if (users.length === 0) {
      return error(res, 'User not found.', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password_hash);
    if (!isMatch) {
      return error(res, 'Current password is incorrect.', 400);
    }

    const hashed = await bcrypt.hash(newPassword, 12);
    await query(
      `UPDATE users SET password_hash = ?, must_change_password = 0, updated_at = NOW() WHERE id = ?`,
      [hashed, userId]
    );

    await logAudit({
      userId,
      role: req.user.role,
      action: 'PASSWORD_CHANGE',
      module: 'AUTH',
      reason: 'User self-initiated password update',
      ipAddress: req.ip
    });

    return success(res, null, 'Password successfully updated. You may now continue.');
  } catch (err) {
    console.error('Password change error:', err);
    return error(res, 'Failed to update password.', 500);
  }
}

/**
 * Get current session profile
 * GET /api/auth/me
 */
async function getMe(req, res) {
  try {
    const userId = req.user.id;
    const [users] = await query(
      `SELECT u.id, u.email, u.role_id, u.must_change_password, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? LIMIT 1`,
      [userId]
    );

    if (users.length === 0) {
      return error(res, 'User not found.', 404);
    }

    const user = users[0];
    const profile = {
      userId: user.id,
      email: user.email,
      role: user.role_name,
      roleId: user.role_id,
      mustChangePassword: Boolean(user.must_change_password)
    };

    if (user.role_name === 'STUDENT') {
      const [stRows] = await query(
        `SELECT s.id, s.reg_no, s.full_name, s.gender, s.dob, s.category,
                c.name AS course_name, b.name AS branch_name, b.code AS branch_code,
                sem.label AS semester_label, a.name AS session_name
         FROM students s
         JOIN courses c ON s.course_id = c.id
         JOIN branches b ON s.branch_id = b.id
         JOIN semesters sem ON s.current_semester_id = sem.id
         JOIN academic_sessions a ON s.academic_session_id = a.id
         WHERE s.user_id = ? LIMIT 1`,
        [userId]
      );
      if (stRows.length > 0) {
        profile.student = stRows[0];
        profile.studentId = stRows[0].id;
      }
    } else {
      const [staffRows] = await query(
        `SELECT id, staff_code, full_name, designation, department, phone 
         FROM staff WHERE user_id = ? LIMIT 1`,
        [userId]
      );
      if (staffRows.length > 0) {
        profile.staff = staffRows[0];
        profile.staffId = staffRows[0].id;
      }
    }

    return success(res, profile, 'User profile retrieved.');
  } catch (err) {
    console.error('getMe error:', err);
    return error(res, 'Failed to retrieve profile.', 500);
  }
}

/**
 * Logout
 * POST /api/auth/logout
 */
async function logout(req, res) {
  if (req.user) {
    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'USER_LOGOUT',
      module: 'AUTH',
      ipAddress: req.ip
    });
  }
  return success(res, null, 'Logged out successfully.');
}

module.exports = {
  login,
  changePassword,
  getMe,
  logout
};
