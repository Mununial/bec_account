/**
 * Expense & Accounts Master Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 * Matches Reference Screens: Search Expenses, Party Master, Day Book, Profit & Loss
 */

const mockDb = require('../config/mockDb');
const { success, error } = require('../utils/response');

/**
 * Search Expenses with Filters
 * GET /api/expenses
 */
async function getExpenses(req, res) {
  try {
    const {
      party_name = '',
      from_date = '',
      to_date = '',
      category = '',
      party_reference = ''
    } = req.query;

    let records = mockDb.expenses.map(e => {
      const party = mockDb.parties.find(p => p.id === e.party_id);
      const cat = mockDb.expenseCategories.find(c => c.id === e.category_id);
      const staffUser = mockDb.staff.find(s => s.user_id === e.paid_by) || { full_name: 'Accounts Staff' };

      return {
        id: e.id,
        voucher_no: e.voucher_no,
        date: e.voucher_date,
        party_id: e.party_id,
        party_name: party ? party.party_name : (e.party_name || 'Direct Payee'),
        category_id: e.category_id,
        category_name: cat ? cat.name : 'General Expense',
        category_code: cat ? cat.code : 'EXP',
        payment_mode: e.payment_mode || 'BANK_TRANSFER',
        party_reference: e.party_reference || '-',
        amount: parseFloat(e.amount || 0),
        paid_by: staffUser.full_name,
        narration: e.narration || '',
        created_at: e.created_at
      };
    });

    // Apply Filters
    if (party_name && party_name.trim()) {
      const term = party_name.trim().toLowerCase();
      records = records.filter(r => r.party_name.toLowerCase().includes(term));
    }

    if (from_date && from_date.trim()) {
      records = records.filter(r => r.date >= from_date.trim());
    }

    if (to_date && to_date.trim()) {
      records = records.filter(r => r.date <= to_date.trim());
    }

    if (category && category.trim()) {
      records = records.filter(r => 
        String(r.category_id) === category.trim() ||
        r.category_name.toLowerCase().includes(category.trim().toLowerCase())
      );
    }

    if (party_reference && party_reference.trim()) {
      const refTerm = party_reference.trim().toLowerCase();
      records = records.filter(r => r.party_reference.toLowerCase().includes(refTerm));
    }

    // Sort descending by date
    records.sort((a, b) => new Date(b.date) - new Date(a.date));

    return success(res, records, 'Expense vouchers retrieved.');
  } catch (err) {
    console.error('getExpenses error:', err);
    return error(res, 'Failed to fetch expense records.', 500);
  }
}

/**
 * Record New Expense Voucher
 * POST /api/expenses
 */
async function createExpense(req, res) {
  try {
    const {
      voucher_date,
      party_id,
      party_name,
      category_id,
      payment_mode = 'BANK_TRANSFER',
      party_reference = '',
      amount,
      narration = ''
    } = req.body;

    if (!voucher_date || !category_id || !amount || parseFloat(amount) <= 0) {
      return error(res, 'Voucher Date, Category, and valid Amount are required.', 400);
    }

    // Resolve party
    let resolvedPartyId = party_id ? parseInt(party_id, 10) : null;
    let resolvedPartyName = party_name || '';

    if (!resolvedPartyId && party_name) {
      // Find or create party
      let existingParty = mockDb.parties.find(p => p.party_name.toLowerCase() === party_name.trim().toLowerCase());
      if (existingParty) {
        resolvedPartyId = existingParty.id;
      } else {
        resolvedPartyId = mockDb.parties.length + 1;
        mockDb.parties.push({
          id: resolvedPartyId,
          party_name: party_name.trim(),
          party_type: 'VENDOR',
          phone: '',
          email: '',
          address: 'Bhubaneswar'
        });
      }
    }

    const newId = mockDb.expenses.length + 1;
    const voucherNo = `EXP-2026-${String(newId).padStart(4, '0')}`;

    const newExpense = {
      id: newId,
      voucher_no: voucherNo,
      voucher_date: voucher_date.slice(0, 10),
      party_id: resolvedPartyId || 1,
      party_name: resolvedPartyName,
      category_id: parseInt(category_id, 10),
      payment_mode,
      party_reference: party_reference.trim() || `VCH-${newId}`,
      amount: parseFloat(amount),
      narration: narration.trim() || 'Institutional Operation Expense',
      paid_by: req.user ? req.user.id : 3,
      created_at: new Date().toISOString()
    };

    mockDb.expenses.push(newExpense);

    return success(res, newExpense, 'Expense voucher created successfully.');
  } catch (err) {
    console.error('createExpense error:', err);
    return error(res, 'Failed to record expense voucher.', 500);
  }
}

