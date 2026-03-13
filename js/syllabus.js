// ═══════════════════════════════════════════════════════════════
//  SYLLABUS TRACKER
// ═══════════════════════════════════════════════════════════════
const STATUSES = [
  { id: 'not_started', label: 'Not Started', dot: 'dot-not-started', badge: 'badge-muted',     emoji: '○' },
  { id: 'in_progress', label: 'In Progress', dot: 'dot-in-progress', badge: 'badge-gold',      emoji: '◑' },
  { id: 'completed',   label: 'Completed',   dot: 'dot-completed',   badge: 'badge-sage',      emoji: '●' },
  { id: 'revised',     label: 'Revised',     dot: 'dot-revised',     badge: 'badge-lavender',  emoji: '★' },
];

function nextStatus(current) {
  const idx = STATUSES.findIndex(s => s.id === (current || 'not_started'));
  return STATUSES[(idx + 1) % STATUSES.length].id;
}

function statusInfo(id) {
  return STATUSES.find(s => s.id === id) || STATUSES[0];
}

// Derive chapter status from subtopics
function deriveChapterStatus(subtopics) {
  if (!subtopics || !Object.keys(subtopics).length) return null; // no subtopics, use manual
  const vals = Object.values(subtopics);
  const total = vals.length;
  const revised   = vals.filter(s => s.status === 'revised').length;
  const completed = vals.filter(s => s.status === 'completed' || s.status === 'revised').length;
  const inProgress = vals.filter(s => s.status === 'in_progress').length;
  if (revised === total)   return 'revised';
  if (completed === total) return 'completed';
  if (completed > 0 || inProgress > 0) return 'in_progress';
  return 'not_started';
}

