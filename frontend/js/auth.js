/**
 * Authentication & Session Management
 * Bhubaneswar Engineering College (BEC) Accounts System
 */

const auth = {
  currentUser: null,

  async checkAuth() {
    const token = api.getToken();
    if (!token) {
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login.html';
      }
      return null;
    }

    try {
      const res = await api.get('/auth/me');
      this.currentUser = res.data;
      this.renderUserBadge();
      return this.currentUser;
    } catch (err) {
      api.clearToken();
      if (!window.location.pathname.includes('login')) {
        window.location.href = '/login.html';
      }
      return null;
    }
  },

  async login(email, password, remember = false) {
    try {
      const res = await api.post('/auth/login', { email, password });
      const { token, user } = res.data;

      api.setToken(token, remember);
      this.currentUser = user;

      // Handle first login password change requirement
      if (user.mustChangePassword) {
        ui.showToast('First-time login: You must set a new secure password.', 'warning');
        return { mustChangePassword: true };
      }

      ui.showToast('Login successful! Welcome to BEC Finance Portal.', 'success');
      window.location.href = '/index.html';
      return { success: true };
    } catch (err) {
      ui.showToast(err.message || 'Login failed. Check credentials.', 'error');
      throw err;
    }
  },

  async changePassword(currentPassword, newPassword) {
    try {
      await api.post('/auth/change-password', { currentPassword, newPassword });
      ui.showToast('Password updated successfully.', 'success');
      return true;
    } catch (err) {
      ui.showToast(err.message || 'Failed to update password.', 'error');
      throw err;
    }
  },

  async logout() {
    try {
      await api.post('/auth/logout', {});
    } catch (e) {
      // Ignore network errors on logout
    }
    api.clearToken();
    this.currentUser = null;
    window.location.href = '/login.html';
  },

  renderUserBadge() {
    if (!this.currentUser) return;
    const nameEl = document.getElementById('userDisplayName');
    const roleEl = document.getElementById('userDisplayRole');
    const avatarEl = document.getElementById('userAvatar');

    let displayName = this.currentUser.email;
    if (this.currentUser.student) {
      displayName = this.currentUser.student.full_name;
    } else if (this.currentUser.staff) {
      displayName = this.currentUser.staff.full_name;
    }

    if (nameEl) nameEl.textContent = displayName;
    if (roleEl) roleEl.textContent = this.currentUser.role.replace(/_/g, ' ');
    if (avatarEl) {
      const initials = displayName
        .split(' ')
        .map(p => p[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
      avatarEl.textContent = initials || 'BEC';
    }
  }
};

window.auth = auth;
