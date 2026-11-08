# LGN implementation roadmap — November 7, 2026

## 0. Foundation and export
**Source controlled; draft PR #3 active.** Code review, CI, base documentation, independent VS Code Codespaces preview and no automatic privileged PocketBase creation. Formal PR approval remains outstanding.

## 1. Supabase identity and authentication
**Development flow operating.** Normal registration, email verification, login, reset-password and Ghost Space use Supabase. Owner verified email delivery and the registration flow. 23 rollback-only database authorization checks pass. Still requires multi-user browser/API testing and SSR/PKCE production hardening.

## 2. Ghost public identity
**Implemented on feature branch; live user acceptance pending.** Expanded profile sections, specialties/skills/tools, languages, location, availability, avatar templates, external links, public profile route and directory lookup. Remaining: custom upload security, field-specific private visibility, verified external account ownership, production serving.

## 3. Contribution publishing lifecycle
**Author workspace implemented; moderator workflow pending.** Draft/edit/submit/withdraw/archive/restore, immutable version history, RLS protections and 14 SQL regression assertions. Submission has no arbitrary character minimum: title plus a description, summary, code, or URL suffices. Next: staff review feedback and moderated publish/reject/revise actions, public work rendering, attachment security, version release workflow.

## 4. Network functionality
Migrate projects/tasks, Table Talks, moderation queues, community collaboration and notifications from historical PocketBase schemas. Preserve accessible, evidence-centered interfaces and published-original-language fidelity. Each requires its own reviewed authorization and audit model.

## 5. Staging, operational security and continuity
Resolve Supabase CLI migration baseline; add disposable end-to-end tests, hardened cookie/PKCE SSR sessions, reliable deployed staging and rollback, two-user permissions, rate limits, privacy notices and observed moderation behavior.

## 6. Commercial launch governance
Decide terms, paid tiers if any, support operations, abuse handling, Lorum Ipsa finances and moderation staffing. **Do not monetize or cut over the live Horizons site before staging is accepted.**
