# Hcl-learning-hub
The **HCL Software Learning Hub** is a scenario-based, gamified training platform that teaches real-world technical skills through interactive quests. Engineers complete bite-sized quests, earn XP and badges, level up their commander, follow guided learning paths, and track team progress on a live leaderboard.

## Current project overview

- Frontend: `React 18 + Vite + TailwindCSS + React Router`
- Backend API: `Node + tsx watch` from `server/src/index.ts`
- Dev server: Vite on `5173` by default
- API server: `4000`
- Shared DB-backed course system for AI Quest, DevOps Loop, and custom courses

## Recent changes

- AI Quest and DevOps Loop landing pages were simplified to match shared course pages.
- Opening hero text on course pages was reduced for better fit and consistency.
- Shared course learning pages now use an AI Quest-style layout with left-side navigation and a right-side detail/video frame.
- Module learning videos now play inside the right-side frame for shared course learn pages.
- Video embed handling was centralized so shared and legacy flows resolve playable YouTube, playlist, Google Drive, and direct video URLs consistently.
- DevOps legacy solution-center videos now use runtime fallback mapping for older placeholder links.
- Course editor validation now blocks non-playable video resources such as YouTube search-result URLs.

## Local development

### Local Ollama AI Tutor

1. Start Ollama on the machine reachable by the Hub API. Install a chat model, for example `ollama pull llama3.2` (run `ollama serve` only if Ollama is not already running).
2. Sign in as an administrator and open **Administration > AI Provider**.
3. Enter `http://localhost:11434` when the API and Ollama run on the same laptop. Models are discovered automatically from `/api/tags`; models currently loaded in memory are marked **running** using `/api/ps`. Installed models need not already be loaded to select them.
4. Select a chat-capable model, enable AI, and save. Use **Test Saved Provider** to ask a Hub question. Save another model to compare responses. Embedding-only models cannot answer chat requests.
5. Learners can open **AI Tutor** in course quests/assessments and **AI Help** in Help Session. The pace selector and recent conversation provide session-level adaptation. Conversations are not persisted and clear when leaving the page.
6. Each Help Session can switch between General Platform Support and every configured course, including coming-soon courses. On a course editor page, administrators can use **AI Course Topic Builder** to generate a reviewable outline from a short description, then add the approved weeks, modules, and topics.

Endpoint connectivity is from the **backend**, not the browser. With Docker Desktop, use `http://host.docker.internal:11434`; for a remote API, use a private address reachable from that server, not its `localhost`. Ollama may need a listening address that accepts that connection. Restrict firewall access to the backend; do not expose an unauthenticated Ollama server to the public internet. Browser CORS changes are not needed because the API proxies requests.

Retrieval-augmented generation (RAG) uses MiniSearch full-text retrieval over live course descriptions, module topics, assessment scenarios, learning topics, and explanations in PostgreSQL. Course chat retrieves only the selected course; AI Help searches live Hub courses plus platform help. Source links accompany answers. Course edits are available on the next question without an indexing job. Linked videos, PDFs, and external websites are **not** downloaded or indexed; add their instructional text as course topics to make it retrievable. Sparse course material produces limited answers.

No-match questions are declined without calling the model. Instructions constrain answers to retrieved material, but probabilistic models can still hallucinate or ignore scope instructions; citations are retrieved references, not independently verified claims. The tutor is a study aid, not an assessment-integrity boundary, and its corpus includes explanations. No student profile, credentials, or progress records are sent to Ollama. Questions, recent chat, and retrieved course text are sent to the administrator-configured endpoint. AI is disabled by default; no schema migration or embedding model is required.

Requests have a two-minute inference timeout, bounded input/output, one active request per user, and four concurrent requests per API process. Nginx allows 150 seconds for the upstream response. For a multi-replica deployment, use a shared limiter before increasing usage. Endpoint configuration is trusted-admin functionality; enforce network egress restrictions in shared or production deployments.

Verify the AI integration with `npm run test:ai --prefix server`, `npm run build --prefix server`, and `npm run build`.

### Run in development mode

```bash
npm run dev
```

This starts:

- UI: Vite dev server
- API: `server/src/index.ts` in watch mode

If `PORT 4000 already in use` appears, another API process is already running. Stop that old backend process first, then run `npm run dev` again.

### Build for production check

```bash
npm run build
```

This does **not** start the app. It only creates the production frontend bundle and is used to verify that the UI compiles successfully.

### Preview production build locally

```bash
npm run preview
```

## Which command should I use?

- Use `npm run dev` while developing, testing UI changes, or checking live behavior.
- Use `npm run build` before pushing or publishing to confirm the frontend compiles cleanly.
- Use both during normal work: `dev` while editing, `build` before finalizing changes.

## Which port should I use?

- Primary frontend port is `5173`.
- If `5173` is already occupied, Vite may move to `5174` automatically.
- Use whichever port Vite shows in the terminal for the **current** running UI session.
- The backend API remains on `4000`.

In normal cases, use:

- Frontend: `https://localhost:5173`
- API proxy target: `http://localhost:4000`

If Vite switches ports, then use `https://localhost:5174` for that run.

## GitHub update workflow for each change

After finishing a logical change:

1. Review changed files.
2. Run `npm run build`.
3. Stage files.
4. Commit with a clear message.
5. Push to GitHub.

Typical commands:

```bash
git status
git add .
git commit -m "Update course learn-page video playback and landing-page UI"
git push
```

Recommended habit:

- Commit per small feature or bug fix.
- Do **not** wait too long before committing.
- Use clear commit messages describing the actual change.

Example commit messages:

- `fix: remove AI Quest and DevOps hero stats panels`
- `fix: unify course video embed playback`
- `feat: align shared course learn window with AI Quest layout`
