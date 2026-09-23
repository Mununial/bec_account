/**
 * Fee Structures & Fine Configuration Module
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const feesModule = {
  async init() {
    await this.loadStructures();
    await this.loadFineRules();
  },

  async loadStructures() {
    try {
      const res = await api.get('/fees/structures');
      const structures = res.data;

      const container = document.getElementById('feeStructuresList');
      if (!container) return;

      if (!structures || structures.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-state-title">No Fee Structures Configured</div></div>`;
        return;
      }

      container.innerHTML = structures.map(s => `
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="card-header">
            <div>
              <div class="card-title">${escapeHtml(s.title)}</div>
              <div class="card-subtitle">${escapeHtml(s.session_name)} &bull; ${escapeHtml(s.course_name)} (${escapeHtml(s.branch_name)}) &bull; ${escapeHtml(s.semester_label)}</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <span class="badge badge-success">${ui.formatCurrency(s.total_amount)}</span>
              <button class="btn btn-sm btn-accent" onclick="feesModule.openBulkAssignModal(${s.id}, '${escapeHtml(s.title)}')">
                Assign to Students
              </button>
            </div>
          </div>
          <div class="card-body">
            <div class="table-responsive">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th style="text-align: right;">Amount</th>
                    <th>Default Due Date</th>
                    <th>Grace Period</th>
                  </tr>
                </thead>
                <tbody>
                  ${(s.items || []).map(it => `
                    <tr>
                      <td><strong>${escapeHtml(it.category_name)}</strong></td>
                      <td style="text-align: right; font-weight: 600;">${ui.formatCurrency(it.amount)}</td>
                      <td>${ui.formatDate(it.due_date)}</td>
                      <td>${it.grace_period_days} days</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load fee structures.', 'error');
    }
  },

  async loadFineRules() {
    try {
      const res = await api.get('/fees/fine-rules');
      const rules = res.data;

      const tbody = document.getElementById('fineRulesTbody');
      if (!tbody) return;

      tbody.innerHTML = rules.map(r => `
        <tr>
          <td><strong>${escapeHtml(r.category_name)}</strong></td>
          <td>${r.grace_period_days} days</td>
          <td><span class="badge badge-muted">${escapeHtml(r.fine_type)}</span></td>
          <td><strong>${ui.formatCurrency(r.fine_value)}</strong> ${r.fine_type === 'DAILY' ? '/ day' : ''}</td>
          <td>${ui.formatCurrency(r.max_fine_limit)}</td>
          <td>${ui.renderStatusBadge(r.is_active ? 'ACTIVE' : 'INACTIVE')}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('loadFineRules error:', err);
    }
  },

  openBulkAssignModal(structureId, title) {
    document.getElementById('bulkAssignStructureId').value = structureId;
    document.getElementById('bulkAssignTitleDisplay').textContent = title;
    document.getElementById('bulkAssignDueDate').value = '2026-10-31';
    ui.openModal('bulkAssignModal');
  },

  async submitBulkAssign() {
    const structureId = document.getElementById('bulkAssignStructureId').value;
    const dueDate = document.getElementById('bulkAssignDueDate').value;
    const btn = document.getElementById('confirmBulkAssignBtn');

    if (!dueDate) {
      ui.showToast('Please select a payment due date.', 'error');
      return;
    }

    try {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> Generating Invoices...';

      const res = await api.post(`/fees/structures/${structureId}/assign-bulk`, { dueDate });
      ui.closeModal('bulkAssignModal');
      ui.showToast(res.message, 'success');
    } catch (err) {
      ui.showToast(err.message || 'Bulk assignment failed.', 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Generate & Assign';
    }
  }
};

window.feesModule = feesModule;
