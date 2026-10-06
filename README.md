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

### Running from source on Windows

The repository now includes Windows source-deployment scripts in `deploy/*.ps1`
with `deploy/*.cmd` launchers so you can run the same install, start, stop,
sync and upgrade lifecycle on a Windows machine.

Run the installer from an elevated PowerShell or Command Prompt in the cloned
repository root:

```powershell
deploy\install.cmd -DatabaseUrl postgresql://hcluser:password@127.0.0.1:5432/hclhub
```

Useful options:

```powershell
deploy\install.cmd -ServerHost laptop01.contoso.local
deploy\install.cmd -DatabaseUrl postgresql://u:p@dbhost:5432/hclhub -SkipDbRestore
deploy\install.cmd -Dump D:\Backups\hcl-hub-latest.dump
deploy\install.cmd -UiPort 5173 -ApiPort 4000
```

What the Windows installer does:

| Step | What it does |
|---|---|
| 1 | Verifies Git, PowerShell and Node.js 20+ |
| 2 | Installs root and `server/` npm dependencies |
| 3 | Writes `server/.env`, `deploy/hub.env` and `.deploy-credentials` |
| 4 | Generates local development certificates |
| 5 | Generates Prisma client, applies migrations, optionally restores a dump, and seeds the local admin |

The Windows scripts expect PostgreSQL client tools to be installed locally if
you want backup or restore support. `deploy/runtime.ps1` automatically prefers
the highest PostgreSQL version found under `C:\Program Files\PostgreSQL\<version>\bin`.

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
`hcluser` write into it. Skipping it makes curl fail with
`(23) Failure writing output to destination` — that error means the download
itself worked and only the local write was refused. If the repository is later
made public, the `-H "Authorization: token ..."` header can simply be dropped.

Verify the download before running it, since a truncated or error response would
otherwise be executed as a script:

```bash
head -3 install.sh    # must start with #!/bin/bash
```

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
bash install.sh --database-url postgresql://u:p@dbhost:5432/hclhub   # external DB
bash install.sh --pg-version 15                             # PGDG major version
```

#### If PostgreSQL cannot be installed

On RHEL with an **expired subscription**, `dnf install postgresql-server` fails
with `No match for argument: postgresql-server` because the AppStream repository
is no longer reachable. The installer detects this and automatically falls back
to the PostgreSQL community (PGDG) repository, which needs no Red Hat
subscription. PGDG installs to `/usr/pgsql-<n>/` and the service is named
`postgresql-<n>`; the scripts record both in `deploy/hub.env`, so
`start.sh` and `sync.sh` keep working without further changes.

Two PGDG quirks the installer handles for you:

- PGDG publishes per **major** release (`rhel-9`), but RHEL expands
  `$releasever` to the **minor** version (`9.0`), so the stock repo file 404s on
  `repomd.xml`. The installer rewrites the URLs to the major version and keeps a
  `.hcl-hub.bak` copy.
- The repo RPM enables every `pgdg<N>` repo. An unreachable one (for example
  `pgdg18`) aborts the whole transaction, so only the major being installed is
  enabled.

If PGDG is also blocked, point the Hub at a database you already have:

```bash
bash install.sh --database-url postgresql://user:pass@dbhost:5432/hclhub
```

That skips the local server entirely. You still need the `psql` and `pg_restore`
client tools on the VM for the dump restore to run. To keep it all on one host,
run PostgreSQL as a container and point at that:

```bash
podman run -d --name hcl-postgres -p 5432:5432 \
  -e POSTGRES_USER=hcluser -e POSTGRES_PASSWORD='<pick-one>' -e POSTGRES_DB=hclhub \
  -v hcl-pgdata:/var/lib/postgresql/data --restart unless-stopped \
  docker.io/postgres:16-alpine

