/**
 * System Identifiers & Formatting Helpers
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const crypto = require('crypto');

function generateInvoiceNo(year = new Date().getFullYear()) {
  const rand = crypto.randomInt(10000, 99999);
  return `INV-${year}-${rand}`;
}

function generatePaymentNo(year = new Date().getFullYear()) {
  const rand = crypto.randomInt(10000, 99999);
  return `PAY-${year}-${rand}`;
}

function generateReceiptNo(year = new Date().getFullYear()) {
  const rand = crypto.randomInt(10000, 99999);
  return `BEC-REC-${year}-${rand}`;
}

function generateRefundNo(year = new Date().getFullYear()) {
  const rand = crypto.randomInt(1000, 9999);
  return `REF-${year}-${rand}`;
}

function formatCurrency(amount) {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
}

module.exports = {
  generateInvoiceNo,
  generatePaymentNo,
  generateReceiptNo,
  generateRefundNo,
  formatCurrency
};
