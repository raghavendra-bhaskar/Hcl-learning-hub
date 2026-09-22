# HCL Software Learning Hub — Project Overview

> **Internal gamified learning platform for HCL Software teams.**
> Features a modern React SPA frontend with Okta OIDC & local auth, a Node.js / TypeScript / Prisma / PostgreSQL backend API, and a full dynamic course management system.
> **Repository:** https://github.com/raghavendra-bhaskar/Hcl-learning-hub

---

## What Is This Project?

The **HCL Software Learning Hub** is a scenario-based, gamified training platform that teaches real-world technical skills through interactive quests. Engineers complete bite-sized quests (8–20 minutes each), earn XP and badges, level up their commander, take hands-on CNAPP labs, and track team progress on a live leaderboard.

It is modelled after the IBM Cloud Quest style of gamification — with a Solution Center (Learn), Practice Quiz, and DIY challenge model per quest, backed by formal certification enrollment into CNAPP LMS.

Admins can create and manage courses dynamically through a full-featured **Course Management System** — including weeks, modules, topics, resources, and scenario-based quests — all without touching code.

**Currently live with 2 modules, 7 more planned:**

| Module | Theme | Quests | Status |
|---|---|---|---|
| 🤖 **AI Quest** | Generative AI & Machine Learning | 21 quests / 6 paths | ✅ Live |
| 🔄 **DevOps Loop** | IBM DevOps Loop CI/CD Lifecycle | 21 quests / 6 paths | ✅ Live |
| ☸️ Kubernetes | Container Orchestration | — | 🔒 Coming Soon |
| ☁️ AWS | Amazon Web Services | — | 🔒 Coming Soon |
| 🔷 Azure | Microsoft Azure | — | 🔒 Coming Soon |
| 🌐 GCP | Google Cloud Platform | — | 🔒 Coming Soon |
| 🔌 MCP | Model Context Protocol | — | 🔒 Coming Soon |
| 📊 Observability | Monitoring & Distributed Tracing | — | 🔒 Coming Soon |
| 🔴 OpenShift | Red Hat OpenShift | — | 🔒 Coming Soon |

---

## Technology Stack

### Frontend Framework
| Technology | Version | Purpose |
|---|---|---|
| **React** | 18.2 | UI component library, hooks-based architecture |
| **Vite** | 5.1 | Build tool, dev server with HMR |
| **React Router DOM** | 6.22 | Client-side SPA routing, protected routes |

### Styling
| Technology | Version | Purpose |
|---|---|---|
| **TailwindCSS** | 3.4 | Utility-first CSS, responsive design |
| **PostCSS** | 8.4 | CSS processing pipeline |
| **Autoprefixer** | 10.4 | Cross-browser CSS vendor prefixing |
| **Custom CSS** | — | Glass-morphism cards, sci-fi frames, animations (`src/index.css`) |
| **Orbitron Font** | Google Fonts | Sci-fi headings / ORBITRON titles |

### Libraries & Auth
| Library | Version | Purpose |
|---|---|---|
| **@okta/okta-auth-js** | 8.0 | Okta OIDC authentication & token management (PKCE flow) |
| **Lucide React** | 0.344 | Icon system (1000+ SVG icons as React components) |
| **Framer Motion** | 11.0 | Animation library (page transitions, scale-in) |
| **Canvas Confetti** | 1.9 | Celebration animation on quest completion |

### State Management & Persistence
| Approach | Details |
|---|---|
| **Custom Hook** | `src/store/useStore.js` — single source of truth |
| **React Context API** | `StoreContext` in `App.jsx` — provides store to all pages |
| **localStorage Cache** | All progress auto-cached to `ai-quest-progress` key |
| **Backend API (PostgreSQL)** | Syncs user profiles, quest progress, badges, and certifications |

### Auth & User Roles
| Role / Mechanism | Details |
|---|---|
| **Okta OIDC SSO** | Enterprise single sign-on via HCL Okta (Authorization Code + PKCE). Config stored in `server/data/oidc-config.json`, editable via Admin UI |
| **Local Account Login** | Email + bcrypt password stored in DB. Covers all roles (USER, MANAGER, ADMIN). Admin logs in with `admin@local` / `Admin@HCL2026!` |
| **Dynamic OIDC Config** | Frontend fetches `GET /oidc-config` at login; admin can update Okta settings live via Admin Panel without redeploying |
| **Role-based Access** | Three roles: `USER` (learner), `MANAGER`, `ADMIN`. Enforced via `requireRole` middleware |
| **JWT Tokens** | Okta: JWKS-verified ID token. Local: HS256 symmetric JWT (`kind: local-user`) |
| **Identity & Manager Mapping** | Token claims (`managerEmail`, `managerId`, `groups`) extracted into auth context |
| **External Handoff Query Params** | Passes `learnerId`, `learnerEmail`, `managerId`, `managerEmail` to CNAPP LMS & labs |
| **Federated Sign-out** | Clears local storage; Okta users redirected to Okta end-session endpoint |

### Backend Technology Stack (`server/`)
| Technology | Details |
|---|---|
| **Runtime & Framework** | Node.js (ESNext / TypeScript), Express 4.21, `tsx` for hot reload |
| **Database & ORM** | PostgreSQL 18 with Prisma ORM 5.22 (`schema.prisma` migrations) |
| **Security & JWT** | `jose` for Okta JWKS verification; symmetric JWT for local admin tokens; `helmet` + `cors` |
| **Validation** | `zod` for request schema validation |

### Build & Dev Commands

All commands run from the **project root** (`Hcl-learning-hub/`):

