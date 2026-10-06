export function civilDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) return null;
  return { iso: value, year, month, day };
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
