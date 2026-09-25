# HCL L2 Support Learning Hub — Project Overview

> **Internal gamified learning platform for HCL Software L2 Support teams.**
> Features a modern React SPA frontend with client-side & Okta OIDC auth, accompanied by a Node.js / TypeScript / Prisma / PostgreSQL backend API.

---

## What Is This Project?

The **HCL L2 Support Learning Hub** is a scenario-based, gamified training platform that teaches real-world technical skills through interactive quests. Engineers complete bite-sized quests (8–20 minutes each), earn XP and badges, level up their commander, take hands-on CNAPP labs, and track team progress on a live leaderboard.

It is modelled after the  Cloud Quest style of gamification — with a Solution Center (Learn), Practice Quiz, and DIY challenge model per quest, backed by formal certification enrollment into CNAPP LMS.

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

### Course Presentation Updates

- Course hero headings use smaller responsive typography across the Course Hub, AI Quest, DevOps Loop, and database-backed course pages.
- AI Quest and DevOps Loop no longer show the separate Continue Mission and Leaderboard hero buttons; those actions remain available in their learning arsenal/navigation.
- Every database-backed course receives the shared six-feature arsenal (quests, leaderboard, avatar, XP, expert explanations, and scenario-based learning) plus a `Get <course title> Certified` CNAPP LMS catalog link using the course slug as the certification identifier.
- AI Tutor hides the configured model name from learners and keeps retrieved source links inside a collapsed disclosure. Source citations in the answer remain available for context.
- Help Session derives its course context from the current route, uses that course's moderator/support-space settings, and switches AI Help into that course's RAG scope; learners do not need a second selector. Administration > Help Settings has a dynamic course selector for moderator/support-space editing, including newly created courses. Administrators can use AI Course Topic Builder in the Course Editor to preview and add generated weeks, modules, and topics from an outline.

### Local AI Tutor and Help

- **Provider administration:** Administration > AI Provider configures one shared Ollama endpoint and chat model, stored atomically as `ai.provider` in the existing Setting table. AI starts disabled. Model discovery reads installed `/api/tags` models and marks `/api/ps` models currently running. A saved-provider chat panel supports model comparison.
- **Learner experience:** `src/components/AITutor.jsx` supplies course-scoped tutoring in dynamic course quests and all three quiz implementations, plus Hub-wide AI Help in the Help Session modal. Pace selection, recent conversation, source references, errors, and loading states are included. Chats remain in component memory only.
- **API:** Authenticated `/ai/status` and `/ai/chat`; admin-only `GET/PUT /ai/config` and `POST /ai/models`. `server/src/routes/ai.ts` validates requests and applies per-process concurrency/throttling. Learners cannot select endpoints or override models. Generic settings routes exclude/reserve `ai.*`.
- **RAG:** `server/src/lib/aiKnowledge.ts` uses MiniSearch lexical retrieval over current live course descriptions, module topics, quest scenarios, learning topics, and explanations. Course requests filter the database by slug before retrieval; Help uses all live courses and platform guidance. No external resource content ingestion, embeddings, vector database, migration, or background index is required. No-match queries decline without inference. Model grounding is best-effort, not a guarantee against hallucinations or prompt injection.
- **Ollama transport:** `server/src/lib/ollama.ts` supports local/private HTTP(S) origins, disallows credentials and redirects, and limits response size and time. Private endpoints are intentionally allowed for self-hosting; administrators and deployment egress controls are the trust boundary. Nginx's API read timeout is 150 seconds for slow local inference.
- **Validation:** `npm run test:ai --prefix server` tests model discovery, endpoint validation, retrieval, admin authorization, request validation, selected-course filtering, disabled behavior, and throttling. See README for laptop/Docker connectivity and limitations.

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
| **Okta OIDC SSO** | Enterprise single sign-on via HCL Okta (Authorization Code + PKCE) |
| **Local Fallback** | Name, email, and optional Manager ID for offline/prototype testing |
| **Local Admin Bypass** | `admin` / `admin` local login route gated by `ENABLE_LOCAL_ADMIN` |
| **Identity & Manager Mapping** | Token claims (`managerEmail`, `managerId`, `groups`) extracted into auth context |
| **External Handoff Query Params** | Passes `learnerId`, `learnerEmail`, `managerId`, `managerEmail` to CNAPP LMS & labs |
| **Federated Sign-out** | Clears local storage and invokes Okta SSO token revocation |

