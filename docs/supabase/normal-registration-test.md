# Test the **normal** LGN registration flow (Codespaces)

No developer-only lab, password exports, CLI tokens, or secret-key setup is required to test the **normal** frontend in the **development** Codespaces preview. The public Supabase development publishable key is already configured as a `DEV`-only fallback. Do not use this development project as a production database.

## 1. Get the latest frontend running

Use **desktop Visual Studio Code connected to your existing Codespace**. In its terminal, stop the old server with `Ctrl+C`, then run:

```bash
git fetch origin
git switch feature/horizons-source-import
git pull --ff-only
bash .devcontainer/start.sh
```

Leave that terminal running, ensure the remote port **3000 is Private** in VS Code, and open **http://localhost:3000** in your desktop browser. The GitHub `app.github.dev` forwarding URL previously returned 404 in this environment; the desktop localhost connection was confirmed working.

## 2. Allow the normal email callback URLs

Use the exact origin that your browser actually opens: for desktop VS Code port forwarding it is typically `http://localhost:3000`.

In [Supabase Auth → URL Configuration](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/auth/url-configuration), add these **two exact URLs** under Redirect URLs, replacing the placeholder origin with your own:

- `http://localhost:3000/verify-email`
- `http://localhost:3000/reset-password`

Do **not** replace these with `/supabase-lab`. A previous lab callback does not cover the real pages. Do not use a broad `https://*.app.github.dev/**` wildcard for a persistent project if exact private URLs will work.

In [Supabase Auth → Providers](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/auth/providers), make sure **Email** and **Confirm email** are enabled. The custom SMTP settings are under [Supabase Auth SMTP](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/auth/smtp). The configured sender uses Hostinger SMTP, and the owner confirmed successful verification email delivery and registration.

## 3. Test like a visitor

1. Open normal **Join the Network** (the `/join` route).
2. Enter a **new** test Ghost handle, a test email you control (for example `admin@laughingghost.net`), and a unique password. Your previous PocketBase test account is a separate account and does **not** sign you into Supabase.
3. Submit. The app should take you to **Verify your email**. A message was *requested*; receipt is only verified when it arrives in your inbox.
4. Look in the inbox and spam folder. Open the message from LGN's configured sender and click its confirmation link **in the same Codespaces-capable browser**.
5. Return to the site's `/verify-email` screen. Once confirmed, select **Enter Ghost Space**. If redirected to `/login`, sign in with the new test account.
6. The first Ghost Space entry should claim your selected permanent handle. If it was taken before verification, pick another from the dashboard. Edit a public profile field, save, refresh, and confirm persistence.
7. Sign out from the header menu. Confirm the signed-out browser cannot enter `/ghost-space`. Sign in again through the normal `/login` route; your existing profile should load without duplicating it.
8. Try **Forgot password?** and ensure the recovery link returns to `/reset-password` (with the exact allowed redirect configured).

## 4. Check the results

As administrator, check [Supabase Authentication Users](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/auth/users) and the [Table Editor](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/editor):

- Auth user exists and email confirmation date is populated.
- `lgn_private.member_access.role = ghost`, `suspended = false`.
- One linked public profile exists with the chosen handle, and its owner ID is private from public queries.
- Email is *not* included in the public profile.
- Negative RLS tests must show another user cannot modify this profile, role or preferences.
- If SMTP delivery fails, check [Supabase Auth logs](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/logs/auth-logs), sender authorization for the Hostinger alias, and spam. An account can be created before sending fails.

## What is **not** migrated

The normal member shell is connected to Supabase, but contributions, projects, Table Talks, notifications, moderation, and the legacy public directory have not yet been migrated. The dashboard labels these features as unavailable. Existing PocketBase-only test data is not silently copied into Supabase.

This is a **development test**, not a production launch. Browser-only implicit authentication needs a reviewed SSR/PKCE implementation before deployment to a real public audience.

## Next member-workspace test

After account confirmation, use the [rich Ghost profile and contributions acceptance guide](profile-contributions-acceptance.md) to exercise the new Supabase-backed profile editor, public Ghost directory, private drafts, submission and revision history.
