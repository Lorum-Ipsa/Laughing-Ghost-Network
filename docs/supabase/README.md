# LGN Supabase development foundation

## Status — November 8, 2026

**Project:** [lgn-development](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd), US East.

- **User-tested account flow:** normal `/join` registration, Hostinger/Supabase verification mail, confirmation, sign-in, password recovery and profile persistence.
- **Implemented on the feature branch:** rich Ghost profile editor, Supabase public profile route and searchable directory, private contribution drafts, submission for review, withdraw/archive/restore, owner-only version snapshots.
- **Verified automatically:** GitHub frontend build, TypeScript, preview smoke, PocketBase clean migration, and **23 identity + 14 contribution** PostgreSQL permission checks, all rolled back.
- **Owner-tested:** profile preview, editing and concise contribution submission. **Pending acceptance:** new case-preserving handles, moderator review UI and full two-account browser/API security.
- **New features implemented:** mixed-case punctuated permanent handles; gated reviewer queue with request-revision, reject and publish actions, private feedback and public approved-work pages. **Still not production-ready:** reviewer role-assignment UI, private field visibility, avatar uploads, projects, Table Talks, notifications and SSR/PKCE hardening.

## Data and RLS boundaries

| Area | Database object | Access |
| --- | --- | --- |
| Account and confirmation | `auth.users` | Managed by Supabase Auth; email never a public profile field |
| Role and suspension | `lgn_private.member_access` | Server-managed, default `ghost`; no browser table privileges |
| Public Ghost identity | `public.ghost_profiles` | Safe public columns; owner edits only |
| Private preferences | `public.ghost_profile_preferences` | Only account owner reads/updates |
| Owner's profile lookup | `public.ghost_profile_links` | Only linked owner can see `profile_id` |
| Handle retention | `lgn_private.reserved_handles` | Server-managed and permanent |
| Draft/submitted work | `public.ghost_contributions` | Authenticated author only; published work publicly readable |
| Immutable snapshots | `public.ghost_contribution_revisions` | Author can view, nobody can update directly from browser |
| Reviewer decisions | `public.ghost_contribution_reviews` | Authors and authorized reviewers see feedback; audit writes through restricted RPC only |
| Publication action | `public.review_ghost_contribution` | Role/ownership/version checked; cannot approve one's own work |
| Attachments | Not yet implemented | Unavailable until secure file scanning and storage |

**Important public disclosure rule:** Newly supported skills, tools, working languages, location country, availability, avatar-template key, and external links are stored in **publicly readable profile columns**. The new editor explicitly warns that hiding a value currently requires removing it. Private preferences exist, but they do **not** yet provide a secure public/private split for all those fields. Do not add a misleading hide toggle until that separate storage and projection layer is implemented.

There is no civil identity requirement. Account email, Auth ID, role/suspension record, and internal account-to-profile association are excluded from public browser queries.

Contribution status is constrained server-side. Members can submit drafts but **cannot publish them**. A separately authorized reviewer, moderator or admin can publish via a restricted, audited action; they cannot review their own work. Updates create numbered immutable snapshots. Blank or incomplete drafts can be saved privately. Submission requires a nonblank title and at least one of summary, body, code, or source URL; no arbitrary prose length minimum applies. Suspended or unverified users cannot create/edit work.

## Applied database migrations

The initial foundation schema was applied manually and recorded as [a historical snapshot](identity-foundation.sql), **not** as a CLI migration. The later remote migrations have been exported **exactly** from `supabase_migrations.schema_migrations.statements` to [applied-remote-migrations/](applied-remote-migrations/). They are not meant to be replayed onto an already initialized project:

- `20261107205249_ghost_profile_self_lookup`
- `20261107214928_require_confirmed_email_for_ghost_profile`
- `20261107225329_expand_ghost_profile_and_contribution_drafts`
- `20261107225449_fix_contribution_profile_link_rls`
- `20261107230314_index_contributions_by_profile`
- `20261108073825_allow_concise_contribution_submissions`
- `20261108074923_case_preserving_punctuated_ghost_handles`
- `20261108075127_moderated_contribution_review_workflow`
- `20261108080058_consolidate_review_queue_rls_and_index_reviewer`

**Next release-engineering task:** establish a clean Supabase CLI remote-to-local baseline, compare migration history, and test a disposable rebuild before staging. Do not guess or duplicate migration versions.

## Security evidence

- [23 identity/RLS regression assertions](identity-rls-acceptance.sql), [summary](security-acceptance.md).
- [14 contribution/RLS regression assertions](contributions-rls-acceptance.sql), plus 8 short-submission acceptance tests on the revised trigger.
- [Human acceptance guide](profile-contributions-acceptance.md).
- [Handle and moderator guide](handle-moderation-acceptance.md) with [6 handle checks](handle-validation-rls-acceptance.sql) and [18 reviewer checks](reviewer-workflow-rls-acceptance.sql), all passing in rollback-only transactions.

The 14 contributions tests exercise real PostgreSQL RLS under synthetic authenticated/anonymous actors, submission requirements, revision snapshots, forbidden self-publication, cross-user isolation, and suspension. All database test writes are inside `BEGIN`/`ROLLBACK`.

The security advisor flags the intentional callable SECURITY DEFINER review RPC as an elevated surface. Its private role, ownership and version checks were tested, but require independent staging review. Two informational findings on unexposed private tables are expected. The earlier leaked-password warning was not present on the latest scan. The Performance Advisor noted an unindexed profile foreign key; `20261107230314` adds a covering profile index. Connection-allocation performance tuning remains a scaling concern.

## Known operational constraints

- Current Ghost profile public pages can render Supabase profile fields. Supabase contribution **publishing** is now implemented for authorized reviewers; the public work detail route still uses the legacy model.
- Projects/Table Talks/notifications and privileged administrative operations are not available on the new Supabase account system.
- Codespaces works through **desktop VS Code / private port 3000 / localhost** in the current test environment; GitHub's remote `app.github.dev` forwarding previously returned 404 despite the server responding correctly.
- Development-mode public publishable credentials must be replaced by environment-specific credentials for deployments. No secret keys or SMTP passwords belong in the repo.
- Browser-only implicit auth is not the final production SSR/PKCE architecture. Cookie and cache-boundary review is mandatory before deployment.