// ═══════════════════════════════════════════════════════════════
Router.register('syllabus', (root) => {
  renderShell(root, async (content) => {
    const mySubjects = App.getSubjects();
    let activeSub = mySubjects[0].id;

    content.innerHTML = `
      <div class="page-header flex-between" style="flex-wrap:wrap;gap:1rem">
        <div>
          <h1>Syllabus Tracker 📚</h1>
          <p>Track every topic and subtopic</p>
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
        <div class="loading-state"><div class="loading-heart">📚</div><p>Loading…</p></div>
      </div>
    `;

    content.querySelector('#addChapterBtn').onclick = () =>
      openAddChapterModal(activeSub, () => renderSyllabus());

    content.querySelectorAll('#subTabs .tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activeSub = tab.dataset.sub;
        content.querySelectorAll('#subTabs .tab').forEach(t =>
          t.classList.toggle('active', t.dataset.sub === activeSub));
        renderSyllabus();
      });
    });

    async function renderSyllabus() {
      const uid  = App.currentUser.uid;
      const snap = await App.db.ref(`syllabus/${uid}/${activeSub}`).once('value');
      const raw  = snap.val() || {};
      const list = Object.entries(raw).map(([id, v]) => ({ id, ...v }))
                         .sort((a,b) => (a.order||0) - (b.order||0) || a.createdAt?.localeCompare(b.createdAt||''));

      const el      = content.querySelector('#sylContent');
      const subInfo = mySubjects.find(s => s.id === activeSub);

      // Compute per-chapter effective status & overall progress
      const chapterStatuses = list.map(ch => {
        const hasSubs = ch.subtopics && Object.keys(ch.subtopics).length > 0;
        return hasSubs ? deriveChapterStatus(ch.subtopics) : (ch.status || 'not_started');
      });
      const total    = list.length;
      const done     = chapterStatuses.filter(s => s === 'completed' || s === 'revised').length;
      const pctDone  = total ? Math.round((done / total) * 100) : 0;

      // Overall subtopic progress
      let totalSubs = 0, doneSubs = 0;
      list.forEach(ch => {
        if (ch.subtopics) {
          Object.values(ch.subtopics).forEach(st => {
            totalSubs++;
            if (st.status === 'completed' || st.status === 'revised') doneSubs++;
          });
        }
      });

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
            <p>No chapters yet.<br>Tap <strong>Add Chapter</strong> to begin!</p>
          </div>`;
        return;
      }

      el.innerHTML = `
        <!-- Overall progress card -->
        <div class="card mb-3">
          <div class="flex-between mb-2">
            <div>
              <div class="card-title">${subInfo?.emoji} ${subInfo?.name}</div>
              <div class="card-subtitle">${done}/${total} chapters covered${totalSubs ? ` · ${doneSubs}/${totalSubs} subtopics` : ''}</div>
            </div>
            <span class="badge badge-${subInfo?.color}" style="font-size:0.85rem">${pctDone}%</span>
          </div>
          <div class="progress-bar" style="height:10px;margin-bottom:0.5rem">
            <div class="progress-fill progress-${subInfo?.color}" style="width:${pctDone}%"></div>
          </div>
          ${totalSubs ? `
            <div class="progress-bar" style="height:6px;background:rgba(0,0,0,0.06)">
              <div class="progress-fill progress-lavender" style="width:${Math.round(doneSubs/totalSubs*100)}%;background:var(--lavender)"></div>
            </div>
            <div class="text-sm text-muted mt-1">Subtopic progress: ${Math.round(doneSubs/totalSubs*100)}%</div>
          ` : ''}
          <div class="flex gap-2 mt-2" style="flex-wrap:wrap">
            ${STATUSES.map(s => {
              const count = chapterStatuses.filter(cs => cs === s.id).length;
              return count ? `<span class="badge ${s.badge}">${count} ${s.label}</span>` : '';
            }).join('')}
          </div>
        </div>

        <!-- Chapter list -->
        <div class="flex-col gap-2" id="chapterList">
          ${list.map((ch, i) => renderChapterCard(ch, chapterStatuses[i], subInfo?.color)).join('')}
        </div>
      `;

      wireChapterEvents(el, list, activeSub, () => renderSyllabus());
    }

    renderSyllabus();
  });
});

// ═══════════════════════════════════════════════════════════════
//  CHAPTER CARD RENDERER
// ═══════════════════════════════════════════════════════════════
function renderChapterCard(ch, effectiveStatus, color) {
  const st      = statusInfo(effectiveStatus);
  const hasSubs = ch.subtopics && Object.keys(ch.subtopics).length > 0;
  const subs    = hasSubs
    ? Object.entries(ch.subtopics).map(([id, v]) => ({ id, ...v })).sort((a,b) => (a.order||0)-(b.order||0))
    : [];
  const isOpen  = hasSubs; // start expanded if has subtopics

  return `
    <div class="card syllabus-chapter" id="chcard_${ch.id}" style="padding:0;overflow:hidden">

      <!-- Chapter header -->
      <div class="syllabus-ch-header" style="display:flex;align-items:center;gap:0.75rem;padding:0.9rem 1rem;cursor:pointer"
           data-toggle="${ch.id}">
        <div class="status-dot ${st.dot}" style="flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-weight:600;font-size:0.93rem">${ch.name}</div>
          ${hasSubs ? `
            <div class="text-sm text-muted">
              ${subs.filter(s=>s.status==='completed'||s.status==='revised').length}/${subs.length} subtopics done
            </div>
          ` : `<div class="text-sm text-muted">No subtopics</div>`}
        </div>
        <span class="badge ${st.badge}" style="flex-shrink:0">${st.emoji} ${st.label}</span>
        ${!hasSubs ? `
          <button class="btn btn-ghost btn-icon syl-status-btn" data-id="${ch.id}" data-current="${ch.status||'not_started'}"
                  style="font-size:0.7rem;padding:0.25rem 0.5rem;color:var(--muted)" title="Cycle status" onclick="event.stopPropagation()">
            ↻
          </button>
        ` : ''}
        <button class="btn btn-ghost btn-icon syl-edit-btn" data-id="${ch.id}"
                style="font-size:0.8rem;padding:0.25rem 0.5rem;color:var(--muted)" title="Edit chapter" onclick="event.stopPropagation()">
          ✏️
        </button>
        <button class="btn btn-ghost btn-icon syl-del-btn" data-id="${ch.id}"
                style="font-size:0.8rem;padding:0.25rem 0.5rem;color:var(--muted)" title="Delete chapter" onclick="event.stopPropagation()">
          ✕
        </button>
        ${hasSubs ? `<span class="syl-chevron" data-toggle="${ch.id}" style="font-size:0.75rem;color:var(--muted);flex-shrink:0">▼</span>` : ''}
      </div>

      <!-- Subtopics panel -->
      ${hasSubs ? `
        <div class="syl-subtopics" id="subs_${ch.id}" style="border-top:1px solid var(--border-light);padding:0.5rem 0.75rem 0.75rem">

          ${subs.map(sub => {
            const ss = statusInfo(sub.status || 'not_started');
            return `
              <div class="syl-sub-row" id="subrow_${sub.id}" style="display:flex;align-items:center;gap:0.6rem;padding:0.45rem 0.25rem;border-bottom:1px solid rgba(0,0,0,0.04)">
                <div class="status-dot ${ss.dot}" style="width:9px;height:9px;flex-shrink:0"></div>
                <div style="flex:1;font-size:0.875rem">${sub.name}</div>
                <button class="btn btn-ghost sub-status-btn" data-chid="${ch.id}" data-subid="${sub.id}" data-current="${sub.status||'not_started'}"
                        style="font-size:0.72rem;padding:0.2rem 0.5rem;border-radius:999px" title="Click to cycle">
                  ${ss.emoji} ${ss.label}
                </button>
                <button class="btn btn-ghost btn-icon sub-del-btn" data-chid="${ch.id}" data-subid="${sub.id}"
                        style="font-size:0.7rem;padding:0.15rem 0.4rem;color:var(--muted)">✕</button>
              </div>
            `;
          }).join('')}

          <!-- Add subtopic inline -->
          <div style="display:flex;gap:0.5rem;margin-top:0.6rem;align-items:center">
            <input class="input sub-add-input" data-chid="${ch.id}" placeholder="Add subtopic…"
                   style="flex:1;font-size:0.82rem;padding:0.35rem 0.65rem;height:auto" />
            <button class="btn btn-sage btn-sm sub-add-btn" data-chid="${ch.id}"
                    style="padding:0.35rem 0.75rem;font-size:0.8rem">Add</button>
          </div>
        </div>
      ` : `
        <!-- No subtopics: show add-first prompt -->
        <div style="padding:0.5rem 1rem 0.75rem">
          <div style="display:flex;gap:0.5rem;align-items:center">
            <input class="input sub-add-input" data-chid="${ch.id}" placeholder="Add first subtopic…"
                   style="flex:1;font-size:0.82rem;padding:0.35rem 0.65rem;height:auto" />
            <button class="btn btn-sage btn-sm sub-add-btn" data-chid="${ch.id}"
                    style="padding:0.35rem 0.75rem;font-size:0.8rem">Add</button>
          </div>
        </div>
      `}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════
//  WIRE EVENTS
// ═══════════════════════════════════════════════════════════════
function wireChapterEvents(el, list, subjectId, refresh) {
  const uid = App.currentUser.uid;
  const base = `syllabus/${uid}/${subjectId}`;

  // Expand/collapse
  el.querySelectorAll('[data-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const chId  = btn.dataset.toggle;
      const panel = el.querySelector(`#subs_${chId}`);
      const chev  = el.querySelector(`.syl-chevron[data-toggle="${chId}"]`);
      if (!panel) return;
      const open = panel.style.display !== 'none';
      panel.style.display = open ? 'none' : '';
      if (chev) chev.textContent = open ? '▶' : '▼';
    });
  });

  // Chapter status cycle (only for chapters with NO subtopics)
  el.querySelectorAll('.syl-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const next = nextStatus(btn.dataset.current);
      await App.db.ref(`${base}/${btn.dataset.id}/status`).set(next);
      refresh();
    });
  });

  // Chapter edit
  el.querySelectorAll('.syl-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const ch = list.find(c => c.id === btn.dataset.id);
      if (ch) openEditChapterModal(ch, subjectId, refresh);
    });
  });

  // Chapter delete
  el.querySelectorAll('.syl-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this chapter and all its subtopics?')) return;
      await App.db.ref(`${base}/${btn.dataset.id}`).remove();
      refresh();
    });
  });

  // Subtopic status cycle
  el.querySelectorAll('.sub-status-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const next = nextStatus(btn.dataset.current);
      await App.db.ref(`${base}/${btn.dataset.chid}/subtopics/${btn.dataset.subid}/status`).set(next);
      refresh();
      App.trackStreak();
    });
  });

  // Subtopic delete
  el.querySelectorAll('.sub-del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('Remove this subtopic?')) return;
      await App.db.ref(`${base}/${btn.dataset.chid}/subtopics/${btn.dataset.subid}`).remove();
      refresh();
    });
  });

  // Add subtopic inline
  el.querySelectorAll('.sub-add-btn').forEach(btn => {
    btn.addEventListener('click', () => addSubtopic(btn.dataset.chid));
  });
  el.querySelectorAll('.sub-add-input').forEach(inp => {
    inp.addEventListener('keydown', e => {
      if (e.key === 'Enter') addSubtopic(inp.dataset.chid);
    });
  });

  async function addSubtopic(chId) {
    const inp  = el.querySelector(`.sub-add-input[data-chid="${chId}"]`);
    const name = inp?.value.trim();
    if (!name) return;
    const id = 'st_' + Date.now();
    await App.db.ref(`${base}/${chId}/subtopics/${id}`).set({
      name, status: 'not_started', order: Date.now(), createdAt: new Date().toISOString()
    });
    inp.value = '';
    refresh();
  }
}

