// Idea2Impact - Client State Management

export const DEFAULT_USERS = {
  candidate: { id: "cand-01", name: "Alex Rivera", role: "candidate", title: "Full-Stack Engineer", email: "alex.rivera@example.com" },
  founder: { id: "found-01", name: "Sarah Lin", role: "founder", title: "Founder & CEO, EcoTrace AI", email: "sarah.lin@ecotrace.ai" },
  hr: { id: "hr-01", name: "Elena Rostova", role: "hr", title: "Head of Talent, NovaTech", email: "elena.rostova@novatech.io" },
  investor: { id: "inv-01", name: "Victoria Sterling", role: "investor", title: "Partner, Apex Frontier VC", email: "v.sterling@apexfrontier.vc" }
};

class StateManager {
  constructor() {
    this.authToken = localStorage.getItem('i2i_token') || null;
    let savedUser = null;
    try {
      const uStr = localStorage.getItem('i2i_user');
      if (uStr) savedUser = JSON.parse(uStr);
    } catch (e) {
      savedUser = null;
    }
    this.authUser = savedUser;

    // Requirement: When user initially visits website, show ONLY login/register page!
    // When authenticated, open their specific mode (candidate, founder, hr, investor).
    if (this.isAuthenticated()) {
      const savedRole = localStorage.getItem('i2i_role') || this.authUser.role || 'candidate';
      this.currentRole = savedRole;
      this.activeUser = {
        id: this.authUser.id,
        name: this.authUser.full_name,
        role: this.authUser.role,
        title: this.authUser.title || `${this.authUser.role.charAt(0).toUpperCase() + this.authUser.role.slice(1)} Member`,
        email: this.authUser.email,
        avatar_url: this.authUser.avatar_url
      };
    } else {
      this.currentRole = 'login';
      this.activeUser = null;
    }

    this.activeTab = 'overview';
    this.authMode = 'landing'; // 'landing' | 'signin' | 'role-pick' | 'register'
    this.selectedAuthRole = 'candidate'; // 'candidate', 'hr', 'founder', 'investor'
    this.tabSwitchCount = 0;
    this.isExamActive = false;
    this.listeners = [];

    this.initIntegrityMonitor();
  }

  isAuthenticated() {
    return Boolean(this.authToken && this.authUser);
  }

  setAuth(user, token) {
    this.authToken = token;
    this.authUser = user;
    localStorage.setItem('i2i_token', token);
    localStorage.setItem('i2i_user', JSON.stringify(user));

    const role = user.role || 'candidate';
    this.currentRole = role;
    localStorage.setItem('i2i_role', role);
    this.activeUser = {
      id: user.id,
      name: user.full_name,
      role: role,
      title: user.title || `${role.charAt(0).toUpperCase() + role.slice(1)} Member`,
      email: user.email,
      avatar_url: user.avatar_url
    };
    this.activeTab = 'overview';
    this.showToast(`Signed in successfully! Entering ${role.toUpperCase()} Mode.`, 'success');
    this.notify();
  }

  logout() {
    this.authToken = null;
    this.authUser = null;
    localStorage.removeItem('i2i_token');
    localStorage.removeItem('i2i_user');
    localStorage.removeItem('i2i_role');
    this.currentRole = 'login';
    this.authMode = 'landing';
    this.activeUser = null;
    this.activeTab = 'overview';
    this.showToast('You have been signed out. Please sign in to continue.', 'info');
    this.notify();
  }

  openLogin(mode = 'signin', role = 'candidate') {
    this.authMode = mode;
    this.selectedAuthRole = role;
    this.currentRole = 'login';
    this.notify();
  }

  setRole(role) {
    // Auth Guard: Unauthenticated users are restricted strictly to login page
    if (!this.isAuthenticated()) {
      this.currentRole = 'login';
      this.notify();
      return;
    }
    // ROLE LOCK: Authenticated users are locked to their registered role.
    // They cannot switch to another mode without signing out first.
    const registeredRole = this.authUser && this.authUser.role;
    if (registeredRole && role !== registeredRole) {
      this.showToast(`You are signed in as ${registeredRole.toUpperCase()}. Sign out to access a different mode.`, 'warning');
      return;
    }
    this.currentRole = role;
    this.activeTab = 'overview';
    localStorage.setItem('i2i_role', role);
    this.notify();
  }

  setTab(tab) {
    this.activeTab = tab;
    this.notify();
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }

  notify() {
    for (const cb of this.listeners) {
      cb(this);
    }
  }

  // Section 12 Integrity Tracking: tab-switch detection
  initIntegrityMonitor() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isExamActive) {
        this.tabSwitchCount += 1;
        this.showToast(`Warning: Assessment window focus lost! (Flag count: ${this.tabSwitchCount})`, 'warning');
      }
    });

    window.addEventListener('blur', () => {
      if (this.isExamActive) {
        this.tabSwitchCount += 1;
      }
    });
  }

  startExam() {
    this.isExamActive = true;
    this.tabSwitchCount = 0;
  }

  stopExam() {
    this.isExamActive = false;
    const switches = this.tabSwitchCount;
    this.tabSwitchCount = 0;
    return switches;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <span>${type === 'success' ? '✓' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 200ms ease';
      setTimeout(() => toast.remove(), 200);
    }, 4000);
  }
}

export const state = new StateManager();
