// ═══════════════════════════════════════════════════════════════
//  CLASSIFIED QUESTIONS
// ═══════════════════════════════════════════════════════════════
Router.register('classified', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let activeSub = mySubjects[0].id;

    content.innerHTML = `
      <div class="page-header flex-between" style="flex-wrap:wrap;gap:1rem">
        <div>
          <h1>Classified Q&A 📝</h1>
          <p>Topic-wise question banks from past papers</p>
        </div>
        <button class="btn btn-rose" id="addTopicBtn">➕ Add Topic</button>
      </div>

      <div class="tabs" id="subTabs">
        ${mySubjects.map(s => `
          <button class="tab ${s.id === activeSub ? 'active' : ''}" data-sub="${s.id}">
            ${s.emoji} ${s.name}
          </button>
        `).join('')}
      </div>

      <div id="classifiedContent">
        <div class="loading-state"><div class="loading-heart">📝</div><p>Loading…</p></div>
      </div>
    `;

    const TOPIC_STATUSES = [
      { id: 'not_started', label: '❌ Not Started', badge: 'badge-muted' },
      { id: 'in_progress', label: '🔄 In Progress', badge: 'badge-gold' },
      { id: 'done', label: '✅ Done', badge: 'badge-sage' },
    ];

    async function renderTopics() {
      const uid = App.currentUser.uid;
      const snap = await App.db.ref(`classifiedQuestions/${uid}/${activeSub}`).once('value');
      const topics = snap.val() || {};
      const list = Object.entries(topics).map(([id, v]) => ({ id, ...v }));
      const el = content.querySelector('#classifiedContent');

      if (!list.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">📝</div><p>No topics yet. Add your first topic!</p></div>`;
        return;
      }

      el.innerHTML = `
        <div class="flex-col gap-2">
          ${list.map(t => {
            const st = TOPIC_STATUSES.find(s => s.id === (t.status || 'not_started')) || TOPIC_STATUSES[0];
            return `
              <div class="card card-sm flex-between" style="gap:1rem">
                <div style="flex:1">
                  <div style="font-weight:600;font-size:0.9rem">${t.name}</div>
                  ${t.linkedChapter ? `<div class="text-sm text-muted">📚 ${t.linkedChapter}</div>` : ''}
                </div>
                <span class="badge ${st.badge} topic-cycle" data-id="${t.id}" data-status="${t.status || 'not_started'}" style="cursor:pointer">${st.label}</span>
                <button class="btn btn-ghost btn-icon topic-del" data-id="${t.id}" style="font-size:0.8rem;padding:0.3rem 0.5rem;color:var(--muted)">✕</button>
              </div>
            `;
          }).join('')}
        </div>
      `;

      el.querySelectorAll('.topic-cycle').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = App.currentUser.uid;
          const idx = TOPIC_STATUSES.findIndex(s => s.id === btn.dataset.status);
          const next = TOPIC_STATUSES[(idx + 1) % TOPIC_STATUSES.length].id;
          await App.db.ref(`classifiedQuestions/${uid}/${activeSub}/${btn.dataset.id}/status`).set(next);
          renderTopics();
        });
      });

      el.querySelectorAll('.topic-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this topic?')) return;
          const uid = App.currentUser.uid;
          await App.db.ref(`classifiedQuestions/${uid}/${activeSub}/${btn.dataset.id}`).remove();
          renderTopics();
        });
      });
    }

    content.querySelector('#addTopicBtn').onclick = () => {
      const overlay = openModal(`
        <div class="modal-header"><div class="modal-title">Add Topic</div><button class="modal-close" id="mClose">✕</button></div>
        <div class="modal-body">
          <div class="input-group">
            <label class="input-label">Topic Name</label>
            <input class="input" type="text" id="t_name" placeholder="e.g. Electrochemistry" />
          </div>
          <div class="input-group">
            <label class="input-label">Linked Chapter (optional)</label>
            <input class="input" type="text" id="t_chapter" placeholder="e.g. Chapter 5" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="mCancel">Cancel</button>
          <button class="btn btn-rose" id="mSave">Add Topic</button>
        </div>
      `);
      overlay.querySelector('#mClose').onclick = () => closeModal(overlay);
      overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);
      overlay.querySelector('#mSave').onclick = async () => {
        const name = overlay.querySelector('#t_name').value.trim();
        if (!name) return;
        const uid = App.currentUser.uid;
        const id = 'tq_' + Date.now();
        await App.db.ref(`classifiedQuestions/${uid}/${activeSub}/${id}`).set({
          name, linkedChapter: overlay.querySelector('#t_chapter').value.trim(), status: 'not_started'
        });
        closeModal(overlay);
        renderTopics();
      };
    };

    content.querySelectorAll('#subTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeSub = tab.dataset.sub;
        content.querySelectorAll('#subTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.sub === activeSub));
        renderTopics();
      });
    });

    renderTopics();
  });
});