```bash
npm run dev          # Start BOTH frontend (HTTPS :5173) + backend (:4000) together
npm run build        # Production bundle to /dist
npm run preview      # Preview production build locally
npm run migrate      # Apply Prisma DB migrations
npm run studio       # Visual DB browser at http://localhost:5555
npm run seed:admin   # (Re-)create admin@local user in DB
npm run certs        # Generate self-signed TLS cert (auto-runs on dev start)
npm run certs:regen  # Force-regenerate certs (replace existing)
```

> `npm run dev` uses `concurrently` to launch **API** (cyan prefix) and **UI** (magenta prefix) side-by-side in one terminal. Killing it stops both.

---

## Project File Structure

```
Hcl-learning-hub/
├── index.html                        # Root HTML shell
├── package.json                      # Root scripts (unified dev, build, migrate, studio)
├── vite.config.js                    # Vite config: HTTPS (PFX cert), /api proxy to :4000
├── tailwind.config.js                # Tailwind theme: colors, fonts, animations
├── postcss.config.js                 # PostCSS + Autoprefixer
├── .env.example                      # Frontend environment template
├── .gitignore                        # Excludes: node_modules, dist, certs/, .env, server/data/, *.mp4, *.pdf
│
├── certs/                            # TLS certificates (git-ignored — auto-generated)
│   ├── server.pfx                    # PKCS#12 bundle (private key + cert, pass: changeit)
│   ├── server.crt                    # PEM certificate (for browser truststore import)
│   └── truststore.crt                # Same as server.crt (CA bundle alias)
│
├── scripts/
│   └── generate-certs.js             # Auto-generates self-signed cert via PowerShell (Windows) or OpenSSL
│
├── src/
│   ├── main.jsx                      # React root mount
│   ├── index.css                     # Global styles: glass-card, shimmer, neon-blue, launch animations
│   │
│   ├── App.jsx                       # Router, AuthGuard, StoreContext provider, all routes
│   │
│   ├── auth/
│   │   └── oktaConfig.js             # Okta Auth client config & claims extraction
│   │
│   ├── store/
│   │   └── useStore.js               # Global state hook: XP, quests, avatar, leaderboard
│   │
│   ├── components/                   # Reusable UI components
│   │   ├── AvatarDisplay.jsx         # Renders avatar (emoji or custom base64 image + badge)
│   │   ├── Header.jsx                # App header with user info + XP bar + module navigation
│   │   ├── HelpButton.jsx            # Floating help button (routes to Google Space)
│   │   ├── ExternalHandoff.jsx       # buildHandoffUrl, CertificationPanel, LabLaunchCard
│   │   ├── QuestBrief.jsx            # NPC dialog modal shown before each AI Quest
│   │   ├── QuestLaunchGate.jsx       # Route-aware "Mission Ready" launch animation trigger
│   │   ├── QuestLaunchSequence.jsx   # Sci-fi launch sequence modal with customizable CTA
│   │   ├── ShareWithManager.jsx      # Progress summary generator (mailto / clipboard)
│   │   ├── SolutionCenterOverview.jsx # "Learn / Practice / DIY" intro modal
│   │   ├── StarField.jsx             # Animated background star particles
│   │   ├── TutorialModal.jsx         # First-time user tutorial overlay
│   │   └── XPBar.jsx                 # XP progress bar with level thresholds
│   │
│   ├── pages/                        # Route-level page components
│   │
│    │   ── Auth & Hub ──
    │   ├── LoginPage.jsx             # Login: SSO button + local account toggle (dynamic OIDC config)
    │   ├── LoginCallback.jsx         # Okta OIDC PKCE callback — builds OktaAuth from server config
    │   ├── CourseSelect.jsx          # Course hub: search, side rail, course grid, Learning Paths button, Add to Path per card
    │   ├── AdminPanel.jsx            # Admin tabs: users, courses, help settings, auth realm
    │   ├── LearnerTracker.jsx        # Manager/Admin learner progress tracker
    │   ├── AvatarEditor.jsx          # Commander avatar builder + custom image upload & naming
    │   │
│   │   ── Dynamic Course System ──
    │   ├── CoursePage.jsx            # DB course landing: overview, modules list, quests CTA
    │   ├── CoursePathPage.jsx        # DB course learning path: weeks/modules/topics/resources viewer
    │   ├── CourseQuestsPage.jsx      # DB course quest list: Learn + Practice buttons per quest
    │   ├── CourseLearnPage.jsx       # DB quest Learn tab: slide nav, embedded video, resources panel
    │   ├── CourseQuizPage.jsx        # DB quest Practice tab: MCQ with feedback + explanation
    │   ├── CourseEditor.jsx          # Admin course editor: info, help session, weeks, modules, topics, resources, quests
    │   │
│   │   ── Learning Paths ──
    │   ├── LearningPathsPage.jsx     # User-owned paths: list, create, delete
    │   ├── PathEditorPage.jsx        # Path editor: add courses/modules, duration, certificate, section headings
    │   │
│   │   ── AI Quest Module ──
    │   ├── Home.jsx                  # AI Quest home: hero, commander stats, arsenal, Get Certified card
    │   ├── Paths.jsx                 # 6 AI Quest learning paths with quest cards
    │   ├── QuestDetail.jsx           # Quest detail: preview, objectives, lab launch, Learn / Practice CTA
    │   ├── SolutionCenter.jsx        # Full-screen Learn: arch diagram (SVG) + step nav + videos
    │   ├── Quiz.jsx                  # Scenario-based MCQ with immediate feedback + explanation
    │   ├── Results.jsx               # Score card + XP + badge unlock + CNAPP cert/lab next steps
    │   ├── LearningPath.jsx          # Structured 4-week AI curriculum view
    │   └── Leaderboard.jsx           # Team XP rankings with animated avatar row
    │
│   │   ── DevOps Loop Module ──
    │   ├── DevOpsHome.jsx            # DevOps home: hero, commander card (orange), arsenal grid
    │   ├── DevOpsPaths.jsx           # 6 DevOps paths with Learn + Practice buttons per quest
    │   ├── DevOpsQuestDetail.jsx     # DevOps quest detail: Learn First + Practice CTA + lab card
    │   ├── DevOpsSolutionCenter.jsx  # Full-screen Learn: DevOps tool chain SVG + steps + videos
    │   ├── DevOpsQuiz.jsx            # DevOps MCQ quiz with explanations
    │   ├── DevOpsResults.jsx         # DevOps results + XP + badge + CNAPP cert/lab next steps
    │   └── DevOpsLearningPath.jsx    # 4-week DevOps Loop curriculum (8 modules)
│   │
│   └── data/                         # Static content: all question banks + learn content
│       ├── index.js                  # AI Quest: exports QUESTS (21), LEVELS, getLevelInfo()
│       ├── questsP1.js               # AI Quest: paths 1-2, quests 1-7 (~7 quests × 6 Qs)
│       ├── questsP2.js               # AI Quest: paths 3-4, quests 8-14
│       ├── questsP3.js               # AI Quest: paths 5-6, quests 15-21
│       ├── solutionCenter.js         # AI Quest: learn steps, SVG nodes/edges, video links (21 quests)
│       ├── learningPath.js           # AI Quest: 4-week structured curriculum (weeks, modules, topics)
│       ├── dialogs.js                # AI Quest: NPC quest brief dialogue scripts
│       ├── avatars.js                # Avatar presets: emoji, skin tones, accessories, badge colors
│       ├── externalLinks.js          # CNAPP certification catalog & hands-on lab mapping
│       │
│       ├── devopsIndex.js            # DevOps: exports DEVOPS_QUESTS (21), getDevOpsQuest()
│       ├── devopsQuestsP1.js         # DevOps: paths 1-3, quests 1-10
│       ├── devopsQuestsP2.js         # DevOps: paths 4-6, quests 11-21
│       ├── devopsSolutionCenter.js   # DevOps: learn steps, LOOP_NODES/EDGES, video links (21 quests)
│       └── devopsLearningPath.js     # DevOps: 4-week curriculum (8 modules, phases, weekly topics)
│
└── server/                           # Node.js / Express / TypeScript / Prisma Backend
    ├── package.json                  # Server dependencies & scripts
    ├── tsconfig.json                 # TypeScript compiler configuration
    ├── .env.example                  # Server environment variable template
    ├── .env                          # Local database & secret configuration (git-ignored)
    │
    ├── data/
    │   └── oidc-config.json          # Live OIDC / Okta config (issuer, clientId, endpoints) — editable via Admin UI
    │
    ├── scripts/
    │   └── seed-admin.mjs            # Upserts admin@local user in DB (run once or after password change)
    │
    ├── prisma/
    │   ├── schema.prisma             # Full schema — 14 models (see DB Schema section below)
    │   ├── seed.ts                   # Demo seed (Managers + Learners)
    │   └── migrations/               # Applied Prisma migrations
    │
    └── src/
        ├── index.ts                  # Server entrypoint: CORS, route mount, seedPlatformCourses()
        ├── env.ts                    # Environment variable parsing & validation
        ├── lib/
        │   └── prisma.ts             # Instantiated Prisma Client
        ├── middleware/
        │   ├── auth.ts               # JWT verify: Okta JWKS + local HS256
        │   └── requireRole.ts        # Role-based access control (USER, MANAGER, ADMIN)
        └── routes/
            ├── auth.ts               # POST /auth/local/login
            ├── oidc.ts               # GET/PUT /oidc-config, POST /oidc-config/discover
            ├── me.ts                 # GET/POST /me, /me/progress, /me/manager
            ├── manager.ts            # GET/POST/DELETE /manager/subordinates
            ├── admin.ts              # GET/POST/PATCH/DELETE /admin/users, /admin/local-users
            ├── courses.ts            # Full CRUD: courses, weeks, modules, topics, resources, quests, reorder
            ├── settings.ts           # GET/PUT /settings (key-value admin config store)
            └── learningPaths.ts      # CRUD for user-owned learning paths and path items
```

