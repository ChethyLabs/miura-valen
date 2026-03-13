// ═══════════════════════════════════════════════════════════════
//  MISTAKE LOG — per-subject running log of AI-extracted lessons
//  + manual entries, shared metrics, revision checklist
// ═══════════════════════════════════════════════════════════════
Router.register('mistakes', (root) => {
  renderShell(root, async (content) => {
    const uid        = App.currentUser.uid;
    const otherUID   = App.otherUID;
    const mySubjects = App.getSubjects();
    const myName     = App.profile?.name   || 'You';
    const otherName  = App.otherProfile?.name || 'Partner';
    const myAv       = avatarEmoji(App.profile?.avatar);
    const otherAv    = avatarEmoji(App.otherProfile?.avatar);

    let activeTab    = 'mine';
    let activeSub    = mySubjects[0]?.id || 'chem';

    content.innerHTML = `
      <div class="page-header">
        <h1>Mistake Log 🔍</h1>
        <p>Track, learn, and never repeat the same mistake twice</p>
      </div>

      <div class="tabs mb-3" id="mlTabs">
        <button class="tab active" data-tab="mine">📒 My Log</button>
        <button class="tab" data-tab="partner">💕 Partner's Log</button>
        <button class="tab" data-tab="shared">📊 Shared Metrics</button>
      </div>

      <div id="mlContent">
        <div class="loading-state"><div class="loading-heart">🔍</div><p>Loading…</p></div>
      </div>
    `;

    content.querySelectorAll('#mlTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        content.querySelectorAll('#mlTabs .tab').forEach(t =>
          t.classList.toggle('active', t.dataset.tab === activeTab));
        renderTab();
      });
    });

    async function renderTab() {
      const el = content.querySelector('#mlContent');
      el.innerHTML = `<div class="loading-state"><div class="loading-heart">📊</div><p>Loading…</p></div>`;
      if (activeTab === 'mine')    await renderSubjectLog(el, uid, false, mySubjects, activeSub, s => { activeSub = s; });
      if (activeTab === 'partner') await renderSubjectLog(el, otherUID, true,
        otherUID ? (App.otherProfile?.stream === 'her' ? SUBJECTS.her : SUBJECTS.him) : mySubjects, activeSub, s => { activeSub = s; });
      if (activeTab === 'shared')  await renderSharedMetrics(el, uid, otherUID);
    }

    renderTab();
  });
});

