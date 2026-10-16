const { readdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');

const root = resolve(__dirname, '..');
const tests = readdirSync(join(root, 'tests'))
  .filter((name) => name.endsWith('-check.cjs'))
  .sort();
let failures = 0;
for (const test of tests) {
  console.log(`\n=== ${test} ===`);
  const result = spawnSync(process.execPath, [join(root, 'tests', test)], {
    cwd: root,
    stdio: 'inherit',
    timeout: 60_000,
  });
  if (result.error || result.status !== 0) {
    failures += 1;
    if (result.error) console.error(result.error.message);
  }
}
console.log(`\n${tests.length - failures}/${tests.length} test scripts passed`);
process.exitCode = failures ? 1 : 0;
