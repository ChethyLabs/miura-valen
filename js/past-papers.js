// ═══════════════════════════════════════════════════════════════
//  PAST PAPERS TRACKER — with trend charts
// ═══════════════════════════════════════════════════════════════
Router.register('past-papers', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let activeSubject = mySubjects[0].id;
    let activeRound = 'Round 1';
    let activeView = 'grid'; // 'grid' | 'trends'

    content.innerHTML = `
      <div class="page-header">
        <h1>Past Papers 📋</h1>
        <p>Track your progress through 2000–2025 exam papers</p>
      </div>

      <div class="tabs" id="viewTabs" style="margin-bottom:0.75rem">
        <button class="tab active" data-view="grid">📋 Grid View</button>
        <button class="tab" data-view="trends">📈 Trends</button>
      </div>

      <div class="tabs" id="subjectTabs">
        ${mySubjects.map(s => `
          <button class="tab ${s.id === activeSubject ? 'active' : ''}" data-sub="${s.id}">
            ${s.emoji} ${s.name}
          </button>
        `).join('')}
      </div>

      <div class="tabs" id="roundTabs">
        ${ROUNDS.map(r => `
          <button class="tab ${r === activeRound ? 'active' : ''}" data-round="${r}">${r}</button>
        `).join('')}
      </div>

      <div id="paperGrid">
        <div class="loading-state"><div class="loading-heart">📋</div><p>Loading papers…</p></div>
      </div>
    `;

    content.querySelectorAll('#viewTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeView = tab.dataset.view;
        content.querySelectorAll('#viewTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.view === activeView));
        content.querySelector('#roundTabs').style.display = activeView === 'trends' ? 'none' : '';
        render();
      });
    });

    content.querySelectorAll('#subjectTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeSubject = tab.dataset.sub;
        content.querySelectorAll('#subjectTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.sub === activeSubject));
        render();
      });
    });

    content.querySelectorAll('#roundTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeRound = tab.dataset.round;
        content.querySelectorAll('#roundTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.round === activeRound));
        render();
      });
    });

    function render() {
      if (activeView === 'grid') renderGrid();
      else renderTrends();
    }

    // ══════════════════════════════════════
    //  GRID VIEW
    // ══════════════════════════════════════
    async function renderGrid() {
      const uid = App.currentUser.uid;
      const snap = await App.db.ref(`pastPapers/${uid}/${activeSubject}`).once('value');
      const data = snap.val() || {};
      const papers = PAPER_TYPES[activeSubject] || [{ id: 'p1', name: 'Paper 1', max: 100 }, { id: 'p2', name: 'Paper 2', max: 100 }];
      const roundKey = activeRound.replace(' ', '');
      const subInfo = mySubjects.find(s => s.id === activeSubject);

      const done = YEARS.filter(y => data[y]?.[roundKey]?.overallScore != null);
      const scores = done.map(y => data[y][roundKey].overallScore);
      const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      const best = scores.length ? Math.max(...scores) : null;

      const gridEl = content.querySelector('#paperGrid');
      gridEl.innerHTML = `
        <div class="flex gap-2 mb-3" style="flex-wrap:wrap">
          <div class="card card-sm flex-center gap-2" style="flex:1;min-width:100px">
            <span style="font-size:1.3rem">📅</span>
            <div>
              <div style="font-weight:700;font-size:1.1rem">${done.length}<span style="font-size:0.8rem;color:var(--muted)">/${YEARS.length}</span></div>
              <div class="text-sm text-muted">Done</div>
            </div>
          </div>
          <div class="card card-sm flex-center gap-2" style="flex:1;min-width:100px">
            <span style="font-size:1.3rem">📊</span>
            <div>
              <div style="font-weight:700;font-size:1.1rem;color:${avg != null ? scoreColor(avg) : 'var(--muted)'}">
                ${avg != null ? avg + '%' : '—'}
              </div>
              <div class="text-sm text-muted">Average</div>
            </div>
          </div>
          <div class="card card-sm flex-center gap-2" style="flex:1;min-width:100px">
            <span style="font-size:1.3rem">🏆</span>
            <div>
              <div style="font-weight:700;font-size:1.1rem;color:${best != null ? scoreColor(best) : 'var(--muted)'}">
                ${best != null ? best + '%' : '—'}
              </div>
              <div class="text-sm text-muted">Best</div>
            </div>
          </div>
          <div class="card card-sm flex-center gap-2" style="flex:1;min-width:100px">
            <span style="font-size:1.3rem">📈</span>
            <div>
              <div style="font-weight:700;font-size:1.1rem">${Math.round((done.length / YEARS.length) * 100)}%</div>
              <div class="text-sm text-muted">Complete</div>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="flex-between mb-2" style="flex-wrap:wrap;gap:0.5rem">
            <div>
              <div class="card-title">${subInfo?.emoji} ${subInfo?.name} — ${activeRound}</div>
              <div class="card-subtitle">Click any row to log or edit an attempt</div>
            </div>
            <div class="flex gap-1" style="flex-wrap:wrap">
              <span class="chip">⬜ Not done</span>
              <span class="chip" style="background:rgba(212,168,83,0.15);border-color:var(--gold)">🟡 In progress</span>
              <span class="chip" style="background:rgba(168,197,160,0.2);border-color:var(--sage-deep)">🟢 Done</span>
            </div>
          </div>
          <div class="paper-grid">
            <table>
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

      gridEl.querySelectorAll('.paper-row').forEach(row => {
        row.addEventListener('click', () => {
          openPaperModal(activeSubject, parseInt(row.dataset.year), activeRound, data[row.dataset.year]?.[activeRound.replace(' ','')] || {}, render);
        });
      });
    }

    // ══════════════════════════════════════
    //  TRENDS VIEW
    // ══════════════════════════════════════
    async function renderTrends() {
      const uid = App.currentUser.uid;
      const otherUID = App.otherUID;
      const subInfo = mySubjects.find(s => s.id === activeSubject);
      const myName = App.profile?.name || 'You';
      const otherName = App.otherProfile?.name || 'Partner';
      const papers = PAPER_TYPES[activeSubject] || [{ id: 'p1', name: 'Paper 1', max: 100 }, { id: 'p2', name: 'Paper 2', max: 100 }];

      const gridEl = content.querySelector('#paperGrid');
      gridEl.innerHTML = `<div class="loading-state"><div class="loading-heart">📈</div><p>Loading trend data…</p></div>`;

      const [mySnap, otherSnap] = await Promise.all([
        App.db.ref(`pastPapers/${uid}/${activeSubject}`).once('value'),
        otherUID ? App.db.ref(`pastPapers/${otherUID}/${activeSubject}`).once('value') : Promise.resolve({ val: () => null }),
      ]);
      const myData = mySnap.val() || {};
      const otherData = otherSnap?.val() || {};

      function buildDataset(data, round) {
        const rk = round.replace(' ', '');
        return YEARS
          .filter(y => data[y]?.[rk]?.overallScore != null)
          .map(y => ({ year: y, score: data[y][rk].overallScore }));
      }

      function roundAvgs(data) {
        return ROUNDS.map(r => {
          const pts = buildDataset(data, r);
          return pts.length ? Math.round(pts.reduce((a, b) => a + b.score, 0) / pts.length) : null;
        });
      }

      const myAvgs = roundAvgs(myData);
      const otherAvgs = roundAvgs(otherData);
      const myColor = 'rgba(169,151,192,1)';
      const myFill = 'rgba(201,184,216,0.2)';
      const otherColor = 'rgba(212,147,154,1)';
      const otherFill = 'rgba(232,180,184,0.2)';

      gridEl.innerHTML = `
        <!-- Round improvement -->
        <div class="card mb-3">
          <div class="card-header">
            <div class="card-title">${subInfo?.emoji} ${subInfo?.name} — Average Score Per Round</div>
            <div class="card-subtitle">Showing how you're both improving across revision rounds</div>
          </div>
          <div class="chart-container chart-container-lg">
            <canvas id="roundChart"></canvas>
          </div>
        </div>

        <!-- Per-round year trends -->
        <div class="card mb-3">
          <div class="card-header">
            <div class="card-title">Year-by-Year Scores</div>
            <div class="card-subtitle">Select a round to see scores across all years</div>
          </div>
          <div class="tabs" id="trendRoundTabs" style="margin-bottom:1rem">
            ${ROUNDS.map((r, i) => `<button class="tab ${i===0?'active':''}" data-ri="${i}">${r}</button>`).join('')}
          </div>
          <div class="chart-container chart-container-lg">
            <canvas id="yearTrendChart"></canvas>
          </div>
        </div>

        <!-- Paper 1 vs Paper 2 -->
        <div class="grid-2 mb-3">
          <div class="card">
            <div class="card-header">
              <div class="card-title">${avatarEmoji(App.profile?.avatar)} ${myName} — Paper Breakdown</div>
              <div class="card-subtitle">${papers[0]?.name} vs ${papers[1]?.name} avg per round</div>
            </div>
            <div class="chart-container chart-container-lg">
              <canvas id="myBreakdown"></canvas>
            </div>
          </div>
          ${otherUID ? `
          <div class="card">
            <div class="card-header">
              <div class="card-title">${avatarEmoji(App.otherProfile?.avatar)} ${otherName} — Paper Breakdown</div>
              <div class="card-subtitle">${papers[0]?.name} vs ${papers[1]?.name} avg per round</div>
            </div>
            <div class="chart-container chart-container-lg">
              <canvas id="otherBreakdown"></canvas>
            </div>
          </div>
          ` : ''}
        </div>

        <!-- Completion race -->
        <div class="card">
          <div class="card-header">
            <div class="card-title">Completion Race 🏁</div>
            <div class="card-subtitle">Papers completed per round out of ${YEARS.length}</div>
          </div>
          <div class="chart-container">
            <canvas id="completionChart"></canvas>
          </div>
        </div>
      `;

      // ── Chart 1: Round avgs bar ──
      new Chart(gridEl.querySelector('#roundChart'), {
        type: 'bar',
        data: {
          labels: ROUNDS,
          datasets: [
            { label: myName, data: myAvgs, backgroundColor: myFill, borderColor: myColor, borderWidth: 2, borderRadius: 8 },
            ...(otherUID ? [{ label: otherName, data: otherAvgs, backgroundColor: otherFill, borderColor: otherColor, borderWidth: 2, borderRadius: 8 }] : []),
          ]
        },
        options: ppChartOptions({ yMax: 100, legend: true })
      });

      // ── Chart 2: Year-by-year with round switcher ──
      let yearChart = null;
      function renderYearTrend(roundIdx) {
        const round = ROUNDS[roundIdx];
        const myPts = buildDataset(myData, round);
        const otherPts = buildDataset(otherData, round);
        const allYears = [...new Set([...myPts.map(p => p.year), ...otherPts.map(p => p.year)])].sort();
        const canvas = gridEl.querySelector('#yearTrendChart');
        if (yearChart) { yearChart.destroy(); yearChart = null; }
        if (!allYears.length) {
          const sub = canvas?.parentElement?.querySelector('.card-subtitle');
          if (sub) sub.textContent = 'No data logged yet for this round';
          if (canvas) canvas.style.display = 'none';
          return;
        }
        yearChart = new Chart(canvas, {
          type: 'line',
          data: {
            labels: allYears,
            datasets: [
              { label: myName, data: allYears.map(y => myPts.find(p=>p.year===y)?.score ?? null), borderColor: myColor, backgroundColor: myFill, tension: 0.35, pointRadius: 4, borderWidth: 2.5, fill: true, spanGaps: false },
              ...(otherUID ? [{ label: otherName, data: allYears.map(y => otherPts.find(p=>p.year===y)?.score ?? null), borderColor: otherColor, backgroundColor: otherFill, tension: 0.35, pointRadius: 4, borderWidth: 2.5, fill: true, spanGaps: false }] : []),
            ]
          },
          options: ppChartOptions({ yMax: 100, legend: true })
        });
      }

      renderYearTrend(0);
      gridEl.querySelectorAll('#trendRoundTabs .tab').forEach(tab => {
        tab.addEventListener('click', () => {
          gridEl.querySelectorAll('#trendRoundTabs .tab').forEach(t => t.classList.toggle('active', t === tab));
          renderYearTrend(parseInt(tab.dataset.ri));
        });
      });

      // ── Chart 3 & 4: Paper breakdown ──
      function buildBreakdown(data) {
        const p1 = ROUNDS.map(r => {
          const rk = r.replace(' ', '');
          const pts = YEARS.filter(y => data[y]?.[rk]?.paper1Score != null).map(y => pct(data[y][rk].paper1Score, papers[0]?.max || 100));
          return pts.length ? Math.round(pts.reduce((a,b) => a+b, 0) / pts.length) : null;
        });
        const p2 = ROUNDS.map(r => {
          const rk = r.replace(' ', '');
          const pts = YEARS.filter(y => data[y]?.[rk]?.paper2Score != null).map(y => pct(data[y][rk].paper2Score, papers[1]?.max || 100));
          return pts.length ? Math.round(pts.reduce((a,b) => a+b, 0) / pts.length) : null;
        });
        return { p1, p2 };
      }

      const myBD = buildBreakdown(myData);
      new Chart(gridEl.querySelector('#myBreakdown'), {
        type: 'bar',
        data: {
          labels: ROUNDS,
          datasets: [
            { label: papers[0]?.name || 'Paper 1', data: myBD.p1, backgroundColor: 'rgba(168,197,160,0.5)', borderColor: 'rgba(126,168,118,1)', borderWidth: 2, borderRadius: 6 },
            { label: papers[1]?.name || 'Paper 2', data: myBD.p2, backgroundColor: 'rgba(201,184,216,0.5)', borderColor: 'rgba(168,151,192,1)', borderWidth: 2, borderRadius: 6 },
          ]
        },
        options: ppChartOptions({ yMax: 100, legend: true })
      });

      if (otherUID && gridEl.querySelector('#otherBreakdown')) {
        const otherBD = buildBreakdown(otherData);
        new Chart(gridEl.querySelector('#otherBreakdown'), {
          type: 'bar',
          data: {
            labels: ROUNDS,
            datasets: [
              { label: papers[0]?.name || 'Paper 1', data: otherBD.p1, backgroundColor: 'rgba(212,168,83,0.3)', borderColor: 'rgba(184,144,62,1)', borderWidth: 2, borderRadius: 6 },
              { label: papers[1]?.name || 'Paper 2', data: otherBD.p2, backgroundColor: 'rgba(232,180,184,0.5)', borderColor: 'rgba(212,147,154,1)', borderWidth: 2, borderRadius: 6 },
            ]
          },
          options: ppChartOptions({ yMax: 100, legend: true })
        });
      }

      // ── Chart 5: Completion race ──
      new Chart(gridEl.querySelector('#completionChart'), {
        type: 'bar',
        data: {
          labels: ROUNDS,
          datasets: [
            { label: myName, data: ROUNDS.map(r => buildDataset(myData, r).length), backgroundColor: myFill, borderColor: myColor, borderWidth: 2, borderRadius: 6 },
            ...(otherUID ? [{ label: otherName, data: ROUNDS.map(r => buildDataset(otherData, r).length), backgroundColor: otherFill, borderColor: otherColor, borderWidth: 2, borderRadius: 6 }] : []),
          ]
        },
        options: ppChartOptions({ yMax: YEARS.length, legend: true, yLabel: 'Papers' })
      });
    }

    render();
  });
});

// ── Chart options factory ──
function ppChartOptions({ yMax = 100, legend = false, yLabel = '%' } = {}) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: legend,
        labels: { font: { family: 'DM Sans', size: 12 }, color: '#6B4F3A', usePointStyle: true, pointStyleWidth: 8 }
      },
      tooltip: {
        backgroundColor: '#FFFEFB', titleColor: '#3D2B1F', bodyColor: '#6B4F3A',
        borderColor: '#F0EAE0', borderWidth: 1, padding: 10,
        titleFont: { family: 'Fraunces', size: 13 },
        bodyFont: { family: 'DM Sans', size: 12 },
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y != null ? ctx.parsed.y + (yLabel === '%' ? '%' : ' papers') : 'N/A'}` }
      }
    },
    scales: {
      y: {
        min: 0, max: yMax,
        ticks: { color: '#9E8A79', font: { family: 'DM Sans', size: 11 } },
        grid: { color: 'rgba(0,0,0,0.04)' }
      },
      x: {
        ticks: { color: '#9E8A79', font: { family: 'DM Sans', size: 11 }, maxRotation: 30 },
        grid: { display: false }
      }
    }
  };
}

