# LGN implementation roadmap

## 0. Foundation — underway
Ownership under Lorum Ipsa; public repository with review controls; docs, CI and migration plan. **Exit:** maintainer-approved foundation PR.

## 1. Horizons source import
Screen and import current React + PocketBase source, preserving application logic and providing a reproducible manifest. **Exit:** source-controlled candidate with no privileged auto-bootstrapping and no secrets/data.

## 2. Independent local environment
Working frontend, backend, migrations, authentication and routing outside Horizons. **Exit:** verified clean install/build with synthetic accounts.

## 3. Staging preview and hardening
PR preview workflow, staged PocketBase, role/permission tests, privacy and abuse-prevention review. **Exit:** meaningful end-to-end review of real workflows, not just static screenshots.

## 4. Member experience
Iterate ghost profiles, discussions, Table Talks, research, Arsenal, projects and notifications using issue-led delivery.

## 5. Commercial readiness
Determine product tiers, moderation operations, terms/privacy, support, payment provider, and Lorum Ipsa financial/commercial governance before monetization is enabled.

## 6. Optional backend modernization
Evaluate Supabase against PocketBase using measured constraints, cost, migration effort, security policies and rollback. **Not a prerequisite** to stage 1–3.
