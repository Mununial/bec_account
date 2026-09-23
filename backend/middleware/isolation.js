/**
 * Student Data Isolation Middleware
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { error } = require('../utils/response');

/**
 * Enforces strict financial isolation for students.
 * If user is STUDENT, parameter `studentId` is locked to their own ID.
 * If user attempts to supply a different student ID, access is forbidden.
 */
function ensureStudentIsolation(req, res, next) {
  if (!req.user) {
    return error(res, 'Authentication required.', 401);
  }

  if (req.user.role === 'STUDENT') {
    if (!req.user.studentId) {
      return error(res, 'Student profile not linked to user account.', 403);
    }

    // Check if client tried to specify studentId in body, params, or query
    const requestedStudentId = req.params.studentId || req.query.studentId || req.body.studentId;

    if (requestedStudentId && parseInt(requestedStudentId, 10) !== req.user.studentId) {
      return error(
        res,
        'Security Violation: You are strictly forbidden from viewing or modifying financial records of another student.',
        403
      );
    }

    // Force studentId to authenticated student's ID
    req.targetStudentId = req.user.studentId;
  } else {
    // For staff/admin/auditor, allow requested studentId
    const requestedStudentId = req.params.studentId || req.query.studentId || req.body.studentId;
    req.targetStudentId = requestedStudentId ? parseInt(requestedStudentId, 10) : null;
  }

  next();
}

module.exports = {
  ensureStudentIsolation
};
