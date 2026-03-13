// ═══════════════════════════════════════════════════════════════
//  CLASS PAPERS TRACKER
// ═══════════════════════════════════════════════════════════════
Router.register('class-papers', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let activeTab = 'mine'; // 'mine' | 'compare'

    content.innerHTML = `
      <div class="page-header flex-between" style="flex-wrap:wrap;gap:1rem">
        <div>
          <h1>Class Papers 🏫</h1>
          <p>Log your weekly class papers and get AI feedback</p>
        </div>
        <button class="btn btn-rose" id="addPaperBtn">➕ Log Paper</button>
      </div>

      <div class="tabs">
        <button class="tab active" data-tab="mine">My Papers</button>
        <button class="tab" data-tab="compare">📊 Head-to-Head</button>
      </div>

      <div id="classContent">
        <div class="loading-state"><div class="loading-heart">🏫</div><p>Loading papers…</p></div>
      </div>
    `;

    content.querySelector('#addPaperBtn').onclick = () => openAddPaperModal(mySubjects, () => renderTab());

    content.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeTab = tab.dataset.tab;
        content.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === activeTab));
        renderTab();
      });
    });

    async function renderTab() {
      const el = content.querySelector('#classContent');
      if (activeTab === 'mine') {
        await renderMyPapers(el);
      } else {
        await renderComparison(el);
      }
    }

    renderTab();
  });
});

