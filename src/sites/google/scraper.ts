// =============================================================================
// GOOGLE SCRAPER
// =============================================================================
// DOM scraping for Google search results using stable selectors.
// Reference: https://crawlee.dev/blog/scrape-google-search (Dec 2024)
//
// Selector strategy:
// - Use IDs (#rso) and data attributes (data-hveid) over class names
// - Class names are minified and change frequently
// - Semantic HTML (h3, cite, a) is stable

import type { ContentItem } from '../../types';

/**
 * GooglePageType is one of:
 * - 'search' : web search results page (/search?q=... without udm=2)
 * - 'images' : image search results page (/search?q=...&udm=2)
 * - 'other'  : any other Google page
 * 
 * Classification: Enumeration
 * 
 * Examples:
 *   // URL: google.com/search?q=test
 *   getGooglePageType() => 'search'
 *   // URL: google.com/search?q=test&udm=2
 *   getGooglePageType() => 'images'
 *   // URL: google.com/
 *   getGooglePageType() => 'other'
 *   // URL: google.com/maps
 *   getGooglePageType() => 'other'
 */
export function getGooglePageType(): string {
  if (location.pathname === '/search') {
    const params = new URLSearchParams(location.search);
    if (params.get('udm') === '2') {
      return 'images';
    }
    return 'search';
  }
  return 'other';
}

/**
 * Extract description text from a search result element.
 * Tries multiple strategies since Google's DOM varies.
 * 
 * @param {Element} element - Search result container
 * @param {Element} titleEl - Title element (to avoid including title text)
 * @param {Element} citeEl - Cite element (to avoid including URL text)
 * @returns {string} Description text or empty string
 */
function extractDescription(element: Element, titleEl: Element | null, citeEl: Element | null): string {
  // Strategy 1: Look for div with -webkit-line-clamp style
  const lineClampEl = element.querySelector('div[style*="-webkit-line-clamp"]');
  if (lineClampEl?.textContent?.trim()) {
    return lineClampEl.textContent.trim();
  }
  
  // Strategy 2: Look for data-sncf attribute (snippet container)
  const sncfEl = element.querySelector('[data-sncf]');
  if (sncfEl?.textContent?.trim()) {
    return sncfEl.textContent.trim();
  }
  
  // Strategy 3: Look for em tags (highlighted search terms often in description)
  const emEl = element.querySelector('em');
  if (emEl) {
    // Get the parent that likely contains the full description
    const parent = emEl.closest('div');
    if (parent?.textContent?.trim()) {
      const text = parent.textContent.trim();
      // Make sure it's not the title
      if (text !== titleEl?.textContent?.trim()) {
        return text;
      }
    }
  }
  
  // Strategy 4: Find text content after cite element
  // Get all text nodes that aren't title or URL
  const titleText = titleEl?.textContent?.trim() || '';
  const citeText = citeEl?.textContent?.trim() || '';
  
  // Look through divs for description-like content
  const divs = element.querySelectorAll('div');
  for (const div of divs) {
    const text = div.textContent?.trim() || '';
    // Skip if it's the title, URL, or too short
    if (text === titleText || text === citeText || text.length < 20) continue;
    // Skip if it contains the title (nested element)
    if (text.includes(titleText) && text.length > titleText.length + 50) continue;
    // Likely a description
    if (text.length > 30 && text.length < 500) {
      return text;
    }
  }
  
  return '';
}

/**
 * Scrape search results from Google DOM.
 * 
 * Signature: scrapeSearchResults : () → Array<ContentItem>
 * Purpose: Extract search results from Google DOM using stable selectors.
 * 
 * Selectors (tried in order, first non-empty wins):
 * - Container: #rso (stable ID)
 * - Strategy 1: div[data-hveid][lang] (most specific)
 * - Strategy 2: div[data-hveid] filtered to those with h3 + a[href]
 * - Strategy 3: any element with h3 + a[href^="http"] (broadest)
 * - Title: h3 (semantic HTML)
 * - Link: a (first anchor in result)
 * - Description: multiple strategies (see extractDescription)
 * - Display URL: cite (semantic HTML)
 * 
 * Examples:
 *   // On search page with results
 *   scrapeSearchResults() => [
 *     { id: 'https://example.com', title: 'Example', url: 'https://example.com', meta: 'example.com', description: '...' },
 *     ...
 *   ]
 *   
 *   // On non-search page or no results
 *   scrapeSearchResults() => []
 * 
 * @returns {Array<Object>} Array of ContentItem objects
 */
