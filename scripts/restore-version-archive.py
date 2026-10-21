#!/usr/bin/env python3
import os
import shutil
import sys
import tempfile
import zipfile
from pathlib import Path, PurePosixPath

PROTECTED_TOP_LEVEL = {
    '.git',
    '.deploy-credentials',
    '.hub-token',
    'backups',
    'logs',
    'releases',
    'scripts',
    'patches',
    'certs',
}
PRESERVE_FILES = ['.env', 'server/.env']


def copy_preserved_files(install_dir: Path, staging_dir: Path) -> None:
    for relative in PRESERVE_FILES:
        source = install_dir / relative
        if not source.exists() or not source.is_file():
            continue
        target = staging_dir / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)


def extract_with_path_normalization(archive_path: Path, extract_dir: Path) -> None:
    """Extract zip, converting Windows backslash paths to forward-slash paths."""
    with zipfile.ZipFile(archive_path, 'r') as archive:
        for member in archive.infolist():
            normalized_name = member.filename.replace('\\', '/')
            if normalized_name != member.filename or normalized_name.endswith('/'):
                target = extract_dir / PurePosixPath(normalized_name)
                if normalized_name.endswith('/'):
                    target.mkdir(parents=True, exist_ok=True)
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                with archive.open(member) as src, open(target, 'wb') as dst:
                    shutil.copyfileobj(src, dst)
            else:
                archive.extract(member, extract_dir)


def sync_archive(archive_path: Path, install_dir: Path) -> None:
    with tempfile.TemporaryDirectory(prefix='ai-quest-archive-') as temp_dir:
        extract_dir = Path(temp_dir) / 'extract'
        extract_dir.mkdir(parents=True, exist_ok=True)
        extract_with_path_normalization(archive_path, extract_dir)

        copy_preserved_files(install_dir, extract_dir)

        for child in install_dir.iterdir():
            if child.name in PROTECTED_TOP_LEVEL:
                continue
            if child.is_dir() and not child.is_symlink():
                shutil.rmtree(child)
            else:
                child.unlink()

        for child in extract_dir.iterdir():
            if child.name in PROTECTED_TOP_LEVEL:
                continue
            destination = install_dir / child.name
            if child.is_dir():
                shutil.copytree(child, destination, dirs_exist_ok=True)
            else:
                destination.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(child, destination)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: restore-version-archive.py <archive_zip> <install_dir>')
    archive_path = Path(sys.argv[1]).resolve()
    install_dir = Path(sys.argv[2]).resolve()
    if not archive_path.exists():
        raise SystemExit(f'Archive not found: {archive_path}')
    if not install_dir.exists():
        raise SystemExit(f'Install dir not found: {install_dir}')
    sync_archive(archive_path, install_dir)
