const fs = require('node:fs');
module.exports = function readLegacy(file) {
  for (const root of ['tests/fixtures/legacy/', 'content-source/', 'public/']) {
    if (fs.existsSync(root + file)) return fs.readFileSync(root + file, 'utf8');
  }
  throw new Error('Missing fixture: ' + file);
};
