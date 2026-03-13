// ═══════════════════════════════════════════════════════════════
//  CLASS PAPERS
//  Mode A — Individual: log + view single papers
//  Mode B — Full Papers: bundle P1+P2, view combined results
// ═══════════════════════════════════════════════════════════════
Router.register('class-papers', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let mode = 'individual'; // 'individual' | 'full'
    let activeTab = 'mine';

    content.innerHTML = `
      <div class="page-header">
        <h1>Class Papers 🏫</h1>
        <p>Track individual papers and full paper attempts</p>
      </div>

      <!-- Mode switcher -->
      <div class="flex gap-2 mb-3" id="modeSwitcher">
        <button class="btn btn-primary mode-btn" data-mode="individual" style="flex:1;justify-content:center">
          📄 Individual Papers
        </button>
        <button class="btn btn-ghost mode-btn" data-mode="full" style="flex:1;justify-content:center">
          🔗 Full Papers
        </button>
      </div>

      <!-- Action buttons (change per mode) -->
      <div id="actionBar" class="mb-3 flex gap-2" style="justify-content:flex-end"></div>

      <!-- Sub-tabs -->
      <div class="tabs" id="cpTabs">
        <button class="tab active" data-tab="mine">📄 Mine</button>
        <button class="tab" data-tab="partner">💕 Partner's</button>
        <button class="tab" data-tab="trends">📈 Trends</button>
        <button class="tab" data-tab="compare">⚔️ Head-to-Head</button>
      </div>

      <div id="classContent">
        <div class="loading-state"><div class="loading-heart">🏫</div><p>Loading…</p></div>
      </div>
    `;

    function setMode(m) {
      mode = m;
      content.querySelectorAll('.mode-btn').forEach(b => {
        b.className = `btn ${b.dataset.mode === mode ? 'btn-primary' : 'btn-ghost'} mode-btn`;
        b.style.flex = '1';
        b.style.justifyContent = 'center';
      });
      const bar = content.querySelector('#actionBar');
      if (mode === 'individual') {
        bar.innerHTML = `<button class="btn btn-rose" id="addPaperBtn">➕ Log Paper</button>`;
        bar.querySelector('#addPaperBtn').onclick = () => openAddPaperModal(mySubjects, () => renderTab());
      } else {
        bar.innerHTML = `<button class="btn btn-sage" id="bundleBtn">🔗 Bundle Papers</button>`;
        bar.querySelector('#bundleBtn').onclick = () => openBundleModal(App.currentUser.uid, () => renderTab());
      }
      renderTab();
    }

    content.querySelectorAll('.mode-btn').forEach(btn => {
      btn.addEventListener('click', () => setMode(btn.dataset.mode));
    });

    content.querySelectorAll('#cpTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        content.querySelectorAll('#cpTabs .tab').forEach(t =>
          t.classList.toggle('active', t.dataset.tab === activeTab));
        renderTab();
      });
    });

    async function renderTab() {
      const el = content.querySelector('#classContent');
      el.innerHTML = `<div class="loading-state"><div class="loading-heart">📊</div><p>Loading…</p></div>`;

      if (mode === 'individual') {
        if (activeTab === 'mine')    await renderIndividualList(el, App.currentUser.uid, false);
        if (activeTab === 'partner') await renderIndividualList(el, App.otherUID, true);
        if (activeTab === 'trends')  await renderTrends(el);
        if (activeTab === 'compare') await renderComparison(el);
      } else {
        if (activeTab === 'mine')    await renderFullPapers(el, App.currentUser.uid, false);
        if (activeTab === 'partner') await renderFullPapers(el, App.otherUID, true);
        if (activeTab === 'trends')  await renderFullTrends(el);
        if (activeTab === 'compare') await renderFullComparison(el);
      }
    }

    setMode('individual');
  });
});

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
function weekLabel(dateStr) {
  if (!dateStr) return 'Unknown week';
  const [yr, mo, dy] = dateStr.split('-').map(Number);
  const d   = new Date(yr, mo - 1, dy);
  const dow = d.getDay();
  const diff = dow === 0 ? -6 : 1 - dow;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return 'Week of ' + mon.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function fetchPapers(uid) {
  if (!uid) return [];
  const snap = await App.db.ref(`classPapers/${uid}`).once('value');
  const raw  = snap.val() || {};
  return Object.entries(raw).map(([id, v]) => ({ id, ...v }))
               .sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1);
}

function paperCard(p, isPartner) {
  const pctVal  = p.score != null && p.maxScore ? pct(p.score, p.maxScore) : null;
  const subInfo = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === p.subject);
  return `
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
            : `<div class="text-muted">—</div>`}
        </div>
      </div>
      ${p.photoUrl ? `
        <div class="mt-2">
          <img src="${p.photoUrl}" alt="Paper" style="max-width:100%;border-radius:var(--radius-md);max-height:220px;object-fit:cover;cursor:pointer"
            onclick="this.style.maxHeight=this.style.maxHeight==='none'?'220px':'none'" />
          <div class="text-sm text-muted mt-1">Tap image to expand</div>
        </div>` : ''}
      ${p.aiFeedback ? `
        <div class="ai-card mt-2">
          <div class="ai-card-header"><span style="font-size:1.2rem">✨</span><div><div class="ai-label">Gemini AI Feedback</div></div></div>
          <div style="font-size:0.875rem;color:var(--charcoal-light);white-space:pre-wrap;line-height:1.7">${p.aiFeedback}</div>
        </div>`
      : p.photoUrl && !isPartner ? `
        <button class="btn btn-ghost btn-sm mt-2" onclick="getAIFeedback('${p.id}','${p.subject}','${p.paperType||'Paper 1'}',this)">
          ✨ Get Gemini Feedback
        </button>` : ''}
      ${!isPartner ? `
        <div class="flex gap-1 mt-2">
          <button class="btn btn-ghost btn-sm" onclick="deletePaper('${p.id}')">🗑 Delete</button>
        </div>` : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  MODE A — INDIVIDUAL LIST
// ═══════════════════════════════════════════════════════════════
async function renderIndividualList(el, uid, isPartner) {
  if (!uid) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">💕</div><p>No partner linked yet.</p></div>`; return; }

  const papers = await fetchPapers(uid);
  const name   = isPartner ? (App.otherProfile?.name || 'Partner') : (App.profile?.name || 'You');

  if (!papers.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📄</div>
      <p>${isPartner ? `${name} hasn't logged any papers yet.` : 'No papers yet.<br>Tap <strong>Log Paper</strong> to add one!'}</p></div>`;
    return;
  }

  // Group by week
  const grouped = {};
  papers.forEach(p => {
    const wk = weekLabel(p.date);
    if (!grouped[wk]) grouped[wk] = [];
    grouped[wk].push(p);
  });

  let html = `<div class="flex-col gap-3">`;
  for (const [week, wkPapers] of Object.entries(grouped)) {
    const scored  = wkPapers.filter(p => p.score != null && p.maxScore);
    const weekAvg = scored.length ? Math.round(scored.reduce((a,p)=>a+pct(p.score,p.maxScore),0)/scored.length) : null;
    html += `
      <div>
        <div class="flex-between mb-2">
          <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted)">${week}</div>
          ${weekAvg != null ? `<span class="badge badge-${weekAvg>=75?'sage':weekAvg>=50?'gold':'rose'}">${weekAvg}% avg</span>` : ''}
        </div>
        <div class="flex-col gap-2">
          ${wkPapers.map(p => paperCard(p, isPartner)).join('')}
        </div>
      </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

