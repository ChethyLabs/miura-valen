// ═══════════════════════════════════════════════════════════════
//  CONFIG — fill in your Firebase project values
// ═══════════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyB8hw3DrMuCRO1uY9T4Ug_cl23-ehRPOcE",
  authDomain: "miura-valen.firebaseapp.com",
  databaseURL: "https://miura-valen-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "miura-valen",
  storageBucket: "miura-valen.firebasestorage.app",
  messagingSenderId: "800015957963",
  appId: "1:800015957963:web:ed27be37bd71500f37004e",
  measurementId: "G-T0S3JZ2VW3"
};

// ═══════════════════════════════════════════════════════════════
//  SUBJECTS CONFIG
// ═══════════════════════════════════════════════════════════════
const SUBJECTS = {
  him: [
    { id: 'chem', name: 'Chemistry', emoji: '⚗️', color: 'rose', shared: true },
    { id: 'phy', name: 'Physics', emoji: '⚡', color: 'lavender', shared: true },
    { id: 'maths', name: 'Combined Maths', emoji: '📐', color: 'sage', shared: false },
  ],
  her: [
    { id: 'chem', name: 'Chemistry', emoji: '⚗️', color: 'rose', shared: true },
    { id: 'phy', name: 'Physics', emoji: '⚡', color: 'lavender', shared: true },
    { id: 'bio', name: 'Biology', emoji: '🌿', color: 'sage', shared: false },
  ]
};

const PAPER_TYPES = {
  chem: [{ id: 'p1', name: 'Paper 1 (MCQ)', max: 50 }, { id: 'p2', name: 'Paper 2 (Structured)', max: 100 }],
  phy:  [{ id: 'p1', name: 'Paper 1 (MCQ)', max: 50 }, { id: 'p2', name: 'Paper 2 (Structured)', max: 100 }],
  bio:  [{ id: 'p1', name: 'Paper 1 (MCQ)', max: 50 }, { id: 'p2', name: 'Paper 2 (Structured)', max: 100 }],
  maths:[{ id: 'p1', name: 'Paper 1 (Pure)', max: 100 }, { id: 'p2', name: 'Paper 2 (Applied)', max: 100 }],
};

const YEARS = Array.from({ length: 26 }, (_, i) => 2000 + i); // 2000-2025
const ROUNDS = ['Round 1', 'Round 2', 'Round 3', 'Round 4'];

