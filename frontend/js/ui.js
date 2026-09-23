/**
 * UI Utilities, Modal Manager, Toast Notifications, & Native Canvas Charts
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const ui = {
  /**
   * Display Toast Notification
   * @param {string} message
   * @param {'success'|'error'|'warning'|'info'} type
   * @param {number} duration
   */
  showToast(message, type = 'info', duration = 4000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>';
    } else {
      iconSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066CC" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
    }

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-message">${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  },

  /**
   * Modal Controls
   */
  openModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const el = document.getElementById(modalId);
    if (el) {
      el.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /**
   * Formatting Helpers
   */
  formatCurrency(amount) {
    const val = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  },

  formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  },

  renderStatusBadge(status) {
    if (!status) return '<span class="badge badge-muted">-</span>';
    const s = String(status).toUpperCase();

    if (['PAID', 'SUCCESS', 'ACTIVE', 'APPROVED', 'MATCHED'].includes(s)) {
      return `<span class="badge badge-success">${s.replace('_', ' ')}</span>`;
    }
    if (['PENDING', 'PARTIALLY_PAID', 'ISSUED', 'REQUESTED', 'INVESTIGATION'].includes(s)) {
      return `<span class="badge badge-warning">${s.replace('_', ' ')}</span>`;
    }
    if (['OVERDUE', 'FAILED', 'CANCELLED', 'REJECTED', 'UNMATCHED'].includes(s)) {
      return `<span class="badge badge-danger">${s.replace('_', ' ')}</span>`;
    }
    return `<span class="badge badge-info">${s.replace('_', ' ')}</span>`;
  },

  /**
   * Native HTML5 Canvas Bar Chart
   * Zero external dependencies, sharp retina rendering
   */
  drawBarChart(canvasId, labels, dataValues, color = '#0066CC') {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    ctx.clearRect(0, 0, w, h);

    if (!dataValues || dataValues.length === 0) {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', w / 2, h / 2);
      return;
    }

    const maxVal = Math.max(...dataValues, 1000) * 1.15;
    const paddingBottom = 35;
    const paddingTop = 25;
    const paddingLeft = 60;
    const chartW = w - paddingLeft - 20;
    const chartH = h - paddingTop - paddingBottom;
    const barWidth = Math.max(16, (chartW / dataValues.length) * 0.45);
    const step = chartW / dataValues.length;

    // Draw Grid Lines
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#64748B';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 4; i++) {
      const y = paddingTop + (chartH / 4) * i;
      const val = Math.round(maxVal - (maxVal / 4) * i);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, y);
      ctx.lineTo(w - 20, y);
      ctx.stroke();
      ctx.fillText(`₹${(val / 1000).toFixed(0)}k`, paddingLeft - 8, y + 3);
    }

    // Draw Bars
    dataValues.forEach((val, idx) => {
      const barH = (val / maxVal) * chartH;
      const x = paddingLeft + idx * step + (step - barWidth) / 2;
      const y = paddingTop + chartH - barH;

      // Gradient Bar
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, color);
      grad.addColorStop(1, '#0A2540');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(x, y, barWidth, barH, [4, 4, 0, 0]);
      ctx.fill();

      // Label below bar
      ctx.fillStyle = '#475569';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      const lbl = labels[idx] || '';
      ctx.fillText(lbl, x + barWidth / 2, h - 10);
    });
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

window.ui = ui;
window.escapeHtml = escapeHtml;
