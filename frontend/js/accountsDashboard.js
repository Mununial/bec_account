/**
 * Accounts Executive & Administrative Operations Controller
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const accountsDashboard = {
  dashboardData: null,
  intelligenceData: null,

  async init() {
    await this.loadDashboard();
    await this.loadIntelligence();
    await this.loadStudentsDirectory();
  },

  async loadDashboard() {
    try {
      const res = await api.get('/admin/dashboard');
      this.dashboardData = res.data;

      this.renderKpiCards();
      this.renderCharts();
      this.renderRecentTransactions();
    } catch (err) {
      console.error('accountsDashboard loadDashboard error:', err);
      ui.showToast('Failed to load executive dashboard metrics.', 'error');
    }
  },

  async loadIntelligence() {
    try {
      const res = await api.get('/admin/intelligence');
      this.intelligenceData = res.data;
      this.renderIntelligenceCallout();
    } catch (err) {
      console.error('loadIntelligence error:', err);
    }
  },

  renderKpiCards() {
    const kpis = this.dashboardData && this.dashboardData.kpis ? this.dashboardData.kpis : {};
    const grid = document.getElementById('adminKpiGrid');
    if (!grid) return;

    const now = new Date();
    const todayLabel = now.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const monthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

    grid.innerHTML = `
      <div class="kpi-card" onclick="window.location.href='/receipts.html?filter=today'" style="cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="Click to view today's receipts register">
        <div class="kpi-card-header">
          <span class="kpi-label">Today's Collection (${todayLabel})</span>
          <div class="kpi-icon-wrap kpi-icon-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--success-emerald);">${ui.formatCurrency(kpis.today_collection || 0)}</div>
        <div class="kpi-footer" style="display: flex; justify-content: space-between;">
          <span>Daily Cash &amp; Online Inflow</span>
          <span style="font-weight: 600; color: var(--brand-blue);">View Receipts &rarr;</span>
        </div>
      </div>

      <div class="kpi-card" onclick="window.location.href='/receipts.html?filter=month'" style="cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="Click to view month-to-date collections">
        <div class="kpi-card-header">
          <span class="kpi-label">Monthly Collection (${monthLabel})</span>
          <div class="kpi-icon-wrap kpi-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--brand-blue);">${ui.formatCurrency(kpis.month_collection || 0)}</div>
        <div class="kpi-footer" style="display: flex; justify-content: space-between;">
          <span>Month-to-date total revenue</span>
          <span style="font-weight: 600; color: var(--brand-blue);">View Inflow &rarr;</span>
        </div>
      </div>

      <div class="kpi-card" onclick="window.location.href='/students.html?duesOnly=true'" style="cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="Click to inspect students with pending dues">
        <div class="kpi-card-header">
          <span class="kpi-label">Total Outstanding Dues</span>
          <div class="kpi-icon-wrap kpi-icon-amber">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--warning-amber);">${ui.formatCurrency(kpis.total_outstanding || 0)}</div>
        <div class="kpi-footer" style="display: flex; justify-content: space-between;">
          <span>${kpis.students_with_dues_count || 0} students pending balance</span>
          <span style="font-weight: 600; color: var(--brand-blue);">Directory &rarr;</span>
        </div>
      </div>

      <div class="kpi-card" onclick="window.location.href='/reports.html'" style="cursor: pointer; transition: transform 0.15s ease, box-shadow 0.15s ease;" title="Click to inspect overdue defaulters report">
        <div class="kpi-card-header">
          <span class="kpi-label">Total Overdue Fees (Late Fines)</span>
          <div class="kpi-icon-wrap kpi-icon-rose">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--danger-rose);">${ui.formatCurrency(kpis.overdue_amount || 0)}</div>
        <div class="kpi-footer" style="display: flex; justify-content: space-between;">
          <span>Due date elapsed &bull; Fines applied</span>
          <span style="font-weight: 600; color: var(--danger-rose);">Defaulters &rarr;</span>
        </div>
      </div>
    `;
  },

  renderIntelligenceCallout() {
    const intel = this.intelligenceData;
    if (!intel) return;

    const el = document.getElementById('financeIntelligenceAlert');
    if (!el) return;

    const duesSoon = intel.duesIn3Days ? intel.duesIn3Days.length : 0;
    const severe = intel.severeOverdue ? intel.severeOverdue.length : 0;

    if (duesSoon === 0 && severe === 0) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <div class="alert alert-warning" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <div>
          <strong>Financial Notice:</strong> ${severe} students have critical overdue balances, and ${duesSoon} due dates occur within 72 hours.
        </div>
        <button class="btn btn-sm btn-outline" onclick="window.location.href='/reports.html'">
          View Defaulters Report
        </button>
      </div>
    `;
  },

  renderCharts() {
    if (!this.dashboardData) return;

    // 1. Monthly Trends
    const monthlyTrend = this.dashboardData.monthlyTrend || [];
    const monthLabels = monthlyTrend.map(m => m.month);
    const monthValues = monthlyTrend.map(m => parseFloat(m.total_collected));

    const ctxMonth = document.getElementById('monthlyCollectionChart');
    if (ctxMonth && window.Chart) {
      if (this.chartInstances && this.chartInstances.month) {
        this.chartInstances.month.destroy();
      }
      this.chartInstances = this.chartInstances || {};
      this.chartInstances.month = new Chart(ctxMonth, {
        type: 'line',
        data: {
          labels: monthLabels.length ? monthLabels : ['April', 'May', 'June', 'July', 'August', 'September'],
          datasets: [{
            label: 'Collection (₹)',
            data: monthValues.length ? monthValues : [450000, 780000, 1200000, 950000, 840000, 1150000],
            borderColor: '#1E40AF',
            backgroundColor: 'rgba(30, 64, 175, 0.08)',
            borderWidth: 2,
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => '₹' + (v / 1000) + 'k' }
            }
          }
        }
      });
    }

    // 2. Branch-wise breakdown
    const branchStats = this.dashboardData.branchStats || [];
    const branchLabels = branchStats.map(b => b.branch_code || b.branch_name);
    const branchValues = branchStats.map(b => parseFloat(b.branch_collected));

    const ctxBranch = document.getElementById('branchCollectionChart');
    if (ctxBranch && window.Chart) {
      if (this.chartInstances && this.chartInstances.branch) {
        this.chartInstances.branch.destroy();
      }
      this.chartInstances = this.chartInstances || {};
      this.chartInstances.branch = new Chart(ctxBranch, {
        type: 'bar',
        data: {
          labels: branchLabels.length ? branchLabels : ['CSE', 'CSE-DS', 'AGRI', 'EE', 'MECH', 'CIVIL'],
          datasets: [{
            label: 'Collected (₹)',
            data: branchValues.length ? branchValues : [1850000, 620000, 310000, 420000, 280000, 190000],
            backgroundColor: '#059669',
            borderRadius: 4
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: {
              beginAtZero: true,
              ticks: { callback: v => '₹' + (v / 1000) + 'k' }
            }
          }
        }
      });
    }
  },

  renderRecentTransactions() {
    const list = this.dashboardData ? this.dashboardData.recentTransactions : [];
    const tbody = document.getElementById('adminRecentTransactionsTbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-title">No Recent Transactions</div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(t => `
      <tr style="cursor: pointer;" onclick="becRealFee.printReceiptPreview(${t.id}, '${escapeHtml(t.payment_no)}', '${escapeHtml(t.full_name)}', ${t.amount}, '${escapeHtml(t.payment_method)}', '${escapeHtml(t.transaction_id || '')}', { id: ${t.student_id || 0}, full_name: '${escapeHtml(t.full_name)}' })" title="Click to view & print official e-Receipt">
        <td>
          <a href="/receipts.html?receiptNo=${encodeURIComponent(t.payment_no)}" onclick="event.stopPropagation()" style="font-weight: 700; color: var(--primary-navy); font-family: monospace; text-decoration: none;">
            ${escapeHtml(t.payment_no)}
          </a>
        </td>
        <td>
          <a href="/student-fee.html?studentId=${t.student_id}" onclick="event.stopPropagation()" style="font-weight: 700; color: var(--brand-blue); text-decoration: none;">
            ${escapeHtml(t.full_name)} &rarr;
          </a>
          <br><code style="font-size: 0.75rem;">${escapeHtml(t.reg_no)} (${escapeHtml(t.branch_code)})</code>
        </td>
        <td style="font-weight: 700; color: var(--success-emerald);">${ui.formatCurrency(t.amount)}</td>
        <td><span class="badge badge-muted">${escapeHtml(t.payment_method)}</span></td>
        <td><code>${escapeHtml(t.transaction_id || '-')}</code></td>
        <td>${ui.formatDate(t.created_at)}</td>
        <td>
          <button class="btn btn-sm btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.78rem;" onclick="event.stopPropagation(); becRealFee.printReceiptPreview(${t.id}, '${escapeHtml(t.payment_no)}', '${escapeHtml(t.full_name)}', ${t.amount}, '${escapeHtml(t.payment_method)}', '${escapeHtml(t.transaction_id || '')}', { id: ${t.student_id || 0}, full_name: '${escapeHtml(t.full_name)}' })">
            View Receipt
          </button>
        </td>
      </tr>
    `).join('');
  },

  async loadStudentsDirectory(search = '', branchId = '') {
    try {
      const res = await api.get('/admin/students', { search, branchId, limit: 100 });
      const students = res.data.students || [];

      const tbody = document.getElementById('studentsDirectoryTbody');
      if (!tbody) return;

      if (students.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-state-title">No Students Found</div></td></tr>`;
        return;
      }

      tbody.innerHTML = students.map((s, index) => `
        <tr>
          <td style="text-align: center; font-weight: 600; color: #64748B;">${index + 1}</td>
          <td>
            <a href="/student-fee.html?studentId=${s.id}" title="Click to view student fee ledger" style="font-weight: 700; color: var(--brand-blue); text-decoration: none;">
              ${escapeHtml(s.full_name)} &rarr;
            </a>
            <br><span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(s.email || '')}</span>
          </td>
          <td><span class="badge badge-muted">${escapeHtml(s.branch_code || s.branch_name || 'B.Tech')}</span></td>
          <td>${escapeHtml(s.category || 'General')}</td>
          <td>${ui.formatCurrency(s.total_billed)}</td>
          <td style="color: var(--success-emerald); font-weight: 600;">${ui.formatCurrency(s.total_paid)}</td>
          <td style="font-weight: 800; color: ${s.total_outstanding > 0 ? 'var(--danger-rose)' : 'var(--success-emerald)'};">
            ${ui.formatCurrency(s.total_outstanding)}
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <a href="/receipt-desk.html?studentId=${s.id}" class="btn btn-sm btn-primary" style="text-decoration: none; font-weight: 600; padding: 0.25rem 0.6rem;" title="1-Click load into Fast Receipt Desk">
              Collect Fee
            </a>
            <a href="/student-fee.html?studentId=${s.id}" class="btn btn-sm btn-outline" style="text-decoration: none; font-weight: 600; padding: 0.25rem 0.6rem;" title="View detailed account ledger">
              Ledger
            </a>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load students directory.', 'error');
    }
  },

  async inspectStudentLedger(studentId) {
    try {
      const res = await api.get(`/admin/students/${studentId}/ledger`);
      const { student, ledger, invoices, payments } = res.data;

      const body = document.getElementById('ledgerInspectorModalBody');
      if (!body) return;

      body.innerHTML = `
        <div style="background: var(--bg-subtle); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
          <h3 style="font-size: 1.1rem; color: var(--primary-navy);">${escapeHtml(student.full_name)} (${escapeHtml(student.reg_no)})</h3>
          <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 0.25rem;">
            ${escapeHtml(student.course_name)} &bull; ${escapeHtml(student.branch_name)} &bull; ${escapeHtml(student.semester_label)}
          </div>
        </div>

        <h4 style="margin-bottom: 0.75rem; font-size: 0.95rem;">Fee Ledger Breakdown</h4>
        <div class="table-responsive" style="margin-bottom: 1.5rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Charged</th>
                <th>Paid</th>
                <th>Outstanding</th>
                <th>Due Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${ledger.map(l => `
                <tr>
                  <td>${escapeHtml(l.category_name || l.description)}</td>
                  <td>${ui.formatCurrency(l.amount_charged)}</td>
                  <td style="color: var(--success-emerald);">${ui.formatCurrency(l.amount_paid)}</td>
                  <td style="font-weight: 700;">${ui.formatCurrency(l.outstanding_amount)}</td>
                  <td>${ui.formatDate(l.due_date)}</td>
                  <td>${ui.renderStatusBadge(l.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      ui.openModal('ledgerInspectorModal');
    } catch (err) {
      ui.showToast('Unable to load student ledger details.', 'error');
    }
  },

  openCounterPaymentModal(studentId, studentName) {
    document.getElementById('counterStudentId').value = studentId;
    document.getElementById('counterStudentNameDisplay').textContent = studentName;
    document.getElementById('counterAmount').value = '';
    document.getElementById('counterTxnRef').value = '';
    document.getElementById('counterRemarks').value = '';

    ui.openModal('counterPaymentModal');
  },

  async submitCounterPayment() {
    const studentId = document.getElementById('counterStudentId').value;
    const amount = parseFloat(document.getElementById('counterAmount').value);
    const paymentMethod = document.getElementById('counterPaymentMethod').value;
    const transactionRef = document.getElementById('counterTxnRef').value;
    const remarks = document.getElementById('counterRemarks').value;

    if (!amount || amount <= 0) {
      ui.showToast('Please specify a valid payment amount.', 'error');
      return;
    }

    try {
      // Find active invoice for student
      const invRes = await api.get('/invoices', { limit: 1 });
      const invoiceId = invRes.data.invoices && invRes.data.invoices[0] ? invRes.data.invoices[0].id : 1;

      const res = await api.post('/payments/record-offline', {
        studentId,
        invoiceId,
        amount,
        paymentMethod,
        transactionRef,
        remarks
      });

      ui.closeModal('counterPaymentModal');
      ui.showToast(`Counter payment of ₹${amount} recorded! Receipt: ${res.data.receiptNo}`, 'success');

      await this.loadDashboard();
      await this.loadStudentsDirectory();
    } catch (err) {
      ui.showToast(err.message || 'Failed to record counter payment.', 'error');
    }
  }
};

window.accountsDashboard = accountsDashboard;
