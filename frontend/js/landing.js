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
  const mobileActions = document.getElementById('landing-mobile-actions');

  if (token && user) {
    if (sessionPill && sessionName) {
      sessionName.textContent = `${user.full_name || user.username} (${(user.role || 'user').toUpperCase()})`;
      sessionPill.classList.remove('hidden');
    }

    const launchHtml = `
      <a href="dashboard.html" class="hero-btn-primary" style="padding: 0.5rem 1.15rem; font-size: 0.88rem;">
        Launch Dashboard →
      </a>
    `;

    if (navActions) navActions.innerHTML = launchHtml;
    if (mobileActions) mobileActions.innerHTML = launchHtml;
  }

  // Hamburger Toggle Behavior
  const hamburgerBtn = document.getElementById('landing-hamburger-btn');
  const mobileMenu = document.getElementById('landing-mobile-menu');

  if (hamburgerBtn && mobileMenu) {
    const toggleMenu = (show) => {
      const isOpen = show !== undefined ? show : !mobileMenu.classList.contains('open');
      if (isOpen) {
        mobileMenu.classList.add('open');
        hamburgerBtn.classList.add('open');
        hamburgerBtn.setAttribute('aria-expanded', 'true');
      } else {
        mobileMenu.classList.remove('open');
        hamburgerBtn.classList.remove('open');
        hamburgerBtn.setAttribute('aria-expanded', 'false');
      }
    };

    hamburgerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggleMenu(false);
      });
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!mobileMenu.contains(e.target) && !hamburgerBtn.contains(e.target)) {
        toggleMenu(false);
      }
    });

    // Close on resize to desktop
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && mobileMenu.classList.contains('open')) {
        toggleMenu(false);
      }
    });
  }
});
