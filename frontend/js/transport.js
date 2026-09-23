/**
 * Bhubaneswar Engineering College (BEC) - Transport Module Controller
 * Handles Student Transport Fee management, filtering, student picking, fee collection and export
 */

const transportApp = {
  allStudents: [],
  pickupPoints: [],
  records: [],
  selectedStudent: null,

  async init() {
    await this.loadPickupPoints();
    await this.loadStudentsDirectory();
    await this.fetchTransportRecords();
  },

  async loadPickupPoints() {
    try {
      const res = await api.get('/transport/pickup-points');
      if (res && res.success) {
        this.pickupPoints = res.data || [];
        const select = document.getElementById('filterPickupPoint');
        const modalSelect = document.getElementById('assignPickupPoint');

        const options = this.pickupPoints.map(p => 
          `<option value="${p.id}">${p.location_name} (${p.route_name}) - ₹${p.annual_fee.toLocaleString('en-IN')}</option>`
        ).join('');

        if (select) {
          select.innerHTML = '<option value="">Select Pick Up Point</option>' + options;
        }
        if (modalSelect) {
          modalSelect.innerHTML = '<option value="">Select Pick Up Point</option>' + options;
        }
      }
    } catch (e) {
      console.error('Failed to load pickup points:', e);
    }
  },

  async loadStudentsDirectory() {
    try {
      const res = await api.get('/admin/students?limit=200');
      if (res && res.success) {
        this.allStudents = res.data.students || [];
      }
    } catch (e) {
      console.warn('Failed to load all students for picker:', e);
    }
  },

  async fetchTransportRecords() {
    const tbody = document.getElementById('transportTbody');
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: #64748B;">Loading transport records...</td></tr>';
    }

    try {
      const params = new URLSearchParams();
      const studentName = document.getElementById('filterStudentName')?.value.trim();
      const session = document.getElementById('filterSession')?.value;
      const course = document.getElementById('filterCourse')?.value;
      const department = document.getElementById('filterDepartment')?.value;
      const academicYear = document.getElementById('filterAcademicYear')?.value;
      const semester = document.getElementById('filterSemester')?.value;
      const section = document.getElementById('filterSection')?.value;
      const pickupPoint = document.getElementById('filterPickupPoint')?.value;
      const showUnpaid = document.getElementById('filterShowUnpaid')?.checked;

      if (studentName) params.append('student_name', studentName);
      if (session) params.append('session', session);
      if (course) params.append('course', course);
      if (department) params.append('department', department);
      if (academicYear) params.append('academic_year', academicYear);
      if (semester) params.append('semester', semester);
      if (section) params.append('section', section);
      if (pickupPoint) params.append('pickup_point', pickupPoint);
      if (showUnpaid) params.append('unpaid_only', 'true');

      const res = await api.get(`/transport/students?${params.toString()}`);
      if (res && res.success) {
        this.records = res.data || [];
        this.renderTable(this.records);
      } else {
        if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2.5rem; color: #64748B; font-weight: 500;">No Data Found</td></tr>';
      }
    } catch (e) {
      console.error('Fetch transport error:', e);
      if (tbody) tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 2rem; color: #EF4444;">Failed to load records.</td></tr>';
    }
  },

  renderTable(list) {
    const tbody = document.getElementById('transportTbody');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 3rem; color: #64748B; font-size: 1rem; font-weight: 500;">No Data Found</td></tr>';
      return;
    }

    tbody.innerHTML = list.map(item => `
      <tr>
        <td style="text-align: center; font-weight: 600; color: #1E293B;">${item.sr_no}</td>
        <td>
          <div style="font-weight: 600; color: #0284C7;">${escapeHtml(item.student_name)}</div>
          <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(item.department)}</div>
        </td>
        <td>${escapeHtml(item.course)}</td>
        <td style="text-align: center; font-weight: 600;">${escapeHtml(item.section)}</td>
        <td>${escapeHtml(item.father_name || 'N/A')}</td>
        <td>
          <div style="font-weight: 500; color: #334155;">${escapeHtml(item.pickup_point)}</div>
          <div style="font-size: 0.72rem; color: #64748B;">${escapeHtml(item.route_name || '')}</div>
        </td>
        <td style="text-align: right; font-weight: 600; color: #1E293B;">₹${item.total_transport_fees.toLocaleString('en-IN')}</td>
        <td style="text-align: right; font-weight: 600; color: #16A34A;">₹${item.fees_paid.toLocaleString('en-IN')}</td>
        <td style="text-align: right; font-weight: 700; color: ${item.balance > 0 ? '#DC2626' : '#16A34A'};">
          ₹${item.balance.toLocaleString('en-IN')}
        </td>
        <td style="text-align: center;">
          <button class="btn-bec-blue" style="padding: 0.3rem 0.8rem; font-size: 0.8rem; border-radius: 4px;" onclick="transportApp.openViewModal(${item.id})">
            View
          </button>
        </td>
      </tr>
    `).join('');
  },

  clearFilters() {
    const ids = ['filterStudentName', 'filterSession', 'filterCourse', 'filterDepartment', 'filterAcademicYear', 'filterSemester', 'filterSection', 'filterPickupPoint'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
    const chk = document.getElementById('filterShowUnpaid');
    if (chk) chk.checked = false;
    this.fetchTransportRecords();
  },

  openStudentPicker() {
    const modal = document.getElementById('studentPickerModal');
    const input = document.getElementById('pickerSearchInput');
    if (input) input.value = '';
    this.renderPickerList(this.allStudents);
    if (modal) modal.classList.add('active');
  },

  closeStudentPicker() {
    const modal = document.getElementById('studentPickerModal');
    if (modal) modal.classList.remove('active');
  },

  filterPickerList() {
    const q = (document.getElementById('pickerSearchInput')?.value || '').toLowerCase().trim();
    if (!q) {
      this.renderPickerList(this.allStudents);
      return;
    }
    const filtered = this.allStudents.filter(s => 
      s.full_name.toLowerCase().includes(q) ||
      (s.branch_name && s.branch_name.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
    this.renderPickerList(filtered);
  },

  renderPickerList(students) {
    const listEl = document.getElementById('pickerStudentsList');
    if (!listEl) return;

    if (!students || students.length === 0) {
      listEl.innerHTML = '<div style="text-align: center; padding: 2rem; color: #64748B;">No matching students found.</div>';
      return;
    }

    listEl.innerHTML = students.slice(0, 50).map(s => `
      <div 
        class="picker-student-item"
        style="padding: 0.75rem 1rem; border-bottom: 1px solid #E2E8F0; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: background 0.15s;"
        onmouseover="this.style.background='#F1F5F9'"
        onmouseout="this.style.background='transparent'"
        onclick="transportApp.selectStudentFromPicker('${escapeHtml(s.full_name)}', ${s.id})"
      >
        <div>
          <div style="font-weight: 600; color: #1E293B;">${escapeHtml(s.full_name)}</div>
          <div style="font-size: 0.75rem; color: #64748B;">${escapeHtml(s.branch_name || 'B.Tech')} &bull; Category: ${escapeHtml(s.category || 'General')}</div>
        </div>
        <button class="btn-bec-blue" style="padding: 0.25rem 0.65rem; font-size: 0.75rem;">Select</button>
      </div>
    `).join('');
  },

  selectStudentFromPicker(name, studentId) {
    const input = document.getElementById('filterStudentName');
    if (input) input.value = name;
    this.closeStudentPicker();
    this.fetchTransportRecords();
  },

  openViewModal(transportId) {
    const item = this.records.find(r => r.id === transportId);
    if (!item) return;

    this.selectedRecord = item;
    const body = document.getElementById('viewModalBody');
    if (!body) return;

    body.innerHTML = `
      <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 1.25rem; margin-bottom: 1.25rem;">
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem;">
          <div>
            <span style="font-size: 0.8rem; color: #64748B;">Student Full Name:</span>
            <div style="font-weight: 700; font-size: 1.05rem; color: #0284C7;">${escapeHtml(item.student_name)}</div>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: #64748B;">Course & Branch:</span>
            <div style="font-weight: 600; color: #1E293B;">${escapeHtml(item.course)} &bull; ${escapeHtml(item.department)}</div>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: #64748B;">Section & Semester:</span>
            <div style="font-weight: 600; color: #1E293B;">Section ${escapeHtml(item.section)} &bull; ${escapeHtml(item.semester)}</div>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: #64748B;">Father / Guardian Name:</span>
            <div style="font-weight: 600; color: #1E293B;">${escapeHtml(item.father_name || 'N/A')}</div>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: #64748B;">Pick Up Point:</span>
            <div style="font-weight: 700; color: #1E293B;">${escapeHtml(item.pickup_point)}</div>
          </div>
          <div>
            <span style="font-size: 0.8rem; color: #64748B;">Route Name:</span>
            <div style="font-weight: 600; color: #64748B;">${escapeHtml(item.route_name)}</div>
          </div>
        </div>
      </div>

      <!-- Financial Ledger Summary -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; text-align: center;">
        <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 6px; padding: 0.85rem;">
          <div style="font-size: 0.75rem; color: #1E40AF; font-weight: 600;">TOTAL TRANSPORT FEE</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #1E3A8A; margin-top: 0.25rem;">₹${item.total_transport_fees.toLocaleString('en-IN')}</div>
        </div>
        <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 6px; padding: 0.85rem;">
          <div style="font-size: 0.75rem; color: #065F46; font-weight: 600;">FEES PAID</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #047857; margin-top: 0.25rem;">₹${item.fees_paid.toLocaleString('en-IN')}</div>
        </div>
        <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 6px; padding: 0.85rem;">
          <div style="font-size: 0.75rem; color: #991B1B; font-weight: 600;">OUTSTANDING BALANCE</div>
          <div style="font-size: 1.25rem; font-weight: 700; color: #B91C1C; margin-top: 0.25rem;">₹${item.balance.toLocaleString('en-IN')}</div>
        </div>
      </div>

      ${item.balance > 0 ? `
        <div style="border-top: 1px solid #E2E8F0; padding-top: 1.25rem;">
          <h4 style="font-size: 0.95rem; font-weight: 700; color: #1E293B; margin-bottom: 0.75rem;">Digital Transport Fee Collection</h4>
          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem; margin-bottom: 1rem;">
            <div>
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Collection Amount (₹):</label>
              <input type="number" id="collectFeeAmount" class="form-control" value="${item.balance}" max="${item.balance}" min="1">
            </div>
            <div>
              <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Payment Mode:</label>
              <select id="collectFeeMethod" class="form-control">
                <option value="CASH">Cash Counter</option>
                <option value="UPI">UPI / QR Code</option>
                <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                <option value="CHEQUE">Cheque / Demand Draft</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom: 1rem;">
            <label class="form-label" style="font-size: 0.8rem; font-weight: 600;">Transaction / Reference No (Optional):</label>
            <input type="text" id="collectFeeRef" class="form-control" placeholder="e.g. UTR / Receipt No / Cheque No">
          </div>
          <button class="btn-bec-blue" style="width: 100%; justify-content: center; padding: 0.65rem;" onclick="transportApp.submitFeeCollection()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>
            Record Payment &amp; Issue e-Receipt
          </button>
        </div>
      ` : `
        <div style="text-align: center; padding: 1rem; background: #ECFDF5; border-radius: 6px; color: #047857; font-weight: 600;">
          All transport dues are fully settled for this academic year.
        </div>
      `}
    `;

    document.getElementById('viewTransportModal')?.classList.add('active');
  },

  closeViewModal() {
    document.getElementById('viewTransportModal')?.classList.remove('active');
  },

  async submitFeeCollection() {
    if (!this.selectedRecord) return;

    const amt = parseFloat(document.getElementById('collectFeeAmount')?.value || 0);
    const method = document.getElementById('collectFeeMethod')?.value || 'CASH';
    const ref = document.getElementById('collectFeeRef')?.value.trim();

    if (!amt || amt <= 0) {
      ui.showToast('Please enter a valid amount', 'warning');
      return;
    }

    try {
      const res = await api.post('/transport/collect-fee', {
        transport_id: this.selectedRecord.id,
        amount: amt,
        payment_method: method,
        transaction_id: ref
      });

      if (res && res.success) {
        ui.showToast('Payment recorded! Official receipt generated.', 'success');
        this.closeViewModal();
        await this.fetchTransportRecords();
      } else {
        ui.showToast(res.message || 'Failed to record payment', 'error');
      }
    } catch (e) {
      ui.showToast(e.message || 'Payment error', 'error');
    }
  },

  openAssignModal() {
    const modal = document.getElementById('assignTransportModal');
    const select = document.getElementById('assignStudentSelect');
    if (select && this.allStudents.length > 0) {
      select.innerHTML = '<option value="">Select Student</option>' + 
        this.allStudents.slice(0, 100).map(s => 
          `<option value="${s.id}">${escapeHtml(s.full_name)} (${escapeHtml(s.branch_name || 'B.Tech')})</option>`
        ).join('');
    }
    if (modal) modal.classList.add('active');
  },

  closeAssignModal() {
    document.getElementById('assignTransportModal')?.classList.remove('active');
  },

  async submitAssignment() {
    const studentId = document.getElementById('assignStudentSelect')?.value;
    const pickupPointId = document.getElementById('assignPickupPoint')?.value;
    const period = document.getElementById('assignPeriod')?.value || 'Annual';

    if (!studentId || !pickupPointId) {
      ui.showToast('Please select Student and Pickup Point', 'warning');
      return;
    }

    try {
      const res = await api.post('/transport/assign', {
        student_id: studentId,
        pickup_point_id: pickupPointId,
        fee_period: period
      });

      if (res && res.success) {
        ui.showToast('Student transport route allocated successfully!', 'success');
        this.closeAssignModal();
        await this.fetchTransportRecords();
      } else {
        ui.showToast(res.message || 'Assignment failed', 'error');
      }
    } catch (e) {
      ui.showToast(e.message || 'Failed to assign route', 'error');
    }
  },

  exportToExcel() {
    window.location.href = '/api/transport/export';
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
  transportApp.init();
});
