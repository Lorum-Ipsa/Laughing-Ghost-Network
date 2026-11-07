# LGN Supabase identity test plan — Codespaces
**Status: developer-facing test harness added; live signup + RLS behavior requires a test account.**

This page uses the official `@supabase/supabase-js` **v2.119.0** client and the isolated development project. LGN's normal sign-in, join and member dashboard continue to use PocketBase. It is deliberately disabled by default and always disabled for production.

## 1. Set up Codespaces

From a Codespaces terminal on `feature/horizons-source-import`, pull the latest changes and stop any already-running development server. Then:

```bash
git pull --ff-only
export LGN_SUPABASE_LAB=true
export VITE_LGN_SUPABASE_URL=https://oatdfrnytmliunauxqyd.supabase.co
export VITE_LGN_SUPABASE_PUBLISHABLE_KEY='YOUR_PUBLIC_PUBLISHABLE_KEY'
bash .devcontainer/start.sh
```

Retrieve **only the publishable key** (usually beginning `sb_publishable_`) from [Supabase project API Keys](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/settings/api-keys). **Never** use a secret or `service_role` key in `VITE_` variables. Never paste credentials into a GitHub PR or conversation. Use a Codespaces secret or temporary terminal export rather than committing an `.env` file.

Open the private Codespaces port 3000 and navigate to `/supabase-lab`. Do not change the port's visibility to Public.

## 2. Configure verification redirects (development only)

In [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/auth/url-configuration), add your **exact** Codespaces preview URL ending in `/supabase-lab` to the allowed redirect URLs. Your browser's forwarded preview URL will be a unique hostname ending in `.app.github.dev`. Use the exact host, not a wildcard.

Keep email confirmation enabled. Use a test email inbox that you control and a unique test password. **Account creation will normally return no session until the confirmation email is used.** After verifying, return to `/supabase-lab` and sign in. An unresolved email confirmation is not a Ghost profile creation failure.

## 3. Functional acceptance steps

- [ ] Create a disposable account; confirm it has a default `ghost` role in the server-only table.
- [ ] Verify email and sign in through the separate Supabase test session.
- [ ] Claim one permanent handle. The new profile must appear in `ghost_profiles`.
- [ ] Confirm an entry is created in `ghost_profile_links` for that same user, and `reserved_handles` prevents eventual reuse.
- [ ] Edit a permitted public field, then reload. It must persist.
- [ ] Run the negative authorization checks. Selecting the profile owner ID and directly changing a permanent handle must fail.
- [ ] Verify one user cannot read or alter another's private preferences, ownership, or role.
- [ ] Check the dashboard does not expose private emails in a public profile.
- [ ] Sign out. Confirm this Supabase test session does not alter the PocketBase login.
- [ ] Test suspension, account recovery and admin actions only when those server-side workflows are implemented.

The isolated test page intentionally does **not** replace the normal UI or authenticate its PocketBase routes. Its sessions currently use browser storage. Before full migration, React Router's SSR loaders and actions require a reviewed cookie-based auth implementation (typically `@supabase/ssr`).

## 4. Source-control baseline

- Applied schema snapshot: [identity-foundation.sql](identity-foundation.sql) — applied manually to the development project, **not in the migration history**.
- Applied follow-up migration: [ghost-profile-self-lookup.sql](ghost-profile-self-lookup.sql) — remote Supabase migration history version `20261107205249`.
- Capture the complete remote schema baseline before promoting to other environments. Supabase CLI **v3**, released Nov 2026, changed remote command defaults: check `supabase --version`, `supabase db pull --help`, then use `--remote` to target the hosted project. Do not reuse older `--local --yes` instructions on a remote project.
- Do not replay the unversioned snapshot over the existing project; it would conflict with existing tables.

## Current verification vs. outstanding

Verified: initial table grants and RLS flags, five tables exist, backend's fresh PocketBase migrations still pass, TypeScript and React build pass, the test route is independently gated.

Not yet verified: an actual Supabase email-confirmed signup, session refresh, RLS behavior against real accounts, and complete feature parity. A successful frontend compile does **not** certify those flows.
