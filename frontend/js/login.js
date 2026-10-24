// Idea2Impact - Dedicated Login & Registration Controller
import { api } from './api.js';
import { state, DEFAULT_USERS } from './state.js';

class LoginController {
  constructor() {
    this.selectedRole = 'candidate';
    this.init();
  }

  init() {
    this.checkExistingAuth();
    this.setupUrlParams();
    this.setupTabs();
    this.setupPasswordToggles();
    this.setupRoleSelection();
    this.setupDemoChips();
    this.setupForms();
    this.setupGoogleAuth();
  }

  checkExistingAuth() {
    const banner = document.getElementById('already-auth-banner');
    if (!banner) return;

    if (state.isAuthenticated() && state.authUser) {
      banner.classList.remove('hidden');
      const emojiMap = { candidate: '🎓', hr: '💼' };
      const nameEl = document.getElementById('already-auth-name');
      const roleEl = document.getElementById('already-auth-role');
      const emojiEl = document.getElementById('already-auth-emoji');

      if (nameEl) nameEl.textContent = state.authUser.full_name || state.authUser.username;
      if (roleEl) roleEl.textContent = `You are currently authenticated as ${state.authUser.role.toUpperCase()} (${state.authUser.email}).`;
      if (emojiEl) emojiEl.textContent = emojiMap[state.authUser.role] || '👤';

      const switchBtn = document.getElementById('switch-account-btn');
      if (switchBtn) {
        switchBtn.addEventListener('click', () => {
          state.logout();
          banner.classList.add('hidden');
          this.showAlert('Previous session cleared. Please sign in.', 'info');
        });
      }
    } else {
      banner.classList.add('hidden');
    }
  }

  setupUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    const role = params.get('role');

    if (role && ['candidate', 'hr'].includes(role.toLowerCase())) {
      this.selectRole(role.toLowerCase());
    }

