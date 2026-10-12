// Idea2Impact - Landing Page Controller
document.addEventListener('DOMContentLoaded', () => {
  const token = localStorage.getItem('i2i_token');
  let user = null;
  try {
    const userStr = localStorage.getItem('i2i_user');
    if (userStr) user = JSON.parse(userStr);
  } catch (e) {
    user = null;
  }

  const sessionPill = document.getElementById('landing-session-pill');
  const sessionName = document.getElementById('session-user-name');
  const navActions = document.getElementById('landing-nav-actions');

  if (token && user) {
    if (sessionPill && sessionName) {
      sessionName.textContent = `${user.full_name || user.username} (${(user.role || 'user').toUpperCase()})`;
      sessionPill.classList.remove('hidden');
    }

    if (navActions) {
      navActions.innerHTML = `
        <a href="dashboard.html" class="hero-btn-primary" style="padding: 0.5rem 1.15rem; font-size: 0.88rem;">
          Launch Dashboard →
        </a>
      `;
    }
  }
});
