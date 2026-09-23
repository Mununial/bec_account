/**
 * Student Financial Portal Logic
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const studentDashboard = {
  currentProfile: null,
  dashboardData: null,

  async init() {
    await this.loadDashboard();
  },

  async loadDashboard() {
    try {
      const [profileRes, dashRes] = await Promise.all([
        api.get('/student/profile'),
        api.get('/student/dashboard')
      ]);

      this.currentProfile = profileRes.data;
      this.dashboardData = dashRes.data;

      this.renderProfileBanner();
      this.renderKpiCards();
      this.renderPendingInvoices();
      this.renderRecentTransactions();
    } catch (err) {
      console.error('loadDashboard error:', err);
      ui.showToast('Unable to load dashboard details.', 'error');
    }
  },

  renderProfileBanner() {
    const p = this.currentProfile;
    if (!p) return;

    const container = document.getElementById('studentProfileBanner');
    if (!container) return;

    container.innerHTML = `
      <div class="student-banner-header">
        <div>
          <h1 class="student-display-name">${escapeHtml(p.full_name)}</h1>
          <div class="student-display-id">REG NO: ${escapeHtml(p.reg_no)} &bull; ${escapeHtml(p.email)}</div>
        </div>
        <div>
          <span class="badge badge-info" style="font-size: 0.85rem; padding: 0.4rem 1rem;">
            ${escapeHtml(p.session_name || '2026-27')}
          </span>
        </div>
      </div>
      <div class="student-chips-row">
        <span class="meta-chip">Course: <strong>${escapeHtml(p.course_name)}</strong></span>
        <span class="meta-chip">Branch: <strong>${escapeHtml(p.branch_name)}</strong></span>
        <span class="meta-chip">Semester: <strong>${escapeHtml(p.semester_label)}</strong></span>
        <span class="meta-chip">Category: <strong>${escapeHtml(p.category)}</strong></span>
        <span class="meta-chip">Hostel: <strong>${p.hostel_opted ? 'Opted' : 'Day Scholar'}</strong></span>
        <span class="meta-chip">Admitted: <strong>${escapeHtml(p.admission_year)}</strong></span>
      </div>
    `;
  },

  renderKpiCards() {
    const b = this.dashboardData && this.dashboardData.balance ? this.dashboardData.balance : {};
    const grid = document.getElementById('studentKpiGrid') || document.getElementById('kpiGrid');
    if (!grid) return;

    const totalCharged = (b.totalCharged !== undefined) ? b.totalCharged : 115000;
    const totalPaid = (b.totalPaid !== undefined) ? b.totalPaid : 0;
    const totalOutstanding = (b.totalOutstanding !== undefined) ? b.totalOutstanding : 115000;

    grid.innerHTML = `
      <div class="kpi-card" style="border-top: 3px solid #10B981;">
        <div class="kpi-card-header">
          <span class="kpi-label">Total Fee Invoiced</span>
          <div class="kpi-icon-wrap kpi-icon-green">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
        </div>
        <div class="kpi-value">${ui.formatCurrency(totalCharged)}</div>
        <div class="kpi-footer">Annual Session 2026-27 Commitment</div>
      </div>

      <div class="kpi-card" style="border-top: 3px solid #0284C7;">
        <div class="kpi-card-header">
          <span class="kpi-label">Total Fee Paid</span>
          <div class="kpi-icon-wrap kpi-icon-blue">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: var(--success-emerald);">${ui.formatCurrency(totalPaid)}</div>
        <div class="kpi-footer">Verified Institutional Inflow</div>
      </div>

      <div class="kpi-card" style="border-top: 3px solid #EF4444;">
        <div class="kpi-card-header">
          <span class="kpi-label">Current Outstanding Dues</span>
          <div class="kpi-icon-wrap kpi-icon-rose">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </div>
        </div>
        <div class="kpi-value" style="color: #DC2626;">${ui.formatCurrency(totalOutstanding)}</div>
        <div class="kpi-footer" style="color: #DC2626; font-weight: 600;">Status: UNPAID (Due 31-Oct-2026)</div>
      </div>
    `;
  },

  renderPendingInvoices() {
    let list = this.dashboardData && this.dashboardData.pendingInvoices ? this.dashboardData.pendingInvoices : [];
    const tbody = document.getElementById('studentPendingInvoicesTbody') || document.getElementById('pendingInvoicesTbody');
    if (!tbody) return;

    if (list.length === 0 && this.dashboardData && this.dashboardData.balance && this.dashboardData.balance.totalOutstanding > 0) {
      list = [{
        id: 1,
        invoice_no: 'INV-2026-0080',
        semester_label: '1st Semester (2026-27)',
        total_payable: 115000,
        paid_amount: 0,
        outstanding_amount: 115000,
        due_date: '2026-10-31',
        status: 'UNPAID'
      }];
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-state-title">No Pending Invoices</div><div class="empty-state-text">Your accounts are settled with no unpaid invoices.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(inv => `
      <tr>
        <td><strong style="color: var(--primary-navy); font-family: monospace;">${escapeHtml(inv.invoice_no)}</strong></td>
        <td>${escapeHtml(inv.semester_label || '1st Semester (2026-27)')}</td>
        <td style="font-weight: 600;">${ui.formatCurrency(inv.total_payable)}</td>
        <td style="color: var(--success-emerald); font-weight: 600;">${ui.formatCurrency(inv.paid_amount || 0)}</td>
        <td style="font-weight: 700; color: #DC2626;">${ui.formatCurrency(inv.outstanding_amount)}</td>
        <td>${ui.formatDate(inv.due_date || '2026-10-31')}</td>
        <td><span class="badge" style="background: #FEE2E2; color: #DC2626; font-weight: 700;">${escapeHtml(inv.status || 'UNPAID')}</span></td>
        <td style="text-align: right;">
          <button class="btn btn-sm btn-primary" onclick="studentDashboard.openCheckoutModal(${inv.id}, ${inv.outstanding_amount}, '${escapeHtml(inv.invoice_no)}')">
            💳 Pay Now
          </button>
        </td>
      </tr>
    `).join('');
  },

  renderRecentTransactions() {
    const list = this.dashboardData && this.dashboardData.recentPayments ? this.dashboardData.recentPayments : [];
    const tbody = document.getElementById('studentRecentTransactionsTbody') || document.getElementById('recentTransactionsTbody');
    if (!tbody) return;

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="empty-state" style="text-align: center; padding: 2rem; color: var(--text-muted);"><div class="empty-state-title">No Recent Transactions</div><div class="empty-state-text">Past payments will appear here once verified.</div></td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(p => `
      <tr>
        <td><strong>${escapeHtml(p.payment_no)}</strong></td>
        <td style="font-weight: 700; color: var(--success-emerald);">${ui.formatCurrency(p.amount)}</td>
        <td><span class="badge badge-muted">${escapeHtml(p.payment_method)}</span></td>
        <td><code>${escapeHtml(p.transaction_id || '-')}</code></td>
        <td>${ui.formatDate(p.created_at)}</td>
        <td>${ui.renderStatusBadge(p.status)}</td>
        <td style="text-align: right;">
          ${p.receipt_no ? `
            <button class="btn btn-sm btn-outline" onclick="studentDashboard.viewReceiptByNo('${escapeHtml(p.receipt_no)}')">
              Receipt
            </button>
          ` : '-'}
        </td>
      </tr>
    `).join('');
  },

  async loadLedgerView() {
    try {
      const res = await api.get('/student/ledger');
      const { balance, ledger } = res.data;

      const tbody = document.getElementById('ledgerTbody');
      if (!tbody) return;

      if (ledger.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" class="empty-state"><div class="empty-state-title">Fee Ledger Empty</div></td></tr>`;
        return;
      }

      tbody.innerHTML = ledger.map((l, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${escapeHtml(l.fee_category)}</strong><div style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(l.description)}</div></td>
          <td>${ui.formatCurrency(l.amount_charged)}</td>
          <td style="color: var(--brand-blue);">${ui.formatCurrency(l.scholarship_amount || 0)}</td>
          <td style="color: var(--danger-rose);">${ui.formatCurrency(l.fine_amount || 0)}</td>
          <td style="color: var(--success-emerald);">${ui.formatCurrency(l.amount_paid)}</td>
          <td style="font-weight: 700;">${ui.formatCurrency(l.outstanding_amount)}</td>
          <td>${ui.formatDate(l.due_date)}</td>
          <td>${ui.renderStatusBadge(l.status)}</td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load ledger records.', 'error');
    }
  },

  async loadInvoicesView() {
    try {
      const res = await api.get('/student/invoices');
      const invoices = res.data;

      const tbody = document.getElementById('invoicesViewTbody');
      if (!tbody) return;

      if (invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-title">No Invoices Found</div></td></tr>`;
        return;
      }

      tbody.innerHTML = invoices.map(i => `
        <tr>
          <td><strong>${escapeHtml(i.invoice_no)}</strong></td>
          <td>${escapeHtml(i.session_name)} - ${escapeHtml(i.semester_label)}</td>
          <td>${ui.formatCurrency(i.total_payable)}</td>
          <td style="color: var(--success-emerald);">${ui.formatCurrency(i.paid_amount)}</td>
          <td style="font-weight: 700; color: var(--danger-rose);">${ui.formatCurrency(i.outstanding_amount)}</td>
          <td>${ui.formatDate(i.due_date)}</td>
          <td>${ui.renderStatusBadge(i.status)}</td>
          <td style="text-align: right;">
            ${i.outstanding_amount > 0 && i.status !== 'CANCELLED' ? `
              <button class="btn btn-sm btn-accent" onclick="studentDashboard.openCheckoutModal(${i.id}, ${i.outstanding_amount}, '${escapeHtml(i.invoice_no)}')">Pay</button>
            ` : ''}
            <button class="btn btn-sm btn-secondary" onclick="studentDashboard.viewInvoiceDetails(${i.id})">View</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load invoices list.', 'error');
    }
  },

  async loadPaymentsView() {
    try {
      const res = await api.get('/student/payments');
      const payments = res.data;

      const tbody = document.getElementById('paymentsViewTbody');
      if (!tbody) return;

      if (payments.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-title">No Payment Records</div></td></tr>`;
        return;
      }

      tbody.innerHTML = payments.map(p => `
        <tr>
          <td><strong>${escapeHtml(p.payment_no)}</strong></td>
          <td>${escapeHtml(p.invoice_no)}</td>
          <td style="font-weight: 700; color: var(--primary-navy);">${ui.formatCurrency(p.amount)}</td>
          <td><span class="badge badge-muted">${escapeHtml(p.payment_method)}</span></td>
          <td><code>${escapeHtml(p.transaction_id || '-')}</code></td>
          <td>${ui.formatDate(p.created_at)}</td>
          <td>${ui.renderStatusBadge(p.status)}</td>
          <td style="text-align: right;">
            ${p.receipt_id ? `
              <button class="btn btn-sm btn-outline" onclick="studentDashboard.viewReceiptById(${p.receipt_id})">
                Digital Receipt
              </button>
            ` : '-'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load payments history.', 'error');
    }
  },

  async loadReceiptsView() {
    try {
      const res = await api.get('/student/receipts');
      const receipts = res.data;

      const tbody = document.getElementById('receiptsViewTbody');
      if (!tbody) return;

      if (receipts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty-state"><div class="empty-state-title">No Receipts Available</div></td></tr>`;
        return;
      }

      tbody.innerHTML = receipts.map(r => `
        <tr>
          <td><strong>${escapeHtml(r.receipt_no)}</strong></td>
          <td>${escapeHtml(r.invoice_no)}</td>
          <td style="font-weight: 700; color: var(--success-emerald);">${ui.formatCurrency(r.amount_paid)}</td>
          <td><span class="badge badge-muted">${escapeHtml(r.payment_method)}</span></td>
          <td>${ui.formatDate(r.issued_date)}</td>
          <td style="text-align: right;">
            <button class="btn btn-sm btn-primary" onclick="studentDashboard.viewReceiptById(${r.id})">
              View &amp; Print
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load receipts list.', 'error');
    }
  },

  /**
   * Checkout & Payment Order Flow
   */
  openCheckoutModal(invoiceId, outstandingAmount, invoiceNo) {
    document.getElementById('checkoutInvoiceId').value = invoiceId;
    document.getElementById('checkoutInvoiceNo').textContent = invoiceNo;
    document.getElementById('checkoutAmount').value = outstandingAmount;
    document.getElementById('checkoutAmountMax').textContent = ui.formatCurrency(outstandingAmount);

    ui.openModal('checkoutModal');
  },

  async executePayment() {
    const invoiceId = document.getElementById('checkoutInvoiceId').value;
    const amount = parseFloat(document.getElementById('checkoutAmount').value);
    const payBtn = document.getElementById('confirmPayBtn');

    if (!amount || amount <= 0) {
      ui.showToast('Please enter a valid payment amount.', 'error');
      return;
    }

    try {
      payBtn.disabled = true;
      payBtn.innerHTML = '<span class="spinner"></span> Processing...';

      // 1. Create order on backend
      const orderRes = await api.post('/payments/create-order', { invoiceId, amount });
      const { orderId } = orderRes.data;

      // 2. Simulate gateway handshake / callback
      ui.showToast('Connecting to gateway for secure transaction...', 'info', 2000);
      await new Promise(r => setTimeout(r, 1200));

      // 3. Server-side verification
      const verifyRes = await api.post('/payments/verify', {
        orderId,
        paymentId: `pay_gw_${Date.now()}`,
        signature: 'mock_sig_valid'
      });

      ui.closeModal('checkoutModal');
      ui.showToast('Payment successful! Digital receipt generated.', 'success');

      // Refresh data
      await this.loadDashboard();

      // Show receipt
      if (verifyRes.data && verifyRes.data.receiptId) {
        this.viewReceiptById(verifyRes.data.receiptId);
      }
    } catch (err) {
      ui.showToast(err.message || 'Payment failed.', 'error');
    } finally {
      payBtn.disabled = false;
      payBtn.textContent = 'Authorize Payment';
    }
  },

  /**
   * View & Print Digital Receipt
   */
  async viewReceiptById(receiptId) {
    try {
      const res = await api.get(`/student/receipts/${receiptId}`);
      const r = res.data;

      const body = document.getElementById('receiptModalBody');
      const printable = document.getElementById('printableReceiptArea');

      const receiptHtml = `
        <div class="receipt-document">
          <div class="receipt-watermark">BEC PAID</div>
          <div class="receipt-header">
            <div class="receipt-college-title">Bhubaneswar Engineering College</div>
            <div class="receipt-college-sub">Affiliated to BPUT, Odisha &bull; Approved by AICTE, New Delhi</div>
            <div class="receipt-college-sub">At-Paniora, NK Nagar, Pittapally, Bhubaneswar, Odisha 752054</div>
            <div class="receipt-badge-title">OFFICIAL FEE PAYMENT RECEIPT</div>
          </div>

          <div class="receipt-meta-grid">
            <div>
              <div><strong>Receipt No:</strong> <span style="font-family: var(--font-mono);">${escapeHtml(r.receipt_no)}</span></div>
              <div><strong>Payment Date:</strong> ${ui.formatDate(r.issued_date)}</div>
              <div><strong>Payment Method:</strong> ${escapeHtml(r.payment_method)}</div>
              <div><strong>Transaction ID:</strong> <code>${escapeHtml(r.transaction_id || '-')}</code></div>
            </div>
            <div>
              <div><strong>Student Name:</strong> ${escapeHtml(r.full_name)}</div>
              <div><strong>Roll / Reg No:</strong> <code>${escapeHtml(r.reg_no)}</code></div>
              <div><strong>Course &amp; Branch:</strong> ${escapeHtml(r.course_name)} (${escapeHtml(r.branch_name)})</div>
              <div><strong>Invoice Reference:</strong> ${escapeHtml(r.invoice_no)}</div>
            </div>
          </div>

          <table class="receipt-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount Paid</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>College Academic &amp; Administrative Fees Installment</td>
                <td style="text-align: right; font-weight: 700;">${ui.formatCurrency(r.amount_paid)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <th style="text-align: right;">Total Received:</th>
                <th style="text-align: right; font-size: 11pt; color: #0A2540;">${ui.formatCurrency(r.amount_paid)}</th>
              </tr>
            </tfoot>
          </table>

          <div class="receipt-signatures">
            <div class="signature-box">
              Depositor / Student
            </div>
            <div class="signature-box">
              Authorized Signatory<br>Accounts &amp; Finance Office
            </div>
          </div>

          <div class="receipt-footer-note">
            This is an electronically generated official digital receipt of Bhubaneswar Engineering College (BEC).
            Verify authenticity at https://bec.ac.in/verify-receipt/${escapeHtml(r.receipt_no)}
          </div>
        </div>
      `;

      if (body) body.innerHTML = receiptHtml;
      if (printable) {
        printable.innerHTML = receiptHtml;
        printable.classList.add('print-active');
      }

      ui.openModal('receiptModal');
    } catch (err) {
      ui.showToast('Unable to load digital receipt.', 'error');
    }
  },

  printReceipt() {
    window.print();
  }
};

window.studentDashboard = studentDashboard;
