const assert = require('node:assert/strict');
(async () => {
  const { dayTimeline, slotTimes, fitCalendarTitle } =
    await import('../shared/calendar-layout.mjs');
  const { normalizeEvent, occurrencesBetween } = await import('../shared/calendar-events.mjs');
  const date = '2026-10-08';
  const event = (id, startTime, endTime, extra = {}) =>
    normalizeEvent({
      id,
      title: 'ᠬᠤᠷᠠᠯ',
      startDate: date,
      endDate: date,
      startTime,
      endTime,
      ...extra,
    });
  const events = [
    event('long', '09:00', '11:00'),
    event('short', '09:30', '09:45'),
    event('next', '10:00', '11:00'),
    event('later', '13:00', '14:00'),
    event('all', '00:00', '00:00', { allDay: true }),
    event('overnight', '23:30', '00:00', { startDate: '2026-10-07' }),
  ];
  const layout = dayTimeline(occurrencesBetween(events, date, date), date);
  assert.deepEqual(
    layout.allDay.map((x) => x.eventId),
    ['all'],
  );
  assert.equal(layout.timed.length, 4, 'An event ending at midnight belongs to the preceding day');
  assert.equal(
    layout.timed.find((x) => x.event.eventId === 'short').end,
    585,
    'Readable labels preserve the actual end time',
  );
  const overlap = layout.timed.filter((x) => x.start < 660);
  assert(
    overlap.every((x) => x.columns === 3),
    'Short vertical labels have separate lanes when their readable blocks overlap',
  );
  assert.equal(layout.timed.at(-1).columns, 1, 'Independent afternoon events use the whole column');
  for (const a of layout.timed)
    for (const b of layout.timed)
      if (a !== b && a.column === b.column && a.columns === b.columns) {
        assert(
          a.visualEnd <= b.start || b.visualEnd <= a.start,
          'Labels in the same lane never cover each other',
        );
      }
  const crossing = event('cross', '23:30', '00:30', { endDate: '2026-10-09' });
  const first = dayTimeline([crossing], date).timed[0],
    second = dayTimeline([crossing], '2026-10-09').timed[0];
  assert.equal(first.end, 1440);
  assert(first.after);
  assert.equal(second.start, 0);
  assert.equal(second.end, 30);
  assert(second.before);
  assert.deepEqual(slotTimes(date, 1410), {
    startDate: date,
    endDate: '2026-10-09',
    startTime: '23:30',
    endTime: '00:30',
  });
  assert.equal(slotTimes('2028-02-28', 1410).endDate, '2028-02-29');
  assert.equal(slotTimes('2100-02-28', 1410).endDate, '2100-03-01');
  assert.equal(slotTimes('2100-12-31', 1410).endTime, '23:59');
  assert.throws(() => slotTimes('2100-12-31', 1439));
  assert.throws(() => slotTimes('2100-02-29', 540));
  const word = 'ᠮᠣᠩᠭᠣᠯ ᠤᠨ';
  const text = word + ' ᠪᠢᠴᠢᠭ';
  assert.deepEqual(
    fitCalendarTitle(text, (s) => s.length, word.length, 1),
    { text: word, shortened: true },
  );
  assert.deepEqual(
    fitCalendarTitle(text, (s) => s.length, word.length - 1, 2),
    { text: '', shortened: true },
    'A suffix stays attached instead of being cut inside a word',
  );
  assert.deepEqual(
    fitCalendarTitle(text, (s) => s.length, word.length, 2),
    { text, shortened: false },
  );
  assert.equal(
    fitCalendarTitle('ᠰᠠᠷ᠎ᠠ ᠣᠨ', (s) => s.length, 5, 1).text,
    'ᠰᠠᠷ᠎ᠠ',
    'MVS is retained',
  );
  console.log(
    'PASS: calendar time placement, concurrent and short events, all-day separation, midnight boundaries, slot creation, intact Mongolian preview words.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
