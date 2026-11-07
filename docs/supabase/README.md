# LGN Supabase authentication and identity foundation

## Current state — November 7, 2026

- **Development database:** [lgn-development](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd), US East (Virginia).
- **Normal LGN pages:** \`/join\`, \`/login\`, \`/verify-email\`, \`/reset-password\`, \`/ghost-space\` now use Supabase.
- **Member profile:** After confirming email and entering Ghost Space, the account claims the chosen persistent handle. Public profile fields may be edited. Profile owner ID and role table remain private.
- **Legacy app:** PocketBase still starts in Codespaces for historical comparison and unmigrated public content, but its legacy authenticated dashboard and admin writes are **not exposed through the normal auth routes**.
- **Functional testing:** Build, typecheck, PocketBase migration, public preview smoke, and static Supabase permission checks passed. A real SMTP registration/confirmation and two-account RLS tests are still outstanding.

**Test the normal user flow:** [Normal registration test guide](normal-registration-test.md). The old \`/supabase-lab\` experiment remains development-only and is **not needed** for normal signup.

## Database

| LGN feature | Supabase object | Access |
| --- | --- | --- |
| Account identity and email confirmation | \`auth.users\` | Supabase Auth; not a public profile |
| Roles and suspension | \`lgn_private.member_access\` | Server-managed, default \`ghost\`; not user-editable |
| Public Ghost pseudonym and optional details | \`public.ghost_profiles\` | Public-safe columns only; RLS prevents changes by strangers |
| Profile preferences | \`public.ghost_profile_preferences\` | Private to owner; triggered at signup |
| Self lookup without exposing owner ID | \`public.ghost_profile_links\` | Owner-scoped lookup of profile ID only |
| Permanent handle ledger | \`lgn_private.reserved_handles\` | Server-only, no handle reuse |
| Contributions / projects / research / Table Talks | Not yet migrated | Legacy PocketBase only; no Supabase writes available |
| Admin / moderation / avatar uploads | Not yet migrated | Disabled for new Supabase accounts |

**Pseudonymity:** Browser queries never select \`ghost_profiles.owner_id\`; no private email is stored on public Ghost profiles. A \`lgn_private\` helper permits profile creation only for existing, unsuspended, **email-confirmed** Supabase users. Signup metadata cannot grant staff privileges. Handles follow \`^[a-z0-9_/-]{3,40}$\`. Default location disclosure is \`undisclosed\`.

**Lifecycle:** Signup creates an Auth account and a default private membership, but **does not yet create a public handle**. A pending requested handle is stored in non-privileged account metadata. After confirmation and first Ghost Space access, the browser claims it via the RLS-protected insert. If another user claimed it first, Ghost Space asks for a different handle. Existing account holders can sign in normally.

## Migrations and source control

- [Original identity SQL snapshot](identity-foundation.sql) was applied directly to the development project. This snapshot **is not** a numbered Supabase CLI migration. Do **not** reapply it on the initialized project.
- [Self lookup migration](ghost-profile-self-lookup.sql) is applied in remote migration history as \`20261107205249_ghost_profile_self_lookup\`.
- \`20261107214928_require_confirmed_email_for_ghost_profile\` is applied to remote migration history; it checks live confirmation and suspension before member profile writes.
- Generated database TypeScript definitions live in \`apps/web/src/lib/supabase.database.types.ts\`.

**Next migration task:** Pull a reviewed remote baseline into CLI-managed \`supabase/migrations\` and resolve migration-history consistency *before* deploying to staging or another project. Inspect \`supabase --version\` and \`supabase db pull --help\` for your actual CLI version; never replay snapshots on an already initialized database.

## Operational and security limits

- The development Codespaces frontend has a **public publishable key** fallback, but no secret or service-role key. Production must provide \`VITE_LGN_SUPABASE_URL\` and \`VITE_LGN_SUPABASE_PUBLISHABLE_KEY\`; RLS remains the authorization boundary.
- The current client-only authentication session uses browser storage and Supabase's implicit confirmation callback in the development preview. A final production deployment needs reviewed **SSR cookie / PKCE** handling and non-cacheable authenticated loaders before exposing member data on the server.
- Supabase auth SMTP was configured through the owner's dashboard. This is **not proof of mail delivery**. Validate both confirmation and recovery templates and ensure the **exact Codespaces \`/verify-email\` and \`/reset-password\` callback URLs** are on the Auth redirect allowlist.
- Supabase security advisor's two informational \`rls_enabled_no_policy\` notices concern the intentionally unexposed \`lgn_private\` tables. They have no browser policies. Reference: [Supabase RLS linter](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- Real signup-trigger and RLS behavioral tests require disposable confirmed users, including a second user and a suspended user. A successful build does not substitute for them.
- Do not paste passwords, mail transport credentials, verification tokens, secrets, or recovery fragments in GitHub or chat.

## Next development phases

1. Complete the [real registration and email verification acceptance test](normal-registration-test.md).
2. Test actual default \`ghost\` role, profile ownership, banned updates, handle collisions, and suspension behavior.
3. Migrate Ghost contributions and work versioning, review/moderation, projects, Table Talks, directory, and notifications in reviewed, versioned slices.
4. Build server-side/SSR production authentication and staging cutover plan. Keep PocketBase and Horizons available until validated and explicitly approved.