// ═══════════════════════════════════════════════════════════════
//  ADD CHAPTER MODAL
// ═══════════════════════════════════════════════════════════════
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
        <textarea class="input" id="ch_subtopics" rows="5"
                  placeholder="Alkanes&#10;Alkenes&#10;Alkynes&#10;Alcohols"></textarea>
        <small style="color:var(--muted);font-size:0.77rem">You can also add subtopics after saving</small>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="mCancel">Cancel</button>
      <button class="btn btn-sage" id="mSave">Add Chapter</button>
    </div>
  `);

  overlay.querySelector('#mClose').onclick  = () => closeModal(overlay);
  overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);

  overlay.querySelector('#mSave').onclick = async () => {
    const name = overlay.querySelector('#ch_name').value.trim();
    if (!name) { showToast('Please enter a chapter name', 'error'); return; }
    const uid   = App.currentUser.uid;
    const lines = overlay.querySelector('#ch_subtopics').value.trim();
    const names = lines ? lines.split('\n').map(s => s.trim()).filter(Boolean) : [];

    const subtopics = {};
    names.forEach((n, i) => {
      const id = 'st_' + (Date.now() + i);
      subtopics[id] = { name: n, status: 'not_started', order: i, createdAt: new Date().toISOString() };
    });

    const id = 'ch_' + Date.now();
    await App.db.ref(`syllabus/${uid}/${subjectId}/${id}`).set({
      name,
      subtopics: names.length ? subtopics : null,
      status: 'not_started',
      order: Date.now(),
      createdAt: new Date().toISOString()
    });

    closeModal(overlay);
    showToast('Chapter added! 📚', 'success');
    onSave();
  };
}

// ═══════════════════════════════════════════════════════════════
//  EDIT CHAPTER MODAL — rename + manage subtopics list
// ═══════════════════════════════════════════════════════════════
function openEditChapterModal(ch, subjectId, onSave) {
  const subs = ch.subtopics
    ? Object.entries(ch.subtopics).map(([id, v]) => ({ id, ...v })).sort((a,b)=>(a.order||0)-(b.order||0))
    : [];

  const overlay = openModal(`
    <div class="modal-header">
      <div class="modal-title">Edit Chapter ✏️</div>
      <button class="modal-close" id="mClose">✕</button>
    </div>
    <div class="modal-body">
      <div class="input-group">
        <label class="input-label">Chapter Name</label>
        <input class="input" type="text" id="edit_ch_name" value="${ch.name}" />
      </div>

      <div class="input-group">
        <label class="input-label">Subtopics</label>
        <div id="editSubList" class="flex-col gap-1 mb-2">
          ${subs.map(s => `
            <div class="flex gap-1" id="esub_${s.id}" style="align-items:center">
              <input class="input esub-name" data-subid="${s.id}" value="${s.name}"
                     style="flex:1;font-size:0.83rem;padding:0.3rem 0.6rem;height:auto" />
              <button class="btn btn-ghost btn-icon esub-del" data-subid="${s.id}"
                      style="padding:0.25rem 0.5rem;color:var(--muted);font-size:0.8rem">✕</button>
            </div>
          `).join('')}
        </div>
        <div class="flex gap-1">
          <input class="input" id="newSubInput" placeholder="Add subtopic…"
                 style="flex:1;font-size:0.83rem;padding:0.35rem 0.65rem;height:auto" />
          <button class="btn btn-ghost btn-sm" id="addSubInEdit" style="padding:0.35rem 0.65rem;font-size:0.8rem">+ Add</button>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="mCancel">Cancel</button>
      <button class="btn btn-sage" id="mSave">Save Changes</button>
    </div>
  `);

  overlay.querySelector('#mClose').onclick  = () => closeModal(overlay);
  overlay.querySelector('#mCancel').onclick = () => closeModal(overlay);

  // Delete sub from edit modal
  overlay.querySelectorAll('.esub-del').forEach(btn => {
    btn.addEventListener('click', () => {
      overlay.querySelector(`#esub_${btn.dataset.subid}`)?.remove();
    });
  });

  // Add sub inline in edit modal
  function addSubInModal() {
    const inp = overlay.querySelector('#newSubInput');
    const val = inp.value.trim();
    if (!val) return;
    const fakeId = 'new_' + Date.now();
    const row = document.createElement('div');
    row.className = 'flex gap-1';
    row.id = `esub_${fakeId}`;
    row.style.alignItems = 'center';
    row.innerHTML = `
      <input class="input esub-name" data-subid="${fakeId}" value="${val}"
             style="flex:1;font-size:0.83rem;padding:0.3rem 0.6rem;height:auto" data-isnew="true" />
      <button class="btn btn-ghost btn-icon esub-del" data-subid="${fakeId}"
              style="padding:0.25rem 0.5rem;color:var(--muted);font-size:0.8rem">✕</button>
    `;
    row.querySelector('.esub-del').addEventListener('click', () => row.remove());
    overlay.querySelector('#editSubList').appendChild(row);
    inp.value = '';
  }
  overlay.querySelector('#addSubInEdit').onclick = addSubInModal;
  overlay.querySelector('#newSubInput').addEventListener('keydown', e => { if (e.key === 'Enter') addSubInModal(); });

  // Save
  overlay.querySelector('#mSave').onclick = async () => {
    const uid     = App.currentUser.uid;
    const newName = overlay.querySelector('#edit_ch_name').value.trim();
    if (!newName) { showToast('Chapter name required', 'error'); return; }

    // Build new subtopics object from remaining rows
    const rows      = overlay.querySelectorAll('.esub-name');
    const newSubs   = {};
    let order = 0;
    rows.forEach(inp => {
      const subName = inp.value.trim();
      if (!subName) return;
      const isNew = inp.dataset.isnew === 'true';
      const subId = isNew ? ('st_' + Date.now() + order) : inp.dataset.subid;
      // Preserve existing status for old subtopics
      const existingSub = subs.find(s => s.id === inp.dataset.subid);
      newSubs[subId] = {
        name: subName,
        status: existingSub?.status || 'not_started',
        order: order++,
        createdAt: existingSub?.createdAt || new Date().toISOString()
      };
    });

    await App.db.ref(`syllabus/${uid}/${subjectId}/${ch.id}`).update({
      name: newName,
      subtopics: Object.keys(newSubs).length ? newSubs : null
    });

    closeModal(overlay);
    showToast('Chapter updated! ✏️', 'success');
    onSave();
  };
}