// ═══════════════════════════════════════════════════════════════
//  MODE B — FULL PAPERS (bundles only)
// ═══════════════════════════════════════════════════════════════
async function renderFullPapers(el, uid, isPartner) {
  if (!uid) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">💕</div><p>No partner linked yet.</p></div>`; return; }

  const papers  = await fetchPapers(uid);
  const bundles = buildBundles(papers);
  const name    = isPartner ? (App.otherProfile?.name || 'Partner') : (App.profile?.name || 'You');

  if (!bundles.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔗</div>
      <p>${isPartner ? `${name} hasn't bundled any full papers yet.` : 'No full papers yet.<br>Log individual papers first, then tap <strong>Bundle Papers</strong>.'}</p></div>`;
    return;
  }

  // Group bundles by week
  const grouped = {};
  bundles.forEach(b => {
    const wk = weekLabel(b.date);
    if (!grouped[wk]) grouped[wk] = [];
    grouped[wk].push(b);
  });

  let html = `<div class="flex-col gap-3">`;
  for (const [week, wkBundles] of Object.entries(grouped)) {
    const avgs    = wkBundles.filter(b => b.combined != null);
    const weekAvg = avgs.length ? Math.round(avgs.reduce((a,b)=>a+b.combined,0)/avgs.length) : null;
    html += `
      <div>
        <div class="flex-between mb-2">
          <div style="font-size:0.78rem;font-weight:700;letter-spacing:0.07em;text-transform:uppercase;color:var(--muted)">${week}</div>
          ${weekAvg != null ? `<span class="badge badge-${weekAvg>=75?'sage':weekAvg>=50?'gold':'rose'}">${weekAvg}% avg</span>` : ''}
        </div>
        <div class="flex-col gap-2">
          ${wkBundles.map(b => bundleCard(b, uid, isPartner)).join('')}
        </div>
      </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;
}

function buildBundles(papers) {
  const bundleMap = {};
  papers.forEach(p => {
    if (!p.bundleId) return;
    if (!bundleMap[p.bundleId]) bundleMap[p.bundleId] = [];
    bundleMap[p.bundleId].push(p);
  });
  return Object.entries(bundleMap).map(([bundleId, ps]) => {
    const p1 = ps.find(p => p.paperType?.includes('1') || p.paperType?.toLowerCase().includes('mcq'));
    const p2 = ps.find(p =>
      p.paperType?.includes('2') ||
      p.paperType?.toLowerCase().includes('structured') ||
      p.paperType?.toLowerCase().includes('essay'));
    const scored     = ps.filter(p => p.score != null && p.maxScore);
    const totalScore = scored.reduce((a,p) => a + p.score, 0);
    const totalMax   = scored.reduce((a,p) => a + p.maxScore, 0);
    const combined   = totalMax ? Math.round(totalScore / totalMax * 100) : null;
    const sub        = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === ps[0]?.subject);
    const date       = ps.map(p => p.date).filter(Boolean).sort()[0];
    return { bundleId, papers: ps, p1, p2, totalScore, totalMax, combined, sub, date };
  }).sort((a,b) => (b.date||'') > (a.date||'') ? 1 : -1);
}

function bundleCard(b, uid, isPartner) {
  return `
    <div class="card" style="border:1.5px solid rgba(201,184,216,0.4);background:linear-gradient(135deg,rgba(201,184,216,0.06),rgba(232,180,184,0.03))">
      <!-- Header -->
      <div class="flex-between mb-3">
        <div class="flex gap-2" style="align-items:center">
          <span style="font-size:1.4rem">${b.sub?.emoji || '📄'}</span>
          <div>
            <div style="font-weight:600">${b.sub?.name || b.papers[0]?.subject}</div>
            <div class="text-sm text-muted">${formatDate(b.date)} · Full Paper</div>
          </div>
        </div>
        ${b.combined != null ? `
          <div style="text-align:right">
            <div style="font-family:var(--font-display);font-size:2rem;font-weight:600;line-height:1;color:${scoreColor(b.combined)}">${b.combined}%</div>
            <div style="font-size:0.72rem;color:var(--muted)">${b.totalScore} / ${b.totalMax}</div>
          </div>` : ''}
      </div>

      <!-- P1 + P2 side by side -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.6rem;margin-bottom:${!isPartner?'0.75rem':'0'}">
        <div style="padding:0.65rem 0.85rem;background:rgba(201,184,216,0.15);border-radius:var(--radius-md)">
          <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--lavender-deep);margin-bottom:0.3rem">
            Paper 1 — MCQ
          </div>
        ${b.p1 ? `
            <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:600;color:${b.p1.score!=null?scoreColor(pct(b.p1.score,b.p1.maxScore)):'var(--muted)'}">
              ${b.p1.score != null ? `${b.p1.score}<span style="font-size:0.8rem;color:var(--muted)">/${b.p1.maxScore}</span>` : '—'}
            </div>
            ${b.p1.score != null ? `<div style="font-size:0.75rem;color:var(--muted)">${pct(b.p1.score,b.p1.maxScore)}%</div>` : ''}
          ` : `<div class="text-sm text-muted">Not logged</div>`}
        </div>
        <div style="padding:0.65rem 0.85rem;background:rgba(232,180,184,0.15);border-radius:var(--radius-md)">
          <div style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:var(--rose-deep);margin-bottom:0.3rem">
            Paper 2 — Essay
          </div>
          ${b.p2 ? `
            <div style="font-family:var(--font-display);font-size:1.4rem;font-weight:600;color:${b.p2.score!=null?scoreColor(pct(b.p2.score,b.p2.maxScore)):'var(--muted)'}">
              ${b.p2.score != null ? `${b.p2.score}<span style="font-size:0.8rem;color:var(--muted)">/${b.p2.maxScore}</span>` : '—'}
            </div>
            ${b.p2.score != null ? `<div style="font-size:0.75rem;color:var(--muted)">${pct(b.p2.score,b.p2.maxScore)}%</div>` : ''}
          ` : `<div class="text-sm text-muted">Not logged</div>`}
        </div>
      </div>

      ${!isPartner ? `
        <button class="btn btn-ghost btn-sm" style="font-size:0.78rem;color:var(--muted)"
                onclick="doUnbundle('${b.bundleId}')">
          ✕ Unbundle
        </button>` : ''}
    </div>`;
}

