// ═══════════════════════════════════════════════════════════════
//  DASHBOARD PAGE
// ═══════════════════════════════════════════════════════════════
Router.register('dashboard', (root) => {
  renderShell(root, async (content) => {
    content.innerHTML = `
      <div class="page-header">
        <h1>Good ${getGreeting()}, ${App.profile?.name || 'there'} ${avatarEmoji(App.profile?.avatar)} </h1>
        <p>Here's how you're both doing today 💕</p>
      </div>

      <div id="dashContent">
        <div class="loading-state">
          <div class="loading-heart">💕</div>
          <p>Loading your study dashboard…</p>
        </div>
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
  const uid = App.currentUser.uid;
  const otherUID = App.otherUID;
  const mySubjects = App.getSubjects();
  const sharedSubjects = App.getSharedSubjects();

  // Load streaks, class papers, past papers counts
  const [myStreakSnap, myClassSnap, otherClassSnap, myStreakData] = await Promise.all([
    App.db.ref(`users/${uid}/streaks`).once('value'),
    App.db.ref(`classPapers/${uid}`).once('value'),
    otherUID ? App.db.ref(`classPapers/${otherUID}`).once('value') : Promise.resolve({ val: () => null }),
    App.db.ref(`users/${uid}/streaks`).once('value'),
  ]);

  const streaks = myStreakData.val() || { current: 0, longest: 0 };
  const myClasses = myClassSnap.val() || {};
  const otherClasses = otherClassSnap?.val() || {};

  // This week's count
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const myThisWeek = Object.values(myClasses).filter(p => p.date >= weekAgo).length;
  const otherThisWeek = Object.values(otherClasses).filter(p => p.date >= weekAgo).length;

  // Load syllabus progress per subject
  const syllabusData = {};
  for (const sub of mySubjects) {
    const snap = await App.db.ref(`syllabus/${uid}/${sub.id}`).once('value');
    const chapters = snap.val() || {};
    const all = Object.values(chapters);
    syllabusData[sub.id] = all.length
      ? Math.round((all.filter(c => c.status === 'completed' || c.status === 'revised').length / all.length) * 100)
      : 0;
  }

  // Load shared subject rivalry
  const rivalryData = {};
  if (otherUID) {
    for (const sub of sharedSubjects) {
      const [mySnap, otherSnap] = await Promise.all([
        App.db.ref(`classPapers/${uid}`).orderByChild('subject').equalTo(sub.id).once('value'),
        App.db.ref(`classPapers/${otherUID}`).orderByChild('subject').equalTo(sub.id).once('value'),
      ]);
      const myPapers = Object.values(mySnap.val() || {}).filter(p => p.score && p.maxScore);
      const otherPapers = Object.values(otherSnap.val() || {}).filter(p => p.score && p.maxScore);
      rivalryData[sub.id] = { myCount: myPapers.length, otherCount: otherPapers.length };
    }
  }

  const myName = App.profile?.name || 'You';
  const otherName = App.otherProfile?.name || 'Partner';
  const otherAv = avatarEmoji(App.otherProfile?.avatar);

  el.innerHTML = `
    <!-- Streak + Week summary row -->
    <div class="grid-3 mb-3">
      <div class="card">
        <div class="card-header">
          <div class="card-title">Study Streak 🔥</div>
        </div>
        <div class="streak-display">
          <span class="streak-fire">🔥</span>
          <span class="streak-count">${streaks.current}</span>
          <span style="color:var(--muted);font-size:0.85rem">days in a row</span>
        </div>
        <p class="text-sm text-muted mt-2">Longest: ${streaks.longest} days ✨</p>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="card-title">This Week</div>
        </div>
        <div class="flex gap-2 mt-1">
          <div>
            <div class="score-big" style="color:var(--rose-deep)">${myThisWeek}</div>
            <div class="score-label">${myName}</div>
          </div>
          <div style="font-size:1.5rem;align-self:center;color:var(--muted)">vs</div>
          <div>
            <div class="score-big" style="color:var(--lavender-deep)">${otherThisWeek}</div>
            <div class="score-label">${otherAv} ${otherName}</div>
          </div>
        </div>
        <p class="text-sm text-muted mt-2">class papers this week</p>
      </div>

      <div class="card" style="background:linear-gradient(135deg,rgba(232,180,184,0.15),rgba(201,184,216,0.1))">
        <div class="card-header">
          <div class="card-title">Who's leading? 🏆</div>
        </div>
        ${myThisWeek > otherThisWeek
          ? `<p style="font-size:2rem">🎉</p><p class="text-sm"><strong>${myName}</strong> is ahead this week! Keep it up!</p>`
          : myThisWeek < otherThisWeek
          ? `<p style="font-size:2rem">💪</p><p class="text-sm"><strong>${otherName}</strong> is ahead — time to catch up!</p>`
          : `<p style="font-size:2rem">🤝</p><p class="text-sm">You're tied! Perfect study partners 💕</p>`
        }
      </div>
    </div>

    <!-- Syllabus progress -->
    <div class="card mb-3">
      <div class="card-header flex-between">
        <div>
          <div class="card-title">Your Syllabus Progress</div>
          <div class="card-subtitle">How much you've covered so far</div>
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

    <!-- Shared subjects rivalry -->
    ${sharedSubjects.length ? `
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">Head-to-Head 💕</div>
        <div class="card-subtitle">Class papers rivalry in shared subjects</div>
      </div>
      <div class="flex-col gap-3">
        ${sharedSubjects.map(sub => {
          const r = rivalryData[sub.id] || { myCount: 0, otherCount: 0 };
          const total = r.myCount + r.otherCount;
          const myPct = total ? (r.myCount / total) * 100 : 50;
          return `
            <div>
              <div class="flex-between mb-1">
                <span style="font-size:0.85rem;font-weight:600">${sub.emoji} ${sub.name}</span>
                <span class="text-sm text-muted">${r.myCount} vs ${r.otherCount} papers</span>
              </div>
              <div class="rivalry-bar">
                <div class="rivalry-him" style="flex:${myPct}"></div>
                <div class="rivalry-her" style="flex:${100 - myPct}"></div>
              </div>
              <div class="flex-between mt-1">
                <span class="text-sm" style="color:var(--lavender-deep)">${myName}</span>
                <span class="text-sm" style="color:var(--rose-deep)">${otherName}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
    ` : ''}

    <!-- Quick actions -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">Quick Actions</div>
      </div>
      <div class="flex gap-2" style="flex-wrap:wrap">
        <button class="btn btn-rose" onclick="Router.go('class-papers')">➕ Log Class Paper</button>
        <button class="btn btn-sage" onclick="Router.go('past-papers')">📋 Past Papers Grid</button>
        <button class="btn btn-ghost" onclick="Router.go('syllabus')">📚 Update Syllabus</button>
        <button class="btn btn-ghost" onclick="Router.go('couple')">💕 Couple's Corner</button>
      </div>
    </div>
  `;

  // Update streak on dashboard visit
  App.trackStreak();
}
