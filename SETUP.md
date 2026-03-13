# StudyTogether — Setup Guide 🌸

## Quick Start

1. **Firebase Setup** (5 min)
2. **Get Gemini API Key** (free, 2 min)
3. **Deploy to GitHub Pages** (5 min)

---

## 1. Firebase Setup

### Create a Firebase Project
1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Click **Add project** → name it (e.g. `study-together`)
3. Disable Google Analytics (optional)

### Enable Authentication
1. In your project → **Authentication** → **Get started**
2. Sign-in method → **Email/Password** → Enable
3. **Users** tab → **Add user** → add two accounts (one for each of you)

### Enable Realtime Database
1. **Realtime Database** → **Create database**
2. Choose your region (e.g. `us-central1`)
3. Start in **test mode** (we'll add rules below)

### Add Security Rules
In Realtime Database → **Rules**, paste:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    },
    "pastPapers": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    },
    "classPapers": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    },
    "syllabus": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    },
    "classifiedQuestions": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    },
    "tutes": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    },
    "sharedNotes": {
      ".read": "auth != null",
      ".write": "auth != null"
    }
  }
}
```

### Get Your Config
1. Project Settings (⚙️ icon) → **General** → scroll to **Your apps**
2. Click **</>** (Web app) → register your app
3. Copy the `firebaseConfig` object

### Add Config to the App
Open `js/app.js` and replace the `FIREBASE_CONFIG` at the top:

```javascript
const FIREBASE_CONFIG = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc..."
};
```

---

## 2. Get a Free Gemini API Key

1. Go to [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Click **Create API key**
3. Copy your key (starts with `AIza...`)
4. In the app: **Settings ⚙️** → paste key → **Save API Key**

The app uses **Gemini 2.5 Flash** — it's free to use and extremely capable for analyzing your answer papers!

---

## 3. Deploy to GitHub Pages

### Option A: Simple (no build step needed)
1. Create a new GitHub repo
2. Upload all files from this folder to the repo
3. Go to repo **Settings** → **Pages**
4. Source: **Deploy from branch** → `main` → `/ (root)`
5. Your app will be live at `https://yourusername.github.io/repo-name`

### Option B: Using gh-pages branch
```bash
git init
git add .
git commit -m "Initial StudyTogether app"
git remote add origin https://github.com/you/study-together.git
git push -u origin main
```

Then in GitHub: Settings → Pages → Deploy from `main` branch, root folder.

---

## File Structure

```
study-together/
├── index.html          ← Main entry point
├── css/
│   └── style.css       ← All styles
├── js/
│   ├── app.js          ← Firebase config, router, app state
│   ├── shell.js        ← Sidebar navigation
│   ├── auth.js         ← Login & onboarding
│   ├── dashboard.js    ← Dashboard page
│   ├── past-papers.js  ← Past papers grid tracker
│   ├── class-papers.js ← Class papers + AI feedback
│   ├── syllabus.js     ← Syllabus tracker
│   └── pages.js        ← Classified Q&A, Tutes, Couple's Corner, Settings, Stats
└── SETUP.md            ← This file
```

---

## Using the App

### First Login
1. Log in with the email/password you created in Firebase Auth
2. Set your name, choose your stream (Physical or Biological Sciences), pick an avatar
3. Your partner does the same on their account

### Daily Usage
- **Dashboard**: See each other's progress at a glance
- **Past Papers**: Track your 2000–2025 paper attempts by year and round
- **Class Papers**: Log weekly papers, upload photos for Gemini AI feedback
- **Syllabus**: Mark chapters as you cover them
- **Classified Q&A**: Track topic-wise question completion
- **Couple's Corner**: Leave notes for each other, see streaks

### AI Feedback
When logging a class paper, upload a photo of your written answers. After saving, tap **✨ Get Gemini Feedback** to get personalized analysis of your answers, weak spots, and improvement tips.

---

*Built with 💕 for two people studying hard together. Good luck with your A/Ls! 🌸*