### Backend Technology Stack (`server/`)
| Technology | Details |
|---|---|
| **Runtime & Framework** | Node.js (ESNext / TypeScript), Express 4.21, `tsx` for hot reload |
| **Database & ORM** | PostgreSQL 18 with Prisma ORM 5.22 (`schema.prisma` migrations) |
| **Security & JWT** | `jose` for Okta JWKS verification; symmetric JWT for local admin tokens; `helmet` + `cors` |
| **Validation** | `zod` for request schema validation |

### Build & Dev Commands
```bash
# Frontend (AI-Quest/)
npm run dev        # Vite dev server at http://localhost:5173
npm run build      # Production bundle to /dist
npm run preview    # Preview production build locally

# Backend API (server/)
cd server
npm install        # Install server dependencies
npm run dev        # Tsx watch server on http://localhost:4000
npm run prisma:migrate # Apply DB migrations
npm run prisma:studio  # Visual DB browser at http://localhost:5555
```

---

## Project File Structure

```
AI-Quest/
├── index.html                        # Root HTML shell (<title>HCL L2 Support Learning Hub</title>)
├── package.json                      # Frontend dependencies + scripts
├── vite.config.js                    # Vite config (React plugin)
├── tailwind.config.js                # Tailwind theme: colors, fonts, animations
├── postcss.config.js                 # PostCSS + Autoprefixer
├── .env.example                      # Frontend environment template (Okta credentials)
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
│   │   ── Auth & Hub ──
│   │   ├── LoginPage.jsx             # Dual login: Okta SSO button + local fallback
│   │   ├── LoginCallback.jsx         # Okta OAuth2/OIDC PKCE callback handler
│   │   ├── CourseSelect.jsx          # Course hub: side rail, course grid, "Dive into Certifications"
│   │   ├── AvatarEditor.jsx          # Commander avatar builder + custom image upload & naming
│   │   │
│   │   ── AI Quest Module ──
│   │   ├── Home.jsx                  # AI Quest home: hero, commander stats, arsenal, Get Certified card
│   │   ├── Paths.jsx                 # 6 AI Quest learning paths with quest cards
│   │   ├── QuestDetail.jsx           # Quest detail: preview, objectives, lab launch, Learn / Practice CTA
│   │   ├── SolutionCenter.jsx        # Full-screen Learn: arch diagram (SVG) + step nav + videos
│   │   ├── Quiz.jsx                  # Scenario-based MCQ with immediate feedback + explanation
│   │   ├── Results.jsx               # Score card + XP + badge unlock + CNAPP cert/lab next steps
│   │   ├── LearningPath.jsx          # Structured 4-week AI curriculum view
│   │   └── Leaderboard.jsx           # Team XP rankings with animated avatar row
│   │
│   │   ── DevOps Loop Module ──
│   │   ├── DevOpsHome.jsx            # DevOps home: hero, commander card (orange), arsenal grid
│   │   ├── DevOpsPaths.jsx           # 6 DevOps paths with Learn + Practice buttons per quest
│   │   ├── DevOpsQuestDetail.jsx     # DevOps quest detail: Learn First + Practice CTA + lab card
│   │   ├── DevOpsSolutionCenter.jsx  # Full-screen Learn: DevOps tool chain SVG + steps + videos
│   │   ├── DevOpsQuiz.jsx            # DevOps MCQ quiz with explanations
│   │   ├── DevOpsResults.jsx         # DevOps results + XP + badge + CNAPP cert/lab next steps
│   │   └── DevOpsLearningPath.jsx    # 4-week DevOps Loop curriculum (8 modules)
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
    ├── .env                          # Local database & secret configuration
    │
    ├── prisma/
    │   ├── schema.prisma             # PostgreSQL schema (User, Progress, Badge, Certification)
    │   ├── seed.ts                   # Demo seed (1 Admin, 2 Managers, 7 Learners)
    │   └── migrations/               # Applied database migrations
    │
    └── src/
        ├── index.ts                  # Server entrypoint & routing mount
        ├── env.ts                    # Environment variable parsing & validation
        ├── lib/
        │   └── prisma.ts             # Instantiated Prisma Client
        ├── middleware/
        │   ├── auth.ts               # Dual Okta JWKS / Local Admin JWT authenticator
        │   └── requireRole.ts        # Role-based access control (USER, MANAGER, ADMIN)
        └── routes/
            ├── auth.ts               # POST /auth/admin/login
            ├── me.ts                 # GET/POST /me, /me/progress, /me/manager
            ├── manager.ts            # GET/POST/DELETE /manager/subordinates
            └── admin.ts              # GET/POST/PATCH /admin/users
```

---

## Application Architecture

### Routing Map

