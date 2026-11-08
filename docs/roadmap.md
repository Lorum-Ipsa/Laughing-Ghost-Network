# LGN implementation roadmap — November 8, 2026

## 0. Foundation and export
**Source controlled; draft PR #3 active.** Code review, CI, base documentation, independent VS Code Codespaces preview and no automatic privileged PocketBase creation. Formal PR approval remains outstanding.

## 1. Supabase identity and authentication
**Development flow operating.** Normal registration, email verification, login, reset-password and Ghost Space use Supabase. Owner verified email delivery and the registration flow. 23 rollback-only database authorization checks pass. Still requires multi-user browser/API testing and SSR/PKCE production hardening.

## 2. Ghost public identity
**Implemented on feature branch; profile editor user-tested; paired-slash handle registration still needs browser acceptance.** Expanded profile sections, specialties/skills/tools, languages, location, availability, avatar templates, external links, public profile route and directory lookup. Paired `//` handles now have reversible, path-safe public URLs. Remaining: custom upload security, field-specific private visibility, verified external account ownership, production serving.

## 3. Contributions

The draft includes private drafts, direct publication, targeted review, version history, owner deletion and Supabase-backed Research and Arsenal listings. Deletion removes work from the workspace, review queue and public Supabase surfaces and retains internal audit history. The pending publication SQL and version guard require development rollout and two-account browser acceptance. Published content is locked for edits. Author revision of a published article, post-publication reporting and takedown, translations, and attachment handling are separate work.

Historical PocketBase content has not been imported. Research and Arsenal read Supabase, so any historical listing entries need a verified data import to appear there. The homepage, sitemap, legacy public profile and article paths, and other public libraries still have legacy readers.

## 4. Supabase cutover and remaining Ghost Space sections

**Projects is next.** Migrate project records, ownership, membership, tasks, updates and participation to Supabase with role-based access. Cut over the dashboard and public Projects surfaces together. Then migrate Table Talks, collaboration, notifications, account settings and export, and the remaining admin and moderation workflows. Audit server loaders and browser clients for residual PocketBase access before removing the PocketBase preview service and dependency. Reconcile authorized historical records and URL mappings before retiring legacy readers.

## 5. Staging, operational security and continuity
Resolve Supabase CLI migration baseline; add disposable end-to-end tests, hardened cookie/PKCE SSR sessions, reliable deployed staging and rollback, two-user permissions, rate limits, privacy notices and observed moderation behavior.

## 6. Commercial launch governance
Decide terms, paid tiers if any, support operations, abuse handling, Lorum Ipsa finances and moderation staffing. **Do not monetize or cut over the live Horizons site before staging is accepted.**
