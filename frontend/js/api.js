// Idea2Impact - Client API Module with Dual-Engine (FastAPI Backend + Resilient Local Fallback)
import { SKILLS_CATALOG, QUIZ_BANKS, getQuizForSkill, getQuizForSkills } from './quizData.js';

function resolveApiBase() {
  try {
    const loc = window.location;
    // Served directly from FastAPI backend port 8000
    if (loc.port === '8000') {
      return `${loc.origin}/api`;
    }
    // Deployed to custom domain in production (e.g. Vercel, Netlify, cloud VM)
    if (loc.protocol.startsWith('http') && !loc.hostname.includes('localhost') && !loc.hostname.includes('127.0.0.1')) {
      return `${loc.origin}/api`;
    }
    // Local development with separate frontend server (Live Server 5500, Vite 5173, etc.)
    if (loc.hostname) {
      const proto = loc.protocol.startsWith('http') ? loc.protocol : 'http:';
      return `${proto}//${loc.hostname}:8000/api`;
    }
  } catch (e) {
    // fallback
  }
  // Local development fallback
  return 'http://127.0.0.1:8000/api';
}

const API_BASE = resolveApiBase();
const LOCAL_USERS_KEY = 'i2i_registered_users';

// Pre-seeded demo accounts available out-of-the-box
const DEMO_ACCOUNTS = {
  candidate: { id: 'cand-rushikesh12345', username: 'rushikesh@12345', full_name: 'rushikesh@12345', name: 'rushikesh@12345', role: 'candidate', title: 'Senior Software Engineer (AI)', email: 'rushikesh@12345', avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=rushikesh', bio: 'Senior Software Engineer (AI Systems & Distributed Platforms). Verified 75/25 competency passport credentials.' },
  'rushikesh@12345': { id: 'cand-rushikesh12345', username: 'rushikesh@12345', full_name: 'rushikesh@12345', name: 'rushikesh@12345', role: 'candidate', title: 'Senior Software Engineer (AI)', email: 'rushikesh@12345', avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=rushikesh', bio: 'Senior Software Engineer (AI Systems & Distributed Platforms). Verified 75/25 competency passport credentials.' },
  rushikesh: { id: 'cand-rushikesh12345', username: 'rushikesh@12345', full_name: 'rushikesh@12345', name: 'rushikesh@12345', role: 'candidate', title: 'Senior Software Engineer (AI)', email: 'rushikesh@12345', avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=rushikesh', bio: 'Senior Software Engineer (AI Systems & Distributed Platforms). Verified 75/25 competency passport credentials.' },
  alex: { id: 'cand-01', username: 'alex', full_name: 'Alex Rivera', role: 'candidate', title: 'Full-Stack Engineer', email: 'alex.rivera@example.com', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', bio: 'Full-stack AI developer with verified Python & React credentials.' },
  founder: { id: 'found-01', username: 'founder', full_name: 'Sarah Lin', role: 'founder', title: 'Founder & CEO, EcoTrace AI', email: 'sarah.lin@ecotrace.ai', avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', bio: 'Building autonomous carbon accounting and ESG supply-chain intelligence.' },
  sarah: { id: 'found-01', username: 'sarah', full_name: 'Sarah Lin', role: 'founder', title: 'Founder & CEO, EcoTrace AI', email: 'sarah.lin@ecotrace.ai', avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', bio: 'Building autonomous carbon accounting and ESG supply-chain intelligence.' },
  'omkar@12345': { id: 'found-omkar12345', username: 'omkar@12345', full_name: 'omkar@12345', name: 'omkar@12345', role: 'founder', title: 'Founder & CEO (omkar@12345)', email: 'omkar@12345', avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=omkar', bio: 'Founder & Creator on Idea2Impact platform.' },
  omkar: { id: 'found-omkar12345', username: 'omkar@12345', full_name: 'omkar@12345', name: 'omkar@12345', role: 'founder', title: 'Founder & CEO (omkar@12345)', email: 'omkar@12345', avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=omkar', bio: 'Founder & Creator on Idea2Impact platform.' },
  hr: { id: 'hr-koomal123456', username: 'koomal@123456', full_name: 'koomal@123456', name: 'koomal@123456', role: 'hr', firm: 'NovaTech Systems', title: 'Executive Recruiter • NovaTech Talent Intelligence', email: 'koomal@123456', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', bio: 'Executive Recruiter at NovaTech Talent Intelligence. Connecting top-tier 75/25 verified talent with high-growth teams.' },
  'koomal@123456': { id: 'hr-koomal123456', username: 'koomal@123456', full_name: 'koomal@123456', name: 'koomal@123456', role: 'hr', firm: 'NovaTech Systems', title: 'Executive Recruiter • NovaTech Talent Intelligence', email: 'koomal@123456', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', bio: 'Executive Recruiter at NovaTech Talent Intelligence. Connecting top-tier 75/25 verified talent with high-growth teams.' },
  koomal: { id: 'hr-koomal123456', username: 'koomal@123456', full_name: 'koomal@123456', name: 'koomal@123456', role: 'hr', firm: 'NovaTech Systems', title: 'Executive Recruiter • NovaTech Talent Intelligence', email: 'koomal@123456', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150', bio: 'Executive Recruiter at NovaTech Talent Intelligence. Connecting top-tier 75/25 verified talent with high-growth teams.' },
  elena: { id: 'hr-01', username: 'elena', full_name: 'Elena Rostova', role: 'hr', title: 'Head of Talent, NovaTech', email: 'elena.rostova@novatech.io', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', bio: 'Technical recruiter using explainable skills-first matching.' },
  investor: { id: 'inv-prasad12345', username: 'prasad@12345', full_name: 'prasad@12345', name: 'prasad@12345', role: 'investor', firm: 'Apex Frontier Ventures', title: 'General Partner, Apex Frontier Ventures', email: 'prasad@12345', avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=prasad', bio: 'General Partner at Apex Frontier Ventures. Backing early-stage AI, Climate Tech, and Enterprise SaaS.' },
  'prasad@12345': { id: 'inv-prasad12345', username: 'prasad@12345', full_name: 'prasad@12345', name: 'prasad@12345', role: 'investor', firm: 'Apex Frontier Ventures', title: 'General Partner, Apex Frontier Ventures', email: 'prasad@12345', avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=prasad', bio: 'General Partner at Apex Frontier Ventures. Backing early-stage AI, Climate Tech, and Enterprise SaaS.' },
  prasad: { id: 'inv-prasad12345', username: 'prasad@12345', full_name: 'prasad@12345', name: 'prasad@12345', role: 'investor', firm: 'Apex Frontier Ventures', title: 'General Partner, Apex Frontier Ventures', email: 'prasad@12345', avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=prasad', bio: 'General Partner at Apex Frontier Ventures. Backing early-stage AI, Climate Tech, and Enterprise SaaS.' },
  victoria: { id: 'inv-03', username: 'victoria', full_name: 'Victoria Sterling', role: 'investor', title: 'Partner, Apex Frontier VC', email: 'v.sterling@apexfrontier.vc', avatar_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150', bio: 'Early-stage deeptech and AI investor looking for verified traction.' }
};

export const DEFAULT_CANDIDATE_PROFILES = [
  {
    id: 'cand-rushikesh12345',
    username: 'rushikesh@12345',
    full_name: 'rushikesh@12345',
    name: 'rushikesh@12345',
    role: 'candidate',
    target_role: 'Senior Software Engineer specializing in AI',
    title: 'Senior Software Engineer specializing in AI',
    email: 'rushikesh@12345',
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=rushikesh',
    bio: 'Senior Software Engineer (AI Systems & Distributed Platforms). Verified 75/25 competency passport credentials.',
    summary: 'Senior Software Engineer specializing in AI, distributed systems, and modern full-stack architectures. Verified 75/25 passport rating.',
    experience_years: 4,
    education: 'B.Tech in Computer Science & AI Systems',
    skills: ['Python & FastAPI', 'AI & LLM Integration', 'Cloud Architecture', 'Distributed Systems'],
    is_registered: true
  },
  {
    id: 'cand-01',
    username: 'alexrivera',
    full_name: 'Alex Rivera',
    name: 'Alex Rivera',
    role: 'candidate',
    target_role: 'Senior Full-Stack Engineer',
    title: 'Senior Full-Stack Engineer',
    email: 'alex.rivera@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    bio: 'Full-Stack Engineer specialized in scalable Python backends, FastAPI microservices, and React SPAs.',
    summary: 'Full-Stack Engineer specialized in scalable Python backends, FastAPI microservices, and React SPAs.',
    experience_years: 4,
    education: 'B.S. in Computer Science, Georgia Tech',
    skills: ['Python & FastAPI', 'PostgreSQL & Database Design', 'Distributed Systems', 'Docker & Kubernetes', 'Modern JavaScript & Frontend']
  },
  {
    id: 'cand-02',
    username: 'priyasharma',
    full_name: 'Priya Sharma',
    name: 'Priya Sharma',
    role: 'candidate',
    target_role: 'AI / Machine Learning Engineer',
    title: 'AI / Machine Learning Engineer',
    email: 'priya.sharma@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    bio: 'AI & ML Engineer focused on LLM pipelines, RAG systems, and high-performance inference.',
    summary: 'AI & ML Engineer focused on LLM pipelines, RAG systems, and high-performance inference.',
    experience_years: 3,
    education: 'M.S. in Artificial Intelligence, Carnegie Mellon',
    skills: ['Python & FastAPI', 'AI & LLM Integration', 'Python']
  },
  {
    id: 'cand-03',
    username: 'jordanlee',
    full_name: 'Jordan Lee',
    name: 'Jordan Lee',
    role: 'candidate',
    target_role: 'Frontend Software Engineer',
    title: 'Frontend Software Engineer',
    email: 'jordan.lee@example.com',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    bio: 'Frontend Engineer & UI Architect proficient in responsive layouts, component libraries, and TypeScript.',
    summary: 'Frontend Engineer & UI Architect proficient in responsive layouts, component libraries, and TypeScript.',
    experience_years: 2,
    education: 'B.A. in Interactive Design & CS, University of Washington',
    skills: ['Modern JavaScript & Frontend', 'React', 'TypeScript', 'UI/UX']
  },
  {
    id: 'cand-rushikesh12345',
    username: 'rushikesh@12345',
    full_name: 'rushikesh@12345',
    name: 'rushikesh@12345',
    role: 'candidate',
    target_role: 'Senior Software Engineer specializing in AI',
    title: 'Senior Software Engineer specializing in AI',
    email: 'rushikesh@12345',
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=rushikesh',
    bio: 'Senior Software Engineer specializing in AI & distributed systems.',
    summary: 'Senior Software Engineer specializing in AI & distributed systems.',
    experience_years: 4,
    education: 'B.Tech in Computer Science',
    skills: ['Python & FastAPI', 'AI & LLM Integration', 'Cloud Architecture', 'Distributed Systems'],
    is_registered: true
  },
  {
    id: 'cand-291eba',
    username: 'testuser99',
    full_name: 'Test User',
    name: 'Test User',
    role: 'candidate',
    target_role: 'Full-Stack Software Engineer',
    title: 'Full-Stack Software Engineer',
    email: 'testuser99@gmail.com',
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Test%20User',
    bio: 'Full stack software engineer with verified skill passport.',
    summary: 'Full stack software engineer with verified skill passport.',
    experience_years: 2,
    education: 'B.S. in Computer Science',
    skills: ['Python & FastAPI', 'PostgreSQL & Database Design', 'Modern JavaScript & Frontend'],
    is_registered: true
  },
  {
    id: 'cand-15d122',
    username: 'aaravpatel',
    full_name: 'Aarav Patel',
    name: 'Aarav Patel',
    role: 'candidate',
    target_role: 'Full-Stack Cloud Engineer',
    title: 'Full-Stack Cloud Engineer',
    email: 'aarav.patel@test.io',
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=Aarav%20Patel',
    bio: 'Full Stack Developer with Python, React and Cloud experience.',
    summary: 'Full Stack Developer with Python, React and Cloud experience.',
    experience_years: 3,
    education: 'B.S. in Software Engineering',
    skills: ['Python & FastAPI', 'Cloud Architecture', 'React', 'Docker & Kubernetes'],
    is_registered: true
  }
];

export const DEFAULT_FOUNDER_PROFILES = [
  {
    id: 'found-omkar12345',
    username: 'omkar@12345',
    full_name: 'omkar@12345',
    name: 'omkar@12345',
    role: 'founder',
    title: 'Founder & CEO (omkar@12345)',
    email: 'omkar@12345',
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=omkar',
    bio: 'Founder & Creator on Idea2Impact platform. Building next-generation AI and venture ecosystems.',
    summary: 'Founder & Creator on Idea2Impact platform. Building next-generation AI and venture ecosystems.',
    company: 'Impact AI Studio',
    badge: 'Registered Founder',
    stage: 'Seed Stage',
    ask: '$1,200,000 for 12% equity',
    readiness: '94.0%',
    industry: 'AI / SaaS',
    traction: 'Active Pilot Customers',
    pitchMeetLink: 'https://meet.google.com/ecotrace-apex-seed',
    is_registered: true
  }
];

export const DEFAULT_INVESTOR_PROFILES = [
  {
    id: 'inv-prasad12345',
    name: 'prasad@12345',
    full_name: 'prasad@12345',
    username: 'prasad@12345',
    role: 'investor',
    firm: 'Apex Frontier Ventures',
    roleTitle: 'General Partner • Apex Frontier Ventures',
    badge: 'Lead Seed ($1.5M)',
    avatar: 'https://api.dicebear.com/7.x/initials/svg?seed=prasad',
    avatar_url: 'https://api.dicebear.com/7.x/initials/svg?seed=prasad',
    email: 'prasad@12345',
    meetLink: 'https://meet.google.com/i2i-apex-pitch'
  },
  {
    id: 'inv-01',
    name: 'Michael Chen',
    full_name: 'Michael Chen',
    username: 'michaelchen',
    role: 'investor',
    firm: 'Apex Ventures',
    roleTitle: 'General Partner • Apex Ventures',
    badge: 'Lead Seed ($1.2M)',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    email: 'm.chen@apexventures.vc',
    meetLink: 'https://meet.google.com/i2i-apex-pitch'
  },
  {
    id: 'inv-02',
    name: 'Sophia Zhang',
    full_name: 'Sophia Zhang',
    username: 'sophiazhang',
    role: 'investor',
    firm: 'Horizon Capital',
    roleTitle: 'Investment Partner • AI Growth',
    badge: 'Climate & AI Fund',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    email: 's.zhang@horizoncap.io',
    meetLink: 'https://meet.google.com/i2i-horizon-dd'
  },
  {
    id: 'inv-03',
    name: 'Victoria Sterling',
    full_name: 'Victoria Sterling',
    username: 'victoria',
    role: 'investor',
    firm: 'Apex Frontier VC',
    roleTitle: 'Managing Director • Frontier Tech',
    badge: 'Due Diligence Lead',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    email: 'v.sterling@apexfrontier.vc',
    meetLink: 'https://meet.google.com/i2i-apex-pitch'
  }
];


function getLocalUsers() {
  let list = [];
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    list = raw ? JSON.parse(raw) : [];
  } catch (e) {
    list = [];
  }

  // Ensure default registered founder profile (omkar@12345) exists in local registry
  DEFAULT_FOUNDER_PROFILES.forEach(df => {
    if (!list.some(u => u.id === df.id || (df.username && (u.username || '').toLowerCase() === df.username.toLowerCase()) || (df.email && (u.email || '').toLowerCase() === df.email.toLowerCase()))) {
      list.push(df);
    }
  });

  return list;
}

function saveLocalUser(user) {
  try {
    const list = getLocalUsers();
    const uName = (user.username || '').toLowerCase();
    const uEmail = (user.email || '').toLowerCase();
    const filtered = list.filter(u => (u.username || '').toLowerCase() !== uName && (u.email || '').toLowerCase() !== uEmail);
    filtered.push(user);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Could not persist user to localStorage:', e);
  }
}

const CLOUD_RELAY_TOPIC = 'i2i_chat_sync_prod_global_2026';
const CLOUD_RELAY_URL = `https://ntfy.sh/${CLOUD_RELAY_TOPIC}`;

class ApiService {
  constructor() {
    this._backendOfflineUntil = 0;
    this._relayInitialized = false;
    this.initCloudRelay();
  }

  initCloudRelay() {
    if (this._relayInitialized || typeof window === 'undefined') return;
    this._relayInitialized = true;

    try {
      if (window.EventSource) {
        const es = new EventSource(`${CLOUD_RELAY_URL}/sse`);
        es.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.event === 'message' && data.message) {
              const record = JSON.parse(data.message);
              if (record && record.id) {
                this.saveIncomingMessageLocally(record);
              }
            }
          } catch (e) {}
        };
      }
    } catch (e) {}
  }

  saveIncomingMessageLocally(record) {
    if (!record || !record.id) return;
    const key = 'i2i_messages';
    let msgs = [];
    try {
      const stored = localStorage.getItem(key);
      if (stored) msgs = JSON.parse(stored) || [];
    } catch (e) {
      msgs = [];
    }
    const idx = msgs.findIndex(m => m.id === record.id);
    if (idx >= 0) {
      msgs[idx] = { ...msgs[idx], ...record };
    } else {
      msgs.push(record);
    }
    try {
      localStorage.setItem(key, JSON.stringify(msgs));
    } catch (e) {}

    try {
      window.dispatchEvent(new CustomEvent('i2i_message_sent', { detail: record }));
      window.dispatchEvent(new Event('storage'));
      if (window.BroadcastChannel) {
        if (!this._msgBc) this._msgBc = new BroadcastChannel('i2i_chat_sync');
        this._msgBc.postMessage({ type: 'message_sent', record });
      }
    } catch (e) {}
  }

  isBackendOffline() {
    return Date.now() < this._backendOfflineUntil;
  }

  markBackendOffline(cooldownMs = 2000) {
    this._backendOfflineUntil = Date.now() + cooldownMs;
  }

  markBackendOnline() {
    this._backendOfflineUntil = 0;
  }

  async request(endpoint, options = {}, timeoutMs = 5000) {
    // Fast Circuit Breaker: If backend is known to be offline, fail fast to local engine in 0ms
    if (this.isBackendOffline()) {
      throw new Error('Backend offline, using local engine');
    }

    const url = `${API_BASE}${endpoint}`;
    const token = (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('i2i_token')) || localStorage.getItem('i2i_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(options.headers || {})
        },
        signal: controller.signal,
        ...options
      });
      clearTimeout(timer);

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(err.detail || 'Network request failed');
      }
      this.markBackendOnline();
      return await response.json();
    } catch (error) {
      clearTimeout(timer);
      // Trip offline circuit breaker if connection was refused, aborted, or network unreachable
      const isNetError = error.name === 'AbortError' ||
        (error.message && (
          error.message.includes('fetch') ||
          error.message.includes('Network') ||
          error.message.includes('Failed') ||
          error.message.includes('abort')
        ));
      if (isNetError) {
        this.markBackendOffline(2000);
      }
      console.warn(`API call ${endpoint} error:`, error.message);
      throw error;
    }
  }

  // =========================================================================
  // AUTHENTICATION (Dual-Engine: Backend + Seamless Local Storage Fallback)
  // =========================================================================

  async register(data) {
    // 1. Attempt FastAPI backend registration
    try {
      const res = await this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify(data)
      }, 3000);

      if (res && res.user) {
        // Cache in local storage for offline continuity
        saveLocalUser({ ...res.user, password: data.password });
        return res;
      }
    } catch (err) {
      const msg = (err.message || '').toLowerCase();
      // If backend explicitly rejected due to duplicate username or email, propagate error
      if (msg.includes('already in use') || msg.includes('already registered')) {
        throw err;
      }
      console.info('Backend registration failed/offline, switching to resilient local account engine:', err.message);
    }

    // 2. Resilient Local Storage Engine
    const localUsers = getLocalUsers();
    const uName = (data.username || '').trim().toLowerCase();
    const uEmail = (data.email || '').trim().toLowerCase();

    if (localUsers.some(u => (u.username || '').toLowerCase() === uName)) {
      throw new Error('Username already in use');
    }
    if (localUsers.some(u => (u.email || '').toLowerCase() === uEmail)) {
      throw new Error('Email already registered');
    }

    const role = data.role || 'candidate';
    const roleTitles = {
      candidate: 'Full-Stack Developer',
      founder: 'Founder & CEO',
      hr: 'Head of Talent',
      investor: 'Angel / Venture Partner'
    };

    const newUser = {
      id: `${role.slice(0, 4)}-${Date.now().toString(36)}`,
      username: uName,
      full_name: data.full_name || data.username,
      email: uEmail,
      password: data.password,
      role: role,
      title: roleTitles[role] || `${role.charAt(0).toUpperCase() + role.slice(1)} Member`,
      avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(data.full_name || data.username)}`,
      bio: data.bio || '',
      created_at: new Date().toISOString()
    };

    saveLocalUser(newUser);

    return {
      token: `i2i-token-${Date.now()}`,
      user: newUser,
      message: 'Account created successfully'
    };
  }

  async login(username, password) {
    const uInput = (username || '').trim().toLowerCase();

    // 1. Attempt FastAPI backend login
    try {
      const res = await this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      }, 3000);

      if (res && res.user) {
        saveLocalUser({ ...res.user, password });
        return res;
      }
    } catch (err) {
      console.info('Backend login unreachable or rejected, verifying against local registry:', err.message);
    }

    // 2. Resilient Local Storage Engine
    const localUsers = getLocalUsers();
    const foundLocal = localUsers.find(u => (u.username || '').toLowerCase() === uInput || (u.email || '').toLowerCase() === uInput);

    if (foundLocal) {
      if (!foundLocal.password || foundLocal.password === password) {
        return {
          token: `i2i-token-${Date.now()}`,
          user: foundLocal,
          message: 'Signed in successfully'
        };
      } else {
        throw new Error('Invalid password. Please try again.');
      }
    }

    // 3. Check Demo Accounts
    if (DEMO_ACCOUNTS[uInput]) {
      const demo = DEMO_ACCOUNTS[uInput];
      return {
        token: `demo-token-${Date.now()}`,
        user: demo,
        message: 'Signed in as demo persona'
      };
    }

    // 4. User does not exist anywhere -> requirement: show "create account first"
    throw new Error('No account found. Create an account first.');
  }

  async googleAuth(data) {
    // 1. Attempt FastAPI backend
    try {
      const res = await this.request('/auth/google', {
        method: 'POST',
        body: JSON.stringify(data)
      }, 3000);
      if (res && res.user) {
        saveLocalUser(res.user);
        return res;
      }
    } catch (err) {
      console.info('Backend Google auth offline, using local session');
    }

    // 2. Resilient Local Engine
    const role = data.role || 'candidate';
    const email = (data.email || 'user@example.com').toLowerCase();
    const baseName = data.full_name || email.split('@')[0];
    const username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase() || 'google_user';

    const localUsers = getLocalUsers();
    const existing = localUsers.find(u => (u.email || '').toLowerCase() === email);
    if (existing) {
      return {
        token: `google-token-${Date.now()}`,
        user: existing,
        message: 'Signed in via Google'
      };
    }

    const googleUser = {
      id: `${role.slice(0, 4)}-g-${Date.now().toString(36)}`,
      username: username,
      full_name: baseName,
      email: email,
      role: role,
      title: `${role.charAt(0).toUpperCase() + role.slice(1)} Member`,
      avatar_url: data.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(baseName)}`,
      bio: 'Signed in with Google',
      auth_provider: 'google',
      created_at: new Date().toISOString()
    };

    saveLocalUser(googleUser);

    return {
      token: `google-token-${Date.now()}`,
      user: googleUser,
      message: 'Signed in via Google'
    };
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // =========================================================================
  // STATS
  // =========================================================================
  async getStats() {
    try {
      return await this.request('/stats');
    } catch (e) {
      return { candidate_count: 3, founder_count: 1, hr_count: 1, investor_count: 1, verified_skills_count: 6, active_jobs_count: 3 };
    }
  }

  // =========================================================================
  // PROFILES
  // =========================================================================
  async getProfiles(role = '') {
    let serverProfiles = [];
    try {
      serverProfiles = await this.request(role ? `/profiles?role=${role}` : '/profiles');
    } catch (e) {
      serverProfiles = [];
    }

    const local = getLocalUsers().filter(u => !role || u.role === role);
    const combined = Array.isArray(serverProfiles) ? [...serverProfiles] : [];
    local.forEach(lu => {
      if (!combined.some(cp => cp.id === lu.id || (lu.email && cp.email === lu.email) || (lu.username && cp.username === lu.username))) {
        combined.push(lu);
      }
    });

    if (!role || role === 'candidate') {
      DEFAULT_CANDIDATE_PROFILES.forEach(dp => {
        if (!combined.some(cp => cp.id === dp.id || (dp.email && cp.email === dp.email) || (dp.username && cp.username === dp.username))) {
          combined.push(dp);
        }
      });
    }

    if (!role || role === 'founder') {
      DEFAULT_FOUNDER_PROFILES.forEach(df => {
        if (!combined.some(cp => cp.id === df.id || (df.email && cp.email === df.email) || (df.username && cp.username === df.username))) {
          combined.push(df);
        }
      });
    }

    if (!role || role === 'investor') {
      DEFAULT_INVESTOR_PROFILES.forEach(di => {
        if (!combined.some(cp => cp.id === di.id || (di.email && cp.email === di.email) || (di.username && cp.username === di.username))) {
          combined.push(di);
        }
      });
    }

    return combined;
  }

  async getProfileMe(userId) {
    try {
      return await this.request(`/profiles/me?user_id=${userId}`);
    } catch (e) {
      const all = [...getLocalUsers(), ...Object.values(DEMO_ACCOUNTS)];
      return all.find(u => u.id === userId) || DEMO_ACCOUNTS.candidate;
    }
  }

  async updateProfile(data, userId) {
    try {
      return await this.request(`/profiles/me?user_id=${userId}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    } catch (e) {
      const local = getLocalUsers();
      const idx = local.findIndex(u => u.id === userId);
      if (idx !== -1) {
        local[idx] = { ...local[idx], ...data };
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(local));
      }
      return { success: true };
    }
  }

  // =========================================================================
  // SKILLS & ASSESSMENTS
  // =========================================================================
  async getSkills() {
    try {
      const remote = await this.request('/skills');
      if (Array.isArray(remote) && remote.length > 0) {
        const map = new Map();
        SKILLS_CATALOG.forEach(s => map.set(s.id, { ...s }));
        remote.forEach(s => {
          const existing = map.get(s.id) || {};
          map.set(s.id, { ...existing, ...s });
        });
        return Array.from(map.values());
      }
    } catch (e) {
      console.warn('Using offline skills catalog');
    }
    return SKILLS_CATALOG;
  }

  async getAssessments() {
    try {
      const remote = await this.request('/assessments');
      if (Array.isArray(remote) && remote.length > 0) {
        return remote;
      }
    } catch (e) {
      console.warn('Using local assessment catalog');
    }
    return SKILLS_CATALOG.map(s => ({
      id: `asm-${s.slug}`,
      title: `${s.name} Technical Quiz`,
      skill_id: s.id,
      skill_name: s.name,
      skill_slug: s.slug,
      skill_icon: s.icon,
      skill_category: s.category,
      question_count: s.question_count,
      passing_score: s.passing_score,
      duration_minutes: s.duration_minutes
    }));
  }

  async getAssessment(id) {
    try {
      return await this.request(`/assessments/${id}`);
    } catch (e) {
      const quiz = getQuizForSkill(id);
      return {
        id: quiz.id,
        title: quiz.title,
        skill_id: quiz.skill_id,
        duration_minutes: quiz.duration_minutes,
        passing_score: quiz.passing_score,
        questions: quiz.questions.map(q => ({
          id: q.id,
          text: q.text,
          options: q.options
        }))
      };
    }
  }

  async submitAssessment(id, data) {
    let result = null;
    try {
      result = await this.request(`/assessments/${id}/attempts`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.info('Backend unreachable, grading assessment locally');
      // Build master question bank index for accurate scoring
      const allQuestions = {};
      if (typeof QUIZ_BANKS === 'object' && QUIZ_BANKS) {
        for (const bank of Object.values(QUIZ_BANKS)) {
          if (bank && Array.isArray(bank.questions)) {
            bank.questions.forEach(q => {
              allQuestions[q.id] = q;
              allQuestions[q.id.toLowerCase()] = q;
              if (q.text) allQuestions[q.text.trim().toLowerCase()] = q;
            });
          }
        }
      }

      const quiz = getQuizForSkill(id);
      const targetQuestions = (data.questions && Array.isArray(data.questions) && data.questions.length > 0)
        ? data.questions
        : (quiz && quiz.questions ? quiz.questions : []);
      const answers = data.answers || {};
      let correctCount = 0;
      const feedback = [];

      targetQuestions.forEach((q, idx) => {
        const qid = q.id || `q_${idx}`;
        const refQuestion = allQuestions[qid] || allQuestions[qid.toLowerCase()] || (q.text && allQuestions[q.text.trim().toLowerCase()]) || q;
        const correctIndex = refQuestion.correct_index !== undefined ? refQuestion.correct_index : q.correct_index;

        let chosen = undefined;
        if (answers[qid] !== undefined) chosen = answers[qid];
        else if (answers[String(idx)] !== undefined) chosen = answers[String(idx)];
        else if (answers[idx] !== undefined) chosen = answers[idx];
        else if (answers[`q${idx + 1}`] !== undefined) chosen = answers[`q${idx + 1}`];
        else {
          for (const [ansK, ansV] of Object.entries(answers)) {
            if (ansK.endsWith(qid) || qid.endsWith(ansK)) {
              chosen = ansV;
              break;
            }
          }
        }

        const isCorrect = (chosen !== undefined && chosen !== null && correctIndex !== undefined && Number(chosen) === Number(correctIndex));
        if (isCorrect) correctCount++;

        feedback.push({
          question_id: qid,
          is_correct: isCorrect,
          correct_option: correctIndex,
          chosen_option: chosen,
          explanation: refQuestion.explanation || q.explanation || ''
        });
      });

      const totalCount = targetQuestions.length || 1;
      const score = Math.round((correctCount / totalCount) * 100);
      const passedThreshold = (quiz && quiz.passing_score) || 75.0;
      const passed = score >= passedThreshold;

      result = {
        attempt_id: `att-${Date.now().toString(36)}`,
        score: score,
        passed: passed,
        correct_count: correctCount,
        total_count: totalCount,
        passing_threshold: passedThreshold,
        feedback: feedback,
        verified: passed,
        skill_name: (quiz && quiz.skill_name) || (data.tested_skills && data.tested_skills[0]) || 'Technical Skill',
        skill_id: (quiz && quiz.skill_id) || id
      };
    }

    // If passed (score >= 75%), persist verified skill to localStorage for the candidate
    if (result && result.passed) {
      try {
        const raw = localStorage.getItem('i2i_verified_skills');
        const list = raw ? JSON.parse(raw) : [];
        const quiz = getQuizForSkill(id);
        const skillName = result.skill_name || quiz.skill_name || 'Verified Skill';
        const skillId = result.skill_id || quiz.skill_id || id;
        
        const filtered = list.filter(s => s.skill_id !== skillId && s.name !== skillName);
        filtered.push({
          skill_id: skillId,
          name: skillName,
          category: quiz.category || 'Languages',
          assessment_score: result.score,
          verified_at: new Date().toISOString().split('T')[0],
          status: 'verified',
          badge_hash: `0x${Math.random().toString(16).substring(2, 10).toUpperCase()}`
        });
        localStorage.setItem('i2i_verified_skills', JSON.stringify(filtered));
      } catch (err) {
        console.warn('Failed to cache verified skill:', err);
      }
    }

    return result;
  }

  // =========================================================================
  // PASSPORT
  // =========================================================================
  async getPassport(candidateId) {
    let p = null;
    try {
      p = await this.request(`/candidate/passport?candidate_id=${candidateId}`);
    } catch (e) {
      p = {
        candidate: { id: candidateId, full_name: 'Alex Rivera', role: 'candidate', title: 'Full-Stack Engineer', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
        total_verified: 0,
        verified_skills: []
      };
    }

    // Merge any locally passed skills from quiz submissions
    try {
      const raw = localStorage.getItem('i2i_verified_skills');
      const localSkills = raw ? JSON.parse(raw) : [];
      if (localSkills.length > 0) {
        p.verified_skills = p.verified_skills || [];
        const existing = new Set(p.verified_skills.map(s => s.name.toLowerCase()));
        localSkills.forEach(ls => {
          if (!existing.has(ls.name.toLowerCase())) {
            p.verified_skills.push(ls);
          }
        });
        p.total_verified = p.verified_skills.length;
      }
    } catch (e) {}

    // Ensure candidate name matches active user if available
    try {
      const savedUserStr = localStorage.getItem('i2i_user');
      if (savedUserStr) {
        const u = JSON.parse(savedUserStr);
        if (u && u.full_name) {
          p.candidate = p.candidate || {};
          p.candidate.full_name = u.full_name;
          p.candidate.username = u.username;
          if (u.avatar_url) p.candidate.avatar_url = u.avatar_url;
        }
      }
    } catch (e) {}

    return p;
  }

  getPassportPdfUrl(candidateId) {
    return `${API_BASE}/candidate/${candidateId}/passport/pdf`;
  }

  // =========================================================================
  // JOBS & MATCHING
  // =========================================================================
  async getJobs(candidateId = '') {
    let serverJobs = [];
    try {
      serverJobs = await this.request(candidateId ? `/jobs?candidate_id=${candidateId}` : '/jobs');
    } catch (e) {
      serverJobs = [];
    }

    const defaultJobs = [
      { id: 'job-01', title: 'Senior AI Platform Engineer', company: 'NovaTech Systems', company_name: 'NovaTech Systems', location: 'Remote / San Francisco', salary_range: '$160,000 - $195,000', salary_min: 160000, salary_max: 195000, employment_type: 'Full-time', job_type: 'Full-time', match_score: 94, required_skills: [{ skill_name: 'Python & FastAPI', is_required: true, weight: 0.4 }, { skill_name: 'PostgreSQL & Database Design', is_required: true, weight: 0.35 }, { skill_name: 'Cloud Deployment & Docker', is_required: false, weight: 0.25 }], status: 'Active' },
      { id: 'job-02', title: 'Lead Full-Stack Architect', company: 'EcoTrace AI', company_name: 'EcoTrace AI', location: 'Hybrid / New York', salary_range: '$150,000 - $185,000', salary_min: 150000, salary_max: 185000, employment_type: 'Full-time', job_type: 'Full-time', match_score: 89, required_skills: [{ skill_name: 'Modern JavaScript & Frontend', is_required: true, weight: 0.5 }, { skill_name: 'Python & FastAPI', is_required: true, weight: 0.5 }], status: 'Active' },
      { id: 'job-03', title: 'Backend Distributed Systems Engineer', company: 'Aether Cloud', company_name: 'Aether Cloud', location: 'Remote', salary_range: '$140,000 - $175,000', salary_min: 140000, salary_max: 175000, employment_type: 'Full-time', job_type: 'Full-time', match_score: 82, required_skills: [{ skill_name: 'Python & FastAPI', is_required: true, weight: 0.5 }, { skill_name: 'PostgreSQL & Database Design', is_required: true, weight: 0.5 }], status: 'Active' }
    ];

    let localJobs = [];
    try {
      const localJobsRaw = localStorage.getItem('i2i_custom_jobs');
      localJobs = localJobsRaw ? JSON.parse(localJobsRaw) : [];
    } catch (err) {
      localJobs = [];
    }

    // Unified map: merge serverJobs and localJobs cleanly
    const jobMap = new Map();

    // 1. Add server jobs first (they contain authoritative backend match calculations)
    if (Array.isArray(serverJobs)) {
      serverJobs.forEach(j => {
        if (j && j.id) {
          j.company = j.company || j.company_name || 'Enterprise Partner';
          j.company_name = j.company_name || j.company;
          j.job_type = j.job_type || j.employment_type || 'Full-time';
          j.employment_type = j.employment_type || j.job_type;
          j.required_skills = j.required_skills || j.skills || [];
          j.skills = j.skills || j.required_skills;
          jobMap.set(j.id, j);
        }
      });
    }

    // 2. Merge local custom jobs (ensuring newly created HR jobs appear even if server is offline or lagging)
    if (Array.isArray(localJobs)) {
      localJobs.forEach(j => {
        if (j && j.id) {
          const existing = jobMap.get(j.id);
          if (existing) {
            // Keep server match if present, augment any fields
            jobMap.set(j.id, {
              ...j,
              ...existing,
              match: existing.match || j.match,
              company: existing.company || j.company || j.company_name,
              company_name: existing.company_name || j.company_name || j.company,
              job_type: existing.job_type || j.job_type || j.employment_type || 'Full-time',
              employment_type: existing.employment_type || j.employment_type || j.job_type || 'Full-time'
            });
          } else {
            j.company = j.company || j.company_name || 'Enterprise Partner';
            j.company_name = j.company_name || j.company;
            j.job_type = j.job_type || j.employment_type || 'Full-time';
            j.employment_type = j.employment_type || j.job_type;
            j.required_skills = j.required_skills || j.skills || [];
            j.skills = j.skills || j.required_skills;
            jobMap.set(j.id, j);
          }
        }
      });
    }

    // 3. Fallback defaults if no jobs exist
    if (jobMap.size === 0) {
      defaultJobs.forEach(j => jobMap.set(j.id, j));
    }

    const allJobs = Array.from(jobMap.values());

    // 4. Ensure every job has an explainable 75/25 match object strictly comparing verified skills
    const verifiedSkillEntries = [];
    try {
      const cRaw = localStorage.getItem('i2i_candidate_skills');
      if (cRaw) {
        const cList = JSON.parse(cRaw);
        if (Array.isArray(cList)) {
          cList.forEach(s => {
            if (s && (s.is_verified !== false || (s.assessment_score && s.assessment_score >= 70))) {
              verifiedSkillEntries.push(s);
            }
          });
        }
      }
      const vRaw = localStorage.getItem('i2i_verified_skills');
      if (vRaw) {
        const vList = JSON.parse(vRaw);
        if (Array.isArray(vList)) {
          vList.forEach(s => {
            if (s) verifiedSkillEntries.push(s);
          });
        }
      }
    } catch (e) {}

    const normalizeSkillSlug = (text) => {
      if (!text) return '';
      return String(text).toLowerCase().replace(/^sk-/, '').replace(/[^a-z0-9]/g, '');
    };

    const isJobSkillVerified = (reqSkill) => {
      const rName = (reqSkill.skill_name || reqSkill.name || '').toLowerCase().trim();
      const rSlug = normalizeSkillSlug(rName);
      const rId = (reqSkill.id || reqSkill.skill_id || '').toLowerCase().trim();

      return verifiedSkillEntries.some(v => {
        const vName = (v.skill_name || v.name || '').toLowerCase().trim();
        const vSlug = normalizeSkillSlug(vName);
        const vId = (v.skill_id || v.id || '').toLowerCase().trim();

        if (rId && vId && rId === vId) return true;
        if (rName && vName && rName === vName) return true;
        if (rSlug && vSlug && rSlug === vSlug) return true;

        // Controlled aliases
        if ((rSlug === 'python' && vSlug === 'pythonfastapi') || (vSlug === 'python' && rSlug === 'pythonfastapi')) return true;
        if ((rSlug === 'postgresql' && vSlug === 'postgresqldatabasedesign') || (vSlug === 'postgresql' && rSlug === 'postgresqldatabasedesign')) return true;
        if ((rSlug === 'docker' && vSlug === 'dockerkubernetes') || (vSlug === 'docker' && rSlug === 'dockerkubernetes')) return true;

        return false;
      });
    };

    allJobs.forEach(job => {
      // Re-evaluate or populate explainable 75/25 match
      const reqSkills = (job.required_skills || job.skills || []).map(s => {
        if (typeof s === 'string') return { name: s, is_required: true, weight: 1.0 };
        return {
          name: s.skill_name || s.name || s.skill?.name || s.skill_id || 'Skill',
          is_required: s.is_required !== false,
          weight: Number(s.weight || 1.0),
          id: s.skill_id || s.id || ''
        };
      });

      const mandatory = reqSkills.filter(s => s.is_required);
      const preferred = reqSkills.filter(s => !s.is_required);

      const matchedMand = mandatory.filter(isJobSkillVerified);
      const matchedPref = preferred.filter(isJobSkillVerified);

      const mandRatio = mandatory.length > 0 ? (matchedMand.length / mandatory.length) : 1.0;
      const prefRatio = preferred.length > 0 ? (matchedPref.length / preferred.length) : 0.0;

      let calcScore = 0;
      if (preferred.length > 0) {
        calcScore = Math.round((mandRatio * 75) + (prefRatio * 25));
      } else {
        calcScore = Math.round(mandRatio * 100);
      }

      const missingMandatory = mandatory.filter(s => !isJobSkillVerified(s));
      const missingPreferred = preferred.filter(s => !isJobSkillVerified(s));
      const allMissing = [...missingMandatory, ...missingPreferred];

      job.match = {
        candidate_id: candidateId || 'cand-01',
        job_id: job.id,
        score: calcScore,
        match_score_percentage: calcScore,
        matched_skills: [...matchedMand, ...matchedPref].map(s => ({ skill_name: s.name, is_required: s.is_required })),
        critical_skill_gaps: missingMandatory.map(s => ({ skill_name: s.name, is_required: true })),
        bonus_competencies: matchedPref.map(s => ({ skill_name: s.name, is_required: false })),
        missing_skills: allMissing.map(s => ({ skill_name: s.name, is_required: s.is_required })),
        learning_roadmap: allMissing.map(s => ({
          skill_name: s.name,
          urgency: s.is_required ? 'High' : 'Bonus / Low',
          suggested_resource: `Complete the ${s.name} specialized track & project labs.`,
          practice_project: `Develop a testable feature implementing ${s.name} architecture.`,
          assessment_cta: `Take the ${s.name} verification assessment to qualify.`
        }))
      };
      job.match_score = calcScore;
    });

    // Sort newest first so HR's newly created job appears at the very top of Candidate feed!
    allJobs.sort((a, b) => {
      const da = new Date(a.created_at || 0).getTime();
      const db = new Date(b.created_at || 0).getTime();
      return db - da;
    });

    return allJobs;
  }

  async createJob(data) {
    let created = null;
    try {
      created = await this.request('/jobs', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      created = {
        id: `job-${Date.now().toString(36)}`,
        ...data,
        status: 'Active',
        created_at: new Date().toISOString()
      };
    }

    if (created) {
      created.company = created.company || created.company_name || data.company_name || 'Enterprise Partner';
      created.company_name = created.company_name || created.company;
      created.employment_type = created.employment_type || data.employment_type || 'Full-time';
      created.job_type = created.job_type || created.employment_type;
      created.salary_min = created.salary_min || data.salary_min || 120000;
      created.salary_max = created.salary_max || data.salary_max || 160000;
      created.salary_range = created.salary_range || `$${created.salary_min.toLocaleString()} - $${created.salary_max.toLocaleString()}`;
      created.location = created.location || data.location || 'Remote / Hybrid';
      created.location_type = created.location_type || data.location_type || 'Hybrid';
      created.map_url = created.map_url || data.map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(created.location)}`;
      created.map_query = created.map_query || data.map_query || created.location;
      created.required_skills = created.required_skills || data.required_skills || data.skills || [];
      created.skills = created.skills || created.required_skills;
      created.is_new = true;

      // Persist to local custom jobs cache
      try {
        const raw = localStorage.getItem('i2i_custom_jobs');
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(j => j.id !== created.id);
        filtered.unshift(created);
        localStorage.setItem('i2i_custom_jobs', JSON.stringify(filtered));

        // Dispatch instant cross-tab / cross-view sync event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('i2i_jobs_updated', { detail: created }));
        }
      } catch (err) {
        console.warn('Could not save custom job to localStorage', err);
      }
    }

    return created;
  }

  async getJobMatches(jobId) {
    let matches = [];
    try {
      const res = await this.request(`/jobs/${jobId}/matches`);
      if (Array.isArray(res) && res.length > 0) {
        matches = [...res];
      }
    } catch (e) {
      console.warn("Backend getJobMatches failed, using fallback calculation", e);
    }

    // Dynamic fallback candidates if backend returned empty
    const defaultCandidates = [
      { id: 'cand-01', full_name: 'Alex Rivera', email: 'alex.rivera@example.com', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', skills: ['Python & FastAPI', 'PostgreSQL & Database Design', 'Distributed Systems', 'Docker & Kubernetes', 'Modern JavaScript & Frontend'] },
      { id: 'cand-02', full_name: 'Priya Sharma', email: 'priya.sharma@example.com', avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150', skills: ['Python & FastAPI', 'AI & LLM Integration', 'Python'] },
      { id: 'cand-03', full_name: 'Jordan Lee', email: 'jordan.lee@example.com', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', skills: ['Modern JavaScript & Frontend', 'React', 'TypeScript', 'UI/UX'] }
    ];

    try {
      const allCandidates = await this.getProfiles('candidate').catch(() => defaultCandidates);
      const allJobs = await this.getMyJobs().catch(() => []);
      const targetJob = allJobs.find(j => j.id === jobId) || allJobs[0] || {};
      const reqSkills = targetJob?.required_skills || targetJob?.skills || [];
      const mandReqs = reqSkills.filter(s => s.is_required !== false);
      const prefReqs = reqSkills.filter(s => s.is_required === false);

      const candidateList = allCandidates.length > 0 ? allCandidates : defaultCandidates;

      candidateList.forEach(cand => {
        const candId = cand.id;
        const existingIdx = matches.findIndex(m => (m.candidate?.id || m.candidate_id) === candId);
        
        const cSkills = (cand.skills || []).map(s => (typeof s === 'string' ? s : (s.skill_name || s.name || '')).toLowerCase());
        const bioLower = `${cand.bio || ''} ${cand.summary || ''} ${cand.target_role || ''}`.toLowerCase();
        
        const mandMatches = mandReqs.filter(r => {
          const rName = (r.skill_name || r.name || r.skill_id || '').toLowerCase();
          return cSkills.some(cs => cs.includes(rName) || rName.includes(cs)) || (rName && bioLower.includes(rName));
        });
        const prefMatches = prefReqs.filter(r => {
          const rName = (r.skill_name || r.name || r.skill_id || '').toLowerCase();
          return cSkills.some(cs => cs.includes(rName) || rName.includes(cs)) || (rName && bioLower.includes(rName));
        });

        const mandRatio = mandReqs.length > 0 ? (mandMatches.length / mandReqs.length) : (cSkills.length > 0 ? 0.75 : 0);
        const prefRatio = prefReqs.length > 0 ? (prefMatches.length / prefReqs.length) : (cSkills.length > 0 ? 0.25 : 0);
        const mandScore = prefReqs.length > 0 ? Math.round(mandRatio * 75) : Math.round(mandRatio * 100);
        const prefScore = prefReqs.length > 0 ? Math.round(prefRatio * 25) : 0;
        const totalScore = Math.min(100, mandScore + prefScore);

        if (existingIdx !== -1) {
          // Enrich existing match with profile details
          const cur = matches[existingIdx];
          if (!cur.candidate.target_role && cand.target_role) cur.candidate.target_role = cand.target_role;
          if (!cur.candidate.bio && cand.bio) cur.candidate.bio = cand.bio;
          if (!cur.candidate.summary && cand.summary) cur.candidate.summary = cand.summary;
          if (!cur.candidate.experience_years && cand.experience_years) cur.candidate.experience_years = cand.experience_years;
          if (!cur.candidate.education && cand.education) cur.candidate.education = cand.education;
          if ((!cur.candidate.skills || cur.candidate.skills.length === 0) && cand.skills) cur.candidate.skills = cand.skills;
        } else {
          matches.push({
            candidate: {
              id: cand.id,
              full_name: cand.full_name || cand.name || 'Candidate',
              email: cand.email || 'candidate@idea2impact.dev',
              avatar_url: cand.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cand.full_name || cand.name || 'Candidate')}`,
              role: 'candidate',
              bio: cand.bio || cand.summary || '',
              target_role: cand.target_role || 'Software Engineer',
              experience_years: cand.experience_years || 1,
              education: cand.education || 'Not specified',
              portfolio_url: cand.portfolio_url || '',
              skills: cand.skills || []
            },
            profile: {
              candidate_id: cand.id,
              target_role: cand.target_role || 'Software Engineer',
              summary: cand.summary || cand.bio || '',
              experience_years: cand.experience_years || 1,
              education: cand.education || 'Not specified'
            },
            match: {
              candidate_id: cand.id,
              job_id: jobId,
              score: totalScore,
              match_score_percentage: totalScore,
              mandatory_score_component: mandScore,
              preferred_score_component: prefScore,
              matched_skills: mandMatches.map(m => ({ skill_name: m.skill_name || m.name, is_required: true })),
              critical_skill_gaps: mandReqs.filter(r => !mandMatches.includes(r)),
              bonus_competencies: prefMatches.map(p => ({ skill_name: p.skill_name || p.name, is_required: false })),
              is_strong_fit: totalScore >= 75
            }
          });
        }
      });
    } catch (e) {
      console.warn("Error merging candidate profiles in getJobMatches", e);
    }

    return matches;
  }

  async applyJob(jobId, data) {
    try {
      return await this.request(`/jobs/${jobId}/applications`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      return { id: `app-${Date.now().toString(36)}`, job_id: jobId, status: 'applied', ...data };
    }
  }

  async getJobDetail(jobId, candidateId = '') {
    try {
      return await this.request(candidateId ? `/jobs/${jobId}?candidate_id=${candidateId}` : `/jobs/${jobId}`);
    } catch (e) {
      const allJobs = await this.getJobs(candidateId);
      return allJobs.find(j => j.id === jobId) || null;
    }
  }

  async getMyJobs(recruiterId = '') {
    let myJobs = [];
    try {
      myJobs = await this.request(recruiterId ? `/jobs/my-jobs?recruiter_id=${recruiterId}` : '/jobs/my-jobs');
    } catch (e) {
      myJobs = [];
    }

    try {
      const raw = localStorage.getItem('i2i_custom_jobs');
      const localJobs = raw ? JSON.parse(raw) : [];
      const jobMap = new Map();
      [...localJobs, ...myJobs].forEach(j => {
        if (j && j.id && !jobMap.has(j.id)) {
          j.required_skills = j.required_skills || j.skills || [];
          j.skills = j.skills || j.required_skills;
          jobMap.set(j.id, j);
        }
      });
      if (jobMap.size > 0) return Array.from(jobMap.values());
    } catch (err) {}

    return myJobs.length > 0 ? myJobs : await this.getJobs();
  }

  async getJobCandidates(jobId) {
    try {
      return await this.request(`/jobs/${jobId}/candidates`);
    } catch (e) {
      return [];
    }
  }

  async updateCandidateApplicationStatus(jobId, candidateId, status, notes = '') {
    try {
      return await this.request(`/jobs/${jobId}/applications/${candidateId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes })
      });
    } catch (e) {
      return { status, candidate_id: candidateId, job_id: jobId };
    }
  }

  // =========================================================================
  // CANDIDATE COMPETENCIES & AI RESUME PARSING (SkillBridge Engine)
  // =========================================================================
  async getCandidateSkills(candidateId = '') {
    let remote = [];
    try {
      remote = await this.request(candidateId ? `/candidate/skills?candidate_id=${candidateId}` : '/candidate/skills');
    } catch (e) {
      remote = [];
    }

    try {
      const raw = localStorage.getItem('i2i_candidate_skills');
      const local = raw ? JSON.parse(raw) : [];
      const map = new Map();
      (remote || []).forEach(s => {
        const key = (s.skill_name || s.name || s.skill_id || '').toLowerCase();
        map.set(key, s);
      });
      (local || []).forEach(s => {
        const key = (s.skill_name || s.name || s.skill_id || '').toLowerCase();
        if (!map.has(key)) {
          map.set(key, s);
        } else {
          const existing = map.get(key);
          if (s.is_verified && !existing.is_verified) {
            map.set(key, { ...existing, ...s });
          }
        }
      });
      return Array.from(map.values());
    } catch (err) {
      return remote || [];
    }
  }

  async addCandidateSkill(payload, candidateId = '') {
    if (!payload.skill_id && payload.skill_name) {
      payload.skill_id = `sk-${payload.skill_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    }
    if (!payload.skill_name && payload.name) {
      payload.skill_name = payload.name;
    }
    if (payload.assessment_score !== undefined && payload.quiz_score === undefined) {
      payload.quiz_score = payload.assessment_score;
    }
    let res = null;
    try {
      res = await this.request(candidateId ? `/candidate/skills?candidate_id=${candidateId}` : '/candidate/skills', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
    } catch (e) {
      // Handled via local storage caching below
    }

    try {
      const raw = localStorage.getItem('i2i_candidate_skills');
      const list = raw ? JSON.parse(raw) : [];
      const filtered = list.filter(s => 
        s.skill_id !== payload.skill_id && 
        (s.skill_name || s.name || '').toLowerCase() !== (payload.skill_name || payload.name || '').toLowerCase()
      );
      const newSkill = { 
        id: `cs-${Date.now().toString(36)}`, 
        ...payload, 
        name: payload.skill_name || payload.name || payload.skill_id,
        candidate_id: candidateId 
      };
      filtered.push(newSkill);
      localStorage.setItem('i2i_candidate_skills', JSON.stringify(filtered));
      return res || newSkill;
    } catch (e) {
      return res || payload;
    }
  }

  async removeCandidateSkill(skillId, candidateId = '') {
    // 1. Immediately purge from local storage caches
    try {
      const targetLower = String(skillId || '').toLowerCase().trim();
      const targetSlug = targetLower.replace(/^sk-/, '').replace(/[^a-z0-9]/g, '');

      const filterOut = (list) => {
        return (list || []).filter(s => {
          const sId = (s.skill_id || s.id || '').toLowerCase().trim();
          const sName = (s.skill_name || s.name || '').toLowerCase().trim();
          const sSlug = sName.replace(/^sk-/, '').replace(/[^a-z0-9]/g, '');
          if (sId && sId === targetLower) return false;
          if (sName && sName === targetLower) return false;
          if (targetSlug && sSlug === targetSlug) return false;
          if (targetSlug && sId.replace(/[^a-z0-9]/g, '') === targetSlug) return false;
          return true;
        });
      };

      const cRaw = localStorage.getItem('i2i_candidate_skills');
      if (cRaw) {
        const cFiltered = filterOut(JSON.parse(cRaw));
        localStorage.setItem('i2i_candidate_skills', JSON.stringify(cFiltered));
      }

      const vRaw = localStorage.getItem('i2i_verified_skills');
      if (vRaw) {
        const vFiltered = filterOut(JSON.parse(vRaw));
        localStorage.setItem('i2i_verified_skills', JSON.stringify(vFiltered));
      }
    } catch (err) {
      console.warn('Error purging skill from local storage:', err);
    }

    // 2. Also send DELETE request to backend
    try {
      const encId = encodeURIComponent(skillId);
      return await this.request(candidateId ? `/candidate/skills/${encId}?candidate_id=${candidateId}` : `/candidate/skills/${encId}`, {
        method: 'DELETE'
      });
    } catch (e) {
      return { success: true };
    }
  }

  async parseResume(file) {
    const url = `${API_BASE}/resumes/parse`;
    const formData = new FormData();
    formData.append('file', file);

    const token = localStorage.getItem('i2i_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};

    const response = await fetch(url, {
      method: 'POST',
      headers: authHeaders,
      body: formData
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ detail: 'Failed to parse resume' }));
      throw new Error(err.detail || 'Resume upload failed');
    }

    return await response.json();
  }

  async getMyApplications(candidateId) {
    try {
      return await this.request(`/applications/me?candidate_id=${candidateId}`);
    } catch (e) {
      return [
        { id: 'app-01', job_title: 'Senior AI Platform Engineer', company_name: 'NovaTech', status: 'interviewing', applied_at: '2026-04-01' }
      ];
    }
  }

  async updateApplicationStatus(appId, data) {
    try {
      return await this.request(`/applications/${appId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
    } catch (e) {
      return { id: appId, ...data };
    }
  }

  // =========================================================================
  // STARTUPS & AI COPILOT
  // =========================================================================
  async analyzeIdea(data) {
    try {
      return await this.request('/ideas/analyze', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      return {
        readiness_score: 91.5,
        summary: `Strong market viability in the ${data.industry || 'Technology'} space with clear product-market fit potential.`,
        tam_sam_som: { tam: '$48B', sam: '$6.2B', som: '$420M' },
        business_model: 'B2B SaaS with tiered subscription and usage-based analytics pricing.',
        financial_projections: [
          { year: 'Year 1', revenue: '$320,000', expenses: '$280,000', margin: '12.5%' },
          { year: 'Year 2', revenue: '$1,400,000', expenses: '$820,000', margin: '41.4%' },
          { year: 'Year 3', revenue: '$4,800,000', expenses: '$2,100,000', margin: '56.2%' }
        ],
        strengths: ['High gross margins', 'Direct enterprise pain point', 'Scalable software model'],
        risks_and_mitigations: [{ risk: 'Customer acquisition cost in early stage', mitigation: 'Focus on niche design-partner programs with high conversion' }]
      };
    }
  }

  async getStartups() {
    try {
      const res = await this.request('/startups');
      if (res && res.length) {
        try { localStorage.setItem('i2i_cached_startups', JSON.stringify(res)); } catch (err) {}
      }
      return res;
    } catch (e) {
      try {
        const cached = localStorage.getItem('i2i_cached_startups');
        if (cached) return JSON.parse(cached);
      } catch (err) {}
      return [
        {
          id: 'stp-01',
          name: 'EcoTrace AI',
          tagline: 'Autonomous carbon accounting and ESG supply-chain intelligence.',
          stage: 'Seed',
          readiness_score: 92.5,
          valuation_ask: '$1,200,000 for 12% equity',
          industry: 'Climate Tech / AI',
          traction: '8 Enterprise Pilots, $28k MRR',
          pitch_summary: 'EcoTrace AI replaces manual consultant audits with automated continuous telemetry connecting ERP data directly to carbon disclosure reports.'
        }
      ];
    }
  }

  async createStartup(data) {
    try {
      return await this.request('/startups', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      return { id: `stp-${Date.now().toString(36)}`, ...data, readiness_score: 88.0 };
    }
  }

  getProposalPdfUrl(startupId) {
    return `${API_BASE}/startups/${startupId}/proposal/pdf`;
  }

  async shareProposal(startupId, data) {
    try {
      return await this.request(`/proposals/${startupId}/share`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      return { success: true, message: 'Proposal shared successfully' };
    }
  }

  // =========================================================================
  // INVESTOR & SHARKS MODE
  // =========================================================================
  async getInvestorProposalAnalysis(startupId) {
    try {
      return await this.request(`/investor/proposals/${startupId}/ai-analysis`);
    } catch (e) {
      return {
        overall_score: 93,
        recommendation: 'STRONG BUY / SCHEDULE DEEP DIVE',
        metrics: {
          team_strength: '94/100',
          market_opportunity: '91/100',
          technical_defensibility: '96/100',
          financial_discipline: '89/100'
        },
        due_diligence_flags: ['Low customer churn in pilot cohort', 'Clear proprietary IP on data ingestion pipeline']
      };
    }
  }

  async expressInterest(data) {
    try {
      return await this.request('/investor-interests', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      return { id: `int-${Date.now().toString(36)}`, ...data, status: 'interest_sent' };
    }
  }

  async getInvestorInterests(investorId = '') {
    try {
      return await this.request(investorId ? `/investor/interests?investor_id=${investorId}` : '/investor/interests');
    } catch (e) {
      return [
        { id: 'int-01', startup_name: 'EcoTrace AI', amount_offered: '$500,000', status: 'meeting_scheduled', date: '2026-04-03' }
      ];
    }
  }

  // =========================================================================
  // MEETINGS & AUDIT
  // =========================================================================
  async getMeetings(userId = '') {
    const key = 'i2i_meetings';
    const defaultMeetings = [
      {
        id: 'mtg-inv-01',
        title: 'Seed Round Pitch & Technical Deep-Dive',
        meeting_type: 'Pitch & Technical Deep-Dive',
        participant: 'Michael Chen (General Partner, Apex Ventures)',
        investor_name: 'Michael Chen',
        investor_firm: 'Apex Ventures',
        founder_name: 'Sarah Lin',
        startup_name: 'EcoTrace AI',
        time: 'Tomorrow, 3:30 PM EST',
        scheduled_at: '2026-03-05T15:30:00Z',
        meeting_link: 'https://meet.google.com/i2i-apex-pitch',
        status: 'Confirmed',
        agenda: 'Review 92.5% Founder Readiness Score, dual-tier hiring architecture, and lead term sheet parameters for $1.2M Seed Ask.'
      },
      {
        id: 'mtg-inv-02',
        title: 'Series Seed Due Diligence Sync',
        meeting_type: 'Due Diligence & Cap Table Review',
        participant: 'Sophia Zhang (Horizon Capital)',
        investor_name: 'Sophia Zhang',
        investor_firm: 'Horizon Capital',
        founder_name: 'Sarah Lin',
        startup_name: 'EcoTrace AI',
        time: 'Friday, 11:00 AM EST',
        scheduled_at: '2026-03-06T11:00:00Z',
        meeting_link: 'https://meet.google.com/i2i-horizon-dd',
        status: 'Confirmed',
        agenda: 'Enterprise pipeline evaluation, ESG data compliance benchmarks, and customer retention metrics.'
      }
    ];

    try {
      const serverMeetings = await this.request(userId ? `/meetings?user_id=${userId}` : '/meetings');
      if (Array.isArray(serverMeetings) && serverMeetings.length > 0) {
        return serverMeetings;
      }
    } catch (e) {
      // Backend fallback
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      localStorage.setItem(key, JSON.stringify(defaultMeetings));
    } catch (e) {}

    return defaultMeetings;
  }

  async scheduleMeeting(data) {
    const key = 'i2i_meetings';
    let record = {
      id: data.id || `mtg-${Date.now().toString(36)}`,
      title: data.title || data.meeting_type || 'Investor Pitch & Technical Sync',
      meeting_type: data.meeting_type || data.title || 'Pitch Sync',
      participant: data.participant || data.investor_name || 'Investor Partner',
      investor_name: data.investor_name || 'Michael Chen',
      investor_firm: data.investor_firm || 'Apex Ventures',
      founder_name: data.founder_name || 'Sarah Lin',
      startup_name: data.startup_name || 'EcoTrace AI',
      time: data.time || 'Tomorrow, 3:30 PM EST',
      scheduled_at: data.scheduled_at || new Date().toISOString(),
      meeting_link: data.meeting_link || `https://meet.google.com/i2i-${Math.random().toString(36).substr(2, 6)}`,
      status: data.status || 'Confirmed',
      agenda: data.agenda || 'Review 92.5% Founder Readiness Score, dual-tier hiring architecture, and term sheet parameters.',
      ...data
    };

    try {
      const resp = await this.request('/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
      if (resp && resp.data) {
        record = resp.data;
      }
    } catch (e) {}

    try {
      const list = JSON.parse(localStorage.getItem(key) || '[]');
      list.unshift(record);
      localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}

    return record;
  }

  async getAuditLogs() {
    try {
      return await this.request('/audit-logs');
    } catch (e) {
      return [
        { id: 'log-01', action: 'Assessment Verification', details: 'Candidate Alex Rivera verified Python Backend Engineering at 92%', timestamp: '2026-04-10T14:22:00Z' }
      ];
    }
  }

  // =========================================================================
  // GEMINI PRO AI CHATBOT & SHARING WORKSPACES
  // =========================================================================
  async chatGeminiPro(data) {
    try {
      return await this.request('/chat/gemini-pro', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn("Backend Gemini chat failed, using client intelligent synthesizer fallback", e);
      // Client-side fallback synthesizer
      const idea = data.idea || "Autonomous enterprise platform";
      const ideaLower = idea.toLowerCase();
      let title = data.startup_name;
      let industry = "Enterprise AI & Cloud Infrastructure";
      let tagline = "Autonomous workflow intelligence and verified execution architecture.";

      if (!title || (!ideaLower.includes("ecotrace") && !ideaLower.includes("carbon") && !ideaLower.includes("climate"))) {
        if (/secur|cyber|zero-trust|cloud|container|telemetry|devops|auth|infra/.test(ideaLower)) {
          title = "CloudSentinel Telemetry";
          industry = "CyberSecurity & Cloud Infrastructure";
          tagline = "Autonomous zero-trust telemetry and real-time container workload security orchestration.";
        } else if (/carbon|climate|esg|clean|solar|energy|sustain|waste/.test(ideaLower)) {
          title = "EcoSync Horizon";
          industry = "CleanTech & Climate Intelligence";
          tagline = "Autonomous carbon accounting and verified ESG supply telemetry.";
        } else if (/fin|bank|pay|invest|credit|loan|invoice|factoring/.test(ideaLower)) {
          title = "Aegis Capital AI";
          industry = "FinTech & Financial Infrastructure";
          tagline = "Intelligent automated underwriting and cash-flow risk mitigation.";
        } else if (/learn|edu|student|teach|school|course|skill|academy/.test(ideaLower)) {
          title = "CognitivePath AI";
          industry = "EdTech & Talent Infrastructure";
          tagline = "Personalized adaptive learning journeys backed by verified competency passports.";
        } else {
          title = "Nexura Intelligence";
          industry = "Enterprise AI & Autonomous Software";
          tagline = "Autonomous workflow intelligence and verified execution architecture.";
        }
      }

      const sessionId = `gem-${Date.now().toString(36)}`;
      const fallbackAnalysis = {
        title: title,
        tagline: tagline,
        industry: industry,
        source: "Gemini Pro Client Synthesis",
        deep_explanation: {
          elevator_pitch: `${title} resolves manual operational bottlenecks with real-time autonomous AI agents. Based on: '${idea}'.`,
          architectural_thesis: "Event-driven asynchronous microservices, PostgreSQL with Row Level Security (RLS), and verified telemetry pipelines.",
          core_value_prop: "Replaces fragmented manual spreadsheets and slow legacy software with automated real-time orchestration.",
          monetization_strategy: "B2B SaaS tiered subscriptions ($499 - $5,000/mo) + enterprise white-glove onboarding.",
          defensibility_moat: "High data gravity through continuous workflow ingestion and sticky multi-stakeholder network effects."
        },
        key_features: [
          {
            title: "Autonomous Multi-Agent Workflow Orchestration",
            description: "Asynchronous AI agent pipelines decompose complex operational processes into verified steps without manual bottlenecks.",
            badge: "Core AI Engine"
          },
          {
            title: "Real-Time Telemetry & Intelligent Analytics",
            description: "Instant data ingestion and interactive dashboards offering operational visibility, KPI tracking, and automated forecasting.",
            badge: "Analytics"
          },
          {
            title: "Enterprise Knowledge & Semantic RAG Hub",
            description: "High-speed hybrid search over private enterprise documentation, APIs, and data stores with strict citation provenance.",
            badge: "Knowledge Mesh"
          },
          {
            title: "Automated Executive PDF & Dossier Generation",
            description: "Instant compilation of operational metrics, financial projections, and compliance checklists into professional branded PDFs.",
            badge: "Automation"
          },
          {
            title: "Two-Way Platform Distribution (HR & Shark Room)",
            description: "1-click push of hiring specifications directly to HR dashboards and investor-ready proposals to Shark Room syndicates.",
            badge: "Ecosystem"
          }
        ],
        project_scope: {
          tam: "$22.0B",
          sam: "$5.4B",
          som: "$240M",
          mvp_features: [
            "Core autonomous ingestion pipeline connecting existing customer workflows.",
            "Real-time analytics dashboard with interactive data visualizers.",
            "Automated PDF report and proposal generation engine.",
            "Role-based authentication with strict data isolation and audit logging."
          ],
          phase2_features: [
            "Multi-agent predictive simulation and automated scenario forecasting.",
            "Native two-way ERP integrations (SAP, NetSuite, Salesforce).",
            "Advanced collaborative team workspaces with approval hierarchies."
          ],
          target_icp: [
            "Mid-to-large enterprise department heads, VPs of Engineering, and COOs.",
            "High-growth startups and scaling teams seeking operational leverage."
          ]
        },
        investment_required: {
          total_ask: "$750,000",
          stage: "Seed Round",
          runway_months: 18,
          valuation_range: "$4.5M - $6.0M Post-Money",
          use_of_funds: [
            { category: "Engineering & AI R&D (45%)", percentage: "45%", amount: "$337,500", purpose: "Core backend architecture and model fine-tuning." },
            { category: "GTM, Sales & Growth (25%)", percentage: "25%", amount: "$187,500", purpose: "Customer acquisition and pilot partner onboarding." },
            { category: "Operations, Legal & Compliance (15%)", percentage: "15%", amount: "$112,500", purpose: "SOC2 compliance and intellectual property protection." },
            { category: "Cloud Infrastructure & Security (15%)", percentage: "15%", amount: "$112,500", purpose: "FastAPI hosting and database scaling." }
          ],
          key_milestones_unlocked: [
            "Deploy production prototype with 10 committed enterprise pilot accounts.",
            "Reach $50,000 Monthly Recurring Revenue (MRR) with < 1.5% churn.",
            "Position venture for institutional Series A round with 4x valuation step-up."
          ]
        },
        execution_roadmap: [
          {
            phase_number: 1,
            phase_name: "Phase 1: Validation & MVP Build",
            timeline: "Month 1 - 2 (Days 1 - 60)",
            objective: "Build core production prototype and validate problem-solution fit with 3 anchor design partners.",
            kpi: "Functional MVP deployed with 3 committed pilot partners."
          },
          {
            phase_number: 2,
            phase_name: "Phase 2: Alpha Launch & Early Customer Retention",
            timeline: "Month 3 - 5 (Days 61 - 150)",
            objective: "Convert alpha design partners into paying pilot customers and measure weekly active retention.",
            kpi: "$15k MRR achieved with > 70% weekly active retention."
          },
          {
            phase_number: 3,
            phase_name: "Phase 3: Product-Market Fit & Monetization Scale",
            timeline: "Month 6 - 8 (Days 151 - 240)",
            objective: "Solidify repeatable sales playbook, formalize pricing tiers, and accelerate word-of-mouth referral loops.",
            kpi: "$45k MRR with LTV:CAC ratio exceeding 3.5x."
          },
          {
            phase_number: 4,
            phase_name: "Phase 4: Growth Engine, Team Expansion & Scale",
            timeline: "Month 9 - 12 (Days 241 - 365)",
            objective: "Scale dedicated sales team, expand enterprise compliance integrations, and prepare Series A data room.",
            kpi: "$100k+ MRR ($1.2M ARR run rate) and term sheet signed."
          }
        ],
        required_job_roles: [
          {
            role_id: "role-01",
            title: "Founding AI / ML Systems Engineer",
            department: "Engineering / AI",
            experience_level: "Senior (4+ years)",
            salary_range: "$125,000 - $160,000",
            hiring_priority: "Immediate (Phase 1)",
            responsibilities: [
              "Architect low-latency LLM agent pipelines with structured JSON output enforcement.",
              "Implement vector search, semantic embeddings, and hybrid retrieval caches.",
              "Optimize cloud compute costs through aggressive prompt compression."
            ],
            required_skills: [
              { skill_id: "sk-04", name: "AI & LLM Integration", weight: 0.40, category: "AI / ML", is_required: true },
              { skill_id: "sk-01", name: "Python & FastAPI", weight: 0.35, category: "Backend", is_required: true },
              { skill_id: "sk-02", name: "PostgreSQL & Database Design", weight: 0.25, category: "Database", is_required: true }
            ],
            preferred_skills: [
              { skill_id: "sk-05", name: "Cloud Deployment & Docker", weight: 1.0, category: "DevOps", is_required: false }
            ]
          },
          {
            role_id: "role-02",
            title: "Lead Full-Stack Web Application Architect",
            department: "Engineering / Product",
            experience_level: "Senior (4+ years)",
            salary_range: "$120,000 - $150,000",
            hiring_priority: "Month 1 (Phase 1)",
            responsibilities: [
              "Build intuitive, ultra-fast collaborative interfaces using modern ES Modules and CSS Grid.",
              "Implement real-time reactive state management and optimistic UI updates.",
              "Ensure bulletproof API synchronization and client-side offline fallbacks."
            ],
            required_skills: [
              { skill_id: "sk-03", name: "Modern JavaScript & Frontend", weight: 0.45, category: "Frontend", is_required: true },
              { skill_id: "sk-01", name: "Python & FastAPI", weight: 0.35, category: "Backend", is_required: true },
              { skill_id: "sk-02", name: "PostgreSQL & Database Design", weight: 0.20, category: "Database", is_required: true }
            ],
            preferred_skills: [
              { skill_id: "sk-05", name: "Cloud Deployment & Docker", weight: 1.0, category: "DevOps", is_required: false }
            ]
          },
          {
            role_id: "role-03",
            title: "Founding Head of Growth & Product Marketing",
            department: "Growth / Marketing",
            experience_level: "Mid-Senior (3+ years)",
            salary_range: "$95,000 - $125,000 + Equity",
            hiring_priority: "Month 3 (Phase 2)",
            responsibilities: [
              "Drive product-led growth (PLG) self-serve onboarding funnels.",
              "Craft technical case studies, competitive battlecards, and sales demos.",
              "Execute outbound pipeline targeting mid-market heads of engineering."
            ],
            required_skills: [
              { skill_id: "sk-saas-01", name: "Product-Led Growth (PLG) Strategy", weight: 0.50, category: "Growth", is_required: true },
              { skill_id: "sk-saas-02", name: "Developer & Enterprise Content Marketing", weight: 0.50, category: "Marketing", is_required: true }
            ],
            preferred_skills: [
              { skill_id: "sk-saas-03", name: "Inbound Lead Analytics & HubSpot", weight: 1.0, category: "Tools", is_required: false }
            ]
          }
        ],
        chat_reply: `### ✦ Gemini Pro Startup Blueprint: **${title}**\n\nI have generated a complete, investor-grade execution roadmap, hiring plan, and financial model for your venture.`
      };

      return {
        session_id: sessionId,
        analysis: fallbackAnalysis,
        founder: { id: data.founder_id || 'found-01', name: data.founder_name || 'Sarah Lin', email: 'sarah.lin@ecotrace.ai' }
      };
    }
  }

  getRolesPdfUrl(sessionId) {
    return `${API_BASE}/founder/roles-pdf/${sessionId}`;
  }

  getInvestorPitchPdfUrl(sessionId) {
    return `${API_BASE}/founder/investor-pdf/${sessionId}`;
  }

  async shareToHr(data) {
    try {
      return await this.request('/founder/share-to-hr', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      // LocalStorage fallback for HR dashboard visibility
      const key = 'i2i_shared_hiring_requests';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const newReq = {
        id: `hr-req-${Date.now().toString(36)}`,
        ...data,
        status: 'New Request',
        shared_at: new Date().toISOString()
      };
      existing.unshift(newReq);
      localStorage.setItem(key, JSON.stringify(existing));
      return { success: true, request: newReq, message: "Hiring specification saved to HR Dashboard!" };
    }
  }

  async getSharedHiringRequests() {
    try {
      return await this.request('/hr/shared-hiring-requests');
    } catch (e) {
      const key = 'i2i_shared_hiring_requests';
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
  }

  async convertSharedRoleToJob(data) {
    let res = null;
    try {
      res = await this.request('/hr/convert-request-to-job', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      console.warn("Backend convertSharedRoleToJob error, building fallback job", e);
    }

    let newJob = res?.job;
    if (!newJob) {
      try {
        const reqs = JSON.parse(localStorage.getItem('i2i_shared_hiring_requests') || '[]');
        const reqObj = reqs.find(r => r.id === data.request_id);
        const roles = reqObj?.roles || [];
        const role = roles[data.role_index || 0] || {};
        newJob = {
          id: `job-${Date.now().toString(36)}`,
          created_by: data.hr_id || 'hr-01',
          company_name: reqObj?.idea_title || "Venture Startup",
          company: reqObj?.idea_title || "Venture Startup",
          title: role.title || "Founding Engineer",
          description: Array.isArray(role.responsibilities) ? role.responsibilities.join('\n') : (role.responsibilities || "Deliver core architecture"),
          experience_level: role.experience_level || "Senior (4+ years)",
          salary_min: 120000,
          salary_max: 175000,
          salary_range: "$120,000 - $175,000",
          location: "Remote / Hybrid",
          employment_type: "Full-time",
          job_type: "Full-time",
          status: "Active",
          created_at: new Date().toISOString(),
          is_new: true,
          required_skills: [
            ...(role.required_skills || []).map(s => ({ skill_name: s.name || s, name: s.name || s, is_required: true, weight: s.weight || 0.4 })),
            ...(role.preferred_skills || []).map(s => ({ skill_name: s.name || s, name: s.name || s, is_required: false, weight: s.weight || 0.25 }))
          ]
        };
      } catch (err) {}
    }

    if (newJob) {
      newJob.is_new = true;
      newJob.company = newJob.company || newJob.company_name;
      newJob.company_name = newJob.company_name || newJob.company;
      newJob.job_type = newJob.job_type || newJob.employment_type || 'Full-time';
      newJob.employment_type = newJob.employment_type || newJob.job_type;
      newJob.salary_range = newJob.salary_range || (newJob.salary_min ? `$${newJob.salary_min.toLocaleString()} - $${newJob.salary_max.toLocaleString()}` : "$120,000 - $175,000");

      try {
        const raw = localStorage.getItem('i2i_custom_jobs');
        const list = raw ? JSON.parse(raw) : [];
        const filtered = list.filter(j => j.id !== newJob.id);
        filtered.unshift(newJob);
        localStorage.setItem('i2i_custom_jobs', JSON.stringify(filtered));

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('i2i_jobs_updated', { detail: newJob }));
        }
      } catch (e) {}
    }

    return res || { success: true, message: "Role converted to active job opening!", job: newJob };
  }

  async shareToInvestor(data) {
    try {
      return await this.request('/founder/share-to-investor', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    } catch (e) {
      // LocalStorage fallback for Investor dashboard visibility
      const key = 'i2i_shared_founder_pitches';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      const newPitch = {
        id: `pitch-${Date.now().toString(36)}`,
        ...data,
        status: 'In Deal Pipeline',
        shared_at: new Date().toISOString()
      };
      existing.unshift(newPitch);
      localStorage.setItem(key, JSON.stringify(existing));
      return { success: true, pitch: newPitch, message: "Proposal saved to Shark Room!" };
    }
  }

  async getSharedPitches() {
    try {
      return await this.request('/investor/shared-pitches');
    } catch (e) {
      const key = 'i2i_shared_founder_pitches';
      return JSON.parse(localStorage.getItem(key) || '[]');
    }
  }

  async getMessages(channel = '', contactId = '') {
    const key = 'i2i_messages';
    const defaultMessages = [
      {
        id: "msg-rushikesh-koomal-01",
        sender_id: "cand-rushikesh12345",
        sender_role: "candidate",
        sender_name: "rushikesh@12345",
        receiver_id: "hr-koomal123456",
        receiver_role: "hr",
        receiver_name: "koomal@123456",
        text: "Hi Koomal! I'm reaching out regarding the open AI Systems & Full-Stack roles at NovaTech.",
        channel: "candidate",
        timestamp: "2026-10-23T11:00:00Z",
        is_read: true
      },
      {
        id: "msg-rushikesh-koomal-02",
        sender_id: "hr-koomal123456",
        sender_role: "hr",
        sender_name: "koomal@123456",
        receiver_id: "cand-rushikesh12345",
        receiver_role: "candidate",
        receiver_name: "rushikesh@12345",
        text: "Hello Rushikesh! Great to connect. Your verified 75/25 assessment rating is outstanding. Let's coordinate a technical interview.",
        channel: "candidate",
        timestamp: "2026-10-23T11:05:00Z",
        is_read: true
      },
      {
        id: "msg-01",
        sender_id: "cand-01",
        sender_role: "candidate",
        sender_name: "Alex Rivera",
        receiver_id: "hr-01",
        receiver_role: "hr",
        receiver_name: "Elena Rostova",
        text: "Hi Elena! I just completed the Python & FastAPI production assessment with a 92% score. I'm very interested in the Senior Full-Stack Engineer role at NovaTech Systems.",
        channel: "candidate",
        timestamp: "2026-03-01T10:15:00Z",
        is_read: true
      },
      {
        id: "msg-02",
        sender_id: "hr-01",
        sender_role: "hr",
        sender_name: "Elena Rostova",
        receiver_id: "cand-01",
        receiver_role: "candidate",
        receiver_name: "Alex Rivera",
        text: "Hello Alex, impressive performance on the assessment! Your 75/25 compatibility score came out to 94%. We'd love to schedule a technical architecture discussion with our engineering lead.",
        channel: "candidate",
        timestamp: "2026-03-01T10:30:00Z",
        is_read: true
      },
      {
        id: "msg-03",
        sender_id: "cand-01",
        sender_role: "candidate",
        sender_name: "Alex Rivera",
        receiver_id: "hr-01",
        receiver_role: "hr",
        receiver_name: "Elena Rostova",
        text: "Thank you Elena! I'm available this Thursday or Friday afternoon. Looking forward to discussing the async microservices pipeline.",
        channel: "candidate",
        timestamp: "2026-03-01T10:45:00Z",
        is_read: true
      },
      {
        id: "msg-04",
        sender_id: "cand-02",
        sender_role: "candidate",
        sender_name: "Priya Sharma",
        receiver_id: "hr-01",
        receiver_role: "hr",
        receiver_name: "Elena Rostova",
        text: "Hi Elena, I saw NovaTech's open AI Systems role. I've verified my skills in LLM fine-tuning and agentic pipelines with a 95% assessment rating.",
        channel: "candidate",
        timestamp: "2026-03-02T14:10:00Z",
        is_read: true
      },
      {
        id: "msg-05",
        sender_id: "hr-01",
        sender_role: "hr",
        sender_name: "Elena Rostova",
        receiver_id: "cand-02",
        receiver_role: "candidate",
        receiver_name: "Priya Sharma",
        text: "Hi Priya, your credentials look fantastic. We are building an enterprise autonomous agent suite and your background is a great match. Are you free for an exploratory call?",
        channel: "candidate",
        timestamp: "2026-03-02T14:35:00Z",
        is_read: true
      },
      {
        id: "msg-06",
        sender_id: "cand-02",
        sender_role: "candidate",
        sender_name: "Priya Sharma",
        receiver_id: "hr-01",
        receiver_role: "hr",
        receiver_name: "Elena Rostova",
        text: "Absolutely! I can jump on a Google Meet tomorrow at 3 PM UTC. Let me know if that works for your team.",
        channel: "candidate",
        timestamp: "2026-03-02T14:50:00Z",
        is_read: false
      },
      {
        id: "msg-07",
        sender_id: "cand-03",
        sender_role: "candidate",
        sender_name: "Jordan Lee",
        receiver_id: "hr-01",
        receiver_role: "hr",
        receiver_name: "Elena Rostova",
        text: "Hello Elena, I've submitted my application for the UI Architect position. My portfolio showcases our design system and interactive dashboards.",
        channel: "candidate",
        timestamp: "2026-03-03T09:20:00Z",
        is_read: true
      },
      {
        id: "msg-08",
        sender_id: "hr-01",
        sender_role: "hr",
        sender_name: "Elena Rostova",
        receiver_id: "cand-03",
        receiver_role: "candidate",
        receiver_name: "Jordan Lee",
        text: "Thanks Jordan! We're reviewing your design showcase alongside our front-end lead. We'll follow up shortly with next steps.",
        channel: "candidate",
        timestamp: "2026-03-03T09:40:00Z",
        is_read: true
      },
      {
        id: "msg-09",
        sender_id: "found-01",
        sender_role: "founder",
        sender_name: "Sarah Lin",
        receiver_id: "hr-01",
        receiver_role: "hr",
        receiver_name: "Elena Rostova",
        text: "Hi Elena, I just shared our hiring specification for EcoTrace AI via Gemini Pro Studio. We urgently need a Lead Backend Engineer with 75% core FastAPI & PostgreSQL and 25% Docker/Kubernetes.",
        channel: "founder",
        timestamp: "2026-03-01T11:00:00Z",
        is_read: true
      },
      {
        id: "msg-10",
        sender_id: "hr-01",
        sender_role: "hr",
        sender_name: "Elena Rostova",
        receiver_id: "found-01",
        receiver_role: "founder",
        receiver_name: "Sarah Lin",
        text: "Hi Sarah! I received the hiring specification and official PDF. We already ran it through our 75/25 dual-tier matching engine and identified 2 candidates with >80% compatibility (including Alex Rivera at 94%).",
        channel: "founder",
        timestamp: "2026-03-01T11:25:00Z",
        is_read: true
      },
      {
        id: "msg-11",
        sender_id: "found-01",
        sender_role: "founder",
        sender_name: "Sarah Lin",
        receiver_id: "hr-01",
        receiver_role: "hr",
        receiver_name: "Elena Rostova",
        text: "That's incredible turnaround! Could you please share their verified passports and arrange initial technical screens for this week?",
        channel: "founder",
        timestamp: "2026-03-01T11:45:00Z",
        is_read: false
      },
      {
        id: "msg-12",
        sender_id: "found-02",
        sender_role: "founder",
        sender_name: "Marcus Vance",
        receiver_id: "hr-01",
        receiver_role: "hr",
        receiver_name: "Elena Rostova",
        text: "Elena, our Series A round is closing soon and we need to ramp up our distributed systems team. Do you have verified candidates with consensus protocol experience?",
        channel: "founder",
        timestamp: "2026-03-03T16:15:00Z",
        is_read: true
      },
      {
        id: "msg-13",
        sender_id: "hr-01",
        sender_role: "hr",
        sender_name: "Elena Rostova",
        receiver_id: "found-02",
        receiver_role: "founder",
        receiver_name: "Marcus Vance",
        text: "Hi Marcus, yes! We have candidates with verified badges in Distributed Systems and Redis Caching. I will compile a dedicated dossier for HyperScale Data today.",
        channel: "founder",
        timestamp: "2026-03-03T16:40:00Z",
        is_read: true
      },
      {
        id: "msg-14",
        sender_id: "inv-01",
        sender_role: "investor",
        sender_name: "Michael Chen (Apex Ventures)",
        receiver_id: "found-01",
        receiver_role: "founder",
        receiver_name: "Sarah Lin",
        text: "Hi Sarah, we reviewed your EcoTrace AI proposal and 92.5% readiness score. We are very interested in leading your $1.2M Seed round. What is your current ARR and enterprise pipeline?",
        channel: "investor",
        timestamp: "2026-03-02T15:20:00Z",
        is_read: true
      },
      {
        id: "msg-15",
        sender_id: "found-01",
        sender_role: "founder",
        sender_name: "Sarah Lin",
        receiver_id: "inv-01",
        receiver_role: "investor",
        receiver_name: "Michael Chen (Apex Ventures)",
        text: "Hi Michael! We currently have $320k contracted ARR with 4 enterprise pilots converting next month. Our 75/25 technical team architecture has reduced onboarding from 6 weeks to 3 days.",
        channel: "investor",
        timestamp: "2026-03-02T15:45:00Z",
        is_read: true
      },
      {
        id: "msg-16",
        sender_id: "inv-01",
        sender_role: "investor",
        sender_name: "Michael Chen (Apex Ventures)",
        receiver_id: "found-01",
        receiver_role: "founder",
        receiver_name: "Sarah Lin",
        text: "That is exceptional traction, Sarah. Let's schedule a formal pitch meeting this Thursday to review term sheet parameters.",
        channel: "investor",
        timestamp: "2026-03-02T16:10:00Z",
        is_read: false
      },
      {
        id: "msg-17",
        sender_id: "inv-02",
        sender_role: "investor",
        sender_name: "Sophia Zhang (Horizon Capital)",
        receiver_id: "found-01",
        receiver_role: "founder",
        receiver_name: "Sarah Lin",
        text: "Hello Sarah, loving the Gemini Pro role generation specs you published. Would love to connect for a 30-min intro sync on Thursday.",
        channel: "investor",
        timestamp: "2026-03-03T11:00:00Z",
        is_read: true
      },
      {
        id: "msg-prasad-hi-01",
        sender_id: "inv-prasad12345",
        sender_role: "investor",
        sender_name: "prasad@12345 (Apex Frontier Ventures)",
        receiver_id: "found-omkar12345",
        receiver_role: "founder",
        receiver_name: "omkar@12345",
        text: "hi",
        channel: "investor",
        timestamp: "2026-10-23T11:05:00Z",
        is_read: false
      },
      {
        id: "msg-prasad-hi-02",
        sender_id: "inv-prasad12345",
        sender_role: "investor",
        sender_name: "prasad@12345 (Apex Frontier Ventures)",
        receiver_id: "found-omkar12345",
        receiver_role: "founder",
        receiver_name: "omkar@12345",
        text: "hi Omkar, reviewed your EcoTrace AI proposal. Let's schedule a pitch meeting on Google Meet.",
        channel: "investor",
        timestamp: "2026-10-23T11:06:00Z",
        is_read: false
      },
      {
        id: "msg-prasad-hi-03",
        sender_id: "found-omkar12345",
        sender_role: "founder",
        sender_name: "omkar@12345",
        receiver_id: "inv-prasad12345",
        receiver_role: "investor",
        receiver_name: "prasad@12345 (Apex Frontier Ventures)",
        text: "Hi Prasad! Thank you for reaching out. We would love to schedule a pitch meeting on Google Meet.",
        channel: "investor",
        timestamp: "2026-10-23T11:10:00Z",
        is_read: true
      }
    ];

    let combined = [];
    // 1. Attempt FastAPI backend fetch with short 1.2s timeout
    try {
      let q = [];
      if (channel) q.push(`channel=${encodeURIComponent(channel)}`);
      if (contactId) q.push(`contact_id=${encodeURIComponent(contactId)}`);
      const qs = q.length ? `?${q.join('&')}` : '';
      const serverMsgs = await this.request(`/messages${qs}`, {}, 1200);
      if (Array.isArray(serverMsgs)) {
        combined = [...serverMsgs];
      }
    } catch (e) {
      // Backend request silent fallback
    }

    // 2. Fetch recent messages from Cloud Relay to ensure cross-window & incognito sync
    try {
      const relayRes = await fetch(`${CLOUD_RELAY_URL}/json?poll=1`, { signal: AbortSignal.timeout(1200) }).catch(() => null);
      if (relayRes && relayRes.ok) {
        const text = await relayRes.text();
        const lines = text.trim().split('\n');
        for (const line of lines) {
          if (!line) continue;
          try {
            const item = JSON.parse(line);
            if (item.event === 'message' && item.message) {
              const rec = JSON.parse(item.message);
              if (rec && rec.id && !combined.some(c => c.id === rec.id)) {
                combined.push(rec);
              }
            }
          } catch(err) {}
        }
      }
    } catch (e) {}

    // 3. Always merge in defaultMessages so demo seed conversations are never lost
    defaultMessages.forEach(dm => {
      if (!combined.some(cm => cm.id === dm.id)) {
        combined.push(dm);
      }
    });

    // 4. Merge in localStorage messages
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const localMsgs = JSON.parse(stored);
        if (Array.isArray(localMsgs)) {
          localMsgs.forEach(lm => {
            if (!combined.some(cm => cm.id === lm.id)) {
              combined.push(lm);
            }
          });
        }
      }
      // Keep localStorage synchronized with combined
      localStorage.setItem(key, JSON.stringify(combined));
    } catch (e) {}

    let res = combined;
    if (channel) res = res.filter(m => m.channel === channel);
    if (contactId) {
      const cId = contactId.toLowerCase().trim();
      res = res.filter(m => {
        const sId = (m.sender_id || '').toLowerCase().trim();
        const rId = (m.receiver_id || '').toLowerCase().trim();
        const sName = (m.sender_name || '').toLowerCase().trim();
        const rName = (m.receiver_name || '').toLowerCase().trim();
        return sId === cId || rId === cId || sName === cId || rName === cId ||
               sId.includes(cId) || rId.includes(cId) || sName.includes(cId) || rName.includes(cId) ||
               (cId.length > 3 && (cId.includes(sId) || cId.includes(rId) || cId.includes(sName) || cId.includes(rName))) ||
               (cId.includes('rushikesh') && (sId.includes('rushikesh') || rId.includes('rushikesh') || sName.includes('rushikesh') || rName.includes('rushikesh')));
      });
    }
    return res.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  async sendMessage(data) {
    const isHrSender = data.sender_role === 'hr';
    let record = {
      id: data.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      sender_id: data.sender_id || (isHrSender ? 'hr-koomal123456' : 'cand-rushikesh12345'),
      receiver_id: data.receiver_id,
      sender_role: data.sender_role || (data.receiver_role === 'hr' ? 'candidate' : 'hr'),
      receiver_role: data.receiver_role || (data.sender_role === 'hr' ? 'candidate' : 'hr'),
      sender_name: data.sender_name || (isHrSender ? 'koomal@123456' : 'rushikesh@12345'),
      receiver_name: data.receiver_name || (isHrSender ? 'rushikesh@12345' : 'koomal@123456'),
      text: data.text,
      channel: data.channel || 'candidate',
      timestamp: data.timestamp || new Date().toISOString(),
      is_read: false
    };

    // 1. Immediately store in localStorage & trigger local UI updates
    this.saveIncomingMessageLocally(record);

    // 2. Publish to Cloud Relay (cross-tab, cross-window, cross-device, incognito-safe)
    try {
      fetch(CLOUD_RELAY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }).catch(() => {});
    } catch (e) {}

    // 3. Attempt FastAPI backend save (if server is running, 1.2s timeout)
    try {
      const resp = await this.request('/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      }, 1200).catch(() => null);
      if (resp && resp.data) {
        record = resp.data;
        this.saveIncomingMessageLocally(record);
      }
    } catch (e) {}

    return record;
  }

  async markMessagesAsRead(conditionFn) {
    const key = 'i2i_messages';
    let changed = false;
    let targetMsg = null;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const msgs = JSON.parse(stored);
        if (Array.isArray(msgs)) {
          msgs.forEach(m => {
            if (!m.is_read && conditionFn(m)) {
              m.is_read = true;
              changed = true;
              targetMsg = m;
            }
          });
          if (changed) {
            localStorage.setItem(key, JSON.stringify(msgs));
          }
        }
      }
    } catch (e) {}

    if (changed && targetMsg) {
      try {
        await this.request('/messages/read', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channel: targetMsg.channel || 'investor',
            sender_id: targetMsg.sender_id,
            receiver_id: targetMsg.receiver_id
          })
        });
      } catch (e) {}
    }
  }
}

export const api = new ApiService();

