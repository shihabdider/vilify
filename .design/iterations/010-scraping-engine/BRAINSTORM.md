# Iteration 010: Scraping Engine

## Status: PLANNED

## Goal

Create a robust, site-agnostic scraping engine that handles the timing and reliability issues we've encountered with YouTube DOM scraping.

## Problem

Current scraping issues:
1. **Timing** - DOM not ready when scraping, content loads asynchronously
2. **Fragile selectors** - YouTube changes renderers, selectors break
3. **No reactivity** - Polling (200ms) is a blunt instrument
4. **Partial data** - Scrapers return incomplete results without knowing it
5. **Page-specific** - Each page type needs custom scraping logic

## Proposed Solution

### Core Scraping Engine

A site-agnostic engine that provides:

1. **Wait strategies**
   - Wait for selector to appear
   - Wait for N items
   - Wait for content to stabilize (no changes for X ms)
   - Timeout with partial results

2. **Retry logic**
   - Configurable retry count and delay
   - Exponential backoff option
   - Partial success handling

3. **MutationObserver integration**
   - Watch for DOM changes
   - Re-scrape on relevant mutations
   - Debounced updates

4. **Declarative selector config**
   - Multiple fallback selectors per field
   - Required vs optional fields
   - Validation rules

### Site-Specific Configuration

Sites provide:
- Selector definitions per page type
- Field extraction logic
- Validation rules
- Custom wait conditions

## Potential Behaviors

| ID | Behavior | Test Method |
|----|----------|-------------|
| B1 | Engine waits for content before returning | Load slow page, items appear complete |
| B2 | Engine retries on partial results | Mock slow DOM, verify retry |
| B3 | Engine uses fallback selectors | Primary selector fails, fallback works |
| B4 | Engine validates required fields | Missing title = item skipped |
| B5 | Observer detects new content | Scroll to load more, new items appear |
| B6 | Channel page scrapes reliably | Load channel, all videos shown |

## Data Types (Preliminary)

```
ScraperConfig is a structure:
- waitStrategy: WaitStrategy
- retryConfig: RetryConfig
- selectors: SelectorConfig
- validate: Function | null

WaitStrategy is one of:
- { type: 'selector', selector: String, timeout: Number }
- { type: 'count', minimum: Number, timeout: Number }
- { type: 'stable', debounceMs: Number, timeout: Number }

RetryConfig is a structure:
- maxRetries: Number
- delayMs: Number
- backoff: Boolean

SelectorConfig is a structure:
- container: Array<String> - fallback selectors for item container
- fields: Record<String, FieldConfig>

FieldConfig is a structure:
- selectors: Array<String> - fallback selectors
- required: Boolean
- extract: 'text' | 'href' | 'src' | Function
```

## Dependencies

- Should be done after 009 (module boundaries) since it adds new core module
- Will require updates to youtube/scraper.js to use new engine

## Notes

- This is infrastructure work - improves reliability, no new features
- Measure before/after: success rate on channel page, history page
- Consider making wait strategies composable

## References

- Current scraper: `src/sites/youtube/scraper.js` (~700 lines)
- Working userscript reference: `sites/youtube.user.js` (Scraper object)
- Issues documented in ITERATIONS.md iterations 3-4