async function renderMyPapers(el) {
  const uid = App.currentUser.uid;
  const snap = await App.db.ref(`classPapers/${uid}`).orderByChild('date').once('value');
  const papers = [];
  snap.forEach(child => papers.unshift({ id: child.key, ...child.val() }));

  if (!papers.length) {
    el.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📄</div>
        <p>No class papers logged yet.<br>Tap <strong>Log Paper</strong> to add your first one!</p>
      </div>
    `;
    return;
  }

  el.innerHTML = `
    <div class="flex-col gap-2">
      ${papers.map(p => {
        const pct_val = p.score && p.maxScore ? pct(p.score, p.maxScore) : null;
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
              <div style="text-align:right">
                ${pct_val != null
                  ? `<div class="score-big" style="color:${scoreColor(pct_val)}">${p.score}<span style="font-size:1rem;color:var(--muted)">/${p.maxScore}</span></div>
                     <div class="score-label">${pct_val}%</div>`
                  : `<div class="text-muted">—</div>`
                }
              </div>
            </div>

            ${p.photoUrl ? `
              <div class="mt-2">
                <img src="${p.photoUrl}" alt="Paper" style="max-width:100%;border-radius:var(--radius-md);max-height:200px;object-fit:cover" />
              </div>
            ` : ''}

            ${p.aiFeedback ? `
              <div class="ai-card mt-2">
                <div class="ai-card-header">
                  <span style="font-size:1.2rem">✨</span>
                  <div>
                    <div class="ai-label">Gemini AI Feedback</div>
                  </div>
                </div>
                <div style="font-size:0.875rem;color:var(--charcoal-light);white-space:pre-wrap;line-height:1.7">${p.aiFeedback}</div>
              </div>
            ` : p.photoUrl ? `
              <button class="btn btn-ghost btn-sm mt-2" onclick="getAIFeedback('${p.id}', '${p.subject}', '${p.paperType || 'Paper 1'}', '${p.photoUrl}', this)">
                ✨ Get Gemini Feedback
              </button>
            ` : ''}

            <div class="flex gap-1 mt-2">
              <button class="btn btn-ghost btn-sm" onclick="deletePaper('${p.id}')">🗑 Delete</button>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

async function renderComparison(el) {
  const uid = App.currentUser.uid;
  const otherUID = App.otherUID;
  const sharedSubjects = App.getSharedSubjects();
  const myName = App.profile?.name || 'You';
  const otherName = App.otherProfile?.name || 'Partner';

  if (!otherUID) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">💕</div><p>No partner found yet!</p></div>`;
    return;
  }

  const [mySnap, otherSnap] = await Promise.all([
    App.db.ref(`classPapers/${uid}`).once('value'),
    App.db.ref(`classPapers/${otherUID}`).once('value'),
  ]);

  const myAll = mySnap.val() || {};
  const otherAll = otherSnap.val() || {};

  let html = `<div class="flex-col gap-3">`;

  for (const sub of sharedSubjects) {
    const myPapers = Object.values(myAll).filter(p => p.subject === sub.id && p.score && p.maxScore);
    const otherPapers = Object.values(otherAll).filter(p => p.subject === sub.id && p.score && p.maxScore);

    const myAvg = myPapers.length ? Math.round(myPapers.reduce((a, p) => a + pct(p.score, p.maxScore), 0) / myPapers.length) : null;
    const otherAvg = otherPapers.length ? Math.round(otherPapers.reduce((a, p) => a + pct(p.score, p.maxScore), 0) / otherPapers.length) : null;

    // Last 5 papers for chart
    const myRecent = myPapers.slice(-5).map(p => pct(p.score, p.maxScore));
    const otherRecent = otherPapers.slice(-5).map(p => pct(p.score, p.maxScore));

    html += `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${sub.emoji} ${sub.name}</div>
        </div>
        <div class="grid-2 mb-3">
          <div style="text-align:center;padding:1rem;background:rgba(201,184,216,0.15);border-radius:var(--radius-md)">
            <div class="score-big" style="color:var(--lavender-deep)">${myAvg != null ? myAvg + '%' : '—'}</div>
            <div class="score-label">${myName}'s avg</div>
          </div>
          <div style="text-align:center;padding:1rem;background:rgba(232,180,184,0.15);border-radius:var(--radius-md)">
            <div class="score-big" style="color:var(--rose-deep)">${otherAvg != null ? otherAvg + '%' : '—'}</div>
            <div class="score-label">${otherName}'s avg</div>
          </div>
        </div>
        ${myRecent.length + otherRecent.length > 0 ? `
          <div class="chart-container">
            <canvas id="chart_${sub.id}"></canvas>
          </div>
        ` : `<p class="text-sm text-muted text-center">No data yet for this subject</p>`}
      </div>
    `;
  }

  html += `</div>`;
  el.innerHTML = html;

  // Render charts
  for (const sub of sharedSubjects) {
    const canvas = el.querySelector(`#chart_${sub.id}`);
    if (!canvas) continue;
    const myPapers = Object.values(myAll).filter(p => p.subject === sub.id && p.score && p.maxScore);
    const otherPapers = Object.values(otherAll).filter(p => p.subject === sub.id && p.score && p.maxScore);
    const labels = Array.from({ length: Math.max(myPapers.length, otherPapers.length) }, (_, i) => `Paper ${i+1}`);

    new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: App.profile?.name || 'You',
            data: myPapers.map(p => pct(p.score, p.maxScore)),
            borderColor: 'rgba(169, 151, 192, 0.9)',
            backgroundColor: 'rgba(201,184,216,0.15)',
            tension: 0.4, pointRadius: 4, borderWidth: 2, fill: true,
          },
          {
            label: App.otherProfile?.name || 'Partner',
            data: otherPapers.map(p => pct(p.score, p.maxScore)),
            borderColor: 'rgba(212, 147, 154, 0.9)',
            backgroundColor: 'rgba(232,180,184,0.15)',
            tension: 0.4, pointRadius: 4, borderWidth: 2, fill: true,
          }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { labels: { font: { family: 'DM Sans' }, color: '#3D2B1F' } } },
        scales: {
          y: { min: 0, max: 100, ticks: { color: '#9E8A79' }, grid: { color: 'rgba(0,0,0,0.04)' } },
          x: { ticks: { color: '#9E8A79' }, grid: { display: false } }
        }
      }
    });
  }
}

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
          ${mySubjects.map(s => `<option value="${s.id}">${s.emoji} ${s.name}</option>`).join('')}
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
          <input class="input" type="number" id="cp_max" placeholder="e.g. 50" value="50" />
        </div>
      </div>
      <div class="input-group">
        <label class="input-label">Notes (optional)</label>
        <input class="input" type="text" id="cp_notes" placeholder="Any thoughts…" />
      </div>
      <div class="input-group">
        <label class="input-label">Upload Paper Photo (for AI feedback)</label>
        <input class="input" type="file" id="cp_photo" accept="image/*" />
        <small>Photo will be stored as base64. Gemini will analyze your answers.</small>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="mCancel">Cancel</button>
      <button class="btn btn-rose" id="mSave">Save Paper</button>
    </div>
  `);

  overlay.querySelector('#mClose').onclick = () => closeModal(overlay);
  overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);

  overlay.querySelector('#mSave').onclick = async () => {
    const uid = App.currentUser.uid;
    const subject = overlay.querySelector('#cp_subject').value;
    const paperType = overlay.querySelector('#cp_type').value;
    const date = overlay.querySelector('#cp_date').value;
    const score = parseFloat(overlay.querySelector('#cp_score').value) || null;
    const maxScore = parseFloat(overlay.querySelector('#cp_max').value) || null;
    const notes = overlay.querySelector('#cp_notes').value;
    const photoFile = overlay.querySelector('#cp_photo').files[0];

    const btn = overlay.querySelector('#mSave');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Saving…';

    let photoUrl = null;
    if (photoFile) {
      // Convert to base64 for storage
      photoUrl = await fileToBase64(photoFile);
    }

    const id = 'cp_' + Date.now();
    const entry = { subject, paperType, date, score, maxScore, notes, photoUrl, aiFeedback: null, createdAt: new Date().toISOString() };
    await App.db.ref(`classPapers/${uid}/${id}`).set(entry);

    closeModal(overlay);
    showToast('Paper logged! 🏫', 'success');
    App.trackStreak();
    onSave();
  };
}

async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function getAIFeedback(paperId, subject, paperType, photoUrl, btn) {
  // Get Gemini API key from localStorage or Firebase settings
  const apiKey = localStorage.getItem('gemini_api_key');
  if (!apiKey) {
    showToast('Please add your Gemini API key in Settings ⚙️', 'error');
    Router.go('settings');
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<span class="loading-heart" style="font-size:1rem">✨</span> Gemini is thinking…';

  try {
    const subName = [...SUBJECTS.him, ...SUBJECTS.her].find(s => s.id === subject)?.name || subject;
    const prompt = `This is a ${subName} ${paperType} answer paper by an A/L student in Sri Lanka preparing for the GCE Advanced Level examination. 

