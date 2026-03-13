// ═══════════════════════════════════════════════════════════════
//  PAST PAPERS TRACKER
// ═══════════════════════════════════════════════════════════════
Router.register('past-papers', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let activeSubject = mySubjects[0].id;
    let activeRound = 'Round 1';

    content.innerHTML = `
      <div class="page-header">
        <h1>Past Papers 📋</h1>
        <p>Track your progress through 2000–2025 exam papers</p>
      </div>

      <!-- Subject tabs -->
      <div class="tabs" id="subjectTabs">
        ${mySubjects.map(s => `
          <button class="tab ${s.id === activeSubject ? 'active' : ''}" data-sub="${s.id}">
            ${s.emoji} ${s.name}
          </button>
        `).join('')}
      </div>

      <!-- Round tabs -->
      <div class="tabs" id="roundTabs">
        ${ROUNDS.map(r => `
          <button class="tab ${r === activeRound ? 'active' : ''}" data-round="${r}">${r}</button>
        `).join('')}
      </div>

      <div id="paperGrid">
        <div class="loading-state"><div class="loading-heart">📋</div><p>Loading papers…</p></div>
      </div>
    `;

    async function renderGrid() {
      const uid = App.currentUser.uid;
      const snap = await App.db.ref(`pastPapers/${uid}/${activeSubject}`).once('value');
      const data = snap.val() || {};

      const papers = PAPER_TYPES[activeSubject] || [{ id: 'p1', name: 'Paper 1', max: 100 }, { id: 'p2', name: 'Paper 2', max: 100 }];
      const roundKey = activeRound.replace(' ', '');

      const gridEl = content.querySelector('#paperGrid');
      gridEl.innerHTML = `
        <div class="card">
          <div class="flex-between mb-2">
            <div>
              <div class="card-title">${mySubjects.find(s=>s.id===activeSubject)?.emoji} ${mySubjects.find(s=>s.id===activeSubject)?.name} — ${activeRound}</div>
              <div class="card-subtitle">${YEARS.length} years × click any cell to log an attempt</div>
            </div>
            <div class="flex gap-1">
              <span class="chip">⬜ Not done</span>
              <span class="chip" style="background:rgba(212,168,83,0.15);border-color:var(--gold)">🟡 In progress</span>
              <span class="chip" style="background:rgba(168,197,160,0.2);border-color:var(--sage-deep)">🟢 Done</span>
            </div>
          </div>

          <div class="paper-grid">
            <table id="gridTable">
              <thead>
                <tr>
                  <th>Year</th>
                  ${papers.map(p => `<th>${p.name}</th>`).join('')}
                  <th>Overall</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                ${YEARS.map(year => {
                  const entry = data[year]?.[roundKey] || {};
                  const p1 = entry.paper1Score;
                  const p2 = entry.paper2Score;
                  const overall = entry.overallScore;
                  const status = overall != null ? 'done' : (p1 != null || p2 != null) ? 'progress' : 'empty';
                  return `
                    <tr style="cursor:pointer" data-year="${year}" class="paper-row">
                      <td style="font-weight:600;font-size:0.85rem;padding:0.5rem;white-space:nowrap">${year}</td>
                      ${papers.map((p, i) => {
                        const score = i === 0 ? p1 : p2;
                        const pctVal = score != null ? pct(score, p.max) : null;
                        return `
                          <td class="paper-cell-${status}" title="${score != null ? `${score}/${p.max} (${pctVal}%)` : 'Not done'}" style="text-align:center">
                            <span style="font-size:0.72rem;font-weight:600;color:${pctVal != null ? scoreColor(pctVal) : 'var(--muted)'}">
                              ${score != null ? score : ''}
                            </span>
                          </td>
                        `;
                      }).join('')}
                      <td style="text-align:center;font-size:0.8rem;font-weight:600;color:${overall != null ? scoreColor(overall) : 'var(--muted)'}">
                        ${overall != null ? overall + '%' : '—'}
                      </td>
                      <td style="font-size:0.75rem;color:var(--muted);padding:0 0.5rem;white-space:nowrap">
                        ${entry.dateCompleted ? formatDate(entry.dateCompleted) : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      // Click row to log
      gridEl.querySelectorAll('.paper-row').forEach(row => {
        row.addEventListener('click', () => {
          openPaperModal(activeSubject, parseInt(row.dataset.year), activeRound, data[row.dataset.year]?.[activeRound.replace(' ','')] || {});
        });
      });
    }

    // Subject tab switch
    content.querySelectorAll('#subjectTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeSubject = tab.dataset.sub;
        content.querySelectorAll('#subjectTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.sub === activeSubject));
        renderGrid();
      });
    });

    // Round tab switch
    content.querySelectorAll('#roundTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeRound = tab.dataset.round;
        content.querySelectorAll('#roundTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.round === activeRound));
        renderGrid();
      });
    });

    renderGrid();
  });
});

