# Import package review — 2026-11-07

**Status: source imported in draft PR #3.** CI now passes dependency installation, React build, TypeScript, PocketBase migrations from an empty database, and browser-facing homepage and health smoke checks. Full account/role and email workflows remain untested.

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

**This static screening is not a security certification.** GitHub Actions now tests the frontend build, fresh PocketBase migrations, absence of automatic superuser creation, and public homepage response. Authentication, role permissions, and email flows are not yet verified.

## Import history

The sanitized application was uploaded to `feature/horizons-source-import` and is reviewable in [PR #3](https://github.com/Lorum-Ipsa/Laughing-Ghost-Network/pull/3). Do not rerun the original one-time import script against this populated branch. Use the [Codespaces preview guide](../codespaces-preview.md) or [local setup](../development-local.md) for development.

## Acceptance criteria (before marking PR ready)

- [x] Sanitized app files committed to this branch
- [ ] Confirm no private keys or real member data committed
- [x] Node/Bun package install, React build and TypeScript checks pass
- [x] PocketBase fresh migration completes and server starts
- [x] Known automatic admin promotion removed; no PocketBase superuser is created by migration
- [ ] Owner admin provisioned through a controlled procedure, never public signup
- [ ] Member-auth and role-based authorization matrix tested
- [x] Disposable preview can serve the homepage and API health route outside Horizons
- [ ] Production cutover explicitly approved in a separate PR

Keep the existing Horizons site running; do not expose this import as production.
