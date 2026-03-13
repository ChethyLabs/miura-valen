// ═══════════════════════════════════════════════════════════════
//  CLASS PAPERS — My Papers | Partner's Papers | Trends | Head-to-Head
// ═══════════════════════════════════════════════════════════════
Router.register('class-papers', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let activeTab = 'mine';

    content.innerHTML = `
      <div class="page-header flex-between" style="flex-wrap:wrap;gap:1rem">
        <div>
          <h1>Class Papers 🏫</h1>
          <p>Weekly papers, AI feedback, and trends</p>
        </div>
        <button class="btn btn-rose" id="addPaperBtn">➕ Log Paper</button>
      </div>

      <div class="tabs" id="cpTabs">
        <button class="tab active" data-tab="mine">📄 My Papers</button>
        <button class="tab" data-tab="partner">💕 Partner's Papers</button>
        <button class="tab" data-tab="trends">📈 Trends</button>
        <button class="tab" data-tab="compare">⚔️ Head-to-Head</button>
      </div>

      <div id="classContent">
        <div class="loading-state"><div class="loading-heart">🏫</div><p>Loading…</p></div>
      </div>
    `;

    content.querySelector('#addPaperBtn').onclick = () => openAddPaperModal(mySubjects, () => renderTab());

    content.querySelectorAll('#cpTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        content.querySelectorAll('#cpTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
        renderTab();
      });
    });

    async function renderTab() {
      const el = content.querySelector('#classContent');
      el.innerHTML = `<div class="loading-state"><div class="loading-heart">📊</div><p>Loading…</p></div>`;
      if (activeTab === 'mine')    await renderPaperList(el, App.currentUser.uid, false);
      if (activeTab === 'partner') await renderPaperList(el, App.otherUID, true);
      if (activeTab === 'trends')  await renderTrends(el);
      if (activeTab === 'compare') await renderComparison(el);
    }

    renderTab();
  });
});

