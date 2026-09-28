Place "Docker Desktop Installer.exe" here before running:

    powershell -ExecutionPolicy Bypass -File packaging\build-bundle.ps1 -WithDocker

The builder copies it into the bundle as runtime\Docker Desktop Installer.exe so
that Install.ps1 can install the runtime on an air-gapped Windows host.

Download it on a connected machine from https://www.docker.com/products/docker-desktop
and confirm that your Docker Desktop subscription permits internal redistribution.

The Linux builder does NOT need this folder — use:

    bash packaging/build-bundle.sh --with-docker

which downloads the Docker Engine static binaries directly.

This folder is git-ignored; the file is only a placeholder to keep it present.
