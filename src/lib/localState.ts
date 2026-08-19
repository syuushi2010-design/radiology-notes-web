const RECENTLY_VIEWED_KEY = "radiology-notes-recently-viewed";
const LAST_SYNCED_KEY = "radiology-notes-last-synced";

export function readRecentlyViewedIds(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(RECENTLY_VIEWED_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 12) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(id: string): string[] {
  const ids = [id, ...readRecentlyViewedIds().filter((item) => item !== id)].slice(0, 12);
  try { window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids)); } catch { /* 端末の保存制限時はメモリ表示だけ継続 */ }
  return ids;
}

export function readLastSyncedAt(): string | undefined {
  try { return window.localStorage.getItem(LAST_SYNCED_KEY) ?? undefined; } catch { return undefined; }
}

export function recordLastSyncedAt(value: string) {
  try { window.localStorage.setItem(LAST_SYNCED_KEY, value); } catch { /* 保存できなくても同期処理自体は成功 */ }
}

export function clearLocalState() {
  try {
    window.localStorage.removeItem(RECENTLY_VIEWED_KEY);
    window.localStorage.removeItem(LAST_SYNCED_KEY);
  } catch { /* private modeなど */ }
}
