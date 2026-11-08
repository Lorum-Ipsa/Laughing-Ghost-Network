# Laughing Ghost Network (LGN)

**A pseudonymous cybersecurity community platform by Lorum Ipsa.**

LGN emphasizes responsible publication, demonstrated work, useful collaboration, and persistent Ghost identities—not popularity or entry barriers.

> **Development status:** The original Horizons app is imported on [draft PR #3](https://github.com/Lorum-Ipsa/Laughing-Ghost-Network/pull/3). The **Supabase development backend** now supports normal registration, verification, sign-in, profile creation, rich profile editing, public Ghost discovery, contribution drafts and submission, and protected version history. The owner verified signup, Ghost profile preview and contribution submission. New handle syntax and reviewer workflows still need browser acceptance. Build, typecheck and private preview smoke checks pass. **Do not merge or cut over the live site without approval.**

## Start here

- [Run the app in desktop VS Code + GitHub Codespaces](docs/codespaces-preview.md)
- [Test the upgraded profile and contributions](docs/supabase/profile-contributions-acceptance.md)
- [Test double-slash handles and reviewer moderation](docs/supabase/handle-moderation-acceptance.md)
- [Rules-bot screening and human escalation policy](docs/supabase/automated-moderation-policy.md)
- [Normal registration and verification test](docs/supabase/normal-registration-test.md)
- [Supabase architecture and database migration status](docs/supabase/README.md)
- [Identity security: 23 rollback-only checks](docs/supabase/security-acceptance.md)
- [Contributions security: 14 rollback-only checks](docs/supabase/contributions-rls-acceptance.sql)
- [Development guidance](docs/development.md)
- [Historical Horizons export architecture](docs/architecture/current-export.md)
- [Delivery roadmap](docs/roadmap.md)
- [Contribution rules](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [AI agent instructions](AGENTS.md)

## Architecture in transition

The source is a Bun-workspace monorepo with React/React Router/TypeScript/Tailwind in `apps/web`.

**Supabase Auth and PostgreSQL RLS** back the normal visitor account flow and Ghost Space. Public profiles are explicitly selected from Supabase for the directory and the individual Ghost page. The new `ghost_contributions` table supports private drafting and immutable revision snapshots. Authorized reviewers can now request revisions, reject, or publish with an audit trail. Persistent handles support mixed case, paired `//` and approved punctuation. A deterministic rules bot screens each submitted version, while rejection and publication remain human decisions.

The old **PocketBase backend** remains under `apps/pocketbase` as a migration/rollback reference and currently supplies some legacy public content. Existing PocketBase data was **not imported**. The public directory can display both Supabase and legacy Ghost profiles.

**Still missing:** reviewer role-assignment UI, two-user browser acceptance, member file uploads and avatar storage; full private visibility settings and profile-hidden values; projects, Table Talks, notifications, moderation operations; production deployment. Do not infer completeness from the appearance of a navigation item.

The current browser-only Supabase Auth implementation is for **development**. Production requires reviewed cookie-backed SSR/PKCE sessions, hardened caching/redirects, production secrets management, versioned migration baseline and staging tests. Public publishable browser keys are not secret, but private keys must never enter the client or the repository.

## Development model

1. Work on a branch with a focused issue and documented constraints.
2. Test migrations against the development environment and commit their exact source.
3. Run SQL authorization checks and GitHub CI on each substantial change.
4. Review the draft pull request before merge or deployment.
5. Cut over Horizons only after formal acceptance of a separate staging build.

LGN is a commercial Lorum Ipsa project. Public repository visibility does not itself grant permission to reuse code or materials. No open-source license has been selected.