// ═══════════════════════════════════════════════════════════════
//  TUTORIALS PAGE
// ═══════════════════════════════════════════════════════════════
Router.register('tutes', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let activeSub = mySubjects[0].id;

    content.innerHTML = `
      <div class="page-header flex-between" style="flex-wrap:wrap;gap:1rem">
        <div><h1>Tutorials 📄</h1><p>Track your tutorial sheets</p></div>
        <button class="btn btn-rose" id="addTuteBtn">➕ Add Tute</button>
      </div>
      <div class="tabs" id="subTabs">
        ${mySubjects.map(s => `<button class="tab ${s.id === activeSub ? 'active' : ''}" data-sub="${s.id}">${s.emoji} ${s.name}</button>`).join('')}
      </div>
      <div id="tuteContent"><div class="loading-state"><div class="loading-heart">📄</div><p>Loading…</p></div></div>
    `;

    async function renderTutes() {
      const uid = App.currentUser.uid;
      const snap = await App.db.ref(`tutes/${uid}/${activeSub}`).once('value');
      const tutes = snap.val() || {};
      const list = Object.entries(tutes).map(([id, v]) => ({ id, ...v })).sort((a,b) => (a.name > b.name ? 1 : -1));
      const el = content.querySelector('#tuteContent');

      if (!list.length) {
        el.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div><p>No tutorials yet!</p></div>`;
        return;
      }

      el.innerHTML = `<div class="flex-col gap-2">
        ${list.map(t => `
          <div class="card card-sm flex-between" style="gap:1rem">
            <div style="flex:1">
              <div style="font-weight:600;font-size:0.9rem">${t.name}</div>
              <div class="text-sm text-muted">${t.dateGiven ? formatDate(t.dateGiven) : ''} ${t.score ? `· ${t.score}` : ''}</div>
            </div>
            <span class="badge ${t.status === 'done' ? 'badge-sage' : 'badge-muted'} tute-toggle" data-id="${t.id}" data-status="${t.status}" style="cursor:pointer">
              ${t.status === 'done' ? '✅ Done' : '📋 Not Done'}
            </span>
            <button class="btn btn-ghost btn-icon tute-del" data-id="${t.id}" style="font-size:0.8rem;padding:0.3rem 0.5rem;color:var(--muted)">✕</button>
          </div>
        `).join('')}
      </div>`;

      el.querySelectorAll('.tute-toggle').forEach(btn => {
        btn.addEventListener('click', async () => {
          const uid = App.currentUser.uid;
          const next = btn.dataset.status === 'done' ? 'not_done' : 'done';
          await App.db.ref(`tutes/${uid}/${activeSub}/${btn.dataset.id}/status`).set(next);
          renderTutes();
        });
      });
      el.querySelectorAll('.tute-del').forEach(btn => {
        btn.addEventListener('click', async () => {
          if (!confirm('Delete this tute?')) return;
          await App.db.ref(`tutes/${App.currentUser.uid}/${activeSub}/${btn.dataset.id}`).remove();
          renderTutes();
        });
      });
    }

    content.querySelector('#addTuteBtn').onclick = () => {
      const overlay = openModal(`
        <div class="modal-header"><div class="modal-title">Add Tutorial</div><button class="modal-close" id="mClose">✕</button></div>
        <div class="modal-body">
          <div class="input-group"><label class="input-label">Tute Name / Number</label><input class="input" type="text" id="tute_name" placeholder="e.g. Tute 3 — Organic" /></div>
          <div class="input-group"><label class="input-label">Date Given</label><input class="input" type="date" id="tute_date" /></div>
          <div class="input-group"><label class="input-label">Score (optional)</label><input class="input" type="text" id="tute_score" placeholder="e.g. 45/60" /></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-ghost" id="mCancel">Cancel</button>
          <button class="btn btn-rose" id="mSave">Add</button>
        </div>
      `);
      overlay.querySelector('#mClose').onclick = () => closeModal(overlay);
      overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);
      overlay.querySelector('#mSave').onclick = async () => {
        const name = overlay.querySelector('#tute_name').value.trim();
        if (!name) return;
        const id = 'tute_' + Date.now();
        await App.db.ref(`tutes/${App.currentUser.uid}/${activeSub}/${id}`).set({
          name, dateGiven: overlay.querySelector('#tute_date').value, score: overlay.querySelector('#tute_score').value, status: 'not_done'
        });
        closeModal(overlay);
        renderTutes();
      };
    };

    content.querySelectorAll('#subTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeSub = tab.dataset.sub;
        content.querySelectorAll('#subTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.sub === activeSub));
        renderTutes();
      });
    });

    renderTutes();
  });
});

// ═══════════════════════════════════════════════════════════════
//  COUPLE'S CORNER
// ═══════════════════════════════════════════════════════════════
Router.register('couple', (root) => {
  renderShell(root, async (content) => {
    const myName = App.profile?.name || 'You';
    const otherName = App.otherProfile?.name || 'Partner';
    const otherAv = avatarEmoji(App.otherProfile?.avatar);

    content.innerHTML = `
      <div class="page-header">
        <h1>Couple's Corner 💕</h1>
        <p>Your shared space to cheer each other on</p>
      </div>
      <div id="coupleContent"><div class="loading-state"><div class="loading-heart">💕</div></div></div>
    `;

    const el = content.querySelector('#coupleContent');
    const [notesSnap, myStreakSnap, otherStreakSnap] = await Promise.all([
      App.db.ref('sharedNotes').once('value'),
      App.db.ref(`users/${App.currentUser.uid}/streaks`).once('value'),
      App.otherUID ? App.db.ref(`users/${App.otherUID}/streaks`).once('value') : Promise.resolve({ val: () => null }),
    ]);

    const notes = notesSnap.val() || { note1: '', note2: '' };
    const myStreak = myStreakSnap.val()?.current || 0;
    const otherStreak = otherStreakSnap?.val()?.current || 0;

    el.innerHTML = `
      <!-- Streak display -->
      <div class="grid-2 mb-3">
        <div class="card" style="text-align:center">
          <div style="font-size:2rem">${avatarEmoji(App.profile?.avatar)}</div>
          <div class="card-title mt-2">${myName}</div>
          <div class="streak-display" style="justify-content:center;margin-top:0.5rem">
            <span class="streak-fire">🔥</span>
            <span class="streak-count">${myStreak}</span>
          </div>
          <div class="text-sm text-muted">day streak</div>
        </div>
        <div class="card" style="text-align:center">
          <div style="font-size:2rem">${otherAv}</div>
          <div class="card-title mt-2">${otherName}</div>
          <div class="streak-display" style="justify-content:center;margin-top:0.5rem">
            <span class="streak-fire">🔥</span>
            <span class="streak-count">${otherStreak}</span>
          </div>
          <div class="text-sm text-muted">day streak</div>
        </div>
      </div>

      <!-- Combined streak message -->
      <div class="card mb-3" style="background:linear-gradient(135deg,rgba(232,180,184,0.15),rgba(201,184,216,0.1));text-align:center">
        <div style="font-size:2.5rem mb-2">💕</div>
        <div class="font-display" style="font-size:1.3rem;margin:0.5rem 0">
          ${myStreak > 0 && otherStreak > 0
            ? `You've both been studying! ${Math.min(myStreak, otherStreak)} days together 🔥`
            : 'Start your streak together today! 💪'}
        </div>
        <p class="text-muted text-sm">Every paper you do brings you closer to your goals 🌸</p>
      </div>

      <!-- Sticky notes -->
      <div class="grid-2 mb-3">
        <div class="card">
          <div class="card-header">
            <div class="card-title">${avatarEmoji(App.profile?.avatar)} ${myName}'s Note</div>
            <div class="card-subtitle">Leave a note for your study partner</div>
          </div>
          <textarea class="sticky-note" id="note1" placeholder="Write something encouraging… 💌">${notes.note1 || ''}</textarea>
          <button class="btn btn-rose btn-sm mt-2" id="saveNote1">Save Note</button>
        </div>
        <div class="card" style="background:rgba(168,197,160,0.08)">
          <div class="card-header">
            <div class="card-title">${otherAv} ${otherName}'s Note</div>
            <div class="card-subtitle">What they left for you ✨</div>
          </div>
          <div class="sticky-note" style="background:rgba(168,197,160,0.1);border-color:rgba(168,197,160,0.4);cursor:default;overflow-y:auto">
            ${notes.note2 || '<span style="color:var(--muted);font-style:italic">Nothing yet…</span>'}
          </div>
        </div>
      </div>

      <!-- Couple goals -->
      <div class="card">
        <div class="card-header">
          <div class="card-title">📌 Shared Goals</div>
          <div class="card-subtitle">Things you're working towards together</div>
        </div>
        <textarea class="sticky-note" id="sharedGoals" placeholder="e.g. Finish Round 1 by March, Score 75%+ on Chem Paper 1…">${notes.goals || ''}</textarea>
        <button class="btn btn-ghost btn-sm mt-2" id="saveGoals">Save Goals</button>
      </div>
    `;

    // Note saving - which note is "yours" depends on which user you are
    // Note1 = first registered user, Note2 = second. We use uid ordering.
    const allUIDs = [App.currentUser.uid, App.otherUID].filter(Boolean).sort();
    const myNoteKey = allUIDs[0] === App.currentUser.uid ? 'note1' : 'note2';
    const noteTa = el.querySelector('#note1');
    
    el.querySelector('#saveNote1').onclick = async () => {
      await App.db.ref(`sharedNotes/${myNoteKey}`).set(noteTa.value);
      showToast('Note saved! 💌', 'success');
    };

    el.querySelector('#saveGoals').onclick = async () => {
      await App.db.ref('sharedNotes/goals').set(el.querySelector('#sharedGoals').value);
      showToast('Goals saved! 🎯', 'success');
    };

    // Real-time listener for partner's note
    if (App.otherUID) {
      const otherKey = myNoteKey === 'note1' ? 'note2' : 'note1';
      const noteRef = App.db.ref(`sharedNotes/${otherKey}`);
      const otherNoteEl = el.querySelector('.card:nth-child(2) .sticky-note');
      noteRef.on('value', snap => {
        if (otherNoteEl) {
          otherNoteEl.innerHTML = snap.val() || '<span style="color:var(--muted);font-style:italic">Nothing yet…</span>';
        }
      });
      App.listeners.push(noteRef);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
//  SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════
Router.register('settings', (root) => {
  renderShell(root, async (content) => {
    const profile = App.profile || {};
    const avatars = ['🌸', '🌿', '⭐', '🍀', '🌙', '🌺', '🦋', '📚', '✨', '🎯'];
    let selAvatar = profile.avatar || 0;
    const geminiKey = localStorage.getItem('gemini_api_key') || '';

    content.innerHTML = `
      <div class="page-header"><h1>Settings ⚙️</h1><p>Manage your profile and app preferences</p></div>
      <div class="flex-col gap-3">

        <div class="card">
          <div class="card-header"><div class="card-title">Your Profile</div></div>
          <div class="flex-col gap-2">
            <div class="input-group">
              <label class="input-label">Display Name</label>
              <input class="input" type="text" id="s_name" value="${profile.name || ''}" />
            </div>
            <div class="input-group">
              <label class="input-label">Avatar</label>
              <div class="flex gap-1" style="flex-wrap:wrap" id="avatarPicker">
                ${avatars.map((a, i) => `
                  <button class="btn ${i === selAvatar ? 'btn-rose' : 'btn-ghost'} btn-icon avatar-opt" data-idx="${i}" style="font-size:1.3rem;width:44px;height:44px">
                    ${a}
                  </button>
                `).join('')}
              </div>
            </div>
            <button class="btn btn-primary" id="saveProfile" style="width:fit-content">Save Profile</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">✨ Gemini AI Setup</div>
            <div class="card-subtitle">Used for analyzing your class paper photos</div>
          </div>
          <div class="flex-col gap-2">
            <div class="input-group">
              <label class="input-label">Gemini API Key (free — <a href="https://aistudio.google.com/app/apikey" target="_blank" style="color:var(--lavender-deep)">Get one here</a>)</label>
              <input class="input" type="password" id="s_gemini_key" value="${geminiKey}" placeholder="AIza…" />
              <small>Stored locally in your browser only. Use Gemini 2.5 Flash — it's free forever!</small>
            </div>
            <button class="btn btn-sage" id="saveGemini" style="width:fit-content">Save API Key</button>
          </div>
        </div>

        <div class="card">
          <div class="card-header">
            <div class="card-title">🔥 Firebase Setup</div>
            <div class="card-subtitle">Your database connection</div>
          </div>
          <p class="text-sm" style="color:var(--charcoal-light)">
            Firebase is configured in <code>js/app.js</code>. Edit the <code>FIREBASE_CONFIG</code> object at the top of that file with your Firebase project credentials.
          </p>
          <div class="mt-2">
            <a href="https://console.firebase.google.com" target="_blank" class="btn btn-ghost btn-sm">Open Firebase Console ↗</a>
          </div>
        </div>

        <div class="card" style="border-color:rgba(192,102,90,0.2)">
          <div class="card-header"><div class="card-title">Account</div></div>
          <button class="btn btn-ghost" id="logoutBtn" style="color:#C0665A;border-color:rgba(192,102,90,0.3)">
            Sign Out
          </button>
        </div>

      </div>
    `;

    // Avatar picker
    content.querySelectorAll('.avatar-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        selAvatar = parseInt(btn.dataset.idx);
        content.querySelectorAll('.avatar-opt').forEach(b => {
          b.className = `btn ${parseInt(b.dataset.idx) === selAvatar ? 'btn-rose' : 'btn-ghost'} btn-icon avatar-opt`;
        });
      });
    });

    content.querySelector('#saveProfile').onclick = async () => {
      const name = content.querySelector('#s_name').value.trim();
      if (!name) { showToast('Name cannot be empty', 'error'); return; }
      const uid = App.currentUser.uid;
      await App.db.ref(`users/${uid}/profile`).update({ name, avatar: selAvatar });
      App.profile = { ...App.profile, name, avatar: selAvatar };
      showToast('Profile updated! 🌸', 'success');
    };

    content.querySelector('#saveGemini').onclick = () => {
      const key = content.querySelector('#s_gemini_key').value.trim();
      localStorage.setItem('gemini_api_key', key);
      showToast('Gemini API key saved! ✨', 'success');
    };

    content.querySelector('#logoutBtn').onclick = () => {
      if (confirm('Are you sure you want to sign out?')) App.logout();
    };
  });
});

// ═══════════════════════════════════════════════════════════════
//  STATS PAGE
// ═══════════════════════════════════════════════════════════════
Router.register('stats', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    const uid = App.currentUser.uid;

    content.innerHTML = `
      <div class="page-header"><h1>Stats & Analytics 📊</h1><p>Your study trends over time</p></div>
      <div id="statsContent"><div class="loading-state"><div class="loading-heart">📊</div><p>Crunching numbers…</p></div></div>
    `;

    const el = content.querySelector('#statsContent');

    // Load all class papers
    const classSnap = await App.db.ref(`classPapers/${uid}`).orderByChild('date').once('value');
    const classPapers = [];
    classSnap.forEach(c => classPapers.push({ id: c.key, ...c.val() }));

    // Activity heatmap data (last 52 weeks)
    const activityMap = {};
    classPapers.forEach(p => {
      if (p.date) activityMap[p.date] = (activityMap[p.date] || 0) + 1;
    });

    // Per-subject avg score over time
    const subjectCharts = {};
    for (const sub of mySubjects) {
      const papers = classPapers.filter(p => p.subject === sub.id && p.score && p.maxScore)
        .sort((a, b) => a.date > b.date ? 1 : -1);
      subjectCharts[sub.id] = papers.map(p => ({ date: p.date, pct: pct(p.score, p.maxScore) }));
    }

    // Heatmap
    const today = new Date();
    const cells = [];
    for (let i = 363; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = activityMap[key] || 0;
      const level = count === 0 ? 0 : count === 1 ? 2 : count === 2 ? 3 : 4;
      cells.push({ key, level, count });
    }

    el.innerHTML = `
      <!-- Activity heatmap -->
      <div class="card mb-3">
        <div class="card-header">
          <div class="card-title">Study Activity — Last 52 Weeks</div>
          <div class="card-subtitle">Each square is one day</div>
        </div>
        <div class="heatmap" id="heatmap">
          ${cells.map(c => `
            <div class="heatmap-cell level-${c.level}" title="${c.key}: ${c.count} paper(s)"></div>
          `).join('')}
        </div>
        <div class="flex gap-2 mt-2" style="align-items:center">
          <span class="text-sm text-muted">Less</span>
          ${[0,1,2,3,4].map(l => `<div class="heatmap-cell level-${l}" style="width:14px;height:14px"></div>`).join('')}
          <span class="text-sm text-muted">More</span>
        </div>
      </div>

      <!-- Score trend per subject -->
      <div class="grid-2">
        ${mySubjects.map(sub => `
          <div class="card">
            <div class="card-header">
              <div class="card-title">${sub.emoji} ${sub.name} Trend</div>
            </div>
            ${subjectCharts[sub.id]?.length > 0
              ? `<div class="chart-container"><canvas id="trend_${sub.id}"></canvas></div>`
              : `<div class="empty-state" style="padding:2rem"><p>No class papers logged yet</p></div>`
            }
          </div>
        `).join('')}
      </div>
    `;

    // Render trend charts
    for (const sub of mySubjects) {
      const data = subjectCharts[sub.id];
      if (!data?.length) continue;
      const canvas = el.querySelector(`#trend_${sub.id}`);
      if (!canvas) continue;
      new Chart(canvas, {
        type: 'line',
        data: {
          labels: data.map(d => formatDate(d.date)),
          datasets: [{
            label: '% Score',
            data: data.map(d => d.pct),
            borderColor: sub.color === 'rose' ? 'rgba(212,147,154,0.9)' : sub.color === 'lavender' ? 'rgba(169,151,192,0.9)' : 'rgba(126,168,118,0.9)',
            backgroundColor: sub.color === 'rose' ? 'rgba(232,180,184,0.1)' : sub.color === 'lavender' ? 'rgba(201,184,216,0.1)' : 'rgba(168,197,160,0.1)',
            tension: 0.4, pointRadius: 3, borderWidth: 2, fill: true,
          }]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            y: { min: 0, max: 100, ticks: { color: '#9E8A79', font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
            x: { ticks: { color: '#9E8A79', maxRotation: 45, font: { size: 10 } }, grid: { display: false } }
          }
        }
      });
    }
  });
});
