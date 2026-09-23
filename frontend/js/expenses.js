/**
 * Bhubaneswar Engineering College (BEC) - Expenses & Accounts Master Controller
 * Handles Search Expenses, New Expense, Party Master, Categories, Day Book, and Profit & Loss
 */

const expensesApp = {
  parties: [],
  categories: [],
  expenses: [],
  activeTab: 'SEARCH',

  async init() {
    await this.loadCategories();
    await this.loadParties();
    await this.fetchExpenses();
  },

  async loadCategories() {
    try {
      const res = await api.get('/expenses/categories');
      if (res && res.success) {
        this.categories = res.data || [];
        const select = document.getElementById('filterExpenseCategory');
        const modalSelect = document.getElementById('newExpenseCategory');

        const options = this.categories
          .filter(c => c.type === 'EXPENSE')
          .map(c => `<option value="${c.id}">${c.name}</option>`)
          .join('');

        if (select) {
          select.innerHTML = '<option value="">Select Category</option>' + options;
        }
        if (modalSelect) {
          modalSelect.innerHTML = '<option value="">Select Category</option>' + options;
        }
      }
    } catch (e) {
      console.error('Failed to load categories:', e);
    }
  },

  async loadParties() {
    try {
      const res = await api.get('/expenses/parties');
      if (res && res.success) {
        this.parties = res.data || [];
      }
    } catch (e) {
      console.error('Failed to load parties:', e);
    }
  },

  async fetchExpenses() {
    const tbody = document.getElementById('expensesTbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: #64748B;">Searching expenses...</td></tr>';
    }

    try {
      const params = new URLSearchParams();
      const party = document.getElementById('filterPartyName')?.value.trim();
      const fromDate = document.getElementById('filterFromDate')?.value;
      const toDate = document.getElementById('filterToDate')?.value;
      const category = document.getElementById('filterExpenseCategory')?.value;
      const ref = document.getElementById('filterPartyRef')?.value.trim();

      if (party) params.append('party_name', party);
      if (fromDate) params.append('from_date', fromDate);
      if (toDate) params.append('to_date', toDate);
      if (category) params.append('category', category);
      if (ref) params.append('party_reference', ref);

      const res = await api.get(`/expenses?${params.toString()}`);
      if (res && res.success) {
        this.expenses = res.data || [];
        this.renderExpensesTable(this.expenses);
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2.5rem; color: #64748B;">No Expenses Found</td></tr>';
      }
    } catch (e) {
      console.error('Fetch expenses error:', e);
      if (tbody) tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2rem; color: #EF4444;">Failed to fetch expenses.</td></tr>';
    }
  },

  renderExpensesTable(list) {
    const tbody = document.getElementById('expensesTbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 2.5rem; color: #64748B; font-weight: 500;">No Expenses Found</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(e => `
      <tr>
        <td style="font-weight: 700; color: #0284C7; font-family: monospace;">${escapeHtml(e.voucher_no)}</td>
        <td style="white-space: nowrap;">${escapeHtml(e.date)}</td>
        <td>
          <div style="font-weight: 600; color: #1E293B;">${escapeHtml(e.party_name)}</div>
          <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(e.narration || '')}</div>
        </td>
        <td>
          <span style="background: #F1F5F9; border: 1px solid #CBD5E1; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">
            ${escapeHtml(e.category_name)}
          </span>
        </td>
        <td>
          <span style="font-weight: 500; font-size: 0.8rem; color: #334155;">
            ${escapeHtml(e.payment_mode)}
          </span>
        </td>
        <td style="font-family: monospace; font-size: 0.8rem; color: #475569;">${escapeHtml(e.party_reference)}</td>
        <td style="text-align: right; font-weight: 700; color: #DC2626; font-size: 0.95rem;">
          ₹${e.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </td>
        <td style="font-size: 0.8rem; color: #64748B;">${escapeHtml(e.paid_by)}</td>
        <td style="text-align: center;">
          <button class="btn-bec-blue" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;" onclick="expensesApp.viewVoucher('${e.voucher_no}')">
            Print
          </button>
        </td>
      </tr>
    `).join('');
  },

  clearFilters() {
    ['filterPartyName', 'filterFromDate', 'filterToDate', 'filterExpenseCategory', 'filterPartyRef'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    this.fetchExpenses();
  },

  openPartyPicker() {
    const modal = document.getElementById('partyPickerModal');
    const input = document.getElementById('pickerPartySearchInput');
    if (input) input.value = '';
    this.renderPartyPickerList(this.parties);
    if (modal) modal.classList.add('active');
  },

  closePartyPicker() {
    document.getElementById('partyPickerModal')?.classList.remove('active');
  },

  filterPartyPickerList() {
    const q = (document.getElementById('pickerPartySearchInput')?.value || '').toLowerCase().trim();
    if (!q) {
      this.renderPartyPickerList(this.parties);
      return;
    }
    const filtered = this.parties.filter(p => 
      p.party_name.toLowerCase().includes(q) ||
      (p.contact_person && p.contact_person.toLowerCase().includes(q))
    );
    this.renderPartyPickerList(filtered);
  },

  renderPartyPickerList(list) {
    const el = document.getElementById('pickerPartyList');
    if (!el) return;

    if (!list || list.length === 0) {
      el.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748B;">No matching parties found.</div>';
      return;
    }

    el.innerHTML = list.map(p => `
      <div 
        style="padding: 0.75rem 1rem; border-bottom: 1px solid #E2E8F0; cursor: pointer; display: flex; justify-content: space-between; align-items: center;"
        onmouseover="this.style.background='#F1F5F9'"
        onmouseout="this.style.background='transparent'"
        onclick="expensesApp.selectPartyFromPicker('${escapeHtml(p.party_name)}')"
      >
        <div>
          <div style="font-weight: 600; color: #1E293B;">${escapeHtml(p.party_name)}</div>
          <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(p.party_type)} &bull; ${escapeHtml(p.phone || p.address || '')}</div>
        </div>
        <button class="btn-bec-blue" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">Select</button>
      </div>
    `).join('');
  },

  selectPartyFromPicker(partyName) {
    const input = document.getElementById('filterPartyName');
    if (input) input.value = partyName;
    this.closePartyPicker();
    this.fetchExpenses();
  },

  openNewExpenseModal() {
    const modal = document.getElementById('newExpenseModal');
    const today = new Date().toISOString().slice(0, 10);
    const dateInput = document.getElementById('newExpenseDate');
    if (dateInput) dateInput.value = today;
    if (modal) modal.classList.add('active');
  },

  closeNewExpenseModal() {
    document.getElementById('newExpenseModal')?.classList.remove('active');
  },

  async submitNewExpense() {
    const date = document.getElementById('newExpenseDate')?.value;
    const categoryId = document.getElementById('newExpenseCategory')?.value;
    const partyName = document.getElementById('newExpensePartyName')?.value.trim();
    const amount = parseFloat(document.getElementById('newExpenseAmount')?.value || 0);
    const mode = document.getElementById('newExpenseMode')?.value || 'BANK_TRANSFER';
    const ref = document.getElementById('newExpenseRef')?.value.trim();
    const narration = document.getElementById('newExpenseNarration')?.value.trim();

    if (!date || !categoryId || !amount || amount <= 0 || !partyName) {
      ui.showToast('Please fill all mandatory fields (Date, Category, Party, Amount)', 'warning');
      return;
    }

    try {
      const res = await api.post('/expenses', {
        voucher_date: date,
        category_id: categoryId,
        party_name: partyName,
        amount,
        payment_mode: mode,
        party_reference: ref,
        narration
      });

      if (res && res.success) {
        ui.showToast('Expense voucher recorded successfully!', 'success');
        this.closeNewExpenseModal();
        await this.fetchExpenses();
      } else {
        ui.showToast(res.message || 'Failed to record expense', 'error');
      }
    } catch (e) {
      ui.showToast(e.message || 'Error recording expense', 'error');
    }
  },

  switchTab(tab) {
    this.activeTab = tab;
    const tabs = ['SEARCH', 'CATEGORY', 'PARTY', 'PROFIT_LOSS', 'DAY_BOOK'];
    tabs.forEach(t => {
      const panel = document.getElementById(`tabPanel_${t}`);
      const btn = document.getElementById(`tabBtn_${t}`);
      if (panel) panel.style.display = t === tab ? 'block' : 'none';
      if (btn) {
        if (t === tab) {
          btn.style.background = '#0B63C5';
          btn.style.color = '#ffffff';
          btn.style.borderColor = '#0B63C5';
        } else {
          btn.style.background = '#ffffff';
          btn.style.color = '#1E293B';
          btn.style.borderColor = '#CBD5E1';
        }
      }
    });

    if (tab === 'PROFIT_LOSS') this.loadProfitLoss();
    if (tab === 'DAY_BOOK') this.loadDayBook();
    if (tab === 'PARTY') this.renderPartyMasterTable();
    if (tab === 'CATEGORY') this.renderCategoryTable();
  },

  async loadProfitLoss() {
    const el = document.getElementById('profitLossContainer');
    if (el) el.innerHTML = '<div style="text-align: center; padding: 2rem;">Computing Profit &amp; Loss...</div>';

    try {
      const res = await api.get('/expenses/profit-loss');
      if (res && res.success) {
        const d = res.data;
        if (!el) return;

        el.innerHTML = `
          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 2rem; text-align: center;">
            <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 1.25rem;">
              <div style="font-size: 0.8rem; font-weight: 700; color: #1E40AF; text-transform: uppercase;">Total Institutional Inflow (Income)</div>
              <div style="font-size: 1.6rem; font-weight: 800; color: #1E3A8A; margin-top: 0.35rem;">
                ₹${d.total_income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 1.25rem;">
              <div style="font-size: 0.8rem; font-weight: 700; color: #991B1B; text-transform: uppercase;">Total Institutional Outflow (Expenses)</div>
              <div style="font-size: 1.6rem; font-weight: 800; color: #B91C1C; margin-top: 0.35rem;">
                ₹${d.total_expense.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div style="background: ${d.is_surplus ? '#ECFDF5' : '#FEF2F2'}; border: 1px solid ${d.is_surplus ? '#A7F3D0' : '#FECACA'}; border-radius: 8px; padding: 1.25rem;">
              <div style="font-size: 0.8rem; font-weight: 700; color: ${d.is_surplus ? '#065F46' : '#991B1B'}; text-transform: uppercase;">Net Operating ${d.is_surplus ? 'Surplus' : 'Deficit'}</div>
              <div style="font-size: 1.6rem; font-weight: 800; color: ${d.is_surplus ? '#047857' : '#DC2626'}; margin-top: 0.35rem;">
                ₹${Math.abs(d.net_surplus).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;">
            <!-- Incomes Table -->
            <div style="border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden;">
              <div style="background: #0B63C5; color: #ffffff; padding: 0.75rem 1rem; font-weight: 700; font-size: 0.95rem;">
                Revenue &amp; Fee Incomes
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                ${d.income_breakdown.map(i => `
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 0.65rem 1rem; color: #1E293B;">${escapeHtml(i.head)}</td>
                    <td style="padding: 0.65rem 1rem; text-align: right; font-weight: 600; color: #16A34A;">₹${i.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </table>
            </div>

            <!-- Expenses Table -->
            <div style="border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden;">
              <div style="background: #DC2626; color: #ffffff; padding: 0.75rem 1rem; font-weight: 700; font-size: 0.95rem;">
                Operational &amp; Maintenance Expenses
              </div>
              <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
                ${d.expense_breakdown.map(e => `
                  <tr style="border-bottom: 1px solid #E2E8F0;">
                    <td style="padding: 0.65rem 1rem; color: #1E293B;">${escapeHtml(e.category_name)}</td>
                    <td style="padding: 0.65rem 1rem; text-align: right; font-weight: 600; color: #DC2626;">₹${e.amount.toLocaleString('en-IN')}</td>
                  </tr>
                `).join('')}
              </table>
            </div>
          </div>
        `;
      }
    } catch (e) {
      console.error(e);
    }
  },

  async loadDayBook() {
    const el = document.getElementById('dayBookContainer');
    const dateInput = document.getElementById('dayBookDateInput');
    const date = dateInput?.value || new Date().toISOString().slice(0, 10);
    if (dateInput) dateInput.value = date;

    if (el) el.innerHTML = '<div style="text-align: center; padding: 2rem;">Loading Day Book records...</div>';

    try {
      const res = await api.get(`/expenses/daybook?date=${date}`);
      if (res && res.success) {
        const d = res.data;
        if (!el) return;

        el.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; background: #F8FAFC; padding: 0.75rem 1rem; border-radius: 6px; border: 1px solid #E2E8F0;">
            <div>
              <span style="font-size: 0.85rem; color: #64748B;">Day Book Statement for: </span>
              <strong style="color: #0B63C5;">${d.date}</strong>
            </div>
            <div style="display: flex; gap: 1.5rem; font-size: 0.9rem;">
              <div>Total Receipts: <strong style="color: #16A34A;">₹${d.total_receipts.toLocaleString('en-IN')}</strong></div>
              <div>Total Payments: <strong style="color: #DC2626;">₹${d.total_payments.toLocaleString('en-IN')}</strong></div>
              <div>Net Cash Flow: <strong style="color: #1E3A8A;">₹${d.net_cash_flow.toLocaleString('en-IN')}</strong></div>
            </div>
          </div>

          <div style="border: 1px solid #CBD5E1; border-radius: 6px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem;">
              <thead>
                <tr style="background: #0B63C5; color: #ffffff;">
                  <th style="padding: 0.65rem 1rem; text-align: left;">Time</th>
                  <th style="padding: 0.65rem 1rem; text-align: left;">Type</th>
                  <th style="padding: 0.65rem 1rem; text-align: left;">Account / Mode</th>
                  <th style="padding: 0.65rem 1rem; text-align: left;">Particulars</th>
                  <th style="padding: 0.65rem 1rem; text-align: right;">Debit (Payment)</th>
                  <th style="padding: 0.65rem 1rem; text-align: right;">Credit (Receipt)</th>
                </tr>
              </thead>
              <tbody>
                ${d.entries.length === 0 ? '<tr><td colspan="6" style="text-align: center; padding: 2rem; color: #64748B;">No journal entries for this date.</td></tr>' : 
                  d.entries.map(r => `
                    <tr style="border-bottom: 1px solid #E2E8F0;">
                      <td style="padding: 0.65rem 1rem; font-family: monospace;">${r.time}</td>
                      <td style="padding: 0.65rem 1rem;">
                        <span style="background: ${r.type === 'RECEIPT' ? '#DCFCE7' : '#FEE2E2'}; color: ${r.type === 'RECEIPT' ? '#166534' : '#991B1B'}; padding: 0.15rem 0.45rem; border-radius: 4px; font-weight: 700; font-size: 0.72rem;">
                          ${r.type}
                        </span>
                      </td>
                      <td style="padding: 0.65rem 1rem; font-weight: 500;">${r.account}</td>
                      <td style="padding: 0.65rem 1rem;">${escapeHtml(r.particulars)}</td>
                      <td style="padding: 0.65rem 1rem; text-align: right; color: #DC2626; font-weight: 600;">
                        ${r.debit > 0 ? '₹' + r.debit.toLocaleString('en-IN') : '-'}
                      </td>
                      <td style="padding: 0.65rem 1rem; text-align: right; color: #16A34A; font-weight: 600;">
                        ${r.credit > 0 ? '₹' + r.credit.toLocaleString('en-IN') : '-'}
                      </td>
                    </tr>
                  `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }
    } catch (e) {
      console.error(e);
    }
  },

  renderPartyMasterTable() {
    const tbody = document.getElementById('partiesTbody');
    if (!tbody) return;

    tbody.innerHTML = this.parties.map(p => `
      <tr>
        <td style="font-weight: 700; color: #0284C7;">${escapeHtml(p.party_name)}</td>
        <td><span style="background: #EFF6FF; color: #1E40AF; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">${escapeHtml(p.party_type)}</span></td>
        <td>${escapeHtml(p.contact_person || '-')}</td>
        <td>${escapeHtml(p.phone || '-')}</td>
        <td style="font-family: monospace; font-size: 0.75rem;">${escapeHtml(p.gstin || '-')}</td>
        <td style="font-size: 0.8rem; color: #475569;">${escapeHtml(p.address || '-')}</td>
      </tr>
    `).join('');
  },

  renderCategoryTable() {
    const tbody = document.getElementById('categoriesTbody');
    if (!tbody) return;

    tbody.innerHTML = this.categories.map(c => `
      <tr>
        <td style="font-weight: 700; color: #0B63C5; font-family: monospace;">${escapeHtml(c.code)}</td>
        <td style="font-weight: 600; color: #1E293B;">${escapeHtml(c.name)}</td>
        <td>
          <span style="background: ${c.type === 'EXPENSE' ? '#FEE2E2' : '#DCFCE7'}; color: ${c.type === 'EXPENSE' ? '#991B1B' : '#166534'}; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 700;">
            ${c.type}
          </span>
        </td>
        <td style="color: #64748B; font-size: 0.8rem;">${escapeHtml(c.description || '-')}</td>
      </tr>
    `).join('');
  },

  exportToExcel() {
    window.location.href = '/api/expenses/export';
  },

  exportToPDF() {
    window.print();
  },

  viewVoucher(voucherNo) {
    window.print();
  }
};

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  expensesApp.init();
});
