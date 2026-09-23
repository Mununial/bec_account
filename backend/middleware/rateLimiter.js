/**
 * Rate Limiting Middleware
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const rateLimit = require('express-rate-limit');

// Strict limiter for login and password changes to block brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

// General limiter for public API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please slow down.'
  }
});

module.exports = {
  authLimiter,
  apiLimiter
};
