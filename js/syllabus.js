// ═══════════════════════════════════════════════════════════════
//  SYLLABUS TRACKER
// ═══════════════════════════════════════════════════════════════
const STATUSES = [
  { id: 'not_started', label: 'Not Started', dot: 'dot-not-started', badge: 'badge-muted' },
  { id: 'in_progress', label: 'In Progress', dot: 'dot-in-progress', badge: 'badge-gold' },
  { id: 'completed', label: 'Completed', dot: 'dot-completed', badge: 'badge-sage' },
  { id: 'revised', label: 'Revised', dot: 'dot-revised', badge: 'badge-lavender' },
];

Router.register('syllabus', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let activeSub = mySubjects[0].id;

    content.innerHTML = `
      <div class="page-header flex-between" style="flex-wrap:wrap;gap:1rem">
        <div>
          <h1>Syllabus Tracker 📚</h1>
          <p>Track what you've covered chapter by chapter</p>
        </div>
        <button class="btn btn-rose" id="addChapterBtn">➕ Add Chapter</button>
      </div>

      <div class="tabs" id="subTabs">
        ${mySubjects.map(s => `
          <button class="tab ${s.id === activeSub ? 'active' : ''}" data-sub="${s.id}">
            ${s.emoji} ${s.name}
          </button>
        `).join('')}
      </div>

      <div id="sylContent">
        <div class="loading-state"><div class="loading-heart">📚</div><p>Loading syllabus…</p></div>
      </div>
    `;

    async function renderSyllabus() {
      const uid = App.currentUser.uid;
      const snap = await App.db.ref(`syllabus/${uid}/${activeSub}`).once('value');
      const chapters = snap.val() || {};
      const list = Object.entries(chapters).map(([id, v]) => ({ id, ...v }));
      const el = content.querySelector('#sylContent');

      const subInfo = mySubjects.find(s => s.id === activeSub);
      const total = list.length;
      const done = list.filter(c => c.status === 'completed' || c.status === 'revised').length;
      const pctDone = total ? Math.round((done / total) * 100) : 0;

      if (!total) {
        el.innerHTML = `
          <div class="card mb-3">
            <div class="flex-between mb-2">
              <div class="card-title">${subInfo?.emoji} ${subInfo?.name}</div>
              <span class="badge badge-muted">0%</span>
            </div>
            <div class="progress-bar"><div class="progress-fill progress-${subInfo?.color}" style="width:0%"></div></div>
          </div>
          <div class="empty-state">
            <div class="empty-icon">📚</div>
            <p>No chapters yet.<br>Tap <strong>Add Chapter</strong> to get started!</p>
          </div>
        `;
        return;
      }

      el.innerHTML = `
        <div class="card mb-3">
          <div class="flex-between mb-2">
            <div>
              <div class="card-title">${subInfo?.emoji} ${subInfo?.name}</div>
              <div class="card-subtitle">${done}/${total} chapters covered</div>
            </div>
            <span class="badge badge-${subInfo?.color}" style="font-size:0.85rem">${pctDone}%</span>
          </div>
          <div class="progress-bar" style="height:10px">
            <div class="progress-fill progress-${subInfo?.color}" style="width:${pctDone}%"></div>
          </div>
          <div class="flex gap-2 mt-2" style="flex-wrap:wrap">
            ${STATUSES.map(s => {
              const count = list.filter(c => c.status === s.id || (!c.status && s.id === 'not_started')).length;
              return `<span class="badge ${s.badge}">${count} ${s.label}</span>`;
            }).join('')}
          </div>
        </div>

        <div class="flex-col gap-2" id="chapterList">
          ${list.map(ch => renderChapterItem(ch, subInfo?.color)).join('')}
        </div>
      `;

      // Wire up status change buttons
      el.querySelectorAll('.status-cycle-btn').forEach(btn => {
        btn.addEventListener('click', () => cycleStatus(btn.dataset.id, btn.dataset.current));
      });
      el.querySelectorAll('.ch-delete').forEach(btn => {
        btn.addEventListener('click', () => deleteChapter(btn.dataset.id));
      });
    }

    content.querySelector('#addChapterBtn').onclick = () => {
      openAddChapterModal(activeSub, () => renderSyllabus());
    };

    content.querySelectorAll('#subTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeSub = tab.dataset.sub;
        content.querySelectorAll('#subTabs .tab').forEach(t => t.classList.toggle('active', t.dataset.sub === activeSub));
        renderSyllabus();
      });
    });

    async function cycleStatus(chapterId, currentStatus) {
      const uid = App.currentUser.uid;
      const idx = STATUSES.findIndex(s => s.id === (currentStatus || 'not_started'));
      const next = STATUSES[(idx + 1) % STATUSES.length].id;
      await App.db.ref(`syllabus/${uid}/${activeSub}/${chapterId}/status`).set(next);
      renderSyllabus();
    }

    async function deleteChapter(chapterId) {
      if (!confirm('Delete this chapter?')) return;
      const uid = App.currentUser.uid;
      await App.db.ref(`syllabus/${uid}/${activeSub}/${chapterId}`).remove();
      renderSyllabus();
    }

    renderSyllabus();
  });
});