export function scrapeSearchResults(): ContentItem[] {
  // Try multiple containers — Google uses different ones depending on
  // how the search was initiated (direct vs Chrome omnibar vs AI overview)
  const container = document.querySelector('#rso')
    || document.querySelector('#search')
    || document.querySelector('#main');
  if (!container) return [];

  return scrapeResultsFromContainer(container);
}

/**
 * Scrape search results from a given container element.
 * Works on both the live DOM and parsed HTML from fetch responses.
 *
 * @param {Element} container - Container element to scrape from
 * @returns {Array<ContentItem>} Scraped results
 */
export function scrapeResultsFromContainer(container: Element): ContentItem[] {
  const resultElements = findResultElements(container);

  const results: ContentItem[] = [];
  const seenUrls = new Set<string>();

  resultElements.forEach(element => {
    // Title: try h3 first (classic Google), then first link text (modern Google)
    const titleEl = element.querySelector('h3');
    const linkEl = element.querySelector('a[href^="http"]') || element.querySelector('a[href]');
    const title = titleEl?.textContent?.trim()
      || linkEl?.textContent?.trim()
      || '';
    if (!title) return;

    // URL: first http anchor link
    const url = (linkEl as HTMLAnchorElement)?.href;
    if (!url || !url.startsWith('http')) return;

    // Deduplicate
    if (seenUrls.has(url)) return;
    seenUrls.add(url);

    // Display URL: cite element shows clean URL
    const citeEl = element.querySelector('cite');
    const displayUrl = citeEl?.textContent?.trim() || new URL(url).hostname;

    const description = extractDescription(element, titleEl || linkEl, citeEl);

    results.push({
      id: url,
      title: title,
      url: url,
      meta: displayUrl,
      description: description
    });
  });

  return results;
}

/**
 * Find search result elements within the results container using multiple
 * selector strategies. Tries each in order of specificity and returns
 * the first non-empty result set.
 *
 * Strategies:
 * 1. div[data-hveid][lang] — most specific, classic Google DOM
 * 2. div[data-hveid] with a link — leaf-level only (modern Google DOM,
 *    no h3 elements, titles are link text)
 * 3. Broad: elements containing h3 + a[href^="http"] (fallback)
 */
function findResultElements(container: Element): Element[] {
  // Strategy 1: Classic — both data-hveid and lang attributes
  const primary = container.querySelectorAll('div[data-hveid][lang]');
  if (primary.length > 0) return Array.from(primary);

  // Strategy 2: Modern — data-hveid with a link, leaf-level only.
  // Google dropped h3 and lang on Chrome omnibar searches.
  // Filter to leaf hveid elements (those not containing other hveid elements)
  // that have at least one link.
  const hveidAll = Array.from(container.querySelectorAll('div[data-hveid]'));
  const hveidLeaf = hveidAll.filter(el =>
    el.querySelector('a[href]') &&
    !el.querySelector('div[data-hveid]')
  );
  if (hveidLeaf.length > 0) return hveidLeaf;

  // Strategy 3: Broad — elements containing h3 + a[href^="http"].
  // Pick leaf-level matches to avoid parent containers.
  const candidates = Array.from(container.querySelectorAll('*')).filter(el =>
    el.querySelector('h3') && el.querySelector('a[href^="http"]')
  );
  return candidates.filter(el =>
    !candidates.some(other => other !== el && el.contains(other))
  );
}

