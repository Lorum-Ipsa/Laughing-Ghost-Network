import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { reactRouter } from '@react-router/dev/vite';
import { defineConfig } from 'vite';

const root = path.dirname(fileURLToPath(import.meta.url));
const pocketbaseTarget = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 3000,
    proxy: {
      '/hcgi/platform': {
        target: pocketbaseTarget,
        changeOrigin: true,
        rewrite: (url) => url.replace(/^\/hcgi\/platform(?=\/|$)/, ''),
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(root, 'src') },
  },
  plugins: [reactRouter()],
});
