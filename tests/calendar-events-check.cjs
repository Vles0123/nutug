const assert = require('node:assert/strict');
(async () => {
  const api = await import('../shared/calendar-events.mjs');
  const base = api.normalizeEvent({
    id: 'test-1',
    title: 'ᠬᠤᠷᠠᠯ',
    notes: 'ᠮᠣᠩᠭᠣᠯ ᠤᠨ\nᠪᠢᠴᠢᠭ; , \\',
    location: 'ᠭᠡᠷ',
    startDate: '2026-10-08',
    endDate: '2026-10-08',
    startTime: '09:00',
    endTime: '10:00',
    repeat: 'weekly',
    until: '2026-11-30',
    exceptions: ['2026-10-15'],
  });
  const entered = api.normalizeEvent({
    ...base,
    startDate: '᠒᠐᠒᠖/᠑᠐/᠘',
    endDate: '２０２６．１０．８',
    startTime: '᠙:᠐᠐',
  });
  assert.equal(entered.startDate, '2026-10-08');
  assert.equal(entered.endDate, '2026-10-08');
  assert.equal(entered.startTime, '09:00');
  assert.equal(
    entered.notes,
    base.notes,
    'Numeric input normalization leaves Mongolian prose and shaping controls intact',
  );
  assert.deepEqual(
    api.occurrencesBetween([base], '2026-10-01', '2026-10-31').map((x) => x.startDate),
    ['2026-10-08', '2026-10-22', '2026-10-29'],
  );
  const monthly = api.normalizeEvent({
    ...base,
    id: 'monthly',
    startDate: '2026-01-31',
    endDate: '2026-01-31',
    repeat: 'monthly',
    exceptions: [],
  });
  assert.equal(
    api.occurrencesBetween([monthly], '2026-02-01', '2026-02-28').length,
    0,
    'Monthly day 31 skips a month without that day',
  );
  const leap = api.normalizeEvent({
    ...base,
    id: 'leap',
    startDate: '2024-02-29',
    endDate: '2024-02-29',
    repeat: 'yearly',
    until: '',
    exceptions: [],
  });
  assert.equal(api.occurrencesBetween([leap], '2025-02-01', '2025-03-01').length, 0);
  assert.equal(api.occurrencesBetween([leap], '2028-02-01', '2028-03-01').length, 1);
  const multi = api.normalizeEvent({
    ...base,
    id: 'multi',
    startDate: '2026-10-01',
    endDate: '2026-10-03',
    allDay: true,
    repeat: 'none',
    exceptions: [],
  });
  assert.equal(api.occurrencesBetween([multi], '2026-10-02', '2026-10-02').length, 1);
  const one = api.eventForOccurrence(base, '2026-10-22', 'one');
  assert.equal(one.repeat, 'none');
  assert.equal(one.startDate, '2026-10-22');
  for (const item of [base, multi, monthly, leap]) {
    const ics = api.exportCalendar([item], new Date('2026-10-08T00:00:00Z'));
    assert(ics.includes('BEGIN:VCALENDAR'));
    const [roundtrip] = api.importCalendar(ics, () => 'new-id');
    assert.deepEqual(
      roundtrip,
      item,
      'ICS preserves Mongolian shaping controls, recurrence and multi-day dates',
    );
  }
  const utc =
    'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:utc\r\nSUMMARY:ᠬᠤᠷᠠᠯ\r\nDTSTART:20261008T230000Z\r\nDTEND:20261009T000000Z\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const [converted] = api.importCalendar(utc, () => 'new');
  assert.equal(converted.startDate, '2026-10-09');
  assert.equal(converted.startTime, '07:00');
  assert.equal(converted.endTime, '08:00');
  assert.throws(() => api.normalizeEvent({ ...base, endDate: '2026-10-07' }));
  assert.throws(() => api.normalizeEvent({ ...base, endTime: '08:00' }));
  assert.throws(() => api.normalizeEvent({ ...base, interval: 0 }), { message: 'interval' });
  assert.throws(
    () =>
      api.importCalendar(
        utc.replace('DTSTART:', 'RRULE:FREQ=MONTHLY;BYDAY=1MO\r\nDTSTART:'),
        () => 'new',
      ),
    'Unsupported recurrence cannot silently become a single event',
  );
  const memory = new Map();
  const store = {
    getItem: (key) => memory.get(key) || null,
    setItem: (key, value) => memory.set(key, value),
  };
  api.writeEvents(store, [base, multi]);
  assert.deepEqual(api.readEvents(store), [base, multi]);
  assert.throws(
    () => api.writeEvents(store, [base, base]),
    'Duplicate IDs leave saved data intact',
  );
  assert.deepEqual(api.readEvents(store), [base, multi]);
  assert.throws(() =>
    api.writeEvents(
      {
        setItem() {
          throw new Error('quota');
        },
      },
      [base],
    ),
  );
  assert.deepEqual(api.readEvents(store), [base, multi]);
  console.log(
    'PASS: recurring dates, exceptions, leap years, multi-day spans, ICS roundtrip/time zones, text preservation and persistence.',
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
