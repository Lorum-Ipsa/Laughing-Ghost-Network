import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
// GitHub Codespaces forwards private preview traffic through the Codespace's
// app.github.dev hostname. Bind to the container network and explicitly allow
// that hostname, without allowing arbitrary Internet Host headers.
const codespaceName = process.env.CODESPACE_NAME?.trim();
const runningInCodespaces = process.env.CODESPACES === 'true' || Boolean(codespaceName);

export default defineConfig({
  server: {
    host: runningInCodespaces ? '0.0.0.0' : '127.0.0.1',
    allowedHosts: runningInCodespaces
      ? (codespaceName ? [`${codespaceName}-3000.app.github.dev`] : ['.app.github.dev'])
      : undefined,
    strictPort: true,
    port: 3000,
  },
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  plugins: [reactRouter()],
});
