/**
 * Standardized API Response Utilities
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

function success(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

function error(res, message = 'An error occurred', statusCode = 500, errors = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    errors,
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  success,
  error
};
