const STORAGE_KEY = "czl:recentUrls";
const MAX_ENTRIES = 10;

export function getRecentUrls() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry) => typeof entry.url === "string" && typeof entry.lastLoaded === "number"
    );
  } catch {
    return [];
  }
}

export function saveRecentUrl(url) {
  const entries = getRecentUrls().filter((entry) => entry.url !== url);
  entries.unshift({ url, lastLoaded: Date.now() });
  if (entries.length > MAX_ENTRIES) entries.length = MAX_ENTRIES;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function removeRecentUrl(url) {
  const entries = getRecentUrls().filter((entry) => entry.url !== url);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function clearRecentUrls() {
  localStorage.removeItem(STORAGE_KEY);
}
