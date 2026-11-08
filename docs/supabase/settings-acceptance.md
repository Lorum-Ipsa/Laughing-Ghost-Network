# Settings Phase 1 acceptance

Ghost Space Settings shows the signed-in account's private email and Ghost handle, offers password reset by email, revokes other sessions, and saves the default language for new contributions. Profile and notification controls remain in their respective workspaces.

The publication preference uses the existing owner-scoped Supabase table. No database migration is needed. Password reset uses the existing recovery route and redirect configuration. Signing out other sessions revokes refresh tokens. Existing access tokens can remain valid until expiry.

- [ ] Confirm Ghost A sees only their private sign-in email. Sign in as B and confirm B's settings are separate.
- [ ] Save a new publication language. Create a draft and check the selected default. Open an existing contribution and verify its original language remains selected. Refresh and verify the preference persists.
- [ ] Request a password reset for a synthetic account, follow the email link, set a new password, and verify login. Use the existing development Auth redirect configuration.
- [ ] Sign in to a synthetic account in two browsers, then confirm **Sign out other sessions** in one. Verify the current browser stays signed in and the other browser cannot refresh its session.
- [ ] Check the public-profile and Notifications links. Obtain final approval before production deployment.

Email changes, MFA, account export and deactivation remain outside this slice.
