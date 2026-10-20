import ICAL from 'ical.js';
import { civilDate, moveDate, currentDate, normalizeDateInput } from './calendar.mjs';
export { dayTimeline, slotTimes } from './calendar-layout.mjs';

export const eventStorageKey = 'nutug.calendar.events.v1';
export const recurrenceKinds = ['none', 'daily', 'weekly', 'monthly', 'yearly'];
export const eventColors = ['blue', 'green', 'orange', 'purple'];
export const dayDistance = (a, b) =>
  Math.round((Date.parse(b + 'T12:00:00Z') - Date.parse(a + 'T12:00:00Z')) / 86400000);
export const weekday = (date) => (new Date(date + 'T12:00:00Z').getUTCDay() + 6) % 7;
export const validCalendarDate = (date) =>
  !!civilDate(date) && date >= '1901-01-01' && date <= '2100-12-31';
const validTime = (time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time);
const numericInput = (value) =>
  typeof value === 'string'
    ? value
        .normalize('NFKC')
        .replace(/[᠐-᠙]/g, (digit) => String(digit.charCodeAt(0) - 0x1810))
        .trim()
    : value;
const timeInput = (value) =>
  numericInput(value).replace(
    /^(\d{1,2}):(\d{1,2})$/,
    (_, h, m) => `${h.padStart(2, '0')}:${m.padStart(2, '0')}`,
  );

export function normalizeEvent(value) {
  if (!value || typeof value !== 'object') throw new TypeError('event');
  const event = {
    id: String(value.id || ''),
    title: String(value.title || '').trim(),
    notes: String(value.notes || ''),
    location: String(value.location || ''),
    startDate: normalizeDateInput(value.startDate),
    endDate: normalizeDateInput(value.endDate || value.startDate),
    startTime: timeInput(String(value.startTime || '09:00')),
    endTime: timeInput(String(value.endTime || '10:00')),
    allDay: Boolean(value.allDay),
    repeat: value.repeat || 'none',
    interval: Number(value.interval ?? 1),
    until: normalizeDateInput(value.until || ''),
    color: eventColors.includes(value.color) ? value.color : 'blue',
    exceptions: [...new Set(value.exceptions || [])],
  };
  if (event.allDay) event.startTime = event.endTime = '00:00';
  if (event.repeat === 'none') {
    event.until = '';
    event.interval = 1;
  }
  if (
    !event.id ||
    event.id.length > 256 ||
    /[\r\n]/.test(event.id) ||
    !event.title ||
    event.title.length > 1000
  )
    throw new TypeError('title');
  if (!validCalendarDate(event.startDate)) throw new RangeError('startDate');
  if (!validCalendarDate(event.endDate) || event.endDate < event.startDate)
    throw new RangeError('endDate');
  if (!validTime(event.startTime)) throw new RangeError('startTime');
  if (
    !validTime(event.endTime) ||
    (!event.allDay && event.startDate === event.endDate && event.endTime <= event.startTime)
  )
    throw new RangeError('endTime');
  if (!recurrenceKinds.includes(event.repeat)) throw new RangeError('repeat');
  if (!Number.isInteger(event.interval) || event.interval < 1 || event.interval > 99)
    throw new RangeError('interval');
  if (event.until && (!validCalendarDate(event.until) || event.until < event.startDate))
    throw new RangeError('until');
  if (!event.exceptions.every(validCalendarDate)) throw new RangeError('exceptions');
  return event;
}

export function occursOn(event, date) {
  if (
    date < event.startDate ||
    (event.until && date > event.until) ||
    event.exceptions.includes(date)
  )
    return false;
  const distance = dayDistance(event.startDate, date);
  const first = civilDate(event.startDate),
    next = civilDate(date);
  if (event.repeat === 'none') return distance === 0;
  if (event.repeat === 'daily') return distance % event.interval === 0;
  if (event.repeat === 'weekly') return distance % (7 * event.interval) === 0;
  if (event.repeat === 'monthly')
    return (
      next.day === first.day &&
      ((next.year - first.year) * 12 + next.month - first.month) % event.interval === 0
    );
  return (
    next.day === first.day &&
    next.month === first.month &&
    (next.year - first.year) % event.interval === 0
  );
}

export function occurrencesBetween(events, from, to) {
  if (
    !validCalendarDate(from) ||
    !validCalendarDate(to) ||
    from > to ||
    dayDistance(from, to) > 370
  )
    throw new RangeError('range');
  const result = [];
  for (const event of events) {
    const span = dayDistance(event.startDate, event.endDate);
    const add = (date) =>
      result.push({
        ...event,
        eventId: event.id,
        occurrenceDate: date,
        id: event.id + '/' + date,
        startDate: date,
        endDate: moveDate(date, span),
      });
    if (event.repeat === 'none') {
      if (
        event.startDate <= to &&
        event.endDate >= from &&
        !event.exceptions.includes(event.startDate)
      )
        add(event.startDate);
      continue;
    }
    const first = [event.startDate, moveDate(from, -span)].sort().at(-1);
    for (let date = first; date <= to && date <= (event.until || to); date = moveDate(date, 1)) {
      if (occursOn(event, date)) add(date);
    }
  }
  return result.sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      Number(b.allDay) - Number(a.allDay) ||
      a.startTime.localeCompare(b.startTime) ||
      a.title.localeCompare(b.title),
  );
}

