/**
 * JWT Authentication Middleware
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const jwt = require('jsonwebtoken');
const { query } = require('../config/db');
const { error } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'bec_secure_jwt_secret_production_key_2026_finance';

async function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return error(res, 'Authentication token missing. Please log in.', 401);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user is still active in database
    const [userRows] = await query(
      `SELECT u.id, u.email, u.role_id, u.must_change_password, u.is_active, r.name AS role_name
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = ? LIMIT 1`,
      [decoded.userId]
    );

    if (userRows.length === 0 || !userRows[0].is_active) {
      return error(res, 'Account is inactive or does not exist.', 401);
    }

    const u = userRows[0];
    req.user = {
      id: u.id,
      email: u.email,
      roleId: u.role_id,
      role: u.role_name,
      mustChangePassword: Boolean(u.must_change_password)
    };

    // Attach student_id or staff_id if applicable
    if (u.role_name === 'STUDENT') {
      const [studentRows] = await query(
        `SELECT id, reg_no, full_name, branch_id, course_id, current_semester_id, academic_session_id 
         FROM students WHERE user_id = ? LIMIT 1`,
        [u.id]
      );
      if (studentRows.length > 0) {
        req.user.studentId = studentRows[0].id;
        req.user.student = studentRows[0];
      }
    } else {
      const [staffRows] = await query(
        `SELECT id, staff_code, full_name, designation FROM staff WHERE user_id = ? LIMIT 1`,
        [u.id]
      );
      if (staffRows.length > 0) {
        req.user.staffId = staffRows[0].id;
        req.user.staff = staffRows[0];
      }
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return error(res, 'Your session has expired. Please log in again.', 401);
    }
    return error(res, 'Invalid authentication token.', 403);
  }
}

module.exports = {
  authenticateToken,
  JWT_SECRET
};
