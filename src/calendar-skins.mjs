import { normalizeTheme } from '../shared/calendar-themes.mjs';
export const calendarSkins = ['light', 'dark', 'paper', 'ink'];
export const preferenceKey = 'nutug.calendar.preferences.v1';
export const defaultPreferences = { skin: 'light', firstWeekday: 6, lunar: true, view: 'month' };
export function calendarPreferences(value = {}) {
  const themes = [];
  for (const item of Array.isArray(value.themes) ? value.themes : []) {
    try {
      const theme = normalizeTheme(item);
      if (!themes.some((t) => t.id === theme.id)) themes.push(theme);
    } catch {}
  }
  return {
    themes,
    fontScale: Math.max(0.85, Math.min(1.5, Number(value.fontScale) || 1)),
    skin:
      calendarSkins.includes(value.skin) || themes.some((t) => `custom:${t.id}` === value.skin)
        ? value.skin
        : 'light',
    firstWeekday: value.firstWeekday === 0 ? 0 : 6,
    lunar: value.lunar !== false,
    view: ['year', 'month', 'week', 'day'].includes(value.view) ? value.view : 'month',
  };
}