```
/login                              → LoginPage (dual Okta SSO + local login)
/login/callback                     → LoginCallback (Okta OIDC PKCE token handler)
/  or  /courses                     → CourseSelect (Course Hub + side rail)
/avatar                             → AvatarEditor (commander builder & image upload)

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
   Option A: Okta SSO ("Continue with HCL SSO") -> redirects to Okta PKCE -> /login/callback
   Option B: Local login -> Enter Name, Email, and optional Manager ID -> stored in auth context

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

### Setup (30 seconds)
```bash
# Frontend
cd AI-Quest
npm install        # First time only
npm run dev        # → http://localhost:5173

# Backend API (optional for full multi-user sync)
cd AI-Quest/server
npm install
npm run dev        # → http://localhost:4000
```

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

## Running in Production

Since this is a pure static SPA, it can be deployed to any static host:

```bash
npm run build         # Outputs to /dist
```

Host `/dist` on any of:
- **GitHub Pages** — free
- **Netlify** — drag-and-drop deploy
- **Vercel** — `vercel --prod`
- **IBM Cloud Object Storage** — for internal HCL hosting
- **Any web server** — Apache / Nginx just serve the `/dist` folder

> ⚠️ Since routing uses the HTML5 History API, configure your host to redirect all 404s to `index.html`.

---

## Setting Up on a New VM (Step-by-Step Guide)

### 1. Prerequisites to Install on the New VM
1. **Node.js 20 LTS** (includes `npm`) — download from [nodejs.org](https://nodejs.org/)
2. **PostgreSQL 16 or 18** — install locally or run via Docker
3. **Git** (optional, to pull/manage code)

---

### 2. Database Initialization (PostgreSQL)
Open terminal / PowerShell on the new VM and run:

```sql
-- Connect via psql: psql -U postgres
CREATE USER hcl_hub WITH PASSWORD 'hcl_hub_dev';
ALTER USER hcl_hub CREATEDB;
CREATE DATABASE hcl_learning_hub OWNER hcl_hub;
GRANT ALL PRIVILEGES ON DATABASE hcl_learning_hub TO hcl_hub;
```

---

### 3. Backend Setup & Run (`server/`)
```bash
cd AI-Quest/server

# 1. Create environment file
cp .env.example .env
# (Ensure DATABASE_URL is: postgresql://hcl_hub:hcl_hub_dev@localhost:5432/hcl_learning_hub)

# 2. Install dependencies
npm install

# 3. Run database migrations & seed demo records
npx prisma migrate dev
npx prisma db seed

# 4. Start the API server
npm run dev
# -> Backend starts at http://localhost:4000
```

---

### 4. Frontend Setup & Run (`AI-Quest/`)
In a new terminal window:
```bash
cd AI-Quest

# 1. Install dependencies
npm install

# 2. (Optional) Configure Okta or environment vars
cp .env.example .env.local

# 3. Start development server
npm run dev
# -> Frontend starts at http://localhost:5173
```

---

### 5. How to Demonstrate & Show It Working
1. **Frontend App (`http://localhost:5173`)**:
   - **Login**: Use name & optional email (or click Okta SSO if configured).
   - **Avatar Builder**: Choose built-in character presets or click **"Bring Your Own"** to upload a custom PNG/JPEG avatar and customize class title.
   - **Course Hub (`/courses`)**: Explore the left side rail with quick links, platform features, and Help Session button.
   - **Quests & Missions**: Click into **DevOps Loop** or **AI Quest**, observe the high-tech **"Mission Ready"** launch animation, and complete scenario MCQs.
   - **Certifications & Labs**: Demonstrate direct handoff cards that link out to CNAPP LMS.
2. **Backend API Verification**:
   - Health check: `curl http://localhost:4000/health` → `{"ok": true}`
   - Local admin login: `POST http://localhost:4000/auth/admin/login` with `{"username":"admin","password":"admin"}`
   - Prisma Studio (Visual DB Browser): `npx prisma studio` (runs on `http://localhost:5555`)

---

## Quick Reference — Quest Content Stats

| Module | Quests | Questions | Learn Steps | Video Links |
|---|---|---|---|---|
| AI Quest | 21 | ~126 (6 per quest) | ~126 (6 per quest) | 21 curated + 21 "More Videos" |
| DevOps Loop | 21 | ~105 (5 per quest) | 126 (6 per quest) | 21 curated + 21 "More Videos" |
| **Total** | **42** | **~231** | **~252** | **~84** |

---

*Last updated: August 2026 | Platform: HCL Software L2 Support | Built with React 18 + Vite + TailwindCSS*
