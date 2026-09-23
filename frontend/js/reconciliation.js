/**
 * Payment Reconciliation Controller (Gateway vs Ledger)
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const reconciliationModule = {
  async init() {
    await this.loadReconciliation();
  },

  async loadReconciliation() {
    try {
      const res = await api.get('/admin/reconciliation');
      const { summary, records } = res.data;

      const sysTotEl = document.getElementById('reconSystemTotal');
      const gwTotEl = document.getElementById('reconGatewayTotal');
      const matchedEl = document.getElementById('reconMatchedCount');
      const tbody = document.getElementById('reconciliationTbody');

      if (sysTotEl) sysTotEl.textContent = ui.formatCurrency(summary.system_total);
      if (gwTotEl) gwTotEl.textContent = ui.formatCurrency(summary.gateway_total);
      if (matchedEl) matchedEl.textContent = summary.matched_count;
      if (!tbody) return;

      if (!records || records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-title">No Discrepancies Found</div><div class="empty-state-text">All transactions are reconciled with gateway and banking feeds.</div></td></tr>`;
        return;
      }

      tbody.innerHTML = records.map(r => `
        <tr>
          <td><code>${escapeHtml(r.transaction_ref)}</code></td>
          <td>${ui.formatCurrency(r.system_amount)}</td>
          <td>${ui.formatCurrency(r.gateway_amount)}</td>
          <td style="font-weight: 700; color: ${r.difference != 0 ? 'var(--danger-rose)' : 'var(--success-emerald)'};">
            ${ui.formatCurrency(r.difference)}
          </td>
          <td>${ui.renderStatusBadge(r.status)}</td>
          <td><span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(r.remarks || '-')}</span></td>
          <td style="text-align: right;">
            ${r.status !== 'RESOLVED' && r.status !== 'MATCHED' ? `
              <button class="btn btn-sm btn-outline" onclick="reconciliationModule.openResolveModal(${r.id}, '${escapeHtml(r.transaction_ref)}')">
                Resolve
              </button>
            ` : '<span style="color: var(--success-emerald);">&#10003; Reconciled</span>'}
          </td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load reconciliation feeds.', 'error');
    }
  },

  openResolveModal(recordId, ref) {
    document.getElementById('resolveReconId').value = recordId;
    document.getElementById('resolveReconRefDisplay').textContent = ref;
    document.getElementById('resolveReconRemarks').value = '';
    ui.openModal('resolveReconModal');
  },

  async confirmResolve() {
    const recordId = document.getElementById('resolveReconId').value;
    const status = document.getElementById('resolveReconStatus').value;
    const remarks = document.getElementById('resolveReconRemarks').value;

    try {
      await api.post(`/admin/reconciliation/${recordId}/resolve`, { status, remarks });
      ui.closeModal('resolveReconModal');
      ui.showToast('Reconciliation record updated.', 'success');
      await this.loadReconciliation();
    } catch (err) {
      ui.showToast(err.message || 'Failed to update reconciliation.', 'error');
    }
  }
};

window.reconciliationModule = reconciliationModule;