**AdminPanel page** (`src/pages/AdminPanel.jsx`) — accessible at `/admin` for ADMIN role users:
| Tab | Description |
|---|---|
| **Okta Users** | List all SSO users, change roles (click badge to cycle USER/MANAGER/ADMIN) |
| **Local Users** | Create local accounts (email + password), delete them |
| **Authentication Realm** | Configure OIDC: realm name, Client ID, Client Secret, Issuer + Discover button (auto-fills endpoints) |
| **Courses** | Platform Built-in Courses (DevOps Loop, AI Quest): status toggle + Edit → full CourseEditor. DB-Managed Courses: create, inline edit, drag-to-reorder, status toggle, delete, Edit Content → CourseEditor |
| **Help Settings** | Global moderator name/email/title; General/AI Quest/DevOps Loop Google Chat Space URL, name, hint |

---

## Application Architecture

### Routing Map

```
/login                              → LoginPage (Okta SSO + local account toggle)
/login/callback                     → LoginCallback (Okta OIDC PKCE token handler)
/admin                              → AdminPanel (Users / Courses / Help Settings / Auth Realm — ADMIN only)
/tracker                            → LearnerTracker (progress overview — MANAGER + ADMIN)
/  or  /courses                     → CourseSelect (Course Hub: search, grid, Add to Path)
/avatar                             → AvatarEditor (commander builder & image upload)

── Dynamic DB Courses ────────────────────────────────────────────
/c/:slug                            → CoursePage (course landing: overview, modules, quests)
/c/:slug/learning-path              → CoursePathPage (weeks / modules / topics / resources)
/c/:slug/quests                     → CourseQuestsPage (quest list: Learn + Practice per quest)
/c/:slug/learn/:questId             → CourseLearnPage (slide nav, embedded video, resources)
/c/:slug/quiz/:questId              → CourseQuizPage (MCQ + explanation)
/admin/courses/:slug/edit           → CourseEditor (ADMIN: full content editor)

── Learning Paths ────────────────────────────────────────────────
/my-paths                           → LearningPathsPage (user paths: list, create, delete)
/my-paths/:id/edit                  → PathEditorPage (path editor: add content, duration, certificate)

── AI Quest ──────────────────────────────────────────────────────
/ai-quest                           → Home (module landing + Get AI Certified)
/paths                              → Paths (6 paths, 21 quest cards)
/quest/:questId                     → QuestDetail (preview + Lab Launch + Learn/Practice)
/solution/:questId                  → SolutionCenter (full-screen Learn)
/quiz/:questId                      → Quiz (MCQ practice)
/results/:questId                   → Results (score, XP, badge, CNAPP cert/lab handoff)
/leaderboard                        → Leaderboard
/learning-path                      → LearningPath (4-week curriculum)

── DevOps Loop ───────────────────────────────────────────────────
/devops-loop                        → DevOpsHome (module landing)
/devops-loop/paths                  → DevOpsPaths (6 paths, 21 quest cards)
/devops-loop/quest/:questId         → DevOpsQuestDetail (preview + Lab Launch)
/devops-loop/solution/:questId      → DevOpsSolutionCenter (full-screen Learn)
/devops-loop/quiz/:questId          → DevOpsQuiz
/devops-loop/results/:questId       → DevOpsResults (score, XP, badge, CNAPP cert/lab handoff)
/devops-loop/learning-path          → DevOpsLearningPath (4-week curriculum)
```

