# Hcl-learning-hub
The **HCL Software Learning Hub** is a scenario-based, gamified training platform that teaches real-world technical skills through interactive quests. Engineers complete bite-sized quests, earn XP and badges, level up their commander, follow guided learning paths, and track team progress on a live leaderboard.

## Current project overview

- Frontend: `React 18 + Vite + TailwindCSS + React Router`
- Backend API: `Node + tsx watch` from `server/src/index.ts`
- Dev server: Vite on `5173` by default
- API server: `4000`
- Shared DB-backed course system for AI Quest, DevOps Loop, and custom courses

## Minimum system requirements

These apply to the server that hosts the Learning Hub (Docker/Podman host). The
installers in `packaging/` verify every one of them before changing anything.

| Resource | Minimum | Recommended | With local Ollama AI Tutor |
|---|---|---|---|
| CPU | 2 vCPU (x86_64) | 4 vCPU | 8 vCPU |
| RAM | 4 GB | 8 GB | 16 GB |
| Free disk | 20 GB | 50 GB | 50 GB + ~10 GB per model |
| GPU | not required | not required | optional, speeds up inference |

### Supported operating systems

| Platform | Versions | Container runtime |
|---|---|---|
| RHEL / Rocky / AlmaLinux | 8, 9 | Podman 4.x+ or Docker 24+ |
| CentOS Stream | 9 | Podman 4.x+ or Docker 24+ |
| Ubuntu | 22.04 LTS, 24.04 LTS | Docker 24+ or Podman 4.x+ |
| Debian | 12 | Docker 24+ or Podman 4.x+ |
| Windows 10 Pro / Enterprise | 21H2+ (build 19044+) | Docker Desktop 4.x (WSL2) |
| Windows 11 Pro / Enterprise | all supported builds | Docker Desktop 4.x (WSL2) |
| Windows Server | 2019, 2022 (build 17763+) | Docker Desktop / Docker Engine |

Windows hosts need hardware virtualization enabled in the BIOS and either WSL2
or Hyper-V available.

### Ports

| Port | Exposure | Purpose |
|---|---|---|
| `30080/tcp` | inbound, open to users | Web UI (nginx) — change with `--port` / `-Port` |
| `4000/tcp` | internal container network only | Express API |
| `5432/tcp` | internal container network only | PostgreSQL — **never expose externally** |

Roughly 2.5 GB of the disk budget is the container images; the rest is the
PostgreSQL volume, uploaded avatars and logs.

## Internet-connected installation

There are two ways to install on a VM that has internet access:

| Option | Entry point | Result |
|---|---|---|
| **Source** (recommended for this VM) | `deploy/install.sh` | Runs Vite + API directly on the host, managed by `start.sh` / `stop.sh` / `sync.sh` |
| Containers | [hcl-learning-hub-setup.sh](hcl-learning-hub-setup.sh) | Installs Docker CE + k3s and deploys the Hub as containers |

Both are separate from the air-gap bundle flow further below. Do not use either
build-from-source path on a host without internet.

The repository is **private**, so both the download and the clone need a
GitHub personal access token. A GitHub account password will not work —
password authentication for Git was removed, which is why `git clone` fails with
*"Invalid username or token"*. GitHub returns that same prompt for a repository
you cannot see **and** for one that does not exist, so double-check the
owner/name if a valid token still fails.

Create a fine-grained PAT with read-only **Contents** access to this repository,
then download the installer. Prompt for the token instead of typing it inline so
it never reaches your shell history:

```bash
sudo mkdir -p ~/software && sudo chown -R "$USER:$USER" ~/software
cd ~/software

read -rsp "GitHub token: " GH_TOKEN; echo
curl -H "Authorization: token $GH_TOKEN" -fsSL \
  https://raw.githubusercontent.com/raghavendra-bhaskar/Hcl-learning-hub/main/deploy/install.sh \
  -o install.sh
unset GH_TOKEN
```

`~/software` is created by root on a fresh VM, so the `chown` above is what lets
`hcluser` write into it. If the repository is later made public, the
`-H "Authorization: token ..."` header can simply be dropped.

### Running from source on a connected VM

`deploy/install.sh` is a self-contained bootstrap: download **only that file**,
run it, and it installs every prerequisite, clones the repo into
`hcl-learning-hub/`, restores the database and leaves the Hub ready to start.

Run it as your normal user — **not** with `sudo`. It calls `sudo` itself for the
package steps; running the whole script as root leaves `node_modules` and the
clone owned by root.

```bash
cd ~/software
bash install.sh                      # clones into ~/software/hcl-learning-hub
```

It installs and configures, in order:

| Step | What it does |
|---|---|
| 1–2 | `git`, `curl`, `openssl`, then Node.js 20 LTS from NodeSource |
| 3–4 | PostgreSQL server, `initdb`, password auth on localhost, role + database |
| 5 | `git clone` into `hcl-learning-hub/` (prompts for the token if private) |
| 6 | `npm install` for **both** workspaces (root UI and `server/`) |
| 7 | `server/.env` with generated secrets, plus a TLS cert matching this FQDN |
| 8 | Restores `scripts/backup.dump`, generates the Prisma client, applies migrations |
| 9 | Opens the firewall ports |

