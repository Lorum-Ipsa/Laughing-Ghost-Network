# LGN Supabase identity foundation

## Live state (2026-11-07)

- **Development project:** [`lgn-development`](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd), US East (Northern Virginia).
- **Original app:** LGN's React/React Router UI still uses **PocketBase**. The working Codespaces preview and PR #3 are preserved.
- **Supabase foundation:** five tables have been created, including an owner-only profile lookup table; no real users or seeded profiles.
- **Scope:** foundation schema and an isolated development-only Supabase auth/identity test route. The main frontend still uses PocketBase. Full authentication/authorization flows have not been validated end to end.

This directory's [SQL snapshot](identity-foundation.sql) records the DDL applied to the development database. It is **not** a generated Supabase CLI migration and must **not** be replayed against the already-initialized development project.

## Source-to-target mapping

| Current PocketBase concept | Supabase target | Access |
| --- | --- | --- |
| `users` credentials | Supabase `auth.users` | Managed by Supabase Auth |
| `users.role` and `suspended` | `lgn_private.member_access` | Server-managed only; four roles: ghost/reviewer/moderator/admin |
| `ghost_profiles` basic public identity | `public.ghost_profiles` | Public safe fields only, one profile per account |
| Persistent `ghost_profiles.handle` | `lgn_private.reserved_handles` | Server-owned ledger; handles cannot be reused after deletion |
| Member-specific language/visibility settings | `public.ghost_profile_preferences` | Only the authenticated account owner |
| Secure profile self-lookup | `public.ghost_profile_links` | Each member can read only their own profile ID; the private owner ID remains hidden |
| Ghost work / Table Talks / projects / notifications | Not yet migrated | Remain with PocketBase until separate review |
| Avatars, verified external identities, visibility | Not yet migrated | Storage and selective disclosure require dedicated design |

**Pseudonymity boundary:** `ghost_profiles.owner_id` is not readable via the browser Data API. No email or civil identity is stored in a public Ghost profile. Clients must explicitly select permitted profile fields, not `select('*')`.

The Ghost handle follows the existing `^[a-z0-9_/-]{3,40}$` input rules, including the allowed slash. It cannot be changed by ordinary profile updates. Profile locations default to **undisclosed** and cannot contain a country unless disclosure is set to **country**.

## Authorization rules now in effect

- Supabase Auth generates private member membership `ghost` and owner-only preferences through a signup trigger.
- No signup metadata can specify or upgrade the role.
- Public users see only non-deleted Ghost profile fields.
- Signed-in, unsuspended members may create **one** profile and update only its ordinary display fields.
- Members cannot read another account's private preferences or a hidden `owner_id`.
- Role changes and account suspension are not writable by the browser. We will create carefully audited admin operations separately.
- `lgn_private` is not in the default Data API exposed schema list; the narrowly granted helper `is_active_member()` checks current DB role/suspension status.

## Verification evidence

Supabase confirmed all four tables exist with **RLS enabled** and no member data. Privilege checks confirmed that neither anonymous nor authenticated users can select `owner_id`, authenticated users cannot update `handle`, and they cannot read `member_access`. Supabase security advisor returned only two **informational** `rls_enabled_no_policy` findings on internal server-only tables. This is intentional: no client policies are permitted. See [Supabase security guidance](https://supabase.com/docs/guides/api/securing-your-api).

**Still unverified:** signup trigger behavior with a disposable Auth user, positive/negative owner RLS tests, session revocation after suspension, frontend login integration, profile field parity, privileged administrator routes, avatar privacy, and the rest of the LGN schema. No live data should be imported until these pass.

## Browser-facing identity test

[View the isolated Supabase identity test plan](identity-test-plan.md). The test route is off by default, is inaccessible in production, and does not replace LGN's existing PocketBase sign-in.

## Version-control next step

The initial identity SQL is a **schema snapshot**, not an official CLI migration. The subsequent self-lookup was applied to the remote project as migration `20261107205249`; see [its SQL record](ghost-profile-self-lookup.sql). In Codespaces, once a supported Supabase CLI and Docker-compatible runtime are available (CLI v3 now targets local by default; remote operations need `--remote`):

1. Read [Supabase's remote-to-local workflow](https://supabase.com/docs/guides/local-development/cli-workflows).
2. Use `supabase --version`, `supabase --help`, and `supabase db pull --help` to confirm CLI v3 commands. For the hosted project, explicitly use `--remote`.
3. Link **only** the `lgn-development` project, then capture the remote baseline with the documented `db pull` workflow. Review the generated `supabase/migrations` SQL before committing.
4. Check migration history and diff; do not re-run this SQL snapshot on the same database.
5. From then on create new migration files using `supabase migration new <name>` before pushing changes through reviewed PRs.

## Planned incremental backend migration

1. Validate Auth signup, account creation trigger, roles, owner-only preferences, and private handle reservation with disposable accounts.
2. Introduce a Supabase adapter for the login and profile flows, leaving remaining PocketBase features operational.
3. Implement administrator provisioning, membership suspension and moderated handle-change operations with integration tests.
4. Bring over Ghost work/contributions; then Table Talks, projects, research, moderation, notifications, and file storage.
5. Complete staging/deployment/rollback; migrate approved data and decommission PocketBase only after verified parity.

**Never paste service-role or secret keys into source, terminal logs, issues, or chat.** Publishable browser keys are not authorization: RLS remains mandatory.
