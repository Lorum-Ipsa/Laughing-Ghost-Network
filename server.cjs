const { createRequire } = require('node:module');
const { dirname, resolve } = require('node:path');

const requireFromWeb = createRequire(resolve(__dirname, 'apps/web/package.json'));
const manifestPath = requireFromWeb.resolve('@react-router/serve/package.json');
const { bin } = requireFromWeb(manifestPath);
const entry = resolve(dirname(manifestPath), bin['react-router-serve']);
const build = resolve(__dirname, 'dist/apps/web/server/index.js');

// Start the existing React Router server in this process so the hosting
// supervisor can manage the HTTP listener. Preserve its PORT and HOST.
process.argv = [process.execPath, entry, build];
requireFromWeb(entry);
