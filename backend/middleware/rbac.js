/**
 * Role-Based Access Control (RBAC) Middleware
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');
const { error } = require('../utils/response');

/**
 * Restrict endpoint to specific role(s)
 * @param  {...string} roles
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return error(res, 'Authentication required.', 401);
    }

    if (!roles.includes(req.user.role)) {
      return error(
        res,
        `Access denied. Required role: ${roles.join(' or ')}. Your role: ${req.user.role}`,
        403
      );
    }

    next();
  };
}

/**
 * Verify specific permission code in database
 * @param {string} permissionCode
 */
function requirePermission(permissionCode) {
  return async (req, res, next) => {
    if (!req.user || !req.user.roleId) {
      return error(res, 'Authentication required.', 401);
    }

    // Admin has implicit access to all permissions
    if (req.user.role === 'ADMIN') {
      return next();
    }

    try {
      const [rows] = await query(
        `SELECT rp.role_id 
         FROM role_permissions rp
         JOIN permissions p ON rp.permission_id = p.id
         WHERE rp.role_id = ? AND p.code = ? LIMIT 1`,
        [req.user.roleId, permissionCode]
      );

      if (rows.length === 0) {
        return error(
          res,
          `Access denied. You lack the required permission: '${permissionCode}'.`,
          403
        );
      }

      next();
    } catch (err) {
      return error(res, 'Permission verification failed.', 500);
    }
  };
}

module.exports = {
  requireRole,
  requirePermission
};
