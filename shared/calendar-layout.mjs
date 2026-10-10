import { civilDate, moveDate } from './calendar.mjs';

export const minuteOfDay = (time) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));
export const clockLabel = (minute) =>
  `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;

// The actual interval stays separate from the minimum space needed by a vertical label.
export function dayTimeline(occurrences, date, minimumMinutes = 60) {
  if (!civilDate(date)) throw new RangeError('date');
  const allDay = [],
    timed = [];
  for (const event of occurrences) {
    if (event.startDate > date || event.endDate < date) continue;
    if (event.allDay) {
      allDay.push(event);
      continue;
    }
    const start = event.startDate < date ? 0 : minuteOfDay(event.startTime);
    const end = event.endDate > date ? 1440 : minuteOfDay(event.endTime);
    if (end <= start) continue;
    timed.push({
      event,
      start,
      end,
      visualEnd: Math.max(end, start + minimumMinutes),
      before: event.startDate < date,
      after: event.endDate > date,
      column: 0,
      columns: 1,
    });
  }
  timed.sort((a, b) => a.start - b.start || b.end - a.end || a.event.id.localeCompare(b.event.id));
  let group = [],
    until = -1;
  const place = () => {
    const lanes = [];
    for (const item of group) {
      let column = lanes.findIndex((end) => end <= item.start);
      if (column === -1) column = lanes.length;
      item.column = column;
      lanes[column] = item.visualEnd;
    }
    for (const item of group) item.columns = lanes.length;
  };
  for (const item of timed) {
    if (group.length && item.start >= until) {
      place();
      group = [];
      until = -1;
    }
    group.push(item);
    until = Math.max(until, item.visualEnd);
  }
  place();
  return { allDay, timed };
}

export function slotTimes(date, minute = 540) {
  if (!civilDate(date) || !Number.isInteger(minute) || minute < 0 || minute >= 1440)
    throw new RangeError('slot');
  let endDate = date,
    end = minute + 60;
  if (end >= 1440) {
    if (date === '2100-12-31') end = 1439;
    else {
      endDate = moveDate(date, 1);
      end -= 1440;
    }
  }
  if (endDate === date && end <= minute) throw new RangeError('slot');
  return { startDate: date, endDate, startTime: clockLabel(minute), endTime: clockLabel(end) };
}

export function fitCalendarTitle(text, measure, height, columns) {
  const words = text.match(/[^ \t\r\n]+/gu) || [];
  const kept = [];
  let line = '',
    column = 0;
  for (const word of words) {
    if (measure(word) > height) break;
    const next = line ? line + ' ' + word : word;
    if (measure(next) > height) {
      column++;
      line = '';
    }
    if (column >= columns) break;
    kept.push(word);
    line = line ? line + ' ' + word : word;
  }
  return { text: kept.join(' '), shortened: kept.length < words.length };
}