### Global State (`useStore.js`)

```js
{
  // Shared across both modules
  playerName: '',          // Commander name
  avatar: null,            // Avatar config: { presetId, skinTone, badgeColorId, accessoryId }
  tutorialShown: false,    // First-time tutorial flag

  // AI Quest module
  totalXP: 0,              // Cumulative XP (7 levels: AI Rookie → AI Grandmaster)
  completedQuests: {},     // { questId: { score, xpEarned, completedAt } }
  earnedBadges: [],        // Array of unlocked badge objects

  // DevOps Loop module
  devopsTotalXP: 0,        // DevOps cumulative XP
  devopsCompletedQuests:{},// { questId: { score, xpEarned, completedAt, badge } }

  // Leaderboard (seeded mock team, not persisted)
  teamMembers: [ ... ]     // 5 fictional team members with preset XP/avatars
}
```
**Persistence:** Every state change auto-saves to `localStorage['ai-quest-progress']` via `useEffect`. Only `teamMembers` is excluded from persistence (always uses defaults).

### XP & Level System (AI Quest)

| Level | Title | XP Range |
|---|---|---|
| 1 | 🌱 AI Rookie | 0 – 299 |
| 2 | 🔵 Data Cadet | 300 – 699 |
| 3 | ⚡ ML Scout | 700 – 1,199 |
| 4 | 🧠 AI Engineer | 1,200 – 1,799 |
| 5 | 🔥 Neural Ninja | 1,800 – 2,499 |
| 6 | 💎 Deep Learning Master | 2,500 – 3,199 |
| 7 | 👑 AI Grandmaster | 3,200+ |

---

## Module Breakdown

### AI Quest — 21 Quests × 6 Learning Paths

| Path | Quests | Topics |
|---|---|---|
| 🧠 GenAI Foundations | 4 | GenAI basics, ML fundamentals, AI Ethics, Data Prep |
| 🔗 AI Applications | 4 | NLP & Sentiment, Computer Vision, Recommender Systems, Time Series |
| 🔍 Advanced AI | 3 | RAG Systems, Vector Databases, AI Agents |
| 🛡️ AI Security & Ops | 3 | AI Security, MLOps & Deployment, AI Regulation |
| 💬 Language & Code | 3 | Prompt Engineering, Code Generation, Multimodal AI |
| 🐍 Implementation | 4 | Python for AI, REST APIs, Containerization, Enterprise AI |

**Per quest:**
- **6 scenario-based MCQ questions** (each with a workplace context paragraph)
- **Immediate explanation** for every answer (correct or wrong)
- **NPC Brief** — 2 characters (e.g., Dr. Nova + Marcus) walk through the concept in dialogue before the quiz
- **Solution Center** — architecture diagram + 6 learn steps + YouTube video links

### DevOps Loop — 21 Quests × 6 Learning Paths

| Path | Quests | Topics |
|---|---|---|
| 🔄 Loop Setup & Architecture | 3 | Loop intro, TeamSpace/Loop creation, Dashboard & VSM |
| 📋 DevOps Plan | 4 | Plan overview, Workitems, State transitions, Plan architecture |
| 🗂️ DevOps Control | 3 | Gitea/Control overview, Pull requests, End-to-end traceability |
| 🏗️ DevOps Build | 4 | Build pipeline, Agents, Templates, CodeStation artifacts |
| 🚀 Deploy · Test · Measure | 4 | Deploy architecture, Snapshots, Test Hub, VSM & DORA metrics |
| 🛠️ Installation & Operations | 3 | CNAPP RWX storage fix, Install steps, Troubleshooting |

**Per quest:**
- **5 scenario-based MCQ questions** (IBM DevOps Loop workplace scenarios using JPetStore)
- **Immediate explanation** referencing official IBM documentation
- **DevOps Solution Center** — shared DevOps Loop tool-chain SVG diagram + 6 learn steps + YouTube video links
- **"Refer for more details"** link → IBM DevOps Loop official docs

---

## User Journey (End-to-End Flow)