// ═══════════════════════════════════════════════════════════════
//  PAPER LIST (works for both own and partner's)
// ═══════════════════════════════════════════════════════════════
async function renderPaperList(el, uid, isPartner) {
  if (!uid) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💕</div><p>No partner linked yet.</p></div>`;
    return;
  }

  const snap = await App.db.ref(`classPapers/${uid}`).once('value');
  const raw = snap.val() || {};
  const papers = Object.entries(raw).map(([id, v]) => ({ id, ...v }));
  papers.sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1); // newest first

  const name = isPartner ? (App.otherProfile?.name || 'Partner') : (App.profile?.name || 'You');
  const av   = isPartner ? avatarEmoji(App.otherProfile?.avatar) : avatarEmoji(App.profile?.avatar);

  if (!papers.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <p>${isPartner ? `${name} hasn't logged any papers yet.` : 'No papers logged yet.<br>Tap <strong>Log Paper</strong> to add your first one!'}</p>
      </div>`;
    return;
  }

  // Group by week
  function weekLabel(dateStr) {
    if (!dateStr) return 'Unknown week';
    // Parse date safely (avoid timezone shift with UTC)
    const [yr, mo, dy] = dateStr.split('-').map(Number);
    const d = new Date(yr, mo - 1, dy); // local time, no UTC shift
    const dow = d.getDay(); // 0=Sun..6=Sat
    const diff = dow === 0 ? -6 : 1 - dow; // shift to Monday
    const mon = new Date(d);
    mon.setDate(d.getDate() + diff);
    return 'Week of ' + mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  const grouped = {};
  papers.forEach(p => {
    const wk = weekLabel(p.date);
    if (!grouped[wk]) grouped[wk] = [];
    grouped[wk].push(p);
  });

  let html = `<div class="flex-col gap-3">`;

  for (const [week, wkPapers] of Object.entries(grouped)) {
    const weekAvg = wkPapers.filter(p => p.score && p.maxScore).length
      ? Math.round(wkPapers.filter(p=>p.score&&p.maxScore).reduce((a,p)=>a+pct(p.score,p.maxScore),0) / wkPapers.filter(p=>p.score&&p.maxScore).length)
      : null;

    html += `
      <div>
        <div class="flex-between mb-2">
          <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted)">${week}</div>
          ${weekAvg != null ? `<span class="badge badge-${weekAvg>=75?'sage':weekAvg>=50?'gold':'rose'}">${weekAvg}% avg</span>` : ''}
        </div>
        <div class="flex-col gap-2">
    `;

    for (const p of wkPapers) {
      const pctVal = p.score && p.maxScore ? pct(p.score, p.maxScore) : null;
      const subInfo = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === p.subject);
      html += `
        <div class="card" id="paper_${p.id}">
          <div class="flex-between">
            <div class="flex gap-2" style="align-items:flex-start">
              <div style="font-size:1.5rem">${subInfo?.emoji || '📄'}</div>
              <div>
                <div style="font-weight:600">${subInfo?.name || p.subject} — ${p.paperType || 'Paper'}</div>
                <div class="text-sm text-muted">${formatDate(p.date)}</div>
                ${p.notes ? `<div class="text-sm mt-1" style="color:var(--charcoal-light)">${p.notes}</div>` : ''}
              </div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              ${pctVal != null
                ? `<div style="font-family:var(--font-display);font-size:1.8rem;font-weight:600;line-height:1;color:${scoreColor(pctVal)}">${p.score}<span style="font-size:0.9rem;color:var(--muted)">/${p.maxScore}</span></div>
                   <div style="font-size:0.75rem;color:var(--muted)">${pctVal}%</div>`
                : `<div class="text-muted">—</div>`
              }
            </div>
          </div>

          ${p.photoUrl ? `
            <div class="mt-2">
              <img src="${p.photoUrl}" alt="Paper" style="max-width:100%;border-radius:var(--radius-md);max-height:220px;object-fit:cover;cursor:pointer"
                onclick="this.style.maxHeight=this.style.maxHeight==='none'?'220px':'none'" />
              <div class="text-sm text-muted mt-1">Tap image to expand</div>
            </div>
          ` : ''}

          ${p.aiFeedback ? `
            <div class="ai-card mt-2">
              <div class="ai-card-header">
                <span style="font-size:1.2rem">✨</span>
                <div><div class="ai-label">Gemini AI Feedback</div></div>
              </div>
              <div style="font-size:0.875rem;color:var(--charcoal-light);white-space:pre-wrap;line-height:1.7">${p.aiFeedback}</div>
            </div>
          ` : p.photoUrl && !isPartner ? `
            <button class="btn btn-ghost btn-sm mt-2" onclick="getAIFeedback('${p.id}', '${p.subject}', '${p.paperType || 'Paper 1'}', this)">
              ✨ Get Gemini Feedback
            </button>
          ` : ''}

          ${!isPartner ? `
            <div class="flex gap-1 mt-2">
              <button class="btn btn-ghost btn-sm" onclick="deletePaper('${p.id}')">🗑 Delete</button>
            </div>
          ` : ''}
        </div>
      `;
    }
    html += `</div></div>`;
  }

  html += `</div>`;
  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  TRENDS — weekly score trends per subject, both users
// ═══════════════════════════════════════════════════════════════
async function renderTrends(el) {
  const uid = App.currentUser.uid;
  const otherUID = App.otherUID;
  const mySubjects = App.getSubjects();
  const myName = App.profile?.name || 'You';
  const otherName = App.otherProfile?.name || 'Partner';
  const myAv = avatarEmoji(App.profile?.avatar);
  const otherAv = avatarEmoji(App.otherProfile?.avatar);

  const [mySnap, otherSnap] = await Promise.all([
    App.db.ref(`classPapers/${uid}`).once('value'),
    otherUID ? App.db.ref(`classPapers/${otherUID}`).once('value') : Promise.resolve({ val: () => null }),
  ]);

  const myRawAll = mySnap.val() || {};
  const myAll = Object.entries(myRawAll).map(([id, v]) => ({ id, ...v }));
  const otherRawAll = otherSnap?.val?.() || {};
  const otherAll = Object.entries(otherRawAll).map(([id, v]) => ({ id, ...v }));

  const myColor  = 'rgba(169,151,192,1)';
  const myFill   = 'rgba(201,184,216,0.2)';
  const otherColor = 'rgba(212,147,154,1)';
  const otherFill  = 'rgba(232,180,184,0.2)';

  function bySubject(all, subId) {
    return all.filter(p => p.subject === subId && p.score && p.maxScore)
              .sort((a,b) => (a.date||'') > (b.date||'') ? 1 : -1);
  }

  // Weekly aggregation: group papers by ISO week, avg score per week
  function weeklyAvgs(papers) {
    const wkMap = {};
    papers.forEach(p => {
      if (!p.date) return;
      const [yr, mo, dy] = p.date.split('-').map(Number);
      const d = new Date(yr, mo - 1, dy);
      const dow = d.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diff);
      const key = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
      if (!wkMap[key]) wkMap[key] = [];
      wkMap[key].push(pct(p.score, p.maxScore));
    });
    return Object.entries(wkMap)
      .sort(([a],[b]) => a > b ? 1 : -1)
      .map(([week, scores]) => ({
        week,
        label: new Date(week).toLocaleDateString('en-GB', { day:'numeric', month:'short' }),
        avg: Math.round(scores.reduce((a,b)=>a+b,0)/scores.length),
        count: scores.length
      }));
  }

  function rollingAvg(arr, win=3) {
    return arr.map((_,i) => {
      const slice = arr.slice(Math.max(0,i-win+1),i+1).filter(v=>v!=null);
      return slice.length ? Math.round(slice.reduce((a,b)=>a+b,0)/slice.length) : null;
    });
  }

  // All subjects to chart
  const allSubIds = [...new Set([...mySubjects.map(s=>s.id)])];
  const otherSubjects = App.otherProfile ? (App.otherProfile.stream === 'her' ? SUBJECTS.her : SUBJECTS.him) : mySubjects;
  const allOtherSubIds = otherSubjects.map(s=>s.id);
  const allSubIds2 = [...new Set([...allSubIds, ...allOtherSubIds])];
  const subMap = {};
  [...SUBJECTS.him, ...SUBJECTS.her].forEach(s => subMap[s.id] = s);

  // Build overall weekly trend (all subjects combined)
  const myWeekly = weeklyAvgs(myAll.filter(p=>p.score&&p.maxScore));
  const otherWeekly = weeklyAvgs(otherAll.filter(p=>p.score&&p.maxScore));
  const allWeeks = [...new Set([...myWeekly.map(w=>w.week), ...otherWeekly.map(w=>w.week)])].sort();
  const allWeekLabels = allWeeks.map(w => new Date(w).toLocaleDateString('en-GB',{day:'numeric',month:'short'}));

  let html = `
    <!-- Overall weekly trend -->
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">📅 Weekly Overall Trend</div>
        <div class="card-subtitle">Average score across all subjects, week by week</div>
      </div>
      <div class="chart-container chart-container-lg">
        <canvas id="weeklyOverall"></canvas>
      </div>
    </div>

    <!-- Per subject weekly trend -->
    <div class="grid-2 mb-3">
      ${allSubIds2.map(sid => {
        const sub = subMap[sid];
        if (!sub) return '';
        const myHas  = allSubIds.includes(sid);
        const otherHas = allOtherSubIds.includes(sid);
        return `
          <div class="card">
            <div class="card-header">
              <div class="card-title">${sub.emoji} ${sub.name}</div>
              <div class="card-subtitle">Weekly average${otherHas&&myHas?' — both':''}${myHas&&!otherHas?` — ${myAv} ${myName}`:''}${otherHas&&!myHas?` — ${otherAv} ${otherName}`:''}</div>
            </div>
            <div class="chart-container chart-container-lg">
              <canvas id="subWeekly_${sid}"></canvas>
            </div>
          </div>
        `;
      }).join('')}
    </div>

    <!-- Paper count per week (activity) -->
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">📊 Papers Per Week</div>
        <div class="card-subtitle">How many class papers each of you logged per week</div>
      </div>
      <div class="chart-container chart-container-lg">
        <canvas id="weeklyCount"></canvas>
      </div>
    </div>

    <!-- Rolling average trend -->
    <div class="card">
      <div class="card-header">
        <div class="card-title">📉 Rolling Average (3-week window)</div>
        <div class="card-subtitle">Smoothed trend to see improvement over time</div>
      </div>
      <div class="chart-container chart-container-lg">
        <canvas id="rollingChart"></canvas>
      </div>
    </div>
  `;

  el.innerHTML = html;

  // Chart 1: Overall weekly avg
  new Chart(el.querySelector('#weeklyOverall'), {
    type: 'line',
    data: {
      labels: allWeekLabels,
      datasets: [
        { label: `${myAv} ${myName}`, data: allWeeks.map(w => myWeekly.find(x=>x.week===w)?.avg ?? null), borderColor: myColor, backgroundColor: myFill, tension: 0.4, pointRadius: 4, borderWidth: 2.5, fill: true, spanGaps: false },
        ...(otherUID ? [{ label: `${otherAv} ${otherName}`, data: allWeeks.map(w => otherWeekly.find(x=>x.week===w)?.avg ?? null), borderColor: otherColor, backgroundColor: otherFill, tension: 0.4, pointRadius: 4, borderWidth: 2.5, fill: true, spanGaps: false }] : []),
      ]
    },
    options: cpChartOptions({ yMax: 100, legend: true })
  });

  // Chart 2: Per subject weekly
  for (const sid of allSubIds2) {
    const canvas = el.querySelector(`#subWeekly_${sid}`);
    if (!canvas) continue;
    const myP     = bySubject(myAll, sid);
    const otherP  = bySubject(otherAll, sid);
    const myWk    = weeklyAvgs(myP);
    const otherWk = weeklyAvgs(otherP);
    const weeks   = [...new Set([...myWk.map(w=>w.week), ...otherWk.map(w=>w.week)])].sort();
    const labels  = weeks.map(w => new Date(w).toLocaleDateString('en-GB',{day:'numeric',month:'short'}));

    if (!weeks.length) {
      const sub = canvas?.parentElement?.querySelector('.card-subtitle');
      if (sub) sub.textContent = 'No data yet';
      canvas.style.display = 'none';
      continue;
    }

    const myHas    = allSubIds.includes(sid);
    const otherHas = allOtherSubIds.includes(sid);
    const datasets = [];
    if (myHas)    datasets.push({ label: `${myAv} ${myName}`,    data: weeks.map(w=>myWk.find(x=>x.week===w)?.avg??null),    borderColor: myColor,    backgroundColor: myFill,    tension:0.4, pointRadius:3, borderWidth:2, fill:true, spanGaps:false });
    if (otherHas && otherUID) datasets.push({ label: `${otherAv} ${otherName}`, data: weeks.map(w=>otherWk.find(x=>x.week===w)?.avg??null), borderColor: otherColor, backgroundColor: otherFill, tension:0.4, pointRadius:3, borderWidth:2, fill:true, spanGaps:false });

    new Chart(canvas, {
      type: 'line',
      data: { labels, datasets },
      options: cpChartOptions({ yMax: 100, legend: true })
    });
  }

  // Chart 3: Paper count per week
  function weeklyCounts(all) {
    const wkMap = {};
    all.forEach(p => {
      if (!p.date) return;
      const [yr, mo, dy] = p.date.split('-').map(Number);
      const d = new Date(yr, mo - 1, dy);
      const dow = d.getDay();
      const diff = dow === 0 ? -6 : 1 - dow;
      const mon = new Date(d);
      mon.setDate(d.getDate() + diff);
      const key = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
      wkMap[key] = (wkMap[key]||0) + 1;
    });
    return wkMap;
  }
  const myCountMap    = weeklyCounts(myAll);
  const otherCountMap = weeklyCounts(otherAll);
  const countWeeks    = [...new Set([...Object.keys(myCountMap), ...Object.keys(otherCountMap)])].sort();
  const countLabels   = countWeeks.map(w => new Date(w).toLocaleDateString('en-GB',{day:'numeric',month:'short'}));

  new Chart(el.querySelector('#weeklyCount'), {
    type: 'bar',
    data: {
      labels: countLabels,
      datasets: [
        { label: `${myAv} ${myName}`,    data: countWeeks.map(w=>myCountMap[w]||0),    backgroundColor: myFill,    borderColor: myColor,    borderWidth:2, borderRadius:6 },
        ...(otherUID ? [{ label: `${otherAv} ${otherName}`, data: countWeeks.map(w=>otherCountMap[w]||0), backgroundColor: otherFill, borderColor: otherColor, borderWidth:2, borderRadius:6 }] : []),
      ]
    },
    options: cpChartOptions({ yMax: null, yLabel: 'papers', legend: true })
  });

  // Chart 4: Rolling avg
  const myRaw    = allWeeks.map(w => myWeekly.find(x=>x.week===w)?.avg ?? null);
  const otherRaw = allWeeks.map(w => otherWeekly.find(x=>x.week===w)?.avg ?? null);

  new Chart(el.querySelector('#rollingChart'), {
    type: 'line',
    data: {
      labels: allWeekLabels,
      datasets: [
        { label: `${myAv} ${myName}`,    data: rollingAvg(myRaw),    borderColor: myColor,    backgroundColor: 'transparent', tension:0.5, pointRadius:3, borderWidth:2.5, spanGaps:false },
        ...(otherUID ? [{ label: `${otherAv} ${otherName}`, data: rollingAvg(otherRaw), borderColor: otherColor, backgroundColor: 'transparent', tension:0.5, pointRadius:3, borderWidth:2.5, spanGaps:false }] : []),
      ]
    },
    options: cpChartOptions({ yMax: 100, legend: true })
  });
}

