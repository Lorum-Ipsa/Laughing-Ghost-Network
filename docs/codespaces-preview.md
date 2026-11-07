# Preview LGN from GitHub Codespaces

This is a **private development preview**, not a production deployment. It runs on GitHub's remote computer, and port **3000** is forwarded to your browser. The original PocketBase environment remains available locally as rollback/reference; normal member Join and Login are now connected to the Supabase development project.

## Open the latest application

1. Open the [feature branch](https://github.com/Lorum-Ipsa/Laughing-Ghost-Network/tree/feature/horizons-source-import) in your existing Codespace (do **not** accidentally switch to `main`).
2. In its Codespaces terminal, stop any old server with **Ctrl+C**. Run:

   ```bash
   git fetch origin
   git switch feature/horizons-source-import
   git pull --ff-only
   bash .devcontainer/setup.sh
   bash .devcontainer/start.sh
   ```

   **Leave that terminal running.** It should show PocketBase healthy, then the React Router/Vite development server. The setup script only installs dependencies and prepares the test database; the start script is what actually serves the website.

3. In the bottom pane of **VS Code**, click **PORTS** (beside TERMINAL). The forwarded **3000 / LGN web preview** entry must be present and **Private**. If missing, select **Forward a Port**, enter **3000**, and leave visibility **Private**.
4. On the port-3000 row select the globe/open-in-browser button or the forwarded address. **Do not type `localhost:3000` on your local computer's browser** when working in browser-based Codespaces. The address is typically `https://CODESPACE_NAME-3000.app.github.dev/`.

If the VS Code Simple Browser preview is blank or refuses to open, use **Open in Browser** to launch a normal browser tab. This is still a *private* forwarded port; you must be signed into GitHub. Do not change port visibility to Public just to get the preview working.

## Diagnose missing or blocked previews

Open a **second terminal** in the same Codespace (leave `start.sh` running in the first):

```bash
printf 'Branch: '; git branch --show-current
printf 'Web HTTP: '; curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
printf 'Health HTTP: '; curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/api/health
ss -ltnp | grep -E ':(3000|8090)\b' || true
```

- **200 for Web and Health:** the server is working inside Codespaces. Use the **PORTS** panel and your private **Open in Browser** link. If a forwarded URL still fails, check GitHub Codespaces permissions/sign-in, browser pop-up blocking, and whether the Codespace is still running.
- **Connection refused / `000` / no listener on 3000:** `start.sh` isn't running or failed. Inspect the **first terminal**, run setup again if needed, and restart.
- **Port 3000 already in use:** another dev server may be running. Stop it with **Ctrl+C** in its terminal; do not run competing servers. The new Vite config uses `strictPort` to show this instead of silently moving to port 3001.
- **PocketBase fails:** inspect `tail -n 80 .local/pocketbase.log` and the first terminal.
- **A Host not allowed error:** the latest Vite config explicitly allows your Codespace's private forwarded hostname. Ensure you're on the latest feature-branch commit and restart `start.sh`.
- **Server responds, page blank after rendering:** use browser Developer Tools → Console and send the first error text (redact email addresses and credentials).

## Auth redirect note

Once the preview opens, the visitor registration flow is **Join → Verify Email → Sign In → Ghost Space** with Supabase. Add your specific forwarded **/verify-email** and **/reset-password** HTTPS URLs to [Supabase Auth URL Configuration](https://supabase.com/dashboard/project/oatdfrnytmliunauxqyd/auth/url-configuration); changing your Codespace's hostname means updating these URLs. See the [normal registration test](supabase/normal-registration-test.md).

No real PocketBase account or existing Horizons login is imported into Supabase. Keep the Codespace port private and do not share mailbox passwords or secret API keys.
