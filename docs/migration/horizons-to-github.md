# Horizons to GitHub migration plan

## Migration guardrails

- Keep the original Horizons website intact until staging is approved.
- Work only in a dedicated branch; never upload an unscreened export directly to `main`.
- Never publish the original ZIP or its local .env/database files to the public repository.
- Do not deploy publicly merely because the web build succeeds.
- Use synthetic staging accounts; no production-member export belongs in GitHub.

## Phase A — repository foundation

1. Establish governance, agent rules, issue/PR templates, and a basic safety CI check.
2. Verify organization ownership and maintainer review.
3. Review the [export inventory](../architecture/current-export.md) and record blockers.

## Phase B — import and security preparation

1. Extract the export to a local temporary folder.
2. Preserve the two-workspace layout: `apps/web` and `apps/pocketbase`.
3. Exclude any `.env`, runtime database, member uploads, and backups.
4. Remove the first-signup admin hook `apps/pocketbase/pb_hooks/ghost-admin-bootstrap.pb.js`.
5. Update the role migration `1791370500_admin_rbac_suspension.js` to **preserve current roles**, not elevate all accounts. Provision the owner explicitly using PocketBase's superuser administration.
6. Scan the remaining code for secrets, unsafe public endpoints, overly permissive data access rules, and builder-dependent behavior.
7. Add `apps/web/.env.example` with **names only / dummy values**, never actual keys.
8. Run `node scripts/check-repository.mjs` before staging/committing.
9. Import source to the migration branch for review.

## Phase C — independent development environment

1. Install an appropriate Bun version and locked workspace dependencies.
2. Establish the PocketBase version and migration order in a disposable local environment.
3. Replace or isolate unsupported Horizons-only plugins and endpoints.
4. Decide how `/hcgi/platform` will map to PocketBase outside Horizons.
5. Verify signup/login, account recovery, authorization, privacy exports, moderation, and responsive UI using test data.
6. Run build, typecheck and functional tests. Document results, not guesses.

## Phase D — safe staging and preview

1. Create a non-production backend with synthetic data.
2. Configure frontend preview hosting and backend proxy securely.
3. Enable reviewable branch previews without giving public access to privileged test users.
4. Test the entire user journey and administrative controls.
5. Approve a separate production cutover; retain rollback to the Horizons-hosted site.

## Exit criteria

- [ ] Source imported without credentials or real member data
- [ ] Unsafe admin bootstrap and mass promotion eliminated
- [ ] Privilege boundaries tested on backend collections and hooks
- [ ] Reproducible clean setup/build documented
- [ ] Staging preview shows login and representative member journeys
- [ ] Maintainer has accepted deployment/rollback plan
