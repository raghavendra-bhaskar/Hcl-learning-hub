# Product Version Patch Archive

This directory keeps a simple manual archive of product versions that you asked to preserve for display and patch-reference purposes.

## Files

- `index.json` — top-level list of available versions.
- `version-3.json`
- `version-4.json`
- `version-5.json`
- `version-6.json`
- `version-7.json`
- `upgrade-to-7.patch`
- `version-archives/manifest.json` — generated zip archive map for dated snapshot folders.

## How to use it

- Open `index.json` to see all preserved versions.
- Open the matching `version-*.json` file for the version you want to show.
- `displayVersion` is the human-facing version string.
- `defaultNextPatch` is the patch value to use as the next suggested patch for that base version.
- `status` shows whether the version is archived, previous, or current.
- Run `scripts/build-version-archives.ps1` to generate zip archives from `D:\Windsurf\AI-Quest*` snapshot folders.
- Historical versions can be backed by a zip archive even when they do not have VM `releases/release-*.env` metadata.
- Apply `upgrade-to-7.patch` on top of a version `6` checkout to move the source tree to version `7` tracking.

## Notes

- Versions `5` and `6` align with the current deployment metadata kept in `releases/`.
- Versions `3` and `4` can be upgraded from manual archive records to archive-backed rollback sources once the version zip manifest is generated.
- Version `7` is tracked as the next upgrade patch rather than a previously recorded deployed release.
