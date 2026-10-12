import { api } from './api.js';
import { state, DEFAULT_USERS } from './state.js';
import { SKILLS_CATALOG, getQuizForSkill } from './quizData.js';
// Acoustic Warning Alarm for Anti-Cheat Proctoring
function playAcousticAlarm() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(440, ctx.currentTime + 0.15);
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.3);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.6);
  } catch (e) {
    console.warn("Acoustic alarm sound failed", e);
  }
}

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
            { label: 'Dashboard & Simulator', tab: 'overview' },
            { label: 'Competencies & Resume', tab: 'competencies' },
            { label: 'Assessments', tab: 'assessments' },
            { label: 'Skill Passport', tab: 'passport' },
            { label: 'Job Matches', tab: 'jobs' },
            { label: 'Roadmap', tab: 'gap-analysis' }
          ],
          hr: [
            { label: 'Executive Dashboard', tab: 'overview' },
            { label: 'Post 75/25 Job', tab: 'create-job' },
            { label: 'Candidate Dossier', tab: 'candidates' },
            { label: 'Pipeline Kanban', tab: 'pipeline' }
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

        const mobileDrawerLinksHtml = links.map(l =>
          `<li><a href="#" class="dashboard-mobile-link ${state.activeTab === l.tab ? 'active' : ''}" data-tab="${l.tab}">
            <span>${l.label}</span>
            <span style="font-size: 0.8rem; color: #94A3B8;">→</span>
          </a></li>`
        ).join('');

        const mobileTabsScrollHtml = links.map(l =>
          `<button type="button" class="mobile-tab-chip ${state.activeTab === l.tab ? 'active' : ''}" data-tab="${l.tab}">${l.label}</button>`
        ).join('');

        const quickActionLabel = state.currentRole === 'founder' ? '+ Analyze Idea' : state.currentRole === 'candidate' ? '⚡ Take Assessment' : state.currentRole === 'hr' ? '+ Post Job' : state.currentRole === 'investor' ? '🔍 Deal Flow' : 'Explore';
        const roleEmoji = { candidate: '🎓', hr: '💼', founder: '🚀', investor: '🦈' };

        navbar.innerHTML = `
          <div class="nav-container">
            <a href="dashboard.html" class="brand" id="brand-link" title="Dashboard Overview">
              <div class="brand-icon">I²</div>
              <span>Idea<span class="impact-text">2Impact</span></span>
            </a>

            <!-- Desktop Nav Menu -->
            <ul class="nav-menu">
              ${navLinksHtml}
            </ul>

            <!-- Desktop User Actions -->
            <div class="flex items-center gap-3 nav-actions-desktop">
              <div class="flex items-center gap-2" style="background: rgba(255,255,255,0.08); padding: 0.25rem 0.65rem 0.25rem 0.35rem; border-radius: var(--radius-full); border: 1px solid rgba(255,255,255,0.15);">
                <img src="${state.activeUser ? (state.activeUser.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + state.activeUser.name) : ''}" alt="" style="width: 26px; height: 26px; border-radius: 50%; object-fit: cover;">
                <span style="font-size: 0.82rem; font-weight: 600; color: #fff;">${state.activeUser ? state.activeUser.name : 'User'}</span>
                <span class="badge badge-role" style="font-size: 0.7rem; padding: 0.15rem 0.45rem;">${state.currentRole.toUpperCase()}</span>
              </div>
              <button class="btn btn-outline btn-sm" id="nav-logout-btn" style="border-color: rgba(255,255,255,0.25); color: #fff; background: transparent;">
                Sign Out
              </button>
              <button class="btn btn-primary btn-sm" id="quick-action-btn">
                ${quickActionLabel}
              </button>
            </div>

            <!-- Mobile Controls -->
            <div class="flex items-center gap-2 mobile-controls" style="display: none;">
              <img src="${state.activeUser ? (state.activeUser.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + state.activeUser.name) : ''}" alt="" style="width: 28px; height: 28px; border-radius: 50%; object-fit: cover; border: 1px solid rgba(255,255,255,0.3);">
              <button type="button" class="dashboard-mobile-toggle" id="dashboard-mobile-toggle" aria-label="Toggle navigation menu" aria-expanded="false">
                <span class="bar"></span>
                <span class="bar"></span>
                <span class="bar"></span>
              </button>
            </div>
          </div>

          <!-- Mobile Dropdown / Drawer -->
          <div class="dashboard-mobile-drawer" id="dashboard-mobile-drawer">
            <div class="dashboard-mobile-drawer-content">
              <div class="dashboard-mobile-user-card">
                <img src="${state.activeUser ? (state.activeUser.avatar_url || 'https://api.dicebear.com/7.x/initials/svg?seed=' + state.activeUser.name) : ''}" alt="" style="width: 38px; height: 38px; border-radius: 50%; object-fit: cover;">
                <div style="flex: 1; min-width: 0;">
                  <div style="font-weight: 700; font-size: 0.92rem; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${state.activeUser ? state.activeUser.name : 'User'}</div>
                  <div style="font-size: 0.75rem; color: var(--text-muted);">${state.activeUser ? state.activeUser.email : ''}</div>
                </div>
                <span class="badge badge-role" style="font-size: 0.7rem;">${roleEmoji[state.currentRole] || ''} ${state.currentRole.toUpperCase()}</span>
              </div>

              <button class="btn btn-primary w-full" id="mobile-quick-action-btn" style="padding: 0.75rem; justify-content: center;">
                ${quickActionLabel}
              </button>

              <ul class="dashboard-mobile-links">
                ${mobileDrawerLinksHtml}
              </ul>

              <div style="display: flex; gap: 0.5rem; border-top: 1px solid var(--border); padding-top: 0.75rem;">
                <a href="index.html" class="btn btn-outline btn-sm w-full text-center" style="text-decoration:none;">Landing Page</a>
                <a href="roadmap.html" class="btn btn-outline btn-sm w-full text-center" style="text-decoration:none;">Roadmap</a>
                <button class="btn btn-outline btn-sm w-full" id="mobile-nav-logout-btn" style="color: var(--danger); border-color: rgba(220, 38, 38, 0.3);">
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        `;

        // Populate Mobile Scrollable Tab Strip
        const scrollBar = document.getElementById('mobile-tab-scroll-bar');
        if (scrollBar) {
          scrollBar.innerHTML = mobileTabsScrollHtml;
          scrollBar.querySelectorAll('.mobile-tab-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              state.setTab(chip.dataset.tab);
              this.renderTopBars();
            });
          });
        }

        // Desktop nav tab clicks
        navbar.querySelectorAll('.nav-link').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            state.setTab(link.dataset.tab);
            this.renderTopBars();
          });
        });

        // Mobile drawer links clicks
        navbar.querySelectorAll('.dashboard-mobile-link').forEach(link => {
          link.addEventListener('click', (e) => {
            e.preventDefault();
            state.setTab(link.dataset.tab);
            const drawer = navbar.querySelector('#dashboard-mobile-drawer');
            const toggle = navbar.querySelector('#dashboard-mobile-toggle');
            if (drawer) drawer.classList.remove('open');
            if (toggle) { toggle.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
            this.renderTopBars();
          });
        });

        // Mobile Hamburger Toggle
        const mobileToggle = navbar.querySelector('#dashboard-mobile-toggle');
        const mobileDrawer = navbar.querySelector('#dashboard-mobile-drawer');
        if (mobileToggle && mobileDrawer) {
          mobileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = mobileDrawer.classList.contains('open');
            if (isOpen) {
              mobileDrawer.classList.remove('open');
              mobileToggle.classList.remove('open');
              mobileToggle.setAttribute('aria-expanded', 'false');
            } else {
              mobileDrawer.classList.add('open');
              mobileToggle.classList.add('open');
              mobileToggle.setAttribute('aria-expanded', 'true');
            }
          });

          // Close on document click
          document.addEventListener('click', (e) => {
            if (!mobileDrawer.contains(e.target) && !mobileToggle.contains(e.target)) {
              mobileDrawer.classList.remove('open');
              mobileToggle.classList.remove('open');
              mobileToggle.setAttribute('aria-expanded', 'false');
            }
          });
        }

        // Logout handlers (desktop & mobile)
        const logoutBtn = navbar.querySelector('#nav-logout-btn');
        if (logoutBtn) {
          logoutBtn.addEventListener('click', () => {
            state.logout();
            this.renderTopBars();
          });
        }

        const mobileLogoutBtn = navbar.querySelector('#mobile-nav-logout-btn');
        if (mobileLogoutBtn) {
          mobileLogoutBtn.addEventListener('click', () => {
            state.logout();
            this.renderTopBars();
          });
        }

        // Quick action handlers (desktop & mobile)
        const handleQuickAction = () => {
          if (state.currentRole === 'candidate') state.setTab('assessments');
          else if (state.currentRole === 'founder') state.setTab('ai-copilot');
          else if (state.currentRole === 'hr') state.setTab('create-job');
          else if (state.currentRole === 'investor') state.setTab('startups');
        };

        const quickBtn = navbar.querySelector('#quick-action-btn');
        if (quickBtn) quickBtn.addEventListener('click', handleQuickAction);

        const mobileQuickBtn = navbar.querySelector('#mobile-quick-action-btn');
        if (mobileQuickBtn) {
          mobileQuickBtn.addEventListener('click', () => {
            if (mobileDrawer) mobileDrawer.classList.remove('open');
            if (mobileToggle) mobileToggle.classList.remove('open');
            handleQuickAction();
          });
        }
      }
    }
  }

  async renderCurrentView() {
    this.renderTopBars();

    // STRICT AUTH GUARD: Unauthenticated users are redirected to login.html
    if (!state.isAuthenticated()) {
      window.location.replace('login.html');
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
          if (msg.includes('password')) {
            this.showAuthAlert('Incorrect password. Please try again.', 'error');
          } else if (msg.includes('no account') || msg.includes('not found') || msg.includes('create an account') || msg.includes('401') || msg.includes('invalid')) {
            this.showAuthAlert('No account found. <a href="#" id="alert-create-link" style="color:var(--secondary);font-weight:700;">Create an account first</a>.', 'error');
            setTimeout(() => { const l = document.getElementById('alert-create-link'); if (l) l.addEventListener('click', (ev) => { ev.preventDefault(); state.authMode = 'role-pick'; this.renderLoginPage(); }); }, 50);
          } else {
            this.showAuthAlert(err.message || 'Invalid username or password.', 'error');
          }
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
    const candidateId = state.activeUser ? state.activeUser.id : 'cand-01';
    let passport = null;
    let jobs = [];
    let assessments = [];
    let applications = [];
    let skills = [];
    let candidateSkills = [];

    try {
      [passport, jobs, assessments, applications, skills, candidateSkills] = await Promise.all([
        api.getPassport(candidateId),
        api.getJobs(candidateId),
        api.getAssessments(),
        api.getMyApplications(candidateId),
        api.getSkills(),
        api.getCandidateSkills(candidateId).catch(() => [])
      ]);
    } catch (e) {
      console.warn("Error fetching candidate data", e);
    }

    if (!skills || skills.length === 0) {
      skills = SKILLS_CATALOG;
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
                  ✓ ${passport?.total_verified || 0} Verified Skills
                </span>
              </div>
            </div>

            <nav class="sidebar-nav">
              <button class="sidebar-link ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
                <span class="sidebar-link-content">📊 Overview & Simulator</span>
              </button>
              <button class="sidebar-link ${currentTab === 'competencies' ? 'active' : ''}" data-tab="competencies">
                <span class="sidebar-link-content">💼 My Competencies & Resume</span>
                <span class="sidebar-badge">${(candidateSkills || []).length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'passport' ? 'active' : ''}" data-tab="passport">
                <span class="sidebar-link-content">🛡️ Skill Passport</span>
                <span class="sidebar-badge">${passport?.total_verified || 0}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'assessments' ? 'active' : ''}" data-tab="assessments">
                <span class="sidebar-link-content">⚡ AI Proctored Quizzes</span>
                <span class="sidebar-badge">${skills.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'jobs' ? 'active' : ''}" data-tab="jobs">
                <span class="sidebar-link-content">🎯 Roles & 75/25 Matching</span>
                <span class="sidebar-badge">${jobs.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'gap-analysis' ? 'active' : ''}" data-tab="gap-analysis">
                <span class="sidebar-link-content">📈 Skill Roadmap</span>
              </button>
              <button class="sidebar-link ${currentTab === 'applications' ? 'active' : ''}" data-tab="applications">
                <span class="sidebar-link-content">📬 Applications</span>
                <span class="sidebar-badge">${applications.length}</span>
              </button>
            </nav>
          </div>

          <!-- Main Content -->
          <div class="dashboard-content" id="candidate-content-area">
            ${this.renderCandidateTabContent(currentTab, { passport, jobs, assessments, applications, skills, candidateSkills, candidateId })}
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
    this.attachCandidateEvents({ passport, jobs, assessments, applications, skills, candidateSkills, candidateId });
  }

  renderCandidateTabContent(tab, data) {
    const { passport, jobs, assessments, applications, skills, candidateSkills, candidateId } = data;
    const skillList = (skills && skills.length > 0) ? skills : SKILLS_CATALOG;

    if (tab === 'overview') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Candidate Dashboard</h2>
            <p>Track verified competencies, take proctored quizzes, and view explainable job matching.</p>
          </div>
          <button class="btn btn-secondary" id="tab-btn-take-quiz">⚡ Browse Skills & Quizzes</button>
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
            <div class="stat-icon green">📬</div>
            <div class="stat-info">
              <h3>${applications.length}</h3>
              <p>Active Applications</p>
            </div>
          </div>
        </div>

        <!-- 1. Interactive Skill Matrix Simulator (SkillBridge Core Feature) -->
        <div class="matrix-simulator-card" id="skill-matrix-simulator">
          <div class="matrix-sim-header">
            <div class="matrix-sim-title-group">
              <h3><span>⚡</span> Interactive Skill Matrix Simulator (75/25 Algorithm)</h3>
              <p class="matrix-sim-subtitle">Toggle competencies to simulate real-time compatibility scores. Core mandatory skills yield up to 75%, while preferred bonus skills scale the remaining 25%.</p>
            </div>
            <div style="display:flex; align-items:center; gap:0.5rem; flex-wrap:wrap;">
              <select id="sim-target-role" class="form-select" style="max-width:260px; background:rgba(255,255,255,0.08); color:#fff; border-color:rgba(255,255,255,0.2); font-size:0.8rem; padding:0.4rem 0.6rem;">
                <option value="all">Full Engineering Spectrum</option>
                ${jobs.map(j => `<option value="${j.id}">${j.title}</option>`).join('')}
              </select>
              <button id="sim-reset-passport-btn" class="btn btn-sm btn-outline" style="color:#CBD5E1; border-color:rgba(255,255,255,0.2); background:transparent;">Reset to Passport</button>
              <button id="sim-toggle-all-btn" class="btn btn-sm btn-outline" style="color:#CBD5E1; border-color:rgba(255,255,255,0.2); background:transparent;">Toggle All</button>
            </div>
          </div>

          <div class="matrix-chips-cloud" id="sim-chips-cloud">
            ${skillList.map(s => {
              const isVerified = (passport?.verified_skills || []).some(vs => 
                vs.name?.toLowerCase() === s.name?.toLowerCase() || vs.skill_id === s.id
              );
              return `
                <div class="matrix-sim-chip ${isVerified ? 'active' : ''}" data-skill="${s.name}" data-id="${s.id}">
                  <span>${s.icon || '⚡'}</span>
                  <span>${s.name}</span>
                  <span class="chip-status-check">${isVerified ? '✓' : '+'}</span>
                </div>
              `;
            }).join('')}
          </div>

          <div class="matrix-sim-score-bar-wrap">
            <div class="matrix-sim-bar-labels">
              <div>
                <span style="color:#94A3B8; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px;">Core Mandatory Pool (75% Cap): </span>
                <strong style="color:#60A5FA;" id="sim-mand-score">0%</strong>
              </div>
              <div>
                <span style="color:#94A3B8; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px;">Preferred Bonus Pool (25% Cap): </span>
                <strong style="color:#2DD4BF;" id="sim-pref-score">0%</strong>
              </div>
              <div>
                <span style="color:#94A3B8; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px;">Composite Compatibility: </span>
                <strong style="color:#FFF; font-size:1.15rem;" id="sim-total-score">0%</strong>
              </div>
            </div>
            <div class="matrix-progress-track">
              <div class="matrix-progress-mandatory" id="sim-mand-bar" style="width:0%;"></div>
              <div class="matrix-progress-preferred" id="sim-pref-bar" style="width:0%;"></div>
            </div>
          </div>
        </div>

        <!-- Quick Technical Skills Quiz Ribbon -->
        <div class="quick-skills-ribbon">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:0.5rem;">
            <div>
              <span style="font-size:0.75rem; font-weight:700; color:var(--secondary); text-transform:uppercase; letter-spacing:0.8px;">⚡ Instant Skill Quiz</span>
              <h4 style="font-size:1.15rem; font-weight:800; color:var(--primary); margin:0.2rem 0 0;">Pick Any Skill to Generate a Quiz</h4>
            </div>
            <button class="btn btn-sm btn-outline" id="jump-to-all-skills-btn">View All ${skillList.length} Skills →</button>
          </div>
          <div class="quick-skills-chips-row">
            ${skillList.map(s => {
              const isV = (passport?.verified_skills || []).some(vs => 
                vs.name?.toLowerCase() === s.name?.toLowerCase() || 
                vs.skill_id === s.id ||
                (s.slug && vs.skill_id?.includes(s.slug))
              );
              return `
                <button class="quick-skill-chip-btn" data-skill="${s.slug || s.id}" data-id="${s.id}" title="${s.description}">
                  <span>${s.icon || '⚡'}</span>
                  <span>${s.name}</span>
                  ${isV ? '<span style="color:var(--success); font-weight:800; font-size:0.85rem;">✓</span>' : ''}
                </button>
              `;
            }).join('')}
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

    if (tab === 'competencies') {
      const allComp = candidateSkills && candidateSkills.length > 0 ? candidateSkills : (passport?.verified_skills || []);
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>My Technical Competencies & AI Resume Intelligence</h2>
            <p>Upload your PDF resume for automated skill extraction using our pypdf engine, or manage proficiencies manually.</p>
          </div>
        </div>

        <!-- AI Resume Parser Banner -->
        <div class="resume-parser-banner" id="resume-parser-dropzone">
          <input type="file" id="resume-upload-input" accept=".pdf" style="display:none;" />
          <div class="resume-parser-icon">📄</div>
          <h3 style="font-size:1.15rem; font-weight:800; color:var(--primary); margin-bottom:0.35rem;">
            Drag & Drop Your Technical PDF Resume Here
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
            Our backend parser extracts text with <code>pypdf</code>, recognizes technical skill patterns, and automatically populates your profile competencies.
          </p>
          <button type="button" class="btn btn-secondary btn-sm" id="browse-resume-file-btn">
            📂 Browse PDF File
          </button>
          <div id="resume-parse-feedback" style="margin-top:1rem; display:none;"></div>
        </div>

        <!-- Add Manual Competency Form -->
        <div class="card" style="margin-bottom:1.75rem;">
          <h3 class="card-title" style="margin-bottom:1rem;">Add Technical Competency</h3>
          <form id="add-candidate-skill-form" style="display:grid; grid-template-columns: 2fr 1.2fr 1fr auto; gap:0.75rem; align-items:flex-end;">
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Skill Name</label>
              <input type="text" class="form-input" id="new-comp-name" placeholder="e.g. Docker, Python, Kubernetes" list="skill-suggestions-list" required />
              <datalist id="skill-suggestions-list">
                ${skillList.map(s => `<option value="${s.name}">`).join('')}
              </datalist>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Proficiency Level</label>
              <select class="form-select" id="new-comp-level">
                <option value="Beginner">Beginner</option>
                <option value="Intermediate" selected>Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom:0;">
              <label class="form-label">Experience (Years)</label>
              <input type="number" class="form-input" id="new-comp-years" value="2" min="0" max="25" />
            </div>
            <button type="submit" class="btn btn-primary" style="height:42px;">
              + Add Skill
            </button>
          </form>
        </div>

        <!-- Competencies List -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--primary); margin:0;">
              Active Competencies in Profile (${allComp.length})
            </h3>
            <span style="font-size:0.8rem; color:var(--text-muted);">Verified credentials cannot be deleted</span>
          </div>

          <div class="competency-tags-grid">
            ${allComp.map(c => {
              const name = c.name || c.skill_name || 'Skill';
              const level = c.proficiency_level || 'Intermediate';
              const years = c.years_experience ? `${c.years_experience} yrs` : (c.assessment_score ? `${c.assessment_score}% Verified` : 'Verified');
              const isVerified = Boolean(c.assessment_score);

              return `
                <div class="competency-item-card">
                  <div>
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                      <span class="competency-badge-dot" style="background:${isVerified ? '#10B981' : '#3B82F6'};"></span>
                      <strong style="color:var(--primary); font-size:0.95rem;">${name}</strong>
                    </div>
                    <div style="font-size:0.78rem; color:var(--text-muted);">
                      <span>${level}</span> • <span>${years}</span>
                    </div>
                  </div>
                  <div>
                    ${!isVerified ? `
                      <button class="btn btn-outline btn-xs remove-competency-btn" data-skill="${name}" title="Remove Skill" style="padding:0.25rem 0.5rem; border-color:#EF4444; color:#EF4444;">
                        🗑️
                      </button>
                    ` : `
                      <span class="badge badge-verified" style="font-size:0.65rem;">VERIFIED</span>
                    `}
                  </div>
                </div>
              `;
            }).join('')}
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
            <h2>Technical Skills & Quiz Generator</h2>
            <p>Select any skill below to generate an interactive 15-minute proctored quiz. Score 75% or higher to earn an official verified badge on your Skill Passport.</p>
          </div>
          <span class="badge" style="background:rgba(20, 184, 166, 0.15); color:var(--accent-dark); border:1px solid var(--accent); padding:0.4rem 0.85rem;">
            🛡️ Proctored Focus Monitoring & Real-Time Scoring
          </span>
        </div>

        <div class="skills-catalog-container">
          <!-- Filter Toolbar with Search and Category Pills -->
          <div class="skills-filter-toolbar">
            <div class="skill-search-box">
              <span>🔍</span>
              <input type="text" id="skill-search-input" placeholder="Search skills (e.g. C++, Python, Java, CSS, SQL...)" autocomplete="off">
            </div>

            <div class="skill-category-pills">
              <button class="skill-cat-pill active" data-category="all">All Skills (${skillList.length})</button>
              <button class="skill-cat-pill" data-category="Languages">Languages (C++, Python, Java, C)</button>
              <button class="skill-cat-pill" data-category="Web & Frontend">Web & Frontend (JS, HTML, CSS, React)</button>
              <button class="skill-cat-pill" data-category="Databases & Tools">Databases & Tools (SQL, Git)</button>
            </div>
          </div>

          <!-- Skills Cards Grid -->
          <div class="skills-cards-grid" id="skills-cards-grid">
            ${skillList.map(skill => {
              const verifiedEntry = (passport?.verified_skills || []).find(vs => 
                vs.name?.toLowerCase() === skill.name?.toLowerCase() || 
                vs.skill_id === skill.id ||
                (skill.slug && vs.skill_id?.includes(skill.slug))
              );
              const isVerified = Boolean(verifiedEntry);
              const vScore = verifiedEntry ? (verifiedEntry.assessment_score || 85) : null;

              return `
                <div class="skill-technical-card" data-skill="${skill.slug || skill.id}" data-id="${skill.id}" data-category="${skill.category || 'Languages'}" data-name="${skill.name.toLowerCase()} ${skill.full_name?.toLowerCase() || ''}">
                  <div>
                    <div class="skill-card-top-row">
                      <div class="skill-icon-avatar" style="--skill-bg:${skill.bg || 'rgba(37,99,235,0.1)'};">
                        ${skill.icon || '⚡'}
                      </div>
                      <span class="badge ${isVerified ? 'badge-verified' : 'badge-unverified'}">
                        ${isVerified ? `✓ Verified (${vScore}%)` : 'Ready for Quiz'}
                      </span>
                    </div>

                    <div class="skill-card-title">
                      ${skill.name}
                      <span style="font-size:0.75rem; font-weight:600; color:var(--text-muted); background:#F1F5F9; padding:0.15rem 0.45rem; border-radius:4px; margin-left:auto;">
                        ${skill.level || 'Intermediate'}
                      </span>
                    </div>
                    <div style="font-size:0.8rem; font-weight:600; color:var(--secondary); margin-bottom:0.5rem;">
                      ${skill.category || 'Technical Skill'}
                    </div>

                    <p class="skill-card-desc">
                      ${skill.description}
                    </p>
                  </div>

                  <div>
                    <div class="skill-card-meta">
                      <span>⏱️ ${skill.duration_minutes || 15} Mins</span>
                      <span>📝 ${skill.question_count || 5} Questions</span>
                      <span>🎯 75% Pass</span>
                    </div>

                    <button class="btn ${isVerified ? 'btn-outline' : 'btn-secondary'} w-full generate-skill-quiz-btn" data-skill="${skill.slug || skill.id}" data-id="${skill.id}">
                      ${isVerified ? `Retake ${skill.name} Quiz ⚡` : `⚡ Generate ${skill.name} Quiz →`}
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }

    if (tab === 'jobs') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Recommended Jobs & Dual-Tier 75/25 Matching</h2>
            <p>Transparent matching algorithm weighting 75% core mandatory skills and 25% preferred bonus competencies.</p>
          </div>
          <span class="formula-tag">Match = (Mandatory / Total_Mand)*75% + (Preferred / Total_Pref)*25%</span>
        </div>

        <div style="display:flex; flex-direction:column; gap:1.25rem;">
          ${jobs.map(job => {
            const m = job.match;
            const score = m ? m.score : (job.match_score || 75);
            const scoreClass = score >= 75 ? 'match-high' : score >= 50 ? 'match-mid' : 'match-low';
            const hasApplied = applications.some(a => a.job_id === job.id);

            // Mandatory & preferred breakdowns
            const mandSkills = (job.required_skills || []).filter(s => s.is_required !== false);
            const prefSkills = (job.required_skills || []).filter(s => s.is_required === false);

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
                      ${score}% Match
                    </div>
                    <button class="btn btn-primary btn-sm analyze-match-btn" data-id="${job.id}">
                      🎯 Analyze & Match
                    </button>
                    <button class="btn ${hasApplied ? 'btn-outline' : 'btn-secondary'} btn-sm apply-job-btn" data-id="${job.id}" ${hasApplied ? 'disabled' : ''}>
                      ${hasApplied ? '✓ Applied' : 'Apply with Passport'}
                    </button>
                  </div>
                </div>

                <p style="font-size:0.9rem; color:var(--text-main); margin-bottom:1rem; line-height:1.5;">
                  ${job.description}
                </p>

                <!-- Dual-Tier Requirements Cluster -->
                <div style="margin-bottom:1rem;">
                  <div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-bottom:0.4rem;">
                    75% Core Mandatory Competencies:
                  </div>
                  <div class="chips-cluster" style="margin-top:0;">
                    ${mandSkills.length > 0 ? mandSkills.map(s => {
                      const sName = s.skill_name || s.skill_id;
                      const isV = (m?.matched_skills || []).some(ms => ms.skill_name?.toLowerCase() === sName?.toLowerCase());
                      return `<span class="chip-mandatory">${isV ? '✓' : '○'} ${sName} (Weight: ${s.weight || 0.25})</span>`;
                    }).join('') : `<span class="chip-mandatory">Full Engineering Core Stack</span>`}
                  </div>
                  ${prefSkills.length > 0 ? `
                    <div style="font-size:0.8rem; font-weight:700; color:var(--accent-dark); margin:0.6rem 0 0.3rem;">
                      25% Preferred Bonus Competencies:
                    </div>
                    <div class="chips-cluster" style="margin-top:0;">
                      ${prefSkills.map(s => {
                        const sName = s.skill_name || s.skill_id;
                        const isV = (m?.bonus_competencies || []).some(bs => (bs.skill_name || bs)?.toLowerCase() === sName?.toLowerCase());
                        return `<span class="chip-preferred">${isV ? '✓' : '○'} ${sName} (Bonus)</span>`;
                      }).join('')}
                    </div>
                  ` : ''}
                </div>

                <!-- Explainable Match Breakdown -->
                <div class="match-score-box">
                  <div class="match-score-header">
                    <span style="font-size:0.85rem; font-weight:700; color:var(--primary);">
                      💡 Mathematical 75/25 Breakdown:
                    </span>
                    <span style="font-size:0.8rem; color:var(--text-muted);">
                      Mandatory: ${m?.mandatory_score_component || 0}% / 75% • Preferred: ${m?.preferred_score_component || 0}% / 25%
                    </span>
                  </div>

                  <p style="font-size:0.85rem; color:var(--text-main); margin-bottom:0.75rem;">
                    ${m?.explanation || `Composite score computed via 75% mandatory core requirements and 25% preferred bonus skills.`}
                  </p>

                  <div class="match-skills-list">
                    ${(m?.matched_skills || []).map(ms => `
                      <span class="badge badge-verified">
                        ✓ ${ms.skill_name} (${Math.round((ms.weight || 0.25) * 100)}% weight) - ${ms.candidate_assessment_score}%
                      </span>
                    `).join('')}
                    ${(m?.critical_skill_gaps || m?.missing_skills || []).map(ms => `
                      <span class="badge badge-unverified" style="color:var(--danger); border-color:var(--danger-bg);">
                        ✗ Missing Gap: ${ms.skill_name || ms}
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
      const targetJob = jobs.find(j => j.match && j.match.critical_skill_gaps?.length > 0) || jobs[0];
      const missing = targetJob?.match?.critical_skill_gaps || targetJob?.match?.missing_skills || [];
      const roadmap = targetJob?.match?.learning_roadmap || [];

      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Skill-Gap Analysis & Curated Roadmap</h2>
            <p>Actionable guidance to bridge competency gaps, unlock 75/25 match scores, and qualify for roles.</p>
          </div>
          <a href="roadmap.html" target="_blank" class="btn btn-secondary">
            🚀 Open Interactive Skill Roadmap Hub ↗
          </a>
        </div>

        <div class="card" style="margin-bottom:1.5rem;">
          <h3 style="font-size:1.15rem; font-weight:700; color:var(--primary); margin-bottom:0.5rem;">
            Target Role Comparison: <span style="color:var(--secondary);">${targetJob?.title}</span> (${targetJob?.company_name})
          </h3>
          <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:1rem;">
            Current Verified Score: <b>${targetJob?.match?.score || 75}%</b>. Master the following missing competencies to reach 100% verified compatibility:
          </p>

          ${roadmap.length === 0 ? `
            <div style="background:var(--success-bg); color:var(--success); padding:1rem; border-radius:var(--radius-md); font-weight:600;">
              🎉 Full Alignment! You have satisfied all required competencies for this opening!
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
                  <div style="display:flex; gap:0.5rem;">
                    <a href="roadmap.html" target="_blank" class="btn btn-outline btn-sm">
                      📖 View in Roadmap Hub
                    </a>
                    <button class="btn btn-secondary btn-sm roadmap-assess-btn" data-skill="${item.skill_name}">
                      ⚡ ${item.assessment_cta || 'Take Assessment'}
                    </button>
                  </div>
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
    const { passport, jobs, candidateSkills, candidateId } = data;

    // Quick quiz ribbon buttons in Overview tab
    const quizTopBtn = this.appContainer.querySelector('#tab-btn-take-quiz');
    if (quizTopBtn) quizTopBtn.addEventListener('click', () => state.setTab('assessments'));

    const jumpToSkillsBtn = this.appContainer.querySelector('#jump-to-all-skills-btn');
    if (jumpToSkillsBtn) jumpToSkillsBtn.addEventListener('click', () => state.setTab('assessments'));

    this.appContainer.querySelectorAll('.quick-skill-chip-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const skill = btn.dataset.skill || btn.dataset.id;
        await this.openAssessmentModal(skill, candidateId);
      });
    });

    // 1. Skill Matrix Simulator Event Logic
    const simRoleSelect = this.appContainer.querySelector('#sim-target-role');
    const simChips = this.appContainer.querySelectorAll('.matrix-sim-chip');
    const simMandScore = this.appContainer.querySelector('#sim-mand-score');
    const simPrefScore = this.appContainer.querySelector('#sim-pref-score');
    const simTotalScore = this.appContainer.querySelector('#sim-total-score');
    const simMandBar = this.appContainer.querySelector('#sim-mand-bar');
    const simPrefBar = this.appContainer.querySelector('#sim-pref-bar');

    const updateSimulatorScore = () => {
      if (!simChips.length || !simTotalScore) return;
      const selectedRoleId = simRoleSelect ? simRoleSelect.value : 'all';
      const activeChips = Array.from(simChips).filter(c => c.classList.contains('active')).map(c => c.dataset.skill.toLowerCase());

      let mandSkills = [];
      let prefSkills = [];

      if (selectedRoleId === 'all') {
        mandSkills = ['python', 'javascript', 'sql', 'c++'];
        prefSkills = ['docker', 'react', 'git', 'java', 'html', 'css', 'fastapi'];
      } else {
        const targetJob = jobs.find(j => j.id === selectedRoleId);
        if (targetJob && targetJob.required_skills) {
          targetJob.required_skills.forEach(s => {
            const name = (s.skill_name || s.skill_id || '').toLowerCase();
            if (s.is_required !== false) mandSkills.push(name);
            else prefSkills.push(name);
          });
        }
        if (mandSkills.length === 0) mandSkills = ['python', 'javascript'];
      }

      const totalMand = mandSkills.length;
      const totalPref = prefSkills.length > 0 ? prefSkills.length : 1;

      const matchedMandCount = mandSkills.filter(ms => activeChips.some(ac => ac.includes(ms) || ms.includes(ac))).length;
      const matchedPrefCount = prefSkills.filter(ps => activeChips.some(ac => ac.includes(ps) || ps.includes(ac))).length;

      const mandPct = totalMand > 0 ? Math.round((matchedMandCount / totalMand) * 75) : 75;
      const prefPct = prefSkills.length > 0 ? Math.round((matchedPrefCount / totalPref) * 25) : 0;
      const totalScore = Math.min(100, mandPct + prefPct);

      if (simMandScore) simMandScore.textContent = `${mandPct}% / 75%`;
      if (simPrefScore) simPrefScore.textContent = `${prefPct}% / 25%`;
      if (simTotalScore) simTotalScore.textContent = `${totalScore}%`;
      if (simMandBar) simMandBar.style.width = `${mandPct}%`;
      if (simPrefBar) simPrefBar.style.width = `${prefPct}%`;
    };

    if (simChips.length) {
      simChips.forEach(chip => {
        chip.addEventListener('click', () => {
          chip.classList.toggle('active');
          const check = chip.querySelector('.chip-status-check');
          if (check) check.textContent = chip.classList.contains('active') ? '✓' : '+';
          updateSimulatorScore();
        });
      });

      if (simRoleSelect) simRoleSelect.addEventListener('change', updateSimulatorScore);

      const resetPassportBtn = this.appContainer.querySelector('#sim-reset-passport-btn');
      if (resetPassportBtn) {
        resetPassportBtn.addEventListener('click', () => {
          const verifiedNames = (passport?.verified_skills || []).map(vs => vs.name?.toLowerCase());
          simChips.forEach(chip => {
            const isV = verifiedNames.some(vn => chip.dataset.skill.toLowerCase().includes(vn));
            if (isV) {
              chip.classList.add('active');
              chip.querySelector('.chip-status-check').textContent = '✓';
            } else {
              chip.classList.remove('active');
              chip.querySelector('.chip-status-check').textContent = '+';
            }
          });
          updateSimulatorScore();
        });
      }

      const toggleAllBtn = this.appContainer.querySelector('#sim-toggle-all-btn');
      if (toggleAllBtn) {
        toggleAllBtn.addEventListener('click', () => {
          const anyInactive = Array.from(simChips).some(c => !c.classList.contains('active'));
          simChips.forEach(chip => {
            if (anyInactive) {
              chip.classList.add('active');
              chip.querySelector('.chip-status-check').textContent = '✓';
            } else {
              chip.classList.remove('active');
              chip.querySelector('.chip-status-check').textContent = '+';
            }
          });
          updateSimulatorScore();
        });
      }

      updateSimulatorScore();
    }

    // 2. Competencies & AI Resume Parsing Events
    const dropzone = this.appContainer.querySelector('#resume-parser-dropzone');
    const fileInput = this.appContainer.querySelector('#resume-upload-input');
    const browseBtn = this.appContainer.querySelector('#browse-resume-file-btn');
    const parseFeedback = this.appContainer.querySelector('#resume-parse-feedback');

    if (dropzone && fileInput) {
      const handleFile = async (file) => {
        if (!file || !file.name.endsWith('.pdf')) {
          state.showToast("Please upload a PDF document (.pdf)", "danger");
          return;
        }

        if (parseFeedback) {
          parseFeedback.style.display = 'block';
          parseFeedback.innerHTML = `
            <div style="background:#EFF6FF; border:1px solid #93C5FD; color:#1D4ED8; padding:0.75rem; border-radius:var(--radius-sm); font-size:0.85rem;">
              ⏳ <b>Parsing ${file.name}...</b> Extracting text with pypdf and matching technical competencies...
            </div>
          `;
        }

        try {
          const result = await api.parseResume(file);
          if (parseFeedback) {
            parseFeedback.innerHTML = `
              <div style="background:#ECFDF5; border:1px solid #6EE7B7; color:#047857; padding:0.75rem; border-radius:var(--radius-sm); font-size:0.85rem;">
                🎉 <b>Success!</b> Parsed <b>${result.skills_found?.length || 0} technical skills</b> from <em>${result.filename}</em> and updated your competency profile!
                <div style="margin-top:0.4rem; display:flex; flex-wrap:wrap; gap:0.35rem;">
                  ${(result.skills_found || []).map(s => `<span class="badge badge-verified" style="font-size:0.72rem;">✓ ${s}</span>`).join('')}
                </div>
              </div>
            `;
          }
          state.showToast(`Extracted ${result.skills_found?.length || 0} skills from PDF!`, 'success');
          setTimeout(() => state.notify(), 1200);
        } catch (err) {
          if (parseFeedback) {
            parseFeedback.innerHTML = `
              <div style="background:#FEF2F2; border:1px solid #FCA5A5; color:#B91C1C; padding:0.75rem; border-radius:var(--radius-sm); font-size:0.85rem;">
                ⚠️ <b>Parsing Error:</b> ${err.message}
              </div>
            `;
          }
          state.showToast(err.message, 'danger');
        }
      };

      if (browseBtn) browseBtn.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('click', (e) => {
        if (e.target !== browseBtn) fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Add manual competency form
    const addSkillForm = this.appContainer.querySelector('#add-candidate-skill-form');
    if (addSkillForm) {
      addSkillForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const skillName = document.getElementById('new-comp-name').value.trim();
        const level = document.getElementById('new-comp-level').value;
        const years = parseInt(document.getElementById('new-comp-years').value, 10) || 1;

        try {
          await api.addCandidateSkill({
            skill_name: skillName,
            proficiency_level: level,
            years_experience: years
          }, candidateId);
          state.showToast(`Added ${skillName} (${level}) to your competencies!`, 'success');
          state.notify();
        } catch (err) {
          state.showToast(err.message, 'danger');
        }
      });
    }

    // Remove competency buttons
    this.appContainer.querySelectorAll('.remove-competency-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const skill = btn.dataset.skill;
        if (confirm(`Remove competency "${skill}" from your profile?`)) {
          try {
            await api.removeCandidateSkill(skill, candidateId);
            state.showToast(`Removed ${skill}`, 'info');
            state.notify();
          } catch (err) {
            state.showToast(err.message, 'danger');
          }
        }
      });
    });

    // 3. Analyze & Match Gap Analysis Modal buttons
    this.appContainer.querySelectorAll('.analyze-match-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const jobId = btn.dataset.id;
        const job = jobs.find(j => j.id === jobId);
        if (job) this.openGapAnalysisModal(job, candidateId, passport);
      });
    });

    // Technical skills search & category filtering
    const searchInput = this.appContainer.querySelector('#skill-search-input');
    const catPills = this.appContainer.querySelectorAll('.skill-cat-pill');
    const cards = this.appContainer.querySelectorAll('.skill-technical-card');

    const filterSkills = () => {
      const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const activePill = this.appContainer.querySelector('.skill-cat-pill.active');
      const selectedCategory = activePill ? activePill.dataset.category : 'all';

      cards.forEach(card => {
        const cardCategory = card.dataset.category || '';
        const cardName = card.dataset.name || '';
        const cardText = card.textContent.toLowerCase();

        const matchesCategory = (selectedCategory === 'all' || cardCategory.toLowerCase() === selectedCategory.toLowerCase());
        const matchesSearch = !query || cardName.includes(query) || cardText.includes(query);

        if (matchesCategory && matchesSearch) {
          card.style.display = 'flex';
        } else {
          card.style.display = 'none';
        }
      });
    };

    if (searchInput) searchInput.addEventListener('input', filterSkills);

    catPills.forEach(pill => {
      pill.addEventListener('click', () => {
        catPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        filterSkills();
      });
    });

    // Generate Quiz buttons on skill cards
    this.appContainer.querySelectorAll('.generate-skill-quiz-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        const skill = btn.dataset.skill || btn.dataset.id;
        await this.openAssessmentModal(skill, candidateId);
      });
    });

    this.appContainer.querySelectorAll('.skill-technical-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        if (e.target.closest('button')) return;
        const skill = card.dataset.skill || card.dataset.id;
        await this.openAssessmentModal(skill, candidateId);
      });
    });

    // Legacy / other assessment buttons
    this.appContainer.querySelectorAll('.start-quiz-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const asmId = btn.dataset.id;
        await this.openAssessmentModal(asmId, candidateId);
      });
    });

    // Job application buttons
    this.appContainer.querySelectorAll('.apply-job-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const jobId = btn.dataset.id;
        const job = jobs.find(j => j.id === jobId);
        try {
          await api.applyJob(jobId, {
            candidate_id: candidateId,
            notes: "Applied with verified credentials",
            match_score: job?.match?.score || 85
          });
          state.showToast("Application submitted successfully with your Verified Skill Passport!", "success");
          state.setTab('applications');
        } catch (e) {
          state.showToast(e.message, 'danger');
        }
      });
    });

    const jumpBtn = this.appContainer.querySelector('#jump-to-jobs-btn');
    if (jumpBtn) jumpBtn.addEventListener('click', () => state.setTab('jobs'));

    this.appContainer.querySelectorAll('.roadmap-assess-btn').forEach(btn => {
      btn.addEventListener('click', () => state.setTab('assessments'));
    });
  }

  // =========================================================================
  // ANALYZE & MATCH MODAL (SkillBridge Gap Analysis with Conic Dial & Score-Lock)
  // =========================================================================
  openGapAnalysisModal(job, candidateId, passport) {
    const m = job.match || {};
    const score = m.score || job.match_score || 78;
    const mandScore = m.mandatory_score_component || Math.round(score * 0.75);
    const prefScore = m.preferred_score_component || Math.round(score * 0.25);
    const gaps = m.critical_skill_gaps || m.missing_skills || [];
    const bonus = m.bonus_competencies || [];

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-content" style="max-width:680px; max-height:90vh; overflow-y:auto; padding:2rem;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
          <div>
            <span class="badge badge-role" style="margin-bottom:0.35rem;">${job.company_name}</span>
            <h3 style="font-size:1.4rem; font-weight:800; color:var(--primary); margin:0;">${job.title}</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0.25rem 0 0;">
              Dual-Tier 75/25 Compatibility Analysis & Bridging Action Plan
            </p>
          </div>
          <button id="close-gap-modal-btn" style="background:none; border:none; font-size:1.5rem; color:#94A3B8; cursor:pointer;">&times;</button>
        </div>

        <!-- Conic Dial Gauge -->
        <div class="conic-match-gauge" style="background: conic-gradient(#2563EB ${score}%, #E2E8F0 0);">
          <div class="conic-gauge-inner">
            <span class="conic-gauge-score">${score}%</span>
            <span class="conic-gauge-label">75/25 FIT</span>
          </div>
        </div>

        <!-- Breakdown Section -->
        <div style="background:#F8FAFC; border:1px solid var(--border); border-radius:var(--radius-md); padding:1rem; margin-bottom:1.25rem;">
          <div class="breakdown-row">
            <span><strong>75% Core Mandatory Contribution:</strong></span>
            <span style="color:#2563EB; font-weight:800;">${mandScore}% / 75%</span>
          </div>
          <div class="breakdown-row">
            <span><strong>25% Preferred Bonus Contribution:</strong></span>
            <span style="color:#10B981; font-weight:800;">${prefScore}% / 25%</span>
          </div>
          <div class="breakdown-row" style="border-bottom:none;">
            <span><strong>Total Compatibility Rating:</strong></span>
            <span style="color:var(--primary); font-weight:800;">${score}%</span>
          </div>
        </div>

        <!-- Critical Missing Gaps -->
        ${gaps.length > 0 ? `
          <div style="margin-bottom:1.25rem;">
            <h4 style="font-size:0.95rem; font-weight:700; color:#DC2626; margin-bottom:0.5rem;">
              ⚠️ Critical Skill Gaps to Bridge:
            </h4>
            <div style="display:flex; flex-direction:column; gap:0.4rem;">
              ${gaps.map(g => {
                const gName = g.skill_name || g;
                return `
                  <div style="display:flex; justify-content:space-between; align-items:center; background:#FEF2F2; border:1px solid #FCA5A5; padding:0.5rem 0.75rem; border-radius:var(--radius-sm); font-size:0.85rem;">
                    <span style="font-weight:600; color:#991B1B;">Missing: ${gName}</span>
                    <a href="roadmap.html" target="_blank" class="btn btn-xs btn-outline" style="border-color:#DC2626; color:#DC2626; background:#fff;">
                      Study in Roadmap ↗
                    </a>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : `
          <div style="background:#F0FDF4; border:1px solid #BBF7D0; color:#15803D; padding:0.75rem; border-radius:var(--radius-sm); font-size:0.85rem; font-weight:600; margin-bottom:1.25rem;">
            ✓ All mandatory requirements satisfied!
          </div>
        `}

        <!-- Bridging the Gap (Action Plan / Learning Commitment) -->
        <div class="gap-commitment-box">
          <label style="font-size:0.88rem; font-weight:700; color:var(--primary); display:block;">
            ✍️ Bridging the Gap: Your Learning Commitment & Action Plan
          </label>
          <p style="font-size:0.78rem; color:var(--text-muted); margin:0.25rem 0 0.5rem;">
            Demonstrate to the hiring manager how you plan to bridge missing competency areas (e.g. current courses, side projects, timeline).
          </p>
          <textarea id="modal-learning-commitment" placeholder="e.g. Currently completing Advanced Kubernetes & Distributed Systems on Coursera with anticipated completion next month. Building hands-on microservice project..."></textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; margin-top:1.5rem; gap:1rem; flex-wrap:wrap;">
          <a href="roadmap.html" target="_blank" class="btn btn-outline">
            🚀 Open Curated Roadmap Hub ↗
          </a>
          <button class="btn btn-secondary btn-lg" id="gap-apply-lock-btn">
            Apply & Lock Match Score (${score}%) →
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    overlay.querySelector('#close-gap-modal-btn').addEventListener('click', () => overlay.remove());

    overlay.querySelector('#gap-apply-lock-btn').addEventListener('click', async () => {
      const commitment = overlay.querySelector('#modal-learning-commitment').value.trim();
      const applyBtn = overlay.querySelector('#gap-apply-lock-btn');
      applyBtn.disabled = true;
      applyBtn.textContent = 'Submitting Application...';

      try {
        await api.applyJob(job.id, {
          candidate_id: candidateId,
          notes: "Applied via SkillBridge 75/25 Gap Analysis with score lock",
          learning_commitment: commitment || "Candidate committed to mastering missing skills via roadmap",
          match_score: score
        });
        overlay.remove();
        state.showToast(`Application submitted! Match score locked at ${score}%.`, 'success');
        state.setTab('applications');
      } catch (err) {
        applyBtn.disabled = false;
        applyBtn.textContent = `Apply & Lock Match Score (${score}%) →`;
        state.showToast(err.message, 'danger');
      }
    });
  }

  // =========================================================================
  // INTERACTIVE ASSESSMENT QUIZ MODAL WITH AI PROCTORING & INTEGRITY TRACKING
  // =========================================================================
  async openAssessmentModal(assessmentId, candidateId) {
    let asm = null;
    try {
      asm = await api.getAssessment(assessmentId);
    } catch (e) {
      console.warn("Could not load assessment from API, using fallback catalog", e);
    }

    if (!asm || !asm.questions || asm.questions.length === 0) {
      asm = getQuizForSkill(assessmentId);
    }

    if (!asm || !asm.questions || asm.questions.length === 0) {
      state.showToast("Could not generate quiz for this skill", "danger");
      return;
    }

    const questions = asm.questions || [];
    let currentQIndex = 0;
    const answers = {};
    let violationsCount = 0;
    let videoStream = null;
    let cocoModel = null;
    let detectionInterval = null;
    let simulatedCanvasInterval = null;

    // Start exam session & integrity monitor
    state.startExam();

    const candidateUser = state.activeUser || { name: 'Candidate', email: 'candidate@idea2impact.io' };
    const watermarkText = `${candidateUser.email || candidateUser.name} · VERIFIED-EXAM · ${new Date().toISOString().slice(0, 19)}`;

    const overlay = document.createElement('div');
    overlay.className = 'proctor-exam-wrapper';
    overlay.innerHTML = `
      <!-- Top Proctored Header -->
      <div class="proctor-top-bar">
        <div style="display:flex; align-items:center; gap:1rem; flex-wrap:wrap;">
          <span class="proctor-live-status">
            <span class="proctor-rec-dot"></span> LIVE AI PROCTORING
          </span>
          <h3 style="font-size:1.15rem; font-weight:800; color:#F8FAFC; margin:0;">${asm.title}</h3>
          <span style="font-size:0.75rem; background:#1E293B; color:#94A3B8; padding:0.25rem 0.55rem; border-radius:4px; font-weight:600;">
            🎯 75% BENCHMARK TO PASS
          </span>
        </div>
        <div style="display:flex; align-items:center; gap:1.25rem;">
          <div style="text-align:right;">
            <span style="font-size:0.72rem; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; display:block;">Time Remaining</span>
            <span id="exam-timer" style="font-family:var(--font-mono); font-size:1.25rem; font-weight:800; color:#38BDF8;">15:00</span>
          </div>
          <div style="background:rgba(239, 68, 68, 0.2); border:1px solid #EF4444; color:#FCA5A5; font-size:0.8rem; font-weight:700; padding:0.3rem 0.75rem; border-radius:4px;">
            ⚠️ Violations: <span id="proctor-violations-count">0</span>
          </div>
          <button id="cancel-exam-btn" class="btn btn-xs btn-outline" style="border-color:#475569; color:#94A3B8;">
            Exit Exam &times;
          </button>
        </div>
      </div>

      <!-- Flashing Proctor Alarm Banner -->
      <div id="proctor-alarm-banner" class="proctor-alarm-banner" style="display:none; margin:0.75rem 1.5rem 0;">
        <span class="material-symbols-outlined">warning</span>
        <span id="proctor-alarm-text">PROCTORING ALERT: SECONDARY DEVICE DETECTED</span>
      </div>

      <!-- Main Proctor Layout -->
      <div class="proctor-body-layout">
        <!-- Center Question View with Anti-Google Lens Watermark -->
        <div class="proctor-quiz-main">
          <div class="proctor-watermark-overlay"></div>
          <div class="proctor-watermark-text">${watermarkText}</div>

          <div style="position:relative; z-index:2; max-width:780px; margin:0 auto;">
            <!-- Active Question Container -->
            <div id="proctor-question-container" style="background:#111827; border:1px solid #1F2937; border-radius:var(--radius-lg); padding:2rem; box-shadow:0 10px 25px rgba(0,0,0,0.5); margin-bottom:1.5rem;">
              <!-- Dynamically populated by renderActiveQuestion() -->
            </div>

            <!-- Question Navigation Actions -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem;">
              <button type="button" class="btn btn-outline" id="proctor-prev-btn" style="border-color:#475569; color:#CBD5E1;">
                ← Previous Question
              </button>
              <span id="proctor-q-indicator" style="font-size:0.85rem; color:#94A3B8; font-weight:600;">
                Question 1 of ${questions.length}
              </span>
              <div style="display:flex; gap:0.75rem;">
                <button type="button" class="btn btn-secondary" id="proctor-next-btn">
                  Next Question →
                </button>
                <button type="button" class="btn btn-primary" id="submit-exam-btn" style="background:#10B981; border-color:#059669; display:none;">
                  Submit Assessment & Grade Results 🚀
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Right Proctor Sidebar: Live Webcam, Question Palette, Security Bench -->
        <div class="proctor-sidebar">
          <div>
            <div style="font-size:0.8rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.5rem; display:flex; justify-content:space-between; align-items:center;">
              <span>Vision Monitor</span>
              <span style="font-size:0.7rem; color:#60A5FA;">COCO-SSD</span>
            </div>
            <div class="proctor-webcam-container">
              <video id="proctor-webcam-video" autoplay playsinline muted class="proctor-webcam-video"></video>
              <canvas id="proctor-webcam-canvas" class="proctor-webcam-canvas"></canvas>
              <div class="proctor-telemetry-pill" id="proctor-telemetry-status">🟢 Initializing Vision...</div>
            </div>
          </div>

          <div>
            <div style="font-size:0.8rem; font-weight:700; color:#94A3B8; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.5rem;">
              Question Palette
            </div>
            <div class="proctor-palette-grid" id="proctor-palette-container">
              ${questions.map((_, idx) => `
                <button type="button" class="proctor-palette-btn ${idx === 0 ? 'active' : ''}" data-idx="${idx}">
                  ${idx + 1}
                </button>
              `).join('')}
            </div>
          </div>

          <div style="margin-top:auto; background:#1E293B; border:1px solid #334155; border-radius:var(--radius-md); padding:0.9rem;">
            <div style="font-size:0.78rem; font-weight:700; color:#CBD5E1; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:0.5rem;">
              Security Simulation Bench
            </div>
            <p style="font-size:0.72rem; color:#94A3B8; margin-bottom:0.6rem; line-height:1.4;">
              Demonstrate anti-cheat features & acoustic warning alerts:
            </p>
            <div style="display:flex; flex-direction:column; gap:0.4rem;">
              <button type="button" class="btn btn-xs" id="sim-phone-btn" style="background:#7F1D1D; color:#FCA5A5; border:1px solid #DC2626; width:100%; text-align:left;">
                📱 Simulate Phone Detection
              </button>
              <button type="button" class="btn btn-xs" id="sim-tab-btn" style="background:#334155; color:#E2E8F0; border:1px solid #475569; width:100%; text-align:left;">
                🪟 Simulate Tab Switch
              </button>
              <button type="button" class="btn btn-xs" id="sim-sound-btn" style="background:#334155; color:#E2E8F0; border:1px solid #475569; width:100%; text-align:left;">
                🔊 Test Acoustic Warning Alarm
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Audio & Alarm Helper
    const triggerViolation = (reason) => {
      violationsCount += 1;
      const countEl = overlay.querySelector('#proctor-violations-count');
      if (countEl) countEl.textContent = violationsCount;

      playAcousticAlarm();

      const banner = overlay.querySelector('#proctor-alarm-banner');
      const text = overlay.querySelector('#proctor-alarm-text');
      if (banner && text) {
        text.textContent = `PROCTOR ALERT: ${reason}`;
        banner.style.display = 'flex';
        clearTimeout(banner._hideTimeout);
        banner._hideTimeout = setTimeout(() => {
          banner.style.display = 'none';
        }, 4000);
      }
    };

    // Render Question Function
    const renderActiveQuestion = () => {
      const q = questions[currentQIndex];
      const qContainer = overlay.querySelector('#proctor-question-container');
      const indEl = overlay.querySelector('#proctor-q-indicator');
      const prevBtn = overlay.querySelector('#proctor-prev-btn');
      const nextBtn = overlay.querySelector('#proctor-next-btn');
      const submitBtn = overlay.querySelector('#submit-exam-btn');

      if (indEl) indEl.textContent = `Question ${currentQIndex + 1} of ${questions.length}`;
      if (prevBtn) prevBtn.disabled = currentQIndex === 0;

      if (currentQIndex === questions.length - 1) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'inline-flex';
      } else {
        if (nextBtn) nextBtn.style.display = 'inline-flex';
        if (submitBtn) submitBtn.style.display = 'none';
      }

      // Update Question Palette Highlights
      overlay.querySelectorAll('.proctor-palette-btn').forEach((btn, idx) => {
        btn.classList.toggle('active', idx === currentQIndex);
        btn.classList.toggle('answered', answers[questions[idx].id] !== undefined);
      });

      if (!q) return;

      const formattedPrompt = (q.text || q.prompt || '').replace(/`([^`]+)`/g, '<code style="background:#374151; color:#60A5FA; padding:0.15rem 0.4rem; border-radius:4px; font-family:var(--font-mono); font-size:0.9rem;">$1</code>');

      qContainer.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
          <span style="background:#2563EB; color:#FFF; font-size:0.75rem; font-weight:700; padding:0.2rem 0.6rem; border-radius:4px;">
            QUESTION ${currentQIndex + 1}
          </span>
          <span style="font-size:0.75rem; color:#94A3B8;">Multiple Choice Single Option</span>
        </div>
        <p style="font-size:1.05rem; font-weight:700; color:#F8FAFC; line-height:1.5; margin-bottom:1.5rem;">
          ${formattedPrompt}
        </p>
        <div style="display:flex; flex-direction:column; gap:0.75rem;">
          ${q.options.map((opt, optIdx) => {
            const isSelected = answers[q.id] === optIdx;
            return `
              <label class="proctor-opt-label" style="display:flex; align-items:center; gap:0.85rem; padding:0.9rem 1.15rem; background:${isSelected ? 'rgba(37, 99, 235, 0.2)' : '#1F2937'}; border:1.5px solid ${isSelected ? '#3B82F6' : '#374151'}; border-radius:var(--radius-md); cursor:pointer; transition:all 150ms ease;">
                <input type="radio" name="active_q_opt" value="${optIdx}" ${isSelected ? 'checked' : ''} style="width:18px; height:18px; accent-color:#2563EB; cursor:pointer;" />
                <span style="font-size:0.95rem; color:${isSelected ? '#93C5FD' : '#E2E8F0'}; line-height:1.4;">${opt}</span>
              </label>
            `;
          }).join('')}
        </div>
      `;

      // Bind Radio Click
      qContainer.querySelectorAll('input[name="active_q_opt"]').forEach(input => {
        input.addEventListener('change', (e) => {
          const val = parseInt(e.target.value, 10);
          answers[q.id] = val;
          renderActiveQuestion();
        });
      });
    };

    renderActiveQuestion();

    // Palette Navigation
    overlay.querySelectorAll('.proctor-palette-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentQIndex = parseInt(btn.dataset.idx, 10);
        renderActiveQuestion();
      });
    });

    // Prev / Next Navigation
    overlay.querySelector('#proctor-prev-btn').addEventListener('click', () => {
      if (currentQIndex > 0) {
        currentQIndex -= 1;
        renderActiveQuestion();
      }
    });

    overlay.querySelector('#proctor-next-btn').addEventListener('click', () => {
      if (currentQIndex < questions.length - 1) {
        currentQIndex += 1;
        renderActiveQuestion();
      }
    });

    // Timer Countdown
    let timeLeft = (asm.duration_minutes || 15) * 60;
    const timerEl = overlay.querySelector('#exam-timer');
    const timerInterval = setInterval(() => {
      timeLeft -= 1;
      const mins = Math.floor(timeLeft / 60);
      const secs = timeLeft % 60;
      if (timerEl) timerEl.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        overlay.querySelector('#submit-exam-btn').click();
      }
    }, 1000);

    // Tab Switch / Blur Monitor
    const onWindowBlur = () => {
      triggerViolation("WINDOW FOCUS LOST / TAB SWITCH DETECTED");
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        triggerViolation("BACKGROUND TAB DETECTED / LOSS OF VISIBILITY");
      }
    };
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Initialize Webcam & COCO-SSD
    const videoEl = overlay.querySelector('#proctor-webcam-video');
    const canvasEl = overlay.querySelector('#proctor-webcam-canvas');
    const statusPill = overlay.querySelector('#proctor-telemetry-status');

    const startWebcamAndProctor = async () => {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          videoStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 320 }, height: { ideal: 240 } },
            audio: false
          });
          videoEl.srcObject = videoStream;
          await videoEl.play();
          if (statusPill) statusPill.textContent = "🟢 Camera Live • Loading COCO-SSD...";
        } else {
          throw new Error("Camera API not available");
        }
      } catch (camErr) {
        console.warn("Webcam access unavailable, launching simulated camera feed", camErr);
        if (statusPill) statusPill.textContent = "🟡 Emulated Camera Feed Active";

        // Animated scanline radar on canvas
        const ctx = canvasEl.getContext('2d');
        canvasEl.width = 320;
        canvasEl.height = 240;
        let scanY = 0;
        simulatedCanvasInterval = setInterval(() => {
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(0, 0, 320, 240);
          ctx.fillStyle = '#1E293B';
          ctx.beginPath();
          ctx.arc(160, 120, 50, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, scanY);
          ctx.lineTo(320, scanY);
          ctx.stroke();
          scanY = (scanY + 3) % 240;
        }, 50);
      }

      // Load COCO-SSD if available
      try {
        if (window.cocoSsd) {
          cocoModel = await window.cocoSsd.load();
          if (statusPill) statusPill.textContent = "🟢 Vision Active • Scanning for Devices";

          detectionInterval = setInterval(async () => {
            if (!cocoModel || !videoEl || videoEl.readyState < 2) return;
            try {
              const predictions = await cocoModel.detect(videoEl);
              const ctx = canvasEl.getContext('2d');
              canvasEl.width = videoEl.videoWidth || 320;
              canvasEl.height = videoEl.videoHeight || 240;
              ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);

              for (const p of predictions) {
                const label = p.class.toLowerCase();
                const [x, y, w, h] = p.bbox;

                if (['cell phone', 'remote', 'laptop', 'book', 'tablet'].includes(label)) {
                  ctx.strokeStyle = '#EF4444';
                  ctx.lineWidth = 3;
                  ctx.strokeRect(x, y, w, h);
                  ctx.fillStyle = '#EF4444';
                  ctx.font = 'bold 12px sans-serif';
                  ctx.fillText(`VIOLATION: ${label.toUpperCase()} (${Math.round(p.score * 100)}%)`, x, y > 15 ? y - 5 : 15);

                  triggerViolation(`SECONDARY DEVICE DETECTED: ${label.toUpperCase()}`);
                }
              }
            } catch (err) {
              console.warn("COCO-SSD detection frame error", err);
            }
          }, 1500);
        }
      } catch (modelErr) {
        console.warn("Could not load COCO-SSD model", modelErr);
        if (statusPill) statusPill.textContent = "🟢 Heuristic Vision Guard Active";
      }
    };

    startWebcamAndProctor();

    // Security Simulation Buttons
    overlay.querySelector('#sim-phone-btn').addEventListener('click', () => {
      const ctx = canvasEl.getContext('2d');
      canvasEl.width = 320;
      canvasEl.height = 240;
      ctx.strokeStyle = '#EF4444';
      ctx.lineWidth = 3;
      ctx.strokeRect(40, 40, 100, 150);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('VIOLATION: CELL PHONE (94%)', 40, 30);
      triggerViolation('SECONDARY DEVICE DETECTED: CELL PHONE');
    });

    overlay.querySelector('#sim-tab-btn').addEventListener('click', () => {
      triggerViolation('TAB SWITCH SIMULATION: BLUR DETECTED');
    });

    overlay.querySelector('#sim-sound-btn').addEventListener('click', () => {
      playAcousticAlarm();
      state.showToast("Acoustic alarm sounded (880Hz / 440Hz alert tone)", "info");
    });

    // Cleanup resources
    const cleanupExam = () => {
      clearInterval(timerInterval);
      if (detectionInterval) clearInterval(detectionInterval);
      if (simulatedCanvasInterval) clearInterval(simulatedCanvasInterval);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
      state.stopExam();
    };

    // Cancel / Exit Button
    overlay.querySelector('#cancel-exam-btn').addEventListener('click', () => {
      if (confirm("Are you sure you want to exit the exam? Your current progress will be lost.")) {
        cleanupExam();
        overlay.remove();
      }
    });

    // Submit Exam & Grade
    overlay.querySelector('#submit-exam-btn').addEventListener('click', async () => {
      cleanupExam();

      const submitBtn = overlay.querySelector('#submit-exam-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Grading Assessment...';
      }

      try {
        const result = await api.submitAssessment(asm.id, {
          candidate_id: candidateId,
          answers: answers,
          flags: [
            `total_violations: ${violationsCount}`,
            violationsCount > 2 ? 'suspicious_activity' : 'clean_session'
          ]
        });

        overlay.remove();
        this.openAssessmentResultModal(result, asm.title, asm.id, candidateId);
        state.notify();
      } catch (err) {
        overlay.remove();
        state.showToast(err.message, 'danger');
      }
    });
  }

  openAssessmentResultModal(result, title, assessmentId, candidateId) {
    const isPassed = result.passed;
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content" style="max-width:620px; text-align:center;">
        <div style="font-size:3.5rem; margin-bottom:0.75rem;">
          ${isPassed ? '🎉' : '📚'}
        </div>
        <h2 style="font-size:1.8rem; font-weight:800; color:var(--primary); margin-bottom:0.35rem;">
          ${isPassed ? 'Assessment Verified!' : 'Benchmark Not Reached'}
        </h2>
        <p style="font-size:0.95rem; color:var(--text-muted); margin-bottom:1.25rem;">
          ${title}
        </p>

        <div style="background:${isPassed ? 'var(--success-bg)' : '#F1F5F9'}; border:1px solid ${isPassed ? 'var(--success)' : '#CBD5E1'}; border-radius:var(--radius-lg); padding:1.25rem; margin-bottom:1.25rem;">
          <div style="font-size:3.2rem; font-weight:800; color:${isPassed ? 'var(--success)' : 'var(--text-muted)'}; line-height:1;">
            ${result.score}%
          </div>
          <p style="font-size:0.85rem; font-weight:700; color:${isPassed ? 'var(--success)' : 'var(--text-muted)'}; margin-top:0.5rem; margin-bottom:0;">
            ${isPassed ? '✓ OFFICIAL VERIFIED BADGE AWARDED (Threshold: 75%)' : 'Passing Threshold: 75% required for verification'}
          </p>
        </div>

        <p style="font-size:0.9rem; color:var(--text-main); margin-bottom:1.25rem; text-align:left; background:#F8FAFC; padding:0.9rem 1.1rem; border-radius:var(--radius-md); border-left:4px solid ${isPassed ? 'var(--success)' : 'var(--secondary)'}; line-height:1.5;">
          ${isPassed 
            ? 'Congratulations! Your score has been cryptographically recorded on your Verified Skill Passport. Recruiter and HR modes can now see your verified ability.' 
            : 'You scored below the 75% threshold required for official verification. You can review the questions below, brush up, and retake this quiz at any time!'}
        </p>

        ${result.feedback && result.feedback.length > 0 ? `
          <div style="text-align:left; margin-bottom:1.25rem; max-height:180px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-md); padding:0.75rem;">
            <div style="font-size:0.8rem; font-weight:700; color:var(--primary); margin-bottom:0.5rem;">Question Feedback & Explanations:</div>
            ${result.feedback.map((fb, idx) => `
              <div style="font-size:0.78rem; margin-bottom:0.4rem; padding-bottom:0.4rem; border-bottom:1px solid #F1F5F9;">
                <span style="font-weight:700; color:${fb.is_correct ? 'var(--success)' : 'var(--danger)'};">
                  ${fb.is_correct ? '✓ Correct' : '✗ Incorrect'}
                </span>
                ${fb.explanation ? `<span style="color:#64748B; margin-left:0.35rem;">— ${fb.explanation}</span>` : ''}
              </div>
            `).join('')}
          </div>
        ` : ''}

        <div style="display:flex; gap:0.75rem; justify-content:center; flex-wrap:wrap;">
          ${!isPassed ? `
            <button class="btn btn-secondary" id="retake-quiz-btn" style="flex:1;">
              ⚡ Retake Quiz Now
            </button>
            <button class="btn btn-outline" id="browse-other-skills-btn" style="flex:1;">
              Browse Other Skills
            </button>
          ` : `
            <button class="btn btn-primary" id="view-passport-btn" style="flex:1;">
              🛡️ View Updated Skill Passport →
            </button>
            <button class="btn btn-outline" id="take-another-quiz-btn" style="flex:1;">
              ⚡ Take Another Skill Quiz
            </button>
          `}
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    if (modal.querySelector('#retake-quiz-btn')) {
      modal.querySelector('#retake-quiz-btn').addEventListener('click', async () => {
        modal.remove();
        await this.openAssessmentModal(assessmentId, candidateId);
      });
    }

    if (modal.querySelector('#browse-other-skills-btn')) {
      modal.querySelector('#browse-other-skills-btn').addEventListener('click', () => {
        modal.remove();
        state.setTab('assessments');
      });
    }

    if (modal.querySelector('#view-passport-btn')) {
      modal.querySelector('#view-passport-btn').addEventListener('click', () => {
        modal.remove();
        state.setTab('passport');
      });
    }

    if (modal.querySelector('#take-another-quiz-btn')) {
      modal.querySelector('#take-another-quiz-btn').addEventListener('click', () => {
        modal.remove();
        state.setTab('assessments');
      });
    }
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
  // 4. HR / RECRUITER DASHBOARD (SkillBridge Executive Mode)
  // =========================================================================
  async renderHrDashboard() {
    const hrId = state.activeUser.id;
    let jobs = [];
    let candidates = [];
    let applications = [];

    try {
      [jobs, candidates] = await Promise.all([
        api.getMyJobs(hrId).catch(() => api.getJobs()),
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
                <p>Executive Recruiter</p>
                <span class="badge badge-role" style="margin-top:0.35rem; font-size:0.7rem;">
                  NovaTech Talent Intelligence
                </span>
              </div>
            </div>

            <nav class="sidebar-nav">
              <button class="sidebar-link ${currentTab === 'overview' ? 'active' : ''}" data-tab="overview">
                <span class="sidebar-link-content">📊 Overview & 75/25 KPIs</span>
              </button>
              <button class="sidebar-link ${currentTab === 'create-job' ? 'active' : ''}" data-tab="create-job">
                <span class="sidebar-link-content">⚙️ Post 75/25 Weighted Job</span>
              </button>
              <button class="sidebar-link ${currentTab === 'candidates' ? 'active' : ''}" data-tab="candidates">
                <span class="sidebar-link-content">🎯 Candidate Pipeline Dossier</span>
                <span class="sidebar-badge">${candidates.length}</span>
              </button>
              <button class="sidebar-link ${currentTab === 'pipeline' ? 'active' : ''}" data-tab="pipeline">
                <span class="sidebar-link-content">📋 Pipeline Kanban</span>
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
      const avgMatchScore = 84;
      const strokeDashoffset = Math.round(157 - (157 * avgMatchScore) / 100);

      return `
        <!-- 1. Executive Recruiter Context Bar -->
        <div class="recruiter-context-bar">
          <div style="display:flex; align-items:center; gap:0.85rem; flex-wrap:wrap;">
            <div class="recruiter-org-pill">
              <span class="material-symbols-outlined" style="font-size:1.15rem; color:#60A5FA;">business</span>
              <span>NovaTech Enterprise Intelligence</span>
            </div>
            <span style="font-size:0.75rem; background:rgba(37,99,235,0.25); border:1px solid #3B82F6; color:#93C5FD; padding:0.25rem 0.65rem; border-radius:var(--radius-sm); font-weight:700;">
              ⚡ DUAL-TIER 75/25 MATCHING ENGINE ACTIVE
            </span>
          </div>
          <div style="display:flex; align-items:center; gap:1rem;">
            <span style="font-size:0.8rem; color:#94A3B8;">Hiring Lead: <strong>${state.activeUser.name}</strong></span>
            <button class="btn btn-secondary btn-sm" id="hr-top-post-btn">
              + Post Weighted Role
            </button>
          </div>
        </div>

        <!-- 2. Recruiter KPI Cards Grid with Dual Progress Bar & Circular SVG Gauge -->
        <div class="recruiter-kpi-grid">
          <!-- KPI 1: Active Postings -->
          <div class="recruiter-kpi-card">
            <div class="kpi-top-row">
              <span class="kpi-title">Active Roles</span>
              <span class="material-symbols-outlined" style="color:#2563EB;">work</span>
            </div>
            <div class="kpi-value">${jobs.length}</div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:0.4rem 0 0;">
              Live technical requisitions accepting verified profiles.
            </p>
          </div>

          <!-- KPI 2: Algorithm Split Bar -->
          <div class="recruiter-kpi-card">
            <div class="kpi-top-row">
              <span class="kpi-title">Algorithm Split</span>
              <span class="material-symbols-outlined" style="color:#10B981;">tune</span>
            </div>
            <div class="kpi-value">75 / 25</div>
            <div class="kpi-dual-progress">
              <div class="kpi-progress-mand" title="75% Core Mandatory"></div>
              <div class="kpi-progress-pref" title="25% Preferred Bonus"></div>
            </div>
            <div style="display:flex; justify-content:space-between; font-size:0.72rem; color:var(--text-muted); margin-top:0.35rem;">
              <span style="color:#2563EB; font-weight:700;">75% Mandatory</span>
              <span style="color:#10B981; font-weight:700;">25% Preferred</span>
            </div>
          </div>

          <!-- KPI 3: Pipeline Talent -->
          <div class="recruiter-kpi-card">
            <div class="kpi-top-row">
              <span class="kpi-title">Ranked Candidates</span>
              <span class="material-symbols-outlined" style="color:#8B5CF6;">school</span>
            </div>
            <div class="kpi-value">${candidates.length}</div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:0.4rem 0 0;">
              Skill passport verified candidates evaluated.
            </p>
          </div>

          <!-- KPI 4: Circular SVG Average Fit Ring Gauge -->
          <div class="recruiter-kpi-card">
            <div class="kpi-top-row">
              <span class="kpi-title">Avg Candidate Fit</span>
              <div class="kpi-svg-ring-wrap">
                <svg class="kpi-svg-ring" viewBox="0 0 60 60">
                  <circle class="kpi-svg-ring-circle-bg" cx="30" cy="30" r="25"></circle>
                  <circle class="kpi-svg-ring-circle-fill" cx="30" cy="30" r="25" style="stroke-dashoffset: ${strokeDashoffset};"></circle>
                </svg>
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:800; color:#2563EB;">
                  ${avgMatchScore}%
                </div>
              </div>
            </div>
            <div class="kpi-value" style="font-size:1.4rem;">${avgMatchScore}% Composite</div>
            <p style="font-size:0.78rem; color:var(--text-muted); margin:0.4rem 0 0;">
              Top-quartile compatibility across pipeline requisitions.
            </p>
          </div>
        </div>

        <!-- 3. Managed Roles View with 75/25 Competency Breakdown -->
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.25rem;">
          <div>
            <h3 style="font-size:1.25rem; font-weight:800; color:var(--primary); margin:0;">Managed Technical Roles</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin:0.25rem 0 0;">
              Review role definitions, mandatory/preferred chips, and live candidate compatibility dossiers.
            </p>
          </div>
          <button class="btn btn-outline btn-sm" id="hr-create-job-quick-btn">+ New 75/25 Role</button>
        </div>

        <div class="managed-roles-grid">
          ${jobs.map(j => {
            const reqSkills = j.required_skills || [];
            const mandSkills = reqSkills.filter(s => s.is_required !== false);
            const prefSkills = reqSkills.filter(s => s.is_required === false);

            return `
              <div class="managed-role-card">
                <div class="managed-role-header">
                  <div>
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.25rem;">
                      <span class="badge badge-role">${j.company_name}</span>
                      <span class="badge" style="background:#F1F5F9; color:#475569; font-size:0.72rem;">${j.experience_level || 'Senior'}</span>
                    </div>
                    <h4 style="font-size:1.25rem; font-weight:800; color:var(--primary); margin:0;">${j.title}</h4>
                    <p style="font-size:0.85rem; color:var(--text-muted); margin:0.25rem 0 0;">
                      📍 ${j.location} • Compensation: $${j.salary_min?.toLocaleString()} - $${j.salary_max?.toLocaleString()}
                    </p>
                  </div>
                  <button class="btn btn-secondary inspect-dossier-btn" data-job="${j.id}">
                    🎯 Inspect Candidate Pipeline Dossier →
                  </button>
                </div>

                <!-- 75% Mandatory Competencies Cluster -->
                <div style="margin-top:0.75rem;">
                  <div style="font-size:0.78rem; font-weight:700; color:#1D4ED8; text-transform:uppercase; letter-spacing:0.5px;">
                    🔵 75% Core Mandatory Requirements:
                  </div>
                  <div class="chips-cluster">
                    ${mandSkills.length > 0 ? mandSkills.map(s => `
                      <span class="chip-mandatory">
                        ✓ ${s.skill_name || s.skill_id} (${Math.round((s.weight || 0.35) * 100)}%)
                      </span>
                    `).join('') : `
                      <span class="chip-mandatory">✓ Python Backend Engineering (40%)</span>
                      <span class="chip-mandatory">✓ PostgreSQL & Architecture (35%)</span>
                    `}
                  </div>
                </div>

                <!-- 25% Preferred Competencies Cluster -->
                <div style="margin-top:0.75rem;">
                  <div style="font-size:0.78rem; font-weight:700; color:#15803D; text-transform:uppercase; letter-spacing:0.5px;">
                    🟢 25% Preferred Bonus Competencies:
                  </div>
                  <div class="chips-cluster">
                    ${prefSkills.length > 0 ? prefSkills.map(s => `
                      <span class="chip-preferred">
                        ★ ${s.skill_name || s.skill_id} (${Math.round((s.weight || 0.25) * 100)}%)
                      </span>
                    `).join('') : `
                      <span class="chip-preferred">★ Docker & Kubernetes (15%)</span>
                      <span class="chip-preferred">★ Redis / Caching (10%)</span>
                    `}
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    if (tab === 'create-job') {
      return `
        <div class="dashboard-header">
          <div class="dashboard-title">
            <h2>Weighted 75/25 Job Posting Builder</h2>
            <p>Construct requisition criteria with explainable 75% Mandatory and 25% Preferred competency weights.</p>
          </div>
        </div>

        <div class="card" style="max-width:850px;">
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
              <label class="form-label">Job Description & Responsibilities</label>
              <textarea class="form-textarea" id="hr-job-desc" required>Architect and optimize high-throughput distributed microservices in Python, design scalable PostgreSQL relational schemas, and maintain secure token authentication.</textarea>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:1rem;">
              <div class="form-group">
                <label class="form-label">Experience Level</label>
                <select class="form-select" id="hr-job-exp">
                  <option selected>Senior (4+ years)</option>
                  <option>Mid-Level (2+ years)</option>
                  <option>Lead Engineer / Architect</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label">Min Salary ($)</label>
                <input type="number" class="form-input" id="hr-salary-min" value="135000" />
              </div>
              <div class="form-group">
                <label class="form-label">Max Salary ($)</label>
                <input type="number" class="form-input" id="hr-salary-max" value="180000" />
              </div>
            </div>

            <!-- Interactive 75/25 Skill Weight Builder -->
            <div style="background:#F8FAFC; border:1px solid var(--border); border-radius:var(--radius-md); padding:1.25rem; margin:1.25rem 0;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.75rem;">
                <label style="font-size:0.95rem; font-weight:800; color:var(--primary); margin:0;">
                  ⚡ 75/25 Competency Weight Allocation Builder
                </label>
                <span style="font-size:0.75rem; color:var(--text-muted);">
                  Formula: 75% Core Mandatory + 25% Preferred Bonus
                </span>
              </div>

              <!-- Input and Pool Selector -->
              <div style="display:flex; gap:0.75rem; align-items:center; flex-wrap:wrap; margin-bottom:1rem;">
                <input type="text" class="form-input" id="hr-skill-chip-input" placeholder="Enter competency name (e.g. FastAPI, Kubernetes, Redis, AWS...)" style="flex:1; min-width:260px;" />
                <div style="display:flex; gap:0.4rem;">
                  <button type="button" class="btn btn-sm" id="pool-toggle-mand" style="background:#2563EB; color:#FFF; font-weight:700;">
                    🔵 Mandatory (75%)
                  </button>
                  <button type="button" class="btn btn-sm btn-outline" id="pool-toggle-pref" style="border-color:#10B981; color:#059669; font-weight:700;">
                    🟢 Preferred (25%)
                  </button>
                </div>
                <button type="button" class="btn btn-secondary btn-sm" id="add-skill-chip-btn">
                  + Add Chip
                </button>
              </div>

              <!-- Live Chips Container -->
              <div id="hr-chips-preview-container">
                <!-- Dynamically populated by JS attachHrEvents -->
              </div>
            </div>

            <button type="submit" class="btn btn-primary btn-lg" style="width:100%; margin-top:0.5rem;">
              💼 Publish 75/25 Weighted Job Opening →
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
            <h2>Live Candidate Pipeline Dossier</h2>
            <p>Ranked candidate applicants evaluated under the Dual-Tier 75/25 Matching Engine.</p>
          </div>
          <span class="formula-tag">Algorithm: 75% Core Mandatory + 25% Preferred Bonus</span>
        </div>

        <div style="margin-bottom:1.5rem; display:flex; align-items:center; gap:0.85rem; background:#FFFFFF; border:1px solid var(--border); padding:0.85rem 1.25rem; border-radius:var(--radius-md);">
          <span style="font-size:0.9rem; font-weight:700; color:var(--primary);">Evaluating For Role:</span>
          <select class="form-select" id="hr-job-selector" style="max-width:400px;">
            ${jobs.map(j => `<option value="${j.id}" ${j.id === selectedJob.id ? 'selected' : ''}>${j.title} (${j.company_name})</option>`).join('')}
          </select>
        </div>

        <!-- Live Candidate Pipeline Dossier Cards Container -->
        <div id="hr-candidate-matches-list" style="display:flex; flex-direction:column; gap:1.25rem;">
          <div class="card" style="text-align:center; padding:3rem;">
            <p style="color:var(--text-muted); font-size:0.95rem;">Loading ranked candidate pipeline dossiers...</p>
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
              <button class="btn btn-sm btn-secondary advance-stage-btn" data-app="app-02" data-next="Interview Scheduled">Schedule Interview →</button>
            </div>
          </div>

          <div class="kanban-col">
            <div class="kanban-col-title">
              <span>Interview Scheduled</span>
              <span class="badge" style="background:var(--secondary); color:#fff;">1</span>
            </div>
            <div class="kanban-item">
              <b>Alex Rivera</b>
              <span style="font-size:0.75rem; color:var(--text-muted);">Full-Stack (94% Match)</span>
              <span style="font-size:0.7rem; color:var(--success);">📅 Confirmed Technical Round</span>
              <button class="btn btn-sm btn-accent advance-stage-btn" data-app="app-01" data-next="Offer Extended">Extend Offer Letter →</button>
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
          <div style="display:flex; justify-content:space-between; align-items:center; border:1px solid var(--border); padding:1.25rem; border-radius:var(--radius-md); flex-wrap:wrap; gap:1rem;">
            <div>
              <span class="badge badge-verified">CONFIRMED INTERVIEW</span>
              <h4 style="font-size:1.15rem; font-weight:700; color:var(--primary); margin-top:0.35rem;">Alex Rivera — Senior Backend & Distributed Systems Engineer</h4>
              <p style="font-size:0.85rem; color:var(--text-muted); margin:0.25rem 0 0;">
                Agenda: Async Python architecture, PostgreSQL indexing & Docker microservices
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

    // Navigation buttons
    const topPostBtn = this.appContainer.querySelector('#hr-top-post-btn');
    if (topPostBtn) topPostBtn.addEventListener('click', () => state.setTab('create-job'));

    const quickPostBtn = this.appContainer.querySelector('#hr-create-job-quick-btn');
    if (quickPostBtn) quickPostBtn.addEventListener('click', () => state.setTab('create-job'));

    // Inspect Dossier buttons from overview
    this.appContainer.querySelectorAll('.inspect-dossier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const jobId = btn.dataset.job;
        state.setTab('candidates');
        setTimeout(() => {
          const selector = this.appContainer.querySelector('#hr-job-selector');
          if (selector && jobId) {
            selector.value = jobId;
            selector.dispatchEvent(new Event('change'));
          }
        }, 50);
      });
    });

    // =========================================================================
    // 75/25 Job Posting Builder Chips State & Logic
    // =========================================================================
    let activePool = 'mandatory'; // 'mandatory' | 'preferred'
    const mandatoryChips = ['Python & FastAPI', 'PostgreSQL & Database Design', 'Distributed Systems'];
    const preferredChips = ['Docker & Kubernetes', 'Redis Caching', 'Cloud Architecture'];

    const renderChipsPreview = () => {
      const container = this.appContainer.querySelector('#hr-chips-preview-container');
      if (!container) return;

      const mandWeightPerChip = mandatoryChips.length > 0 ? (0.75 / mandatoryChips.length) : 0;
      const prefWeightPerChip = preferredChips.length > 0 ? (0.25 / preferredChips.length) : 0;

      container.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:1rem; margin-top:0.5rem;">
          <!-- Mandatory Chips (75%) -->
          <div style="background:#FFF; border:1px solid #BFDBFE; border-radius:var(--radius-sm); padding:0.75rem;">
            <div style="font-size:0.8rem; font-weight:700; color:#1D4ED8; margin-bottom:0.5rem;">
              🔵 Mandatory Pool: 75% Total (${mandatoryChips.length} competencies, ~${Math.round(mandWeightPerChip * 100)}% each)
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
              ${mandatoryChips.map((s, idx) => `
                <span class="chip-mandatory" style="font-size:0.75rem;">
                  ✓ ${s}
                  <button type="button" class="remove-chip-btn" data-pool="mandatory" data-idx="${idx}" style="background:none; border:none; color:#1D4ED8; cursor:pointer; font-weight:bold; margin-left:4px;">&times;</button>
                </span>
              `).join('')}
              ${mandatoryChips.length === 0 ? '<span style="font-size:0.75rem; color:#94A3B8;">No mandatory skills added yet</span>' : ''}
            </div>
          </div>

          <!-- Preferred Chips (25%) -->
          <div style="background:#FFF; border:1px solid #BBF7D0; border-radius:var(--radius-sm); padding:0.75rem;">
            <div style="font-size:0.8rem; font-weight:700; color:#15803D; margin-bottom:0.5rem;">
              🟢 Preferred Pool: 25% Total (${preferredChips.length} competencies, ~${Math.round(prefWeightPerChip * 100)}% each)
            </div>
            <div style="display:flex; flex-wrap:wrap; gap:0.4rem;">
              ${preferredChips.map((s, idx) => `
                <span class="chip-preferred" style="font-size:0.75rem;">
                  ★ ${s}
                  <button type="button" class="remove-chip-btn" data-pool="preferred" data-idx="${idx}" style="background:none; border:none; color:#15803D; cursor:pointer; font-weight:bold; margin-left:4px;">&times;</button>
                </span>
              `).join('')}
              ${preferredChips.length === 0 ? '<span style="font-size:0.75rem; color:#94A3B8;">No preferred skills added yet</span>' : ''}
            </div>
          </div>
        </div>
      `;

      // Bind remove buttons
      container.querySelectorAll('.remove-chip-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          const pool = btn.dataset.pool;
          const idx = parseInt(btn.dataset.idx, 10);
          if (pool === 'mandatory') {
            mandatoryChips.splice(idx, 1);
          } else {
            preferredChips.splice(idx, 1);
          }
          renderChipsPreview();
        });
      });
    };

    // Initialize chips preview if in create-job tab
    renderChipsPreview();

    const poolToggleMand = this.appContainer.querySelector('#pool-toggle-mand');
    const poolTogglePref = this.appContainer.querySelector('#pool-toggle-pref');

    if (poolToggleMand && poolTogglePref) {
      poolToggleMand.addEventListener('click', () => {
        activePool = 'mandatory';
        poolToggleMand.className = 'btn btn-sm';
        poolToggleMand.style.background = '#2563EB';
        poolToggleMand.style.color = '#FFF';
        poolTogglePref.className = 'btn btn-sm btn-outline';
        poolTogglePref.style.background = 'transparent';
        poolTogglePref.style.color = '#059669';
      });

      poolTogglePref.addEventListener('click', () => {
        activePool = 'preferred';
        poolTogglePref.className = 'btn btn-sm';
        poolTogglePref.style.background = '#10B981';
        poolTogglePref.style.color = '#FFF';
        poolToggleMand.className = 'btn btn-sm btn-outline';
        poolToggleMand.style.background = 'transparent';
        poolToggleMand.style.color = '#2563EB';
      });
    }

    const addSkillChipBtn = this.appContainer.querySelector('#add-skill-chip-btn');
    const skillChipInput = this.appContainer.querySelector('#hr-skill-chip-input');
    if (addSkillChipBtn && skillChipInput) {
      const handleAddChip = () => {
        const val = skillChipInput.value.trim();
        if (!val) return;
        if (activePool === 'mandatory') {
          mandatoryChips.push(val);
        } else {
          preferredChips.push(val);
        }
        skillChipInput.value = '';
        renderChipsPreview();
      };

      addSkillChipBtn.addEventListener('click', handleAddChip);
      skillChipInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddChip();
        }
      });
    }

    // Create Job Form Submit
    const createJobForm = this.appContainer.querySelector('#hr-create-job-form');
    if (createJobForm) {
      createJobForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Calculate mathematical weights: 0.75 / mandCount, 0.25 / prefCount
        const mandWeight = mandatoryChips.length > 0 ? (0.75 / mandatoryChips.length) : 0;
        const prefWeight = preferredChips.length > 0 ? (0.25 / preferredChips.length) : 0;

        const skillsPayload = [
          ...mandatoryChips.map((s, idx) => ({
            skill_id: `mand-${idx + 1}`,
            skill_name: s,
            is_required: true,
            weight: Number(mandWeight.toFixed(4))
          })),
          ...preferredChips.map((s, idx) => ({
            skill_id: `pref-${idx + 1}`,
            skill_name: s,
            is_required: false,
            weight: Number(prefWeight.toFixed(4))
          }))
        ];

        try {
          await api.createJob({
            created_by: hrId,
            company_name: document.getElementById('hr-company-name').value,
            title: document.getElementById('hr-job-title').value,
            description: document.getElementById('hr-job-desc').value,
            experience_level: document.getElementById('hr-job-exp').value,
            salary_min: parseInt(document.getElementById('hr-salary-min').value, 10),
            salary_max: parseInt(document.getElementById('hr-salary-max').value, 10),
            location: "San Francisco, CA / Hybrid",
            required_skills: skillsPayload
          });

          state.showToast("75/25 Weighted Job Opening published to platform!", "success");
          state.setTab('overview');
        } catch (err) {
          state.showToast(err.message, 'danger');
        }
      });
    }

    // =========================================================================
    // Candidate Pipeline Dossier Tab Logic
    // =========================================================================
    const matchesList = this.appContainer.querySelector('#hr-candidate-matches-list');
    const jobSelector = this.appContainer.querySelector('#hr-job-selector');

    if (matchesList && jobSelector) {
      const loadDossiers = async (jobId) => {
        matchesList.innerHTML = `
          <div class="card" style="text-align:center; padding:3rem;">
            <p style="color:var(--text-muted);">Evaluating candidates under Dual-Tier 75/25 Matching Engine...</p>
          </div>
        `;

        try {
          // Fetch live candidates for this job
          let candidatesData = await api.getJobCandidates(jobId).catch(() => []);
          if (!candidatesData || candidatesData.length === 0) {
            // Fallback to job matches
            const rawMatches = await api.getJobMatches(jobId).catch(() => []);
            candidatesData = rawMatches.map(rm => ({
              candidate_id: rm.candidate?.id || rm.candidate_id,
              full_name: rm.candidate?.full_name || rm.name || 'Candidate',
              email: rm.candidate?.email || 'candidate@idea2impact.io',
              avatar_url: rm.candidate?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
              match_score: rm.match?.score || rm.match_score || 85,
              mandatory_score: rm.match?.mandatory_score_component || 60,
              preferred_score: rm.match?.preferred_score_component || 25,
              learning_commitment: "Candidate submitted learning commitment to bridge Kubernetes & Distributed Systems on Coursera.",
              application_status: "Under Review"
            }));
          }

          // Sort candidates by match_score descending
          candidatesData.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

          if (candidatesData.length === 0) {
            matchesList.innerHTML = `
              <div class="card" style="text-align:center; padding:3rem;">
                <p style="color:var(--text-muted); font-size:1.05rem;">No applicants evaluated for this job yet.</p>
              </div>
            `;
            return;
          }

          matchesList.innerHTML = candidatesData.map((cand, index) => {
            const rank = index + 1;
            const rankClass = rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : 'rank-3';
            const score = Math.round(cand.match_score || 84);
            const mandScore = cand.mandatory_score || Math.round(score * 0.75);
            const prefScore = cand.preferred_score || Math.round(score * 0.25);
            const status = cand.application_status || cand.status || 'Under Review';
            const candId = cand.candidate_id || cand.profile?.id || cand.profiles?.id || `cand-0${rank}`;
            const candName = cand.full_name || cand.profile?.full_name || cand.profiles?.full_name || 'Candidate';
            const candEmail = cand.email || cand.profile?.email || cand.profiles?.email || 'candidate@idea2impact.io';
            const avatar = cand.avatar_url || cand.profile?.avatar_url || cand.profiles?.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(candName)}`;

            return `
              <div class="dossier-card">
                <!-- Rank Badge -->
                <div class="dossier-rank-badge ${rankClass}">
                  #${rank} MATCH · ${score}% FIT
                </div>

                <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:1.25rem;">
                  <!-- Left: Candidate Info -->
                  <div class="dossier-candidate-info">
                    <img src="${avatar}" class="dossier-avatar" alt="${candName}"/>
                    <div>
                      <h4 style="font-size:1.25rem; font-weight:800; color:var(--primary); margin:0;">${candName}</h4>
                      <p style="font-size:0.85rem; color:var(--text-muted); margin:0.25rem 0 0;">
                        ${candEmail} • Verified Skill Passport Profile
                      </p>
                    </div>
                  </div>

                  <!-- Right: Match Gauge & 75/25 Breakdown -->
                  <div style="background:#F8FAFC; border:1px solid var(--border); border-radius:var(--radius-md); padding:0.75rem 1.15rem; min-width:240px;">
                    <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.25rem;">
                      <span style="font-weight:700; color:#2563EB;">Core Mandatory:</span>
                      <span style="font-weight:800; color:#2563EB;">${mandScore}% / 75%</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.82rem; margin-bottom:0.25rem;">
                      <span style="font-weight:700; color:#10B981;">Preferred Bonus:</span>
                      <span style="font-weight:800; color:#10B981;">${prefScore}% / 25%</span>
                    </div>
                    <div style="border-top:1px solid #E2E8F0; padding-top:0.25rem; display:flex; justify-content:space-between; font-size:0.85rem;">
                      <span style="font-weight:800; color:var(--primary);">Composite Score:</span>
                      <span style="font-weight:800; color:var(--primary);">${score}%</span>
                    </div>
                  </div>
                </div>

                <!-- Learning Commitment Quote -->
                <div class="learning-commitment-quote">
                  "<strong>Bridging Action Plan:</strong> ${cand.learning_commitment || 'Committed to completing container orchestration roadmap.'}"
                </div>

                <!-- Footer: Live Status Selector & Passport PDF Link -->
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; border-top:1px solid #F1F5F9; padding-top:0.75rem;">
                  <div style="display:flex; align-items:center; gap:0.6rem;">
                    <span style="font-size:0.85rem; font-weight:700; color:var(--text-main);">Pipeline Stage:</span>
                    <select class="form-select dossier-status-select" data-job="${jobId}" data-cand="${candId}" style="font-size:0.85rem; padding:0.35rem 0.75rem;">
                      <option value="Applied" ${status === 'Applied' ? 'selected' : ''}>Applied</option>
                      <option value="Under Review" ${status === 'Under Review' ? 'selected' : ''}>Under Review</option>
                      <option value="Shortlisted" ${status === 'Shortlisted' ? 'selected' : ''}>Shortlisted</option>
                      <option value="Interview Scheduled" ${status === 'Interview Scheduled' ? 'selected' : ''}>Interview Scheduled</option>
                      <option value="Offer Extended" ${status === 'Offer Extended' ? 'selected' : ''}>Offer Extended</option>
                      <option value="Hired" ${status === 'Hired' ? 'selected' : ''}>Hired</option>
                      <option value="Rejected" ${status === 'Rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                  </div>

                  <a href="${api.getPassportPdfUrl(candId)}" target="_blank" class="btn btn-outline btn-sm" download>
                    🛡️ Inspect Verified Skill Passport PDF ↗
                  </a>
                </div>
              </div>
            `;
          }).join('');

          // Bind live status dropdown changes
          matchesList.querySelectorAll('.dossier-status-select').forEach(select => {
            select.addEventListener('change', async (e) => {
              const jId = select.dataset.job;
              const cId = select.dataset.cand;
              const newStatus = select.value;

              try {
                await api.updateCandidateApplicationStatus(jId, cId, newStatus, `Stage updated to ${newStatus} by HR`);
                state.showToast(`Candidate stage updated to: ${newStatus}!`, 'success');
              } catch (statusErr) {
                state.showToast(`Updated stage locally to: ${newStatus}`, 'info');
              }
            });
          });

        } catch (err) {
          matchesList.innerHTML = `<p style="color:var(--danger);">${err.message}</p>`;
        }
      };

      await loadDossiers(jobSelector.value);
      jobSelector.addEventListener('change', (e) => loadDossiers(e.target.value));
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
