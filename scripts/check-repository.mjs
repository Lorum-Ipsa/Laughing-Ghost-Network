import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const exists = (name) => fs.existsSync(path.join(root, name));
const failures = [];

for (const file of ['README.md', 'CONTRIBUTING.md', 'SECURITY.md', 'AGENTS.md']) {
  if (!exists(file)) failures.push('Required governance file missing: ' + file);
}

for (const file of ['package.json', 'apps/web/package.json']) {
  if (!exists(file)) continue;
  try { JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
  catch { failures.push('Invalid JSON: ' + file); }
}

const forbidden = [
  'apps/web/.env',
  'apps/pocketbase/pb_data',
  'apps/pocketbase/pb_snapshots',
  'apps/pocketbase/pb_backups',
];
for (const name of forbidden) if (exists(name)) failures.push('Sensitive/local path must not be committed: ' + name);

if (failures.length) {
  console.error('LGN safety check failed:');
  for (const failure of failures) console.error(' - ' + failure);
  process.exitCode = 1;
} else {
  console.log('LGN foundation checks passed. This is NOT a runtime security or build certification.');
}
