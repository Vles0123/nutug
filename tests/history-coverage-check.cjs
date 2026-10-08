const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const { orderedEvents } = await import('../shared/history.mjs');
  const data = vm.runInNewContext(
    fs.readFileSync('content-source/data.js', 'utf8') + ';({PEOPLE,EDGES,EVENTS,SOURCES})',
  );
  const labels = JSON.parse(fs.readFileSync('content-source/history-periods.json', 'utf8'));
  const coverage = JSON.parse(fs.readFileSync('docs/history-coverage.json', 'utf8'));
  const copy = JSON.parse(fs.readFileSync('docs/history-copy-draft.json', 'utf8'));
  const periods = new Set(labels.periods.map((period) => period.id));
  const regions = new Set(labels.regions.map((region) => region.id));
  const ids = new Set(data.EVENTS.map((event) => event.id));
  assert(data.EVENTS.length >= 60, 'History must extend beyond the imperial-family selection');
  assert.equal(ids.size, data.EVENTS.length);
  assert.equal(data.EVENTS.length, coverage.eventCount);
  for (const id of coverage.originalEventIds) assert(ids.has(id), `Preserve original event: ${id}`);
  for (const id of coverage.newEventIds) assert(ids.has(id), `Include reviewed event: ${id}`);
  const periodCounts = new Map();
  for (const event of data.EVENTS) {
    assert(periods.has(event.periodId), `${event.id}: known period`);
    assert(regions.has(event.regionId), `${event.id}: known regional context`);
    assert(Number.isInteger(event.startYear) && Number.isInteger(event.endYear));
    assert(event.startYear <= event.endYear);
    assert.notEqual(event.startYear, 0, 'Historical BCE/CE years have no year zero');
    assert(!/[A-Za-z\u0400-\u04ff\u3400-\u9fff]/.test(event.date + event.title + event.text));
    assert(event.sources.length > 0);
    for (const id of event.people) assert(data.PEOPLE[id], 'Do not create dangling actor links');
    for (const id of event.sources) assert(data.SOURCES[id], 'Do not create dangling sources');
    periodCounts.set(event.periodId, (periodCounts.get(event.periodId) || 0) + 1);
  }
  for (const id of periods) assert(periodCounts.get(id) > 0, `Period has readable content: ${id}`);
  const ordered = orderedEvents(data.EVENTS);
  assert.equal(ordered[0].id, 'xiongnu-modu-209-bce', 'BCE history sorts before CE history');
  assert.equal(ordered.at(-1).id, 'parliament-election-2024');
  for (const id of [
    'shiwei-records',
    'mongol-empire-1206',
    'chagatai-division-1347',
    'dayan-reunification',
    'dzungar-conquest-1755',
    'inner-mongolia-autonomy-1947',
    'mongolia-constitution-1992',
  ])
    assert(ids.has(id), `Retain cross-period coverage: ${id}`);
  assert.deepEqual(
    copy.events.map((event) => event.id).sort(),
    [...coverage.newEventIds].sort(),
    'Every new event is included in the requested language-review handoff',
  );
  for (const draft of copy.events) {
    const event = data.EVENTS.find((event) => event.id === draft.id);
    for (const field of ['date', 'title', 'text']) assert.equal(draft[field], event[field]);
  }
  console.log(
    `PASS: ${data.EVENTS.length} events, ${periods.size} periods, BCE ordering, sources and language-review inventory.`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
