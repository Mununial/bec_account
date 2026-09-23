/**
 * ==============================================================================
 * BHUBANESWAR ENGINEERING COLLEGE (BEC) - PAYMENT DETAILS CONTROLLER
 * Recreates the authentic college payment details and outstanding dues view.
 * Supports both Student Self-Service and Accounts Office / Administrator View.
 * ==============================================================================
 */

const paymentDetails = {
  currentStudent: null,
  allStudentsCache: [],
  activeMode: 'outstanding', // 'outstanding' or 'payments'
  expandedRows: {},

  async init() {
    this.startLiveClock();
    const user = await auth.checkAuth();
    if (!user) return;

    // Fetch all students for the switcher/picker
    try {
      const res = await api.get('/admin/students?limit=2000');
      if (res && res.data && res.data.students) {
        this.allStudentsCache = res.data.students;
      }
    } catch (e) {
      console.warn('Students directory notice:', e.message);
    }

    // Determine target student
    const urlParams = new URLSearchParams(window.location.search);
    const paramStudentId = urlParams.get('studentId') || urlParams.get('id');

    if (user.role === 'STUDENT') {
      // Direct student to their dedicated Student ERP portal payment view
      window.location.replace('/student-portal.html?tab=payment');
      return;
    } else {
      // Staff / Admin: check if studentId param is passed, or default to Bablu Bag
      if (paramStudentId && this.allStudentsCache.length > 0) {
        this.currentStudent = this.allStudentsCache.find(s => String(s.id) === String(paramStudentId));
      }
      if (!this.currentStudent && this.allStudentsCache.length > 0) {
        this.currentStudent = this.allStudentsCache.find(s => (s.full_name || '').toUpperCase().includes('BABLU BAG')) || this.allStudentsCache[0];
      }
    }

    this.populateStudentDropdown();
    this.renderStudentInfo();
    this.renderTable();
  },

  startLiveClock() {
    const clockEl = document.getElementById('liveClockText');
    if (!clockEl) return;

    const update = () => {
      const now = new Date();
      const options = {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      // Format: "Wednesday, September 23, 2026 at 8:12:59 PM"
      clockEl.textContent = now.toLocaleDateString('en-US', options);
    };

    update();
    setInterval(update, 1000);
  },

  populateStudentDropdown() {
    const sel = document.getElementById('pdStudentSelect');
    if (!sel) return;

    const u = auth.getUser();
    if (u && u.role === 'STUDENT') {
      sel.parentElement.style.display = 'none';
      return;
    }

    let html = '';
    this.allStudentsCache.forEach(s => {
      const isSel = this.currentStudent && this.currentStudent.id === s.id;
      html += `<option value="${s.id}" ${isSel ? 'selected' : ''}>#${s.serial_no || s.id} - ${escapeHtml(s.full_name)} (${escapeHtml(s.roll_no || s.reg_no)}) - ${escapeHtml(s.branch_code || 'B.Tech')}</option>`;
    });
    sel.innerHTML = html;
  },

  onStudentSelectChange(e) {
    const sId = parseInt(e.target.value, 10);
    this.selectStudentById(sId);
  },

  selectStudentById(sId) {
    const st = this.allStudentsCache.find(s => s.id === sId);
    if (!st) return;

    this.currentStudent = st;
    const url = new URL(window.location);
    url.searchParams.set('studentId', st.id);
    window.history.replaceState({}, '', url);

    const sel = document.getElementById('pdStudentSelect');
    if (sel) sel.value = String(st.id);

    this.renderStudentInfo();
    this.renderTable();
  },

  renderStudentInfo() {
    const s = this.currentStudent;
    if (!s) return;

    document.getElementById('pdStudentName').value = s.full_name || 'Tushar Mhato';
    document.getElementById('pdSession').value = s.session_name || '2026-27';
    document.getElementById('pdCourse').value = s.course_name || 'Bachelor of Technology (B.Tech)';
    document.getElementById('pdDepartment').value = s.branch_name || (s.branch_code ? `${s.branch_code} Engineering` : 'Mechanical Engineering');
    document.getElementById('pdAcademicYear').value = s.academic_year || '1st Year';
    document.getElementById('pdSemester').value = s.semester_label || '1st Semester';
  },

  switchMode(mode) {
    this.activeMode = mode;
    this.renderTable();
  },

  toggleRowExpand(semId) {
    this.expandedRows[semId] = !this.expandedRows[semId];
    this.renderTable();
  },

  renderTable() {
    const container = document.getElementById('tableContainer');
    if (!container) return;

    if (this.activeMode === 'outstanding') {
      this.renderOutstandingTable(container);
    } else {
      this.renderPaymentHistoryTable(container);
    }
  },

  renderOutstandingTable(container) {
    const s = this.currentStudent;
    const totalBilled = s ? (s.total_billed || 115000) : 115000;
    const totalPaid = s ? (s.total_paid || 0) : 0;
    const balance = s ? (s.total_outstanding || 115000) : 115000;
    const discount = 0.00;

    const isExpanded = !!this.expandedRows['sem1'];

    container.innerHTML = `
      <table class="bec-payment-details-table">
        <thead>
          <tr>
            <th style="width: 50px; text-align: center;">+</th>
            <th>Semester</th>
            <th style="text-align: right;">Total Amount</th>
            <th style="text-align: right;">Paid Amount</th>
            <th style="text-align: right;">Discount</th>
            <th style="text-align: right;">Balance</th>
            <th style="text-align: center; width: 130px;">Pay</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">
              <button type="button" class="btn-expand-plus" onclick="paymentDetails.toggleRowExpand('sem1')" title="Toggle itemized fee breakdown">
                ${isExpanded ? '&minus;' : '&#43;'}
              </button>
            </td>
            <td><strong>1st Semester</strong></td>
            <td style="text-align: right; font-weight: 600;">${ui.formatCurrency(totalBilled)}</td>
            <td style="text-align: right; color: #16A34A; font-weight: 600;">${ui.formatCurrency(totalPaid)}</td>
            <td style="text-align: right;">${ui.formatCurrency(discount)}</td>
            <td style="text-align: right; font-weight: 800; color: #DC2626;">${ui.formatCurrency(balance)}</td>
            <td style="text-align: center;">
              <button type="button" class="btn-pay-now-blue" onclick="paymentDetails.handlePayClick(1, ${balance})">
                Pay Now
              </button>
            </td>
          </tr>

          ${isExpanded ? `
            <tr class="expanded-subrow">
              <td colspan="7" style="padding: 0; background: #F8FAFC;">
                <div class="sub-particulars-wrap">
                  <div class="sub-particulars-title">
                    Itemized Approved Fee Particulars (1st Semester):
                  </div>
                  <table class="sub-particulars-table">
                    <thead>
                      <tr>
                        <th style="width: 40px;">#</th>
                        <th>Fee Head Particulars</th>
                        <th style="text-align: right;">Amount Billed</th>
                        <th style="text-align: right;">Paid Amount</th>
                        <th style="text-align: right;">Balance Due</th>
                        <th style="text-align: center;">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>1</td>
                        <td>Tuition Fee (Annual Academic Instruction)</td>
                        <td style="text-align: right;">₹85,000.00</td>
                        <td style="text-align: right; color: #16A34A;">₹0.00</td>
                        <td style="text-align: right; font-weight: 700; color: #DC2626;">₹85,000.00</td>
                        <td style="text-align: center;"><span class="badge" style="background:#FEE2E2; color:#DC2626; font-weight:700;">UNPAID</span></td>
                      </tr>
                      <tr>
                        <td>2</td>
                        <td>Institutional Development &amp; Smart Campus Fee</td>
                        <td style="text-align: right;">₹15,000.00</td>
                        <td style="text-align: right; color: #16A34A;">₹0.00</td>
                        <td style="text-align: right; font-weight: 700; color: #DC2626;">₹15,000.00</td>
                        <td style="text-align: center;"><span class="badge" style="background:#FEE2E2; color:#DC2626; font-weight:700;">UNPAID</span></td>
                      </tr>
                      <tr>
                        <td>3</td>
                        <td>BPUT University Examination Fee</td>
                        <td style="text-align: right;">₹5,000.00</td>
                        <td style="text-align: right; color: #16A34A;">₹0.00</td>
                        <td style="text-align: right; font-weight: 700; color: #DC2626;">₹5,000.00</td>
                        <td style="text-align: center;"><span class="badge" style="background:#FEE2E2; color:#DC2626; font-weight:700;">UNPAID</span></td>
                      </tr>
                      <tr>
                        <td>4</td>
                        <td>Advanced Engineering Computing &amp; Laboratory Fee</td>
                        <td style="text-align: right;">₹5,000.00</td>
                        <td style="text-align: right; color: #16A34A;">₹0.00</td>
                        <td style="text-align: right; font-weight: 700; color: #DC2626;">₹5,000.00</td>
                        <td style="text-align: center;"><span class="badge" style="background:#FEE2E2; color:#DC2626; font-weight:700;">UNPAID</span></td>
                      </tr>
                      <tr>
                        <td>5</td>
                        <td>University Central Registration &amp; Caution Deposit</td>
                        <td style="text-align: right;">₹5,000.00</td>
                        <td style="text-align: right; color: #16A34A;">₹0.00</td>
                        <td style="text-align: right; font-weight: 700; color: #DC2626;">₹5,000.00</td>
                        <td style="text-align: center;"><span class="badge" style="background:#FEE2E2; color:#DC2626; font-weight:700;">UNPAID</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          ` : ''}

          <!-- Next Semester (Advance Placeholder) -->
          <tr>
            <td style="text-align: center;">
              <button type="button" class="btn-expand-plus" disabled style="opacity: 0.4;">&#43;</button>
            </td>
            <td><strong>2nd Semester (Advance)</strong></td>
            <td style="text-align: right; font-weight: 600;">₹1,15,000.00</td>
            <td style="text-align: right; color: #16A34A; font-weight: 600;">₹0.00</td>
            <td style="text-align: right;">₹0.00</td>
            <td style="text-align: right; font-weight: 800; color: #475569;">₹1,15,000.00</td>
            <td style="text-align: center;">
              <button type="button" class="btn-pay-now-blue" onclick="paymentDetails.handlePayClick(2, 115000)">
                Pay Now
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  },

  async renderPaymentHistoryTable(container) {
    const s = this.currentStudent;
    let payments = [];

    if (s && s.id) {
      try {
        const u = auth.getUser();
        if (u && u.role === 'STUDENT') {
          const res = await api.get('/student/payments');
          payments = res.data || [];
        } else {
          const res = await api.get(`/admin/receipts?studentId=${s.id}`);
          payments = res.data || [];
        }
      } catch (e) {
        console.warn('Error fetching payments:', e);
      }
    }

    if (!payments || payments.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 3rem 1.5rem; background: #ffffff; border: 1px solid #CBD5E1; border-radius: 6px;">
          <div style="font-size: 1.1rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem;">No Recorded Payments Found</div>
          <div style="color: #64748B; font-size: 0.88rem;">There are no verified receipts on file for this student yet. Outstanding balance is active.</div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <table class="bec-payment-details-table">
        <thead>
          <tr>
            <th>Receipt No</th>
            <th>Payment No</th>
            <th style="text-align: right;">Amount Paid</th>
            <th>Payment Mode</th>
            <th>Transaction Ref</th>
            <th>Date &amp; Time</th>
            <th style="text-align: center;">Status</th>
            <th style="text-align: center;">Counterfoil</th>
          </tr>
        </thead>
        <tbody>
          ${payments.map(p => `
            <tr>
              <td><strong style="color: #0B63C5; font-family: monospace;">${escapeHtml(p.receipt_no || `REC-2026-${p.id}`)}</strong></td>
              <td>${escapeHtml(p.payment_no || `PAY-${p.id}`)}</td>
              <td style="text-align: right; font-weight: 700; color: #16A34A;">${ui.formatCurrency(p.amount || p.amount_paid)}</td>
              <td><span class="badge badge-muted">${escapeHtml(p.payment_method || 'CASH')}</span></td>
              <td><code>${escapeHtml(p.transaction_id || '-')}</code></td>
              <td>${ui.formatDate(p.created_at || p.issued_date)}</td>
              <td style="text-align: center;"><span class="badge badge-success">PAID</span></td>
              <td style="text-align: center;">
                <button class="btn btn-sm btn-outline" onclick="becRealFee.printReceiptPreview(${p.id}, '${escapeHtml(p.payment_no || '')}', '${escapeHtml(s.full_name)}', ${p.amount || p.amount_paid}, '${escapeHtml(p.payment_method || 'CASH')}', '${escapeHtml(p.transaction_id || '')}', { id: ${s.id}, full_name: '${escapeHtml(s.full_name)}' })">
                  🖨 Print Receipt
                </button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  },

  handlePayClick(semNum, amount) {
    const u = auth.getUser();
    const s = this.currentStudent;

    if (!s) return;

    if (u && u.role === 'STUDENT') {
      // Student online payment modal
      document.getElementById('checkoutAmount').value = amount;
      document.getElementById('checkoutAmountMax').textContent = ui.formatCurrency(amount);
      document.getElementById('checkoutInvoiceNo').textContent = `INV-2026-00${String(s.serial_no || s.id).padStart(2, '0')} (Sem ${semNum})`;
      document.getElementById('checkoutInvoiceId').value = s.id;
      ui.openModal('checkoutModal');
    } else {
      // Staff / Admin: navigate to receipt desk to cut institutional receipt
      window.location.href = `/receipt-desk.html?studentId=${s.id}`;
    }
  },

  async executePayment() {
    const amount = parseFloat(document.getElementById('checkoutAmount').value);
    const payBtn = document.getElementById('confirmPayBtn');
    const s = this.currentStudent;

    if (!amount || amount <= 0) {
      ui.showToast('Please enter a valid payment amount.', 'error');
      return;
    }

    try {
      payBtn.disabled = true;
      payBtn.innerHTML = '<span class="spinner"></span> Processing...';

      // 1. Create order
      const orderRes = await api.post('/payments/create-order', { invoiceId: s.id, amount });
      const { orderId } = orderRes.data;

      // 2. Simulate gateway handshake
      ui.showToast('Connecting to payment gateway...', 'info', 2000);
      await new Promise(r => setTimeout(r, 1200));

      // 3. Verify payment
      const verifyRes = await api.post('/payments/verify', {
        orderId,
        paymentId: `pay_gw_${Date.now()}`,
        signature: 'mock_sig_valid'
      });

      ui.closeModal('checkoutModal');
      ui.showToast('Fee payment verified successfully! Digital receipt recorded.', 'success');

      // Refresh balance
      if (s) {
        s.total_paid = (s.total_paid || 0) + amount;
        s.total_outstanding = Math.max(0, (s.total_outstanding || 115000) - amount);
      }

      this.renderTable();
    } catch (err) {
      ui.showToast(err.message || 'Payment execution failed.', 'error');
    } finally {
      payBtn.disabled = false;
      payBtn.textContent = 'Authorize Payment';
    }
  },

  handleClose() {
    const u = auth.getUser();
    if (u && u.role === 'STUDENT') {
      window.location.href = '/student-portal.html';
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = '/dashboard.html';
    }
  }
};

window.paymentDetails = paymentDetails;