    if (mode === 'register') {
      this.switchTab('register');
    } else {
      this.switchTab('signin');
    }
  }

  setupTabs() {
    const signinTab = document.getElementById('tab-signin-btn');
    const registerTab = document.getElementById('tab-register-btn');

    if (signinTab) {
      signinTab.addEventListener('click', () => this.switchTab('signin'));
    }
    if (registerTab) {
      registerTab.addEventListener('click', () => this.switchTab('register'));
    }
  }

  switchTab(tabName) {
    const signinTab = document.getElementById('tab-signin-btn');
    const registerTab = document.getElementById('tab-register-btn');
    const signinView = document.getElementById('view-signin');
    const registerView = document.getElementById('view-register');

    this.clearAlert();

    if (tabName === 'register') {
      if (signinTab) signinTab.classList.remove('active');
      if (registerTab) registerTab.classList.add('active');
      if (signinView) signinView.classList.add('hidden');
      if (registerView) registerView.classList.remove('hidden');
    } else {
      if (signinTab) signinTab.classList.add('active');
      if (registerTab) registerTab.classList.remove('active');
      if (signinView) signinView.classList.remove('hidden');
      if (registerView) registerView.classList.add('hidden');
    }
  }

  setupPasswordToggles() {
    const toggles = [
      { btnId: 'toggle-signin-password', inputId: 'signin-password' },
      { btnId: 'toggle-reg-password', inputId: 'reg-password' },
      { btnId: 'toggle-reg-confirm', inputId: 'reg-password-confirm' }
    ];

    toggles.forEach(({ btnId, inputId }) => {
      const btn = document.getElementById(btnId);
      const input = document.getElementById(inputId);
      if (btn && input) {
        btn.addEventListener('click', () => {
          input.type = input.type === 'password' ? 'text' : 'password';
        });
      }
    });
  }

  setupRoleSelection() {
    const cards = document.querySelectorAll('#register-role-grid .auth-role-big-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const role = card.dataset.role;
        this.selectRole(role);
      });
    });
  }

  selectRole(role) {
    this.selectedRole = role;
    const cards = document.querySelectorAll('#register-role-grid .auth-role-big-card');
    cards.forEach(card => {
      if (card.dataset.role === role) {
        card.classList.add('selected');
      } else {
        card.classList.remove('selected');
      }
    });

    const googleRegText = document.getElementById('google-reg-text');
    if (googleRegText) {
      const labelMap = { candidate: 'Candidate', hr: 'HR / Recruiter' };
      googleRegText.textContent = `Sign up with Google as ${labelMap[role] || 'User'}`;
    }
  }

  setupDemoChips() {
    const chips = document.querySelectorAll('.demo-login-chip');
    chips.forEach(chip => {
      chip.addEventListener('click', async () => {
        const username = chip.dataset.user;
        const uInput = document.getElementById('signin-username');
        const pInput = document.getElementById('signin-password');
        if (uInput) uInput.value = username;
        if (pInput) pInput.value = 'password123';

        this.showAlert(`Auto-filling credentials for demo ${chip.dataset.role.toUpperCase()} account...`, 'info');
        await this.handleLogin(username, 'password123');
      });
    });
  }

  setupForms() {
    // Sign In Form
    const signinForm = document.getElementById('signin-form');
    if (signinForm) {
      signinForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signin-username').value.trim();
        const password = document.getElementById('signin-password').value;

        if (!username || !password) {
          this.showAlert('Please enter both username and password.', 'error');
          return;
        }

        const submitBtn = document.getElementById('signin-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Authenticating...';
        }

        await this.handleLogin(username, password);

        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Sign In & Launch Dashboard →';
        }
      });
    }

    // Register Form
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('reg-fullname').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-password-confirm').value;
        const bio = document.getElementById('reg-bio').value.trim();

        if (!fullName || !username || !email || !password) {
          this.showAlert('Please fill in all required fields.', 'error');
          return;
        }

        if (password.length < 6) {
          this.showAlert('Password must be at least 6 characters.', 'error');
          return;
        }

        if (password !== confirmPassword) {
          this.showAlert('Passwords do not match.', 'error');
          return;
        }

        const submitBtn = document.getElementById('reg-submit-btn');
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Creating Account...';
        }

        try {
          const res = await api.register({
            full_name: fullName,
            username: username,
            email: email,
            password: password,
            role: this.selectedRole,
            bio: bio
          });

          this.showAlert('Account created successfully! Launching your workspace...', 'success');
          state.setAuth(res.user, res.token);
          setTimeout(() => {
            window.location.href = `dashboard.html?role=${encodeURIComponent(res.user.role || 'candidate')}`;
          }, 600);
        } catch (err) {
          this.showAlert(err.message || 'Registration failed. Username or email may already be in use.', 'error');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account & Launch Workspace →';
          }
        }
      });
    }
  }

  async handleLogin(username, password) {
    try {
      const res = await api.login(username, password);
      this.showAlert(`Welcome back, ${res.user.full_name || res.user.username}! Loading workspace...`, 'success');
      state.setAuth(res.user, res.token);
      setTimeout(() => {
        window.location.href = `dashboard.html?role=${encodeURIComponent(res.user.role || 'candidate')}`;
      }, 500);
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('password')) {
        this.showAlert('Incorrect password. Please try again.', 'error');
      } else if (msg.includes('no account') || msg.includes('not found') || msg.includes('401') || msg.includes('invalid')) {
        this.showAlert('Invalid credentials or account not found. Try one of the 1-Click Demo Portals below or create an account.', 'error');
      } else {
        this.showAlert(err.message || 'Login failed. Please check credentials.', 'error');
      }
    }
  }

  setupGoogleAuth() {
    const gBtn = document.getElementById('google-auth-btn');
    const gRegBtn = document.getElementById('google-register-btn');

    const handleGoogle = (role) => {
      const promptEmail = window.prompt("Enter Google Account email for simulation:", `user_${Math.random().toString(36).substring(2, 6)}@gmail.com`);
      if (!promptEmail) return;

      this.showAlert("Verifying Google OAuth Token...", "info");
      api.googleAuth(promptEmail, "Google Verified User", role)
        .then(res => {
          this.showAlert("Google authentication successful! Launching workspace...", "success");
          state.setAuth(res.user, res.token);
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 500);
        })
        .catch(err => {
          this.showAlert(err.message || "Google authentication failed", "error");
        });
    };

    if (gBtn) gBtn.addEventListener('click', () => handleGoogle('candidate'));
    if (gRegBtn) gRegBtn.addEventListener('click', () => handleGoogle(this.selectedRole));
  }

  showAlert(message, type = 'info') {
    const container = document.getElementById('auth-alert-container');
    if (!container) return;

    container.innerHTML = `
      <div class="auth-alert ${type}">
        <span>${type === 'success' ? '✓' : type === 'error' ? '⚠' : 'ℹ'}</span>
        <span>${message}</span>
      </div>
    `;
  }

  clearAlert() {
    const container = document.getElementById('auth-alert-container');
    if (container) container.innerHTML = '';
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new LoginController();
});
