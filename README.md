# Laughing Ghost Network (LGN)

**A cybersecurity community platform by Lorum Ipsa.**

LGN is intended for pseudonymous ("ghost") practitioner profiles, shared security research, collaborative learning, and responsible community contributions.

> **Development status:** The original Horizons application is imported on [draft PR #3](https://github.com/Lorum-Ipsa/Laughing-Ghost-Network/pull/3). The normal **Join → Verify Email → Sign In → Ghost Space** route now uses the separate **Supabase development project**. Build, typecheck, PocketBase migrations, and basic preview smoke tests pass; live email delivery and registration were confirmed by the owner; 23 rollback-only SQL authorization checks passed. Browser multi-account security and production deployment still require QA. **Do not merge or cut over the live website until approved.**

## Start here

- [Normal registration and email verification test](docs/supabase/normal-registration-test.md)
- [Supabase backend architecture and migration status](docs/supabase/README.md)
- [Supabase security acceptance results (23 checks)](docs/supabase/security-acceptance.md)
- [Private GitHub Codespaces preview](docs/codespaces-preview.md)
- [Local development setup](docs/development-local.md)
- [Development guidance](docs/development.md)
- [Current export architecture (historical PocketBase model)](docs/architecture/current-export.md)
- [Horizons migration plan](docs/migration/horizons-to-github.md)
- [Delivery roadmap](docs/roadmap.md)
- [Contribution rules](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Agent instructions](AGENTS.md)

## Architecture in transition

The source is a Bun-workspace monorepo with React / React Router / TypeScript / Tailwind in `apps/web`. The **normal account frontend** now uses **Supabase Auth + PostgreSQL RLS** in `lgn-development`, with a public publishable key for the Codespaces **development** environment only. Production deployments must supply environment-specific public Supabase settings.

The previous **PocketBase backend** remains under `apps/pocketbase` for reference/rollback and for public material that has not yet been migrated. Ghost contributions, projects, Table Talks, moderation, notifications, avatar storage, and public directory integration **have not** been fully migrated. The new Ghost Space tells users which sections are unavailable; it does not claim legacy features work on new Supabase accounts.

Browser-only Supabase Auth is suitable for the isolated development preview but **not the final SSR security architecture**. Before production, implement reviewed cookie-based SSR/PKCE session handling, then test authorization, deployment, migrations, and SMTP delivery.

## Development model

1. Open an issue with a focused outcome.
2. Develop on a branch rather than directly on `main`.
3. Open a draft pull request describing risks and evidence of testing.
4. Obtain maintainer review before merging.
5. Promote approved builds through staging before production.

LGN is a commercial Lorum Ipsa project. Public repository visibility does not imply permission to reuse materials. No open-source license has been selected yet.
