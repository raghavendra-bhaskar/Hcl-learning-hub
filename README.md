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