// ═══════════════════════════════════════════════════════════════
//  UNBUNDLE
// ═══════════════════════════════════════════════════════════════
async function doUnbundle(bundleId) {
  if (!confirm('Unbundle these papers? They will return to the Individual tab.')) return;
  const uid   = App.currentUser.uid;
  const snap  = await App.db.ref(`classPapers/${uid}`).once('value');
  const all   = snap.val() || {};
  const removes = Object.entries(all)
    .filter(([, v]) => v.bundleId === bundleId)
    .map(([id]) => App.db.ref(`classPapers/${uid}/${id}/bundleId`).remove());
  await Promise.all(removes);
  showToast('Unbundled ✓', '');
  Router.go('class-papers');
}

// ═══════════════════════════════════════════════════════════════
//  BUNDLE MODAL — pick from already-logged individual papers
// ═══════════════════════════════════════════════════════════════
async function openBundleModal(uid, onSave) {
  const papers    = await fetchPapers(uid);
  const unbundled = papers.filter(p => !p.bundleId);

  // Separate by paper type
  const p1pool = unbundled.filter(p =>
    p.paperType?.includes('1') || p.paperType?.toLowerCase().includes('mcq'));
  const p2pool = unbundled.filter(p =>
    p.paperType?.includes('2') || p.paperType?.toLowerCase().includes('structured') || p.paperType?.toLowerCase().includes('essay'));

  function opt(p) {
    const sub = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === p.subject);
    const s   = p.score != null ? ` · ${pct(p.score,p.maxScore)}%` : '';
    return `<option value="${p.id}">${sub?.emoji||''} ${sub?.name||p.subject} — ${formatDate(p.date)}${s}</option>`;
  }

  const overlay = openModal(`
    <div class="modal-header">
      <div class="modal-title">Bundle Full Paper 🔗</div>
      <button class="modal-close" id="mClose">✕</button>
    </div>
    <div class="modal-body">
      <p class="text-sm text-muted mb-3">Pick a Paper 1 and Paper 2 from your logged papers to pair them as one full attempt.</p>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1rem">

        <div style="padding:1rem;background:rgba(201,184,216,0.12);border-radius:var(--radius-lg);border:1.5px solid rgba(201,184,216,0.3)">
          <div style="font-weight:700;font-size:0.76rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--lavender-deep);margin-bottom:0.6rem">
            📝 Paper 1 — MCQ
          </div>
          ${p1pool.length
            ? `<select class="input" id="bnd_p1" style="font-size:0.8rem">
                <option value="">— none —</option>
                ${p1pool.map(opt).join('')}
               </select>
               <div id="p1info" class="text-sm text-muted mt-1" style="min-height:1rem"></div>`
            : `<p class="text-sm text-muted">No unbundled Paper 1s logged yet</p>`}
        </div>

        <div style="padding:1rem;background:rgba(232,180,184,0.12);border-radius:var(--radius-lg);border:1.5px solid rgba(232,180,184,0.3)">
          <div style="font-weight:700;font-size:0.76rem;letter-spacing:0.05em;text-transform:uppercase;color:var(--rose-deep);margin-bottom:0.6rem">
            📄 Paper 2 — Essay
          </div>
          ${p2pool.length
            ? `<select class="input" id="bnd_p2" style="font-size:0.8rem">
                <option value="">— none —</option>
                ${p2pool.map(opt).join('')}
               </select>
               <div id="p2info" class="text-sm text-muted mt-1" style="min-height:1rem"></div>`
            : `<p class="text-sm text-muted">No unbundled Paper 2s logged yet</p>`}
        </div>
      </div>

      <!-- Live combined preview -->
      <div style="text-align:center;padding:1rem;background:rgba(250,247,242,0.9);border-radius:var(--radius-lg);border:1.5px dashed var(--cream-dark)">
        <div style="font-size:0.75rem;color:var(--muted);margin-bottom:0.2rem">Combined score</div>
        <div id="bndPreview" style="font-family:var(--font-display);font-size:2rem;font-weight:600;color:var(--charcoal)">—</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="mCancel">Cancel</button>
      <button class="btn btn-sage" id="mSave">Bundle ✓</button>
    </div>
  `);

  overlay.querySelector('#mClose').onclick  = () => closeModal(overlay);
  overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);

  function updatePreview() {
    const p1id = overlay.querySelector('#bnd_p1')?.value;
    const p2id = overlay.querySelector('#bnd_p2')?.value;
    const p1   = papers.find(p => p.id === p1id);
    const p2   = papers.find(p => p.id === p2id);
    const prev = overlay.querySelector('#bndPreview');
    const p1i  = overlay.querySelector('#p1info');
    const p2i  = overlay.querySelector('#p2info');
    if (p1i) p1i.textContent = p1?.score != null ? `${p1.score}/${p1.maxScore} = ${pct(p1.score,p1.maxScore)}%` : '';
    if (p2i) p2i.textContent = p2?.score != null ? `${p2.score}/${p2.maxScore} = ${pct(p2.score,p2.maxScore)}%` : '';
    if (!p1 && !p2) { prev.textContent = '—'; prev.style.color = 'var(--charcoal)'; return; }
    const ts = (p1?.score||0) + (p2?.score||0);
    const tm = (p1?.maxScore||0) + (p2?.maxScore||0);
    if (!tm) { prev.textContent = '—'; return; }
    const c = Math.round(ts/tm*100);
    prev.textContent = `${ts} / ${tm} = ${c}%`;
    prev.style.color = scoreColor(c);
  }

  overlay.querySelector('#bnd_p1')?.addEventListener('change', updatePreview);
  overlay.querySelector('#bnd_p2')?.addEventListener('change', updatePreview);

  overlay.querySelector('#mSave').onclick = async () => {
    const p1id = overlay.querySelector('#bnd_p1')?.value;
    const p2id = overlay.querySelector('#bnd_p2')?.value;
    if (!p1id && !p2id) { showToast('Select at least one paper', 'error'); return; }

    const bundleId = `bundle_${Date.now()}`;
    const updates  = {};
    if (p1id) updates[`classPapers/${uid}/${p1id}/bundleId`] = bundleId;
    if (p2id) updates[`classPapers/${uid}/${p2id}/bundleId`] = bundleId;
    await App.db.ref().update(updates);
    closeModal(overlay);
    showToast('Full paper bundled! 🔗', 'success');
    onSave();
  };
}

