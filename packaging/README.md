# Packaging — Offline / Air-gap Distribution

This directory produces **self-contained installation bundles** for hosts that
have no internet access and no container registry.

It exists because building from source on an air-gapped host fails: the
`Dockerfile`s start from `node:20-alpine`, and `podman build` cannot reach
`registry-1.docker.io`. The bundle sidesteps that entirely — images are built
once on a connected machine and shipped as tar archives.

```
packaging/
├── build-bundle.sh     # connected Linux/macOS  -> dist-bundle/*-linux.tar.gz
├── build-bundle.ps1    # connected Windows      -> dist-bundle/*-windows.zip
├── build-exe.ps1       # Install.ps1            -> hcl-learning-hub-setup.exe
├── payload/            # (optional) Docker Desktop Installer.exe for -WithDocker
└── bundle/             # everything that ships inside the archive
    ├── bundle.env          # ports, image tags, container names, DB settings
    ├── BUNDLE-README.md    # operator documentation (becomes README.md in the archive)
    ├── lib/common.sh       # shared Bash helpers
    ├── lib/Common.ps1      # shared PowerShell helpers
    ├── install.sh          # Linux installer   (pre-flight, load, restore, run)
    ├── Install.ps1         # Windows installer (compiled into the .exe)
    ├── start.sh  / Start.ps1  / start.cmd
    ├── stop.sh   / Stop.ps1   / stop.cmd
    ├── restore-db.sh / Restore-Db.ps1
    └── install.cmd         # self-elevating fallback when no .exe is shipped
```

## Build

Run on a machine **with** internet and a running container runtime.

```bash
# Linux bundle (tar.gz)
bash packaging/build-bundle.sh
bash packaging/build-bundle.sh --with-docker --docker-version 27.3.1
```

```powershell
# Windows bundle (zip) + compiled setup.exe
powershell -ExecutionPolicy Bypass -File packaging\build-bundle.ps1 -WithExe
```

Both builders:

1. Build `hcl-learning-hub-api` and `hcl-learning-hub-web` from the repo.
2. Pull `postgres:16-alpine`.
3. `save` all three images into `images/*.tar`.
4. Copy `scripts/backup.dump` into `db/`.
5. Copy the installer / start / stop / restore scripts.
6. Emit the archive plus a `.sha256` checksum into `dist-bundle/`.

## Configuration

Everything tunable lives in [bundle/bundle.env](bundle/bundle.env) — ports,
image tags, container names, volume names, database name/user and the minimum
CPU/RAM/disk enforced by the pre-flight check. Both the Bash and PowerShell
helpers parse the same file, so a value only ever has to be changed once.

Bumping `APP_VERSION` also changes the image tags and the archive file name.

## Building the EXE

`build-exe.ps1` uses the [ps2exe](https://github.com/MScholtes/PS2EXE) module to
wrap `Install.ps1` in a native executable with an embedded UAC manifest
(`requireAdmin`), so it always elevates.

```powershell
Install-Module -Name ps2exe -Scope CurrentUser    # one time, needs internet
powershell -ExecutionPolicy Bypass -File packaging\build-exe.ps1
```

The EXE is a launcher, not a standalone archive: it reads `bundle.env`, `lib\`,
`images\` and `db\` from its own directory and must stay inside the extracted
bundle. `install.cmd` is shipped as a fallback for environments where running an
unsigned EXE is blocked.

> Sign the produced EXE with your organisation's code-signing certificate before
> distributing it, otherwise SmartScreen will warn end users.

## Relationship to the existing scripts

| Script | Use it for |
|---|---|
| `hcl-learning-hub-setup.sh` (repo root) | **Connected** hosts — installs Docker + k3s and builds from source |
| `packaging/bundle/install.sh` | **Air-gapped** hosts — loads pre-built images, no network |
| `scripts/db-backup.sh` | Capturing a dump from a live VM before decommissioning |
| `packaging/bundle/restore-db.sh` | Restoring that dump into a bundle-installed stack |
