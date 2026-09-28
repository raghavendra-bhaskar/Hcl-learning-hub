# HCL Software Learning Hub — Offline Installation Bundle

This folder is a **self-contained, air-gap installer**. Everything the platform
needs — application images, PostgreSQL, the database dump and all install /
start / stop scripts — is already inside. **No internet, no container registry
and no `npm install` are required on the target host.**

---

## 1. What is inside

| Path | Purpose |
|---|---|
| `images/` | `hcl-learning-hub-api`, `hcl-learning-hub-web` and `postgres:16-alpine` exported as tar archives |
| `db/backup.dump` | PostgreSQL dump restored automatically during installation |
| `bundle.env` | Single source of truth for ports, container names, image tags and DB settings |
| `lib/` | Shared helpers (`common.sh` for Linux, `Common.ps1` for Windows) |
| `install.sh` / `Install.ps1` | Full installer with built-in prerequisite checks |
| `start.sh` / `start.cmd` | Start the stack |
| `stop.sh` / `stop.cmd` | Stop the stack (data is preserved) |
| `restore-db.sh` / `Restore-Db.ps1` | Restore any dump later |
| `hcl-learning-hub-setup.exe` | Windows bundles built with `-WithExe`: double-clickable installer |
| `runtime/` | Optional embedded container engine |
| `MANIFEST.txt` | Build metadata and checksums |

---

## 2. Minimum system requirements

| Resource | Minimum | Recommended | With local Ollama AI Tutor |
|---|---|---|---|
| CPU | 2 vCPU (x86_64) | 4 vCPU | 8 vCPU |
| RAM | 4 GB | 8 GB | 16 GB |
| Free disk | 20 GB | 50 GB | 50 GB + ~10 GB per model |
| Network | none (air-gap) | — | — |

**Supported Linux:** RHEL 8/9, Rocky/AlmaLinux 8/9, CentOS Stream 9,
Ubuntu 22.04/24.04 LTS, Debian 12 — with Podman 4.x+ **or** Docker 24+.

**Supported Windows:** Windows 11 Pro/Enterprise, Windows 10 Pro 21H2+
(build 19044+), Windows Server 2019/2022 (build 17763+) — x86_64 with
hardware virtualization enabled and Docker Desktop 4.x (WSL2 backend).

**Ports:** `30080/tcp` inbound (the UI). `4000` (API) and `5432` (PostgreSQL)
stay on the internal container network and must **not** be exposed.

The installers verify every one of these before making any change.

---

## 3. Install on Linux

```bash
sha256sum -c hcl-learning-hub-1.0.0-linux.tar.gz.sha256
tar -xzf hcl-learning-hub-1.0.0-linux.tar.gz
cd hcl-learning-hub-1.0.0-linux

sudo bash install.sh
```

Useful options:

```bash
sudo bash install.sh --port 8080                  # different UI port
sudo bash install.sh --dir /opt/hcl-hub           # different install directory
sudo bash install.sh --host hub.internal.local    # explicit hostname for CORS
sudo bash install.sh --skip-db-restore            # start with an empty database
sudo bash install.sh --yes                        # unattended
```

The installer registers a `systemd` unit, so the stack also comes back after a
reboot:

```bash
sudo systemctl start hcl-learning-hub
sudo systemctl stop  hcl-learning-hub
```

---

## 4. Install on Windows

1. Extract the `.zip`. If Windows flagged the download, right-click the folder →
   **Properties** → **Unblock**.
2. Make sure **Docker Desktop is running** (the installer starts it if it is
   installed but stopped).
3. Right-click **`hcl-learning-hub-setup.exe`** → **Run as administrator**.
   If your bundle has no EXE, right-click **`install.cmd`** → **Run as
   administrator** instead.

Useful options:

```powershell
.\hcl-learning-hub-setup.exe -Port 8080
.\hcl-learning-hub-setup.exe -InstallDir D:\HclHub -Yes
.\hcl-learning-hub-setup.exe -SkipDbRestore
```

The installer creates a **scheduled task** named *HCL Learning Hub* that starts
the stack at boot.

---

## 5. Start and stop

| Action | Linux | Windows |
|---|---|---|
| Start | `sudo bash start.sh` | double-click `start.cmd` |
| Stop | `sudo bash stop.sh` | double-click `stop.cmd` |
| Stop + delete containers (keep data) | `sudo bash stop.sh --remove` | `.\Stop.ps1 -Remove` |

Both start scripts wait for PostgreSQL to accept connections before starting
the API, and both stop scripts shut the tiers down in reverse order so no write
is interrupted.

---

## 6. Database restore

`install.sh` / `Install.ps1` restore `db/backup.dump` automatically right after
PostgreSQL becomes healthy and **before** the API starts, so Prisma sees the
restored schema and applies only genuinely new migrations.

To restore a different dump later:

```bash
sudo bash restore-db.sh --dump /path/to/backup.dump
```

```powershell
.\Restore-Db.ps1 -DumpFile C:\backups\backup.dump
```

Both formats are detected automatically:

* **Custom format** (`pg_dump -Fc`, file starts with `PGDMP`) → `pg_restore --clean --if-exists --no-owner --no-acl --single-transaction`
* **Plain SQL** → `psql`

A timestamped `restore-*.log` is written next to the scripts. Warnings about
missing roles or `DROP … does not exist` are normal on a fresh database.

---

## 7. Credentials

The installer generates a random database password, JWT secret and local admin
password, then writes them to `.deploy-credentials` in the install directory
(mode `600` on Linux; Administrators + SYSTEM only on Windows).

Re-running the installer **reuses** the existing credentials unless `--force` /
`-Force` is given, so upgrades do not invalidate the database volume.

---

## 8. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `pinging container registry registry-1.docker.io` | An old build-from-source script is being used | Use `install.sh` from this bundle — it never pulls |
| `Image … is missing after load` | Incomplete transfer | Verify with the `.sha256` file and re-copy |
| Web loads but API calls 502 | API still applying migrations | `docker logs -f hcl-api` |
| `No container runtime available` | Podman/Docker missing | `sudo dnf install -y podman`, or rebuild the bundle with `--with-docker` |
| Port already in use | Another service on 30080 | Re-run with `--port 8080` |
| API crash-loop after restore | Dump had no `_prisma_migrations` | `docker exec hcl-api npx prisma migrate resolve --applied <migration>` |

Logs:

```bash
docker logs -f hcl-api        # or: podman logs -f hcl-api
docker logs -f hcl-web
docker logs -f hcl-postgres
```

---

## 9. Rebuilding this bundle

From a machine **with** internet and a container runtime, at the repository root:

```bash
bash packaging/build-bundle.sh --with-docker            # -> dist-bundle/*.tar.gz
```

```powershell
powershell -ExecutionPolicy Bypass -File packaging\build-bundle.ps1 -WithExe   # -> dist-bundle\*.zip
```