// ═══════════════════════════════════════════════════════════════
//  FULL PAPER TRENDS
// ═══════════════════════════════════════════════════════════════
async function renderFullTrends(el) {
  const uid       = App.currentUser.uid;
  const otherUID  = App.otherUID;
  const myName    = App.profile?.name || 'You';
  const otherName = App.otherProfile?.name || 'Partner';
  const myAv      = avatarEmoji(App.profile?.avatar);
  const otherAv   = avatarEmoji(App.otherProfile?.avatar);
  const myColor   = 'rgba(169,151,192,1)';
  const otherColor= 'rgba(212,147,154,1)';
  const myFill    = 'rgba(201,184,216,0.2)';
  const otherFill = 'rgba(232,180,184,0.2)';

  const [myPapers, otherPapers] = await Promise.all([
    fetchPapers(uid),
    otherUID ? fetchPapers(otherUID) : Promise.resolve([])
  ]);

  const myBundles    = buildBundles(myPapers);
  const otherBundles = buildBundles(otherPapers);

  if (!myBundles.length && !otherBundles.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔗</div><p>Bundle some full papers first to see trends.</p></div>`;
    return;
  }

  // Group bundles by subject
  const allSubs = [...new Set([...myBundles.map(b=>b.sub?.id), ...otherBundles.map(b=>b.sub?.id)].filter(Boolean))];
  const subMap  = {};
  [...SUBJECTS.him, ...SUBJECTS.her].forEach(s => subMap[s.id] = s);

  let html = `<div class="flex-col gap-3">`;

  for (const sid of allSubs) {
    const sub  = subMap[sid];
    const myB  = myBundles.filter(b=>b.sub?.id===sid && b.combined!=null);
    const othB = otherBundles.filter(b=>b.sub?.id===sid && b.combined!=null);
    if (!myB.length && !othB.length) continue;
    html += `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${sub?.emoji||''} ${sub?.name||sid} — Full Paper Trend</div>
        </div>
        <div class="chart-container chart-container-lg"><canvas id="ft_${sid}"></canvas></div>
      </div>`;
  }
  html += `</div>`;
  el.innerHTML = html;

  for (const sid of allSubs) {
    const canvas = el.querySelector(`#ft_${sid}`);
    if (!canvas) continue;
    const myB  = myBundles.filter(b=>b.sub?.id===sid && b.combined!=null).reverse();
    const othB = otherBundles.filter(b=>b.sub?.id===sid && b.combined!=null).reverse();
    const labels = Array.from({length: Math.max(myB.length, othB.length)}, (_,i) => `#${i+1}`);
    new Chart(canvas, {
      type: 'line',
      data: { labels, datasets: [
        ...(myB.length ? [{ label:`${myAv} ${myName}`, data:myB.map(b=>b.combined), borderColor:myColor, backgroundColor:myFill, tension:0.4, pointRadius:4, borderWidth:2.5, fill:true }] : []),
        ...(othB.length && otherUID ? [{ label:`${otherAv} ${otherName}`, data:othB.map(b=>b.combined), borderColor:otherColor, backgroundColor:otherFill, tension:0.4, pointRadius:4, borderWidth:2.5, fill:true }] : []),
      ]},
      options: cpChartOptions({ yMax:100, legend:true })
    });
  }
}

