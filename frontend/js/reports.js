/**
 * Financial Reports & Compliance Analytics Module
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const reportsModule = {
  async init() {
    await this.loadCollections();
    await this.loadDefaulters();
  },

  async loadCollections() {
    const startDate = document.getElementById('reportStartDate') ? document.getElementById('reportStartDate').value : '';
    const endDate = document.getElementById('reportEndDate') ? document.getElementById('reportEndDate').value : '';

    try {
      const res = await api.get('/reports/collections', { startDate, endDate });
      const { totalCollected, count, collections } = res.data;

      const totalEl = document.getElementById('reportTotalCollected');
      const countEl = document.getElementById('reportTotalTransactions');
      const tbody = document.getElementById('reportCollectionsTbody');

      if (totalEl) totalEl.textContent = ui.formatCurrency(totalCollected);
      if (countEl) countEl.textContent = count;
      if (!tbody) return;

      if (!collections || collections.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-title">No Collections in Period</div></td></tr>`;
        return;
      }

      tbody.innerHTML = collections.map(c => `
        <tr>
          <td>
            <a href="/receipts.html?receiptNo=${encodeURIComponent(c.receipt_no || '')}" title="View receipt in register" style="font-weight: 700; color: var(--primary-navy); text-decoration: none;">
              ${escapeHtml(c.receipt_no || '-')}
            </a>
          </td>
          <td>
            <a href="/student-fee.html?studentId=${c.student_id}" title="View student ledger" style="font-weight: 600; color: var(--brand-blue); text-decoration: none;">
              ${escapeHtml(c.full_name)}
            </a>
            (<code>${escapeHtml(c.reg_no)}</code>)
          </td>
          <td><span class="badge badge-muted">${escapeHtml(c.branch_code)}</span></td>
          <td style="font-weight: 700; color: var(--success-emerald);">${ui.formatCurrency(c.amount)}</td>
          <td>${escapeHtml(c.payment_method)}</td>
          <td><code>${escapeHtml(c.transaction_id || '-')}</code></td>
          <td>${ui.formatDate(c.created_at)}</td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load collections report.', 'error');
    }
  },

  async loadDefaulters() {
    try {
      const res = await api.get('/reports/defaulters');
      const { totalOverdue, count, defaulters } = res.data;

      const overdueEl = document.getElementById('defaultersTotalOverdue');
      const countEl = document.getElementById('defaultersCount');
      const tbody = document.getElementById('defaultersTbody');

      if (overdueEl) overdueEl.textContent = ui.formatCurrency(totalOverdue);
      if (countEl) countEl.textContent = count;
      if (!tbody) return;

      if (!defaulters || defaulters.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-state-title">No Overdue Defaulters</div><div class="empty-state-text">All student accounts are currently within grace terms.</div></td></tr>`;
        return;
      }

      tbody.innerHTML = defaulters.map(d => `
        <tr>
          <td><code>${escapeHtml(d.reg_no)}</code></td>
          <td>
            <a href="/student-fee.html?studentId=${d.id || d.student_id}" title="View student ledger" style="font-weight: 700; color: var(--primary-navy); text-decoration: none;">
              ${escapeHtml(d.full_name)} &rarr;
            </a>
            <br><span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(d.phone || 'Phone N/A')}</span>
          </td>
          <td><span class="badge badge-muted">${escapeHtml(d.branch_code)}</span></td>
          <td>${escapeHtml(d.semester_label)}</td>
          <td style="font-weight: 700; color: var(--danger-rose);">${ui.formatCurrency(d.outstanding_amount)}</td>
          <td>${ui.formatDate(d.due_date)}</td>
          <td><span class="badge badge-danger">${d.days_overdue} days</span></td>
          <td style="text-align: right; white-space: nowrap;">
            <a href="/receipt-desk.html?studentId=${d.id || d.student_id}" class="btn btn-sm btn-primary" style="text-decoration: none; font-weight: 600; padding: 0.25rem 0.65rem;" title="1-Click load into Fast Receipt Desk">
              Collect Dues
            </a>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('loadDefaulters error:', err);
    }
  },

  exportCsv(type) {
    const token = api.getToken();
    const url = `/api/reports/export-csv?type=${type}&token=${token}`;
    window.location.href = url;
  }
};

window.reportsModule = reportsModule;
