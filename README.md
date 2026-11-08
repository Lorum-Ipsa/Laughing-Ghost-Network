# Laughing Ghost Network (LGN)

**A pseudonymous cybersecurity community platform by Lorum Ipsa.**

LGN emphasizes responsible publication, demonstrated work, useful collaboration, and persistent Ghost identities—not popularity or entry barriers.

> **Development status** — Phase 1 is deployed to a temporary Hostinger site for acceptance review. The review site uses the `lgn-development` Supabase project. Production cutover requires maintainer approval.

## Phase 1 review

- [Open the hosted test site](https://dimgrey-spider-282826.hostingersite.com/)
- [Run the Phase 1 acceptance checklists](docs/supabase/README.md#phase-1-acceptance)

Use dedicated test accounts and synthetic content when testing signed-in flows.

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

Supabase is the only runtime database. The retired PocketBase source remains available in Git history. There were no active member accounts to migrate. The fictional public profiles and work are bundled with the app.

**Acceptance pending:** Complete the [feature checklists](docs/supabase/README.md) on the hosted test site before final approval.

The current browser-only Supabase Auth implementation is for **development**. Production requires reviewed cookie-backed SSR/PKCE sessions, hardened caching/redirects, production secrets management, versioned migration baseline and staging tests. Public publishable browser keys are not secret, but private keys must never enter the client or the repository.

## Development model

1. Work on a branch with a focused issue and documented constraints.
2. Test migrations against the development environment and commit their exact source.
3. Run SQL authorization checks and GitHub CI on each substantial change.
4. Review the draft pull request before merge or deployment.
5. Cut over Horizons only after formal acceptance of a separate staging build.

LGN is a commercial Lorum Ipsa project. Public repository visibility does not itself grant permission to reuse code or materials. No open-source license has been selected.