/**
 * Get Expense / Income Categories
 * GET /api/expenses/categories
 */
async function getCategories(req, res) {
  try {
    return success(res, mockDb.expenseCategories, 'Expense categories retrieved.');
  } catch (err) {
    return error(res, 'Failed to fetch expense categories.', 500);
  }
}

/**
 * Create Expense Category
 * POST /api/expenses/categories
 */
async function createCategory(req, res) {
  try {
    const { name, code, type = 'EXPENSE', description = '' } = req.body;
    if (!name) {
      return error(res, 'Category name is required.', 400);
    }

    const newCat = {
      id: mockDb.expenseCategories.length + 1,
      name: name.trim(),
      code: (code || `EXP-${Date.now().toString().slice(-4)}`).toUpperCase(),
      type: type.toUpperCase(),
      description: description.trim()
    };

    mockDb.expenseCategories.push(newCat);
    return success(res, newCat, 'Category created successfully.');
  } catch (err) {
    return error(res, 'Failed to create category.', 500);
  }
}

/**
 * Get Party Master (Vendors / Suppliers)
 * GET /api/expenses/parties
 */
async function getParties(req, res) {
  try {
    return success(res, mockDb.parties, 'Parties list retrieved.');
  } catch (err) {
    return error(res, 'Failed to fetch parties.', 500);
  }
}

/**
 * Create Party
 * POST /api/expenses/parties
 */
async function createParty(req, res) {
  try {
    const { party_name, party_type = 'VENDOR', contact_person = '', phone = '', email = '', gstin = '', address = '' } = req.body;
    if (!party_name) {
      return error(res, 'Party Name is required.', 400);
    }

    const newParty = {
      id: mockDb.parties.length + 1,
      party_name: party_name.trim(),
      party_type: party_type.toUpperCase(),
      contact_person: contact_person.trim(),
      phone: phone.trim(),
      email: email.trim(),
      gstin: gstin.trim(),
      address: address.trim()
    };

    mockDb.parties.push(newParty);
    return success(res, newParty, 'Party created successfully.');
  } catch (err) {
    return error(res, 'Failed to create party.', 500);
  }
}

/**
 * Get Profit & Loss Statement (Income vs Expense)
 * GET /api/expenses/profit-loss
 */
async function getProfitLoss(req, res) {
  try {
    // 1. Calculate Incomes
    let academicFeeTotal = 0;
    mockDb.payments.filter(p => p.status === 'SUCCESS').forEach(p => {
      academicFeeTotal += parseFloat(p.amount || 0);
    });

    let transportFeeTotal = 0;
    mockDb.studentTransports.forEach(t => {
      transportFeeTotal += parseFloat(t.fees_paid || 0);
    });

    const incomeBreakdown = [
      { head: 'Student Academic Fees (Tuition & Development)', amount: academicFeeTotal },
      { head: 'Student Bus Transport Fees', amount: transportFeeTotal },
      { head: 'Hostel Rent & Mess Charges', amount: 350000.00 },
      { head: 'Other College Receipts & Fines', amount: 45000.00 }
    ];

    const totalIncome = incomeBreakdown.reduce((sum, i) => sum + i.amount, 0);

    // 2. Calculate Expenses Breakdown
    const expenseBreakdown = mockDb.expenseCategories
      .filter(c => c.type === 'EXPENSE')
      .map(c => {
        const catExpenses = mockDb.expenses.filter(e => e.category_id === c.id);
        const amt = catExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
        return {
          category_id: c.id,
          category_name: c.name,
          category_code: c.code,
          amount: amt
        };
      });

    const totalExpense = expenseBreakdown.reduce((sum, e) => sum + e.amount, 0);
    const netSurplus = totalIncome - totalExpense;

    return success(res, {
      college: 'Bhubaneswar Engineering College',
      financial_year: '2026-27',
      total_income: totalIncome,
      total_expense: totalExpense,
      net_surplus: netSurplus,
      is_surplus: netSurplus >= 0,
      income_breakdown: incomeBreakdown,
      expense_breakdown: expenseBreakdown
    }, 'Profit & Loss Statement computed.');
  } catch (err) {
    console.error('getProfitLoss error:', err);
    return error(res, 'Failed to compute Profit & Loss.', 500);
  }
}

