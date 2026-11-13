export const backupStorageKey = 'nutug.calendar.backup.v1';
export const backupInterval = 30 * 24 * 60 * 60 * 1000;

const stamp = (value) => (Number.isFinite(value) && value > 0 ? value : null);

// changedAt: first change not yet exported; snoozedAt: last time the reminder was dismissed.
export function readBackup(storage) {
  try {
    const value = JSON.parse(storage.getItem(backupStorageKey) || '{}');
    return { changedAt: stamp(value?.changedAt), snoozedAt: stamp(value?.snoozedAt) };
  } catch {
    return { changedAt: null, snoozedAt: null };
  }
}

function save(storage, state) {
  try {
    storage.setItem(backupStorageKey, JSON.stringify(state));
  } catch {
    // The reminder is advisory; appointments report their own storage failures.
  }
  return state;
}

export const markChanged = (storage, now = Date.now()) => {
  const state = readBackup(storage);
  return state.changedAt ? state : save(storage, { ...state, changedAt: now });
};
export const markExported = (storage) => save(storage, { changedAt: null, snoozedAt: null });
export const snoozeBackup = (storage, now = Date.now()) =>
  save(storage, { ...readBackup(storage), snoozedAt: now });

export const backupDue = (state, eventCount, now = Date.now()) =>
  eventCount > 0 &&
  Boolean(state.changedAt) &&
  now - Math.max(state.changedAt, state.snoozedAt || 0) >= backupInterval;

// Ask the browser to exempt this site from automatic storage eviction.
export async function requestPersistence(storageManager = globalThis.navigator?.storage) {
  try {
    if (!storageManager?.persist) return false;
    if (await storageManager.persisted?.()) return true;
    return await storageManager.persist();
  } catch {
    return false;
  }
}