// ═══════════════════════════════════════════════════════════════
//  FULL PAPER HEAD-TO-HEAD
// ═══════════════════════════════════════════════════════════════
async function renderFullComparison(el) {
  const uid       = App.currentUser.uid;
  const otherUID  = App.otherUID;
  if (!otherUID) { el.innerHTML = `<div class="empty-state"><div class="empty-icon">💕</div><p>No partner found.</p></div>`; return; }

  const myName    = App.profile?.name || 'You';
  const otherName = App.otherProfile?.name || 'Partner';
  const myAv      = avatarEmoji(App.profile?.avatar);
  const otherAv   = avatarEmoji(App.otherProfile?.avatar);
  const myColor   = 'rgba(169,151,192,1)'; const myFill = 'rgba(201,184,216,0.2)';
  const otherColor= 'rgba(212,147,154,1)'; const otherFill = 'rgba(232,180,184,0.2)';

  const [myPapers, otherPapers] = await Promise.all([fetchPapers(uid), fetchPapers(otherUID)]);
  const myBundles    = buildBundles(myPapers);
  const otherBundles = buildBundles(otherPapers);
  const sharedSubs   = App.getSharedSubjects();

  const myOA    = myBundles.filter(b=>b.combined!=null).map(b=>b.combined);
  const otherOA = otherBundles.filter(b=>b.combined!=null).map(b=>b.combined);
  const myAvg   = myOA.length ? Math.round(myOA.reduce((a,b)=>a+b,0)/myOA.length) : null;
  const otherAvg= otherOA.length ? Math.round(otherOA.reduce((a,b)=>a+b,0)/otherOA.length) : null;

  let html = `
    <div class="card mb-3" style="background:linear-gradient(135deg,rgba(201,184,216,0.12),rgba(232,180,184,0.1))">
      <div class="card-header"><div class="card-title">Overall Full Paper Average</div></div>
      <div class="grid-2">
        <div style="text-align:center;padding:1.25rem;background:rgba(201,184,216,0.2);border-radius:var(--radius-lg)">
          <div style="font-size:2rem">${myAv}</div>
          <div style="font-family:var(--font-display);font-size:2.2rem;font-weight:600;color:var(--lavender-deep)">${myAvg!=null?myAvg+'%':'—'}</div>
          <div style="font-size:0.8rem;color:var(--muted)">${myName} · ${myBundles.length} full papers</div>
        </div>
        <div style="text-align:center;padding:1.25rem;background:rgba(232,180,184,0.2);border-radius:var(--radius-lg)">
          <div style="font-size:2rem">${otherAv}</div>
          <div style="font-family:var(--font-display);font-size:2.2rem;font-weight:600;color:var(--rose-deep)">${otherAvg!=null?otherAvg+'%':'—'}</div>
          <div style="font-size:0.8rem;color:var(--muted)">${otherName} · ${otherBundles.length} full papers</div>
        </div>
      </div>
    </div>`;

  for (const sub of sharedSubs) {
    const myB  = myBundles.filter(b=>b.sub?.id===sub.id && b.combined!=null).reverse();
    const othB = otherBundles.filter(b=>b.sub?.id===sub.id && b.combined!=null).reverse();
    const mySubAvg  = myB.length ? Math.round(myB.reduce((a,b)=>a+b.combined,0)/myB.length) : null;
    const othSubAvg = othB.length ? Math.round(othB.reduce((a,b)=>a+b.combined,0)/othB.length) : null;
    const maxLen    = Math.max(myB.length, othB.length);
    html += `
      <div class="card mb-3">
        <div class="card-header flex-between">
          <div><div class="card-title">${sub.emoji} ${sub.name}</div></div>
          <div class="flex gap-1">
            <span class="badge badge-lavender">${myAv} ${mySubAvg!=null?mySubAvg+'%':'—'}</span>
            <span class="badge badge-rose">${otherAv} ${othSubAvg!=null?othSubAvg+'%':'—'}</span>
          </div>
        </div>
        ${maxLen ? `<div class="chart-container"><canvas id="fc_${sub.id}"></canvas></div>`
                 : `<p class="text-sm text-muted text-center py-4">No full papers for this subject yet</p>`}
      </div>`;
  }

  el.innerHTML = html;

  for (const sub of sharedSubs) {
    const canvas = el.querySelector(`#fc_${sub.id}`);
    if (!canvas) continue;
    const myB  = myBundles.filter(b=>b.sub?.id===sub.id && b.combined!=null).reverse();
    const othB = otherBundles.filter(b=>b.sub?.id===sub.id && b.combined!=null).reverse();
    const maxLen = Math.max(myB.length, othB.length);
    if (!maxLen) continue;
    const labels = Array.from({length:maxLen},(_,i)=>`#${i+1}`);
    new Chart(canvas, {
      type:'line',
      data:{ labels, datasets:[
        ...(myB.length?[{label:`${myAv} ${myName}`,data:myB.map(b=>b.combined),borderColor:myColor,backgroundColor:myFill,tension:0.35,pointRadius:4,borderWidth:2,fill:true}]:[]),
        ...(othB.length?[{label:`${otherAv} ${otherName}`,data:othB.map(b=>b.combined),borderColor:otherColor,backgroundColor:otherFill,tension:0.35,pointRadius:4,borderWidth:2,fill:true}]:[]),
      ]},
      options: cpChartOptions({yMax:100,legend:true})
    });
  }
}