// ═══════════════════════════════════════════════════════════════
//  SUBJECT LOG VIEW
// ═══════════════════════════════════════════════════════════════
async function renderSubjectLog(el, uid, isPartner, subjects, activeSub, onSubChange) {
  if (!uid) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💕</div><p>No partner linked yet.</p></div>`;
    return;
  }

  const logId = 'subLogContent_' + (isPartner ? 'partner' : 'mine');

  let html = `
    <div class="flex gap-2 mb-3" style="flex-wrap:wrap">
      ${subjects.map(s => `
        <button class="btn ${s.id === activeSub ? 'btn-primary' : 'btn-ghost'} btn-sm sub-pill" data-sub="${s.id}" style="gap:0.3rem">
          ${s.emoji} ${s.name}
        </button>`).join('')}
    </div>
    <div id="${logId}"></div>
  `;
  el.innerHTML = html;

  el.querySelectorAll('.sub-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      onSubChange(btn.dataset.sub);
      el.querySelectorAll('.sub-pill').forEach(b =>
        b.className = `btn ${b.dataset.sub === btn.dataset.sub ? 'btn-primary' : 'btn-ghost'} btn-sm sub-pill`);
      const target = document.getElementById(logId);
      if (target) loadSubLog(target, uid, btn.dataset.sub, isPartner);
    });
  });

  const target = document.getElementById(logId);
  if (target) await loadSubLog(target, uid, activeSub, isPartner);
}

async function loadSubLog(el, uid, subjectId, isPartner) {
  el.innerHTML = `<div class="loading-state"><div class="loading-heart">📝</div></div>`;

  const snap    = await App.db.ref(`mistakeLog/${uid}/${subjectId}`).once('value');
  const entries = snap.val() ? Object.entries(snap.val()).map(([id, v]) => ({ id, ...v })) : [];
  entries.sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1);

  const sub      = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === subjectId);
  const total    = entries.length;
  const done     = entries.filter(e => e.resolved).length;
  const pctDone  = total ? Math.round(done / total * 100) : 0;
  const containerId = el.id; // use whatever id the caller already set

  let html = `
    <!-- Progress bar -->
    <div class="card mb-3" style="background:linear-gradient(135deg,rgba(212,168,83,0.1),rgba(232,180,184,0.08))">
      <div class="flex-between mb-2">
        <div>
          <div class="card-title">${sub?.emoji} ${sub?.name} Mistake Log</div>
          <div class="card-subtitle">${done} of ${total} addressed</div>
        </div>
        <div style="font-family:var(--font-display);font-size:1.8rem;font-weight:600;color:${pctDone>=75?'var(--sage-deep)':pctDone>=40?'var(--gold-deep)':'var(--rose-deep)'}">${pctDone}%</div>
      </div>
      <div class="progress-bar">
        <div class="progress-fill progress-${sub?.color||'sage'}" style="width:${pctDone}%"></div>
      </div>
    </div>
  `;

  // Manual add (only own log)
  if (!isPartner) {
    html += `
      <div class="card mb-3">
        <div class="card-header flex-between">
          <div class="card-title">➕ Add Mistake Manually</div>
          <button class="btn btn-ghost btn-sm" id="toggleAddForm">Add</button>
        </div>
        <div id="addMistakeForm" style="display:none;margin-top:0.75rem">
          <div class="input-group">
            <label class="input-label">Mistake / lesson learned</label>
            <textarea class="input" id="newMistakeText" rows="4" placeholder="One mistake per line, e.g.:&#10;Forgot to convert kPa to Pa&#10;Wrong sign in equilibrium expression&#10;Missed units in final answer" style="resize:vertical"></textarea>
          </div>

          <div class="input-group">
            <label class="input-label">Source</label>
            <div class="flex gap-1 mb-2" style="flex-wrap:wrap">
              <button class="btn btn-primary btn-sm source-mode-btn" data-mode="class">🏫 Class Paper</button>
              <button class="btn btn-ghost btn-sm source-mode-btn" data-mode="past">📋 Past Paper</button>
              <button class="btn btn-ghost btn-sm source-mode-btn" data-mode="manual">✏️ Type manually</button>
            </div>

            <div id="sourceClass">
              <select class="input" id="srcClassPaper" style="font-size:0.82rem">
                <option value="">— loading… —</option>
              </select>
            </div>
            <div id="sourcePast" style="display:none">
              <div class="flex gap-2">
                <select class="input" id="srcPastYear" style="flex:1;font-size:0.82rem">
                  <option value="">Year</option>
                  ${Array.from({length:26},(_,i)=>2025-i).map(y=>`<option>${y}</option>`).join('')}
                </select>
                <select class="input" id="srcPastRound" style="flex:1;font-size:0.82rem">
                  <option value="">Round</option>
                  <option>Round 1</option><option>Round 2</option><option>Round 3</option><option>Round 4</option>
                </select>
                <select class="input" id="srcPastPaperType" style="flex:1;font-size:0.82rem">
                  <option value="">Paper</option>
                  <option>Paper 1 (MCQ)</option><option>Paper 2 (Structured)</option>
                </select>
              </div>
            </div>
            <div id="sourceManual" style="display:none">
              <input class="input" type="text" id="srcManualText" placeholder="e.g. Chapter 5 test, June revision…" />
            </div>
          </div>

          <div class="input-group">
            <label class="input-label">Extra note (optional)</label>
            <input class="input" type="text" id="newMistakeNote" placeholder="e.g. Q4, units error…" />
          </div>
          <button class="btn btn-rose btn-sm" id="saveMistakeBtn">Save</button>
        </div>
      </div>
    `;
  }

  // Entries list
  if (!entries.length) {
    html += `<div class="empty-state"><div class="empty-icon">✨</div><p>No mistakes logged yet${isPartner ? '' : ' — they\'ll appear here after AI feedback or manual entry'}.</p></div>`;
  } else {
    // Group: unresolved first, then resolved
    const open   = entries.filter(e => !e.resolved);
    const closed = entries.filter(e => e.resolved);

    if (open.length) {
      html += `<div style="font-size:0.75rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);margin-bottom:0.5rem">To Address (${open.length})</div>`;
      html += `<div class="flex-col gap-2 mb-3">${open.map(e => mistakeCard(e, uid, subjectId, isPartner, containerId)).join('')}</div>`;
    }
    if (closed.length) {
      html += `
        <details style="margin-bottom:0.5rem">
          <summary style="font-size:0.75rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted);cursor:pointer;list-style:none;display:flex;align-items:center;gap:0.4rem">
            <span>▶</span> Addressed (${closed.length})
          </summary>
          <div class="flex-col gap-2 mt-2">${closed.map(e => mistakeCard(e, uid, subjectId, isPartner, containerId)).join('')}</div>
        </details>`;
    }
  }

  el.innerHTML = html;

  // Wire toggle + populate class papers on open
  el.querySelector('#toggleAddForm')?.addEventListener('click', async () => {
    const form = el.querySelector('#addMistakeForm');
    const isHidden = form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    if (!isHidden) return;

    // Populate class papers dropdown
    const papers    = await fetchPapers(uid);
    const subPapers = papers.filter(p => p.subject === subjectId);
    const sub       = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === subjectId);
    const sel       = el.querySelector('#srcClassPaper');
    if (!subPapers.length) {
      sel.innerHTML = `<option value="">— no class papers logged for this subject —</option>`;
    } else {
      sel.innerHTML = `<option value="">— select a class paper —</option>` +
        subPapers.map(p => {
          const score = p.score != null ? ` · ${pct(p.score, p.maxScore)}%` : '';
          const label = `${p.paperType || 'Paper'} · ${formatDate(p.date)}${score}`;
          return `<option value="${p.id}" data-label="${sub?.name} ${label}" data-page="class-papers">${label}</option>`;
        }).join('');
    }
  });

  // Source mode switcher
  el.querySelectorAll('.source-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      el.querySelectorAll('.source-mode-btn').forEach(b =>
        b.className = `btn ${b.dataset.mode === btn.dataset.mode ? 'btn-primary' : 'btn-ghost'} btn-sm source-mode-btn`);
      el.querySelector('#sourceClass').style.display  = btn.dataset.mode === 'class'  ? 'block' : 'none';
      el.querySelector('#sourcePast').style.display   = btn.dataset.mode === 'past'   ? 'block' : 'none';
      el.querySelector('#sourceManual').style.display = btn.dataset.mode === 'manual' ? 'block' : 'none';
    });
  });

  // Wire save manual
  el.querySelector('#saveMistakeBtn')?.addEventListener('click', async () => {
    const text = el.querySelector('#newMistakeText').value.trim();
    const note = el.querySelector('#newMistakeNote').value.trim();
    if (!text) { showToast('Enter a mistake description', 'error'); return; }

    const activeMode = el.querySelector('.source-mode-btn.btn-primary')?.dataset.mode || 'class';
    const sub = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === subjectId);
    let source = 'Manual entry';
    let sourceLink = null; // page to navigate to when tapped

    if (activeMode === 'class') {
      const sel = el.querySelector('#srcClassPaper');
      const opt = sel.options[sel.selectedIndex];
      if (opt?.value) {
        source     = opt.dataset.label || opt.text;
        sourceLink = 'class-papers';
      } else {
        source = `${sub?.name || subjectId} Class Paper`;
      }
    } else if (activeMode === 'past') {
      const year  = el.querySelector('#srcPastYear').value;
      const round = el.querySelector('#srcPastRound').value;
      const ptype = el.querySelector('#srcPastPaperType').value;
      source     = [sub?.name, year, round, ptype].filter(Boolean).join(' · ') || 'Past Paper';
      sourceLink = 'past-papers';
    } else {
      source = el.querySelector('#srcManualText').value.trim() || 'Manual entry';
    }

    if (note) source += ` · ${note}`;

    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    for (let i = 0; i < lines.length; i++) {
      await appendMistake(uid, subjectId, lines[i], source, false, sourceLink);
      if (i < lines.length - 1) await new Promise(r => setTimeout(r, 50));
    }
    showToast(lines.length + ' mistake' + (lines.length > 1 ? 's' : '') + ' logged ✓', 'success');
    el.querySelector('#newMistakeText').value = '';
    el.querySelector('#newMistakeNote').value = '';
    await loadSubLog(el, uid, subjectId, isPartner);
  });

  // Wire resolve/delete via global handlers to avoid duplicate listeners on re-render
  window._mlResolve = async (id, currentResolved, containerId, uidArg, subIdArg, isPartnerArg) => {
    await App.db.ref('mistakeLog/' + uidArg + '/' + subIdArg + '/' + id + '/resolved').set(!currentResolved);
    const el = document.getElementById(containerId);
    if (el) await loadSubLog(el, uidArg, subIdArg, isPartnerArg);
  };
  window._mlDelete = async (id, containerId, uidArg, subIdArg) => {
    if (!confirm('Delete this entry?')) return;
    await App.db.ref('mistakeLog/' + uidArg + '/' + subIdArg + '/' + id).remove();
    const el = document.getElementById(containerId);
    if (el) await loadSubLog(el, uidArg, subIdArg, false);
  };
}

function mistakeCard(e, uid, subjectId, isPartner, containerId) {
  const resolved = !!e.resolved;
  const esc = s => (s||'').replace(/'/g, "\\'");
  return `
    <div class="card" style="border-left:3px solid ${resolved ? 'var(--sage)' : 'var(--gold)'};opacity:${resolved ? '0.7' : '1'}">
      <div class="flex-between" style="align-items:flex-start;gap:0.75rem">
        <div style="flex:1">
          <div style="font-size:0.88rem;line-height:1.55;color:var(--charcoal);${resolved ? 'text-decoration:line-through;color:var(--muted)' : ''}">${e.text}</div>
          <div class="flex gap-2 mt-1" style="flex-wrap:wrap">
            ${e.source
              ? e.sourceLink
                ? `<span onclick="Router.go('${e.sourceLink}')" style="font-size:0.7rem;color:var(--lavender-deep);cursor:pointer;text-decoration:underline;text-underline-offset:2px">📌 ${e.source}</span>`
                : `<span style="font-size:0.7rem;color:var(--muted)">📌 ${e.source}</span>`
              : ''}
            ${e.isAI ? `<span style="font-size:0.7rem;background:rgba(201,184,216,0.25);color:var(--lavender-deep);padding:0.1rem 0.5rem;border-radius:999px">✨ AI</span>` : ''}
            <span style="font-size:0.7rem;color:var(--muted)">${formatDate(e.createdAt?.split('T')[0])}</span>
          </div>
        </div>
        ${!isPartner ? `
          <div class="flex gap-1" style="flex-shrink:0">
            <button onclick="_mlResolve('${esc(e.id)}',${resolved},'${containerId}','${esc(uid)}','${esc(subjectId)}',false)"
              class="btn btn-ghost btn-sm" title="${resolved ? 'Mark open' : 'Mark addressed'}"
              style="font-size:1rem;padding:0.25rem 0.5rem">${resolved ? '↩' : '✓'}</button>
            <button onclick="_mlDelete('${esc(e.id)}','${containerId}','${esc(uid)}','${esc(subjectId)}')"
              class="btn btn-ghost btn-sm" style="font-size:0.8rem;padding:0.25rem 0.5rem;color:var(--muted)">🗑</button>
          </div>` : ''}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  SHARED METRICS TAB
// ═══════════════════════════════════════════════════════════════
async function renderSharedMetrics(el, uid, otherUID) {
  const myName    = App.profile?.name   || 'You';
  const otherName = App.otherProfile?.name || 'Partner';
  const myAv      = avatarEmoji(App.profile?.avatar);
  const otherAv   = avatarEmoji(App.otherProfile?.avatar);

  const mySubjects    = App.getSubjects();
  const otherSubjects = otherUID
    ? (App.otherProfile?.stream === 'her' ? SUBJECTS.her : SUBJECTS.him)
    : mySubjects;
  const allSubs = [...new Set([...mySubjects, ...otherSubjects].map(s => s.id))]
    .map(id => [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === id))
    .filter(Boolean);

  // Fetch all mistake logs
  const [mySnap, otherSnap] = await Promise.all([
    App.db.ref(`mistakeLog/${uid}`).once('value'),
    otherUID ? App.db.ref(`mistakeLog/${otherUID}`).once('value') : Promise.resolve({ val: () => null }),
  ]);

  function parseLog(snap) {
    const raw = snap.val() || {};
    const out = {};
    Object.entries(raw).forEach(([subId, entries]) => {
      const all  = Object.values(entries || {});
      out[subId] = { total: all.length, resolved: all.filter(e => e.resolved).length, entries: all };
    });
    return out;
  }

  const myLog    = parseLog(mySnap);
  const otherLog = otherUID ? parseLog(otherSnap) : {};

  // Summary cards
  const myTotal    = Object.values(myLog).reduce((a, s) => a + s.total, 0);
  const myResolved = Object.values(myLog).reduce((a, s) => a + s.resolved, 0);
  const otTotal    = Object.values(otherLog).reduce((a, s) => a + s.total, 0);
  const otResolved = Object.values(otherLog).reduce((a, s) => a + s.resolved, 0);

  let html = `
    <div class="grid-2 mb-3">
      <div class="card" style="background:rgba(201,184,216,0.1)">
        <div style="font-size:1.5rem mb-1">${myAv}</div>
        <div class="card-title mb-2">${myName}</div>
        <div style="font-family:var(--font-display);font-size:2rem;font-weight:600;color:var(--lavender-deep)">${myTotal}</div>
        <div class="text-sm text-muted">mistakes logged</div>
        <div class="progress-bar mt-2">
          <div class="progress-fill progress-lavender" style="width:${myTotal?Math.round(myResolved/myTotal*100):0}%"></div>
        </div>
        <div class="text-sm text-muted mt-1">${myResolved} / ${myTotal} addressed</div>
      </div>
      ${otherUID ? `
      <div class="card" style="background:rgba(232,180,184,0.1)">
        <div style="font-size:1.5rem mb-1">${otherAv}</div>
        <div class="card-title mb-2">${otherName}</div>
        <div style="font-family:var(--font-display);font-size:2rem;font-weight:600;color:var(--rose-deep)">${otTotal}</div>
        <div class="text-sm text-muted">mistakes logged</div>
        <div class="progress-bar mt-2">
          <div class="progress-fill progress-rose" style="width:${otTotal?Math.round(otResolved/otTotal*100):0}%"></div>
        </div>
        <div class="text-sm text-muted mt-1">${otResolved} / ${otTotal} addressed</div>
      </div>` : ''}
    </div>

    <!-- Per-subject breakdown -->
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">By Subject</div>
        <div class="card-subtitle">Total logged · resolved</div>
      </div>
      <div class="flex-col gap-3">
        ${allSubs.map(sub => {
          const my  = myLog[sub.id]    || { total: 0, resolved: 0 };
          const oth = otherLog[sub.id] || { total: 0, resolved: 0 };
          const myPct  = my.total  ? Math.round(my.resolved  / my.total  * 100) : 0;
          const othPct = oth.total ? Math.round(oth.resolved / oth.total * 100) : 0;
          return `
            <div>
              <div class="flex-between mb-1">
                <span style="font-weight:600;font-size:0.88rem">${sub.emoji} ${sub.name}</span>
              </div>
              <div class="flex gap-3">
                <div style="flex:1">
                  <div class="flex-between" style="font-size:0.75rem;color:var(--muted);margin-bottom:0.2rem">
                    <span>${myAv} ${myName}</span><span>${my.resolved}/${my.total}</span>
                  </div>
                  <div class="progress-bar"><div class="progress-fill progress-lavender" style="width:${myPct}%"></div></div>
                </div>
                ${otherUID ? `
                <div style="flex:1">
                  <div class="flex-between" style="font-size:0.75rem;color:var(--muted);margin-bottom:0.2rem">
                    <span>${otherAv} ${otherName}</span><span>${oth.resolved}/${oth.total}</span>
                  </div>
                  <div class="progress-bar"><div class="progress-fill progress-rose" style="width:${othPct}%"></div></div>
                </div>` : ''}
              </div>
            </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Charts -->
    <div class="card mb-3">
      <div class="card-header"><div class="card-title">📊 Mistakes Logged per Subject</div></div>
      <div class="chart-container"><canvas id="mlBar"></canvas></div>
    </div>

    <!-- Recent AI-extracted lessons both users -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">✨ Recent AI Lessons</div>
        <div class="card-subtitle">Extracted from paper feedback</div>
      </div>
      <div class="flex-col gap-2" id="recentAILessons">
        <div class="loading-state" style="padding:1rem"><div class="loading-heart">✨</div></div>
      </div>
    </div>
  `;

  el.innerHTML = html;

  // Bar chart
  const subLabels = allSubs.map(s => `${s.emoji} ${s.name}`);
  new Chart(el.querySelector('#mlBar'), {
    type: 'bar',
    data: {
      labels: subLabels,
      datasets: [
        { label: `${myAv} ${myName}`, data: allSubs.map(s => myLog[s.id]?.total || 0),
          backgroundColor: 'rgba(201,184,216,0.5)', borderColor: 'rgba(169,151,192,1)', borderWidth: 2, borderRadius: 6 },
        ...(otherUID ? [{ label: `${otherAv} ${otherName}`, data: allSubs.map(s => otherLog[s.id]?.total || 0),
          backgroundColor: 'rgba(232,180,184,0.5)', borderColor: 'rgba(212,147,154,1)', borderWidth: 2, borderRadius: 6 }] : []),
      ]
    },
    options: { responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: true, labels: { font: { family: 'DM Sans', size: 11 }, color: '#6B4F3A' } } },
      scales: {
        y: { min: 0, ticks: { stepSize: 1, color: '#9E8A79', font: { family: 'DM Sans', size: 11 } }, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { ticks: { color: '#9E8A79', font: { family: 'DM Sans', size: 11 } }, grid: { display: false } }
      }
    }
  });

  // Recent AI lessons
  const recentEl = el.querySelector('#recentAILessons');
  const allEntries = [];
  [...Object.entries(myLog), ...(otherUID ? Object.entries(otherLog) : [])].forEach(([subId, data]) => {
    (data.entries || []).filter(e => e.isAI).forEach(e => {
      const sub = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === subId);
      allEntries.push({ ...e, subId, subName: sub?.name, subEmoji: sub?.emoji,
        owner: myLog[subId] ? myName : otherName, ownerAv: myLog[subId] ? myAv : otherAv });
    });
  });
  allEntries.sort((a, b) => (b.createdAt || '') > (a.createdAt || '') ? 1 : -1);
  const recent = allEntries.slice(0, 10);

  if (!recent.length) {
    recentEl.innerHTML = `<p class="text-sm text-muted text-center py-3">No AI lessons yet — get feedback on a class paper!</p>`;
  } else {
    recentEl.innerHTML = recent.map(e => `
      <div style="padding:0.6rem 0.75rem;border-radius:var(--radius-md);background:rgba(201,184,216,0.08);border:1px solid rgba(201,184,216,0.2)">
        <div style="font-size:0.82rem;line-height:1.5;color:var(--charcoal)">${e.text}</div>
        <div class="flex gap-2 mt-1">
          <span style="font-size:0.68rem;color:var(--muted)">${e.ownerAv} ${e.owner}</span>
          <span style="font-size:0.68rem;color:var(--muted)">·</span>
          <span style="font-size:0.68rem;color:var(--muted)">${e.subEmoji} ${e.subName}</span>
          <span style="font-size:0.68rem;color:var(--muted)">·</span>
          <span style="font-size:0.68rem;color:var(--muted)">${formatDate(e.createdAt?.split('T')[0])}</span>
        </div>
      </div>`).join('');
  }
}

// ═══════════════════════════════════════════════════════════════
//  HELPER — append a mistake entry to Firebase
// ═══════════════════════════════════════════════════════════════
async function appendMistake(uid, subjectId, text, source, isAI, sourceLink = null) {
  // Use timestamp + random to guarantee unique keys even in rapid succession
  const id = 'ml_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  await App.db.ref('mistakeLog/' + uid + '/' + subjectId + '/' + id).set({
    text, source, sourceLink: sourceLink || null, isAI: !!isAI, resolved: false,
    createdAt: new Date().toISOString()
  });
  return id;
}