// ═══════════════════════════════════════════════════════════════
//  APP STATE
// ═══════════════════════════════════════════════════════════════
const App = {
  firebase: null,
  auth: null,
  db: null,
  currentUser: null,   // Firebase user
  profile: null,       // { name, avatar, stream }
  otherProfile: null,  // partner's profile
  otherUID: null,
  listeners: [],       // Firebase listeners to clean up

  async init() {
    // Load Firebase from CDN (done in HTML)
    this.firebase = firebase;
    this.auth = firebase.auth();
    this.db = firebase.database();

    // Auth state change
    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.currentUser = user;
        this.loadProfile(user.uid);
      } else {
        this.currentUser = null;
        this.profile = null;
        Router.go('login');
      }
    });

    Router.init();
  },

  async loadProfile(uid) {
    // Register in partner index first (so partner can find us)
    await this.registerInPartnerIndex();
    const snap = await this.db.ref(`users/${uid}/profile`).once('value');
    this.profile = snap.val();
    if (!this.profile || !this.profile.name) {
      Router.go('onboarding');
      return;
    }
    await this.loadPartner();
    Router.go('dashboard');
  },

  async loadPartner() {
    // Look up partner via the /partners index (public readable)
    const snap = await this.db.ref('partnerIndex').once('value');
    const index = snap.val() || {};
    for (const uid in index) {
      if (uid !== this.currentUser.uid) {
        this.otherUID = uid;
        // Fetch their profile directly (allowed by per-uid read rule)
        const profileSnap = await this.db.ref(`users/${uid}/profile`).once('value');
        this.otherProfile = profileSnap.val() || null;
        break;
      }
    }
  },

  async registerInPartnerIndex() {
    // Register this user in the partner index so they can be discovered
    const uid = this.currentUser.uid;
    await this.db.ref(`partnerIndex/${uid}`).set(true);
  },

  getSubjects() {
    const stream = this.profile?.stream || 'him';
    return SUBJECTS[stream] || SUBJECTS.him;
  },

  getPartnerSubjects() {
    const stream = this.otherProfile?.stream === 'her' ? 'her' : 'him';
    return SUBJECTS[stream] || SUBJECTS.him;
  },

  getSharedSubjects() {
    return this.getSubjects().filter(s => s.shared);
  },

  db_ref(path) {
    return this.db.ref(path);
  },

  myRef(path) {
    return this.db.ref(`${path}/${this.currentUser.uid}`);
  },

  async login(email, password) {
    return this.auth.signInWithEmailAndPassword(email, password);
  },

  async logout() {
    this.cleanListeners();
    await this.auth.signOut();
    Router.go('login');
  },

  cleanListeners() {
    this.listeners.forEach(ref => ref.off());
    this.listeners = [];
  },

  trackStreak() {
    const uid = this.currentUser?.uid;
    if (!uid) return;
    const today = new Date().toISOString().split('T')[0];
    this.db.ref(`users/${uid}/streaks`).once('value').then(snap => {
      const s = snap.val() || { current: 0, longest: 0, lastStudyDate: null };
      if (s.lastStudyDate === today) return;
      const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
      if (s.lastStudyDate === yesterday) {
        s.current += 1;
      } else {
        s.current = 1;
      }
      s.longest = Math.max(s.longest, s.current);
      s.lastStudyDate = today;
      this.db.ref(`users/${uid}/streaks`).set(s);
    });
  }
};

// ═══════════════════════════════════════════════════════════════
//  ROUTER
// ═══════════════════════════════════════════════════════════════
const Router = {
  current: null,
  pages: {},

  init() {
    const hash = window.location.hash.slice(1) || 'login';
    this.go(hash);
    window.addEventListener('hashchange', () => {
      const p = window.location.hash.slice(1);
      this.go(p, false);
    });
  },

  register(name, renderFn) {
    this.pages[name] = renderFn;
  },

  go(page, updateHash = true) {
    if (updateHash) window.location.hash = page;
    const root = document.getElementById('root');
    if (!root) return;

    // Guard routes
    if (page !== 'login' && page !== 'onboarding' && !App.currentUser) {
      this.go('login');
      return;
    }

    App.cleanListeners();
    this.current = page;

    const fn = this.pages[page];
    if (fn) {
      root.innerHTML = '';
      fn(root);
    } else {
      // Default to dashboard if unknown route
      this.go('dashboard');
    }

    // Update sidebar active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
  }
};

// ═══════════════════════════════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════════════════════════════
function showToast(msg, type = '') {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✗' : '💬'}</span> ${msg}`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ═══════════════════════════════════════════════════════════════
//  MODAL
// ═══════════════════════════════════════════════════════════════
function openModal(html) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(overlay); });
  return overlay;
}

function closeModal(overlay) {
  overlay.classList.remove('open');
  setTimeout(() => overlay.remove(), 300);
}

// ═══════════════════════════════════════════════════════════════
//  UTILS
// ═══════════════════════════════════════════════════════════════
function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function pct(score, max) {
  if (!score || !max) return 0;
  return Math.round((score / max) * 100);
}

function scoreColor(p) {
  if (p >= 75) return 'var(--sage-deep)';
  if (p >= 50) return 'var(--gold-deep)';
  return 'var(--rose-deep)';
}

function subjectColor(subjectId) {
  const map = { chem: 'rose', phy: 'lavender', bio: 'sage', maths: 'gold' };
  return map[subjectId] || 'muted';
}

function avatarEmoji(av) {
  const avatars = ['🌸', '🌿', '⭐', '🍀', '🌙', '🌺', '🦋', '🌸', '📚', '✨'];
  return avatars[av] || '📚';
}