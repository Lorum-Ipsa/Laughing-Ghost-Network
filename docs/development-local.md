# Local development — first migration validation

The Horizons export is **not yet certified to run independently**. This guide is for a disposable development environment only. Keep the existing Horizons website running until staging has been tested.

## Tools and installation

Install Git, Node.js 22+, [Bun](https://bun.sh/), and **PocketBase 0.40.4** (the version recorded in `apps/pocketbase/.pocketbase-version`). Do not assume the latest PocketBase is migration-compatible. Use a new local database, not live member data.

From the LGN checkout on Windows PowerShell:

```powershell
git switch feature/horizons-source-import
bun install --frozen-lockfile
node scripts/check-repository.mjs
node scripts/check-app-source.mjs
bun run build
bun run typecheck
```

## Backend — separate terminal

Place PocketBase on your PATH (or run its binary via its full path), then:

```powershell
cd apps/pocketbase
$env:PB_ENCRYPTION_KEY = "CHANGE-TO-A-UNIQUE-LOCAL-KEY"
$env:LGN_APP_URL = "http://127.0.0.1:3000"
pocketbase serve --http=127.0.0.1:8090 --encryptionEnv=PB_ENCRYPTION_KEY --dir=./pb_data --migrationsDir=./pb_migrations --hooksDir=./pb_hooks
```

Only bind the backend to localhost. Set up a **PocketBase superuser** using its private local installation flow (or `pocketbase superuser create EMAIL PASSWORD --dir=./pb_data`; do not paste real passwords into shared logs). Then deliberately create a separate LGN `users` member, assign `role=admin` in the PocketBase administration interface, and test its permissions. These are **two distinct identities**.

## Web — another terminal

Open a new terminal in the repository root. Set the following environment variables for that terminal, using your **local test** superuser, if server-rendered routes need privileged reads: `POCKETBASE_URL`, `PB_SUPERUSER_EMAIL`, `PB_SUPERUSER_PASSWORD`. Never place them in source control.

```powershell
npm run dev --workspace web
```

Open `http://127.0.0.1:3000`. Vite's development proxy forwards `/hcgi/platform` to the local PocketBase port 8090. **Production requires a separate proxy and SSR hosting plan**; a successful local website does not make this deployable.

## Before merging PR #3

- [ ] GitHub Actions dependency installation, build, and typecheck pass
- [ ] PocketBase migrations complete on an empty test database
- [ ] User accounts cannot elevate role, moderator flag, verification, or suspension
- [ ] Administrative user has correct access; moderators cannot change roles
- [ ] Login, registration, password reset, and email verification checked
- [ ] SSR routes and backend proxy work outside Horizons
- [ ] Assets, copyright, staging privacy, deployment and rollback reviewed

No live database, keys, or member data may be pushed to GitHub.