bash install.sh --database-url postgresql://hcluser:'<pick-one>'@127.0.0.1:5432/hclhub
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
bash deploy/sync.sh --version 1.0.1   # same sync, but tag this rollout with a product version
bash deploy/sync.sh --code-only  # git pull -> deps -> Prisma client -> restart; no DB work
bash deploy/rollback.sh     # roll back to the previous recorded version + backup
bash deploy/uninstall.sh    # stop and remove the source deployment from this VM
```

| Script | Options |
|---|---|
| `start.sh` | `--foreground` to run attached to the terminal |
| `stop.sh` | `--with-db` to stop PostgreSQL too |
| `sync.sh` | `--version <label>`, `--code-only`, `--restore <dump>`, `--no-restart`, `--backup-only` |
| `rollback.sh` | `--to-version <label>`, `--restore <dump>`, `--no-restore`, `--no-restart`, `--yes` |
| `uninstall.sh` | `--no-backup`, `--purge-db`, `--purge-backups`, `--yes` |

`sync.sh` is what you run after any further development. It **always takes a
database backup first** into `backups/` (keeping the 10 most recent), then stops
the Hub, pulls the branch, reinstalls dependencies, regenerates the Prisma
client, applies new migrations and starts everything again. Local edits are
stashed automatically rather than blocking the pull.

Each sync can now be tagged with your own rollout number using
`--version <label>`. Release metadata is written into `releases/`:

- `releases/current-release.env`
- `releases/previous-release.env`
- `releases/release-<timestamp>-<commit>.env`

That metadata is what `deploy/rollback.sh` uses to jump back to the previous
source version.

For a **code-only rollout** on a VM where `pg_dump` is unavailable or the
database is managed separately, run `bash deploy/sync.sh --code-only`. It pulls
GitHub changes, refreshes dependencies, regenerates the Prisma client, and
restarts the application. It deliberately does not back up, migrate, or restore
the database.

Logs and state live in the install directory:

```bash
tail -f logs/hub.log        # combined API + UI output
cat .deploy-credentials     # admin password, DB password (mode 600)
ls backups/                 # pre-sync database dumps
ls releases/                # rollout version metadata used by rollback.sh
```

### Windows start, stop and sync

On Windows, run the matching `.cmd` wrappers from the repository root:

```powershell
deploy\start.cmd
deploy\stop.cmd
deploy\sync.cmd
deploy\sync.cmd -Version 1.0.1
deploy\sync.cmd -CodeOnly
deploy\sync.cmd -Restore latest
deploy\upgrade.cmd
```

| Script | Options |
|---|---|
| `install.cmd` | `-ServerHost <fqdn>`, `-DatabaseUrl <url>`, `-Dump <file>`, `-SkipDbRestore`, `-UiPort <port>`, `-ApiPort <port>` |
| `start.cmd` | `-Foreground` |
| `stop.cmd` | `-WithDb` prints a reminder; PostgreSQL service stop remains manual on Windows |
| `sync.cmd` | `-Version <label>`, `-CodeOnly`, `-Restore <dump|latest>`, `-NoRestart`, `-BackupOnly`, `-NoBackup` |
| `upgrade.cmd` | `-Version <label>`, `-Restore <dump|latest>`, `-CodeOnly`, `-NoRestart`, `-NoBackup` |

`sync.cmd` mirrors the Linux sync flow: it can create a fresh backup, stop the
running app, pull Git changes, refresh dependencies, regenerate Prisma, apply
migrations, optionally restore a dump, and start the app again.

### VM sync and versioned rollout steps

For your VM `blmycldtl596461.nonprod.hclpnp.com`, the normal source upgrade flow is:

```bash
cd ~/software/hcl-learning-hub
git status
bash deploy/sync.sh --version 1.0.1
```

What happens during that sync:

1. A new database dump is created in `backups/`.
2. `backups/latest.dump` is refreshed to point to the newest dump copy.
3. The current app is stopped.
4. The latest Git code is pulled.
5. Dependencies and Prisma client are refreshed.
6. Migrations run.
7. The app restarts on the upgraded code.
8. Rollout metadata is written into `releases/`.

If you want a rollback later:

```bash
cd ~/software/hcl-learning-hub
bash deploy/rollback.sh                 # go to previous recorded release
bash deploy/rollback.sh --to-version 1.0.1
```

`rollback.sh` takes a fresh **safety backup first**, then checks out the earlier
commit and restores the matching pre-sync dump unless you pass `--no-restore`.

### Cross-platform sync workflows

Use the scripts according to the machine that is hosting the application:

| Host machine | Install | Start | Stop | Sync |
|---|---|---|---|---|
| Linux VM | `bash deploy/install.sh` | `bash deploy/start.sh` | `bash deploy/stop.sh` | `bash deploy/sync.sh` |
| Windows host | `deploy\install.cmd` | `deploy\start.cmd` | `deploy\stop.cmd` | `deploy\sync.cmd` |

Typical flows:

1. **Windows laptop backing up a Linux VM**
   - Run `deploy/Backup-Remote.ps1` on Windows.
   - It calls `deploy/sync.sh --backup-only` on the VM over SSH.
   - The newest dump is copied back to Windows for safekeeping.

2. **Linux VM restoring a dump created elsewhere**
   - Copy the `.dump` file into `backups/` or `scripts/` on the VM.
   - Run `bash deploy/sync.sh --restore latest` or `bash deploy/sync.sh --restore <file>`.

3. **Windows host restoring a dump from a Linux VM**
   - Copy the `.dump` file into `backups\`, `scripts\`, or another local path on Windows.
   - Run `deploy\sync.cmd -Restore latest` or `deploy\sync.cmd -Restore D:\path\file.dump`.

4. **Code-only rollout when database movement is handled separately**
   - Linux: `bash deploy/sync.sh --code-only`
   - Windows: `deploy\sync.cmd -CodeOnly`

Do not copy `node_modules` or `server/node_modules` between Windows and Linux.
Only move source files and PostgreSQL dump files between operating systems.

### Database backup and restore

**Which user?** Everything uses the application role **`hcluser`** (the owner of
the `hclhub` database), not the `postgres` superuser. Its password is generated
at install time and stored in `.deploy-credentials`. Backup and restore use the
same role, so no superuser access is needed for day-to-day operation.

| Task | OS user | DB role | Why |
|---|---|---|---|
| `pg_dump` / `pg_restore` of `hclhub` | `hcluser` | `hcluser` | Owns every object in the database |
| Cluster-wide roles dump (`pg_dumpall --globals-only`) | `postgres` | `postgres` | Roles live outside any single database |

On the VM, the simplest backup is:

```bash
cd ~/software/hcl-learning-hub
bash deploy/sync.sh --backup-only      # -> backups/hcl-hub-<timestamp>.dump
```

`deploy/sync.sh` also refreshes `backups/latest.dump` every time it creates a
new backup, so the most recent dump is always easy to find.

That is safe while the Hub is running — `pg_dump` takes a consistent snapshot
and does not lock the application out.

The equivalent manual command, if you prefer to run it yourself:

```bash
cd ~/software/hcl-learning-hub
export PGPASSWORD="$(grep '^DB_PASSWORD=' .deploy-credentials | cut -d= -f2-)"
pg_dump -h 127.0.0.1 -p 5432 -U hcluser -d hclhub \
        --format=custom --no-owner --no-acl \
        -f backups/manual-$(date +%Y%m%d-%H%M%S).dump
