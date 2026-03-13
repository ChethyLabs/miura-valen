// ═══════════════════════════════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════════════════════════════
Router.register('dashboard', (root) => {
  renderShell(root, async (content) => {
    content.innerHTML = `
      <div class="page-header">
        <h1>Good ${getGreeting()}, ${App.profile?.name || 'there'} ${avatarEmoji(App.profile?.avatar)}</h1>
        <p>Here's how you're both doing today 💕</p>
      </div>
      <div id="dashContent">
        <div class="loading-state"><div class="loading-heart">💕</div><p>Loading…</p></div>
      </div>
    `;
    await loadDashboard(content.querySelector('#dashContent'));
  });
});

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

async function loadDashboard(el) {
  const uid        = App.currentUser.uid;
  const otherUID   = App.otherUID;
  const mySubjects = App.getSubjects();
  const sharedSubs = App.getSharedSubjects();
  const myName     = App.profile?.name || 'You';
  const otherName  = App.otherProfile?.name || 'Partner';
  const myAv       = avatarEmoji(App.profile?.avatar);
  const otherAv    = avatarEmoji(App.otherProfile?.avatar);

  // Fetch everything in parallel
  const [myStreakSnap, myClassSnap, otherClassSnap, notesSnap] = await Promise.all([
    App.db.ref(`users/${uid}/streaks`).once('value'),
    App.db.ref(`classPapers/${uid}`).once('value'),
    otherUID ? App.db.ref(`classPapers/${otherUID}`).once('value') : Promise.resolve({ val: () => null }),
    App.db.ref('sharedNotes').once('value'),
  ]);

  const streaks     = myStreakSnap.val() || { current: 0, longest: 0 };
  const myClasses   = myClassSnap.val() || {};
  const otherClasses = otherClassSnap?.val?.() || {};
  const notes       = notesSnap.val() || {};

  // Figure out which note key is mine vs partner's
  const allUIDs    = await App.db.ref('partnerIndex').once('value').then(s => Object.keys(s.val() || {}));
  const myNoteKey  = allUIDs[0] === uid ? 'note1' : 'note2';
  const herNoteKey = myNoteKey === 'note1' ? 'note2' : 'note1';

  const myNote    = notes[myNoteKey] || '';
  const herNote   = notes[herNoteKey] || '';
  const goals     = notes.goals || '';

  // This week's paper count
  const weekAgo      = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const myThisWeek   = Object.values(myClasses).filter(p => p.date >= weekAgo).length;
  const otherThisWeek = Object.values(otherClasses).filter(p => p.date >= weekAgo).length;

  // Syllabus progress
  const syllabusData = {};
  for (const sub of mySubjects) {
    const snap     = await App.db.ref(`syllabus/${uid}/${sub.id}`).once('value');
    const chapters = Object.values(snap.val() || {});
    syllabusData[sub.id] = chapters.length
      ? Math.round(chapters.filter(c => c.status === 'completed' || c.status === 'revised').length / chapters.length * 100)
      : 0;
  }

  el.innerHTML = `
    <!-- ── Partner note banner (their note to you) ── -->
    ${herNote ? `
      <div class="card mb-3" style="background:linear-gradient(135deg,rgba(232,180,184,0.18),rgba(201,184,216,0.12));border-color:rgba(232,180,184,0.4)">
        <div class="flex gap-2" style="align-items:flex-start">
          <span style="font-size:1.5rem;flex-shrink:0">${otherAv}</span>
          <div style="flex:1">
            <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);margin-bottom:0.3rem">
              Note from ${otherName} 💌
            </div>
            <div style="font-size:0.93rem;color:var(--charcoal);line-height:1.6;white-space:pre-wrap">${herNote}</div>
          </div>
        </div>
      </div>
    ` : ''}

    <!-- ── Shared goals banner ── -->
    ${goals ? `
      <div class="card mb-3" style="background:linear-gradient(135deg,rgba(168,197,160,0.15),rgba(212,168,83,0.08));border-color:rgba(168,197,160,0.4)">
        <div class="flex gap-2" style="align-items:flex-start">
          <span style="font-size:1.5rem;flex-shrink:0">🎯</span>
          <div style="flex:1">
            <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);margin-bottom:0.3rem">
              Shared Goals
            </div>
            <div style="font-size:0.9rem;color:var(--charcoal);line-height:1.6;white-space:pre-wrap">${goals}</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="Router.go('couple')" style="flex-shrink:0;font-size:0.75rem">Edit →</button>
        </div>
      </div>
    ` : `
      <div class="card mb-3" style="border-style:dashed;opacity:0.7">
        <div class="flex gap-2" style="align-items:center">
          <span style="font-size:1.3rem">🎯</span>
          <div style="flex:1">
            <div style="font-size:0.85rem;color:var(--muted)">No shared goals yet</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="Router.go('couple')" style="font-size:0.75rem">Set goals →</button>
        </div>
      </div>
    `}

    <!-- ── Your note to partner (editable inline) ── -->
    <div class="card mb-3">
      <div class="card-header flex-between">
        <div>
          <div class="card-title">💌 Your note to ${otherName}</div>
          <div class="card-subtitle">They'll see this on their dashboard</div>
        </div>
        <button class="btn btn-rose btn-sm" id="saveNoteBtn">Save</button>
      </div>
      <textarea class="sticky-note" id="myNoteInput" placeholder="Write something encouraging… 💌"
                style="min-height:80px;resize:vertical">${myNote}</textarea>
    </div>

    <!-- ── Stats row ── -->
    <div class="grid-3 mb-3">
      <div class="card">
        <div class="card-header"><div class="card-title">🔥 Streak</div></div>
        <div class="streak-display">
          <span class="streak-fire">🔥</span>
          <span class="streak-count">${streaks.current}</span>
          <span style="color:var(--muted);font-size:0.85rem">days</span>
        </div>
        <p class="text-sm text-muted mt-2">Longest: ${streaks.longest} days ✨</p>
      </div>

      <div class="card">
        <div class="card-header"><div class="card-title">This Week</div></div>
        <div class="flex gap-2 mt-1">
          <div>
            <div class="score-big" style="color:var(--lavender-deep)">${myThisWeek}</div>
            <div class="score-label">${myAv} ${myName}</div>
          </div>
          <div style="font-size:1.5rem;align-self:center;color:var(--muted)">vs</div>
          <div>
            <div class="score-big" style="color:var(--rose-deep)">${otherThisWeek}</div>
            <div class="score-label">${otherAv} ${otherName}</div>
          </div>
        </div>
        <p class="text-sm text-muted mt-2">class papers</p>
      </div>

      <div class="card" style="background:linear-gradient(135deg,rgba(232,180,184,0.15),rgba(201,184,216,0.1))">
        <div class="card-header"><div class="card-title">🏆 Leading</div></div>
        ${myThisWeek > otherThisWeek
          ? `<p style="font-size:2rem">🎉</p><p class="text-sm"><strong>${myName}</strong> is ahead!</p>`
          : myThisWeek < otherThisWeek
          ? `<p style="font-size:2rem">💪</p><p class="text-sm"><strong>${otherName}</strong> leads — catch up!</p>`
          : `<p style="font-size:2rem">🤝</p><p class="text-sm">You're tied! 💕</p>`
        }
      </div>
    </div>

    <!-- ── Syllabus progress ── -->
    <div class="card mb-3">
      <div class="card-header flex-between">
        <div>
          <div class="card-title">Your Syllabus Progress</div>
          <div class="card-subtitle">Chapters covered so far</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="Router.go('syllabus')">View all →</button>
      </div>
      <div class="flex-col gap-2">
        ${mySubjects.map(sub => `
          <div>
            <div class="flex-between mb-1">
              <span style="font-size:0.85rem;font-weight:600">${sub.emoji} ${sub.name}</span>
              <span class="badge badge-${sub.color}">${syllabusData[sub.id] || 0}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill progress-${sub.color}" style="width:${syllabusData[sub.id] || 0}%"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>

    <!-- ── Quick actions ── -->
    <div class="card">
      <div class="card-header"><div class="card-title">Quick Actions</div></div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-rose"  onclick="Router.go('class-papers')">➕ Log Paper</button>
        <button class="btn btn-sage"  onclick="Router.go('past-papers')">📋 Past Papers</button>
        <button class="btn btn-ghost" onclick="Router.go('syllabus')">📚 Syllabus</button>
        <button class="btn btn-ghost" onclick="Router.go('couple')">💕 Couple's Corner</button>
      </div>
    </div>
  `;

  // Save note button
  el.querySelector('#saveNoteBtn').onclick = async () => {
    const val = el.querySelector('#myNoteInput').value;
    await App.db.ref(`sharedNotes/${myNoteKey}`).set(val);
    showToast('Note saved! 💌', 'success');
  };

  // Real-time: update partner's note live if they change it
  const herNoteRef = App.db.ref(`sharedNotes/${herNoteKey}`);
  herNoteRef.on('value', snap => {
    const val = snap.val() || '';
    // Update the banner if it exists, or add it
    const banner = el.querySelector('#herNoteBanner');
    if (banner) {
      banner.style.display = val ? '' : 'none';
      const textEl = banner.querySelector('.her-note-text');
      if (textEl) textEl.textContent = val;
    }
  });
  App.listeners.push(herNoteRef);

  App.trackStreak();
}