// ═══════════════════════════════════════════════════════════════
//  INDIVIDUAL TRENDS (unchanged)
// ═══════════════════════════════════════════════════════════════
async function renderTrends(el) {
  const uid = App.currentUser.uid;
  const otherUID = App.otherUID;
  const myName = App.profile?.name || 'You';
  const otherName = App.otherProfile?.name || 'Partner';
  const myAv = avatarEmoji(App.profile?.avatar);
  const otherAv = avatarEmoji(App.otherProfile?.avatar);
  const myColor = 'rgba(169,151,192,1)'; const myFill = 'rgba(201,184,216,0.2)';
  const otherColor = 'rgba(212,147,154,1)'; const otherFill = 'rgba(232,180,184,0.2)';

  const [myAll, otherAll] = await Promise.all([
    fetchPapers(uid),
    otherUID ? fetchPapers(otherUID) : Promise.resolve([])
  ]);

  function weeklyAvgs(papers) {
    const wkMap = {};
    papers.filter(p=>p.score!=null&&p.maxScore).forEach(p => {
      const [yr,mo,dy] = p.date.split('-').map(Number);
      const d = new Date(yr,mo-1,dy); const dow = d.getDay();
      const diff = dow===0?-6:1-dow; const mon = new Date(d); mon.setDate(d.getDate()+diff);
      const key = `${mon.getFullYear()}-${String(mon.getMonth()+1).padStart(2,'0')}-${String(mon.getDate()).padStart(2,'0')}`;
      if (!wkMap[key]) wkMap[key]=[];
      wkMap[key].push(pct(p.score,p.maxScore));
    });
    return Object.entries(wkMap).sort(([a],[b])=>a>b?1:-1)
      .map(([week,scores])=>({ week, label:new Date(week).toLocaleDateString('en-GB',{day:'numeric',month:'short'}), avg:Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) }));
  }

  function rollingAvg(arr,win=3){return arr.map((_,i)=>{const s=arr.slice(Math.max(0,i-win+1),i+1).filter(v=>v!=null);return s.length?Math.round(s.reduce((a,b)=>a+b,0)/s.length):null;});}

  const myWeekly    = weeklyAvgs(myAll);
  const otherWeekly = weeklyAvgs(otherAll);
  const allWeeks    = [...new Set([...myWeekly.map(w=>w.week),...otherWeekly.map(w=>w.week)])].sort();
  const weekLabels  = allWeeks.map(w=>new Date(w).toLocaleDateString('en-GB',{day:'numeric',month:'short'}));

  const subMap = {}; [...SUBJECTS.him,...SUBJECTS.her].forEach(s=>subMap[s.id]=s);
  const mySubIds    = App.getSubjects().map(s=>s.id);
  const otherSubIds = App.otherProfile ? (App.otherProfile.stream==='her'?SUBJECTS.her:SUBJECTS.him).map(s=>s.id) : mySubIds;
  const allSubIds   = [...new Set([...mySubIds,...otherSubIds])];

  el.innerHTML = `
    <div class="card mb-3">
      <div class="card-header"><div class="card-title">📅 Weekly Overall Trend</div></div>
      <div class="chart-container chart-container-lg"><canvas id="wkOverall"></canvas></div>
    </div>
    <div class="grid-2 mb-3">
      ${allSubIds.map(sid=>{const sub=subMap[sid];return sub?`
        <div class="card">
          <div class="card-header"><div class="card-title">${sub.emoji} ${sub.name}</div><div class="card-subtitle">Weekly avg</div></div>
          <div class="chart-container chart-container-lg"><canvas id="wk_${sid}"></canvas></div>
        </div>`:''}).join('')}
    </div>
    <div class="card">
      <div class="card-header"><div class="card-title">📉 Rolling Average (3-week)</div></div>
      <div class="chart-container chart-container-lg"><canvas id="wkRoll"></canvas></div>
    </div>`;

  new Chart(el.querySelector('#wkOverall'),{type:'line',data:{labels:weekLabels,datasets:[
    {label:`${myAv} ${myName}`,data:allWeeks.map(w=>myWeekly.find(x=>x.week===w)?.avg??null),borderColor:myColor,backgroundColor:myFill,tension:0.4,pointRadius:4,borderWidth:2.5,fill:true,spanGaps:false},
    ...(otherUID?[{label:`${otherAv} ${otherName}`,data:allWeeks.map(w=>otherWeekly.find(x=>x.week===w)?.avg??null),borderColor:otherColor,backgroundColor:otherFill,tension:0.4,pointRadius:4,borderWidth:2.5,fill:true,spanGaps:false}]:[]),
  ]},options:cpChartOptions({yMax:100,legend:true})});

  for (const sid of allSubIds) {
    const canvas = el.querySelector(`#wk_${sid}`); if(!canvas) continue;
    const myWk  = weeklyAvgs(myAll.filter(p=>p.subject===sid));
    const othWk = weeklyAvgs(otherAll.filter(p=>p.subject===sid));
    const wks   = [...new Set([...myWk.map(w=>w.week),...othWk.map(w=>w.week)])].sort();
    const lbs   = wks.map(w=>new Date(w).toLocaleDateString('en-GB',{day:'numeric',month:'short'}));
    if (!wks.length) { canvas.style.display='none'; continue; }
    new Chart(canvas,{type:'line',data:{labels:lbs,datasets:[
      ...(mySubIds.includes(sid)?[{label:`${myAv} ${myName}`,data:wks.map(w=>myWk.find(x=>x.week===w)?.avg??null),borderColor:myColor,backgroundColor:myFill,tension:0.4,pointRadius:3,borderWidth:2,fill:true,spanGaps:false}]:[]),
      ...(otherSubIds.includes(sid)&&otherUID?[{label:`${otherAv} ${otherName}`,data:wks.map(w=>othWk.find(x=>x.week===w)?.avg??null),borderColor:otherColor,backgroundColor:otherFill,tension:0.4,pointRadius:3,borderWidth:2,fill:true,spanGaps:false}]:[]),
    ]},options:cpChartOptions({yMax:100,legend:true})});
  }

  const myRaw   = allWeeks.map(w=>myWeekly.find(x=>x.week===w)?.avg??null);
  const othRaw  = allWeeks.map(w=>otherWeekly.find(x=>x.week===w)?.avg??null);
  new Chart(el.querySelector('#wkRoll'),{type:'line',data:{labels:weekLabels,datasets:[
    {label:`${myAv} ${myName}`,data:rollingAvg(myRaw),borderColor:myColor,backgroundColor:'transparent',tension:0.5,pointRadius:3,borderWidth:2.5,spanGaps:false},
    ...(otherUID?[{label:`${otherAv} ${otherName}`,data:rollingAvg(othRaw),borderColor:otherColor,backgroundColor:'transparent',tension:0.5,pointRadius:3,borderWidth:2.5,spanGaps:false}]:[]),
  ]},options:cpChartOptions({yMax:100,legend:true})});
}