```
1. Login
   Option A: Okta SSO ("Sign in with HCL SSO") -> redirects to Okta PKCE -> /login/callback
   Option B: Local Account (toggle "▼ Local account login") -> email + password -> bcrypt verify -> JWT token
   Admin:     email=admin@local  password=Admin@HCL2026!  (ADMIN role, all admin features)

2. Avatar Creation / Commander Customization
   Choose class preset OR upload custom photo (PNG/JPEG) and name class -> skin tone -> accessory -> badge colour
   - First-time users: Complete interactive tutorial -> "Welcome, Commander" launch on Course Hub
   - Existing users: Can edit commander and save changes or Cancel back

3. Course Hub (`/courses`)
   - Left side rail: Quick Access (Learning Paths, Certifications), Platform Features summary, and Help Session button
   - Main grid: Live modules (AI Quest + DevOps Loop) + 7 upcoming modules
   - Bottom: "Dive into Certifications" card with direct handoff to CNAPP LMS catalog

4. Module Home (AI Quest / DevOps Loop)
   - Commander status card (XP progress bar, avatar, name, level)
   - 4-stat metrics grid (quests completed, XP, badges, % completion)
   - Learning Arsenal grid with direct "Get AI Certified" card (AI Quest) or "Start Path" (DevOps)

5. Learning Paths & Mission Launch
   - 6 paths × 3-4 quests each
   - Sci-fi "Mission ready" launch animation on forward path/quest entries
   - Smart back-navigation detection suppresses animation on browser back, exit quiz, or route ascension

6. Quest Detail & Hands-on Labs
   - Quest overview, difficulty, XP reward, question previews
   - Direct "Hands-on Lab" card launching practical sandbox environments in CNAPP LMS
   - Action buttons: [Learn First] [Practice / Start Learning]

7. Learn → Solution Center
   Full-screen sci-fi interface:
   LEFT: Scenario context + ◄ step counter ► + learn text + video link button + docs reference
   CENTER: Interactive architecture diagram — click nodes to jump to relevant steps
   BOTTOM: ▶ More Videos | 1 Learn | 2 Practice | 3 DIY tabs | ► Start Quiz button

8. Practice → Quiz
   5-6 scenario-based MCQ questions with live feedback & detailed explanations
   Header includes quick progress bar & exit action without trigger reload

9. Results & External Handoff
   Score card (X/Y correct), XP earned, badge unlock, confetti celebration
   "Next Steps" section:
   - Direct Lab Launch Card for hands-on execution
   - Formal Certification Panel for enrolling into CNAPP LMS with learner + manager identity params

10. Team Leaderboard & Manager Sharing
    - Team rankings with XP standings
    - ShareWithManager component generates mailto or copies summary for manager visibility
```

---

## How to Demo This Project

### Setup (one terminal)
```bash
cd AI-Quest

# First time only — install all dependencies
npm install
cd server && npm install && cd ..

# Start EVERYTHING (frontend HTTPS + backend API) in one command
npm run dev
# UI  → https://localhost:5173  (or :5174 if 5173 is in use)
# API → http://localhost:4000
```
> First run auto-generates a self-signed TLS cert. Browser will show "Not Secure" — click **Advanced → Proceed** to accept it.  
> Admin login: `admin@local` / `Admin@HCL2026!`

### Demo Script (10–15 minutes)

**1. Login Screen** *(30 sec)*
> "The platform offers enterprise Okta OIDC SSO with a seamless local fallback and admin bypass. It supports learner profile tracking and manager mapping."

**2. Avatar Builder & Bring-Your-Own Class** *(1 min)*
> "Learners can select from rich sci-fi presets or upload custom PNG/JPEG class photos, name their class, and customize accessories and skin tones. First-time users are guided with a step-by-step tutorial."

**3. Course Hub** *(1 min)*
> "The hub provides a clean side rail for quick navigation, platform highlights, and an integrated Help Session trigger. Live modules include AI Quest and DevOps Loop, with direct links into the CNAPP LMS Certification catalog."

**4. AI Quest Home** *(1 min)*
> "The AI Quest module home features commander profile stats, the AI Transformation curriculum, and a dedicated 'Get AI Certified' enrollment banner."

**5. Learning Paths & Sci-Fi Mission Launch** *(1 min)*
> "Navigating to learning paths or quests triggers a custom-animated mission launch sequence with dynamic CTA indicators ('Enter Quest', 'Enter Practice', 'Enter Learning')."

**6. Solution Center — Learn** *(3 min)*
> "Clicking Learn opens the Solution Center — a full-screen immersive learning experience with interactive SVG architecture diagrams, scenario context, and curated video resources."

**7. Quiz — Practice** *(2 min)*
> "Workplace scenario MCQs provide immediate feedback and detailed expert explanations after each question."

**8. Results Page & CNAPP Certification / Lab Handoff** *(1 min)*
> "Results show score breakdowns, unlocked badges, confetti, and direct handoffs to hands-on labs and official certification enrollment in CNAPP LMS with learner context."

**9. DevOps Loop Module** *(2 min)*
> "The DevOps Loop module covers Plan, Control, Build, CodeStation, Deploy, Test Hub, and Measure based on JPetStore scenarios from the IBM Practitioner Guide."

**10. Leaderboard & Manager Sharing** *(1 min)*
> "The leaderboard shows real-time team standings, with one-click progress sharing to managers via native email or clipboard summaries."

---

## Design System

| Element | Specification |
|---|---|
| Background | Deep space `#020b14` with animated CSS star particles |
| AI Quest accent | Cyan `#06b6d4` + Violet `#7c3aed` |
| DevOps Loop accent | Orange `#f97316` + Red `#ef4444` |
| Card style | Glass-morphism: `rgba(13,22,48,0.7)` + `backdrop-filter: blur(12px)` |
| Border default | `rgba(0,212,255,0.1)` |
| Title font | **Orbitron** (Google Fonts) — used for module names, section headers |
| Body font | System sans-serif via Tailwind |
| Solution Center | Full-screen dark frame with sci-fi corner accents + SVG architecture diagrams |
| Launch Gate | High-tech radar sweep, skyline silhouette, animated walking commander, dynamic CTA buttons |
| Icons | Lucide React (consistent SVG icon system) |
| Animations | TailwindCSS custom keyframes: `animate-fade-in`, `animate-slide-up`, `animate-scale-in`, `shimmer` |