function renderChapterItem(ch, color) {
  const st = STATUSES.find(s => s.id === (ch.status || 'not_started')) || STATUSES[0];
  return `
    <div class="syllabus-item">
      <div class="status-dot ${st.dot}"></div>
      <div style="flex:1">
        <div style="font-weight:500;font-size:0.9rem">${ch.name}</div>
        ${ch.subtopics?.length ? `<div class="text-sm text-muted">${ch.subtopics.length} subtopics</div>` : ''}
      </div>
      <span class="badge ${st.badge} status-cycle-btn" data-id="${ch.id}" data-current="${ch.status || 'not_started'}" style="cursor:pointer" title="Click to cycle status">
        ${st.label}
      </span>
      <button class="btn btn-ghost btn-icon ch-delete" data-id="${ch.id}" style="font-size:0.8rem;padding:0.3rem 0.5rem;color:var(--muted)">✕</button>
    </div>
  `;
}

function openAddChapterModal(subjectId, onSave) {
  const overlay = openModal(`
    <div class="modal-header">
      <div class="modal-title">Add Chapter 📚</div>
      <button class="modal-close" id="mClose">✕</button>
    </div>
    <div class="modal-body">
      <div class="input-group">
        <label class="input-label">Chapter Name</label>
        <input class="input" type="text" id="ch_name" placeholder="e.g. Organic Chemistry" />
      </div>
      <div class="input-group">
        <label class="input-label">Subtopics (one per line, optional)</label>
        <textarea class="input" id="ch_subtopics" placeholder="Alkanes&#10;Alkenes&#10;Alkynes"></textarea>
      </div>
      <div class="input-group">
        <label class="input-label">Initial Status</label>
        <select class="input" id="ch_status">
          ${STATUSES.map(s => `<option value="${s.id}">${s.label}</option>`).join('')}
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="mCancel">Cancel</button>
      <button class="btn btn-sage" id="mSave">Add Chapter</button>
    </div>
  `);

  overlay.querySelector('#mClose').onclick = () => closeModal(overlay);
  overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);
  overlay.querySelector('#mSave').onclick = async () => {
    const name = overlay.querySelector('#ch_name').value.trim();
    if (!name) { showToast('Please enter a chapter name', 'error'); return; }
    const uid = App.currentUser.uid;
    const subtopicsText = overlay.querySelector('#ch_subtopics').value.trim();
    const subtopics = subtopicsText ? subtopicsText.split('\n').map(s => s.trim()).filter(Boolean) : [];
    const status = overlay.querySelector('#ch_status').value;
    const id = 'ch_' + Date.now();
    await App.db.ref(`syllabus/${uid}/${subjectId}/${id}`).set({ name, subtopics, status, createdAt: new Date().toISOString() });
    closeModal(overlay);
    showToast('Chapter added! 📚', 'success');
    onSave();
  };
}
