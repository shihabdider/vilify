// YouTube Initial Data Parser
// Extracts ytInitialData and ytInitialPlayerResponse from page

/** Result from parseInitialData when data is found */
interface InitialDataSuccess {
  ok: true;
  data: any;
  pageType: string;
}

/** Result from parseInitialData when data is not found */
interface InitialDataFailure {
  ok: false;
  error: string;
}

type InitialDataResult = InitialDataSuccess | InitialDataFailure;

declare global {
  interface Window {
    ytInitialData?: any;
    ytInitialPlayerResponse?: any;
  }
}

// =============================================================================
// PAGE TYPE DETECTION
// =============================================================================

/**
 * Determine page type from ytInitialData structure
 * @param {Object} data - Parsed ytInitialData
 * @returns {PageType}
 * 
 * Examples:
 *   detectPageTypeFromData({ contents: { twoColumnWatchNextResults: {} } })
 *   // => 'watch'
 */
export function detectPageTypeFromData(data: any): string {
  if (!data?.contents) return 'other';
  
  const contents = data.contents;
  
  // Watch page
  if (contents.twoColumnWatchNextResults) return 'watch';
  
  // Search results
  if (contents.twoColumnSearchResultsRenderer) return 'search';
  
  // Browse pages (home, channel, subscriptions, history, library)
  if (contents.twoColumnBrowseResultsRenderer) {
    // Check for channel indicators
    const tabs = contents.twoColumnBrowseResultsRenderer.tabs;
    if (tabs?.some(t => 
      t.tabRenderer?.title === 'Home' || 
      t.tabRenderer?.title === 'Videos' ||
      t.tabRenderer?.endpoint?.browseEndpoint?.params
    )) {
      return 'channel';
    }
    
    // Check browse ID in metadata
    const browseId = data.metadata?.channelMetadataRenderer?.externalId;
    if (browseId) return 'channel';
    
    // Default browse = could be home, subscriptions, etc.
    // Check URL-based hints in responseContext
    const url = data.responseContext?.serviceTrackingParams
      ?.find(p => p.service === 'GFEEDBACK')
      ?.params?.find(p => p.key === 'browse_id')?.value;
    
    if (url === 'FEwhat_to_watch') return 'home';
    if (url === 'FEsubscriptions') return 'subscriptions';
    if (url === 'FEhistory') return 'history';
    if (url === 'FElibrary') return 'library';
    
    return 'home'; // Default for browse
  }
  
  // Single column browse (some mobile/special pages)
  if (contents.singleColumnBrowseResultsRenderer) {
    return 'other';
  }
  
  return 'other';
}

// =============================================================================
// INITIAL DATA PARSING
// =============================================================================

/**
 * Parse ytInitialData from current page
 * @returns {InitialDataResult}
 * 
 * Examples:
 *   parseInitialData()
 *   // => { ok: true, data: {...}, pageType: 'search' }
 *   // => { ok: false, error: 'ytInitialData not found' }
 */
export function parseInitialData(): InitialDataResult {
  // Method 1: Check if YouTube has already parsed it
  if (typeof window !== 'undefined' && window.ytInitialData) {
    const data = window.ytInitialData;
    return {
      ok: true,
      data,
      pageType: detectPageTypeFromData(data),
    };
  }
  
  // Method 2: Parse from script tags
  const scripts = document.querySelectorAll('script');
  
  for (const script of scripts) {
    const text = script.textContent || '';
    
    // Look for ytInitialData assignment
    // Can be: var ytInitialData = {...};
    // Or: window["ytInitialData"] = {...};
    const patterns = [
      /var\s+ytInitialData\s*=\s*(\{.+?\});/s,
      /window\["ytInitialData"\]\s*=\s*(\{.+?\});/s,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const data = JSON.parse(match[1]);
          return {
            ok: true,
            data,
            pageType: detectPageTypeFromData(data),
          };
        } catch (e) {
          // JSON parse failed, try next pattern
          continue;
        }
      }
    }
  }
  
  return {
    ok: false,
    error: 'ytInitialData not found in page',
  };
}

// =============================================================================
// PLAYER RESPONSE PARSING
// =============================================================================

/**
 * Parse ytInitialPlayerResponse from current page (watch page only)
 * @returns {Object|null} Player response data or null
 * 
 * Examples:
 *   parsePlayerResponse()
 *   // => { videoDetails: { videoId: 'abc', ... }, ... }
 *   // => null (if not on watch page)
 */
export function parsePlayerResponse(): any | null {
  // Method 1: Check if YouTube has already parsed it
  if (typeof window !== 'undefined' && window.ytInitialPlayerResponse) {
    return window.ytInitialPlayerResponse;
  }
  
  // Method 2: Parse from script tags
  const scripts = document.querySelectorAll('script');
  
  for (const script of scripts) {
    const text = script.textContent || '';
    
    const patterns = [
      /var\s+ytInitialPlayerResponse\s*=\s*(\{.+?\});/s,
      /window\["ytInitialPlayerResponse"\]\s*=\s*(\{.+?\});/s,
    ];
    
    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          return JSON.parse(match[1]);
        } catch (e) {
          continue;
        }
      }
    }
  }
  
  return null;
}
