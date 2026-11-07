# Preview LGN on GitHub Codespaces

This is a **temporary private development preview**. It uses a new empty PocketBase database, not your existing Horizons website or member information. Codespaces may consume GitHub usage allowance or incur charges depending on your plan and organization settings.

1. Go to the [LGN import branch](https://github.com/Lorum-Ipsa/Laughing-Ghost-Network/tree/feature/horizons-source-import).
2. Select **Code → Codespaces → Create codespace on feature/horizons-source-import**.
3. Wait for the dev container's setup to complete. In its terminal run:

   ```bash
   bash .devcontainer/start.sh
   ```

4. Open the forwarded **LGN web preview (port 3000)** from the Ports panel, or accept the automatic browser prompt. Keep port 3000 visibility **Private**.

You should be able to browse LGN's public pages with synthetic seed content. **Logins and other privileged flows are not validated by this preview yet.** The PocketBase administrative interface is not intentionally exposed as a forwarded port. Only localhost port 8090 is used by the frontend proxy.

## Troubleshooting

- If setup fails, run `bash .devcontainer/setup.sh` again.
- If PocketBase fails, inspect `.local/pocketbase.log` inside Codespaces.
- If port 3000 is not visible, check the Ports panel and whether the terminal running `start.sh` is still open.
- No live accounts or databases should be imported. The local `.local/` directory is excluded from Git.
- This preview stops when the Codespace stops; it is not a continuously hosted staging deployment.

## Next after public-page preview

Run authentication and role-permission tests with disposable accounts, then design a separately hosted staging application for persistent shareable pull-request previews.
