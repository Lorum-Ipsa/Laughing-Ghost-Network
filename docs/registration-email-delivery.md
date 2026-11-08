# LGN registration email delivery — active development path

## Supabase is the normal identity backend

The regular \`/join\`, \`/login\`, \`/verify-email\`, \`/reset-password\`, and \`/ghost-space\` paths now use Supabase in the GitHub development branch. The old PocketBase registration flow is no longer the normal route. Historical PocketBase data remains separate and was **not migrated**.

The Hostinger mail account is \`admin@laughingghost.net\`. Existing aliases include \`no-reply@laughingghost.net\` and \`support@laughingghost.net\`, all delivering to the administrator mailbox. Custom SMTP was entered into the LGN Supabase development project by the owner; **delivery is not verified until a real test email arrives**.

**For a visitor-equivalent test**, follow the [normal registration guide](supabase/normal-registration-test.md). The confirmation redirect should return to \`/verify-email\`; password recovery goes to \`/reset-password\`.

If emails do not arrive, verify Supabase SMTP sender settings and Hostinger alias sender authorization and inspect Supabase Auth logs. Do not embed any mailbox passwords or SMTP credentials in the code or browser key settings.

Protected member profile insertion is gated on the email-confirmed Auth user in PostgreSQL, rather than a visual dashboard banner. New Supabase members cannot access unmigrated PocketBase member functions.
