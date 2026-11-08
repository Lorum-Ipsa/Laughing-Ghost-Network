# Live acceptance: LGN Ghost profile and contributions

This is the **normal app** at `http://localhost:3000` when you open the existing GitHub Codespace through **desktop Visual Studio Code**. No isolated Supabase test lab is necessary.

## Prepare

Open the LGN folder in your connected desktop VS Code terminal. Stop the old dev server with `Ctrl+C`, then run:

```bash
git fetch origin
git switch feature/horizons-source-import
git pull --ff-only
bash .devcontainer/start.sh
```

Leave the process running and open [localhost:3000](http://localhost:3000). GitHub Codespaces should forward remote port 3000 to your desktop. Keep the remote forwarded port **Private**. Your existing verified Supabase test account remains intact.

## Test the rich profile

1. Sign in through normal **Sign In**, then enter **Ghost Space**.
2. Select **My Profile**. Confirm the original handle remains locked and the new sections exist: Identity, Ghost avatar templates, Practice, Languages, Location, Availability and External identities.
3. Change your display name, bio, a specialty, a working language, a Ghost avatar preset, and **one additional public field that you are comfortable disclosing**. Do not enter personal/private data into public fields.
4. Select **Preview public details** from either the header or the bottom of the profile editor. A visible dialog must open immediately with your unsaved public fields, including avatar, bio, specialties, and links. Confirm **Close** and **Escape** both dismiss it without saving. Then select **Save changes**.
5. Refresh Ghost Space; verify the data remains.
6. Choose **View Public Profile** from the sidebar (or open `/ghosts/YOUR_HANDLE`). Check the new data appears correctly and the email/private account ID does not.
7. Open **Search the Network** and find your handle. Make sure your profile is not confused with a PocketBase demonstration Ghost.

**Privacy limitation:** Any profile fields shown as public are publicly queryable. Language and external links are **not** securely hidden by private preferences yet. Clear fields you do not want shown. Custom avatar file uploads and advanced per-section visibility are future work.

## Test private contributions

1. In Ghost Space select **Contributions → Create Contribution**.
2. Choose a type such as Research or Writeup. Fill in only a **title** and click **Save draft**.
3. Confirm the draft appears under **Drafts**; refresh the page and ensure it persists.
4. Open **History**; the initial revision should be present. Try **Submit for review** on an entirely empty draft: the app/database should reject it. A title plus any one of summary, description, code, or HTTPS reference is enough; there are no minimum character counts.
5. Edit the draft with a short title (for example, **Note**) and a one-line summary, then **Submit for review**. It should succeed. Repeat with another draft consisting of only a title and code or HTTPS source reference. Longer methodology is appropriate when helpful, never a fixed-length requirement.
6. Confirm it moves to **In Review**, with a newer version and updated history.
7. Verify you cannot mark it **Published** yourself. There is deliberately no author-facing Publish button.
8. Choose **Withdraw to draft**; edit, then test archive and restore. Revisions must continue to be recorded and remain read-only.
9. Sign out. The public directory and the profile page must **not** display an unpublished draft or its full contents.

**Avoid publishing real attack payloads, proprietary company data, client secrets or unapproved test data.** This is a development environment, but content must still respect authorized scope.

## Expected limitations

The submission is stored with status `submitted`, but **reviewer/moderator approval and publication are not built yet**. Uploaded attachments and custom Ghost avatar files are also not supported in the new backend. Historical PocketBase work is not migrated, and the published-work detail page is still legacy.

These checks verify behavior in one browser and are **not** a substitute for two-user API security testing, session invalidation, professional review of data exposure, or production staging.

## Report unexpected behavior

Share the **page**, **action**, and **error message**. Don't share passwords, SMTP credentials, access tokens, or verification/recovery URLs. If the site cannot load, check the terminal and private port 3000 before resetting your Codespace.
