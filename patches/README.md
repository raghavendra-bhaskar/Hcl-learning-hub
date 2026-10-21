# Product Version Patch Archive

This directory keeps a simple manual archive of product versions that you asked to preserve for display and patch-reference purposes.

## Files

- `index.json` — top-level list of available versions.
- `version-3.json`
- `version-4.json`
- `version-5.json`
- `version-6.json`

## How to use it

- Open `index.json` to see all preserved versions.
- Open the matching `version-*.json` file for the version you want to show.
- `displayVersion` is the human-facing version string.
- `defaultNextPatch` is the patch value to use as the next suggested patch for that base version.
- `status` shows whether the version is archived, previous, or current.

## Notes

- Versions `5` and `6` align with the current deployment metadata kept in `releases/`.
- Versions `3` and `4` are preserved as manual archive records because the current repo does not retain full historical release metadata for them.