---

## Key Design Decisions

| Decision | Reason |
|---|---|
| **Dual Architecture (Offline SPA + Backend API)** | Works completely standalone with localStorage caching, while optionally integrating with PostgreSQL + Express backend for enterprise role management & persistence |
| **Okta OIDC + Local Fallback** | Direct enterprise integration with HCL Okta SSO, with local fallback for rapid local development and testing |
| **Static data files for quests** | Quest content is version-controlled, easily editable by subject matter experts |
| **Shared component modules** | `SolutionCenterOverview`, `AvatarDisplay`, `XPBar`, `QuestLaunchGate` work across all learning modules |
| **Context API over Redux** | Single global store is lightweight and predictable — no complex state boilerplate |
| **Vite over CRA** | 10× faster HMR, native ES modules, smaller bundle |
| **SVG architecture diagrams** | Renders perfectly at any resolution, interactive (clickable nodes), no external charting dependency |

---

## Database Schema (14 Models)

| Model | Table Purpose |
|---|---|
| **User** | All users (Okta SSO + local accounts). Stores role, avatar data, manager links |
| **UserManager** | Many-to-many: explicit learner → manager assignments |
| **Progress** | Per-user quest completion records (module, questId, score, XP, timestamp) |
| **Badge** | Earned badges per user (unique per user+badgeName) |
| **Certification** | Per-user certification tracking (certId, level, status, achievedAt) |
| **Course** | DB-managed course catalog (slug, title, emoji, accentColor, status, order, moderator + help space fields) |
| **CourseWeek** | Week sections inside a course (weekNumber, title) |
| **CourseModule** | Modules inside a week (order, number, title, icon, color) |
| **CourseTopic** | Text/bullet topics inside a module (ordered content items) |
| **CourseResource** | Resources inside a module (type: video/youtube/read/udemy/link, label, url) |
| **CourseQuest** | Scenario MCQ quests per course (title, scenario, 4 options, correct, explanation, XP; optional learnTopics + learnResources JSON) |
| **Setting** | Key-value admin config store (help moderator, chat space URLs, platform course status overrides) |
| **LearningPath** | User-created learning paths (title, description, visibility, certificate field) |
| **LearningPathItem** | Items inside a learning path (type: section/course/module, refId, title, durationMinutes, order) |

### Key Relationships
```
User ──< Progress          (one user, many quest progress records)
User ──< Badge             (one user, many badges)
User ──< Certification     (one user, many certifications)
User ──< UserManager       (learner linked to manager)
Course ──< CourseWeek ──< CourseModule ──< CourseTopic
                                       ──< CourseResource
                                       ──< CourseQuest (optional module link)
Course ──< CourseQuest     (top-level quests not tied to a module)
LearningPath ──< LearningPathItem
```

### Platform Courses (Auto-Seeded on Startup)
The following courses are upserted on every server start if not already in the DB:

| Slug | Title | Status | Order |
|---|---|---|---|
| `devops-loop` | DevOps Loop | live | 10 |
| `ai-quest` | AI Quest | live | 20 |
| `kubernetes` | Kubernetes / K8s | coming-soon | 100 |
| `aws` | AWS | coming-soon | 110 |
| `gcp` | GCP | coming-soon | 120 |
| `mcp` | MCP | coming-soon | 130 |
| `observability` | Observability | coming-soon | 140 |
| `azure` | Azure | coming-soon | 150 |
| `openshift` | OpenShift | coming-soon | 160 |

---

## Help Session & Moderator System

Every course can have its own **moderator** and **Google Chat space** configured independently:

- **DB courses** (`/c/:slug`): moderator name/email + chat space URL/name/hint stored as fields on the `Course` record. Edited via CourseEditor → Help Session panel.
- **AI Quest & DevOps Loop**: same Course record fields (seeded to DB). Edited via Admin Panel → Edit → CourseEditor.
- **Fallback hierarchy**: Course record → Global moderator settings (in `Setting` table) → hardcoded defaults.
- **HelpButton** resolves the correct moderator and space for every route (`/c/:slug`, `/devops-loop/*`, `/ai-quest`, generic).
- Admin ⚙ shortcut inside Help modal: links directly to that course's CourseEditor if on a course page, or global help settings otherwise.

---

## Production Deployment — Kubernetes

**Repository:** https://github.com/raghavendra-bhaskar/Hcl-learning-hub  
**Production stack:** k3s (lightweight Kubernetes) · nginx (frontend) · Node.js/Express (API) · PostgreSQL (StatefulSet)

### Architecture

```
[Browser]
    │  HTTP :30080 (NodePort) or :80 (Ingress)
    ▼
[nginx Pod]  ─── /api/* ──▶  [api Pod :4000]  ──▶  [postgres StatefulSet]
  serves                        Express + Prisma
  React SPA
```

### Kubernetes Manifest Directory (`k8s/`)

| File | Resource |
|---|---|
| `k8s/0-namespace.yaml` | Namespace `hcl-learning-hub` |
| `k8s/1-secrets.yaml` | Secret template (DB password, JWT, admin password) |
| `k8s/2-configmap.yaml` | ConfigMap (non-secret env vars) |
| `k8s/3-postgres.yaml` | StatefulSet + PVC (10 Gi) + headless Service |
| `k8s/4-api.yaml` | Deployment + PVC (1 Gi, Okta config) + Service |
| `k8s/5-web.yaml` | Deployment × 2 replicas + Service |
| `k8s/6-ingress.yaml` | Ingress + NodePort fallback (`:30080`) |

