// Idea2Impact - Client State Management

export const DEFAULT_USERS = {
  candidate: { id: "cand-rushikesh12345", name: "rushikesh@12345", full_name: "rushikesh@12345", username: "rushikesh@12345", role: "candidate", title: "Senior Software Engineer (AI)", email: "rushikesh@12345", avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=rushikesh" },
  founder: { id: "found-omkar12345", name: "omkar@12345", full_name: "omkar@12345", username: "omkar@12345", role: "founder", title: "Founder & CEO (omkar@12345)", email: "omkar@12345", avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=omkar" },
  hr: { id: "hr-koomal123456", name: "koomal@123456", full_name: "koomal@123456", username: "koomal@123456", role: "hr", firm: "NovaTech Systems", title: "Executive Recruiter • NovaTech Talent Intelligence", email: "koomal@123456", avatar_url: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150" },
  investor: { id: "inv-prasad12345", name: "prasad@12345", full_name: "prasad@12345", username: "prasad@12345", role: "investor", firm: "Apex Frontier Ventures", title: "General Partner, Apex Frontier Ventures", email: "prasad@12345", avatar_url: "https://api.dicebear.com/7.x/initials/svg?seed=prasad" }
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
        name: this.authUser.full_name || this.authUser.name || this.authUser.username,
        username: this.authUser.username,
        firm: this.authUser.firm,
        role: this.authUser.role,
        title: this.authUser.title || `${this.authUser.role.charAt(0).toUpperCase() + this.authUser.role.slice(1)} Member`,
        email: this.authUser.email,
        avatar_url: this.authUser.avatar_url
      };
    } else {
      this.currentRole = 'login';
      this.activeUser = null;
    }

    const savedRole = localStorage.getItem('i2i_role') || (this.authUser && this.authUser.role) || 'candidate';
    this.activeTab = (savedRole === 'candidate') ? 'jobs' : (savedRole === 'investor' ? 'shared-pitches' : 'overview');
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
      name: user.full_name || user.name || user.username,
      username: user.username,
      firm: user.firm,
      role: role,
      title: user.title || `${role.charAt(0).toUpperCase() + role.slice(1)} Member`,
      email: user.email,
      avatar_url: user.avatar_url
    };
    this.activeTab = (role === 'candidate') ? 'jobs' : (role === 'investor' ? 'shared-pitches' : 'overview');
    this.showToast(`Signed in successfully! Entering ${role.toUpperCase()} Mode.`, 'success');
    this.notify();
  }

  logout() {
    this.authToken = null;
    this.authUser = null;
    localStorage.removeItem('i2i_token');
    localStorage.removeItem('i2i_user');
    localStorage.removeItem('i2i_role');
    this.currentRole = 'candidate';
    this.authMode = 'landing';
    this.activeUser = null;
    this.activeTab = 'jobs';
    this.showToast('You have been signed out. Redirecting to home...', 'info');
    this.notify();
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 400);
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
    this.activeTab = (role === 'candidate') ? 'jobs' : (role === 'investor' ? 'shared-pitches' : 'overview');
    localStorage.setItem('i2i_role', role);
    this.notify();
  }

  setTab(tab) {
    if (this.currentRole === 'founder' && !['overview', 'gemini-studio', 'meet-investor', 'meet-invester', 'hr-messages', 'investor-messages', 'invester-messages'].includes(tab)) {
      this.activeTab = 'overview';
    } else if (this.currentRole === 'investor' && !['shared-pitches', 'pitch-calls', 'investor-messages', 'invester-messages', 'founder-messages'].includes(tab)) {
      this.activeTab = 'shared-pitches';
    } else if (this.currentRole === 'investor' && (tab === 'founder-messages' || tab === 'invester-messages')) {
      this.activeTab = 'investor-messages';
    } else {
      this.activeTab = tab;
    }
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
