export const calendarSkins = ['light', 'dark', 'paper', 'ink'];
export const preferenceKey = 'nutug.calendar.preferences.v1';
export const defaultPreferences = { skin: 'light', firstWeekday: 0, lunar: true, view: 'month' };
export function calendarPreferences(value = {}) {
  return {
    fontScale: Math.max(0.85, Math.min(1.5, Number(value.fontScale) || 1)),
    skin: calendarSkins.includes(value.skin) ? value.skin : 'light',
    firstWeekday: value.firstWeekday === 6 ? 6 : 0,
    lunar: value.lunar !== false,
    view: ['year', 'month', 'week', 'day'].includes(value.view) ? value.view : 'month',
  };
}