// ═══════════════════════════════════════════════════════════════
//  INDIVIDUAL HEAD-TO-HEAD (unchanged)
// ═══════════════════════════════════════════════════════════════
async function renderComparison(el) {
  const uid=App.currentUser.uid; const otherUID=App.otherUID;
  const myName=App.profile?.name||'You'; const otherName=App.otherProfile?.name||'Partner';
  const myAv=avatarEmoji(App.profile?.avatar); const otherAv=avatarEmoji(App.otherProfile?.avatar);
  const myColor='rgba(169,151,192,1)'; const myFill='rgba(201,184,216,0.2)';
  const otherColor='rgba(212,147,154,1)'; const otherFill='rgba(232,180,184,0.2)';
  if(!otherUID){el.innerHTML=`<div class="empty-state"><div class="empty-icon">💕</div><p>No partner yet.</p></div>`;return;}

  const [myAll, otherAll] = await Promise.all([fetchPapers(uid), fetchPapers(otherUID)]);
  const sharedSubs=App.getSharedSubjects();
  const otherSubs=App.otherProfile?(App.otherProfile.stream==='her'?SUBJECTS.her:SUBJECTS.him):App.getSubjects();
  const subMap={}; [...SUBJECTS.him,...SUBJECTS.her].forEach(s=>subMap[s.id]=s);

  function subPapers(all,sid){return all.filter(p=>p.subject===sid&&p.score!=null&&p.maxScore).sort((a,b)=>(a.date||'')>(b.date||'')?1:-1);}
  function avg(papers){return papers.length?Math.round(papers.reduce((a,p)=>a+pct(p.score,p.maxScore),0)/papers.length):null;}
  function rollingAvg(arr,win=3){return arr.map((_,i)=>{const s=arr.slice(Math.max(0,i-win+1),i+1).filter(v=>v!=null);return s.length?Math.round(s.reduce((a,b)=>a+b,0)/s.length):null;});}

  const myOA=avg(myAll.filter(p=>p.score!=null&&p.maxScore));
  const othOA=avg(otherAll.filter(p=>p.score!=null&&p.maxScore));

  let html=`
    <div class="card mb-3" style="background:linear-gradient(135deg,rgba(201,184,216,0.12),rgba(232,180,184,0.1))">
      <div class="card-header"><div class="card-title">Overall Summary</div></div>
      <div class="grid-2">
        <div style="text-align:center;padding:1.25rem;background:rgba(201,184,216,0.2);border-radius:var(--radius-lg)">
          <div style="font-size:2rem">${myAv}</div>
          <div style="font-family:var(--font-display);font-size:2.2rem;font-weight:600;color:var(--lavender-deep)">${myOA!=null?myOA+'%':'—'}</div>
          <div style="font-size:0.8rem;color:var(--muted)">${myName} · ${myAll.filter(p=>p.score!=null).length} papers</div>
        </div>
        <div style="text-align:center;padding:1.25rem;background:rgba(232,180,184,0.2);border-radius:var(--radius-lg)">
          <div style="font-size:2rem">${otherAv}</div>
          <div style="font-family:var(--font-display);font-size:2.2rem;font-weight:600;color:var(--rose-deep)">${othOA!=null?othOA+'%':'—'}</div>
          <div style="font-size:0.8rem;color:var(--muted)">${otherName} · ${otherAll.filter(p=>p.score!=null).length} papers</div>
        </div>
      </div>
    </div>`;

  const allSubs=[...new Set([...App.getSubjects().map(s=>s.id),...otherSubs.map(s=>s.id)])];
  html+=`<div class="card mb-3">
    <div class="card-header"><div class="card-title">Subject Averages</div></div>
    <div class="chart-container chart-container-lg"><canvas id="subAvgBar"></canvas></div>
  </div>`;

  for(const sub of sharedSubs){
    const myP=subPapers(myAll,sub.id); const othP=subPapers(otherAll,sub.id);
    const myA=avg(myP); const othA=avg(othP);
    let mw=0,ow=0,dr=0;
    for(let i=0;i<Math.min(myP.length,othP.length);i++){
      const ms=pct(myP[i].score,myP[i].maxScore),os=pct(othP[i].score,othP[i].maxScore);
      if(ms>os)mw++;else if(os>ms)ow++;else dr++;
    }
    const maxLen=Math.max(myP.length,othP.length);
    html+=`<div class="card mb-3">
      <div class="card-header flex-between">
        <div><div class="card-title">${sub.emoji} ${sub.name}</div><div class="card-subtitle">Score history + rolling avg</div></div>
        <div class="flex gap-1">
          <span class="badge badge-lavender">${myAv} ${mw}W</span>
          ${dr?`<span class="badge badge-muted">${dr}D</span>`:''}
          <span class="badge badge-rose">${otherAv} ${ow}W</span>
        </div>
      </div>
      <div class="grid-2 mb-2" style="gap:0.75rem">
        <div style="text-align:center;padding:0.75rem;background:rgba(201,184,216,0.15);border-radius:var(--radius-md)">
          <div style="font-family:var(--font-display);font-size:1.8rem;font-weight:600;color:var(--lavender-deep)">${myA!=null?myA+'%':'—'}</div>
          <div style="font-size:0.78rem;color:var(--muted)">${myAv} ${myName}</div>
        </div>
        <div style="text-align:center;padding:0.75rem;background:rgba(232,180,184,0.15);border-radius:var(--radius-md)">
          <div style="font-family:var(--font-display);font-size:1.8rem;font-weight:600;color:var(--rose-deep)">${othA!=null?othA+'%':'—'}</div>
          <div style="font-size:0.78rem;color:var(--muted)">${otherAv} ${otherName}</div>
        </div>
      </div>
      ${maxLen?`
        <div class="card-subtitle mb-1" style="font-size:0.75rem">Paper-by-paper</div>
        <div class="chart-container mb-3"><canvas id="h2h_${sub.id}"></canvas></div>
        <div class="card-subtitle mb-1" style="font-size:0.75rem">Rolling avg (3 papers)</div>
        <div class="chart-container"><canvas id="roll_${sub.id}"></canvas></div>
      `:`<p class="text-sm text-muted text-center py-4">No papers yet</p>`}
    </div>`;
  }

  el.innerHTML=html;

  new Chart(el.querySelector('#subAvgBar'),{type:'bar',data:{
    labels:allSubs.map(id=>`${subMap[id]?.emoji||''} ${subMap[id]?.name||id}`),
    datasets:[
      {label:`${myAv} ${myName}`,data:allSubs.map(id=>avg(subPapers(myAll,id))),backgroundColor:myFill,borderColor:myColor,borderWidth:2,borderRadius:8},
      {label:`${otherAv} ${otherName}`,data:allSubs.map(id=>avg(subPapers(otherAll,id))),backgroundColor:otherFill,borderColor:otherColor,borderWidth:2,borderRadius:8},
    ]},options:cpChartOptions({yMax:100,legend:true})});

  for(const sub of sharedSubs){
    const myP=subPapers(myAll,sub.id); const othP=subPapers(otherAll,sub.id);
    const ms=myP.map(p=>pct(p.score,p.maxScore)); const os=othP.map(p=>pct(p.score,p.maxScore));
    const maxLen=Math.max(ms.length,os.length); if(!maxLen) continue;
    const labels=Array.from({length:maxLen},(_,i)=>`#${i+1}`);
    const c1=el.querySelector(`#h2h_${sub.id}`);
    if(c1) new Chart(c1,{type:'line',data:{labels,datasets:[
      {label:`${myAv} ${myName}`,data:ms,borderColor:myColor,backgroundColor:myFill,tension:0.35,pointRadius:4,borderWidth:2,fill:true,spanGaps:false},
      {label:`${otherAv} ${otherName}`,data:os,borderColor:otherColor,backgroundColor:otherFill,tension:0.35,pointRadius:4,borderWidth:2,fill:true,spanGaps:false},
    ]},options:cpChartOptions({yMax:100,legend:true})});
    const c2=el.querySelector(`#roll_${sub.id}`);
    if(c2) new Chart(c2,{type:'line',data:{labels,datasets:[
      {label:`${myAv} ${myName}`,data:rollingAvg(ms),borderColor:myColor,backgroundColor:'transparent',tension:0.5,pointRadius:3,borderWidth:2.5,spanGaps:false},
      {label:`${otherAv} ${otherName}`,data:rollingAvg(os),borderColor:otherColor,backgroundColor:'transparent',tension:0.5,pointRadius:3,borderWidth:2.5,spanGaps:false},
    ]},options:cpChartOptions({yMax:100,legend:true})});
  }
}

