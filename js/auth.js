// ═══════════════════════════════════════════════════════════════
//  LOGIN PAGE
// ═══════════════════════════════════════════════════════════════
Router.register('login', (root) => {
  root.innerHTML = `
    <div class="login-page">
      <div class="login-card fade-in">
        <div class="login-logo">
          <span class="login-emoji">📖</span>
          <h1>Miura Valen</h1>
          <p>Your cosy A/L study companion ✨</p>
        </div>
        <div class="flex-col gap-2">
          <div class="input-group">
            <label class="input-label">Email</label>
            <input class="input" type="email" id="loginEmail" placeholder="you@example.com" />
          </div>
          <div class="input-group">
            <label class="input-label">Password</label>
            <input class="input" type="password" id="loginPass" placeholder="••••••••" />
          </div>
          <button class="btn btn-primary w-full mt-2" id="loginBtn" style="justify-content:center;padding:0.8rem">
            Sign In
          </button>
        </div>
        <p class="text-center text-muted mt-3" style="font-size:0.8rem">
          Don't have an account? Ask your study partner to set it up in Firebase Auth 💌
        </p>
      </div>
    </div>
  `;

  const btn     = root.querySelector('#loginBtn');
  const emailIn = root.querySelector('#loginEmail');
  const passIn  = root.querySelector('#loginPass');

  async function doLogin() {
    const email = emailIn.value.trim();
    const pass  = passIn.value;
    if (!email || !pass) { showToast('Please fill in all fields', 'error'); return; }
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in…';
    try {
      await App.login(email, pass);
    } catch (e) {
      showToast(e.message || 'Login failed', 'error');
      btn.disabled = false;
      btn.innerHTML = 'Sign In';
    }
  }

  btn.addEventListener('click', doLogin);
  [emailIn, passIn].forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); }));
});

// ═══════════════════════════════════════════════════════════════
//  ONBOARDING PAGE
// ═══════════════════════════════════════════════════════════════
Router.register('onboarding', (root) => {
  const avatars = ['🌸', '🌿', '⭐', '🍀', '🌙', '🌺', '🦋', '📚', '✨', '🎯'];
  let selectedAvatar = 0;
  let selectedStream = 'him';

  root.innerHTML = `
    <div class="login-page">
      <div class="login-card fade-in" style="max-width:460px">
        <div class="login-logo">
          <span class="login-emoji">🌸</span>
          <h1>Welcome!</h1>
          <p>Let's set up your profile</p>
        </div>
        <div class="flex-col gap-2">
          <div class="input-group">
            <label class="input-label">Your Name</label>
            <input class="input" type="text" id="obName" placeholder="e.g. Kavya" />
          </div>
          <div class="input-group">
            <label class="input-label">Your Stream</label>
            <div class="flex gap-1" id="streamPicker">
              <button class="btn btn-primary stream-btn" data-stream="him" style="flex:1;justify-content:center">
                📐 Physical Sciences
              </button>
              <button class="btn btn-ghost stream-btn" data-stream="her" style="flex:1;justify-content:center">
                🌿 Biological Sciences
              </button>
            </div>
          </div>
          <div class="input-group">
            <label class="input-label">Pick an Avatar</label>
            <div class="flex gap-1" style="flex-wrap:wrap" id="avatarPicker">
              ${avatars.map((a, i) => `
                <button class="btn ${i === 0 ? 'btn-rose' : 'btn-ghost'} btn-icon avatar-opt"
                  data-idx="${i}" style="font-size:1.3rem;width:44px;height:44px">${a}</button>
              `).join('')}
            </div>
          </div>
          <button class="btn btn-primary w-full mt-2" id="obSaveBtn" style="justify-content:center;padding:0.8rem">
            Let's go! 🎉
          </button>
        </div>
      </div>
    </div>
  `;

  root.querySelectorAll('.stream-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedStream = btn.dataset.stream;
      root.querySelectorAll('.stream-btn').forEach(b => {
        b.className = `btn ${b.dataset.stream === selectedStream ? 'btn-primary' : 'btn-ghost'} stream-btn`;
      });
    });
  });

  root.querySelectorAll('.avatar-opt').forEach(btn => {
    btn.addEventListener('click', () => {
      selectedAvatar = parseInt(btn.dataset.idx);
      root.querySelectorAll('.avatar-opt').forEach(b => {
        b.className = `btn ${parseInt(b.dataset.idx) === selectedAvatar ? 'btn-rose' : 'btn-ghost'} btn-icon avatar-opt`;
      });
    });
  });

  root.querySelector('#obSaveBtn').addEventListener('click', async () => {
    const name = root.querySelector('#obName').value.trim();
    if (!name) { showToast('Please enter your name', 'error'); return; }
    const uid = App.currentUser.uid;
    await App.db.ref(`users/${uid}/profile`).set({
      name, avatar: selectedAvatar, stream: selectedStream,
      createdAt: new Date().toISOString()
    });
    App.profile = { name, avatar: selectedAvatar, stream: selectedStream };
    await App.loadPartner();
    showToast(`Welcome, ${name}! 🌸`, 'success');
    Router.go('dashboard');
  });
});