Useful options:

```bash
bash install.sh --host blmycldtl596461.nonprod.hclpnp.com   # explicit FQDN
bash install.sh --dir /opt                                  # /opt/hcl-learning-hub
bash install.sh --skip-db-restore                           # empty database
bash install.sh --branch develop
```

### Start, stop and sync

All three take care of everything — you never run `npm run dev` in `AI-Quest`
and again in `server/`. The root dev script already starts the API and the UI
together, and `start.sh` wraps it as a background service with logs, a PID file
and health checks.

```bash
cd ~/software/hcl-learning-hub

bash deploy/start.sh        # PostgreSQL + API + UI, one command
bash deploy/stop.sh         # stops UI + API (data intact)
bash deploy/sync.sh         # backup DB -> git pull -> deps -> migrate -> restart
```

| Script | Options |
|---|---|
| `start.sh` | `--foreground` to run attached to the terminal |
| `stop.sh` | `--with-db` to stop PostgreSQL too |
| `sync.sh` | `--restore <dump>`, `--no-restart`, `--backup-only` |

`sync.sh` is what you run after any further development. It **always takes a
database backup first** into `backups/` (keeping the 10 most recent), then stops
the Hub, pulls the branch, reinstalls dependencies, regenerates the Prisma
client, applies new migrations and starts everything again. Local edits are
stashed automatically rather than blocking the pull.

Logs and state live in the install directory:

```bash
tail -f logs/hub.log        # combined API + UI output
cat .deploy-credentials     # admin password, DB password (mode 600)
ls backups/                 # pre-sync database dumps
```

### Hostname access and the TLS certificate

The installer detects the machine FQDN and generates a self-signed certificate
whose SAN covers the FQDN, the short hostname and the IP, so
`https://blmycldtl596461.nonprod.hclpnp.com:5173` works without a name mismatch.
It also sets `FRONTEND_ORIGIN` in `server/.env` to that same URL.

If the hostname changes, regenerate the certificate and update the origin:

```bash
rm -rf certs
CERT_CN=blmycldtl596461 \
CERT_FQDN=blmycldtl596461.nonprod.hclpnp.com \
  node scripts/generate-certs.js
# then edit FRONTEND_ORIGIN in server/.env and run: bash deploy/stop.sh && bash deploy/start.sh
```

The certificate is self-signed, so the browser warns once. Click
**Advanced → Proceed** for both the UI and `https://<fqdn>:4000/health`.

> **Never copy `node_modules` from Windows to Linux.** npm installs
> platform-specific native binaries and Prisma generates a platform-specific
> query engine. Copying them produces
> `Cannot find module @rollup/rollup-linux-x64-gnu`,
> `You installed esbuild for another platform`, and
> `Prisma Client could not locate the Query Engine for runtime "rhel-openssl-3.0.x"`.
> `install.sh` deletes both `node_modules` trees before installing for this reason.

Do not run `npm install -g npm@latest`. npm 12 requires Node 22+ and fails with
`EBADENGINE` on Node 20; the npm bundled with Node 20 is correct for this project.

## Offline / air-gap installation

Air-gapped hosts cannot build from source — the `Dockerfile`s start from
`node:20-alpine`, so `podman build` fails with
`pinging container registry registry-1.docker.io`. Use the pre-built bundles
instead: images are built once on a connected machine and shipped as tar
archives, together with the installer, start/stop scripts and the database dump.

### Build the bundle (on a connected machine)

```bash
bash packaging/build-bundle.sh                 # -> dist-bundle/hcl-learning-hub-1.0.0-linux.tar.gz
bash packaging/build-bundle.sh --with-docker   # also embeds the Docker Engine
```

```powershell
powershell -ExecutionPolicy Bypass -File packaging\build-bundle.ps1 -WithExe
# -> dist-bundle\hcl-learning-hub-1.0.0-windows.zip  (contains hcl-learning-hub-setup.exe)
```

### Install on the air-gapped host

```bash
# Linux
tar -xzf hcl-learning-hub-1.0.0-linux.tar.gz
cd hcl-learning-hub-1.0.0-linux
sudo bash install.sh
```

```text
# Windows
Extract the .zip, then right-click hcl-learning-hub-setup.exe -> Run as administrator
(or install.cmd if your bundle was built without the EXE)
```

The installer runs all pre-flight checks, loads the container images offline,
generates secrets, starts PostgreSQL, **restores `db/backup.dump` automatically**,
then starts the API and web tiers and registers auto-start (`systemd` on Linux,
a scheduled task on Windows).

### Start, stop and restore

| Action | Linux | Windows |
|---|---|---|
| Start | `sudo bash start.sh` | `start.cmd` |
| Stop | `sudo bash stop.sh` | `stop.cmd` |
| Restore a dump | `sudo bash restore-db.sh --dump <file>` | `.\Restore-Db.ps1 -DumpFile <file>` |

Full operator documentation: [packaging/README.md](packaging/README.md) and
[packaging/bundle/BUNDLE-README.md](packaging/bundle/BUNDLE-README.md).

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