Please analyze their answers visible in this image and provide:
1. **Overall assessment** of their performance
2. **Specific weak areas** you can identify from the answers
3. **Common mistakes** they are making
4. **Personalized improvement advice** with specific study tips
5. **Topics to prioritize** before the next paper

Be encouraging, specific, and constructive. Write in a warm, supportive tone.`;

    // Gemini 2.5 Flash API call
    const base64Data = photoUrl.split(',')[1];
    const mimeType = photoUrl.split(';')[0].split(':')[1];

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 1024 }
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const feedback = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No feedback generated.';

    // Save feedback
    const uid = App.currentUser.uid;
    await App.db.ref(`classPapers/${uid}/${paperId}/aiFeedback`).set(feedback);

    // Update UI
    const paperEl = document.querySelector(`#paper_${paperId}`);
    if (paperEl) {
      btn.closest('.card').querySelector('.btn-ghost.btn-sm')?.remove();
      const aiDiv = document.createElement('div');
      aiDiv.className = 'ai-card mt-2';
      aiDiv.innerHTML = `
        <div class="ai-card-header">
          <span style="font-size:1.2rem">✨</span>
          <div><div class="ai-label">Gemini AI Feedback</div></div>
        </div>
        <div style="font-size:0.875rem;color:var(--charcoal-light);white-space:pre-wrap;line-height:1.7">${feedback}</div>
      `;
      paperEl.appendChild(aiDiv);
    }

    showToast('AI feedback ready! ✨', 'success');
  } catch (e) {
    showToast('AI feedback failed: ' + e.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '✨ Get Gemini Feedback';
  }
}

async function deletePaper(paperId) {
  if (!confirm('Delete this paper entry?')) return;
  const uid = App.currentUser.uid;
  await App.db.ref(`classPapers/${uid}/${paperId}`).remove();
  showToast('Paper deleted', '');
  Router.go('class-papers');
}
