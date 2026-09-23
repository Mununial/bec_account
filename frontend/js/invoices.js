/**
 * Invoice Management Controller (Staff & Admin)
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const invoicesModule = {
  async init() {
    await this.loadInvoices();
  },

  async loadInvoices(page = 1) {
    const status = document.getElementById('invoiceFilterStatus') ? document.getElementById('invoiceFilterStatus').value : '';
    const search = document.getElementById('invoiceSearchInput') ? document.getElementById('invoiceSearchInput').value : '';

    try {
      const res = await api.get('/invoices', { status, search, page, limit: 25 });
      const { invoices, pagination } = res.data;

      const tbody = document.getElementById('invoicesTableTbody');
      if (!tbody) return;

      if (!invoices || invoices.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="empty-state"><div class="empty-state-title">No Invoices Found</div></td></tr>`;
        return;
      }

      tbody.innerHTML = invoices.map(i => `
        <tr>
          <td><strong>${escapeHtml(i.invoice_no)}</strong></td>
          <td>
            <a href="/student-fee.html?studentId=${i.student_id}" title="Click to view student ledger" style="font-weight: 700; color: var(--primary-navy); text-decoration: none;">
              ${escapeHtml(i.full_name)} &rarr;
            </a>
            <br><code style="font-size: 0.75rem;">${escapeHtml(i.reg_no)} (${escapeHtml(i.branch_code)})</code>
          </td>
          <td>${escapeHtml(i.session_name)} - ${escapeHtml(i.semester_label)}</td>
          <td>${ui.formatCurrency(i.total_payable)}</td>
          <td style="color: var(--success-emerald); font-weight: 600;">${ui.formatCurrency(i.paid_amount)}</td>
          <td style="font-weight: 800; color: ${i.outstanding_amount > 0 ? 'var(--danger-rose)' : 'inherit'};">${ui.formatCurrency(i.outstanding_amount)}</td>
          <td>${ui.formatDate(i.due_date)}</td>
          <td>${ui.renderStatusBadge(i.status)}</td>
          <td style="text-align: right; white-space: nowrap;">
            ${i.outstanding_amount > 0 && i.status !== 'CANCELLED' ? `
              <a href="/receipt-desk.html?studentId=${i.student_id}" class="btn btn-sm btn-primary" style="text-decoration: none; font-weight: 600; padding: 0.25rem 0.6rem;" title="Issue receipt for this invoice">
                Collect Fee
              </a>
            ` : ''}
            <button class="btn btn-sm btn-outline" style="padding: 0.25rem 0.6rem;" onclick="invoicesModule.viewInvoice(${i.id})">Details</button>
            ${i.status !== 'CANCELLED' && i.paid_amount == 0 ? `
              <button class="btn btn-sm btn-danger" style="padding: 0.25rem 0.6rem;" onclick="invoicesModule.openCancelModal(${i.id}, '${escapeHtml(i.invoice_no)}')">Cancel</button>
            ` : ''}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load invoices register.', 'error');
    }
  },

  async viewInvoice(invoiceId) {
    try {
      const res = await api.get(`/invoices/${invoiceId}`);
      const inv = res.data;

      const modalBody = document.getElementById('invoiceDetailsModalBody');
      if (!modalBody) return;

      modalBody.innerHTML = `
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--border-subtle); padding-bottom: 1rem; margin-bottom: 1rem;">
          <div>
            <h3 style="font-size: 1.2rem; color: var(--primary-navy);">${escapeHtml(inv.invoice_no)}</h3>
            <div style="font-size: 0.85rem; color: var(--text-muted);">${escapeHtml(inv.full_name)} &bull; ${escapeHtml(inv.reg_no)} (${escapeHtml(inv.branch_name)})</div>
          </div>
          <div>${ui.renderStatusBadge(inv.status)}</div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; font-size: 0.9rem;">
          <div><strong>Total Payable:</strong> ${ui.formatCurrency(inv.total_payable)}</div>
          <div><strong>Due Date:</strong> ${ui.formatDate(inv.due_date)}</div>
          <div><strong>Amount Paid:</strong> <span style="color: var(--success-emerald); font-weight: 700;">${ui.formatCurrency(inv.paid_amount)}</span></div>
          <div><strong>Balance Due:</strong> <span style="color: var(--danger-rose); font-weight: 700;">${ui.formatCurrency(inv.outstanding_amount)}</span></div>
        </div>

        <h4 style="font-size: 0.95rem; margin-bottom: 0.5rem;">Billed Fee Components</h4>
        <div class="table-responsive" style="margin-bottom: 1.5rem;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Component</th>
                <th style="text-align: right;">Amount</th>
                <th style="text-align: right;">Paid</th>
              </tr>
            </thead>
            <tbody>
              ${(inv.items || []).map(it => `
                <tr>
                  <td>${escapeHtml(it.category_name || it.description)}</td>
                  <td style="text-align: right;">${ui.formatCurrency(it.amount)}</td>
                  <td style="text-align: right; color: var(--success-emerald);">${ui.formatCurrency(it.paid_amount)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      ui.openModal('invoiceDetailsModal');
    } catch (err) {
      ui.showToast('Unable to load invoice details.', 'error');
    }
  },

  openCancelModal(invoiceId, invoiceNo) {
    document.getElementById('cancelInvoiceId').value = invoiceId;
    document.getElementById('cancelInvoiceNoDisplay').textContent = invoiceNo;
    document.getElementById('cancelInvoiceReason').value = '';
    ui.openModal('cancelInvoiceModal');
  },

  async confirmCancelInvoice() {
    const invoiceId = document.getElementById('cancelInvoiceId').value;
    const reason = document.getElementById('cancelInvoiceReason').value.trim();

    if (!reason) {
      ui.showToast('Please provide an audit justification reason to cancel.', 'error');
      return;
    }

    try {
      await api.post(`/invoices/${invoiceId}/cancel`, { reason });
      ui.closeModal('cancelInvoiceModal');
      ui.showToast('Invoice has been cancelled successfully.', 'success');
      await this.loadInvoices();
    } catch (err) {
      ui.showToast(err.message || 'Failed to cancel invoice.', 'error');
    }
  }
};

window.invoicesModule = invoicesModule;
