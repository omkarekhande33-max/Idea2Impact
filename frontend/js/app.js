import { api } from './api.js';
import { state, DEFAULT_USERS } from './state.js';

class App {
  constructor() {
    this.appContainer = document.getElementById('app');
    this.currentViewData = {};
    this.init();
  }

  async init() {
    // Setup Top Navigation & Role Bar
    this.renderTopBars();
    // Subscribe to state changes
    state.subscribe(() => this.renderCurrentView());
    // Initial Render
    await this.renderCurrentView();
  }

  renderTopBars() {
    const roleBar = document.getElementById('role-bar');
    const isAuth = state.isAuthenticated();

    if (roleBar) {
      if (!isAuth) {
        // Initial visit: HIDE persona switcher completely so user ONLY sees login/register
        roleBar.style.display = 'none';
      } else {
        // Authenticated: Show ONLY the user's active role — no cross-role switching
        const roleEmoji = { candidate: '🎓', hr: '💼', founder: '🚀', investor: '🦈' };
        const roleLabel = { candidate: 'Candidate Mode', hr: 'HR / Recruiter Mode', founder: 'Founder Mode', investor: 'Investor / Shark Mode' };
        roleBar.style.display = 'flex';
        roleBar.innerHTML = `
          <div class="role-bar-left">
            <span class="role-bar-badge">ACTIVE WORKSPACE</span>
            <span style="font-size:0.8rem; color:#94A3B8;">You are signed in as <strong style="color:#fff;">${roleEmoji[state.currentRole] || ''} ${roleLabel[state.currentRole] || state.currentRole.toUpperCase()}</strong></span>
          </div>
          <div style="font-size:0.75rem; color:#64748B; font-style:italic;">
            To access a different mode, please sign out and sign in with a different account.
          </div>
        `;
      }
    }

    const navbar = document.getElementById('navbar');
    if (navbar) {
      if (!isAuth) {
        // Initial visit: Clean navbar with brand and secure gateway indicator
        navbar.innerHTML = `
          <div class="nav-container">
            <a href="#" class="brand" id="brand-link" style="cursor:default;">
              <div class="brand-icon">I²</div>
              <span>Idea<span class="impact-text">2Impact</span></span>
            </a>
            <div style="font-size:0.85rem; font-weight:600; color:#94A3B8; display:flex; align-items:center; gap:0.5rem;">
              <span>🔒</span>
              <span>Secure Gateway: Candidate · HR · Founder · Investor</span>
            </div>
          </div>
        `;
      } else {
        // Authenticated: Show mode-specific nav links for the user's OWN role only
        const modeNavLinks = {
          candidate: [
            { label: 'Dashboard', tab: 'overview' },
            { label: 'Assessments', tab: 'assessments' },
            { label: 'Skill Passport', tab: 'passport' },
            { label: 'Job Matches', tab: 'jobs' }
          ],
          hr: [
            { label: 'Dashboard', tab: 'overview' },
            { label: 'Post a Job', tab: 'create-job' },
            { label: 'Applicants', tab: 'applicants' },
            { label: 'Skill Reports', tab: 'reports' }
          ],
          founder: [
            { label: 'Dashboard', tab: 'overview' },
            { label: 'AI Copilot', tab: 'ai-copilot' },
            { label: 'Pitch Deck', tab: 'pitch' },
            { label: 'Find Investors', tab: 'investors' }
          ],
          investor: [
            { label: 'Dashboard', tab: 'overview' },
            { label: 'Deal Flow', tab: 'startups' },
            { label: 'Portfolio', tab: 'portfolio' },
            { label: 'Term Sheets', tab: 'termsheets' }
          ]
        };
        const links = modeNavLinks[state.currentRole] || modeNavLinks.candidate;
        const navLinksHtml = links.map(l =>
          `<li><a href="#" class="nav-link ${state.activeTab === l.tab ? 'active' : ''}" data-tab="${l.tab}">${l.label}</a></li>`
        ).join('');

        navbar.innerHTML = `
          <div class="nav-container">
            <a href="#" class="brand" id="brand-link">
              <div class="brand-icon">I²</div>
              <span>Idea<span class="impact-text">2Impact</span></span>
            </a>
            <ul class="nav-menu">
              ${navLinksHtml}
            </ul>
            <div class="flex items-center gap-3">
              <div class="flex items-center gap-2" style="background: rgba(255,255,255,0.08); padding: 0.25rem 0.65rem 0.25rem 0.35rem; border-radius: var(--radius-full); border: 1px solid rgba(255,255,255,0.15);">
                <img src="${state.activeUser ? (state.activeUser.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + state.activeUser.name) : ''}" alt="" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">
                <span style="font-size: 0.82rem; font-weight: 600; color: #fff;">${state.activeUser ? state.activeUser.name : 'User'}</span>
                <span class="badge badge-role" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${state.currentRole.toUpperCase()}</span>
              </div>
              <button class="btn btn-outline btn-sm" id="nav-logout-btn" style="border-color: rgba(255,255,255,0.25); color: #fff; background: transparent;">
                Sign Out
              </button>
              <button class="btn btn-primary btn-sm" id="quick-action-btn">
                ${state.currentRole === 'founder' ? '+ Analyze Idea' : state.currentRole === 'candidate' ? '⚡ Take Assessment' : state.currentRole === 'hr' ? '+ Post Job' : state.currentRole === 'investor' ? '🔍 Deal Flow' : 'Explore'}
              </button>
            </div>
          </div>
        `;

        navbar.querySelectorAll('.nav-link').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            state.setTab(link.dataset.tab);
            this.renderTopBars();
          });
        });

        const logoutBtn = navbar.querySelector('#nav-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            state.logout();
            this.renderTopBars();
          });
        }

        navbar.querySelector('#quick-action-btn').addEventListener('click', () => {
          if (state.currentRole === 'candidate') state.setTab('assessments');
          else if (state.currentRole === 'founder') state.setTab('ai-copilot');
          else if (state.currentRole === 'hr') state.setTab('create-job');
          else if (state.currentRole === 'investor') state.setTab('startups');
        });
      }
    }
  }

  async renderCurrentView() {
    this.renderTopBars();

    // STRICT AUTH GUARD: Unauthenticated users MUST only see the login/register page!
    if (!state.isAuthenticated()) {
      await this.renderLoginPage();
      return;
    }

    // Authenticated: Route directly to their signed-in role mode
    if (state.currentRole === 'candidate') {
      await this.renderCandidateDashboard();
    } else if (state.currentRole === 'hr') {
      await this.renderHrDashboard();
    } else if (state.currentRole === 'founder') {
      await this.renderFounderDashboard();
    } else if (state.currentRole === 'investor') {
      await this.renderInvestorDashboard();
    } else {
      await this.renderCandidateDashboard();
    }
  }

  // =========================================================================
  // AUTHENTICATION: 3-STATE FLOW
  //   'landing'   -> Landing page with Sign In & Create Account buttons only
  //   'signin'    -> Username/password login form  
  //   'role-pick' -> 4 role-selection cards
  //   'register'  -> Registration form for selected role
  // =========================================================================
  async renderLoginPage() {
    const authScreen = state.authMode;
    const activeRole = state.selectedAuthRole || 'candidate';

    const roleMeta = {
      candidate: { emoji: '🎓', label: 'Candidate', color: '#2563EB', colorBg: 'rgba(37,99,235,0.08)', desc: 'Take timed assessments, earn verified skill passports and unlock explainable job match scores.' },
      hr: { emoji: '💼', label: 'HR / Recruiter', color: '#D97706', colorBg: 'rgba(217,119,6,0.08)', desc: 'Post weighted engineering jobs, review applicant compatibility and hire verified technical talent.' },
      founder: { emoji: '🚀', label: 'Founder', color: '#16A34A', colorBg: 'rgba(22,163,74,0.08)', desc: 'Transform raw ideas into business plans with AI Copilot, evaluate feasibility and export pitch decks.' },
      investor: { emoji: '🦈', label: 'Shark Investor', color: '#7C3AED', colorBg: 'rgba(124,58,237,0.08)', desc: 'Discover vetted startups, review AI due diligence reports and issue direct lead round term sheets.' }
    };
    const meta = roleMeta[activeRole] || roleMeta.candidate;

    const googleSvg = `<svg width="20" height="20" viewBox="0 0 18 18"><path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/><path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/><path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/><path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/></svg>`;

    // ── STATE 1: LANDING ──────────────────────────────────────────────────────
    if (!authScreen || authScreen === 'landing') {
      this.appContainer.innerHTML = `
        <div class="auth-landing-wrapper">
          <div class="auth-landing-card">
            <div class="auth-landing-brand">
              <div class="auth-landing-icon">I²</div>
              <span class="auth-landing-brand-name">Idea<span>2Impact</span></span>
            </div>
            <p class="auth-landing-tagline">From Ideas to Innovation · From Talent to Impact</p>
            <div class="auth-landing-modes">
              <div class="auth-landing-mode-pill">🎓 <span>Candidate</span></div>
              <div class="auth-landing-mode-pill">💼 <span>HR</span></div>
              <div class="auth-landing-mode-pill">🚀 <span>Founder</span></div>
              <div class="auth-landing-mode-pill">🦈 <span>Investor</span></div>
            </div>
            <div id="auth-alert-container"></div>
            <div class="auth-landing-actions">
              <button class="auth-landing-btn-primary" id="landing-login-btn">Sign In</button>
              <button class="auth-landing-btn-outline" id="landing-register-btn">Create Account</button>
            </div>
            <button class="auth-google-btn" id="google-auth-btn" type="button" style="margin-top:1rem;">
              ${googleSvg}
              <span>Continue with Google</span>
            </button>
            <p class="auth-landing-secure">🔒 Secure · Verified · Encrypted</p>
          </div>
        </div>
      `;
      document.getElementById('landing-login-btn').addEventListener('click', () => { state.authMode = 'signin'; this.renderLoginPage(); });
      document.getElementById('landing-register-btn').addEventListener('click', () => { state.authMode = 'role-pick'; this.renderLoginPage(); });
      const gBtn = document.getElementById('google-auth-btn');
      if (gBtn) gBtn.addEventListener('click', () => this.showGoogleAccountChooserModal('candidate'));
      return;
    }

    // ── STATE 2: SIGN IN ──────────────────────────────────────────────────────
    if (authScreen === 'signin') {
      this.appContainer.innerHTML = `
        <div class="auth-wrapper">
          <div class="auth-card">
            <button class="auth-back-btn" id="auth-back-btn">← Back</button>
            <div class="auth-header">
              <div class="brand-badge"><span>🛡️</span><span>Idea2Impact Secure Access</span></div>
              <h1>Welcome Back</h1>
              <p>Sign in with your username/email or Google account.</p>
            </div>
            <button class="auth-google-btn" id="google-auth-btn" type="button">
              ${googleSvg}<span>Continue with Google</span>
            </button>
            <div class="auth-divider"><span>OR CONTINUE WITH CREDENTIALS</span></div>
            <div id="auth-alert-container"></div>
            <form class="auth-form" id="signin-form">
              <div class="form-group">
                <label for="signin-username">Username or Email</label>
                <input type="text" id="signin-username" placeholder="Enter username or email address" required autocomplete="username">
              </div>
              <div class="form-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                  <label for="signin-password">Password</label>
                  <span style="font-size:0.78rem; color:#64748B;">Demo pass: <code>password123</code></span>
                </div>
                <div class="password-input-wrapper">
                  <input type="password" id="signin-password" placeholder="Enter password" required autocomplete="current-password">
                  <button type="button" class="password-toggle-btn" id="toggle-signin-password">👁️</button>
                </div>
              </div>
              <button type="submit" class="auth-submit-btn" id="signin-submit-btn">Sign In</button>
            </form>
            <div style="text-align:center; margin-top:1.25rem; font-size:0.88rem; color:var(--text-muted);">
              Don't have an account?
              <a href="#" id="switch-to-register" style="color:var(--secondary); font-weight:700;">Create Account</a>
            </div>
          </div>
        </div>
      `;
      document.getElementById('auth-back-btn').addEventListener('click', () => { state.authMode = 'landing'; this.renderLoginPage(); });
      document.getElementById('switch-to-register').addEventListener('click', (e) => { e.preventDefault(); state.authMode = 'role-pick'; this.renderLoginPage(); });
      const gBtn2 = document.getElementById('google-auth-btn');
      if (gBtn2) gBtn2.addEventListener('click', () => this.showGoogleAccountChooserModal('candidate'));
      const tBtn = document.getElementById('toggle-signin-password');
      const pInp = document.getElementById('signin-password');
      if (tBtn && pInp) tBtn.addEventListener('click', () => { pInp.type = pInp.type === 'password' ? 'text' : 'password'; });
      document.getElementById('signin-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signin-username').value.trim();
        const password = document.getElementById('signin-password').value;
        const submitBtn = document.getElementById('signin-submit-btn');
        if (!username || !password) { this.showAuthAlert('Please enter both username and password.', 'error'); return; }
        submitBtn.disabled = true; submitBtn.textContent = 'Verifying...';
        try {
          const res = await api.login(username, password);
          state.setAuth(res.user, res.token);
        } catch (err) {
          const msg = (err.message || '').toLowerCase();
          if (msg.includes('invalid') || msg.includes('401') || msg.includes('not found') || msg.includes('incorrect')) {
            this.showAuthAlert('No account found. <a href="#" id="alert-create-link" style="color:var(--secondary);font-weight:700;">Create an account first</a>.', 'error');
            setTimeout(() => { const l = document.getElementById('alert-create-link'); if (l) l.addEventListener('click', (ev) => { ev.preventDefault(); state.authMode = 'role-pick'; this.renderLoginPage(); }); }, 50);
          } else { this.showAuthAlert(err.message || 'Invalid username or password.', 'error'); }
          submitBtn.disabled = false; submitBtn.textContent = 'Sign In';
        }
      });
      return;
    }

    // ── STATE 3: ROLE PICKER ──────────────────────────────────────────────────
    if (authScreen === 'role-pick') {
      const roleCards = Object.entries(roleMeta).map(([key, r]) =>
        `<div class="auth-role-big-card${activeRole === key ? ' selected' : ''}" data-role="${key}" style="--role-color:${r.color}; --role-bg:${r.colorBg};">
          <div class="auth-role-big-emoji">${r.emoji}</div>
          <div class="auth-role-big-label">${r.label}</div>
          <div class="auth-role-big-desc">${r.desc}</div>
          <div class="auth-role-big-check">✓</div>
        </div>`
      ).join('');
      this.appContainer.innerHTML = `
        <div class="auth-wrapper">
          <div class="auth-card" style="max-width:600px;">
            <button class="auth-back-btn" id="auth-back-btn">← Back</button>
            <div class="auth-header">
              <div class="brand-badge"><span>🎯</span><span>Choose Your Mode</span></div>
              <h1>Create Account</h1>
              <p>Select the workspace mode that best describes you.</p>
            </div>
            <div id="auth-alert-container"></div>
            <div class="auth-role-grid">${roleCards}</div>
            <button class="auth-submit-btn" id="role-continue-btn" style="margin-top:1.5rem;">
              Continue as ${meta.emoji} ${meta.label} →
            </button>
            <div style="text-align:center; margin-top:1rem; font-size:0.88rem; color:var(--text-muted);">
              Already have an account?
              <a href="#" id="switch-to-signin" style="color:var(--secondary); font-weight:700;">Sign In</a>
            </div>
          </div>
        </div>
      `;
      document.getElementById('auth-back-btn').addEventListener('click', () => { state.authMode = 'landing'; this.renderLoginPage(); });
      document.getElementById('switch-to-signin').addEventListener('click', (e) => { e.preventDefault(); state.authMode = 'signin'; this.renderLoginPage(); });
      let selectedRole = activeRole;
      document.querySelectorAll('.auth-role-big-card').forEach(card => {
        card.addEventListener('click', () => {
          document.querySelectorAll('.auth-role-big-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedRole = card.dataset.role;
          state.selectedAuthRole = selectedRole;
          const m = roleMeta[selectedRole];
          document.getElementById('role-continue-btn').textContent = 'Continue as ' + m.emoji + ' ' + m.label + ' →';
        });
      });
      document.getElementById('role-continue-btn').addEventListener('click', () => { state.selectedAuthRole = selectedRole; state.authMode = 'register'; this.renderLoginPage(); });
      return;
    }

    // ── STATE 4: REGISTER FORM ────────────────────────────────────────────────
    if (authScreen === 'register') {
      this.appContainer.innerHTML = `
        <div class="auth-wrapper">
          <div class="auth-card">
            <button class="auth-back-btn" id="auth-back-btn">← Back</button>
            <div class="auth-header">
              <div class="brand-badge" style="background:${meta.colorBg}; color:${meta.color};">
                <span>${meta.emoji}</span><span>${meta.label} Mode</span>
              </div>
              <h1>Create Your Account</h1>
              <p>Register to access your personalized <strong>${meta.label}</strong> workspace.</p>
            </div>
            <div id="auth-alert-container"></div>
            <button class="auth-google-btn" id="google-auth-btn" type="button">
              ${googleSvg}<span>Sign up with Google as ${meta.label}</span>
            </button>
            <div class="auth-divider"><span>or fill in your details</span></div>
            <form class="auth-form" id="register-form">
              <div class="form-group">
                <label for="reg-fullname">Full Name</label>
                <input type="text" id="reg-fullname" placeholder="e.g. Alex Rivera" required>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                <div class="form-group">
                  <label for="reg-username">Username</label>
                  <input type="text" id="reg-username" placeholder="e.g. alexrivera" required autocomplete="username">
                </div>
                <div class="form-group">
                  <label for="reg-email">Email</label>
                  <input type="email" id="reg-email" placeholder="alex@example.com" required autocomplete="email">
                </div>
              </div>
              <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                <div class="form-group">
                  <label for="reg-password">Password</label>
                  <div class="password-input-wrapper">
                    <input type="password" id="reg-password" placeholder="Min. 6 chars" required autocomplete="new-password">
                    <button type="button" class="password-toggle-btn" id="toggle-reg-password">👁️</button>
                  </div>
                </div>
                <div class="form-group">
                  <label for="reg-password-confirm">Confirm Password</label>
                  <div class="password-input-wrapper">
                    <input type="password" id="reg-password-confirm" placeholder="Repeat password" required autocomplete="new-password">
                    <button type="button" class="password-toggle-btn" id="toggle-reg-confirm">👁️</button>
                  </div>
                </div>
              </div>
              <div class="form-group">
                <label for="reg-bio">Bio <span style="font-weight:400; color:#94A3B8;">(optional)</span></label>
                <input type="text" id="reg-bio" placeholder="e.g. Senior Software Engineer specializing in AI">
              </div>
              <button type="submit" class="auth-submit-btn" id="reg-submit-btn">
                ${meta.emoji} Create Account &amp; Open ${meta.label} Mode
              </button>
            </form>
            <div style="text-align:center; margin-top:1.25rem; font-size:0.88rem; color:var(--text-muted);">
              Already have an account?
              <a href="#" id="switch-to-signin" style="color:var(--secondary); font-weight:700;">Sign In</a>
            </div>
          </div>
        </div>
      `;
      document.getElementById('auth-back-btn').addEventListener('click', () => { state.authMode = 'role-pick'; this.renderLoginPage(); });
      document.getElementById('switch-to-signin').addEventListener('click', (e) => { e.preventDefault(); state.authMode = 'signin'; this.renderLoginPage(); });
      const gBtn3 = document.getElementById('google-auth-btn');
      if (gBtn3) gBtn3.addEventListener('click', () => this.showGoogleAccountChooserModal(activeRole));
      const tReg = document.getElementById('toggle-reg-password');
      const rPass = document.getElementById('reg-password');
      if (tReg && rPass) tReg.addEventListener('click', () => { rPass.type = rPass.type === 'password' ? 'text' : 'password'; });
      const tConf = document.getElementById('toggle-reg-confirm');
      const cPass = document.getElementById('reg-password-confirm');
      if (tConf && cPass) tConf.addEventListener('click', () => { cPass.type = cPass.type === 'password' ? 'text' : 'password'; });
      document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullName = document.getElementById('reg-fullname').value.trim();
        const username = document.getElementById('reg-username').value.trim();
        const email = document.getElementById('reg-email').value.trim();
        const password = document.getElementById('reg-password').value;
        const confirmPass = document.getElementById('reg-password-confirm').value;
        const bio = document.getElementById('reg-bio').value.trim();
        const submitBtn = document.getElementById('reg-submit-btn');
        if (password !== confirmPass) { this.showAuthAlert('Passwords do not match.', 'error'); return; }
        if (password.length < 6) { this.showAuthAlert('Password must be at least 6 characters.', 'error'); return; }
        submitBtn.disabled = true; submitBtn.textContent = 'Creating account...';
        try {
          const res = await api.register({ full_name: fullName, username, email, password, role: activeRole, bio });
          state.setAuth(res.user, res.token);
        } catch (err) {
          this.showAuthAlert(err.message || 'Registration failed. Try a different username/email.', 'error');
          submitBtn.disabled = false;
          submitBtn.textContent = meta.emoji + ' Create Account & Open ' + meta.label + ' Mode';
        }
      });
    }
  }

  attachAuthEventListeners() { /* event listeners are now inline in renderLoginPage() */ }

  showAuthAlert(message, type = 'error') {
    const container = document.getElementById('auth-alert-container');
    if (!container) return;
    container.innerHTML = `
      <div class="auth-alert ${type}">
        <span>${type === 'error' ? '⚠️' : '✓'}</span>
        <span>${message}</span>
      </div>
    `;
  }

  showGoogleAccountChooserModal(defaultRole = 'candidate') {
    const existing = document.getElementById('google-modal-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'google-modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width: 460px; padding: 2rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
          <div style="display:flex; align-items:center; gap:0.6rem;">
            <svg width="24" height="24" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
            </svg>
            <h3 style="font-size:1.15rem; font-weight:700; color:var(--primary); margin:0;">Sign in with Google</h3>
          </div>
          <button id="close-google-modal" style="background:none; border:none; font-size:1.4rem; color:#94A3B8; cursor:pointer;">&times;</button>
        </div>

        <p style="font-size:0.85rem; color:#64748B; margin-bottom:1.2rem;">
          Choose an account and select your workspace mode to enter <strong>Idea2Impact</strong>:
        </p>

        <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom:1.25rem;">
          <div class="google-acc-item" data-email="alex.rivera@gmail.com" data-name="Alex Rivera" data-role="candidate" style="display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.75rem; border:1px solid #E2E8F0; border-radius:var(--radius-md); cursor:pointer; transition:all 150ms;">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80" style="width:34px; height:34px; border-radius:50%; object-fit:cover;">
            <div style="flex:1;">
              <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">Alex Rivera</div>
              <div style="font-size:0.75rem; color:#64748B;">alex.rivera@gmail.com</div>
            </div>
            <span class="badge" style="background:#E0F2FE; color:#0369A1; font-size:0.7rem;">🎓 Open Candidate</span>
          </div>

          <div class="google-acc-item" data-email="elena.rostova@gmail.com" data-name="Elena Rostova" data-role="hr" style="display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.75rem; border:1px solid #E2E8F0; border-radius:var(--radius-md); cursor:pointer; transition:all 150ms;">
            <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=80&auto=format&fit=crop&q=80" style="width:34px; height:34px; border-radius:50%; object-fit:cover;">
            <div style="flex:1;">
              <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">Elena Rostova</div>
              <div style="font-size:0.75rem; color:#64748B;">elena.rostova@gmail.com</div>
            </div>
            <span class="badge" style="background:#FEF3C7; color:#B45309; font-size:0.7rem;">💼 Open HR Mode</span>
          </div>

          <div class="google-acc-item" data-email="sarah.lin@gmail.com" data-name="Sarah Lin" data-role="founder" style="display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.75rem; border:1px solid #E2E8F0; border-radius:var(--radius-md); cursor:pointer; transition:all 150ms;">
            <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&auto=format&fit=crop&q=80" style="width:34px; height:34px; border-radius:50%; object-fit:cover;">
            <div style="flex:1;">
              <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">Sarah Lin</div>
              <div style="font-size:0.75rem; color:#64748B;">sarah.lin@gmail.com</div>
            </div>
            <span class="badge" style="background:#DCFCE7; color:#15803D; font-size:0.7rem;">🚀 Open Founder</span>
          </div>

          <div class="google-acc-item" data-email="v.sterling@gmail.com" data-name="Victoria Sterling" data-role="investor" style="display:flex; align-items:center; gap:0.75rem; padding:0.65rem 0.75rem; border:1px solid #E2E8F0; border-radius:var(--radius-md); cursor:pointer; transition:all 150ms;">
            <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=80&auto=format&fit=crop&q=80" style="width:34px; height:34px; border-radius:50%; object-fit:cover;">
            <div style="flex:1;">
              <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">Victoria Sterling</div>
              <div style="font-size:0.75rem; color:#64748B;">v.sterling@gmail.com</div>
            </div>
            <span class="badge" style="background:#F3E8FF; color:#7E22CE; font-size:0.7rem;">🦈 Open Investor</span>
          </div>
        </div>

        <div style="border-top:1px solid #E2E8F0; padding-top:0.85rem;">
          <div style="font-size:0.8rem; font-weight:700; color:#475569; margin-bottom:0.4rem;">Or enter another Google account:</div>
          <form id="custom-google-form" style="display:flex; flex-direction:column; gap:0.5rem;">
            <input type="text" id="custom-google-name" placeholder="Your Name" required style="padding:0.55rem; border:1px solid #E2E8F0; border-radius:var(--radius-md); font-size:0.85rem;">
            <input type="email" id="custom-google-email" placeholder="name@gmail.com" required style="padding:0.55rem; border:1px solid #E2E8F0; border-radius:var(--radius-md); font-size:0.85rem;">
            <select id="custom-google-role" style="padding:0.55rem; border:1px solid #E2E8F0; border-radius:var(--radius-md); font-size:0.85rem;">
              <option value="candidate" ${defaultRole === 'candidate' ? 'selected' : ''}>Target: 🎓 Candidate Mode</option>
              <option value="hr" ${defaultRole === 'hr' ? 'selected' : ''}>Target: 💼 HR Recruiter Mode</option>
              <option value="founder" ${defaultRole === 'founder' ? 'selected' : ''}>Target: 🚀 Founder Mode</option>
              <option value="investor" ${defaultRole === 'investor' ? 'selected' : ''}>Target: 🦈 Shark Investor Mode</option>
            </select>
            <button type="submit" class="btn btn-primary btn-sm" style="width:100%; margin-top:0.25rem;">
              Sign In with Google & Open Workspace
            </button>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const closeModal = () => overlay.remove();
    overlay.querySelector('#close-google-modal').addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    const triggerGoogleSignIn = async (email, name, role) => {
      try {
        closeModal();
        state.showToast(`Signing in via Google (${email})...`, 'info');
        const res = await api.googleAuth({
          email: email,
          full_name: name,
          role: role || 'candidate'
        });
        state.setAuth(res.user, res.token);
      } catch (err) {
        state.showToast(err.message || 'Google authentication failed', 'danger');
      }
    };

    overlay.querySelectorAll('.google-acc-item').forEach(item => {
      item.addEventListener('mouseenter', () => { item.style.background = '#F8FAFC'; item.style.borderColor = '#94A3B8'; });
      item.addEventListener('mouseleave', () => { item.style.background = '#fff'; item.style.borderColor = '#E2E8F0'; });
      item.addEventListener('click', () => {
        triggerGoogleSignIn(item.dataset.email, item.dataset.name, item.dataset.role);
      });
    });

    overlay.querySelector('#custom-google-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('custom-google-name').value.trim();
      const email = document.getElementById('custom-google-email').value.trim();
      const role = document.getElementById('custom-google-role').value;
      triggerGoogleSignIn(email, name, role);
    });
  }

  // =========================================================================
  // 1. PUBLIC LANDING PAGE (Section 6.1 & 7.1)
  // =========================================================================
  async renderLandingPage() {
    let stats = { candidate_count: 3, founder_count: 1, hr_count: 1, investor_count: 1, verified_skills_count: 6, active_jobs_count: 3 };
    try {
      stats = await api.getStats();
    } catch (e) {
      console.warn("Using default stats");
    }

    this.appContainer.innerHTML = `
      <div class="container" style="padding-top:2.5rem; padding-bottom:4rem;">
        <!-- Hero Section -->
        <div style="text-align:center; max-width:850px; margin:0 auto 3.5rem;">
          <span class="badge" style="background:rgba(20, 184, 166, 0.15); color:var(--accent-dark); border:1px solid var(--accent); margin-bottom:1rem; font-size:0.85rem; padding:0.35rem 0.85rem;">
            Unified Talent, Startup & Investment Ecosystem
          </span>
          <h1 style="font-size:3.2rem; font-weight:800; color:var(--primary); line-height:1.15; margin-bottom:1.25rem; letter-spacing:-0.03em;">
            Turn <span style="background:linear-gradient(135deg, var(--secondary), var(--accent)); -webkit-background-clip:text; -webkit-text-fill-color:transparent;">Ideas into Innovation</span>.<br/>
            Turn <span style="color:var(--secondary);">Talent into Impact</span>.
          </h1>
          <p style="font-size:1.15rem; color:var(--text-muted); line-height:1.6; margin-bottom:2rem;">
            Idea2Impact replaces resume guessing and disconnected tools with verified technical skill passports, AI-assisted business structuring, explainable hiring algorithms, and venture due diligence.
          </p>
          <div class="flex items-center justify-between" style="justify-content:center; gap:1rem; flex-wrap:wrap;">
            <button class="btn btn-secondary btn-lg" id="landing-hero-candidate-btn">
              🎓 Verify Skills (Candidate)
            </button>
            <button class="btn btn-primary btn-lg" id="landing-hero-founder-btn">
              🚀 Structure Pitch (Founder)
            </button>
            <button class="btn btn-outline btn-lg" id="landing-hero-hr-btn">
              💼 Explainable Matching (HR)
            </button>
          </div>
        </div>

        <!-- Ecosystem Flow Diagram -->
        <div class="card" style="margin-bottom:3.5rem; background:linear-gradient(180deg, #FFFFFF 0%, #F8FAFC 100%); border:1px solid var(--border);">
          <div style="text-align:center; margin-bottom:2rem;">
            <span style="font-size:0.8rem; font-weight:700; color:var(--secondary); text-transform:uppercase; letter-spacing:1px;">End-to-End Platform Journey</span>
            <h3 style="font-size:1.6rem; font-weight:800; color:var(--primary); margin-top:0.25rem;">The Connected Growth Pipeline</h3>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem; position:relative;">
            <div style="background:#fff; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; text-align:center; box-shadow:var(--shadow-sm);">
              <div style="font-size:1.6rem; margin-bottom:0.5rem;">💡</div>
              <h4 style="font-size:1rem; font-weight:700; color:var(--primary);">1. Idea</h4>
              <p style="font-size:0.8rem; color:var(--text-muted);">Founder inputs problem, market, and business model</p>
            </div>
            <div style="background:#fff; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; text-align:center; box-shadow:var(--shadow-sm);">
              <div style="font-size:1.6rem; margin-bottom:0.5rem;">🤖</div>
              <h4 style="font-size:1rem; font-weight:700; color:var(--primary);">2. AI Copilot</h4>
              <p style="font-size:0.8rem; color:var(--text-muted);">Structures feasibility, unit economics & 90-day plan</p>
            </div>
            <div style="background:#fff; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; text-align:center; box-shadow:var(--shadow-sm);">
              <div style="font-size:1.6rem; margin-bottom:0.5rem;">🦈</div>
              <h4 style="font-size:1rem; font-weight:700; color:var(--primary);">3. Investment</h4>
              <p style="font-size:0.8rem; color:var(--text-muted);">Investors review AI risk analysis & express interest</p>
            </div>
            <div style="background:#fff; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; text-align:center; box-shadow:var(--shadow-sm);">
              <div style="font-size:1.6rem; margin-bottom:0.5rem;">🛡️</div>
              <h4 style="font-size:1rem; font-weight:700; color:var(--primary);">4. Verified Talent</h4>
              <p style="font-size:0.8rem; color:var(--text-muted);">Candidates pass 75% proctored assessments</p>
            </div>
            <div style="background:#fff; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; text-align:center; box-shadow:var(--shadow-sm);">
              <div style="font-size:1.6rem; margin-bottom:0.5rem;">🎯</div>
              <h4 style="font-size:1rem; font-weight:700; color:var(--primary);">5. Matching</h4>
              <p style="font-size:0.8rem; color:var(--text-muted);">Explainable algorithm bridges skill gaps and hires</p>
            </div>
          </div>
        </div>

        <!-- 4 Role Cards Section -->
        <div style="margin-bottom:3.5rem;">
          <div style="text-align:center; margin-bottom:2rem;">
            <h3 style="font-size:1.8rem; font-weight:800; color:var(--primary);">Choose Your Ecosystem Role</h3>
            <p style="color:var(--text-muted); font-size:0.95rem;">Experience Idea2Impact tailored specifically to your stakeholder workflow:</p>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(270px, 1fr)); gap:1.5rem;">
            <!-- Candidate -->
            <div class="card" style="border-top:4px solid var(--secondary); display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <span class="badge" style="background:rgba(37, 99, 235, 0.1); color:var(--secondary); margin-bottom:0.75rem;">Candidate Mode</span>
                <h3 style="font-size:1.25rem; font-weight:800; color:var(--primary); margin-bottom:0.5rem;">Verified Skill Passport</h3>
                <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1rem;">
                  Take technical skill assessments, earn cryptographic verified badges at 75%+ score, and discover roles with transparent compatibility breakdowns.
                </p>
                <ul style="font-size:0.82rem; color:var(--text-main); list-style:none; display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1.25rem;">
                  <li>✓ 15-Min Proctored Skill Quizzes</li>
                  <li>✓ Shareable PDF Passport</li>
                  <li>✓ Personalized Learning Roadmap</li>
                </ul>
              </div>
              <button class="btn btn-secondary w-full" id="role-card-candidate-btn">Launch Candidate Portal →</button>
            </div>

            <!-- Founder -->
            <div class="card" style="border-top:4px solid var(--accent); display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <span class="badge" style="background:rgba(20, 184, 166, 0.1); color:var(--accent-dark); margin-bottom:0.75rem;">Founder Mode</span>
                <h3 style="font-size:1.25rem; font-weight:800; color:var(--primary); margin-bottom:0.5rem;">AI Startup Copilot</h3>
                <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1rem;">
                  Transform raw concepts into complete business proposals, evaluate feasibility dimensions, formulate hiring needs, and export private investor PDFs.
                </p>
                <ul style="font-size:0.82rem; color:var(--text-main); list-style:none; display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1.25rem;">
                  <li>✓ Automated Feasibility Scoring</li>
                  <li>✓ ReportLab PDF Proposal Export</li>
                  <li>✓ Controlled Investor Sharing</li>
                </ul>
              </div>
              <button class="btn btn-accent w-full" id="role-card-founder-btn">Launch Founder Studio →</button>
            </div>

            <!-- HR -->
            <div class="card" style="border-top:4px solid var(--primary); display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <span class="badge" style="background:rgba(20, 33, 61, 0.1); color:var(--primary); margin-bottom:0.75rem;">HR / Recruiter Mode</span>
                <h3 style="font-size:1.25rem; font-weight:800; color:var(--primary); margin-bottom:0.5rem;">Explainable Talent Matching</h3>
                <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1rem;">
                  Publish weighted job listings, filter candidates by proven skill assessments, and manage application stages from interview to offer letter.
                </p>
                <ul style="font-size:0.82rem; color:var(--text-main); list-style:none; display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1.25rem;">
                  <li>✓ Transparent Formula: (Matched / Total) * 100</li>
                  <li>✓ Stage Pipeline Kanban Board</li>
                  <li>✓ Interview Scheduler & Offer Delivery</li>
                </ul>
              </div>
              <button class="btn btn-primary w-full" id="role-card-hr-btn">Launch Recruiter Hub →</button>
            </div>

            <!-- Investor -->
            <div class="card" style="border-top:4px solid #F59E0B; display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <span class="badge" style="background:rgba(245, 158, 11, 0.1); color:#B45309; margin-bottom:0.75rem;">Investor / Sharks Mode</span>
                <h3 style="font-size:1.25rem; font-weight:800; color:var(--primary); margin-bottom:0.5rem;">Due Diligence Assistant</h3>
                <p style="font-size:0.88rem; color:var(--text-muted); margin-bottom:1rem;">
                  Review incoming proposals with AI-assisted risk highlights, question generators, and 1-click meeting requests to back high-conviction ventures.
                </p>
                <ul style="font-size:0.82rem; color:var(--text-main); list-style:none; display:flex; flex-direction:column; gap:0.4rem; margin-bottom:1.25rem;">
                  <li>✓ AI Risk & Assumption Analysis</li>
                  <li>✓ Custom Founder Interview Prompts</li>
                  <li>✓ Shark Interest & Pitch Meeting Requests</li>
                </ul>
              </div>
              <button class="btn btn-outline w-full" id="role-card-investor-btn" style="border-color:#F59E0B; color:#B45309;">Launch Investor Room →</button>
            </div>
          </div>
        </div>

        <!-- Live Platform Stats -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue">🎓</div>
            <div class="stat-info">
              <h3>${stats.candidate_count || 3}</h3>
              <p>Candidates in Talent Pool</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon teal">🛡️</div>
            <div class="stat-info">
              <h3>${stats.verified_skills_count || 6}</h3>
              <p>Verified Skill Credentials</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon navy">💼</div>
            <div class="stat-info">
              <h3>${stats.active_jobs_count || 3}</h3>
              <p>Active Job Openings</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">🚀</div>
            <div class="stat-info">
              <h3>${stats.startups_count || 2}</h3>
              <p>Startups Seeking Investment</p>
            </div>
          </div>
        </div>
      </div>
    `;

    // Wire up buttons
    const bindBtn = (id, role) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', () => { state.setRole(role); });
    };

    bindBtn('landing-hero-candidate-btn', 'candidate');
    bindBtn('landing-hero-founder-btn', 'founder');
    bindBtn('landing-hero-hr-btn', 'hr');
    bindBtn('role-card-candidate-btn', 'candidate');
    bindBtn('role-card-founder-btn', 'founder');
    bindBtn('role-card-hr-btn', 'hr');
    bindBtn('role-card-investor-btn', 'investor');
  }

  // =========================================================================
  // 2. CANDIDATE DASHBOARD (Section 6.2 & 2.1)
  // =========================================================================
  async renderCandidateDashboard() {
    const candidateId = state.activeUser.id;
    let passport = null;
    let jobs = [];
    let assessments = [];
    let applications = [];

    try {
      [passport, jobs, assessments, applications] = await Promise.all([
        api.getPassport(candidateId),
        api.getJobs(candidateId),
        api.getAssessments(),
        api.getMyApplications(candidateId)
      ]);
    } catch (e) {
      console.warn("Error fetching candidate data", e);
    }

    const currentTab = state.activeTab;

    this.appContainer.innerHTML = `
      <div class="container">
        <div class="dashboard-layout">
          <!-- Sidebar -->
          <div class="sidebar">
            <div class="user-badge-card">
              <img src="${passport?.candidate?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="user-avatar" alt="Avatar"/>
              <div class="user-info">
                <h4>${passport?.candidate?.full_name || 'Alex Rivera'}</h4>
                <p>Candidate Mode</p>
                <span class="badge badge-verified" style="margin-top:0.35rem; font-size:0.7rem;">
                  ✓ ${passport?.total_verified || 3} Verified Skills
                </span>
              </div>
            </div>

            <nav class="sidebar-nav">
              <button class="sidebar-link ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
                <span class="sidebar-link-content">📊 Overview</span>
              </button>
              <button class="sidebar-link ${currentTab === 'passport' ? 'active' : ''}" data-tab="passport">
                <span class="sidebar-link-content">🛡️ Skill Passport</span>
                <span class="sidebar-badge">${passport?.total_verified || 0}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'assessments' ? 'active' : ''}" data-tab="assessments">
                <span class="sidebar-link-content">⚡ Assessments</span>
                <span class="sidebar-badge">${assessments.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'jobs' ? 'active' : ''}" data-tab="jobs">
                <span class="sidebar-link-content">🎯 Recommended Jobs</span>
                <span class="sidebar-badge">${jobs.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'gap-analysis' ? 'active' : ''}" data-tab="gap-analysis">
                <span class="sidebar-link-content">📈 Skill Gap & Roadmap</span>
              </button>
              <button class="sidebar-link ${currentTab === 'applications' ? 'active' : ''}" data-tab="applications">
                <span class="sidebar-link-content">📬 Applications</span>
                <span class="sidebar-badge">${applications.length}</span>
              </button>
            </nav>
          </div>

          <!-- Main Content -->
          <div class="dashboard-content" id="candidate-content-area">
            ${this.renderCandidateTabContent(currentTab, { passport, jobs, assessments, applications, candidateId })}
          </div>
        </div>
      </div>
    `;

    // Sidebar navigation binding
    this.appContainer.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.addEventListener('click', () => {
        state.setTab(btn.dataset.tab);
      });
    });

    // Attach event listeners for Candidate interactions
    this.attachCandidateEvents({ passport, jobs, assessments, applications, candidateId });
  }

  renderCandidateTabContent(tab, data) {
    const { passport, jobs, assessments, applications, candidateId } = data;

    if (tab === 'overview') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Candidate Dashboard</h2>
            <p>Track verified competencies, take proctored quizzes, and view explainable job matching.</p>
          </div>
          <button class="btn btn-secondary" id="tab-btn-take-quiz">Take New Assessment</button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon teal">🛡️</div>
            <div class="stat-info">
              <h3>${passport?.total_verified || 0}</h3>
              <p>Verified Skills (75%+)</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">🎯</div>
            <div class="stat-info">
              <h3>${jobs.filter(j => j.match && j.match.score >= 75).length}</h3>
              <p>High Match Jobs</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-info">
              <h3>${applications.length}</h3>
              <p>Active Applications</p>
            </div>
          </div>
        </div>

        <!-- Quick Passport Preview -->
        <div class="passport-container" style="margin-top:0.5rem;">
          <div class="passport-header">
            <div>
              <span class="badge badge-verified" style="margin-bottom:0.5rem;">OFFICIAL CANDIDATE CREDENTIAL</span>
              <h2 style="font-size:1.8rem; font-weight:800; margin-bottom:0.25rem;">${passport?.candidate?.full_name}</h2>
              <p style="color:#94A3B8; font-size:0.9rem;">${passport?.profile?.target_role || 'Full-Stack Software Engineer'} • ${passport?.profile?.education || 'Computer Science'}</p>
            </div>
            <div style="text-align:right;">
              <div class="passport-id-badge">${passport?.passport_id}</div>
              <p style="font-size:0.75rem; color:var(--accent); margin-top:0.4rem;">Status: ${passport?.verification_status}</p>
            </div>
          </div>

          <div class="passport-skills-grid">
            ${(passport?.verified_skills || []).map(s => `
              <div class="passport-skill-card">
                <div class="passport-skill-top">
                  <span class="passport-skill-name">${s.name}</span>
                  <span class="passport-score-circle">${s.assessment_score}%</span>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; font-size:0.75rem; color:#94A3B8;">
                  <span>${s.category}</span>
                  <span>Verified: ${String(s.verified_at).substring(0, 10)}</span>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid rgba(255,255,255,0.1); padding-top:1rem;">
            <span style="font-size:0.8rem; color:#94A3B8;">Backed by proctored backend verification quizzes & integrity checks</span>
            <a href="${api.getPassportPdfUrl(candidateId)}" target="_blank" class="btn btn-sm btn-accent" download>
              📄 Download Official Passport PDF
            </a>
          </div>
        </div>
      `;
    }

    if (tab === 'passport') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Verified Skill Passport</h2>
            <p>Your tamper-evident competency passport demonstrating verified proof of ability.</p>
          </div>
          <a href="${api.getPassportPdfUrl(candidateId)}" target="_blank" class="btn btn-primary" download>
            📄 Download Verified PDF Passport
          </a>
        </div>

        <div class="passport-container">
          <div class="passport-header">
            <div>
              <span class="badge badge-verified" style="margin-bottom:0.5rem;">VERIFIED TALENT CREDENTIAL</span>
              <h2 style="font-size:2rem; font-weight:800; margin-bottom:0.25rem;">${passport?.candidate?.full_name}</h2>
              <p style="color:#CBD5E1; font-size:0.95rem;">${passport?.candidate?.email} • ${passport?.profile?.education}</p>
            </div>
            <div style="text-align:right;">
              <div class="passport-id-badge">${passport?.passport_id}</div>
              <p style="font-size:0.8rem; color:var(--accent); margin-top:0.5rem;">Issued: ${String(passport?.issued_at).substring(0, 10)}</p>
            </div>
          </div>

          <h4 style="font-size:1.1rem; font-weight:700; color:#F8FAFC; margin-bottom:1rem; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:0.5rem;">
            Verified Technical Competencies (Benchmark >= 75%)
          </h4>

          <div class="passport-skills-grid">
            ${(passport?.verified_skills || []).map(s => `
              <div class="passport-skill-card">
                <div class="passport-skill-top">
                  <span class="passport-skill-name">${s.name}</span>
                  <span class="passport-score-circle">${s.assessment_score}%</span>
                </div>
                <div style="font-size:0.75rem; color:#94A3B8;">
                  <div>Category: <b>${s.category}</b></div>
                  <div>Audit Timestamp: <b>${String(s.verified_at).substring(0, 10)}</b></div>
                  <div style="margin-top:0.25rem; font-family:var(--font-mono); font-size:0.7rem; color:var(--accent);">
                    ${s.badge_hash}
                  </div>
                </div>
              </div>
            `).join('')}
          </div>

          <div style="background:rgba(0,0,0,0.25); border-radius:var(--radius-md); padding:1rem; font-size:0.82rem; color:#94A3B8; margin-top:1rem;">
            <b>Integrity Protocol:</b> Every verified badge is earned through timed assessment evaluation with backend score computation and focus/blur integrity telemetry. Verified badges cannot be manually self-declared.
          </div>
        </div>
      `;
    }

    if (tab === 'assessments') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Skill Verification Assessments</h2>
            <p>Score 75% or higher to earn an official verified badge on your Skill Passport.</p>
          </div>
          <span class="badge" style="background:rgba(20, 184, 166, 0.15); color:var(--accent-dark); border:1px solid var(--accent);">
            Anti-Cheat Proctored Focus Monitoring
          </span>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:1.25rem;">
          ${assessments.map(asm => {
            const isVerified = passport?.verified_skills?.some(vs => vs.skill_id === asm.skill_id);
            return `
              <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
                <div>
                  <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                    <span class="badge ${isVerified ? 'badge-verified' : 'badge-unverified'}">
                      ${isVerified ? '✓ Already Verified' : 'Unverified'}
                    </span>
                    <span style="font-size:0.8rem; color:var(--text-muted); font-weight:600;">⏱️ ${asm.duration_minutes} Mins</span>
                  </div>
                  <h3 style="font-size:1.15rem; font-weight:700; color:var(--primary); margin-bottom:0.5rem;">${asm.title}</h3>
                  <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
                    ${asm.question_count} proctored technical questions. Passing benchmark: <b>${asm.passing_score}%</b>.
                  </p>
                </div>
                <button class="btn ${isVerified ? 'btn-outline' : 'btn-secondary'} w-full start-quiz-btn" data-id="${asm.id}">
                  ${isVerified ? 'Retake Assessment' : 'Start Assessment Quiz →'}
                </button>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (tab === 'jobs') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Recommended Jobs & Explainable Fit</h2>
            <p>Transparent matching algorithm showing exact matched and missing skill weights.</p>
          </div>
          <span class="formula-tag">Match Score = (Matched Weight / Total Weight) * 100</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.25rem;">
          ${jobs.map(job => {
            const m = job.match;
            const scoreClass = m?.score >= 75 ? 'match-high' : m?.score >= 50 ? 'match-mid' : 'match-low';
            const hasApplied = applications.some(a => a.job_id === job.id);

            return `
              <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
                  <div>
                    <span class="badge badge-role" style="margin-bottom:0.35rem;">${job.company_name}</span>
                    <h3 style="font-size:1.3rem; font-weight:800; color:var(--primary);">${job.title}</h3>
                    <p style="font-size:0.85rem; color:var(--text-muted);">
                      📍 ${job.location} • 💼 ${job.experience_level} • 💰 $${job.salary_min?.toLocaleString()} - $${job.salary_max?.toLocaleString()}
                    </p>
                  </div>
                  <div style="display:flex; align-items:center; gap:0.75rem;">
                    <div class="match-percentage-badge ${scoreClass}">
                      ${m ? m.score : 0}% Match
                    </div>
                    <button class="btn ${hasApplied ? 'btn-outline' : 'btn-secondary'} apply-job-btn" data-id="${job.id}" ${hasApplied ? 'disabled' : ''}>
                      ${hasApplied ? '✓ Applied' : 'Apply with Passport'}
                    </button>
                  </div>
                </div>

                <p style="font-size:0.9rem; color:var(--text-main); margin-bottom:1rem; line-height:1.5;">
                  ${job.description}
                </p>

                <!-- Explainable Matching Breakdown (Section 10.1 & 15.2) -->
                <div class="match-score-box">
                  <div class="match-score-header">
                    <span style="font-size:0.85rem; font-weight:700; color:var(--primary);">
                      💡 Explainable Match Breakdown:
                    </span>
                    <span style="font-size:0.8rem; color:var(--text-muted);">
                      ${m?.matched_count || 0} of ${m?.total_required_count || 0} required skills verified
                    </span>
                  </div>

                  <p style="font-size:0.85rem; color:var(--text-main); margin-bottom:0.75rem;">
                    ${m?.explanation || 'Calculating compatibility...'}
                  </p>

                  <div class="match-skills-list">
                    ${(m?.matched_skills || []).map(ms => `
                      <span class="badge badge-verified">
                        ✓ ${ms.skill_name} (Weight: ${ms.weight}) - Score: ${ms.candidate_assessment_score}%
                      </span>
                    `).join('')}
                    ${(m?.missing_skills || []).map(ms => `
                      <span class="badge badge-unverified" style="color:var(--danger); border-color:var(--danger-bg);">
                        ✗ Missing: ${ms.skill_name} (Weight: ${ms.weight})
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (tab === 'gap-analysis') {
      const targetJob = jobs.find(j => j.match && j.match.missing_skills.length > 0) || jobs[0];
      const missing = targetJob?.match?.missing_skills || [];
      const roadmap = targetJob?.match?.learning_roadmap || [];

      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Skill-Gap Analysis & Learning Roadmap</h2>
            <p>Actionable guidance to bridge competency gaps and qualify for target roles.</p>
          </div>
        </div>

        <div class="card" style="margin-bottom:1.5rem;">
          <h3 style="font-size:1.15rem; font-weight:700; color:var(--primary); margin-bottom:0.5rem;">
            Target Role Comparison: <span style="color:var(--secondary);">${targetJob?.title}</span> (${targetJob?.company_name})
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
            Current Verified Score: <b>${targetJob?.match?.score}%</b>. Complete the following roadmap items to reach 100% verified compatibility:
          </p>

          ${roadmap.length === 0 ? `
            <div style="background:var(--success-bg); color:var(--success); padding:1rem; border-radius:var(--radius-md); font-weight:600;">
              🎉 Full Alignment! You have satisfied all required skills for this opening!
            </div>
          ` : `
            <div style="display:flex; flex-direction:column; gap:1rem;">
              ${roadmap.map((item, idx) => `
                <div style="border:1px solid var(--border); border-left:4px solid var(--secondary); border-radius:var(--radius-md); padding:1rem; background:#fff;">
                  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem;">
                    <h4 style="font-size:1rem; font-weight:700; color:var(--primary);">
                      Step ${idx + 1}: Master ${item.skill_name}
                    </h4>
                    <span class="badge badge-risk-mod">${item.urgency} Urgency</span>
                  </div>
                  <p style="font-size:0.85rem; color:var(--text-main); margin-bottom:0.4rem;">
                    📚 <b>Curated Resource:</b> ${item.suggested_resource}
                  </p>
                  <p style="font-size:0.85rem; color:var(--text-main); margin-bottom:0.75rem;">
                    🛠️ <b>Hands-on Project:</b> ${item.practice_project}
                  </p>
                  <button class="btn btn-outline btn-sm roadmap-assess-btn" data-skill="${item.skill_name}">
                    ⚡ ${item.assessment_cta}
                  </button>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      `;
    }

    if (tab === 'applications') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>My Applications & Interviews</h2>
            <p>Real-time recruitment pipeline status and interview calendar.</p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          ${applications.length === 0 ? `
            <div class="card" style="text-align:center; padding:3rem;">
              <p style="color:var(--text-muted);">You haven't applied to any roles yet.</p>
              <button class="btn btn-secondary" style="margin-top:1rem;" id="jump-to-jobs-btn">Browse Jobs →</button>
            </div>
          ` : applications.map(app => `
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem;">
                <div>
                  <span class="badge badge-role" style="margin-bottom:0.35rem;">${app.company_name}</span>
                  <h3 style="font-size:1.2rem; font-weight:700; color:var(--primary);">${app.job_title}</h3>
                  <p style="font-size:0.85rem; color:var(--text-muted);">
                    Applied on ${String(app.applied_at).substring(0, 10)} • Compensation: ${app.salary}
                  </p>
                </div>
                <div style="text-align:right;">
                  <span class="badge" style="background:rgba(37, 99, 235, 0.1); color:var(--secondary); font-size:0.85rem; padding:0.35rem 0.85rem;">
                    Stage: ${app.status}
                  </span>
                </div>
              </div>

              ${app.interview_date ? `
                <div style="margin-top:1rem; background:rgba(20, 184, 166, 0.1); border:1px solid var(--accent); border-radius:var(--radius-md); padding:0.85rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
                  <div>
                    <span style="font-weight:700; color:var(--accent-dark); font-size:0.9rem;">📅 Interview Scheduled:</span>
                    <span style="font-size:0.85rem; color:var(--text-main); margin-left:0.5rem;">${new Date(app.interview_date).toLocaleString()}</span>
                  </div>
                  <a href="https://meet.google.com/interview-session" target="_blank" class="btn btn-accent btn-sm">
                    Join Video Call →
                  </a>
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    return '';
  }

  attachCandidateEvents(data) {
    const { assessments, candidateId } = data;

    // Start Quiz Buttons
    this.appContainer.querySelectorAll('.start-quiz-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const asmId = btn.dataset.id;
        await this.openAssessmentModal(asmId, candidateId);
      });
    });

    const quizTopBtn = this.appContainer.querySelector('#tab-btn-take-quiz');
    if (quizTopBtn && assessments.length > 0) {
      quizTopBtn.addEventListener('click', async () => {
        await this.openAssessmentModal(assessments[0].id, candidateId);
      });
    }

    // Apply Buttons
    this.appContainer.querySelectorAll('.apply-job-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const jobId = btn.dataset.id;
        try {
          await api.applyJob(jobId, { candidate_id: candidateId, notes: "Application submitted with verified passport credentials" });
          state.showToast("Application submitted successfully with your Verified Skill Passport!", "success");
          state.setTab('applications');
        } catch (e) {
          state.showToast(e.message, 'danger');
        }
      });
    });

    const jumpBtn = this.appContainer.querySelector('#jump-to-jobs-btn');
    if (jumpBtn) {
      jumpBtn.addEventListener('click', () => state.setTab('jobs'));
    }

    this.appContainer.querySelectorAll('.roadmap-assess-btn').forEach(btn => {
      btn.addEventListener('click', () => state.setTab('assessments'));
    });
  }

  // =========================================================================
  // INTERACTIVE ASSESSMENT QUIZ MODAL WITH INTEGRITY TRACKING (Section 12)
  // =========================================================================
  async openAssessmentModal(assessmentId, candidateId) {
    let asm = null;
    try {
      asm = await api.getAssessment(assessmentId);
    } catch (e) {
      state.showToast("Could not load assessment questions", "danger");
      return;
    }

    // Start exam session & integrity monitor
    state.startExam();

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width:700px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; border-bottom:1px solid var(--border); padding-bottom:1rem;">
          <div>
            <span class="badge" style="background:var(--warning-bg); color:var(--warning); margin-bottom:0.25rem;">
              PROCTORED ASSESSMENT (75% PASS)
            </span>
            <h3 style="font-size:1.3rem; font-weight:800; color:var(--primary);">${asm.title}</h3>
          </div>
          <div style="text-align:right;">
            <div style="font-family:var(--font-mono); font-size:1.1rem; font-weight:800; color:var(--secondary);" id="exam-timer">15:00</div>
            <span style="font-size:0.75rem; color:var(--text-muted);">Integrity monitor active</span>
          </div>
        </div>

        <form id="quiz-form">
          <div style="display:flex; flex-direction:column; gap:1.5rem;">
            ${asm.questions.map((q, qIndex) => `
              <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
                <p style="font-weight:700; color:var(--primary); margin-bottom:0.85rem; font-size:0.95rem;">
                  Q${qIndex + 1}. ${q.text}
                </p>
                <div style="display:flex; flex-direction:column; gap:0.5rem;">
                  ${q.options.map((opt, optIndex) => `
                    <label class="quiz-option" for="q_${q.id}_${optIndex}">
                      <input type="radio" name="${q.id}" id="q_${q.id}_${optIndex}" value="${optIndex}" required />
                      <span style="font-size:0.9rem;">${opt}</span>
                    </label>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem; border-top:1px solid var(--border); padding-top:1rem;">
            <button type="button" class="btn btn-outline" id="cancel-exam-btn">Cancel</button>
            <button type="submit" class="btn btn-secondary btn-lg" id="submit-exam-btn">
              Submit Assessment & Grade Backend →
            </button>
          </div>
        </form>
      </div>
    `;

    document.body.appendChild(overlay);

    // Timer countdown
    let timeLeft = asm.duration_minutes * 60;
    const timerEl = overlay.querySelector('#exam-timer');
    const timerInterval = setInterval(() => {
      timeLeft -= 1;
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      if (timerEl) timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        overlay.querySelector('#quiz-form').requestSubmit();
      }
    }, 1000);

    // Cancel Button
    overlay.querySelector('#cancel-exam-btn').addEventListener('click', () => {
      clearInterval(timerInterval);
      state.stopExam();
      overlay.remove();
    });

    // Form Submit
    overlay.querySelector('#quiz-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      clearInterval(timerInterval);
      const switches = state.stopExam();

      const formData = new FormData(e.target);
      const answers = {};
      for (const [key, value] of formData.entries()) {
        answers[key] = parseInt(value, 10);
      }

      try {
        const result = await api.submitAssessment(asm.id, {
          candidate_id: candidateId,
          answers: answers,
          flags: [`tab_switches: ${switches}`, switches > 2 ? 'suspicious_activity' : 'clean_session']
        });

        overlay.remove();
        this.openAssessmentResultModal(result, asm.title);
        // Refresh state
        state.notify();
      } catch (err) {
        state.showToast(err.message, 'danger');
      }
    });
  }

  openAssessmentResultModal(result, title) {
    const isPassed = result.passed;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="text-align:center;">
        <div style="font-size:3.5rem; margin-bottom:1rem;">
          ${isPassed ? '🎉' : '📚'}
        </div>
        <h2 style="font-size:1.8rem; font-weight:800; color:var(--primary); margin-bottom:0.5rem;">
          ${isPassed ? 'Assessment Verified!' : 'Verification Benchmark Not Reached'}
        </h2>
        <p style="font-size:1rem; color:var(--text-muted); margin-bottom:1.5rem;">
          ${title}
        </p>

        <div style="background:${isPassed ? 'var(--success-bg)' : '#F1F5F9'}; border-radius:var(--radius-lg); padding:1.5rem; margin-bottom:1.5rem;">
          <div style="font-size:3rem; font-weight:800; color:${isPassed ? 'var(--success)' : 'var(--text-muted)'}; line-height:1;">
            ${result.score}%
          </div>
          <p style="font-size:0.85rem; font-weight:700; color:${isPassed ? 'var(--success)' : 'var(--text-muted)'}; margin-top:0.5rem;">
            ${isPassed ? 'VERIFIED BADGE AWARDED (Threshold: 75%)' : 'Passing Threshold: 75%'}
          </p>
        </div>

        <p style="font-size:0.9rem; color:var(--text-main); margin-bottom:1.5rem; text-align:left; background:#F8FAFC; padding:1rem; border-radius:var(--radius-md);">
          ${isPassed 
            ? 'Congratulations! Your score has been cryptographically recorded on your Verified Skill Passport. Employers and startup founders can now view this verified competency.' 
            : 'You scored below the 75% threshold required for official verification. Check out the skill gap learning roadmap to study recommended materials and retake the test!'}
        </p>

        <button class="btn btn-primary w-full" id="close-result-modal">
          ${isPassed ? 'View Updated Skill Passport →' : 'Continue to Dashboard'}
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    modal.querySelector('#close-result-modal').addEventListener('click', () => {
      modal.remove();
      state.setTab('passport');
    });
  }

  // =========================================================================
  // 3. FOUNDER DASHBOARD (Section 6.3 & 2.2)
  // =========================================================================
  async renderFounderDashboard() {
    const founderId = state.activeUser.id;
    let startups = [];
    let investors = [];
    let meetings = [];

    try {
      [startups, investors, meetings] = await Promise.all([
        api.getStartups(),
        api.getProfiles('investor'),
        api.getMeetings(founderId)
      ]);
    } catch (e) {
      console.warn("Founder data fetch error", e);
    }

    const currentTab = state.activeTab;
    const currentStartup = startups[0] || {
      id: "stp-01",
      name: "EcoTrace AI",
      tagline: "Autonomous carbon accounting and ESG supply-chain intelligence.",
      stage: "Seed",
      readiness_score: 92.5,
      valuation_ask: "$1,200,000 for 12% equity"
    };

    this.appContainer.innerHTML = `
      <div class="container">
        <div class="dashboard-layout">
          <!-- Sidebar -->
          <div class="sidebar">
            <div class="user-badge-card">
              <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150" class="user-avatar" alt="Founder"/>
              <div class="user-info">
                <h4>${state.activeUser.name}</h4>
                <p>Founder Mode</p>
                <span class="badge" style="background:rgba(20, 184, 166, 0.15); color:var(--accent-dark); margin-top:0.35rem; font-size:0.7rem;">
                  🚀 ${currentStartup.name}
                </span>
              </div>
            </div>

            <nav class="sidebar-nav">
              <button class="sidebar-link ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
                <span class="sidebar-link-content">📊 Startup Overview</span>
              </button>
              <button class="sidebar-link ${currentTab === 'ai-copilot' ? 'active' : ''}" data-tab="ai-copilot">
                <span class="sidebar-link-content">🤖 AI Startup Copilot</span>
              </button>
              <button class="sidebar-link ${currentTab === 'proposal' ? 'active' : ''}" data-tab="proposal">
                <span class="sidebar-link-content">📑 Business Proposal & PDF</span>
              </button>
              <button class="sidebar-link ${currentTab === 'investors' ? 'active' : ''}" data-tab="investors">
                <span class="sidebar-link-content">🦈 Investor Discovery</span>
                <span class="sidebar-badge">${investors.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'hire' ? 'active' : ''}" data-tab="hire">
                <span class="sidebar-link-content">💼 Team Requirements</span>
              </button>
              <button class="sidebar-link ${currentTab === 'meetings' ? 'active' : ''}" data-tab="meetings">
                <span class="sidebar-link-content">📅 Pitch Meetings</span>
                <span class="sidebar-badge">${meetings.length}</span>
              </button>
            </nav>
          </div>

          <!-- Main Content -->
          <div class="dashboard-content" id="founder-content-area">
            ${this.renderFounderTabContent(currentTab, { currentStartup, startups, investors, meetings, founderId })}
          </div>
        </div>
      </div>
    `;

    this.appContainer.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.addEventListener('click', () => state.setTab(btn.dataset.tab));
    });

    this.attachFounderEvents({ currentStartup, founderId });
  }

  renderFounderTabContent(tab, data) {
    const { currentStartup, investors, meetings, founderId } = data;

    if (tab === 'overview') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Founder Startup Studio</h2>
            <p>Structure your business, analyze feasibility dimensions, and coordinate with investors.</p>
          </div>
          <button class="btn btn-accent" id="jump-to-copilot-btn">🤖 Run AI Idea Analyzer</button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon teal">📈</div>
            <div class="stat-info">
              <h3>${currentStartup.readiness_score || 92.5}%</h3>
              <p>Founder Readiness Score</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">💰</div>
            <div class="stat-info">
              <h3 style="font-size:1.15rem;">${currentStartup.valuation_ask || '$1.2M Seed'}</h3>
              <p>Funding Target</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon navy">🦈</div>
            <div class="stat-info">
              <h3>${investors.length}</h3>
              <p>Target Investors</p>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:0.5rem;">
          <div class="card-header">
            <div>
              <span class="badge badge-role">${currentStartup.stage} Stage • ${currentStartup.industry}</span>
              <h3 class="card-title" style="margin-top:0.35rem;">${currentStartup.name}</h3>
              <p style="font-size:0.85rem; color:var(--text-muted);">${currentStartup.tagline}</p>
            </div>
            <a href="${api.getProposalPdfUrl(currentStartup.id)}" target="_blank" class="btn btn-outline btn-sm" download>
              📄 Download Proposal PDF
            </a>
          </div>

          <p style="font-size:0.9rem; color:var(--text-main); margin-bottom:1.5rem; line-height:1.6;">
            ${currentStartup.pitch}
          </p>

          <div style="background:#F8FAFC; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem;">
            <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary); margin-bottom:0.75rem;">
              Founder Readiness Checklist (Section 15.6)
            </h4>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:0.5rem; font-size:0.85rem;">
              <div>✓ Problem Statement Validated</div>
              <div>✓ Customer ICPs Formulated</div>
              <div>✓ Competitor Matrix Analyzed</div>
              <div>✓ Unit Economics Labeled</div>
              <div>✓ 90-Day Milestones Defined</div>
              <div>✓ Verified Hiring Profiles Drafted</div>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'ai-copilot') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>AI Startup Copilot & Idea Analyzer</h2>
            <p>Generate structured business breakdowns, competitive positioning, and feasibility scores.</p>
          </div>
        </div>

        <div class="card" style="margin-bottom:1.5rem;">
          <form id="ai-idea-form">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Startup / Idea Title</label>
                <input type="text" class="form-input" id="idea-title" value="EcoTrace AI" required />
              </div>
              <div class="form-group">
                <label class="form-label">Industry Sector</label>
                <input type="text" class="form-input" id="idea-industry" value="CleanTech / Enterprise AI" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Core Problem Statement</label>
              <textarea class="form-textarea" id="idea-problem" required>Enterprises spend months and hundreds of thousands of dollars on manual sustainability consulting with outdated spreadsheets that fail modern SEC and CSRD ESG compliance mandates.</textarea>
            </div>

            <div class="form-group">
              <label class="form-label">Proposed Solution Mechanism</label>
              <textarea class="form-textarea" id="idea-solution" required>An automated AI agent ingestion pipeline that connects directly to ERPs (SAP, NetSuite) and supply telemetry to calculate precise Scope 1, 2, and 3 emission metrics in real-time.</textarea>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Target Customers / ICP</label>
                <input type="text" class="form-input" id="idea-customers" value="Mid-to-large enterprise manufacturers, logistics operators, and consumer brands." required />
              </div>
              <div class="form-group">
                <label class="form-label">Business Model & Pricing</label>
                <input type="text" class="form-input" id="idea-model" value="B2B SaaS subscription tiered by supplier count ($24k - $96k ARR)." required />
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Cost Drivers</label>
                <input type="text" class="form-input" id="idea-costs" value="Cloud hosting, LLM inference API tokens, and engineering talent." />
              </div>
              <div class="form-group">
                <label class="form-label">Funding Assumptions & Ask</label>
                <input type="text" class="form-input" id="idea-funding" value="$1,200,000 Seed Round for 18-month runway to reach $1M ARR." />
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" id="run-copilot-btn" style="width:100%; margin-top:0.5rem;">
              ✨ Run AI Startup Copilot Analysis
            </button>
          </form>
        </div>

        <div id="ai-results-container"></div>
      `;
    }

    if (tab === 'proposal') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Business Proposal & ReportLab Export</h2>
            <p>Generate and share complete formal investment proposals with accredited funds.</p>
          </div>
          <a href="${api.getProposalPdfUrl(currentStartup.id)}" target="_blank" class="btn btn-secondary btn-lg" download>
            📄 Download Official Proposal PDF
          </a>
        </div>

        <div class="card">
          <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border); padding-bottom:1rem; margin-bottom:1rem;">
            <div>
              <span class="badge badge-role">STAGE: ${currentStartup.stage}</span>
              <h2 style="font-size:1.6rem; font-weight:800; color:var(--primary); margin-top:0.25rem;">${currentStartup.name}</h2>
              <p style="color:var(--text-muted); font-size:0.9rem;">${currentStartup.tagline}</p>
            </div>
            <div style="text-align:right;">
              <div style="font-size:1.3rem; font-weight:800; color:var(--secondary);">${currentStartup.valuation_ask}</div>
              <span style="font-size:0.8rem; color:var(--accent);">Confidential Pitch Draft</span>
            </div>
          </div>

          <div style="display:flex; flex-direction:column; gap:1.25rem;">
            <div>
              <h4 style="font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:0.25rem;">1. Executive Summary</h4>
              <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6;">${currentStartup.pitch}</p>
            </div>
            <div>
              <h4 style="font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:0.25rem;">2. Target Market & Feasibility</h4>
              <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6;">
                $18.4 Billion global climate accounting software market by 2030, accelerated by SEC Climate Disclosures and EU CSRD directives.
              </p>
            </div>
            <div>
              <h4 style="font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:0.25rem;">3. Technical Architecture</h4>
              <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6;">
                FastAPI asynchronous microservices, PostgreSQL with Row Level Security (RLS), and LLM agent prompt pipelines for automated emission factor mapping.
              </p>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'investors') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Investor Discovery & Pitch Sharing</h2>
            <p>Connect with accredited venture capital firms and angel syndicates.</p>
          </div>
        </div>

        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:1.25rem;">
          ${investors.map(inv => `
            <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
              <div>
                <div style="display:flex; align-items:center; gap:0.75rem; margin-bottom:0.75rem;">
                  <img src="${inv.avatar_url}" style="width:44px; height:44px; border-radius:var(--radius-full);" alt="Investor"/>
                  <div>
                    <h3 style="font-size:1.05rem; font-weight:700; color:var(--primary);">${inv.full_name}</h3>
                    <p style="font-size:0.8rem; color:var(--text-muted);">${inv.bio}</p>
                  </div>
                </div>
                <div style="font-size:0.82rem; color:var(--text-main); margin-bottom:1rem;">
                  <div>🎯 <b>Mandate:</b> AI, CleanTech, Enterprise SaaS</div>
                  <div>💰 <b>Ticket Size:</b> $100,000 - $1,000,000</div>
                </div>
              </div>
              <button class="btn btn-secondary w-full share-proposal-btn" data-investor="${inv.id}">
                📤 Share Private Proposal →
              </button>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (tab === 'hire') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Startup Job Requirement Generator</h2>
            <p>Draft technical roles and push them directly into the recruitment pipeline.</p>
          </div>
        </div>

        <div class="card">
          <form id="startup-job-form">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Job Title</label>
                <input type="text" class="form-input" id="st-job-title" value="Founding Full-Stack Platform Engineer" required />
              </div>
              <div class="form-group">
                <label class="form-label">Experience Level</label>
                <select class="form-select" id="st-job-exp">
                  <option>Mid-Level (2+ years)</option>
                  <option selected>Senior (4+ years)</option>
                  <option>Lead / Architect</option>
                </select>
              </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Min Salary ($)</label>
                <input type="number" class="form-input" id="st-job-min" value="120000" />
              </div>
              <div class="form-group">
                <label class="form-label">Max Salary ($)</label>
                <input type="number" class="form-input" id="st-job-max" value="150000" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Required Skills</label>
              <div style="display:flex; gap:0.5rem; flex-wrap:wrap;">
                <label class="badge badge-verified" style="padding:0.4rem 0.8rem; cursor:pointer;">
                  <input type="checkbox" checked /> Python & FastAPI (Weight: 0.4)
                </label>
                <label class="badge badge-verified" style="padding:0.4rem 0.8rem; cursor:pointer;">
                  <input type="checkbox" checked /> PostgreSQL & Database Design (Weight: 0.35)
                </label>
                <label class="badge badge-verified" style="padding:0.4rem 0.8rem; cursor:pointer;">
                  <input type="checkbox" checked /> Modern JavaScript & Frontend (Weight: 0.25)
                </label>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width:100%; margin-top:1rem;">
              🚀 Publish Requirement to Talent Pool
            </button>
          </form>
        </div>
      `;
    }

    if (tab === 'meetings') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Pitch Meetings & Investor Calls</h2>
            <p>Confirmed pitch sessions and due diligence syncs.</p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          ${meetings.length === 0 ? `
            <div class="card" style="text-align:center; padding:3rem;">
              <p style="color:var(--text-muted);">No pitch meetings scheduled yet.</p>
            </div>
          ` : meetings.map(m => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
              <div>
                <span class="badge" style="background:var(--success-bg); color:var(--success); margin-bottom:0.35rem;">${m.status}</span>
                <h3 style="font-size:1.15rem; font-weight:700; color:var(--primary);">${m.meeting_type}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted);">
                  📅 ${new Date(m.scheduled_at).toLocaleString()} • Agenda: ${m.agenda}
                </p>
              </div>
              <a href="${m.meeting_link}" target="_blank" class="btn btn-secondary">
                Join Call Room →
              </a>
            </div>
          `).join('')}
        </div>
      `;
    }

    return '';
  }

  attachFounderEvents(data) {
    const { currentStartup, founderId } = data;

    const jumpCopilot = this.appContainer.querySelector('#jump-to-copilot-btn');
    if (jumpCopilot) {
      jumpCopilot.addEventListener('click', () => state.setTab('ai-copilot'));
    }

    // AI Copilot Form
    const ideaForm = this.appContainer.querySelector('#ai-idea-form');
    if (ideaForm) {
      ideaForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const resultsContainer = this.appContainer.querySelector('#ai-results-container');
        resultsContainer.innerHTML = `
          <div class="card" style="text-align:center; padding:2.5rem;">
            <div style="font-size:2rem; margin-bottom:0.5rem;">🤖</div>
            <p style="font-weight:700; color:var(--primary);">AI Startup Copilot is analyzing market dimensions, feasibility radar, and financial assumptions...</p>
          </div>
        `;

        try {
          const payload = {
            title: document.getElementById('idea-title').value,
            industry: document.getElementById('idea-industry').value,
            problem: document.getElementById('idea-problem').value,
            solution: document.getElementById('idea-solution').value,
            target_customers: document.getElementById('idea-customers').value,
            business_model: document.getElementById('idea-model').value,
            known_costs: document.getElementById('idea-costs').value,
            funding_assumptions: document.getElementById('idea-funding').value
          };

          const analysis = await api.analyzeIdea(payload);
          this.renderAiCopilotAnalysis(analysis, resultsContainer);
          state.showToast("AI Feasibility & Startup Plan generated!", "success");
        } catch (err) {
          state.showToast(err.message, 'danger');
        }
      });
    }

    // Share Proposal Buttons
    this.appContainer.querySelectorAll('.share-proposal-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const invId = btn.dataset.investor;
        try {
          await api.shareProposal(currentStartup.id, {
            founder_id: founderId,
            investor_id: invId,
            startup_id: currentStartup.id
          });
          state.showToast("Private proposal securely shared with Investor!", "success");
        } catch (e) {
          state.showToast(e.message, 'danger');
        }
      });
    });

    // Startup Job Form
    const jobForm = this.appContainer.querySelector('#startup-job-form');
    if (jobForm) {
      jobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.createJob({
            created_by: founderId,
            company_name: currentStartup.name,
            title: document.getElementById('st-job-title').value,
            description: `Key founding engineer for ${currentStartup.name}. High equity and growth potential.`,
            experience_level: document.getElementById('st-job-exp').value,
            salary_min: parseInt(document.getElementById('st-job-min').value, 10),
            salary_max: parseInt(document.getElementById('st-job-max').value, 10),
            location: "San Francisco, CA / Remote",
            required_skills: [
              { skill_id: "sk-01", is_required: true, weight: 0.4 },
              { skill_id: "sk-02", is_required: true, weight: 0.35 },
              { skill_id: "sk-03", is_required: true, weight: 0.25 }
            ]
          });
          state.showToast("Job requirements published to talent pool!", "success");
          state.setTab('overview');
        } catch (err) {
          state.showToast(err.message, 'danger');
        }
      });
    }
  }

  renderAiCopilotAnalysis(analysis, container) {
    const dims = analysis.dimensions || {};
    container.innerHTML = `
      <div class="card" style="border-top:4px solid var(--accent); margin-top:1.5rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <span class="badge" style="background:var(--accent-light); color:var(--accent-dark); margin-bottom:0.25rem;">
              AI COPILOT ANALYSIS COMPLETE
            </span>
            <h3 style="font-size:1.6rem; font-weight:800; color:var(--primary);">${analysis.title}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted);">${analysis.industry}</p>
          </div>
          <div style="text-align:right;">
            <div style="font-size:2rem; font-weight:800; color:var(--accent-dark);">${analysis.feasibility_score}%</div>
            <span style="font-size:0.75rem; color:var(--text-muted);">Composite Feasibility Score</span>
          </div>
        </div>

        <!-- 5 Dimensions Radar Breakdown (Section 2.2) -->
        <div style="background:#F8FAFC; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1.5rem;">
          <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary); margin-bottom:1rem;">
            Multidimensional Feasibility Assessment:
          </h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:1rem;">
            <div>
              <div class="flex justify-between" style="font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
                <span>Market Demand</span><span>${dims.market_demand}%</span>
              </div>
              <div style="background:#E2E8F0; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:var(--secondary); height:100%; width:${dims.market_demand}%;"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between" style="font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
                <span>Technical Viability</span><span>${dims.technical_viability}%</span>
              </div>
              <div style="background:#E2E8F0; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:var(--accent); height:100%; width:${dims.technical_viability}%;"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between" style="font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
                <span>Financial Sustainability</span><span>${dims.financial_sustainability}%</span>
              </div>
              <div style="background:#E2E8F0; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:var(--success); height:100%; width:${dims.financial_sustainability}%;"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between" style="font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
                <span>Operational Execution</span><span>${dims.operational_execution}%</span>
              </div>
              <div style="background:#E2E8F0; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:var(--primary); height:100%; width:${dims.operational_execution}%;"></div>
              </div>
            </div>
            <div>
              <div class="flex justify-between" style="font-size:0.8rem; font-weight:600; margin-bottom:0.25rem;">
                <span>Defensibility</span><span>${dims.competitive_defensibility}%</span>
              </div>
              <div style="background:#E2E8F0; height:8px; border-radius:4px; overflow:hidden;">
                <div style="background:#8B5CF6; height:100%; width:${dims.competitive_defensibility}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Executive Summary & Problem-Solution Fit -->
        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:0.5rem;">Executive Thesis</h4>
          <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6; margin-bottom:1rem;">
            ${analysis.executive_summary}
          </p>
        </div>

        <!-- Competitor Landscape -->
        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:0.75rem;">Competitor Differentiation Matrix</h4>
          <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(240px, 1fr)); gap:1rem;">
            ${(analysis.competitive_landscape || []).map(comp => `
              <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem;">
                <span class="badge" style="background:#F1F5F9; color:var(--primary); margin-bottom:0.5rem;">${comp.category}</span>
                <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:0.5rem;">${comp.description}</p>
                <p style="font-size:0.82rem; color:var(--secondary); font-weight:600;">✨ ${comp.differentiation}</p>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- 90 Day Milestones -->
        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:0.75rem;">90-Day Execution Milestones</h4>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${(analysis.milestones_90_days || []).map(m => `
              <div style="display:flex; align-items:center; gap:0.75rem; background:#F8FAFC; padding:0.75rem 1rem; border-radius:var(--radius-md);">
                <span class="badge badge-verified" style="font-size:0.75rem;">${m.day}</span>
                <span style="font-size:0.85rem; color:var(--text-main); font-weight:600;">${m.goal}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <button class="btn btn-secondary" id="save-to-proposal-btn">
          💾 Save to Official Business Proposal
        </button>
      </div>
    `;

    container.querySelector('#save-to-proposal-btn').addEventListener('click', () => {
      state.showToast("Analysis saved to Business Proposal!", "success");
      state.setTab('proposal');
    });
  }

  // =========================================================================
  // 4. HR / RECRUITER DASHBOARD (Section 6.4 & 2.3)
  // =========================================================================
  async renderHrDashboard() {
    const hrId = state.activeUser.id;
    let jobs = [];
    let candidates = [];
    let applications = [];

    try {
      [jobs, candidates] = await Promise.all([
        api.getJobs(),
        api.getProfiles('candidate')
      ]);
      if (jobs.length > 0) {
        applications = await api.request(`/applications/job/${jobs[0].id}`).catch(() => []);
      }
    } catch (e) {
      console.warn("HR fetch error", e);
    }

    const currentTab = state.activeTab;

    this.appContainer.innerHTML = `
      <div class="container">
        <div class="dashboard-layout">
          <!-- Sidebar -->
          <div class="sidebar">
            <div class="user-badge-card">
              <img src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150" class="user-avatar" alt="HR"/>
              <div class="user-info">
                <h4>${state.activeUser.name}</h4>
                <p>HR Mode</p>
                <span class="badge badge-role" style="margin-top:0.35rem; font-size:0.7rem;">
                  NovaTech Talent Team
                </span>
              </div>
            </div>

            <nav class="sidebar-nav">
              <button class="sidebar-link ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
                <span class="sidebar-link-content">📊 Pipeline Overview</span>
              </button>
              <button class="sidebar-link ${currentTab === 'create-job' ? 'active' : ''}" data-tab="create-job">
                <span class="sidebar-link-content">➕ Post New Job</span>
              </button>
              <button class="sidebar-link ${currentTab === 'candidates' ? 'active' : ''}" data-tab="candidates">
                <span class="sidebar-link-content">🎯 Candidate Matching</span>
                <span class="sidebar-badge">${candidates.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'pipeline' ? 'active' : ''}" data-tab="pipeline">
                <span class="sidebar-link-content">📋 Application Kanban</span>
                <span class="sidebar-badge">${applications.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'interviews' ? 'active' : ''}" data-tab="interviews">
                <span class="sidebar-link-content">📅 Interviews & Offers</span>
              </button>
            </nav>
          </div>

          <!-- Main Content -->
          <div class="dashboard-content" id="hr-content-area">
            ${this.renderHrTabContent(currentTab, { jobs, candidates, applications, hrId })}
          </div>
        </div>
      </div>
    `;

    this.appContainer.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.addEventListener('click', () => state.setTab(btn.dataset.tab));
    });

    this.attachHrEvents({ jobs, candidates, hrId });
  }

  renderHrTabContent(tab, data) {
    const { jobs, candidates, applications, hrId } = data;

    if (tab === 'overview') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Technical Recruitment Portal</h2>
            <p>Filter candidates by verified skill badges and review explainable compatibility scores.</p>
          </div>
          <button class="btn btn-secondary" id="hr-top-post-btn">+ Create Job Opening</button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon blue">💼</div>
            <div class="stat-info">
              <h3>${jobs.length}</h3>
              <p>Active Job Listings</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon teal">🎓</div>
            <div class="stat-info">
              <h3>${candidates.length}</h3>
              <p>Verified Candidates</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon green">📬</div>
            <div class="stat-info">
              <h3>${applications.length}</h3>
              <p>Candidates in Pipeline</p>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:0.5rem;">
          <h3 class="card-title" style="margin-bottom:1rem;">Active Job Openings</h3>
          <div style="display:flex; flex-direction:column; gap:1rem;">
            ${jobs.map(j => `
              <div style="border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
                <div>
                  <h4 style="font-size:1.1rem; font-weight:700; color:var(--primary);">${j.title}</h4>
                  <p style="font-size:0.85rem; color:var(--text-muted);">
                    ${j.company_name} • ${j.location} • Compensation: $${j.salary_min?.toLocaleString()} - $${j.salary_max?.toLocaleString()}
                  </p>
                </div>
                <button class="btn btn-outline btn-sm view-matches-btn" data-job="${j.id}">
                  🎯 View Matched Candidates →
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    if (tab === 'create-job') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Post New Technical Job Listing</h2>
            <p>Specify required technical skills with custom mathematical weights for explainable matching.</p>
          </div>
        </div>

        <div class="card">
          <form id="hr-create-job-form">
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Job Title</label>
                <input type="text" class="form-input" id="hr-job-title" value="Senior Backend & Distributed Systems Engineer" required />
              </div>
              <div class="form-group">
                <label class="form-label">Company Name</label>
                <input type="text" class="form-input" id="hr-company-name" value="NovaTech Systems" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Job Description</label>
              <textarea class="form-textarea" id="hr-job-desc" required>Architect and optimize high-throughput distributed microservices in Python, design scalable PostgreSQL relational schemas, and maintain secure token authentication.</textarea>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Experience Level</label>
                <select class="form-select" id="hr-job-exp">
                  <option selected>Senior (4+ years)</option>
                  <option>Mid-Level (2+ years)</option>
                  <option>Lead Engineer</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Min Salary ($)</label>
                <input type="number" class="form-input" id="hr-salary-min" value="130000" />
              </div>
              <div class="form-group">
                <label class="form-label">Max Salary ($)</label>
                <input type="number" class="form-input" id="hr-salary-max" value="170000" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Required Skills & Weight Allocation (Total: 1.0)</label>
              <div style="display:flex; flex-direction:column; gap:0.5rem; background:#F8FAFC; padding:1rem; border-radius:var(--radius-md);">
                <label class="flex items-center gap-2" style="font-size:0.9rem;">
                  <input type="checkbox" checked disabled /> <b>Python & FastAPI</b> — Weight: 0.40 (Mandatory)
                </label>
                <label class="flex items-center gap-2" style="font-size:0.9rem;">
                  <input type="checkbox" checked disabled /> <b>PostgreSQL & Database Design</b> — Weight: 0.35 (Mandatory)
                </label>
                <label class="flex items-center gap-2" style="font-size:0.9rem;">
                  <input type="checkbox" checked disabled /> <b>Modern JavaScript & Frontend</b> — Weight: 0.25 (Mandatory)
                </label>
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width:100%; margin-top:1rem;">
              💼 Publish Job Opening to Platform
            </button>
          </form>
        </div>
      `;
    }

    if (tab === 'candidates') {
      const selectedJob = jobs[0] || { id: 'job-01', title: 'Senior Full-Stack Engineer' };
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Explainable Candidate Matching</h2>
            <p>Mathematical compatibility ranking based strictly on verified technical assessments.</p>
          </div>
          <span class="formula-tag">Match Score = (Matched Weight / Total Weight) * 100</span>
        </div>

        <div style="margin-bottom:1rem; display:flex; align-items:center; gap:0.75rem;">
          <span style="font-size:0.85rem; font-weight:700;">Evaluating For Job:</span>
          <select class="form-select" id="hr-job-selector" style="max-width:350px;">
            ${jobs.map(j => `<option value="${j.id}" ${j.id === selectedJob.id ? 'selected' : ''}>${j.title}</option>`).join('')}
          </select>
        </div>

        <div id="hr-candidate-matches-list" style="display:flex; flex-direction:column; gap:1.25rem;">
          <div class="card" style="text-align:center; padding:2rem;">
            Loading explainable candidate matches...
          </div>
        </div>
      `;
    }

    if (tab === 'pipeline') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Candidate Application Kanban Pipeline</h2>
            <p>Manage candidate stages from initial application to offer letter.</p>
          </div>
        </div>

        <div class="kanban-board">
          <div class="kanban-col">
            <div class="kanban-col-title">
              <span>Applied</span>
              <span class="badge" style="background:#E2E8F0;">1</span>
            </div>
            <div class="kanban-item">
              <b>Jordan Lee</b>
              <span style="font-size:0.75rem; color:var(--text-muted);">Frontend Engineer</span>
              <button class="btn btn-sm btn-outline advance-stage-btn" data-app="app-03" data-next="Under Review">Advance →</button>
            </div>
          </div>

          <div class="kanban-col">
            <div class="kanban-col-title">
              <span>Under Review</span>
              <span class="badge" style="background:#E2E8F0;">0</span>
            </div>
          </div>

          <div class="kanban-col">
            <div class="kanban-col-title">
              <span>Shortlisted</span>
              <span class="badge" style="background:var(--accent-light); color:var(--accent-dark);">1</span>
            </div>
            <div class="kanban-item">
              <b>Priya Sharma</b>
              <span style="font-size:0.75rem; color:var(--text-muted);">AI Systems (85% Match)</span>
              <button class="btn btn-sm btn-secondary advance-stage-btn" data-app="app-02" data-next="Interview">Schedule Interview →</button>
            </div>
          </div>

          <div class="kanban-col">
            <div class="kanban-col-title">
              <span>Interview Scheduled</span>
              <span class="badge" style="background:var(--secondary); color:#fff;">1</span>
            </div>
            <div class="kanban-item">
              <b>Alex Rivera</b>
              <span style="font-size:0.75rem; color:var(--text-muted);">Full-Stack (100% Match)</span>
              <span style="font-size:0.7rem; color:var(--success);">📅 March 12, 5:00 PM</span>
              <button class="btn btn-sm btn-accent advance-stage-btn" data-app="app-01" data-next="Offer Sent">Extend Offer Letter →</button>
            </div>
          </div>

          <div class="kanban-col">
            <div class="kanban-col-title">
              <span>Offer Extended</span>
              <span class="badge" style="background:var(--success-bg); color:var(--success);">0</span>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'interviews') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Scheduled Interviews & Offer Letters</h2>
            <p>Coordinate calendar slots and share formalized employment offers.</p>
          </div>
        </div>

        <div class="card">
          <h3 class="card-title" style="margin-bottom:1rem;">Active Technical Interviews</h3>
          <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border); padding:1rem; border-radius:var(--radius-md); flex-wrap:wrap; gap:1rem;">
            <div>
              <span class="badge badge-verified">CONFIRMED INTERVIEW</span>
              <h4 style="font-size:1.1rem; font-weight:700; color:var(--primary); margin-top:0.25rem;">Alex Rivera — Senior Full-Stack Engineer</h4>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                Scheduled: March 12, 2026 at 5:00 PM UTC • Agenda: Async Python architecture & PostgreSQL indexing
              </p>
            </div>
            <a href="https://meet.google.com/nova-tech-interview" target="_blank" class="btn btn-secondary">
              Open Google Meet Room →
            </a>
          </div>
        </div>
      `;
    }

    return '';
  }

  async attachHrEvents(data) {
    const { jobs, hrId } = data;

    const topPostBtn = this.appContainer.querySelector('#hr-top-post-btn');
    if (topPostBtn) topPostBtn.addEventListener('click', () => state.setTab('create-job'));

    // Create Job Form
    const createJobForm = this.appContainer.querySelector('#hr-create-job-form');
    if (createJobForm) {
      createJobForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api.createJob({
            created_by: hrId,
            company_name: document.getElementById('hr-company-name').value,
            title: document.getElementById('hr-job-title').value,
            description: document.getElementById('hr-job-desc').value,
            experience_level: document.getElementById('hr-job-exp').value,
            salary_min: parseInt(document.getElementById('hr-salary-min').value, 10),
            salary_max: parseInt(document.getElementById('hr-salary-max').value, 10),
            location: "San Francisco, CA / Remote",
            required_skills: [
              { skill_id: "sk-01", is_required: true, weight: 0.40 },
              { skill_id: "sk-02", is_required: true, weight: 0.35 },
              { skill_id: "sk-03", is_required: true, weight: 0.25 }
            ]
          });
          state.showToast("Job successfully created and published!", "success");
          state.setTab('overview');
        } catch (err) {
          state.showToast(err.message, 'danger');
        }
      });
    }

    // Candidate Matching Tab logic
    const matchesList = this.appContainer.querySelector('#hr-candidate-matches-list');
    const jobSelector = this.appContainer.querySelector('#hr-job-selector');
    if (matchesList && jobSelector) {
      const loadMatches = async (jobId) => {
        matchesList.innerHTML = `<p style="color:var(--text-muted);">Calculating explainable match scores...</p>`;
        try {
          const matches = await api.getJobMatches(jobId);
          matchesList.innerHTML = matches.map(m => {
            const cand = m.candidate;
            const match = m.match;
            const scoreClass = match.score >= 75 ? 'match-high' : match.score >= 50 ? 'match-mid' : 'match-low';

            return `
              <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
                  <div class="flex items-center gap-3">
                    <img src="${cand.avatar_url}" style="width:48px; height:48px; border-radius:var(--radius-full);" alt="Avatar"/>
                    <div>
                      <h3 style="font-size:1.2rem; font-weight:700; color:var(--primary);">${cand.full_name}</h3>
                      <p style="font-size:0.85rem; color:var(--text-muted);">${m.profile?.target_role || 'Engineer'} • ${m.profile?.education || ''}</p>
                    </div>
                  </div>
                  <div class="flex items-center gap-3">
                    <div class="match-percentage-badge ${scoreClass}">
                      ${match.score}% Match
                    </div>
                    <button class="btn btn-secondary btn-sm hr-interview-btn" data-cand="${cand.id}" data-name="${cand.full_name}">
                      Schedule Interview →
                    </button>
                  </div>
                </div>

                <!-- Explainable Breakdown -->
                <div class="match-score-box">
                  <div class="match-score-header">
                    <span style="font-weight:700; font-size:0.85rem; color:var(--primary);">
                      💡 Verification Breakdown: ${match.matched_count} of ${match.total_required_count} required skills verified
                    </span>
                    <a href="${api.getPassportPdfUrl(cand.id)}" target="_blank" style="font-size:0.8rem; font-weight:600; color:var(--secondary);" download>
                      Inspect Verified Passport PDF ↗
                    </a>
                  </div>
                  <p style="font-size:0.85rem; color:var(--text-main); margin-bottom:0.75rem;">
                    ${match.explanation}
                  </p>
                  <div class="match-skills-list">
                    ${match.matched_skills.map(ms => `
                      <span class="badge badge-verified">
                        ✓ ${ms.skill_name} (${ms.weight * 100}% weight) - Score: ${ms.candidate_assessment_score}%
                      </span>
                    `).join('')}
                    ${match.missing_skills.map(ms => `
                      <span class="badge badge-unverified" style="color:var(--danger);">
                        ✗ Missing: ${ms.skill_name} (${ms.weight * 100}% weight)
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>
            `;
          }).join('');

          // Bind schedule buttons
          matchesList.querySelectorAll('.hr-interview-btn').forEach(b => {
            b.addEventListener('click', () => {
              const candName = b.dataset.name;
              state.showToast(`Interview invitation sent to ${candName}!`, 'success');
              state.setTab('pipeline');
            });
          });
        } catch (e) {
          matchesList.innerHTML = `<p style="color:var(--danger);">${e.message}</p>`;
        }
      };

      await loadMatches(jobSelector.value);
      jobSelector.addEventListener('change', (e) => loadMatches(e.target.value));
    }

    // Advance Stage Buttons in Kanban
    this.appContainer.querySelectorAll('.advance-stage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const next = btn.dataset.next;
        state.showToast(`Candidate stage advanced to: ${next}`, 'success');
      });
    });
  }

  // =========================================================================
  // 5. INVESTOR / SHARKS MODE DASHBOARD (Section 6.5 & 2.4)
  // =========================================================================
  async renderInvestorDashboard() {
    const investorId = state.activeUser.id;
    let startups = [];
    let interests = [];
    let meetings = [];

    try {
      [startups, interests, meetings] = await Promise.all([
        api.getStartups(),
        api.getInvestorInterests(investorId),
        api.getMeetings(investorId)
      ]);
    } catch (e) {
      console.warn("Investor fetch error", e);
    }

    const currentTab = state.activeTab;

    this.appContainer.innerHTML = `
      <div class="container">
        <div class="dashboard-layout">
          <!-- Sidebar -->
          <div class="sidebar">
            <div class="user-badge-card">
              <img src="https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150" class="user-avatar" alt="Investor"/>
              <div class="user-info">
                <h4>${state.activeUser.name}</h4>
                <p>Investor / Shark Mode</p>
                <span class="badge" style="background:rgba(245, 158, 11, 0.15); color:#B45309; margin-top:0.35rem; font-size:0.7rem;">
                  Apex Frontier Ventures
                </span>
              </div>
            </div>

            <nav class="sidebar-nav">
              <button class="sidebar-link ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
                <span class="sidebar-link-content">📊 Deal Flow Overview</span>
              </button>
              <button class="sidebar-link ${currentTab === 'startups' ? 'active' : ''}" data-tab="startups">
                <span class="sidebar-link-content">🔍 Discover Startups</span>
                <span class="sidebar-badge">${startups.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'ai-due-diligence' ? 'active' : ''}" data-tab="ai-due-diligence">
                <span class="sidebar-link-content">🤖 AI Due Diligence Assistant</span>
              </button>
              <button class="sidebar-link ${currentTab === 'interests' ? 'active' : ''}" data-tab="interests">
                <span class="sidebar-link-content">🦈 Expressed Shark Interests</span>
                <span class="sidebar-badge">${interests.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'pitch-calls' ? 'active' : ''}" data-tab="pitch-calls">
                <span class="sidebar-link-content">📅 Founder Pitch Calls</span>
                <span class="sidebar-badge">${meetings.length}</span>
              </button>
            </nav>
          </div>

          <!-- Main Content -->
          <div class="dashboard-content" id="investor-content-area">
            ${this.renderInvestorTabContent(currentTab, { startups, interests, meetings, investorId })}
          </div>
        </div>
      </div>
    `;

    this.appContainer.querySelectorAll('.sidebar-link').forEach(btn => {
      btn.addEventListener('click', () => state.setTab(btn.dataset.tab));
    });

    this.attachInvestorEvents({ startups, investorId });
  }

  renderInvestorTabContent(tab, data) {
    const { startups, interests, meetings, investorId } = data;

    if (tab === 'overview') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Investor Syndicate & Shark Room</h2>
            <p>Review vetted startup proposals with AI risk summaries and due diligence prompts.</p>
          </div>
          <button class="btn btn-secondary" id="inv-top-discover-btn">Explore Deal Pipeline</button>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon green">💼</div>
            <div class="stat-info">
              <h3>${startups.length}</h3>
              <p>Ventures Under Review</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon teal">🦈</div>
            <div class="stat-info">
              <h3>${interests.length}</h3>
              <p>Expressed Interests</p>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon blue">📅</div>
            <div class="stat-info">
              <h3>${meetings.length}</h3>
              <p>Founder Pitch Calls</p>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:0.5rem;">
          <h3 class="card-title" style="margin-bottom:1rem;">Featured Deal: EcoTrace AI</h3>
          <p style="font-size:0.9rem; color:var(--text-main); margin-bottom:1rem; line-height:1.6;">
            EcoTrace AI ingests raw ERP data, freight telematics, and supplier invoices to automate Scope 1, 2, and 3 emissions auditing in real-time. Target ask: $1,200,000 for 12% equity.
          </p>
          <div style="display:flex; gap:1rem; flex-wrap:wrap;">
            <button class="btn btn-secondary run-diligence-btn" data-startup="stp-01">
              🤖 Run AI Due Diligence Report
            </button>
            <a href="${api.getProposalPdfUrl('stp-01')}" target="_blank" class="btn btn-outline" download>
              📄 Download Founder Proposal PDF
            </a>
          </div>
        </div>
      `;
    }

    if (tab === 'startups') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Discover Startups & Proposals</h2>
            <p>Filter deals by industry, stage, readiness score, and evaluate founder pitch decks.</p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.25rem;">
          ${startups.map(stp => `
            <div class="card">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1rem; margin-bottom:1rem;">
                <div>
                  <span class="badge" style="background:rgba(20, 184, 166, 0.1); color:var(--accent-dark); margin-bottom:0.35rem;">
                    ${stp.stage} Stage • ${stp.industry}
                  </span>
                  <h3 style="font-size:1.35rem; font-weight:800; color:var(--primary);">${stp.name}</h3>
                  <p style="font-size:0.85rem; color:var(--text-muted);">${stp.tagline}</p>
                </div>
                <div style="text-align:right;">
                  <div style="font-size:1.3rem; font-weight:800; color:var(--secondary);">${stp.valuation_ask}</div>
                  <span class="badge badge-verified" style="margin-top:0.25rem;">
                    Readiness: ${stp.readiness_score}%
                  </span>
                </div>
              </div>

              <p style="font-size:0.9rem; color:var(--text-main); margin-bottom:1.25rem; line-height:1.6;">
                ${stp.pitch}
              </p>

              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:1rem; flex-wrap:wrap; gap:0.75rem;">
                <div class="flex gap-2">
                  <button class="btn btn-secondary btn-sm run-diligence-btn" data-startup="${stp.id}">
                    🤖 AI Due Diligence Report
                  </button>
                  <a href="${api.getProposalPdfUrl(stp.id)}" target="_blank" class="btn btn-outline btn-sm" download>
                    📄 Download Pitch PDF
                  </a>
                </div>
                <button class="btn btn-accent btn-sm express-shark-btn" data-startup="${stp.id}" data-name="${stp.name}">
                  🦈 Express Shark Interest / Request Pitch →
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (tab === 'ai-due-diligence') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>AI Investor Due Diligence Assistant</h2>
            <p>Automated assumption extraction, risk flags, and high-impact founder interview prompts.</p>
          </div>
          <span class="badge badge-risk-mod">Risk Profile: Moderate</span>
        </div>

        <div id="due-diligence-report-box">
          <div class="card" style="text-align:center; padding:2rem;">
            Select a startup from the discovery pipeline or click below to analyze EcoTrace AI.
            <div style="margin-top:1rem;">
              <button class="btn btn-secondary run-diligence-btn" data-startup="stp-01">Analyze EcoTrace AI →</button>
            </div>
          </div>
        </div>
      `;
    }

    if (tab === 'interests') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Expressed Shark Interests</h2>
            <p>Venture deals where you requested founder pitch meetings or term sheet discussions.</p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          ${interests.length === 0 ? `
            <div class="card" style="text-align:center; padding:3rem;">
              <p style="color:var(--text-muted);">You haven't expressed interest in any startups yet.</p>
            </div>
          ` : interests.map(i => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
              <div>
                <span class="badge" style="background:var(--success-bg); color:var(--success); margin-bottom:0.35rem;">${i.status}</span>
                <h3 style="font-size:1.15rem; font-weight:700; color:var(--primary);">${i.startup_id === 'stp-01' ? 'EcoTrace AI' : 'Startup Venture'}</h3>
                <p style="font-size:0.85rem; color:var(--text-muted); margin-top:0.25rem;">
                  Note: "${i.note}"
                </p>
              </div>
              <span class="badge badge-role">Pitch Call Requested</span>
            </div>
          `).join('')}
        </div>
      `;
    }

    if (tab === 'pitch-calls') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Founder Pitch Calls</h2>
            <p>Confirmed virtual pitch sessions with vetted founders.</p>
          </div>
        </div>

        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div class="card" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
            <div>
              <span class="badge badge-verified">CONFIRMED PITCH SESSION</span>
              <h4 style="font-size:1.15rem; font-weight:700; color:var(--primary); margin-top:0.25rem;">EcoTrace AI Seed Round ($1.2M)</h4>
              <p style="font-size:0.85rem; color:var(--text-muted);">
                Founder: Sarah Lin • Agenda: Scope 3 ingestion demo, pilot metrics, customer pipeline
              </p>
            </div>
            <a href="https://meet.google.com/xyz-idea-impact" target="_blank" class="btn btn-secondary">
              Open Video Pitch Room →
            </a>
          </div>
        </div>
      `;
    }

    return '';
  }

  attachInvestorEvents(data) {
    const { investorId } = data;

    const topDiscBtn = this.appContainer.querySelector('#inv-top-discover-btn');
    if (topDiscBtn) topDiscBtn.addEventListener('click', () => state.setTab('startups'));

    // Due diligence trigger
    this.appContainer.querySelectorAll('.run-diligence-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const stpId = btn.dataset.startup;
        state.setTab('ai-due-diligence');
        const box = this.appContainer.querySelector('#due-diligence-report-box');
        if (box) {
          box.innerHTML = `<div class="card" style="text-align:center; padding:2rem;"><p>Generating AI due-diligence report...</p></div>`;
          try {
            const report = await api.getInvestorProposalAnalysis(stpId);
            this.renderDueDiligenceReport(report, box);
          } catch (e) {
            box.innerHTML = `<div class="card" style="color:var(--danger);">${e.message}</div>`;
          }
        }
      });
    });

    // Express Shark Interest buttons
    this.appContainer.querySelectorAll('.express-shark-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const stpId = btn.dataset.startup;
        const stpName = btn.dataset.name;
        try {
          await api.expressInterest({
            investor_id: investorId,
            startup_id: stpId,
            note: `Shark Interest: Apex Frontier Ventures requested lead syndicate terms for ${stpName}.`
          });
          state.showToast(`Expressed Shark Interest in ${stpName}! Meeting requested.`, 'success');
          state.setTab('interests');
        } catch (err) {
          state.showToast(err.message, 'danger');
        }
      });
    });
  }

  renderDueDiligenceReport(report, container) {
    container.innerHTML = `
      <div class="card" style="border-top:4px solid var(--secondary);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem; flex-wrap:wrap; gap:1rem;">
          <div>
            <span class="badge badge-risk-mod" style="margin-bottom:0.25rem;">ASSESSMENT: ${report.risk_rating} RISK</span>
            <h3 style="font-size:1.5rem; font-weight:800; color:var(--primary);">${report.startup_name}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted);">${report.industry} • Asking: ${report.valuation_ask}</p>
          </div>
          <button class="btn btn-accent btn-sm" id="report-shark-btn">
            🦈 Express Interest & Lead Round →
          </button>
        </div>

        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:1rem; font-weight:700; color:var(--primary); margin-bottom:0.5rem;">Executive Thesis</h4>
          <p style="font-size:0.9rem; color:var(--text-main); line-height:1.6;">${report.executive_summary}</p>
        </div>

        <!-- Flagged Assumptions -->
        <div style="background:#F8FAFC; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; margin-bottom:1.5rem;">
          <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary); margin-bottom:0.75rem;">
            ⚠️ Core Valuation & Growth Assumptions Flagged:
          </h4>
          <ul style="font-size:0.85rem; color:var(--text-main); display:flex; flex-direction:column; gap:0.4rem; padding-left:1.25rem;">
            ${(report.key_assumptions_flagged || []).map(a => `<li>${a}</li>`).join('')}
          </ul>
        </div>

        <!-- High-Impact Due Diligence Questions -->
        <div style="margin-bottom:1.5rem;">
          <h4 style="font-size:0.95rem; font-weight:700; color:var(--primary); margin-bottom:0.75rem;">
            🎯 Recommended Due-Diligence Questions for Founder Pitch Call:
          </h4>
          <div style="display:flex; flex-direction:column; gap:0.5rem;">
            ${(report.due_diligence_questions || []).map((q, i) => `
              <div style="background:#fff; border:1px solid var(--border); border-left:3px solid var(--secondary); padding:0.75rem 1rem; border-radius:var(--radius-md); font-size:0.85rem;">
                <b>Q${i+1}:</b> ${q}
              </div>
            `).join('')}
          </div>
        </div>

        <p style="font-size:0.75rem; color:var(--text-muted); font-style:italic;">
          ${report.disclaimer}
        </p>
      </div>
    `;

    container.querySelector('#report-shark-btn').addEventListener('click', async () => {
      try {
        await api.expressInterest({
          investor_id: state.activeUser.id,
          startup_id: "stp-01",
          note: `Lead Syndicate Term Sheet discussion requested for EcoTrace AI.`
        });
        state.showToast("Expressed Shark Interest!", "success");
        state.setTab('interests');
      } catch (err) {
        state.showToast(err.message, 'danger');
      }
    });
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  new App();
});
