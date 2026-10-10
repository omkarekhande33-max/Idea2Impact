// Idea2Impact - Client State Management

export const DEFAULT_USERS = {
  candidate: { id: "cand-01", name: "Alex Rivera", role: "candidate", title: "Full-Stack Engineer" },
  founder: { id: "found-01", name: "Sarah Lin", role: "founder", title: "Founder & CEO, EcoTrace AI" },
  hr: { id: "hr-01", name: "Elena Rostova", role: "hr", title: "Head of Talent, NovaTech" },
  investor: { id: "inv-01", name: "Victoria Sterling", role: "investor", title: "Partner, Apex Frontier VC" }
};

class StateManager {
  constructor() {
    this.currentRole = localStorage.getItem('i2i_role') || 'candidate';
    this.activeUser = DEFAULT_USERS[this.currentRole] || DEFAULT_USERS.candidate;
    this.activeTab = 'overview';
    this.tabSwitchCount = 0;
    this.isExamActive = false;
    this.listeners = [];

    this.initIntegrityMonitor();
  }

  setRole(role) {
    if (!DEFAULT_USERS[role]) return;
    this.currentRole = role;
    this.activeUser = DEFAULT_USERS[role];
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