unset PGPASSWORD
```

Restore a dump (this **overwrites** current data):

```bash
bash deploy/sync.sh --restore backups/hcl-hub-20260928-140000.dump
bash deploy/sync.sh --restore latest
```

`--no-owner --no-acl` on dump and `--clean --if-exists` on restore are what let a
dump taken on one VM load cleanly onto another where roles may differ.

The files in `scripts/` such as `scripts/backup.dump` and `scripts/backup1.dump`
are static dump files kept in the repository for install/restore scenarios. New
operational backups created on the VM are written under `backups/`, not back into
`scripts/`.

### Rollback and uninstall

Rollback script:

```bash
cd ~/software/hcl-learning-hub
bash deploy/rollback.sh
bash deploy/rollback.sh --to-version 1.0.1
bash deploy/rollback.sh --to-version 1.0.1 --no-restore
```

Uninstall script:

```bash
cd ~/software/hcl-learning-hub
bash deploy/uninstall.sh
bash deploy/uninstall.sh --purge-db --purge-backups --yes
```

`uninstall.sh` stops the application first and, by default, takes one final
backup before removing the source deployment.

### Kubernetes or not?

Not every deployment of this project runs on Kubernetes.

- `deploy/` scripts = **source deployment on a VM**, not Kubernetes
- `hcl-learning-hub-setup.sh` and `k8s/` = **k3s / Kubernetes deployment path**
- `packaging/` = offline container bundle path

So if you install with `deploy/install.sh` on the VM, that VM is running the Hub
directly from source with PostgreSQL as a service. It is **not** using k3s pods.

If you want to check whether a host is running the Kubernetes flavor:

```bash
k3s kubectl get ns hcl-learning-hub
k3s kubectl get deploy,sts,svc,pods -n hcl-learning-hub
k3s kubectl get pods -n hcl-learning-hub -o wide
```

Expected main workloads in k3s mode are:

- `deployment/web`
- `deployment/api`
- `statefulset/postgres`

There is also a helper validator:

```bash
bash scripts/validate.sh
```

That script auto-detects whether the host is running `k3s`, `podman`, `docker`,
or no container runtime, and prints the current pod/container state.

### Automatic backups from a Windows laptop

[deploy/Backup-Remote.ps1](deploy/Backup-Remote.ps1) triggers the dump on the VM,
copies it to your laptop, verifies it and prunes old copies. Database credentials
stay on the VM — the script never sees them.

```powershell
# One-off
.\deploy\Backup-Remote.ps1 -VmHost blmycldtl596461.nonprod.hclpnp.com

