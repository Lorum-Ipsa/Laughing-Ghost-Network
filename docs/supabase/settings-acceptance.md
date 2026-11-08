# Settings Phase 1 acceptance

Ghost Space Settings shows the signed-in account's private email and Ghost handle, offers password reset by email, revokes other sessions, and saves the default language for new contributions. Profile and notification controls remain in their respective workspaces.

The publication preference uses the existing owner-scoped Supabase table. Advanced account controls add a development migration for MFA authorization, export and deactivation. Password reset uses the existing recovery route and redirect configuration. Signing out other sessions revokes refresh tokens. Existing access tokens can remain valid until expiry.

- [ ] Confirm Ghost A sees only their private sign-in email. Sign in as B and confirm B's settings are separate.
- [ ] Save a new publication language. Create a draft and check the selected default. Open an existing contribution and verify its original language remains selected. Refresh and verify the preference persists.
- [ ] Request a password reset for a synthetic account, follow the email link, set a new password, and verify login. Use the existing development Auth redirect configuration.
- [ ] Sign in to a synthetic account in two browsers, then confirm **Sign out other sessions** in one. Verify the current browser stays signed in and the other browser cannot refresh its session.
- [ ] Check the public-profile and Notifications links. Obtain final approval before production deployment.



## Advanced account controls

Email changes use Supabase Auth and the existing verification callback. Follow the confirmation links sent by the project. Authenticator MFA is TOTP. Once a factor is verified, Ghost Space and authenticated data policies require an AAL2 session. The setup key is shown for manual entry, and the application does not keep it.

The JSON export contains the caller's account and profile, preferences, authored contributions and revisions, projects, Table Talks and decisions, saved searches, follows, and sent collaboration requests and DMs. Existing encrypted messages export as ciphertext. The export excludes browser private keys, push subscriptions and Auth secrets. This is a scoped account export.

Deactivation disables the member's private access and new activity immediately and removes push subscriptions. The frontend also requests global Auth sign-out. Public profiles, public work and attribution stay visible. This action is separate from account deletion and has no self-service reactivation.

- [ ] As a test account, request an email change and complete the confirmation links. Confirm the new email works at sign-in and remains private.
- [ ] Enroll an authenticator manually and verify a code. Sign in again and confirm Ghost Space requires the authenticator before access. Check a wrong code and then a fresh valid one. Remove the factor from a verified session and confirm a subsequent login works without the challenge.
- [ ] Download the account JSON and verify a second account’s private records and device secrets are absent. Keep the export private.
- [ ] Use a dedicated disposable Ghost to test deactivation. Confirm a mismatched handle fails, then use the exact handle. Verify a previously open session loses private access, push is disabled, and published records still resolve. Never use a real account for this test.
- [ ] Complete hands-on verification before production release.

- [x] Apply [account controls](settings-account-controls.sql) to `lgn-development` as `20261108135150_phase1_settings_account_controls`. All 12 [account controls assertions](settings-account-controls-acceptance.sql) and 23 existing identity assertions passed against the installed schema.