// ── Log paper modal ──
function openPaperModal(subjectId, year, round, existing, onSave) {
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
        <label class="input-label">Overall % (auto-calculated if blank)</label>
        <input class="input" type="number" id="score_overall" min="0" max="100"
          placeholder="e.g. 72" value="${existing.overallScore ?? ''}" />
      </div>
      <div class="input-group">
        <label class="input-label">Date Completed</label>
        <input class="input" type="date" id="date_done"
          value="${existing.dateCompleted?.split('T')[0] || new Date().toISOString().split('T')[0]}" />
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

    if (!overall && p1 && p2) {
      const maxTotal = papers.reduce((a, p) => a + p.max, 0);
      overall = Math.round(((parseFloat(p1)||0) + (parseFloat(p2)||0)) / maxTotal * 100);
    }

    await App.db.ref(`pastPapers/${uid}/${subjectId}/${year}/${roundKey}`).set({
      paper1Score: p1 ? parseFloat(p1) : null,
      paper2Score: p2 ? parseFloat(p2) : null,
      overallScore: overall ? parseFloat(overall) : null,
      dateCompleted: overlay.querySelector('#date_done').value,
      notes: overlay.querySelector('#notes_field').value,
    });

    closeModal(overlay);
    showToast('Paper logged! 📋', 'success');
    App.trackStreak();
    if (onSave) onSave();
  };
}