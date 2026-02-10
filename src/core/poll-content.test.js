// Tests for pollPageContent — predicate resolution and polling
// Derive test cases from input types: cfg (with/without pages, getPageType, predicate)

import { describe, it, expect, vi } from 'vitest';
import { pollPageContent } from './poll-content.js';

describe('pollPageContent', () => {
  // ===========================================================================
  // No predicate found → returns false (caller should use legacy fallback)
  // ===========================================================================

  it('returns false when cfg has no pages', async () => {
    const cfg = {};
    expect(await pollPageContent(cfg, 200)).toBe(false);
  });

  it('returns false when cfg.pages is undefined', async () => {
    const cfg = { pages: undefined, getPageType: () => 'search' };
    expect(await pollPageContent(cfg, 200)).toBe(false);
  });

  it('returns false when page type has no config entry', async () => {
    const cfg = {
      pages: { search: { waitForContent: () => true } },
      getPageType: () => 'other',  // no 'other' in pages
    };
    expect(await pollPageContent(cfg, 200)).toBe(false);
  });

  it('returns false when page config exists but has no waitForContent', async () => {
    const cfg = {
      pages: { search: { render: () => {} } },  // no waitForContent
      getPageType: () => 'search',
    };
    expect(await pollPageContent(cfg, 200)).toBe(false);
  });

  // ===========================================================================
  // Defaults to page type "other" when getPageType is missing
  // ===========================================================================

  it('defaults to page type "other" when getPageType is not defined', async () => {
    const predicate = vi.fn(() => true);
    const cfg = {
      pages: { other: { waitForContent: predicate } },
      // no getPageType
    };
    expect(await pollPageContent(cfg, 200)).toBe(true);
    expect(predicate).toHaveBeenCalled();
  });

  // ===========================================================================
  // Predicate returns true immediately → returns true, no extra polling
  // ===========================================================================

  it('returns true immediately when predicate returns true on first call', async () => {
    const predicate = vi.fn(() => true);
    const cfg = {
      pages: { search: { waitForContent: predicate } },
      getPageType: () => 'search',
    };

    const start = Date.now();
    const result = await pollPageContent(cfg, 5000, 50);
    const elapsed = Date.now() - start;

    expect(result).toBe(true);
    expect(predicate).toHaveBeenCalledTimes(1);
    // Should resolve nearly instantly, not wait the full timeout
    expect(elapsed).toBeLessThan(100);
  });

  // ===========================================================================
  // Predicate becomes true after several polls → returns true before timeout
  // ===========================================================================

  it('polls until predicate returns true', async () => {
    let callCount = 0;
    const predicate = () => {
      callCount++;
      return callCount >= 3;  // becomes true on 3rd call
    };
    const cfg = {
      pages: { search: { waitForContent: predicate } },
      getPageType: () => 'search',
    };

    const result = await pollPageContent(cfg, 2000, 10);

    expect(result).toBe(true);
    expect(callCount).toBeGreaterThanOrEqual(3);
  });

  // ===========================================================================
  // Predicate never returns true → times out, still returns true (handled)
  // ===========================================================================

  it('returns true on timeout when predicate never returns true', async () => {
    const predicate = vi.fn(() => false);
    const cfg = {
      pages: { search: { waitForContent: predicate } },
      getPageType: () => 'search',
    };

    const start = Date.now();
    const result = await pollPageContent(cfg, 150, 10);
    const elapsed = Date.now() - start;

    expect(result).toBe(true);
    // Should have waited approximately the timeout duration
    expect(elapsed).toBeGreaterThanOrEqual(100);
    // Should have polled multiple times
    expect(predicate.mock.calls.length).toBeGreaterThan(1);
  });

  // ===========================================================================
  // Uses getPageType to resolve the correct page config
  // ===========================================================================

  it('uses getPageType to look up the correct page config', async () => {
    const searchPred = vi.fn(() => true);
    const watchPred = vi.fn(() => true);
    const cfg = {
      pages: {
        search: { waitForContent: searchPred },
        watch: { waitForContent: watchPred },
      },
      getPageType: () => 'watch',
    };

    await pollPageContent(cfg, 200);

    expect(watchPred).toHaveBeenCalled();
    expect(searchPred).not.toHaveBeenCalled();
  });
});