// ═══════════════════════════════════════════════════════════════
//  HEAD-TO-HEAD — shared subjects deep comparison
// ═══════════════════════════════════════════════════════════════
async function renderComparison(el) {
  const uid      = App.currentUser.uid;
  const otherUID = App.otherUID;
  const myName   = App.profile?.name || 'You';
  const otherName = App.otherProfile?.name || 'Partner';
  const myAv     = avatarEmoji(App.profile?.avatar);
  const otherAv  = avatarEmoji(App.otherProfile?.avatar);
  const mySubjects     = App.getSubjects();
  const sharedSubjects = App.getSharedSubjects();
  const otherSubjects  = App.otherProfile ? (App.otherProfile.stream === 'her' ? SUBJECTS.her : SUBJECTS.him) : mySubjects;

  if (!otherUID) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💕</div><p>No partner found yet!</p></div>`;
    return;
  }

  const [mySnap, otherSnap] = await Promise.all([
    App.db.ref(`classPapers/${uid}`).once('value'),
    App.db.ref(`classPapers/${otherUID}`).once('value'),
  ]);

  const myAll    = Object.entries(mySnap.val() || {}).map(([id, v]) => ({ id, ...v }));
  const otherAll = Object.entries(otherSnap.val() || {}).map(([id, v]) => ({ id, ...v }));

  const myColor    = 'rgba(169,151,192,1)';
  const myFill     = 'rgba(201,184,216,0.2)';
  const otherColor = 'rgba(212,147,154,1)';
  const otherFill  = 'rgba(232,180,184,0.2)';

  function subPapers(all, sid) {
    return all.filter(p=>p.subject===sid&&p.score&&p.maxScore).sort((a,b)=>(a.date||'')>(b.date||'')?1:-1);
  }
  function avg(papers) {
    if (!papers.length) return null;
    return Math.round(papers.reduce((a,p)=>a+pct(p.score,p.maxScore),0)/papers.length);
  }

  // Overall averages
  const myOA    = avg(myAll.filter(p=>p.score&&p.maxScore));
  const otherOA = avg(otherAll.filter(p=>p.score&&p.maxScore));

  let html = `
    <!-- Summary cards -->
    <div class="card mb-3" style="background:linear-gradient(135deg,rgba(201,184,216,0.12),rgba(232,180,184,0.1))">
      <div class="card-header"><div class="card-title">Overall Summary</div></div>
      <div class="grid-2">
        <div style="text-align:center;padding:1.25rem;background:rgba(201,184,216,0.2);border-radius:var(--radius-lg)">
          <div style="font-size:2rem">${myAv}</div>
          <div style="font-family:var(--font-display);font-size:2.2rem;font-weight:600;color:var(--lavender-deep)">${myOA!=null?myOA+'%':'—'}</div>
          <div style="font-size:0.8rem;color:var(--muted)">${myName} · ${myAll.filter(p=>p.score&&p.maxScore).length} papers</div>
        </div>
        <div style="text-align:center;padding:1.25rem;background:rgba(232,180,184,0.2);border-radius:var(--radius-lg)">
          <div style="font-size:2rem">${otherAv}</div>
          <div style="font-family:var(--font-display);font-size:2.2rem;font-weight:600;color:var(--rose-deep)">${otherOA!=null?otherOA+'%':'—'}</div>
          <div style="font-size:0.8rem;color:var(--muted)">${otherName} · ${otherAll.filter(p=>p.score&&p.maxScore).length} papers</div>
        </div>
      </div>
    </div>

    <!-- Subject avg bar -->
    <div class="card mb-3">
      <div class="card-header">
        <div class="card-title">Subject Averages</div>
        <div class="card-subtitle">All subjects side by side</div>
      </div>
      <div class="chart-container chart-container-lg"><canvas id="subAvgBar"></canvas></div>
    </div>
  `;

  // Shared subjects: full breakdowns
  for (const sub of sharedSubjects) {
    const myP     = subPapers(myAll, sub.id);
    const otherP  = subPapers(otherAll, sub.id);
    const myAvg   = avg(myP);
    const otherAvg = avg(otherP);
    const contested = Math.min(myP.length, otherP.length);
    let myWins=0, otherWins=0, draws=0;
    for (let i=0; i<contested; i++) {
      const ms = pct(myP[i].score, myP[i].maxScore);
      const os = pct(otherP[i].score, otherP[i].maxScore);
      if (ms > os) myWins++;
      else if (os > ms) otherWins++;
      else draws++;
    }
    const maxLen = Math.max(myP.length, otherP.length);
    const labels = Array.from({length:maxLen},(_,i)=>`#${i+1}`);

    html += `
      <div class="card mb-3">
        <div class="card-header flex-between">
          <div>
            <div class="card-title">${sub.emoji} ${sub.name}</div>
            <div class="card-subtitle">Score history + rolling average</div>
          </div>
          <div class="flex gap-1" style="flex-wrap:wrap">
            <span class="badge badge-lavender">${myAv} ${myWins}W</span>
            ${draws?`<span class="badge badge-muted">${draws}D</span>`:''}
            <span class="badge badge-rose">${otherAv} ${otherWins}W</span>
          </div>
        </div>

        <div class="grid-2 mb-2" style="gap:0.75rem">
          <div style="text-align:center;padding:0.75rem;background:rgba(201,184,216,0.15);border-radius:var(--radius-md)">
            <div style="font-family:var(--font-display);font-size:1.8rem;font-weight:600;color:var(--lavender-deep)">${myAvg!=null?myAvg+'%':'—'}</div>
            <div style="font-size:0.78rem;color:var(--muted)">${myAv} ${myName}</div>
          </div>
          <div style="text-align:center;padding:0.75rem;background:rgba(232,180,184,0.15);border-radius:var(--radius-md)">
            <div style="font-family:var(--font-display);font-size:1.8rem;font-weight:600;color:var(--rose-deep)">${otherAvg!=null?otherAvg+'%':'—'}</div>
            <div style="font-size:0.78rem;color:var(--muted)">${otherAv} ${otherName}</div>
          </div>
        </div>

        ${maxLen > 0 ? `
          <div class="card-subtitle mb-1" style="font-size:0.75rem">Paper-by-paper scores</div>
          <div class="chart-container mb-3"><canvas id="h2h_line_${sub.id}"></canvas></div>
          <div class="card-subtitle mb-1" style="font-size:0.75rem">Rolling average (3 papers)</div>
          <div class="chart-container"><canvas id="h2h_roll_${sub.id}"></canvas></div>
        ` : `<p class="text-sm text-muted text-center py-4">No papers logged yet for this subject</p>`}
      </div>
    `;
  }

  // Solo subjects
  const allSubMap = {};
  [...SUBJECTS.him, ...SUBJECTS.her].forEach(s => allSubMap[s.id] = s);

  for (const sub of mySubjects.filter(s=>!s.shared)) {
    const myP   = subPapers(myAll, sub.id);
    const myAvg = avg(myP);
    html += `
      <div class="card mb-3">
        <div class="card-header flex-between">
          <div><div class="card-title">${sub.emoji} ${sub.name} ${myAv} ${myName} only</div></div>
          ${myAvg!=null?`<span class="badge badge-lavender">${myAvg}% avg</span>`:''}
        </div>
        ${myP.length ? `<div class="chart-container"><canvas id="solo_my_${sub.id}"></canvas></div>`
                     : `<p class="text-sm text-muted text-center py-4">No papers yet</p>`}
      </div>
    `;
  }

  for (const sub of otherSubjects.filter(s=>!s.shared)) {
    const oP   = subPapers(otherAll, sub.id);
    const oAvg = avg(oP);
    html += `
      <div class="card mb-3">
        <div class="card-header flex-between">
          <div><div class="card-title">${sub.emoji} ${sub.name} ${otherAv} ${otherName} only</div></div>
          ${oAvg!=null?`<span class="badge badge-rose">${oAvg}% avg</span>`:''}
        </div>
        ${oP.length ? `<div class="chart-container"><canvas id="solo_other_${sub.id}"></canvas></div>`
                    : `<p class="text-sm text-muted text-center py-4">No papers yet</p>`}
      </div>
    `;
  }

  el.innerHTML = html;

  // ── Subject avg bar ──
  const allSubs = [...new Set([...mySubjects.map(s=>s.id), ...otherSubjects.map(s=>s.id)])];
  new Chart(el.querySelector('#subAvgBar'), {
    type: 'bar',
    data: {
      labels: allSubs.map(id => `${allSubMap[id]?.emoji||''} ${allSubMap[id]?.name||id}`),
      datasets: [
        { label: `${myAv} ${myName}`,    data: allSubs.map(id=>avg(subPapers(myAll,id))),    backgroundColor: myFill,    borderColor: myColor,    borderWidth:2, borderRadius:8 },
        { label: `${otherAv} ${otherName}`, data: allSubs.map(id=>avg(subPapers(otherAll,id))), backgroundColor: otherFill, borderColor: otherColor, borderWidth:2, borderRadius:8 },
      ]
    },
    options: cpChartOptions({ yMax:100, legend:true })
  });

  // ── Shared subject charts ──
  function rollingAvg(arr, win=3) {
    return arr.map((_,i)=>{ const s=arr.slice(Math.max(0,i-win+1),i+1).filter(v=>v!=null); return s.length?Math.round(s.reduce((a,b)=>a+b,0)/s.length):null; });
  }

  for (const sub of sharedSubjects) {
    const myP    = subPapers(myAll, sub.id);
    const otherP = subPapers(otherAll, sub.id);
    const myScores    = myP.map(p=>pct(p.score,p.maxScore));
    const otherScores = otherP.map(p=>pct(p.score,p.maxScore));
    const maxLen = Math.max(myScores.length, otherScores.length);
    if (!maxLen) continue;
    const labels = Array.from({length:maxLen},(_,i)=>`#${i+1}`);

    const lineC = el.querySelector(`#h2h_line_${sub.id}`);
    if (lineC) new Chart(lineC, {
      type:'line',
      data: { labels, datasets: [
        { label:`${myAv} ${myName}`,    data:myScores,    borderColor:myColor,    backgroundColor:myFill,    tension:0.35,pointRadius:4,borderWidth:2,fill:true,spanGaps:false },
        { label:`${otherAv} ${otherName}`, data:otherScores, borderColor:otherColor, backgroundColor:otherFill, tension:0.35,pointRadius:4,borderWidth:2,fill:true,spanGaps:false },
      ]},
      options: cpChartOptions({ yMax:100, legend:true })
    });

    const rollC = el.querySelector(`#h2h_roll_${sub.id}`);
    if (rollC) new Chart(rollC, {
      type:'line',
      data: { labels, datasets: [
        { label:`${myAv} ${myName}`,    data:rollingAvg(myScores),    borderColor:myColor,    backgroundColor:'transparent',tension:0.5,pointRadius:3,borderWidth:2.5,spanGaps:false },
        { label:`${otherAv} ${otherName}`, data:rollingAvg(otherScores), borderColor:otherColor, backgroundColor:'transparent',tension:0.5,pointRadius:3,borderWidth:2.5,spanGaps:false },
      ]},
      options: cpChartOptions({ yMax:100, legend:true })
    });
  }

  // ── Solo charts ──
  for (const sub of mySubjects.filter(s=>!s.shared)) {
    const c = el.querySelector(`#solo_my_${sub.id}`);
    if (!c) continue;
    const d = subPapers(myAll, sub.id).map(p=>pct(p.score,p.maxScore));
    new Chart(c, { type:'line', data:{ labels:d.map((_,i)=>`#${i+1}`), datasets:[{ label:`${myAv} ${myName}`, data:d, borderColor:myColor, backgroundColor:myFill, tension:0.4,pointRadius:4,borderWidth:2,fill:true }]}, options:cpChartOptions({yMax:100,legend:false}) });
  }
  for (const sub of otherSubjects.filter(s=>!s.shared)) {
    const c = el.querySelector(`#solo_other_${sub.id}`);
    if (!c) continue;
    const d = subPapers(otherAll, sub.id).map(p=>pct(p.score,p.maxScore));
    new Chart(c, { type:'line', data:{ labels:d.map((_,i)=>`#${i+1}`), datasets:[{ label:`${otherAv} ${otherName}`, data:d, borderColor:otherColor, backgroundColor:otherFill, tension:0.4,pointRadius:4,borderWidth:2,fill:true }]}, options:cpChartOptions({yMax:100,legend:false}) });
  }
}