/**
 * Get Day Book (Daily Cash/Bank Receipts & Payments)
 * GET /api/expenses/daybook
 */
async function getDayBook(req, res) {
  try {
    const targetDate = req.query.date || new Date().toISOString().slice(0, 10);

    // Payments received (Receipts / Inflows)
    const receipts = mockDb.payments
      .filter(p => p.created_at && p.created_at.slice(0, 10) === targetDate && p.status === 'SUCCESS')
      .map(p => {
        const st = mockDb.students.find(s => s.id === p.student_id);
        return {
          time: p.created_at.slice(11, 16) || '10:00',
          type: 'RECEIPT',
          account: p.payment_method,
          particulars: `Fee Receipt from ${st ? st.full_name : 'Student'} (${p.payment_no})`,
          debit: 0,
          credit: parseFloat(p.amount)
        };
      });

    // Expenses paid (Vouchers / Outflows)
    const vouchers = mockDb.expenses
      .filter(e => e.voucher_date === targetDate)
      .map(e => {
        const party = mockDb.parties.find(p => p.id === e.party_id);
        const cat = mockDb.expenseCategories.find(c => c.id === e.category_id);
        return {
          time: e.created_at ? e.created_at.slice(11, 16) : '12:00',
          type: 'PAYMENT',
          account: e.payment_mode,
          particulars: `Paid to ${party ? party.party_name : 'Party'} - ${cat ? cat.name : 'Expense'} (${e.voucher_no})`,
          debit: parseFloat(e.amount),
          credit: 0
        };
      });

    const entries = [...receipts, ...vouchers];
    const totalCredit = entries.reduce((sum, r) => sum + r.credit, 0);
    const totalDebit = entries.reduce((sum, r) => sum + r.debit, 0);
    const netCashFlow = totalCredit - totalDebit;

    return success(res, {
      date: targetDate,
      total_receipts: totalCredit,
      total_payments: totalDebit,
      net_cash_flow: netCashFlow,
      entries
    }, 'Day Book retrieved.');
  } catch (err) {
    console.error('getDayBook error:', err);
    return error(res, 'Failed to fetch Day Book.', 500);
  }
}

/**
 * Export Expenses to CSV
 * GET /api/expenses/export
 */
async function exportExpensesCSV(req, res) {
  try {
    const list = mockDb.expenses.map((e, idx) => {
      const party = mockDb.parties.find(p => p.id === e.party_id);
      const cat = mockDb.expenseCategories.find(c => c.id === e.category_id);
      return {
        'Voucher No': e.voucher_no,
        'Date': e.voucher_date,
        'Party / Payee Name': party ? party.party_name : 'Direct Payee',
        'Category': cat ? cat.name : 'General Expense',
        'Payment Mode': e.payment_mode,
        'Party Reference': e.party_reference || '-',
        'Amount (INR)': e.amount,
        'Narration': e.narration || ''
      };
    });

    if (list.length === 0) {
      return res.status(200).send('Voucher No,Date,Party Name,Category,Payment Mode,Party Reference,Amount,Narration\n');
    }

    const headers = Object.keys(list[0]).join(',');
    const rows = list.map(row => Object.values(row).map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csvContent = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="BEC_Expenses_Report_2026.csv"');
    return res.status(200).send(csvContent);
  } catch (err) {
    return error(res, 'Failed to export expenses.', 500);
  }
}

module.exports = {
  getExpenses,
  createExpense,
  getCategories,
  createCategory,
  getParties,
  createParty,
  getProfitLoss,
  getDayBook,
  exportExpensesCSV
};