# Daily at 02:00, unattended
.\deploy\Backup-Remote.ps1 -VmHost blmycldtl596461.nonprod.hclpnp.com `
                           -Destination D:\HclHubBackups -InstallTask
```

**Key-based SSH is required** for the scheduled task — a background task cannot
answer a password prompt, so the script runs SSH in `BatchMode` and fails fast
with instructions rather than hanging. Set the key up once:

```powershell
ssh-keygen -t ed25519 -C "hcl-hub-backup"
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh hcluser@<vm> `
  "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
ssh hcluser@<vm> "echo ok"     # must NOT prompt for a password
```

| Parameter | Default | Purpose |
|---|---|---|
| `-VmUser` | `hcluser` | SSH user |
| `-InstallDir` | `/home/<user>/software/hcl-learning-hub` | Hub location on the VM |
| `-Destination` | `%USERPROFILE%\HclHubBackups` | Local folder |
| `-KeepDays` | `30` | Prune local dumps older than this (`0` disables) |
| `-IdentityFile` | — | Explicit private key |
| `-TaskTime` | `02:00` | Schedule time with `-InstallTask` |

The script checks the downloaded file starts with the `PGDMP` magic bytes, so a
truncated transfer is reported instead of sitting unnoticed until you need it.

### Logging in locally

The **Local account** form on the login page authenticates against the `User`
table — it is not a static env-var check. A sign-in works only if a row exists
with that email, `isLocalUser = true` and a bcrypt `passwordHash`.

Setting `LOCAL_ADMIN_PASSWORD` alone does **not** create that row; it is only the
password that `server/scripts/seed-admin.mjs` hashes. The installer runs the
seeder whenever the database has no `ADMIN` user, creating:

| Field | Value |
|---|---|
| Email | `admin@local` |
| Password | `ADMIN_PASSWORD` from `.deploy-credentials` |
| Role | `ADMIN` |

Run it again at any time:

```bash
cd ~/software/hcl-learning-hub
npm run seed:admin        # re-hashes LOCAL_ADMIN_PASSWORD from server/.env
```

If you see **Invalid credentials** right after an install, check whether the
restore actually loaded any users:

```bash
PGPASSWORD="$(grep '^DB_PASSWORD=' .deploy-credentials | cut -d= -f2-)" \
  psql -h 127.0.0.1 -U "$(grep '^DB_USER=' .deploy-credentials | cut -d= -f2-)" \
       -d "$(grep '^DB_NAME=' .deploy-credentials | cut -d= -f2-)" \
       -tAc 'SELECT count(*) FROM "User";'
```

`0` or `1` means the dump's users were not restored — see the version note below.

### pg_restore version compatibility

A custom-format dump records an archive version that `pg_restore` refuses to
read if it is **newer than the tool**. This is the most common cause of a
restore that exits non-zero and leaves an empty database:

| Archive version | Written by | Minimum `pg_restore` |
|---|---|---|
| `1.14` | PostgreSQL ≤ 15 | 12 |
| `1.15` | PostgreSQL 16 | 16 |
| `1.16` | PostgreSQL 17 | 17 |

Check what you have:

```bash
od -An -tu1 -j5 -N2 scripts/backup.dump   # prints e.g. "1 16"  -> archive 1.16
pg_restore --version                      # the client that must be >= the table above
```

RHEL 9 ships `pg_restore` 14, so a 1.16 dump fails with
`unsupported version (1.16) in file header`. The installer now detects this and
tells you before attempting the restore.

The simplest fix is to run a container whose PostgreSQL major is at least as new
as the dump, and restore using **that container's** `pg_restore`:

```bash
podman rm -f hcl-postgres
podman run -d --name hcl-postgres -p 5432:5432 \
  -e POSTGRES_USER=hcl_hub -e POSTGRES_PASSWORD=hcl_hub_dev \
  -e POSTGRES_DB=hcl_learning_hub \
  -v hcl-pgdata:/var/lib/postgresql/data --restart unless-stopped \
  docker.io/postgres:17-alpine

cd ~/software/hcl-learning-hub
podman cp scripts/backup.dump hcl-postgres:/tmp/backup.dump
podman exec -e PGPASSWORD=hcl_hub_dev hcl-postgres \
  pg_restore -U hcl_hub -d hcl_learning_hub \
             --clean --if-exists --no-owner --no-acl /tmp/backup.dump
```

Then restart the Hub so Prisma reconnects:

```bash
bash deploy/stop.sh && bash deploy/start.sh
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
