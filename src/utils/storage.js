  if (!isBrowser) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch {
    // fall through to legacy migration
  }
  const legacyKey = LEGACY_KEY_MAP[key.replace(/^nzt_/, '')];
  if (legacyKey) {
    try {
      const legacyRaw = localStorage.getItem(legacyKey);
      if (legacyRaw !== null) {
        const parsed = JSON.parse(legacyRaw);
        localStorage.setItem(key, JSON.stringify(parsed));
        return parsed;
      }
    } catch {
      return fallback;
    }
  }
  return fallback;
}
export function saveToStorage(key, value) {
  if (!isBrowser) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Failed to persist ${key}`, error);
  }
}
export function removeFromStorage(key) {
  if (!isBrowser) return;
  localStorage.removeItem(key);
}