# Horizons export architecture — initial inventory

Source: Lorum Ipsa's November 2026 LGN Horizons ZIP export. This inventory is a review of files, not a live deployment inspection.

## Application

- Root workspace: `package.json`, `bun.lock`, `bunfig.toml`.
- Frontend: `apps/web` — React 19, React Router 8 SSR, TypeScript, Tailwind, Vite.
- Backend: `apps/pocketbase` — PocketBase 0.40.4, 37 schema/data migrations and 15 server hooks in the original export.
- Features present in source: ghost identities, membership, dashboards, library, Arsenal, Table Talks, projects, contributions, messages/notifications, administrative tools.
- Builder-specific code: `apps/web/plugins`, public preview helpers, PocketBase proxy path `/hcgi/platform`, Hostinger hook integrations.
- Credentials are expected through runtime environment variables, including PocketBase superuser credentials. The .env in the original export contained comments only.
- The archive does **not** include live PocketBase database/member data.

## Critical review findings

1. A source hook initially grants administrator status to the first new user. **Do not migrate or deploy that hook.**
2. An earlier migration grants administrator status to all existing users. **Remove this role promotion from the migration candidate.** If already executed on a deployed instance, review existing roles separately.
3. UI guards do not replace server-side authorization; verify PocketBase collection rules and moderation actions independently.
4. The frontend uses a Horizons-specific relative PocketBase proxy. Independent staging requires a validated proxy/backend routing design.
5. Tooling and application build/test status have not yet been validated outside Horizons.

These findings must be remediated or independently reviewed before production cutover.

## Architecture decision

Preserve PocketBase initially for behavioral parity. Any migration to Supabase requires a separate schema, auth, policy, data, and rollback design; do not combine it with the initial frontend extraction.