---

### One-Command VM Setup (Ubuntu 22.04+ — recommended)

```bash
# Run as root on a fresh Ubuntu VM:
curl -fsSL https://raw.githubusercontent.com/raghavendra-bhaskar/Hcl-learning-hub/main/hcl-learning-hub-setup.sh \
  | sudo bash
```

Or clone first then run:

```bash
sudo bash hcl-learning-hub-setup.sh \
  --repo https://github.com/raghavendra-bhaskar/Hcl-learning-hub.git \
  --port 30080
```

The setup script (`hcl-learning-hub-setup.sh`) automatically:
1. Installs Docker CE (for image builds)
2. Installs k3s (lightweight, production-grade Kubernetes)
3. Clones the repository to `/product/hcl-learning-hub`
4. Builds Docker images for the API and Web containers
5. Imports images into k3s containerd (no registry required)
6. Applies all `k8s/` manifests with auto-generated secrets
7. Waits for pods to be healthy and prints the access URL

---

### Manual Step-by-Step Deployment

#### Step 1 — Install k3s
```bash
curl -sfL https://get.k3s.io | INSTALL_K3S_EXEC="--disable=traefik" sh -
export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
```

#### Step 2 — Clone repository
```bash
git clone https://github.com/raghavendra-bhaskar/Hcl-learning-hub.git /product/hcl-learning-hub
cd /product/hcl-learning-hub
```

#### Step 3 — Build images & import into k3s
```bash
docker build -t hcl-learning-hub-api:local ./server
docker build -t hcl-learning-hub-web:local .
docker save hcl-learning-hub-api:local | k3s ctr images import -
docker save hcl-learning-hub-web:local | k3s ctr images import -
```

#### Step 4 — Apply manifests
```bash
# Create namespace
k3s kubectl apply -f k8s/0-namespace.yaml

# Create secrets (fill in real values first, or let the setup script generate them)
k3s kubectl create secret generic hcl-learning-hub-secrets \
  --namespace=hcl-learning-hub \
  --from-literal=db-password="$(openssl rand -hex 16)" \
  --from-literal=jwt-secret="$(openssl rand -hex 32)" \
  --from-literal=admin-password="Admin@HCL2026!"

# Apply remaining manifests
k3s kubectl apply -f k8s/2-configmap.yaml
k3s kubectl apply -f k8s/3-postgres.yaml
k3s kubectl apply -f k8s/4-api.yaml      # patch image to hcl-learning-hub-api:local first
k3s kubectl apply -f k8s/5-web.yaml      # patch image to hcl-learning-hub-web:local first
k3s kubectl apply -f k8s/6-ingress.yaml
```

#### Step 5 — Verify
```bash
k3s kubectl get pods -n hcl-learning-hub
# Expected:
# postgres-0   1/1  Running
# api-xxx      1/1  Running
# web-xxx      1/1  Running
# web-yyy      1/1  Running

curl http://localhost:30080/    # NodePort access
```

---

### Useful kubectl Commands

```bash
# Pod status
k3s kubectl get pods -n hcl-learning-hub

# Live API logs
k3s kubectl logs -n hcl-learning-hub deploy/api -f

# Live nginx logs
k3s kubectl logs -n hcl-learning-hub deploy/web -f

# Restart after config change
k3s kubectl rollout restart deployment/api deployment/web -n hcl-learning-hub

# Scale web replicas
k3s kubectl scale deployment web --replicas=3 -n hcl-learning-hub
```

---

### Updating to a New Version

```bash
cd /product/hcl-learning-hub
git pull

# Rebuild images
docker build -t hcl-learning-hub-api:local ./server
docker build -t hcl-learning-hub-web:local .

# Import updated images
docker save hcl-learning-hub-api:local | k3s ctr images import -
docker save hcl-learning-hub-web:local | k3s ctr images import -

# Rolling restart (zero downtime for web, brief restart for api)
k3s kubectl rollout restart deployment/api deployment/web -n hcl-learning-hub
```

---

### Local Development (Docker Compose — dev only)

```bash
# From project root
cp .env.docker .env           # fill in real values
docker compose up -d --build  # starts postgres + api + nginx on port 80
```

> Docker Compose (`docker-compose.yml`) is **for local development only**. Production deployments use Kubernetes manifests.

---

### GitHub — Push & Deploy Workflow

```bash
# Push changes to GitHub
git add .
git commit -m "feat: describe your change"
git push origin main

# Deploy on target VM
cd /product/hcl-learning-hub && git pull
docker build -t hcl-learning-hub-api:local ./server && docker save hcl-learning-hub-api:local | k3s ctr images import -
docker build -t hcl-learning-hub-web:local . && docker save hcl-learning-hub-web:local | k3s ctr images import -
k3s kubectl rollout restart deployment/api deployment/web -n hcl-learning-hub
```

---

### 4. Database Migration Details (All 14 Tables)

Running `npm run migrate` (which executes `prisma migrate deploy` inside `server/`) creates all tables in order. Here is what each migration creates:

#### Core User & Auth Tables
| Table | Columns |
|---|---|
| `User` | id, oktaSub, email, name, role (ADMIN/MANAGER/USER), managerId, passwordHash, isLocalUser, hasAvatar, avatarData (JSON), createdAt, updatedAt |
| `UserManager` | userId, managerId, assignedAt — composite PK |
| `Progress` | id, userId, module, questId, score, totalQuestions, xpEarned, completedAt — unique(userId, module, questId) |
| `Badge` | id, userId, module, badgeName, earnedAt — unique(userId, badgeName) |
| `Certification` | id, userId, certId, level, status, achievedAt, createdAt — unique(userId, certId, level) |

