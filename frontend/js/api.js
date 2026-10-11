// Idea2Impact - Client API Module

const API_BASE = window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
  ? `${window.location.origin}/api`
  : 'http://127.0.0.1:8000/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const token = localStorage.getItem('i2i_token');
    const authHeaders = token ? { 'Authorization': `Bearer ${token}` } : {};
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...(options.headers || {})
        },
        ...options
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: response.statusText }));
        throw new Error(err.detail || 'Network request failed');
      }
      return await response.json();
    } catch (error) {
      console.warn(`API call ${endpoint} error:`, error.message);
      throw error;
    }
  }

  // Authentication
  async login(username, password) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
  }

  async register(data) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async googleAuth(data) {
    return this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMe() {
    return this.request('/auth/me');
  }

  // Stats
  async getStats() {
    return this.request('/stats');
  }

  // Profiles
  async getProfiles(role = '') {
    return this.request(role ? `/profiles?role=${role}` : '/profiles');
  }

  async getProfileMe(userId) {
    return this.request(`/profiles/me?user_id=${userId}`);
  }

  async updateProfile(data, userId) {
    return this.request(`/profiles/me?user_id=${userId}`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Skills & Assessments
  async getSkills() {
    return this.request('/skills');
  }

  async getAssessments() {
    return this.request('/assessments');
  }

  async getAssessment(id) {
    return this.request(`/assessments/${id}`);
  }

  async submitAssessment(id, data) {
    return this.request(`/assessments/${id}/attempts`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Passport
  async getPassport(candidateId) {
    return this.request(`/candidate/passport?candidate_id=${candidateId}`);
  }

  getPassportPdfUrl(candidateId) {
    return `${API_BASE}/candidate/${candidateId}/passport/pdf`;
  }

  // Jobs & Matching
  async getJobs(candidateId = '') {
    return this.request(candidateId ? `/jobs?candidate_id=${candidateId}` : '/jobs');
  }

  async createJob(data) {
    return this.request('/jobs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getJobMatches(jobId) {
    return this.request(`/jobs/${jobId}/matches`);
  }

  async applyJob(jobId, data) {
    return this.request(`/jobs/${jobId}/applications`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getMyApplications(candidateId) {
    return this.request(`/applications/me?candidate_id=${candidateId}`);
  }

  async updateApplicationStatus(appId, data) {
    return this.request(`/applications/${appId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Startups & AI Copilot
  async analyzeIdea(data) {
    return this.request('/ideas/analyze', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getStartups() {
    return this.request('/startups');
  }

  async createStartup(data) {
    return this.request('/startups', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  getProposalPdfUrl(startupId) {
    return `${API_BASE}/startups/${startupId}/proposal/pdf`;
  }

  async shareProposal(startupId, data) {
    return this.request(`/proposals/${startupId}/share`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  // Investor & Sharks Mode
  async getInvestorProposalAnalysis(startupId) {
    return this.request(`/investor/proposals/${startupId}/ai-analysis`);
  }

  async expressInterest(data) {
    return this.request('/investor-interests', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getInvestorInterests(investorId = '') {
    return this.request(investorId ? `/investor/interests?investor_id=${investorId}` : '/investor/interests');
  }

  // Meetings & Audit
  async getMeetings(userId = '') {
    return this.request(userId ? `/meetings?user_id=${userId}` : '/meetings');
  }

  async scheduleMeeting(data) {
    return this.request('/meetings', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async getAuditLogs() {
    return this.request('/audit-logs');
  }
}

export const api = new ApiService();