// ═══════════════════════════════════════════════════════════════
//  CHART OPTIONS
// ═══════════════════════════════════════════════════════════════
function cpChartOptions({yMax=100,legend=false,yLabel='%'}={}) {
  return {
    responsive:true,maintainAspectRatio:false,
    plugins:{
      legend:{display:legend,labels:{font:{family:'DM Sans',size:11},color:'#6B4F3A',usePointStyle:true,pointStyleWidth:8}},
      tooltip:{backgroundColor:'#FFFEFB',titleColor:'#3D2B1F',bodyColor:'#6B4F3A',borderColor:'#F0EAE0',borderWidth:1,padding:10,
        titleFont:{family:'Fraunces',size:13},bodyFont:{family:'DM Sans',size:12},
        callbacks:{label:ctx=>` ${ctx.dataset.label}: ${ctx.parsed.y!=null?ctx.parsed.y+(yLabel==='%'?'%':' '+yLabel):'N/A'}`}}},
    scales:{
      y:{min:0,...(yMax?{max:yMax}:{}),ticks:{color:'#9E8A79',font:{family:'DM Sans',size:11}},grid:{color:'rgba(0,0,0,0.04)'}},
      x:{ticks:{color:'#9E8A79',font:{family:'DM Sans',size:11},maxRotation:40},grid:{display:false}}
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
    btn.disabled=true; btn.innerHTML='<span class="spinner"></span> Saving…';
    const uid=App.currentUser.uid;
    const subject=overlay.querySelector('#cp_subject').value;
    const paperType=overlay.querySelector('#cp_type').value;
    const date=overlay.querySelector('#cp_date').value;
    const score=parseFloat(overlay.querySelector('#cp_score').value)||null;
    const maxScore=parseFloat(overlay.querySelector('#cp_max').value)||null;
    const notes=overlay.querySelector('#cp_notes').value;
    const photoFile=overlay.querySelector('#cp_photo').files[0];
    let photoUrl=null; if(photoFile) photoUrl=await fileToBase64(photoFile);
    const id='cp_'+Date.now();
    await App.db.ref(`classPapers/${uid}/${id}`).set({subject,paperType,date,score,maxScore,notes,photoUrl,aiFeedback:null,createdAt:new Date().toISOString()});
    closeModal(overlay); showToast('Paper logged! 🏫','success'); App.trackStreak(); onSave();
  };
}

// ═══════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════
async function fileToBase64(file) {
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(file);});
}

async function getAIFeedback(paperId, subject, paperType, btn) {
  const apiKey=localStorage.getItem('gemini_api_key');
  if(!apiKey){showToast('Add your Gemini API key in Settings ⚙️','error');Router.go('settings');return;}
  const uid=App.currentUser.uid;
  const snap=await App.db.ref(`classPapers/${uid}/${paperId}`).once('value');
  const paper=snap.val();
  if(!paper?.photoUrl){showToast('No photo for this paper','error');return;}
  btn.disabled=true; btn.innerHTML='<span class="loading-heart" style="font-size:1rem">✨</span> Thinking…';
  try {
    const subName=[...SUBJECTS.him,...SUBJECTS.her].find(s=>s.id===subject)?.name||subject;
    const prompt=`This is a ${subName} ${paperType} answer paper by an A/L student in Sri Lanka.\n\nProvide:\n1. Overall assessment\n2. Weak areas\n3. Common mistakes\n4. Improvement advice\n5. Topics to prioritize\n\nBe encouraging and specific.`;
    const base64Data=paper.photoUrl.split(',')[1];
    const mimeType=paper.photoUrl.split(';')[0].split(':')[1];
    const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{parts:[{inlineData:{mimeType,data:base64Data}},{text:prompt}]}],generationConfig:{temperature:0.7,maxOutputTokens:1024}})
    });
    const data=await response.json();
    if(data.error) throw new Error(data.error.message);
    const feedback=data.candidates?.[0]?.content?.parts?.[0]?.text||'No feedback.';
    await App.db.ref(`classPapers/${uid}/${paperId}/aiFeedback`).set(feedback);
    const paperEl=document.querySelector(`#paper_${paperId}`);
    if(paperEl){btn.remove();const d=document.createElement('div');d.className='ai-card mt-2';
      d.innerHTML=`<div class="ai-card-header"><span style="font-size:1.2rem">✨</span><div><div class="ai-label">Gemini AI Feedback</div></div></div>
        <div style="font-size:0.875rem;color:var(--charcoal-light);white-space:pre-wrap;line-height:1.7">${feedback}</div>`;
      paperEl.appendChild(d);}
    showToast('AI feedback ready! ✨','success');
  } catch(e){showToast('AI failed: '+e.message,'error');btn.disabled=false;btn.innerHTML='✨ Get Gemini Feedback';}
}

async function deletePaper(paperId) {
  if(!confirm('Delete this paper?')) return;
  await App.db.ref(`classPapers/${App.currentUser.uid}/${paperId}`).remove();
  showToast('Deleted',''); Router.go('class-papers');
}