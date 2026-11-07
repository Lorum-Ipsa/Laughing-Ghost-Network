import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => readFileSync(join(root, file), 'utf8');
const failures = [];
const verify = (condition, message) => { if (!condition) failures.push(message); };
const web = JSON.parse(read('apps/web/package.json'));
const packageRoot = JSON.parse(read('package.json'));
const provision = read('apps/pocketbase/pb_migrations/1764579159_create_superuser.js');
const hardening = read('apps/pocketbase/pb_migrations/1791379000_lock_user_privileges.js');
const older = read('apps/pocketbase/pb_migrations/1791370500_admin_rbac_suspension.js');

verify(!web.scripts.dev.includes('command -v'), 'Web dev command is not cross-platform');
verify(!web.scripts.start.includes('PORT='), 'Web start command is not cross-platform');
verify(!web.scripts.typecheck.includes('--singleThreaded'), 'Unsupported TypeScript flag');
verify(packageRoot.scripts['check:source'] === 'node scripts/check-app-source.mjs', 'Missing static check command');
verify(!/record\.set\(\s*['"]password['"]/.test(provision), 'Migration resets a superuser password');
verify(!/findAuthRecordByEmail/.test(provision), 'Migration auto-provisions superuser account');
verify(!/u\.set\(\s*['"]role['"]\s*,\s*['"]admin['"]\s*\)/.test(older), 'Mass admin promotion found');
for (const name of ['moderator', 'role', 'suspended', 'verified']) {
  verify(hardening.includes('@request.body.' + name + ':changed = false'), 'Final rule must protect ' + name);
}
verify(!hardening.includes('|| @request.auth.moderator = true'), 'Final rule grants unscoped moderator edits');
verify(!existsSync(join(root, 'apps/pocketbase/pb_hooks/ghost-admin-bootstrap.pb.js')), 'Unreviewed first signup admin hook present');

if (failures.length) {
  console.error('Source checks failed:\n' + failures.map((f) => '- ' + f).join('\n'));
  process.exitCode = 1;
} else {
  console.log('Static LGN checks passed; not a substitute for runtime authorization tests.');
}
