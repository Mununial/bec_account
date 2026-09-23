/**
 * In-Portal Notification Service
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { query } = require('../config/db');

async function createNotification({
  userId,
  title,
  message,
  category = 'ALERT'
}) {
  try {
    const [result] = await query(
      `INSERT INTO notifications (user_id, title, message, category, is_read)
       VALUES (?, ?, ?, ?, 0)`,
      [userId, title, message, category]
    );
    return result.insertId;
  } catch (error) {
    console.error('[NotificationService Error]', error.message);
    return null;
  }
}

async function markAsRead(notificationId, userId) {
  const [result] = await query(
    `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
    [notificationId, userId]
  );
  return result.affectedRows > 0;
}

async function markAllAsRead(userId) {
  const [result] = await query(
    `UPDATE notifications SET is_read = 1 WHERE user_id = ?`,
    [userId]
  );
  return result.affectedRows;
}

module.exports = {
  createNotification,
  markAsRead,
  markAllAsRead
};