#### Course Management Tables
| Table | Columns |
|---|---|
| `Course` | id, slug (unique), title, tagline, description, emoji, accentColor, status, order, instructorName, instructorEmail, helpSpaceUrl, helpSpaceName, helpSpaceHint, createdAt, updatedAt |
| `CourseWeek` | id, courseId, weekNumber, title — unique(courseId, weekNumber) |
| `CourseModule` | id, weekId, order, number, title, icon, color |
| `CourseTopic` | id, moduleId, order, content |
| `CourseResource` | id, moduleId, order, label, type, url |
| `CourseQuest` | id, courseId, moduleId (nullable), order, title, scenario, optionA, optionB, optionC, optionD, correct, explanation, xp, learnTopics (JSON), learnResources (JSON), createdAt |

#### Platform Config & Learning Path Tables
| Table | Columns |
|---|---|
| `Setting` | id, key (unique), value — stores all admin config key-value pairs |
| `LearningPath` | id, userId, title, description, visibility, certificate, createdAt, updatedAt |
| `LearningPathItem` | id, pathId, type, refId, title, subtitle, emoji, accentColor, durationMinutes, order, createdAt |

#### Verifying migrations applied correctly
```bash
# Option A — Prisma Studio (visual browser)
npm run studio
# Opens http://localhost:5555 — you should see all 14 models in the left panel

# Option B — psql
psql -U hcl_hub -d hcl_learning_hub -c "\dt"
# Should list: User, UserManager, Progress, Badge, Certification,
#              Course, CourseWeek, CourseModule, CourseTopic,
#              CourseResource, CourseQuest, Setting,
#              LearningPath, LearningPathItem

# Option C — health + courses API check
curl http://localhost:4000/health
# → {"ok":true}
```

#### Platform course seeding (automatic)
On every server startup, `seedPlatformCourses()` in `server/src/index.ts` upserts the 9 platform courses (`devops-loop`, `ai-quest`, `kubernetes`, `aws`, `gcp`, `mcp`, `observability`, `azure`, `openshift`) into the `Course` table if they do not already exist. **No manual action needed.**

---

### 5. How to Demonstrate & Show It Working
1. **Login** (`https://<hostname>:5173/login`):
   - **Admin**: email `admin@local` / password `Admin@HCL2026!` → lands on Course Hub with Admin link in header
   - **Okta SSO**: click "Sign in with HCL SSO" (requires Okta configured in Admin Panel → Auth Realm)
2. **Avatar Builder**: choose sci-fi presets or upload custom PNG/JPEG
3. **Course Hub** (`/courses`): search bar, AI Quest + DevOps Loop cards, 7 coming-soon cards, Add to Learning Path per card
4. **Admin Panel** (`/admin`):
   - **Courses tab** → Edit on DevOps Loop or AI Quest → full CourseEditor with weeks, modules, quests, and Help Session panel
   - **Help Settings tab** → set global moderator + Google Chat spaces
5. **CourseEditor** (`/admin/courses/:slug/edit`): add weeks, modules, topics, resources; create scenario-based quests with Learn content
6. **Quests & Missions**: launch animation, Solution Center, MCQ quiz, Results + badge
7. **Learning Paths** (`/my-paths`): create a path, add courses/modules, set duration, add certificate
8. **Help Session button**: per-course moderator and Google Chat space shown correctly per route

---

## Quick Reference — Quest Content Stats

| Module | Quests | Questions | Learn Steps | Video Links |
|---|---|---|---|---|
| AI Quest | 21 | ~126 (6 per quest) | ~126 (6 per quest) | 21 curated + 21 "More Videos" |
| DevOps Loop | 21 | ~105 (5 per quest) | 126 (6 per quest) | 21 curated + 21 "More Videos" |
| **Total** | **42** | **~231** | **~252** | **~84** |

---

*Last updated: September 2026 | Platform: HCL Software | Repo: https://github.com/raghavendra-bhaskar/Hcl-learning-hub | Built with React 18 + Vite + TailwindCSS + Express + Prisma + PostgreSQL + Kubernetes (k3s)*

---

## Recent Major Changes (September 2026)

| Feature | Details |
|---|---|
| **Dynamic Course Management** | Full CRUD admin system for courses, weeks, modules, topics, resources via CourseEditor |
| **Scenario-based Quests (DB)** | Admin-created quests with Learn slides (learnTopics) and resources (learnResources) stored as JSON in DB |
| **DevOps Loop + AI Quest in DB** | Both platform courses seeded to DB and fully editable via CourseEditor (weeks, modules, quests, help session) |
| **Per-course Moderator** | Each course has its own moderator name/email and Google Chat space, editable in CourseEditor → Help Session |
| **Learning Paths** | Users can create, edit, and manage personal learning paths with courses, modules, duration per item, and certificate |
| **Course Hub Search** | Search bar in CourseSelect filters both platform and DB-managed courses |
| **Add to Learning Path** | "Add to Path" button on every course card opens path selector modal |
| **Help Session per course** | HelpButton resolves moderator + space from DB course record for all routes including /devops-loop and /ai-quest |
| **Instructor → Moderator** | Renamed throughout all UI, labels, settings keys, and API fields |
| **Admin Edit shortcut** | ⚙ button inside Help modal links directly to the CourseEditor for the current course (or global settings) |
| **Kubernetes Deployment** | Production deployment fully migrated to k3s; `k8s/` manifests for namespace, secrets, configmap, postgres, api, web, ingress |
| **VM Setup Script** | `hcl-learning-hub-setup.sh` — one-command Ubuntu deployment: installs Docker + k3s, builds images, applies manifests |
| **GitHub Repository** | Published at https://github.com/raghavendra-bhaskar/Hcl-learning-hub |
| **Rebranded** | Project renamed from AI Quest → HCL Software Learning Hub; folder Hcl-learning-hub |
