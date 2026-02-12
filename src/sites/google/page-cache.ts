// =============================================================================
// GOOGLE PAGE CACHE
// =============================================================================
// Cache scraped Google search results in sessionStorage keyed by URL.
// Provides getCachedPage and setCachedPage for fast restore on back-navigation,
// and clearPageCache for cleanup.
//
// Key prefix: 'vilify-page-cache:'
// Storage: sessionStorage (persists across navigations within a tab, cleared on tab close)
// All access wrapped in try/catch (private browsing may throw)

import type { ContentItem } from '../../types';

/**
 * Maximum number of cached pages before pruning oldest entries.
 * @type {number}
 */
const MAX_CACHE_ENTRIES = 20;

/**
 * Key prefix for all vilify page cache entries in sessionStorage.
 * @type {string}
 */
const KEY_PREFIX = 'vilify-page-cache:';

/**
 * Get cached search results for a URL.
 *
 * Signature: getCachedPage : String → ContentItem[] | null
 * Purpose: Return cached items array for the given URL, or null if no cache hit.
 *          Handles JSON parse errors gracefully (returns null).
 *
 * Examples:
 *   // No cache entry
 *   getCachedPage('https://google.com/search?q=test') => null
 *
 *   // Valid cache entry
 *   // sessionStorage has 'vilify-page-cache:https://google.com/search?q=test' → '[{"id":"1","title":"A"}]'
 *   getCachedPage('https://google.com/search?q=test') => [{ id: '1', title: 'A' }]
 *
 *   // Corrupt JSON
 *   // sessionStorage has 'vilify-page-cache:...' → '{not valid'
 *   getCachedPage('...') => null
 *
 * @param {string} url - The page URL to look up
 * @returns {Array<Object>|null} Cached ContentItem array, or null
 */
export function getCachedPage(url: string): ContentItem[] | null {
  try {
    const raw = sessionStorage.getItem(KEY_PREFIX + url);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

/**
 * Cache search results for a URL.
 *
 * Signature: setCachedPage : String × ContentItem[] → Void
 * Purpose: Store items in sessionStorage. Prunes oldest entries if over
 *          MAX_CACHE_ENTRIES limit. Handles storage errors gracefully (no-op).
 *
 * Examples:
 *   // Normal store
 *   setCachedPage('https://google.com/search?q=test', [{ id: '1', title: 'A' }])
 *   // sessionStorage now has 'vilify-page-cache:https://google.com/search?q=test'
 *
 *   // Over limit — prunes oldest entries first
 *   // (20 entries exist, adding 21st prunes the first)
 *
 *   // Storage error (quota, private browsing) — silent no-op
 *
 * @param {string} url - The page URL to cache
 * @param {Array<Object>} items - ContentItem array to store
 * @returns {void}
 */
export function setCachedPage(url: string, items: ContentItem[]): void {
  try {
    // Prune if at or over limit (before adding the new entry)
    pruneIfNeeded();
    sessionStorage.setItem(KEY_PREFIX + url, JSON.stringify(items));
  } catch (e) {
    // no-op: quota exceeded or private browsing
  }
}

/**
 * Clear all vilify page cache entries from sessionStorage.
 *
 * Signature: clearPageCache : → Void
 * Purpose: Remove all entries with the vilify-page-cache: prefix.
 *          Does not affect other sessionStorage entries.
 *
 * Examples:
 *   // Two cache entries + one other key
 *   clearPageCache()
 *   // Only cache entries removed, other key preserved
 *
 * @returns {void}
 */
export function clearPageCache(): void {
  try {
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(KEY_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      sessionStorage.removeItem(key);
    }
  } catch (e) {
    // no-op: private browsing
  }
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Prune oldest cache entries if count >= MAX_CACHE_ENTRIES.
 * Removes entries one at a time until under the limit.
 *
 * Signature: pruneIfNeeded : → Void
 * Purpose: Keep cache size within MAX_CACHE_ENTRIES by removing oldest entries.
 *
 * @returns {void}
 */
function pruneIfNeeded(): void {
  const cacheKeys = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(KEY_PREFIX)) {
      cacheKeys.push(key);
    }
  }

  // Remove oldest entries (first found) until under the limit
  while (cacheKeys.length >= MAX_CACHE_ENTRIES) {
    const oldest = cacheKeys.shift();
    sessionStorage.removeItem(oldest);
  }
}
