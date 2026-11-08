# Run LGN locally

Install Git, Node.js 22+, and Bun. From the repository root:

```sh
bun install --frozen-lockfile
bun run check:source
bun run typecheck
bun run dev
```

Open `http://127.0.0.1:3000`. The Vite development preview defaults to the shared `lgn-development` Supabase project. Use dedicated test accounts and synthetic content. To point the app at another development project, copy `apps/web/.env.example` to `apps/web/.env.local` and set that project's HTTPS URL and public publishable key.

For a production-mode preview, set the environment-specific public URL and publishable key before running `bun run build`, then run `bun run start`. The development fallback is available only in Vite dev mode. See the [Supabase acceptance checklists](supabase/README.md) for rollout and browser verification.
