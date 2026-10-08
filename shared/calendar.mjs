export function civilDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return null;
  return { iso: value, year, month, day };
}

export function currentDate(zone = 'Asia/Shanghai', now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  return ['year', 'month', 'day']
    .map((key) => parts.find((part) => part.type === key).value)
    .join('-');
}

export function moveDate(value, days) {
  if (!civilDate(value)) throw new RangeError('Invalid date');
  const date = new Date(value + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function moveMonth(value, months) {
  const date = civilDate(value);
  if (!date) throw new RangeError('Invalid date');
  const target = new Date(value + 'T12:00:00Z');
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const month = target.toISOString().slice(0, 7);
  let day = date.day;
  while (!civilDate(`${month}-${String(day).padStart(2, '0')}`)) day--;
  return `${month}-${String(day).padStart(2, '0')}`;
}

export function monthDays(month, provider, firstWeekday = 0) {
  const first = month + '-01';
  if (!civilDate(first)) throw new RangeError('Invalid month');
  const weekday = (new Date(first + 'T12:00:00Z').getUTCDay() + 6 - firstWeekday + 7) % 7;
  const next = moveMonth(first, 1);
  const days = Number(moveDate(next, -1).slice(-2));
  return Array.from({ length: Math.ceil((weekday + days) / 7) * 7 }, (_, index) => {
    const iso = moveDate(first, index - weekday);
    return {
      iso,
      day: Number(iso.slice(-2)),
      inMonth: iso.startsWith(month),
      lunar: provider?.validDate(iso) ? provider.compute(iso) : null,
    };
  });
}

export function chineseLunisolarProvider(engine, config) {
  if (
    !engine ||
    typeof engine.compute !== 'function' ||
    config.calendarSystem !== 'chinese-lunisolar'
  )
    throw new TypeError('A Chinese lunisolar engine and matching calendar type are required');
  if (!civilDate(config.minDate) || !civilDate(config.maxDate) || config.minDate > config.maxDate)
    throw new RangeError('Invalid calendar range');
  new Intl.DateTimeFormat('en', { timeZone: config.timeZone });
  const validDate = (value) =>
    !!civilDate(value) && value >= config.minDate && value <= config.maxDate;
  return Object.freeze({
    id: 'chinese-lunisolar',
    minDate: config.minDate,
    maxDate: config.maxDate,
    timeZone: config.timeZone,
    validDate,
    compute(value) {
      if (!validDate(value)) throw new RangeError('Date is outside the calendar range');
      const result = engine.compute(value);
      if (
        !result ||
        !Number.isInteger(result.lunarYear) ||
        result.lunarYear < 1 ||
        !Number.isInteger(result.lunarMonth) ||
        result.lunarMonth < 1 ||
        result.lunarMonth > 12 ||
        !Number.isInteger(result.lunarDay) ||
        result.lunarDay < 1 ||
        result.lunarDay > 30 ||
        typeof result.leapMonth !== 'boolean'
      )
        throw new TypeError('Invalid lunar date');
      return { ...result, calendarSystem: 'chinese-lunisolar', civilDate: value };
    },
  });
}
