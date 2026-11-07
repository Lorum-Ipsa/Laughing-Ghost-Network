# Laughing Ghost Network (LGN)

**A cybersecurity community platform by Lorum Ipsa.**

LGN is intended to help practitioners share knowledge, learn collaboratively, discuss security research, and contribute under pseudonymous community identities ("ghosts"). The project is being separated from Hostinger Horizons so it can be maintained and reviewed collaboratively.

> **Status: application imported on [draft PR #3](https://github.com/Lorum-Ipsa/Laughing-Ghost-Network/pull/3), but not production-ready.** React build, TypeScript checks, fresh PocketBase migrations, and public-homepage smoke testing pass in CI. Login, role authorization, and production hosting remain unverified. Keep Horizons live until a separately approved cutover.

## Project structure

- [Private GitHub Codespaces preview](docs/codespaces-preview.md)
- [Local development setup](docs/development-local.md)
- [Development guidance](docs/development.md)
- [Current export architecture](docs/architecture/current-export.md)
- [Horizons migration plan](docs/migration/horizons-to-github.md)
- [Delivery roadmap](docs/roadmap.md)
- [Contribution rules](CONTRIBUTING.md)
- [Security reporting](SECURITY.md)
- [Agent instructions](AGENTS.md)

## Technology in the Horizons export

The supplied export is a Bun-workspace monorepo. It contains a React / React Router / TypeScript / Tailwind frontend in `apps/web` and a PocketBase backend in `apps/pocketbase`, including database migrations and hooks. **PocketBase is the current backend; Supabase migration is a later decision, not yet implemented.**

## Development model

1. Open an issue with a focused outcome.
2. Develop on a branch rather than directly on `main`.
3. Open a draft pull request describing risks and evidence of testing.
4. Obtain maintainer review before merging.
5. Promote approved builds through staging before production.

LGN is planned as a commercial Lorum Ipsa product. Public visibility does not itself grant reuse rights; see [contribution terms](CONTRIBUTING.md). No open-source license has been selected yet.
