import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const failures = [];
const verify = (condition, message) => { if (!condition) failures.push(message); };
const web = JSON.parse(read('apps/web/package.json'));
const packageRoot = JSON.parse(read('package.json'));

verify(!web.scripts.dev.includes('command -v'), 'Web dev command is not cross-platform');
verify(!web.scripts.start.includes('PORT='), 'Web start command is not cross-platform');
verify(!web.scripts.typecheck.includes('--singleThreaded'), 'Unsupported TypeScript flag');
verify(packageRoot.scripts['check:source'] === 'node scripts/check-app-source.mjs', 'Missing static check command');
verify(!existsSync(join(root, 'apps/pocketbase')), 'Retired database workspace is present');
verify(!('pocketbase' in web.dependencies), 'Retired database SDK is present');
for (const file of readdirSync(join(root, 'apps/web/src'), { recursive: true })) {
  if (!/\.[jt]sx?$/.test(file)) continue;
  verify(!/pocketbase|\/hcgi\/platform/i.test(read('apps/web/src/' + file)),
    'Retired database reference in ' + file);
}
verify(!/pocketbase|\/hcgi\/platform/i.test(read('apps/web/vite.config.ts')), 'Retired database proxy is present');

if (failures.length) {
  console.error('Source checks failed:\n' + failures.map((f) => '- ' + f).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Static LGN checks passed; not a substitute for runtime authorization tests.');
}
