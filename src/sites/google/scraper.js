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
export function getGooglePageType() {
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
function extractDescription(element, titleEl, citeEl) {
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
 * Selectors:
 * - Container: #rso (stable ID)
 * - Each result: div[data-hveid][lang] (data attributes mark results)
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
export function scrapeSearchResults() {
  // Template: List comprehension over DOM elements
  const results = [];
  
  // Container: #rso is the main results container
  const container = document.querySelector('#rso');
  if (!container) return results;
  
  // Each result: marked by data-hveid and lang attributes
  const resultElements = container.querySelectorAll('div[data-hveid][lang]');
  
  resultElements.forEach(element => {
    // Title: semantic h3
    const titleEl = element.querySelector('h3');
    const title = titleEl?.textContent?.trim();
    if (!title) return; // Skip results without title
    
    // URL: first anchor link
    const linkEl = element.querySelector('a');
    const url = linkEl?.href;
    if (!url) return; // Skip results without URL
    
    // Skip non-http links (javascript:, etc.)
    if (!url.startsWith('http')) return;
    
    // Display URL: cite element shows clean URL
    const citeEl = element.querySelector('cite');
    const displayUrl = citeEl?.textContent?.trim() || new URL(url).hostname;
    
    // Description: try multiple strategies
    const description = extractDescription(element, titleEl, citeEl);
    
    results.push({
      id: url,           // URL as unique identifier
      title: title,
      url: url,
      meta: displayUrl,  // Display URL in meta field
      description: description
    });
  });
  
  return results;
}

/**
 * Scrape image results from Google Images DOM.
 *
 * Signature: scrapeImageResults : () → Array<ContentItem>
 * Purpose: Extract image thumbnails, titles, and source URLs from Google Images
 *          DOM. Each result has: id (source URL), title, url (source URL),
 *          thumbnail (data-URI thumbnail for grid display),
 *          imageUrl (full-size HTTP image URL for clipboard copy),
 *          meta (source domain).
 *
 * Selectors (Google Images with udm=2):
 * - Container: #rso or div[data-query] or #search (varies)
 * - Each image result: marked by data-lpage attribute (link to source page)
 * - Thumbnail: img element within the result
 * - Title: extracted from aria-label or nearby text
 * - Source URL: data-lpage or enclosing anchor href
 *
 * Examples:
 *   // On Google Images page with results
 *   scrapeImageResults() => [
 *     { id: 'https://example.com/page', title: 'Example Image',
 *       url: 'https://example.com/page', thumbnail: 'data:image/...', meta: 'example.com' },
 *     ...
 *   ]
 *
 *   // On non-images page or no results
 *   scrapeImageResults() => []
 *
 * @returns {Array<Object>} Array of ContentItem objects
 */
export function scrapeImageResults() {
  const results = [];

  // Each image result is marked by data-lpage attribute (source page URL)
  const resultElements = document.querySelectorAll('[data-lpage]');

  resultElements.forEach(element => {
    // Source URL: data-lpage attribute
    const sourceUrl = element.getAttribute('data-lpage');
    if (!sourceUrl) return;

    // Thumbnail: first img element within the result (typically data-URI)
    const img = element.querySelector('img');
    const thumbnail = img?.src || '';

    // Full-size image: first img with HTTP src (not data URI, not favicon)
    const fullImg = Array.from(element.querySelectorAll('img')).find(
      i => i.src && i.src.startsWith('http') && !i.classList.contains('YQ4gaf')
    );
    const imageUrl = fullImg?.src || '';

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
