/**
 * Centralized Global Error Handler Middleware
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const { error } = require('../utils/response');

function errorHandler(err, req, res, next) {
  console.error('[Unhandled Server Error]', {
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Handle specific database errors
  if (err.code === 'ER_DUP_ENTRY') {
    return error(res, 'A record with these details already exists.', 409);
  }
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    return error(res, 'Invalid reference ID provided in relationship.', 400);
  }
  if (err.code === 'ECONNREFUSED' || err.code === 'PROTOCOL_CONNECTION_LOST') {
    return error(res, 'Database connection unavailable. Please contact system administrator.', 503);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    return error(res, 'Invalid security token.', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return error(res, 'Your session has expired. Please log in again.', 401);
  }

  // Generic fallback message protecting internal details
  const status = err.statusCode || 500;
  const userMessage = err.isOperational
    ? err.message
    : 'An unexpected system error occurred. Please try again later or contact the Accounts Office.';

  return error(res, userMessage, status);
}

module.exports = errorHandler;
