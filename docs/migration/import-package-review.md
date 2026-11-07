# Import package review — 2026-11-07

**Status: ready for source upload / runtime validation pending.** This PR does not yet contain the exported application files.

## Original

- Provided Horizons export: 356 source and configuration files (after excluding ZIP directory entries).
- React + React Router SSR + TypeScript / Tailwind frontend and PocketBase 0.40.4 backend.
- No live database in the original ZIP; its included web `.env` contained comments only.

## Prepared sanitized candidate

- 272 files (including an import note and safe environment example).
- Removed the **first signup becomes admin** PocketBase hook.
- Removed the **promote every existing user to admin** logic from the RBAC migration; retained only suspension normalization.
- Removed Hostinger-specific control-plane hooks and web editor/plugin runtime.
- Replaced Vite configuration with a minimal development-time proxy for `/hcgi/platform`; production proxy still undecided.
- Changed verification mail origin from hard-coded live URL to environment-specific `LGN_APP_URL`.
- Retained features, schema migrations, and regular LGN domain hooks.

## Local screening performed

- 207 TypeScript/TSX files parsed with the TypeScript parser: 0 syntax errors.
- 47 JS files passed Node syntax checks: 0 syntax errors.
- Common token/secret patterns (private keys, GitHub/OpenAI/AWS/Stripe keys): 0 matches.
- Sanitized ZIP SHA256: `10a40a55a699ea679cfe5b9dd51f01623b4215dfc83e006ca762a70046a8dbd8`.

**This is a narrow static screen, NOT comprehensive security clearance.** No app dependencies or PocketBase binary were available in the preparation environment, so build, migration, and end-to-end tests have not been run.

## Import instructions

Download the sanitized import ZIP from the assistant's conversation attachment. Run [Import-LGN.ps1](../../scripts/Import-LGN.ps1) on a local Windows workstation with Git + Node installed, or copy `apps`, the root workspace manifests, and import notes to this branch manually.

The script verifies the ZIP SHA256, clones a new checkout, checks out this branch, stages files, runs the repository safety check, and pushes only when explicitly invoked with `-Push`. No changes are made directly to `main`.

## Acceptance criteria (before marking PR ready)

- [ ] Sanitized app files committed to this branch
- [ ] Confirm no private keys or real member data committed
- [ ] Node/Bun package install and React build pass
- [ ] PocketBase starts from a fresh empty DB and migrations complete
- [ ] Admin first-signup / mass promotion is no longer possible
- [ ] Owner admin provisioned through a controlled procedure, never public signup
- [ ] Member-auth and role-based authorization matrix tested
- [ ] Preview route and PocketBase proxy work outside Horizons
- [ ] Production cutover explicitly approved in a separate PR

Keep the existing Horizons site running; do not expose this import as production.
