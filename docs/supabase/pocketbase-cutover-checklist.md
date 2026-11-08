# PocketBase to Supabase cutover checklist

Supabase is the target runtime database. Remove each PocketBase path after its Supabase replacement and any required historical records are verified.

| Surface | Supabase status | Remaining cutover |
| --- | --- | --- |
| Auth, Ghost Space, contribution drafts, screening, deletion, reports | Supabase code in draft PR | Apply pending development SQL and run [browser acceptance](handle-moderation-acceptance.md) |
| Research, Arsenal, Supabase article IDs | Supabase reads | Reconcile historical public work and URLs |
| Published article translations and text attachments | Supabase code in draft PR | Apply materials SQL and verify browser reads and safe downloads. Historical imports and binary uploads are separate |
| Homepage, directory fallback, sitemap, legacy article/profile IDs | Mixed or PocketBase | Import authorized public profiles and work, resolve old IDs and handles, then remove legacy reads |
| Projects, Table Talks, participation | New Projects and Table Talks workflows use Supabase. Historical libraries still have PocketBase paths | Reconcile and import historical Projects, verify links, then remove legacy readers. Migrate Table Talks and its participation separately |
| Collaboration, notifications, legacy account/admin and remaining operations | Legacy or pending | Replace data access with Supabase and verify role boundaries |
| Codespaces startup, CI preview, PocketBase package and clients | Legacy runtime remains | Use a disposable Supabase-backed preview and remove PocketBase startup and dependencies after route parity |

- [ ] Inventory an approved source export and identify records that must be preserved. Keep credentials, session tokens, and private reports out of GitHub.
- [ ] Import authorized records with stable source IDs or an explicit redirect mapping. Reconcile counts and sample article, profile, and attachment links.
- [ ] Run public, authenticated, and moderator route checks with PocketBase stopped. Confirm migrated functionality and historical links still work.
- [ ] Remove the legacy clients, environment variables, startup paths, and CI jobs after the checks pass.
