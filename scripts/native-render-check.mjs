import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile, copyFile, cp, open } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';

const environment = {
  ...process.env,
  DEVELOPER_DIR: process.env.DEVELOPER_DIR || '/Applications/Xcode.app/Contents/Developer',
};
const destination = resolve(process.env.NUTUG_RENDER_OUTPUT || 'build/native-render-results');
const buildRoot = resolve('build/native-render');
await mkdir(destination, { recursive: true });
await mkdir(buildRoot, { recursive: true });
const log = await open(join(buildRoot, 'build.log'), 'w');
console.log('Building the isolated native rendering check target');
try {
  execFileSync(
    'xcodebuild',
    [
      '-jobs',
      '2',
      '-project',
      'apple/Nutug.xcodeproj',
      '-scheme',
      'NutugRenderChecks',
      '-destination',
      'generic/platform=iOS Simulator',
      '-derivedDataPath',
      buildRoot,
      'CODE_SIGNING_ALLOWED=NO',
      'build',
    ],
    { env: environment, stdio: ['ignore', log.fd, log.fd] },
  );
} finally {
  await log.close();
}
const sim = (...args) =>
  execFileSync('xcrun', ['simctl', ...args], {
    env: environment,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
const inventory = JSON.parse(sim('list', '--json'));
const runtime = inventory.runtimes
  .filter((item) => item.isAvailable && item.name.startsWith('iOS'))
  .sort((a, b) => a.version.localeCompare(b.version, 'en', { numeric: true }))
  .at(-1);
const runtimeNumber = runtime
  ? runtime.version
      .split('.')
      .reduce(
        (value, part, index) =>
          value + Number(part) * (index === 0 ? 65536 : index === 1 ? 256 : 1),
        0,
      )
  : 0;
const compatible = inventory.devicetypes.filter(
  (item) =>
    item.productFamily === 'iPhone' &&
    item.minRuntimeVersion <= runtimeNumber &&
    item.maxRuntimeVersion >= runtimeNumber,
);
const type =
  compatible.find((item) => item.name === 'iPhone Duo') ||
  compatible.sort((a, b) => a.minRuntimeVersion - b.minRuntimeVersion).at(-1);
if (!runtime || !type) throw new Error('An available iPhone runtime is required');
const device = sim('create', 'Nutug-Rendering-Checks', type.identifier, runtime.identifier);
try {
  console.log(`Booting isolated ${type.name}`);
  sim('boot', device);
  sim('bootstatus', device, '-b');
  const bundle = 'cn.nutug.renderchecks';
  sim(
    'install',
    device,
    join(buildRoot, 'Build/Products/Debug-iphonesimulator/NutugRenderChecks.app'),
  );
  const container = sim('get_app_container', device, bundle, 'data');
  const documents = join(container, 'Documents');
  await mkdir(documents, { recursive: true });
  const manifest = JSON.parse(await readFile('content-dist/manifest.json', 'utf8'));
  await copyFile(resolve('content-dist', manifest.core), join(documents, 'history-fixture.json'));
  sim('launch', device, bundle);
  const generated = join(documents, 'render-checks');
  let report;
  for (let attempt = 0; attempt < 120; attempt++) {
    report = await readFile(join(generated, 'result.json'), 'utf8')
      .then(JSON.parse)
      .catch(() => null);
    if (report) break;
    await pause(500);
  }
  if (!report) throw new Error('Native rendering checks did not finish within 60 seconds');
  await cp(generated, destination, { recursive: true });
  await writeFile(
    join(destination, 'device.json'),
    JSON.stringify(
      { device: type.name, runtime: runtime.identifier, model: type.modelIdentifier },
      null,
      2,
    ) + '\n',
  );
  if (!report.success) throw new Error(report.error);
  console.log(
    JSON.stringify({
      success: true,
      device: type.name,
      checks: report.checks,
      screenshots: report.screenshots.length,
      output: destination,
    }),
  );
} finally {
  try {
    sim('shutdown', device);
  } catch {}
  sim('delete', device);
}
