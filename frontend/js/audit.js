/**
 * Immutable Financial Audit Log Viewer
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const auditModule = {
  async init() {
    await this.loadAuditLogs();
  },

  async loadAuditLogs() {
    const moduleFilter = document.getElementById('auditFilterModule') ? document.getElementById('auditFilterModule').value : '';

    try {
      const res = await api.get('/admin/audit-logs', { module: moduleFilter, limit: 100 });
      const logs = res.data;

      const tbody = document.getElementById('auditLogsTbody');
      if (!tbody) return;

      if (!logs || logs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="empty-state"><div class="empty-state-title">No Audit Logs Recorded</div></td></tr>`;
        return;
      }

      tbody.innerHTML = logs.map(l => `
        <tr>
          <td><span style="font-size: 0.8rem; color: var(--text-muted);">${ui.formatDate(l.created_at)}</span></td>
          <td><span class="badge badge-muted">${escapeHtml(l.module)}</span></td>
          <td><strong>${escapeHtml(l.action)}</strong></td>
          <td>${escapeHtml(l.user_email || 'System')}<br><span style="font-size: 0.75rem; color: var(--text-muted);">${escapeHtml(l.role || '')}</span></td>
          <td><code>${escapeHtml(l.record_id || '-')}</code></td>
          <td><span style="font-size: 0.85rem;">${escapeHtml(l.reason || '-')}</span></td>
          <td><code style="font-size: 0.75rem;">${escapeHtml(l.ip_address || '127.0.0.1')}</code></td>
        </tr>
      `).join('');
    } catch (err) {
      ui.showToast('Failed to load audit logs.', 'error');
    }
  }
};

window.auditModule = auditModule;
