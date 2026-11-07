# Registration email delivery in the independent LGN preview

## The current implementation

The ordinary **Join the Network** page (`/join`) still uses PocketBase in the separate Codespaces development environment. It does **not** write to `lgn-development` in Supabase. Use the opt-in [Supabase identity lab](supabase/identity-test-plan.md) for Supabase Auth testing.

A successful PocketBase account creation is independent of outbound email delivery. The current Codespaces installer does **not** configure an SMTP provider. The migrated PocketBase settings also originated in a Horizons environment; email link destinations and sender settings must be reviewed for any standalone use. This can leave new development accounts unverified.

## What was corrected

- The verification page now reads and displays the email-request failure passed from registration instead of silently discarding it.
- The page no longer asserts that a message was definitely delivered.
- The sign-in, reset-email, and dashboard resend messages acknowledge that an accepted API request is not proof of delivery.
- An unverified Ghost may still access their dashboard for limited onboarding, as the existing LGN UI intends. Whether **all** privileged server-side operations enforce `verified=true` must be tested; do not equate a dashboard redirect with permission enforcement.

## Recommended direction

Because LGN is migrating to Supabase, do **not** invest in a production PocketBase mail service solely to support this temporary preview unless a legacy-backend test specifically requires it.

Instead:
1. Validate Supabase Auth signup and confirmation in the isolated `/supabase-lab` page.
2. Configure a suitable SMTP provider in the **Supabase development project** if using arbitrary test inboxes. Supabase's built-in email sender is limited; see [SMTP documentation](https://supabase.com/docs/guides/auth/auth-smtp).
3. Migrate `/join`, `/login`, verification and recovery as one coherent **Supabase Auth** flow with RLS and an SSR-compatible session design.
4. Verify all write permissions for unverified users before switching the default route. Keep PocketBase and the existing website preview as rollback until parity is established.

Do not embed SMTP credentials, password reset tokens, or secret API keys in GitHub or browser-exposed environment variables.
