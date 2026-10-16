export const themeFormat = 'nutug-theme';
export const themeLimit = 65536;
export function normalizeTheme(value) {
  if (
    !value ||
    value.format !== themeFormat ||
    value.version !== 1 ||
    typeof value.id !== 'string' ||
    !/^[a-zA-Z0-9-]{1,64}$/.test(value.id) ||
    typeof value.name !== 'string' ||
    !value.name.trim() ||
    value.name.length > 120
  )
    throw new Error('theme');
  const colors = {};
  for (const key of ['background', 'text', 'accent']) {
    if (typeof value.colors?.[key] !== 'string' || !/^#[0-9a-f]{6}$/i.test(value.colors[key]))
      throw new Error('color');
    colors[key] = value.colors[key].toUpperCase();
  }
  return { format: themeFormat, version: 1, id: value.id, name: value.name.trim(), colors };
}
export function decodeTheme(text) {
  if (new TextEncoder().encode(text).length > themeLimit) throw new Error('size');
  return normalizeTheme(JSON.parse(text));
}
export function encodeTheme(theme) {
  return JSON.stringify(normalizeTheme(theme), null, 2) + '\n';
}
export function themeIsDark(hex) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return false;
  const c = hex
    .slice(1)
    .match(/../g)
    .map((s) => parseInt(s, 16) / 255);
  return c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722 < 0.5;
}
export function themeVariables(theme) {
  const { background, text, accent } = normalizeTheme(theme).colors;
  const mix = (n) => {
    const a = background
      .slice(1)
      .match(/../g)
      .map((s) => parseInt(s, 16));
    const b = text
      .slice(1)
      .match(/../g)
      .map((s) => parseInt(s, 16));
    return (
      '#' +
      a
        .map((v, i) =>
          Math.round(v * (1 - n) + b[i] * n)
            .toString(16)
            .padStart(2, '0'),
        )
        .join('')
    );
  };
  return {
    '--canvas': background,
    '--background': background,
    '--sidebar': mix(0.04),
    '--label': text,
    '--prose': text,
    '--control-label': text,
    '--prose-secondary': mix(0.75),
    '--secondary': mix(0.75),
    '--accent': accent,
    '--on-accent': themeIsDark(accent) ? '#FFFFFF' : '#000000',
    '--link-text': accent,
    '--separator': mix(0.18),
    '--line': mix(0.18),
    '--secondary-fill': mix(0.1),
    '--tertiary-fill': mix(0.05),
    '--selected-fill': mix(0.08),
    '--selection': mix(0.12),
    '--calendar-panel': background,
  };
}