function openPaperModal(subjectId, year, round, existing) {
  const papers = PAPER_TYPES[subjectId] || [{ id: 'p1', name: 'Paper 1', max: 100 }, { id: 'p2', name: 'Paper 2', max: 100 }];
  const sub = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === subjectId);

  const overlay = openModal(`
    <div class="modal-header">
      <div class="modal-title">${sub?.emoji || '📋'} ${year} — ${round}</div>
      <button class="modal-close" id="mClose">✕</button>
    </div>
    <div class="modal-body">
      ${papers.map((p, i) => `
        <div class="input-group">
          <label class="input-label">${p.name} (out of ${p.max})</label>
          <input class="input" type="number" id="score_${i}" min="0" max="${p.max}"
            placeholder="Score…" value="${i === 0 ? (existing.paper1Score ?? '') : (existing.paper2Score ?? '')}" />
        </div>
      `).join('')}
      <div class="input-group">
        <label class="input-label">Overall % (optional — auto-calculated if left blank)</label>
        <input class="input" type="number" id="score_overall" min="0" max="100"
          placeholder="e.g. 72" value="${existing.overallScore ?? ''}" />
      </div>
      <div class="input-group">
        <label class="input-label">Date Completed</label>
        <input class="input" type="date" id="date_done" value="${existing.dateCompleted?.split('T')[0] || new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="input-group">
        <label class="input-label">Notes (optional)</label>
        <textarea class="input" id="notes_field" placeholder="Any thoughts…">${existing.notes || ''}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="mCancel">Cancel</button>
      <button class="btn btn-sage" id="mSave">Save ✓</button>
    </div>
  `);

  overlay.querySelector('#mClose').onclick = () => closeModal(overlay);
  overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);

  overlay.querySelector('#mSave').onclick = async () => {
    const uid = App.currentUser.uid;
    const roundKey = round.replace(' ', '');
    const p1 = overlay.querySelector('#score_0')?.value;
    const p2 = overlay.querySelector('#score_1')?.value;
    let overall = overlay.querySelector('#score_overall')?.value;

    // Auto-calculate overall if not set
    if (!overall && p1 && p2) {
      const maxTotal = papers.reduce((a, p) => a + p.max, 0);
      const scoreTotal = (parseFloat(p1) || 0) + (parseFloat(p2) || 0);
      overall = Math.round((scoreTotal / maxTotal) * 100);
    }

    const entry = {
      paper1Score: p1 ? parseFloat(p1) : null,
      paper2Score: p2 ? parseFloat(p2) : null,
      overallScore: overall ? parseFloat(overall) : null,
      dateCompleted: overlay.querySelector('#date_done').value,
      notes: overlay.querySelector('#notes_field').value,
    };

    await App.db.ref(`pastPapers/${uid}/${subjectId}/${year}/${roundKey}`).set(entry);
    closeModal(overlay);
    showToast('Paper logged! 📋', 'success');
    App.trackStreak();
    Router.go('past-papers');
  };
}
