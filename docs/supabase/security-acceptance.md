# Supabase identity security acceptance — November 7, 2026

**Project:** [LGN development](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd). **Source:** [Identity SQL regression suite](identity-rls-acceptance.sql).

## Results

**23/23 passed** using the transaction-wrapped SQL suite on the live **development** database. The suite created four synthetic accounts under a transaction, impersonated PostgreSQL `authenticated` and `anon` roles with different `request.jwt.claim.sub` identities, then rolled back every write. It did not create lasting accounts, send emails, or modify the existing real account.

Test coverage includes:

- Auth signup trigger provisions default Ghost membership and a private preferences row.
- User-editable metadata cannot self-promote a Ghost to administrator.
- Two verified users can create their respective handles and private self-lookup links.
- The second member cannot read the first member's preferences or self-lookup link, nor update their profile or preferences.
- An owner can update their own profile and preferences, and UPDATE operations genuinely affect one row.
- Browser roles cannot select `ghost_profiles.owner_id`, change the owner or handle, or inspect/edit internal membership roles.
- Unverified accounts cannot pass active-member checks or insert public profiles.
- Anonymous visitors can read permitted public profile fields but cannot create a Ghost profile.
- Suspension immediately removes write permissions from an already authenticated member.
- A deleted profile's handle stays reserved permanently.

This is direct **database RLS behavior testing**, not merely a textual inspection of policy definitions. It does **not** prove session revocation, API edge cases, browser RLS behavior across two independently verified real accounts, or production SSR safety. Run those before production.

## Security advisor

The Supabase security advisor currently reports:

- **Warning — Leaked Password Protection Disabled:** Configure [Auth password security](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/auth/providers?provider=Email). Supabase supports screening passwords against known leaked credentials; see [password security documentation](https://supabase.com/docs/guides/auth/password-security). This setting is in the Auth dashboard and was **not automatically changed**.
- **Two informational notices — RLS enabled without policies** on `lgn_private.member_access` and `lgn_private.reserved_handles`: intentional. These are private, unexposed server-only tables with no client grants, and their special helper functions are restricted. Review if permissions or schema exposure change.

## Repeatability and limitations

The SQL suite requires a sufficiently privileged connection to create **transaction-local synthetic** `auth.users` records, run trigger logic, and `SET LOCAL ROLE` to simulate clients. It is **not** a migration and must not be applied as permanent database DDL. It ends in `ROLLBACK`, including when all assertions pass. Run it only on an approved disposable or development database, with administrator oversight. Future automated CI should use a dedicated disposable Supabase local database and `supabase test db` with pgTAP, not production credentials.

**Observed state after testing:** one real, email-confirmed Auth user and one Ghost profile remained; synthetic test records did not persist.

## Next security acceptance gates

1. Enable leaked-password screening in Supabase Auth and re-run the advisor.
2. Repeat ownership tests using **two separately verified real test accounts** through the browser Data API, including a suspended-session test.
3. Complete Supabase Auth session and recovery tests with revoked/expired sessions, rate limiting, safe redirects and cookie policies.
4. Migrate to a production-reviewed PKCE/cookie-based SSR session model before publishing member-personalized server pages.
5. Capture a clean version-controlled Supabase migration baseline; the original schema snapshot is not replayable over the current project.
