/**
 * System Settings, Academic Sessions, and Branches Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');
const { success, error } = require('../utils/response');
const { logAudit } = require('../services/auditService');

/**
 * Get All Academic Sessions
 * GET /api/settings/sessions
 */
async function getSessions(req, res) {
  try {
    const [sessions] = await query(`SELECT * FROM academic_sessions ORDER BY id DESC`);
    return success(res, sessions, 'Academic sessions loaded.');
  } catch (err) {
    return error(res, 'Failed to load sessions.', 500);
  }
}

/**
 * Get All Courses and Branches
 * GET /api/settings/courses-branches
 */
async function getCoursesAndBranches(req, res) {
  try {
    const [courses] = await query(`SELECT * FROM courses ORDER BY id ASC`);
    const [branches] = await query(`SELECT b.*, c.name AS course_name FROM branches b JOIN courses c ON b.course_id = c.id ORDER BY b.course_id, b.id`);
    const [semesters] = await query(`SELECT * FROM semesters ORDER BY semester_number ASC`);

    return success(res, { courses, branches, semesters }, 'Academic taxonomy loaded.');
  } catch (err) {
    return error(res, 'Failed to load academic taxonomy.', 500);
  }
}

/**
 * Get System Settings
 * GET /api/settings/system
 */
async function getSystemSettings(req, res) {
  try {
    const [settings] = await query(`SELECT * FROM system_settings`);
    const settingsMap = {};
    for (const s of settings) {
      settingsMap[s.setting_key] = s.setting_value;
    }
    return success(res, settingsMap, 'System settings loaded.');
  } catch (err) {
    return error(res, 'Failed to load system settings.', 500);
  }
}

/**
 * Update System Settings
 * PUT /api/settings/system
 */
async function updateSystemSettings(req, res) {
  const { settings } = req.body;

  if (!settings || typeof settings !== 'object') {
    return error(res, 'Settings payload must be an object.', 400);
  }

  try {
    for (const [key, value] of Object.entries(settings)) {
      await query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()`,
        [key, String(value)]
      );
    }

    await logAudit({
      userId: req.user.id,
      role: req.user.role,
      action: 'UPDATE_SYSTEM_SETTINGS',
      module: 'SYSTEM',
      reason: 'Administrative settings modification',
      ipAddress: req.ip
    });

    return success(res, null, 'Settings updated successfully.');
  } catch (err) {
    return error(res, 'Failed to update system settings.', 500);
  }
}

module.exports = {
  getSessions,
  getCoursesAndBranches,
  getSystemSettings,
  updateSystemSettings
};
