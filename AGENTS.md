# Instructions for human contributors and AI coding agents

These project-wide rules apply to any editor or AI agent used on LGN.

1. **Scope and approval:** Propose changes and describe the affected files before broad architectural revisions. Keep changes in branches and PRs. Do not merge, deploy, change permissions, or publish a release without explicit maintainer authorization.
2. **Product intent:** LGN is a Lorum Ipsa cybersecurity community. Ghost identities are pseudonymous by design. Protect identity separation and member privacy.
3. **Current stack:** Treat the Horizons export as React / React Router / TypeScript / Tailwind + PocketBase. Do not assume Supabase already exists, or replace PocketBase without a migration plan.
4. **Security boundaries:** Treat roles, moderation, private messages, membership records, and administrative capabilities as server-enforced trust boundaries. Never introduce first-user privilege elevation, mass role promotion, or browser-exposed superuser credentials.
5. **Sensitive content:** Do not commit .env, data stores, user data, keys, logs, or original unscreened exports.
6. **Provenance:** Preserve the original architecture and behaviors where safe. Document inferred behavior as inferred; do not claim an untested build works.
7. **Changes:** Prefer small, verifiable commits, tests for the changed behavior, and clear rollback notes. Avoid editing unrelated files.
8. **Deployment:** Production is off-limits until a staging deployment passes authentication, authorization, database, and privacy checks.
9. **Commercial rights:** Public source visibility is not equivalent to an open-source license. Do not add a license or contributor IP terms without maintainer approval.
10. **Review:** Every PR must identify risks, validation performed, and remaining unknowns.

Read [docs/migration/horizons-to-github.md](docs/migration/horizons-to-github.md) before importing source.
