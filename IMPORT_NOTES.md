# Sanitized LGN application source — import candidate

This folder contains the application source from the November 2026 Hostinger Horizons export, modified for the next development phase. **Not production-ready.** No live database or member data was included in the export.

## Security-related changes

- Removed the first-signup-to-admin hook.
- Removed the migration that promoted every member to admin; existing roles are preserved.
- Removed Hostinger-only backend promotion, external dashboard, mail relay, command, and session-log hooks.
- Removed Horizons browser editor/runtime plugins, and replaced Vite with a basic development-only PocketBase proxy.
- Removed environment files and added a non-secret `apps/web/.env.example` template.
- Configured PocketBase `LGN_APP_URL` per environment instead of hardcoding the live domain.

## Important limitations

1. This source **has not yet been dependency-installed or build-tested** outside Horizons.
2. Frontend browser PocketBase calls use `/hcgi/platform`. Vite development proxies this to local PocketBase, but production still requires a reverse proxy or an approved URL redesign.
3. PocketBase superuser provisioning needs explicit review. Never let a public signup become admin.
4. Outbound emails require a standalone SMTP/provider configuration. Remove/update the old confirmation/reset route assumptions before launch.
5. Some site imagery remains externally hosted on a Hostinger CDN. Self-host or replace those assets after confirming rights.
6. Security, privacy, auth rules, third-party components, license compatibility, and data migrations still require independent review.
7. Do not import a live database or real member information into GitHub. Keep Horizons published instance unchanged while staging.
8. External dependencies, hosting setup, and PocketBase runtime must be installed separately.

## Upload path

After cloning `Lorum-Ipsa/Laughing-Ghost-Network`, copy `apps/`, `package.json`, `bun.lock`, `bunfig.toml`, and optionally `knip.json` into the repository root on a new `feature/horizons-source-import` branch. Do NOT commit this unreviewed source straight to main. Run `node scripts/check-repository.mjs` before pushing. Leave `IMPORT_NOTES.md` for reviewer context if useful.
