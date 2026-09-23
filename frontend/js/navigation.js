/**
 * Bhubaneswar Engineering College (BEC) - Finance System
 * Common Navigation & Header Controller for All Standalone Pages
 */

const navigation = {
  init(activePageId) {
    this.startLiveClock();
    this.highlightActiveNav(activePageId);
    this.setupMobileMenu();
    this.checkAuthAndUser();
  },

  startLiveClock() {
    const clockEl = document.getElementById('topbarClock');
    if (!clockEl) return;

    const update = () => {
      const now = new Date();
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayName = days[now.getDay()];
      const monthName = months[now.getMonth()];
      const day = now.getDate();
      const year = now.getFullYear();
      let hours = now.getHours();
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12;
      hours = hours ? hours : 12;
      const strHours = String(hours).padStart(2, '0');
      clockEl.textContent = `${dayName}, ${monthName} ${day}, ${year}, ${strHours}:${minutes}:${seconds} ${ampm}`;
    };

    update();
    setInterval(update, 1000);
  },

  highlightActiveNav(activePageId) {
    const currentPath = window.location.pathname.toLowerCase();
    const navItems = document.querySelectorAll('.sidebar-nav .nav-item');
    navItems.forEach(item => {
      const href = item.getAttribute('href');
      const pageKey = item.getAttribute('data-page');
      if (
        (activePageId && pageKey === activePageId) ||
        (href && (currentPath.endsWith(href) || currentPath === href))
      ) {
        item.classList.add('active');
      }
    });
  },

  setupMobileMenu() {
    window.toggleSidebar = function() {
      const sidebar = document.getElementById('appSidebar');
      const backdrop = document.getElementById('sidebarBackdrop');
      if (sidebar) sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('active');
    };
  },

  async checkAuthAndUser() {
    if (typeof auth !== 'undefined') {
      const user = await auth.checkAuth();
      if (!user) return;

      // Handle role-based visibility
      const isStudent = user.role === 'STUDENT';
      const studentNav = document.getElementById('studentNavGroup');
      const adminNav = document.getElementById('adminNavGroup');

      if (studentNav && adminNav) {
        if (isStudent) {
          studentNav.style.display = 'block';
          adminNav.style.display = 'none';
        } else {
          studentNav.style.display = 'none';
          adminNav.style.display = 'block';
        }
      }

      // Auditor restrictions
      if (user.role === 'AUDITOR_READ_ONLY') {
        const actionBars = document.querySelectorAll('.bec-action-toolbar, .quick-actions-bar, .fast-action-buttons');
        actionBars.forEach(ab => {
          if (ab) ab.style.display = 'none';
        });
      }
    }
  },

  openRolePasswordModal() {
    let modal = document.getElementById('globalRolePasswordModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'globalRolePasswordModal';
      modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(2px);display:flex;align-items:center;justify-content:center;z-index:9999;';
      const u = (typeof auth !== 'undefined') ? auth.getUser() : null;
      const roleName = u ? (u.role || 'ACCOUNTS') : 'ACCOUNTS_STAFF';

      modal.innerHTML = `
        <div style="background:#fff;border-radius:8px;width:90%;max-width:520px;box-shadow:0 20px 25px -5px rgba(0,0,0,0.2);overflow:hidden;border:1px solid #CBD5E1;">
          <div style="background:#0B63C5;color:#fff;padding:0.9rem 1.25rem;display:flex;justify-content:space-between;align-items:center;font-weight:700;">
            <div>+ Role and Change Password</div>
            <button onclick="document.getElementById('globalRolePasswordModal').remove()" style="background:transparent;border:none;color:#fff;font-size:1.4rem;cursor:pointer;">&times;</button>
          </div>
          <div style="padding:1.25rem;">
            <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:6px;padding:0.85rem 1rem;margin-bottom:1.25rem;">
              <span style="font-size:0.75rem;color:#64748B;text-transform:uppercase;font-weight:700;">Assigned Role:</span>
              <div style="font-size:1.1rem;font-weight:800;color:#0B63C5;margin-top:0.2rem;">${roleName}</div>
            </div>
            <div style="margin-bottom:1rem;">
              <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:0.35rem;">Current Password:</label>
              <input type="password" id="globalCurrentPass" style="width:100%;height:36px;border:1px solid #CBD5E1;border-radius:4px;padding:0.4rem 0.6rem;box-sizing:border-box;">
            </div>
            <div style="margin-bottom:1rem;">
              <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:0.35rem;">New Password:</label>
              <input type="password" id="globalNewPass" style="width:100%;height:36px;border:1px solid #CBD5E1;border-radius:4px;padding:0.4rem 0.6rem;box-sizing:border-box;" placeholder="Minimum 8 characters">
            </div>
            <div style="margin-bottom:1.25rem;">
              <label style="font-size:0.82rem;font-weight:600;display:block;margin-bottom:0.35rem;">Confirm New Password:</label>
              <input type="password" id="globalConfirmPass" style="width:100%;height:36px;border:1px solid #CBD5E1;border-radius:4px;padding:0.4rem 0.6rem;box-sizing:border-box;">
            </div>
            <button onclick="navigation.submitPasswordChange()" style="width:100%;background:#0B63C5;color:#fff;border:none;padding:0.6rem;border-radius:4px;font-weight:700;cursor:pointer;">
              Update Password
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    } else {
      modal.style.display = 'flex';
    }
  },

  async submitPasswordChange() {
    const cur = document.getElementById('globalCurrentPass')?.value;
    const nw = document.getElementById('globalNewPass')?.value;
    const cnf = document.getElementById('globalConfirmPass')?.value;

    if (!cur || !nw) {
      if (typeof ui !== 'undefined') ui.showToast('Please enter current and new password', 'warning');
      else alert('Please enter current and new password');
      return;
    }
    if (nw !== cnf) {
      if (typeof ui !== 'undefined') ui.showToast('New passwords do not match', 'error');
      else alert('New passwords do not match');
      return;
    }

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: cur,
        newPassword: nw
      });
      if (res && res.success) {
        if (typeof ui !== 'undefined') ui.showToast('Password successfully updated!', 'success');
        else alert('Password successfully updated!');
        document.getElementById('globalRolePasswordModal')?.remove();
      } else {
        if (typeof ui !== 'undefined') ui.showToast(res.message || 'Failed to update password', 'error');
        else alert(res.message || 'Failed to update password');
      }
    } catch (e) {
      if (typeof ui !== 'undefined') ui.showToast(e.message || 'Error updating password', 'error');
      else alert(e.message || 'Error updating password');
    }
  }
};

window.openRolePasswordModal = function() {
  navigation.openRolePasswordModal();
};
