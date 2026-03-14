# 📖 Miura Valen — A/L Study Tracker

A couples study companion for Sri Lankan GCE Advanced Level students. Track papers, monitor progress, and study together — with AI-powered feedback and shared visibility into each other's work.

> Built for two students: him (Physical Sciences — Maths, Chemistry, Physics) and her (Biological Sciences — Biology, Chemistry, Physics).

---

## 🏠 Dashboard

- Partner's note to you, displayed on load
- Shared couple goals banner with inline edit link
- Write a note to your partner directly from the dashboard
- This week's paper count — you vs partner
- Study streak tracker with longest streak record
- Who's leading this week indicator
- Syllabus progress bars per subject
- Stale-while-revalidate cache — renders instantly from localStorage, refreshes in background

---

## 🏫 Class Papers

- Log papers with score, date, subject, and paper type
- Multi-photo upload per paper (auto-compressed to max 1200px, JPEG 72%)
- Two modes:
  - **Individual Papers** — log and view single papers
  - **Full Papers** — bundle P1 + P2 into a combined result
- Bundle P1 + P2 with equal-weighted combined % (each paper contributes 50% regardless of max marks)
- Weekly grouped paper cards
- View your partner's papers side-by-side
- Trends charts with rolling averages per subject
- Head-to-head comparison for shared subjects (Chemistry, Physics)
- In-memory + localStorage cache — tab switches are instant

---

## ✨ AI Feedback (Gemini Vision)

- Sends all uploaded paper photos to Gemini 2.5 Flash
- Strict prompt — only reports mistakes visibly present on the paper, no hallucination
- Structured output in four sections:
  - **Mistakes** — specific questions/errors observed
  - **Lessons** — key concepts to revise
  - **Patterns** — recurring error types
  - **Next Steps** — actionable revision with chapter/topic names
- Past mistake history sent as context so Gemini can spot recurring patterns
- AI-extracted lessons automatically saved to the Mistake Log
- Collapsible feedback card attached to the paper
- Auto-retry up to 3 times on 503 with exponential backoff
- Bring your own Gemini API key (stored in localStorage)

---

## 🔍 Mistake Log

- Per-subject running log of mistakes and lessons
- AI-extracted lessons saved automatically after every feedback session
- Manual multi-line entry — one line per mistake, all saved as separate entries
- Source picker for manual entries:
  - Link to a logged class paper
  - Link to a past paper (year + round + paper type)
  - Free text
- Source shown as clickable label on the mistake card, navigates to the relevant page
- Mark mistakes as addressed (✓) or reopen (↩)
- Delete individual entries
- Progress bar showing % of mistakes addressed per subject
- Unresolved mistakes shown at top; addressed ones collapse into a details section
- View your partner's mistake log (read-only)
- Shared Metrics tab:
  - Side-by-side summary cards for both users
  - Per-subject dual progress bars
  - Bar chart comparing mistakes logged per subject
  - Recent AI-extracted lessons feed for both users

---

## 📋 Past Papers

- Grid view: 2000–2025 × 4 rounds, per subject
- Colour-coded cells by score range
- Log score, round, year, and paper type
- Trends tab — progress charted over years
- View partner's past paper grid

---

## 📚 Syllabus Tracker

- Chapters with subtopics per subject
- 4-state status cycle per subtopic: ○ not started → ◑ in progress → ● done → ★ revised
- Chapter status auto-derived from subtopic statuses
- Dual progress bars: chapter-level and subtopic-level
- Add, edit, and delete subtopics inline
- Progress visible on dashboard

---

## 💕 Couple's Corner

- Set and edit shared study goals — visible to both users
- Write notes to each other, shown on each other's dashboard
- Real-time Firebase listener — updates without refresh

---

## 📝 Classified Q&A + Tutorials

- Log classified questions by subject and topic
- Track tutorial sheets with completion status

---

## ⚙️ Technical

| | |
|---|---|
| **Frontend** | Vanilla HTML, CSS, JavaScript — no framework |
| **Backend** | Firebase Realtime Database |
| **Auth** | Firebase Authentication (email + password) |
| **AI** | Gemini 2.5 Flash via Google Generative Language API |
| **Charts** | Chart.js |
| **Fonts** | Fraunces (display) + DM Sans (body) |
| **PWA** | Installable on phone and desktop |
| **Offline** | Service worker — JS/HTML always network-first, CSS/fonts cached |
| **Caching** | localStorage-backed stale-while-revalidate via `AppCache` |
| **Photos** | Compressed client-side before upload (canvas resize + JPEG 72%) |
| **Partner sync** | Partner discovery via shared `/partnerIndex` Firebase node |
| **Hosting** | GitHub Pages |

---

## 📐 Subjects

| Subject | Him | Her | Shared |
|---|---|---|---|
| Chemistry | ✓ | ✓ | ✓ |
| Physics | ✓ | ✓ | ✓ |
| Combined Maths | ✓ | — | — |
| Biology | — | ✓ | — |

---

## 🗄️ Firebase Data Structure

```
/users/{uid}/profile
/users/{uid}/streaks
/partnerIndex/{uid}
/classPapers/{uid}/{paperId}
/pastPapers/{uid}/{paperId}
/syllabus/{uid}/{subjectId}/{chapterId}
/mistakeLog/{uid}/{subjectId}/{entryId}
/sharedNotes/note1
/sharedNotes/note2
/sharedNotes/goals
/classifiedQuestions/{uid}/{id}
/tutes/{uid}/{id}
```

---