export function eventForOccurrence(event, occurrenceDate, id) {
  return normalizeEvent({
    ...event,
    id,
    startDate: occurrenceDate,
    endDate: moveDate(occurrenceDate, dayDistance(event.startDate, event.endDate)),
    repeat: 'none',
    until: '',
    exceptions: [],
  });
}

export function readEvents(storage) {
  const raw = storage.getItem(eventStorageKey);
  if (!raw) return [];
  const data = JSON.parse(raw);
  if (data.version !== 1 || !Array.isArray(data.events)) throw new TypeError('storage');
  return normalizeEvents(data.events);
}
export function writeEvents(storage, events) {
  const value = normalizeEvents(events);
  storage.setItem(eventStorageKey, JSON.stringify({ version: 1, events: value }));
  return value;
}
function normalizeEvents(events) {
  const values = events.map(normalizeEvent);
  if (new Set(values.map((event) => event.id)).size !== values.length)
    throw new TypeError('duplicate id');
  return values;
}

const isoTime = (date, time, allDay) => ICAL.Time.fromString(allDay ? date : `${date}T${time}:00`);
export function exportCalendar(events, now = new Date()) {
  const calendar = new ICAL.Component(['vcalendar', [], []]);
  calendar.updatePropertyWithValue('version', '2.0');
  calendar.updatePropertyWithValue('prodid', '-//Nutug//Calendar//MN');
  for (const data of events.map(normalizeEvent)) {
    const component = new ICAL.Component('vevent');
    const event = new ICAL.Event(component);
    event.uid = data.id;
    event.summary = data.title;
    event.description = data.notes;
    event.location = data.location;
    event.startDate = isoTime(data.startDate, data.startTime, data.allDay);
    event.endDate = isoTime(
      data.allDay ? moveDate(data.endDate, 1) : data.endDate,
      data.endTime,
      data.allDay,
    );
    component.updatePropertyWithValue('dtstamp', ICAL.Time.fromJSDate(now, true));
    component.updatePropertyWithValue('x-nutug-color', data.color);
    if (data.repeat !== 'none') {
      const rule = new ICAL.Recur({
        freq: data.repeat.toUpperCase(),
        interval: data.interval,
        ...(data.until ? { until: isoTime(data.until, data.startTime, data.allDay) } : {}),
      });
      component.updatePropertyWithValue('rrule', rule);
    }
    for (const date of data.exceptions)
      component.addPropertyWithValue('exdate', isoTime(date, data.startTime, data.allDay));
    calendar.addSubcomponent(component);
  }
  return calendar.toString();
}

export function importCalendar(text, makeId) {
  if (typeof text !== 'string' || text.length > 5000000) throw new RangeError('file');
  const root = new ICAL.Component(ICAL.parse(text));
  if (root.name !== 'vcalendar') throw new TypeError('calendar');
  for (const component of root.getAllSubcomponents('vtimezone')) {
    const tzid = component.getFirstPropertyValue('tzid');
    ICAL.TimezoneService.register(new ICAL.Timezone({ component, tzid }));
  }
  const records = root.getAllSubcomponents('vevent');
  if (!records.length || records.length > 5000) throw new RangeError('events');
  const parts = (value, property) => {
    if (!value) throw new TypeError('date');
    const tzid = property?.getParameter('tzid');
    if (tzid && tzid !== 'Asia/Shanghai' && !ICAL.TimezoneService.has(tzid))
      throw new TypeError('timezone');
    if (value.isDate || value.zone.tzid === 'floating' || tzid === 'Asia/Shanghai')
      return {
        date: value.toString().slice(0, 10),
        time: value.isDate ? '00:00' : value.toString().slice(11, 16),
      };
    const date = value.toJSDate();
    return {
      date: currentDate('Asia/Shanghai', date),
      time: new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Shanghai',
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23',
      }).format(date),
    };
  };
  return records.map((component) => {
    const event = new ICAL.Event(component);
    if (component.hasProperty('recurrence-id') || component.hasProperty('rdate'))
      throw new TypeError('recurrence');
    const start = parts(event.startDate, component.getFirstProperty('dtstart'));
    const end = parts(event.endDate, component.getFirstProperty('dtend'));
    const rule = component.getFirstPropertyValue('rrule');
    if (
      rule &&
      (Object.keys(rule.parts).length ||
        rule.count ||
        !recurrenceKinds.includes(rule.freq.toLowerCase()))
    )
      throw new TypeError('recurrence');
    return normalizeEvent({
      id: event.uid || makeId(),
      title: event.summary,
      notes: event.description,
      location: event.location,
      startDate: start.date,
      endDate: event.startDate.isDate ? moveDate(end.date, -1) : end.date,
      startTime: start.time,
      endTime: end.time,
      allDay: event.startDate.isDate,
      repeat: rule ? rule.freq.toLowerCase() : 'none',
      interval: rule?.interval || 1,
      until: rule?.until ? parts(rule.until).date : '',
      color: component.getFirstPropertyValue('x-nutug-color'),
      exceptions: component
        .getAllProperties('exdate')
        .flatMap((p) => p.getValues().map((date) => parts(date, p).date)),
    });
  });
}
