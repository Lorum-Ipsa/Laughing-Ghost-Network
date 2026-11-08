# Development and review process

## Current state

The repository begins with governance and import tooling. The original Horizons code is **not yet committed**. Until the import is complete, there is no independently working LGN build to preview.

## Starting from the export

Use Bun, Node.js, and the Supabase development project. See [local development](development-local.md). Never connect local testing to production data.

After import, the root `package.json` lists `setup`, `dev`, `build`, `lint`, and `typecheck` commands. Verify tool compatibility rather than assuming they work unchanged.

## Conventions

- Branch off `main` or the approved integration branch; one focused goal per PR.
- Keep migrations reviewed and reversible. Prefer explicit privileged-account provisioning.
- No secrets, databases, or personally identifiable community records in commits.
- Add tests for security-sensitive behavior; report missing infrastructure explicitly.
- Every PR must state verification status, preview URL if available, and rollback path.
- Maintainer reviews and approves before merge. Previews are not production releases.

## Repository check

```sh
node scripts/check-repository.mjs
```

This check catches the original known admin-elevation files and obvious local data paths. It does **not** replace human code review, secret scanning, or end-to-end authorization testing.
