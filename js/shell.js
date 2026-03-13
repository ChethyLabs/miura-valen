// ═══════════════════════════════════════════════════════════════
//  APP SHELL — sidebar + mobile header
// ═══════════════════════════════════════════════════════════════

function renderShell(root, contentFn) {
  const profile = App.profile || {};
  const av = avatarEmoji(profile.avatar);

  root.innerHTML = `
    <div class="app-shell">
      <!-- Mobile header -->
      <div class="mobile-header" id="mobileHeader">
        <button class="hamburger" id="hamburgerBtn">☰</button>
        <span class="font-display" style="font-size:1.1rem">📖 StudyTogether</span>
      </div>

      <!-- Mobile overlay -->
      <div class="mobile-overlay" id="mobileOverlay"></div>

      <!-- Sidebar -->
      <nav class="sidebar" id="sidebar">
        <div class="sidebar-logo">
          <span>📖</span>
          <span>StudyTogether</span>
        </div>

        <div class="nav-section-label">Overview</div>
        <button class="nav-item" data-page="dashboard">
          <span class="nav-icon">🏠</span> Dashboard
        </button>
        <button class="nav-item" data-page="stats">
          <span class="nav-icon">📊</span> Stats & Analytics
        </button>

        <div class="nav-section-label">Track</div>
        <button class="nav-item" data-page="past-papers">
          <span class="nav-icon">📋</span> Past Papers
        </button>
        <button class="nav-item" data-page="class-papers">
          <span class="nav-icon">🏫</span> Class Papers
        </button>
        <button class="nav-item" data-page="syllabus">
          <span class="nav-icon">📚</span> Syllabus
        </button>

        <div class="nav-section-label">Practice</div>
        <button class="nav-item" data-page="classified">
          <span class="nav-icon">📝</span> Classified Q&A
        </button>
        <button class="nav-item" data-page="tutes">
          <span class="nav-icon">📄</span> Tutorials
        </button>

        <div class="nav-section-label">Together</div>
        <button class="nav-item" data-page="couple">
          <span class="nav-icon">💕</span> Couple's Corner
        </button>

        <div class="nav-section-label">Account</div>
        <button class="nav-item" data-page="settings">
          <span class="nav-icon">⚙️</span> Settings
        </button>

        <div class="sidebar-footer">
          <div class="user-chip" onclick="Router.go('settings')">
            <div class="user-avatar">${av}</div>
            <div class="user-info">
              <div class="user-name">${profile.name || 'You'}</div>
              <div class="user-stream">${profile.stream === 'her' ? 'Bio Sciences' : 'Phy Sciences'}</div>
            </div>
          </div>
        </div>
      </nav>

      <!-- Main -->
      <main class="main-content fade-in" id="pageContent"></main>
    </div>
  `;

  // Wire up nav clicks
  root.querySelectorAll('.nav-item[data-page]').forEach(btn => {
    btn.addEventListener('click', () => {
      Router.go(btn.dataset.page);
      closeMobileMenu();
    });
  });

  // Highlight active
  root.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === Router.current);
  });

  // Mobile menu
  const sidebar = root.querySelector('#sidebar');
  const overlay = root.querySelector('#mobileOverlay');
  const hamburger = root.querySelector('#hamburgerBtn');

  function openMobileMenu() {
    sidebar.classList.add('mobile-open');
    overlay.classList.add('show');
  }
  function closeMobileMenu() {
    sidebar.classList.remove('mobile-open');
    overlay.classList.remove('show');
  }

  hamburger?.addEventListener('click', openMobileMenu);
  overlay?.addEventListener('click', closeMobileMenu);

  // Render content into #pageContent
  contentFn(root.querySelector('#pageContent'));
}
