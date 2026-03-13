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
    { id: 'chem',  name: 'Chemistry',      emoji: '⚗️',  color: 'rose',     shared: true  },
    { id: 'phy',   name: 'Physics',         emoji: '⚡',  color: 'lavender', shared: true  },
    { id: 'maths', name: 'Combined Maths',  emoji: '📐',  color: 'sage',     shared: false },
  ],
  her: [
    { id: 'chem',  name: 'Chemistry',       emoji: '⚗️',  color: 'rose',     shared: true  },
    { id: 'phy',   name: 'Physics',         emoji: '⚡',  color: 'lavender', shared: true  },
    { id: 'bio',   name: 'Biology',         emoji: '🌿',  color: 'sage',     shared: false },
  ]
};

const PAPER_TYPES = {
  chem:  [{ id: 'p1', name: 'Paper 1 (MCQ)',      max: 50  }, { id: 'p2', name: 'Paper 2 (Structured)', max: 100 }],
  phy:   [{ id: 'p1', name: 'Paper 1 (MCQ)',      max: 50  }, { id: 'p2', name: 'Paper 2 (Structured)', max: 100 }],
  bio:   [{ id: 'p1', name: 'Paper 1 (MCQ)',      max: 50  }, { id: 'p2', name: 'Paper 2 (Structured)', max: 100 }],
  maths: [{ id: 'p1', name: 'Paper 1 (Pure)',     max: 100 }, { id: 'p2', name: 'Paper 2 (Applied)',    max: 100 }],
};

const YEARS  = Array.from({ length: 26 }, (_, i) => 2000 + i);
const ROUNDS = ['Round 1', 'Round 2', 'Round 3', 'Round 4'];

// ═══════════════════════════════════════════════════════════════
//  APP STATE
// ═══════════════════════════════════════════════════════════════
const App = {
  auth: null,
  db: null,
  currentUser: null,
  profile: null,
  otherProfile: null,
  otherUID: null,
  listeners: [],

  async init() {
    this.auth = firebase.auth();
    this.db   = firebase.database();

    this.auth.onAuthStateChanged(user => {
      if (user) {
        this.currentUser = user;
        this.loadProfile(user.uid);
      } else {
        this.currentUser = null;
        this.profile     = null;
        Router.go('login');
      }
    });

    Router.init();
  },

  async loadProfile(uid) {
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
    const snap  = await this.db.ref('partnerIndex').once('value');
    const index = snap.val() || {};
    for (const uid in index) {
      if (uid !== this.currentUser.uid) {
        this.otherUID = uid;
        const ps = await this.db.ref(`users/${uid}/profile`).once('value');
        this.otherProfile = ps.val() || null;
        break;
      }
    }
  },

  async registerInPartnerIndex() {
    await this.db.ref(`partnerIndex/${this.currentUser.uid}`).set(true);
  },

  getSubjects() {
    return SUBJECTS[this.profile?.stream] || SUBJECTS.him;
  },

  getPartnerSubjects() {
    return SUBJECTS[this.otherProfile?.stream] || SUBJECTS.him;
  },

  getSharedSubjects() {
    return this.getSubjects().filter(s => s.shared);
  },

  async login(email, password) {
    return this.auth.signInWithEmailAndPassword(email, password);
  },

  async logout() {
    this.cleanListeners();
    await this.auth.signOut();
  },

  cleanListeners() {
    this.listeners.forEach(ref => { try { ref.off(); } catch(e) {} });
    this.listeners = [];
  },

  trackStreak() {
    const uid = this.currentUser?.uid;
    if (!uid) return;
    const today     = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    this.db.ref(`users/${uid}/streaks`).once('value').then(snap => {
      const s = snap.val() || { current: 0, longest: 0, lastStudyDate: null };
      if (s.lastStudyDate === today) return;
      s.current = s.lastStudyDate === yesterday ? s.current + 1 : 1;
      s.longest = Math.max(s.longest, s.current);
      s.lastStudyDate = today;
      this.db.ref(`users/${uid}/streaks`).set(s);
    });
  }
};

// ═══════════════════════════════════════════════════════════════
//  ROUTER  — infinite-loop-proof
// ═══════════════════════════════════════════════════════════════
const Router = {
  current: null,
  pages:   {},
  _navigating: false,

  init() {
    // Don't react to hashchange during init — onAuthStateChanged handles first nav
    window.addEventListener('hashchange', () => {
      if (this._navigating) return;
      const p = window.location.hash.slice(1);
      if (p && p !== this.current) this.go(p, false);
    });
  },

  register(name, fn) {
    this.pages[name] = fn;
  },

  go(page, updateHash = true) {
    // Prevent re-entrant calls
    if (this._navigating) return;
    this._navigating = true;

    try {
      const root = document.getElementById('root');
      if (!root) return;

      // Auth guard
      if (page !== 'login' && page !== 'onboarding' && !App.currentUser) {
        page = 'login';
      }

      // Unknown page → dashboard (only if it exists, else login)
      if (!this.pages[page]) {
        page = this.pages['dashboard'] ? 'dashboard' : 'login';
      }

      // Already on this page — nothing to do
      if (page === this.current) return;

      if (updateHash) window.location.hash = page;

      App.cleanListeners();
      this.current = page;
      root.innerHTML = '';
      this.pages[page](root);

      document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.toggle('active', el.dataset.page === page);
      });
    } finally {
      // Always release the lock, even if render throws
      this._navigating = false;
    }
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
  if (score == null || !max) return 0;
  return Math.round((score / max) * 100);
}

function scoreColor(p) {
  if (p >= 75) return 'var(--sage-deep)';
  if (p >= 50) return 'var(--gold-deep)';
  return 'var(--rose-deep)';
}

function avatarEmoji(av) {
  const avatars = ['🌸', '🌿', '⭐', '🍀', '🌙', '🌺', '🦋', '📚', '✨', '🎯'];
  return avatars[av] ?? '📚';
}