// ═══════════════════════════════════════════════════════════════
//  CHART OPTIONS
// ═══════════════════════════════════════════════════════════════
function cpChartOptions({ yMax=100, legend=false, yLabel='%' }={}) {
  return {
    responsive:true, maintainAspectRatio:false,
    plugins:{
      legend:{ display:legend, labels:{ font:{family:'DM Sans',size:11}, color:'#6B4F3A', usePointStyle:true, pointStyleWidth:8 } },
      tooltip:{ backgroundColor:'#FFFEFB', titleColor:'#3D2B1F', bodyColor:'#6B4F3A', borderColor:'#F0EAE0', borderWidth:1, padding:10,
        titleFont:{family:'Fraunces',size:13}, bodyFont:{family:'DM Sans',size:12},
        callbacks:{ label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y!=null ? ctx.parsed.y+(yLabel==='%'?'%':' '+yLabel) : 'N/A'}` }
      }
    },
    scales:{
      y:{ min:0, ...(yMax?{max:yMax}:{}), ticks:{color:'#9E8A79',font:{family:'DM Sans',size:11}}, grid:{color:'rgba(0,0,0,0.04)'} },
      x:{ ticks:{color:'#9E8A79',font:{family:'DM Sans',size:11},maxRotation:40}, grid:{display:false} }
    }
  };
}

// ═══════════════════════════════════════════════════════════════
//  ADD PAPER MODAL
// ═══════════════════════════════════════════════════════════════
function openAddPaperModal(mySubjects, onSave) {
  const overlay = openModal(`
    <div class="modal-header">
      <div class="modal-title">Log Class Paper 🏫</div>
      <button class="modal-close" id="mClose">✕</button>
    </div>
    <div class="modal-body">
      <div class="input-group">
        <label class="input-label">Subject</label>
        <select class="input" id="cp_subject">
          ${mySubjects.map(s=>`<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('')}
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">Paper Type</label>
        <select class="input" id="cp_type">
          <option>Paper 1 (MCQ)</option>
          <option>Paper 2 (Structured)</option>
        </select>
      </div>
      <div class="input-group">
        <label class="input-label">Date</label>
        <input class="input" type="date" id="cp_date" value="${new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="flex gap-2">
        <div class="input-group" style="flex:1">
          <label class="input-label">Score</label>
          <input class="input" type="number" id="cp_score" placeholder="e.g. 38" />
        </div>
        <div class="input-group" style="flex:1">
          <label class="input-label">Out of</label>
          <input class="input" type="number" id="cp_max" placeholder="50" value="50" />
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Notes (optional)</label>
        <input class="input" type="text" id="cp_notes" placeholder="Any thoughts…" />
      </div>
      <div class="input-group">
        <label class="input-label">Upload Paper Photo (for AI feedback)</label>
        <input class="input" type="file" id="cp_photo" accept="image/*" />
        <small>Gemini will analyze your answers when you tap Get Feedback.</small>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="mCancel">Cancel</button>
      <button class="btn btn-rose" id="mSave">Save Paper</button>
    </div>
  `);

  overlay.querySelector('#mClose').onclick  = () => closeModal(overlay);
  overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);

  overlay.querySelector('#mSave').onclick = async () => {
    const btn = overlay.querySelector('#mSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving…';

    const uid       = App.currentUser.uid;
    const subject   = overlay.querySelector('#cp_subject').value;
    const paperType = overlay.querySelector('#cp_type').value;
    const date      = overlay.querySelector('#cp_date').value;
    const score     = parseFloat(overlay.querySelector('#cp_score').value) || null;
    const maxScore  = parseFloat(overlay.querySelector('#cp_max').value) || null;
    const notes     = overlay.querySelector('#cp_notes').value;
    const photoFile = overlay.querySelector('#cp_photo').files[0];

    let photoUrl = null;
    if (photoFile) photoUrl = await fileToBase64(photoFile);

    const id = 'cp_' + Date.now();
    await App.db.ref(`classPapers/${uid}/${id}`).set({
      subject, paperType, date, score, maxScore, notes, photoUrl, aiFeedback: null, createdAt: new Date().toISOString()
    });

    closeModal(overlay);
    showToast('Paper logged! 🏫', 'success');
    App.trackStreak();
    onSave();
  };
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
async function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

async function getAIFeedback(paperId, subject, paperType, btn) {
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) { showToast('Add your Gemini API key in Settings ⚙️', 'error'); Router.go('settings'); return; }

  // Get photoUrl from Firebase
  const uid  = App.currentUser.uid;
  const snap = await App.db.ref(`classPapers/${uid}/${paperId}`).once('value');
  const paper = snap.val();
  if (!paper?.photoUrl) { showToast('No photo found for this paper', 'error'); return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="loading-heart" style="font-size:1rem">✨</span> Gemini is thinking…';

  try {
    const subName = [...SUBJECTS.him,...SUBJECTS.her].find(s=>s.id===subject)?.name || subject;
    const prompt  = `This is a ${subName} ${paperType} answer paper by an A/L student in Sri Lanka preparing for the GCE Advanced Level examination.\n\nPlease analyze their answers and provide:\n1. Overall assessment\n2. Specific weak areas\n3. Common mistakes\n4. Personalized improvement advice\n5. Topics to prioritize\n\nBe encouraging, specific, and constructive.`;

    const base64Data = paper.photoUrl.split(',')[1];
    const mimeType   = paper.photoUrl.split(';')[0].split(':')[1];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { mimeType, data: base64Data } }, { text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No feedback generated.';

    await App.db.ref(`classPapers/${uid}/${paperId}/aiFeedback`).set(feedback);

    const paperEl = document.querySelector(`#paper_${paperId}`);
    if (paperEl) {
      btn.remove();
      const aiDiv = document.createElement('div');
      aiDiv.className = 'ai-card mt-2';
      aiDiv.innerHTML = `
        <div class="ai-card-header"><span style="font-size:1.2rem">✨</span><div><div class="ai-label">Gemini AI Feedback</div></div></div>
        <div style="font-size:0.875rem;color:var(--charcoal-light);white-space:pre-wrap;line-height:1.7">${feedback}</div>
      `;
      paperEl.appendChild(aiDiv);
    }
    showToast('AI feedback ready! ✨', 'success');
  } catch(e) {
    showToast('AI failed: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '✨ Get Gemini Feedback';
  }
}

async function deletePaper(paperId) {
  if (!confirm('Delete this paper?')) return;
  await App.db.ref(`classPapers/${App.currentUser.uid}/${paperId}`).remove();
  showToast('Deleted', '');
  Router.go('class-papers');
}