/**
 * Parse image metadata from Google's inline script tags.
 * Google Images embeds full-size image URLs in script data as JSON-like arrays:
 *   [1,[0,"docid",["gstatic_thumb",h,w],["full_url",h,w],...]]
 * Each result's data-docid maps to a docid in this data.
 *
 * Signature: parseImageMetadata : () → Map<string, string>
 * Purpose: Build a map from docid to full-size image URL by parsing script tags.
 *
 * @returns {Object<string, string>} Map of docid → full-size image URL
 */
export function parseImageMetadata(): Record<string, string> {
  const map = {};
  const scripts = document.querySelectorAll('script');
  // Match: [1,[0,"docid",["thumb",h,w],["full_url",h,w]
  const re = /\[1,\[0,"([^"]+)",\["https:[^"]+",\d+,\d+\],\["(https:[^"]+)",\d+,\d+\]/g;

  for (const s of scripts) {
    const t = s.textContent || '';
    if (t.length < 500) continue;
    let m;
    while ((m = re.exec(t)) !== null) {
      // Unescape Unicode sequences Google uses in inline scripts
      const url = m[2].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
      map[m[1]] = url;
    }
  }
  return map;
}

/**
 * Scrape image results from Google Images DOM.
 *
 * Signature: scrapeImageResults : () → Array<ContentItem>
 * Purpose: Extract image thumbnails, titles, and source URLs from Google Images
 *          DOM. Each result has: id (source URL), title, url (source URL),
 *          thumbnail (data-URI thumbnail for grid display),
 *          imageUrl (full-size image URL from script metadata for clipboard copy),
 *          meta (source domain).
 *
 * The full-size image URL is extracted from Google's inline script metadata,
 * keyed by each result's data-docid attribute. This is the same URL that
 * loads in the preview side panel when clicking a result.
 *
 * Selectors (Google Images with udm=2):
 * - Container: #rso or div[data-query] or #search (varies)
 * - Each image result: marked by data-lpage attribute (link to source page)
 * - Thumbnail: img element within the result (data-URI)
 * - Title: extracted from aria-label or nearby text
 * - Source URL: data-lpage or enclosing anchor href
 * - Full-size URL: from script metadata via data-docid
 *
 * Examples:
 *   // On Google Images page with results
 *   scrapeImageResults() => [
 *     { id: 'https://example.com/page', title: 'Example Image',
 *       url: 'https://example.com/page', thumbnail: 'data:image/...',
 *       imageUrl: 'https://cdn.example.com/full.jpg', meta: 'example.com' },
 *     ...
 *   ]
 *
 *   // On non-images page or no results
 *   scrapeImageResults() => []
 *
 * @returns {Array<Object>} Array of ContentItem objects
 */
export function scrapeImageResults(): ContentItem[] {
  const results = [];

  // Parse full-size image URLs from script metadata
  const imageMetadata = parseImageMetadata();

  // Each image result is marked by data-lpage attribute (source page URL)
  const resultElements = document.querySelectorAll('[data-lpage]');

  resultElements.forEach(element => {
    // Source URL: data-lpage attribute
    const sourceUrl = element.getAttribute('data-lpage');
    if (!sourceUrl) return;

    // Thumbnail: first img element within the result (typically data-URI)
    const img = element.querySelector('img');
    const thumbnail = img?.src || '';

    // Full-size image URL: look up by data-docid in script metadata
    const docid = element.getAttribute('data-docid') || '';
    const imageUrl = imageMetadata[docid] || '';

    // Title: try aria-label on container, then img alt, then text content
    const title = element.getAttribute('aria-label')
      || img?.getAttribute('alt')
      || element.textContent?.trim()
      || '';
    if (!title) return; // Skip results without title

    // Domain from source URL
    let domain = '';
    try {
      domain = new URL(sourceUrl).hostname;
    } catch (e) {
      domain = sourceUrl;
    }

    results.push({
      id: sourceUrl,
      title: title,
      url: sourceUrl,
      thumbnail: thumbnail,
      imageUrl: imageUrl,
      meta: domain,
    });
  });

  return results;
}
