const fs = require('node:fs');
module.exports = function readLegacy(file) {
  const fixture = 'tests/fixtures/legacy/' + file;
  return fs.readFileSync(fs.existsSync(fixture) ? fixture : 'public/' + file, 'utf8');
};
