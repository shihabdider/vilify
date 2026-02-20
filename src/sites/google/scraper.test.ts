// Google scraper tests — getGooglePageType
// Mocks location.pathname and location.search to test all 3 branches.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Stub minimal DOM globals so the module can load
vi.stubGlobal('document', {
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
});

// Mutable location object — tests override pathname/search before each call
const fakeLocation = { pathname: '/', search: '' };
vi.stubGlobal('location', fakeLocation);

const { getGooglePageType, scrapeSearchResults, scrapeImageResults, parseImageMetadata } = await import('./scraper');

describe('getGooglePageType', () => {
  beforeEach(() => {
    fakeLocation.pathname = '/';
    fakeLocation.search = '';
  });

  // --- 'search' branch ---
  it('returns "search" for /search without udm param', () => {
    fakeLocation.pathname = '/search';
    fakeLocation.search = '?q=test';
    expect(getGooglePageType()).toBe('search');
  });

  it('returns "search" for /search with udm != 2', () => {
    fakeLocation.pathname = '/search';
    fakeLocation.search = '?q=test&udm=14';
    expect(getGooglePageType()).toBe('search');
  });

  it('returns "search" for /search with empty query string', () => {
    fakeLocation.pathname = '/search';
    fakeLocation.search = '';
    expect(getGooglePageType()).toBe('search');
  });

  // --- 'images' branch ---
  it('returns "images" for /search with udm=2', () => {
    fakeLocation.pathname = '/search';
    fakeLocation.search = '?q=cats&udm=2';
    expect(getGooglePageType()).toBe('images');
  });

  it('returns "images" when udm=2 is the only param', () => {
    fakeLocation.pathname = '/search';
    fakeLocation.search = '?udm=2';
    expect(getGooglePageType()).toBe('images');
  });

  it('returns "images" when udm=2 appears among other params', () => {
    fakeLocation.pathname = '/search';
    fakeLocation.search = '?q=cats&udm=2&hl=en';
    expect(getGooglePageType()).toBe('images');
  });

  // --- 'other' branch ---
  it('returns "other" for Google homepage /', () => {
    fakeLocation.pathname = '/';
    fakeLocation.search = '';
    expect(getGooglePageType()).toBe('other');
  });

  it('returns "other" for /maps', () => {
    fakeLocation.pathname = '/maps';
    fakeLocation.search = '?q=pizza';
    expect(getGooglePageType()).toBe('other');
  });

  it('returns "other" for /imghp (legacy image search)', () => {
    fakeLocation.pathname = '/imghp';
    fakeLocation.search = '';
    expect(getGooglePageType()).toBe('other');
  });
});

// =============================================================================
// scrapeSearchResults
// =============================================================================

describe('scrapeSearchResults', () => {
  /**
   * Helper: create a mock search result element.
   * Each result is a div that may have data-hveid/lang attributes,
   * and contains child elements (h3, a, cite, description divs).
   */
  function mockSearchResult({
    dataHveid,
    lang,
    title,
    href,
    citeText,
    descriptionText,
    isPeopleAlsoAsk = false,
  }: {
    dataHveid?: string;
    lang?: string;
    title?: string;
    href?: string;
    citeText?: string;
    descriptionText?: string;
    isPeopleAlsoAsk?: boolean;
  }) {
    const h3El = title ? { textContent: title, closest: () => null } : null;
    const aEl = href ? { href, getAttribute: (n) => n === 'href' ? href : null } : null;
    const citeEl = citeText ? { textContent: citeText } : null;

    // Child elements for querySelectorAll
    const children: any[] = [];
    if (h3El) children.push(h3El);

    return {
      getAttribute: (name) => {
        if (name === 'data-hveid') return dataHveid ?? null;
        if (name === 'lang') return lang ?? null;
        if (name === 'data-sncf') return null;
        return null;
      },
      querySelector: (sel) => {
        if (sel === 'h3') return h3El;
        if (sel === 'a' || sel === 'a[href]') return aEl;
        if (sel === 'a[href^="http"]') return aEl && aEl.href?.startsWith('http') ? aEl : null;
        if (sel === 'cite') return citeEl;
        if (sel === 'div[data-hveid]') return null; // leaf element — no nested hveid
        if (sel === 'div[style*="-webkit-line-clamp"]') {
          if (descriptionText) return { textContent: descriptionText };
          return null;
        }
        if (sel === '[data-sncf]') return null;
        if (sel === 'em') return null;
        if (sel === '[role="heading"]') return isPeopleAlsoAsk ? { textContent: 'People also ask' } : null;
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === 'div') {
          const divs: any[] = [];
          if (descriptionText) divs.push({ textContent: descriptionText });
          return divs;
        }
        return [];
      },
      textContent: [title, citeText, descriptionText].filter(Boolean).join(' '),
      closest: (sel) => null,
      matches: (sel) => false,
      hasAttribute: (name) => {
        if (name === 'data-hveid') return !!dataHveid;
        if (name === 'lang') return !!lang;
        return false;
      },
      contains: (el) => false,
    };
  }

  /**
   * Setup DOM with an #rso container containing mock result elements.
   * Supports different selector scenarios for testing fallback strategies.
   */
  function setupSearchDOM(mockResults) {
    const elements = mockResults.map(r => mockSearchResult(r));

    // Build the #rso container mock
    const rsoContainer = {
      querySelectorAll: (sel) => {
        if (sel === 'div[data-hveid][lang]') {
          // Primary strategy: only return elements with BOTH attributes
          return elements.filter(el => el.getAttribute('data-hveid') && el.getAttribute('lang'));
        }
        if (sel === 'div[data-hveid]') {
          // Fallback 1: elements with data-hveid only
          return elements.filter(el => el.getAttribute('data-hveid'));
        }
        // For broader selectors, return all elements
        if (sel === '*') {
          return elements;
        }
        return [];
      },
      querySelector: (sel) => null,
      children: elements,
    };

    document.querySelector.mockImplementation((sel) => {
      if (sel === '#rso') return rsoContainer;
      return null;
    });
  }

  beforeEach(() => {
    document.querySelector.mockReturnValue(null);
    document.querySelectorAll.mockReturnValue([]);
  });

  // --- No container ---
  it('returns empty array when no container exists', () => {
    document.querySelector.mockReturnValue(null);
    expect(scrapeSearchResults()).toEqual([]);
  });

  // --- Fallback container: #search ---
  it('uses #search as fallback container when #rso is missing', () => {
    const element = mockSearchResult({
      dataHveid: 'abc',
      lang: 'en',
      title: 'Fallback Result',
      href: 'https://fallback.com',
      citeText: 'fallback.com',
      descriptionText: 'Found via #search container',
    });

    const searchContainer = {
      querySelectorAll: (sel) => {
        if (sel === 'div[data-hveid][lang]') return [element];
        if (sel === 'div[data-hveid]') return [element];
        if (sel === '*') return [element];
        return [];
      },
      querySelector: () => null,
      children: [element],
    };

    document.querySelector.mockImplementation((sel) => {
      if (sel === '#rso') return null;
      if (sel === '#search') return searchContainer;
      return null;
    });

    const results = scrapeSearchResults();
    expect(results.length).toBe(1);
    expect(results[0].title).toBe('Fallback Result');
  });

  // --- Modern Google DOM: no h3, title from link text ---
  it('scrapes results from modern Google DOM without h3 elements', () => {
    // Modern Google (Chrome omnibar) uses div[data-hveid] without h3 or lang
    const aEl = { href: 'https://example.com/page', textContent: 'Example Page Title', getAttribute: (n) => n === 'href' ? 'https://example.com/page' : null };
    const citeEl = { textContent: 'example.com' };

    const element = {
      getAttribute: (name) => name === 'data-hveid' ? 'abc123' : null,
      querySelector: (sel) => {
        if (sel === 'h3') return null; // No h3!
        if (sel === 'a' || sel === 'a[href]') return aEl;
        if (sel === 'a[href^="http"]') return aEl;
        if (sel === 'cite') return citeEl;
        if (sel === 'div[data-hveid]') return null; // leaf — no nested hveid
        if (sel === 'div[style*="-webkit-line-clamp"]') return { textContent: 'A description.' };
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === 'div') return [{ textContent: 'A description.' }];
        return [];
      },
      textContent: 'Example Page Title example.com A description.',
      closest: () => null,
      matches: () => false,
      hasAttribute: (name) => name === 'data-hveid',
      contains: () => false,
    };

    const rsoContainer = {
      querySelectorAll: (sel) => {
        if (sel === 'div[data-hveid][lang]') return []; // No lang attributes
        if (sel === 'div[data-hveid]') return [element];
        if (sel === '*') return [element];
        return [];
      },
      querySelector: () => null,
      children: [element],
    };

    document.querySelector.mockImplementation((sel) => {
      if (sel === '#rso') return rsoContainer;
      return null;
    });

    const results = scrapeSearchResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Example Page Title'); // Title from link text
    expect(results[0].url).toBe('https://example.com/page');
    expect(results[0].meta).toBe('example.com');
  });

  // --- Primary selector: div[data-hveid][lang] ---
  it('scrapes results using primary selector (data-hveid + lang)', () => {
    setupSearchDOM([
      {
        dataHveid: 'ABcDEf',
        lang: 'en',
        title: 'Example Site',
        href: 'https://example.com',
        citeText: 'example.com',
        descriptionText: 'This is an example description for the site.',
      },
    ]);

    const results = scrapeSearchResults();
    expect(results).toHaveLength(1);
    expect(results[0]).toEqual({
      id: 'https://example.com',
      title: 'Example Site',
      url: 'https://example.com',
      meta: 'example.com',
      description: 'This is an example description for the site.',
    });
  });

  it('scrapes multiple results with primary selector', () => {
    setupSearchDOM([
      { dataHveid: 'a1', lang: 'en', title: 'First Result', href: 'https://first.com', citeText: 'first.com' },
      { dataHveid: 'b2', lang: 'en', title: 'Second Result', href: 'https://second.org', citeText: 'second.org' },
      { dataHveid: 'c3', lang: 'en', title: 'Third Result', href: 'https://third.net', citeText: 'third.net' },
    ]);

    const results = scrapeSearchResults();
    expect(results).toHaveLength(3);
    expect(results[0].title).toBe('First Result');
    expect(results[1].title).toBe('Second Result');
    expect(results[2].title).toBe('Third Result');
  });

  // --- Fallback 1: div[data-hveid] without lang ---
  it('falls back to data-hveid selector when lang attribute is missing', () => {
    setupSearchDOM([
      {
        dataHveid: 'ABcDEf',
        // no lang attribute
        title: 'Result Without Lang',
        href: 'https://example.com/page',
        citeText: 'example.com',
        descriptionText: 'A description for the page without lang attr.',
      },
    ]);

    const results = scrapeSearchResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Result Without Lang');
    expect(results[0].url).toBe('https://example.com/page');
  });

  // --- Fallback 2: broad selector (h3 + a[href]) within #rso ---
  it('falls back to broad selector when no data-hveid elements exist', () => {
    // Elements with no data-hveid at all — need broad fallback
    const h3El = { textContent: 'Broad Result', closest: () => null };
    const aEl = { href: 'https://broad.com/page', getAttribute: (n) => n === 'href' ? 'https://broad.com/page' : null };
    const citeEl = { textContent: 'broad.com' };

    const element = {
      getAttribute: () => null,
      querySelector: (sel) => {
        if (sel === 'h3') return h3El;
        if (sel === 'a' || sel === 'a[href]') return aEl;
        if (sel === 'a[href^="http"]') return aEl;
        if (sel === 'cite') return citeEl;
        if (sel === 'div[style*="-webkit-line-clamp"]') return { textContent: 'A broad description text.' };
        if (sel === '[data-sncf]') return null;
        if (sel === 'em') return null;
        if (sel === '[role="heading"]') return null;
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === 'h3') return [h3El];
        if (sel === 'a[href^="http"]') return [aEl];
        if (sel === 'div') return [{ textContent: 'A broad description text.' }];
        return [];
      },
      textContent: 'Broad Result broad.com A broad description text.',
      closest: () => null,
      matches: () => false,
      hasAttribute: () => false,
      contains: () => false,
      children: [],
    };

    const rsoContainer = {
      querySelectorAll: (sel) => {
        if (sel === 'div[data-hveid][lang]') return [];
        if (sel === 'div[data-hveid]') return [];
        return [element];
      },
      querySelector: () => null,
      children: [element],
    };

    document.querySelector.mockImplementation((sel) => {
      if (sel === '#rso') return rsoContainer;
      return null;
    });

    const results = scrapeSearchResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Broad Result');
    expect(results[0].url).toBe('https://broad.com/page');
  });

  // --- Skips results without h3 (title) ---
  it('skips results without a title (no h3)', () => {
    setupSearchDOM([
      { dataHveid: 'a1', lang: 'en', title: undefined, href: 'https://example.com' },
      { dataHveid: 'b2', lang: 'en', title: 'Valid Result', href: 'https://valid.com' },
    ]);

    const results = scrapeSearchResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Valid Result');
  });

  // --- Skips results without a link ---
  it('skips results without a URL (no anchor)', () => {
    setupSearchDOM([
      { dataHveid: 'a1', lang: 'en', title: 'No Link Result', href: undefined },
      { dataHveid: 'b2', lang: 'en', title: 'Valid', href: 'https://valid.com' },
    ]);

    const results = scrapeSearchResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Valid');
  });

  // --- Skips non-http links ---
  it('skips results with non-http links', () => {
    setupSearchDOM([
      { dataHveid: 'a1', lang: 'en', title: 'JS Link', href: 'javascript:void(0)' },
      { dataHveid: 'b2', lang: 'en', title: 'Good Link', href: 'https://good.com' },
    ]);

    const results = scrapeSearchResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Good Link');
  });

  // --- Display URL fallback ---
  it('uses hostname as meta when no cite element exists', () => {
    setupSearchDOM([
      {
        dataHveid: 'a1',
        lang: 'en',
        title: 'No Cite',
        href: 'https://www.example.com/deep/path',
        // no citeText
      },
    ]);

    const results = scrapeSearchResults();
    expect(results).toHaveLength(1);
    expect(results[0].meta).toBe('www.example.com');
  });

  // --- Empty container ---
  it('returns empty array when #rso container has no matching elements', () => {
    const rsoContainer = {
      querySelectorAll: () => [],
      querySelector: () => null,
      children: [],
    };
    document.querySelector.mockImplementation((sel) => {
      if (sel === '#rso') return rsoContainer;
      return null;
    });

    expect(scrapeSearchResults()).toEqual([]);
  });

  // --- Mixed scenario: primary + fallback ---
  it('uses primary results when available, ignoring fallback', () => {
    // Two results: one with data-hveid+lang, one with only data-hveid
    // Primary should find the first one; no need for fallback
    setupSearchDOM([
      { dataHveid: 'a1', lang: 'en', title: 'Primary', href: 'https://primary.com' },
      { dataHveid: 'b2', title: 'Fallback Only', href: 'https://fallback.com' },
    ]);

    const results = scrapeSearchResults();
    // Primary selector matches one, so it should be used (not fallback)
    expect(results.some(r => r.title === 'Primary')).toBe(true);
  });
});

// =============================================================================
// scrapeImageResults
// =============================================================================

describe('scrapeImageResults', () => {
  // Helper: create a mock element representing one Google Images result (div[data-lpage])
  function mockImageResult({ lpage, imgSrc, ariaLabel, imgAlt, text, docid }) {
    const imgElements = [];

    if (imgSrc !== undefined) {
      imgElements.push({
        src: imgSrc,
        getAttribute: (name) => {
          if (name === 'alt') return imgAlt ?? null;
          if (name === 'src') return imgSrc ?? null;
          return null;
        },
      });
    }

    return {
      getAttribute: (name) => {
        if (name === 'data-lpage') return lpage ?? null;
        if (name === 'aria-label') return ariaLabel ?? null;
        if (name === 'data-docid') return docid ?? null;
        return null;
      },
      querySelector: (sel) => {
        if (sel === 'img') return imgElements[0] || null;
        return null;
      },
      querySelectorAll: (sel) => {
        if (sel === 'img') return imgElements;
        return [];
      },
      textContent: text ?? '',
    };
  }

  // Helper: create mock script elements containing image metadata
  function mockScriptData(entries) {
    // entries: array of { docid, fullUrl }
    // Build a script body matching Google's format:
    //   [1,[0,"docid",["https://gstatic...",100,200],["full_url",500,800]
    // Pad to >500 chars (parseImageMetadata skips short scripts as optimization)
    let body = 'var x = {';
    for (const { docid, fullUrl } of entries) {
      body += `"${docid}":[1,[0,"${docid}",["https://encrypted-tbn0.gstatic.com/thumb",100,200],["${fullUrl}",500,800],null]],`;
    }
    body += '};';
    // Pad with a comment to exceed the 500-char threshold
    while (body.length < 600) body += '/* padding */';
    return [{ textContent: body }];
  }

  // Helper: configure document mock with image result elements and optional script metadata
  function setupDOM(mockResults, scriptEntries = []) {
    const elements = mockResults.map(r => mockImageResult(r));
    const scripts = scriptEntries.length > 0 ? mockScriptData(scriptEntries) : [];
    document.querySelectorAll.mockImplementation((sel) => {
      if (sel.includes('data-lpage')) return elements;
      if (sel === 'script') return scripts;
      return [];
    });
  }

  beforeEach(() => {
    document.querySelector.mockReturnValue(null);
    document.querySelectorAll.mockReturnValue([]);
  });

  it('returns empty array when no image results exist', () => {
    expect(scrapeImageResults()).toEqual([]);
  });

  it('scrapes single result with aria-label title', () => {
    setupDOM([{
      lpage: 'https://example.com/photo',
      imgSrc: 'data:image/jpeg;base64,abc123',
      ariaLabel: 'Beautiful sunset',
    }]);

    expect(scrapeImageResults()).toEqual([{
      id: 'https://example.com/photo',
      title: 'Beautiful sunset',
      url: 'https://example.com/photo',
      thumbnail: 'data:image/jpeg;base64,abc123',
      imageUrl: '',
      meta: 'example.com',
    }]);
  });

  it('scrapes multiple results', () => {
    setupDOM([
      { lpage: 'https://a.com/1', imgSrc: 'https://img/1.jpg', ariaLabel: 'First' },
      { lpage: 'https://b.org/2', imgSrc: 'https://img/2.jpg', ariaLabel: 'Second' },
      { lpage: 'https://c.net/3', imgSrc: 'https://img/3.jpg', ariaLabel: 'Third' },
    ]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(3);
    expect(results[0].title).toBe('First');
    expect(results[0].meta).toBe('a.com');
    expect(results[1].title).toBe('Second');
    expect(results[1].meta).toBe('b.org');
    expect(results[2].title).toBe('Third');
    expect(results[2].meta).toBe('c.net');
  });

  it('uses img alt text as title fallback', () => {
    setupDOM([{
      lpage: 'https://example.com/photo',
      imgSrc: 'https://img/photo.jpg',
      imgAlt: 'Alt text title',
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Alt text title');
  });

  it('uses text content as title fallback when no aria-label or alt', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      imgSrc: 'https://img/photo.jpg',
      text: 'Fallback title from text',
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Fallback title from text');
  });

  it('skips results with no data-lpage', () => {
    setupDOM([
      { lpage: null, imgSrc: 'https://img/1.jpg', ariaLabel: 'No URL' },
      { lpage: 'https://good.com/page', imgSrc: 'https://img/2.jpg', ariaLabel: 'Good' },
    ]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe('Good');
  });

  it('skips results with no title available', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      imgSrc: 'https://img/photo.jpg',
      text: '',
    }]);

    expect(scrapeImageResults()).toEqual([]);
  });

  it('extracts domain from source URL for meta field', () => {
    setupDOM([{
      lpage: 'https://www.reddit.com/r/pics/some-post',
      imgSrc: 'https://img/photo.jpg',
      ariaLabel: 'Reddit post',
    }]);

    const results = scrapeImageResults();
    expect(results[0].meta).toBe('www.reddit.com');
  });

  it('includes result with empty thumbnail when img has no src', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      imgSrc: '',
      ariaLabel: 'No thumbnail yet',
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].thumbnail).toBe('');
  });

  it('handles result with no img element at all', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      ariaLabel: 'No image element',
      // imgSrc undefined → querySelector('img') returns null
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].thumbnail).toBe('');
    expect(results[0].title).toBe('No image element');
  });

  it('handles invalid URL in data-lpage gracefully', () => {
    setupDOM([{
      lpage: 'not-a-valid-url',
      imgSrc: 'https://img/photo.jpg',
      ariaLabel: 'Invalid URL result',
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe('not-a-valid-url');
    expect(results[0].meta).toBe('not-a-valid-url');
  });

  // --- imageUrl extraction from script metadata ---

  it('extracts full-size URL from script metadata via data-docid', () => {
    setupDOM(
      [{
        lpage: 'https://example.com/page',
        imgSrc: 'data:image/jpeg;base64,abc123',
        ariaLabel: 'Sunset photo',
        docid: 'abc123docid',
      }],
      [{ docid: 'abc123docid', fullUrl: 'https://cdn.example.com/full-4000x3000.jpg' }]
    );

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].thumbnail).toBe('data:image/jpeg;base64,abc123');
    expect(results[0].imageUrl).toBe('https://cdn.example.com/full-4000x3000.jpg');
  });

  it('imageUrl is empty when data-docid has no matching script entry', () => {
    setupDOM(
      [{
        lpage: 'https://example.com/page',
        imgSrc: 'data:image/jpeg;base64,abc123',
        ariaLabel: 'No metadata',
        docid: 'unknown_docid',
      }],
      [{ docid: 'other_docid', fullUrl: 'https://cdn.example.com/other.jpg' }]
    );

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBe('');
  });

  it('imageUrl is empty when no script metadata exists', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      imgSrc: 'data:image/jpeg;base64,abc123',
      ariaLabel: 'No scripts',
      docid: 'some_docid',
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBe('');
  });

  it('imageUrl is empty when element has no data-docid', () => {
    setupDOM(
      [{
        lpage: 'https://example.com/page',
        imgSrc: 'data:image/jpeg;base64,abc123',
        ariaLabel: 'No docid',
        // no docid
      }],
      [{ docid: 'some_docid', fullUrl: 'https://cdn.example.com/full.jpg' }]
    );

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBe('');
  });

  it('maps multiple results to their correct full-size URLs', () => {
    setupDOM(
      [
        { lpage: 'https://a.com/1', imgSrc: 'data:a', ariaLabel: 'First', docid: 'doc1' },
        { lpage: 'https://b.com/2', imgSrc: 'data:b', ariaLabel: 'Second', docid: 'doc2' },
        { lpage: 'https://c.com/3', imgSrc: 'data:c', ariaLabel: 'Third', docid: 'doc3' },
      ],
      [
        { docid: 'doc1', fullUrl: 'https://cdn.a.com/full1.jpg' },
        { docid: 'doc2', fullUrl: 'https://cdn.b.com/full2.jpg' },
        { docid: 'doc3', fullUrl: 'https://cdn.c.com/full3.jpg' },
      ]
    );

    const results = scrapeImageResults();
    expect(results).toHaveLength(3);
    expect(results[0].imageUrl).toBe('https://cdn.a.com/full1.jpg');
    expect(results[1].imageUrl).toBe('https://cdn.b.com/full2.jpg');
    expect(results[2].imageUrl).toBe('https://cdn.c.com/full3.jpg');
  });
});

// =============================================================================
// parseImageMetadata
// =============================================================================

describe('parseImageMetadata', () => {
  beforeEach(() => {
    document.querySelectorAll.mockReturnValue([]);
  });

  it('returns empty map when no scripts exist', () => {
    expect(parseImageMetadata()).toEqual({});
  });

  // Helper to pad script content to exceed the 500-char threshold
  function padScript(content) {
    while (content.length < 600) content += '/* padding */';
    return content;
  }

  it('parses docid to full-size URL from script data', () => {
    document.querySelectorAll.mockImplementation((sel) => {
      if (sel === 'script') return [{
        textContent: padScript('var d = {"id1":[1,[0,"myDocId",["https://encrypted-tbn0.gstatic.com/thumb",168,300],["https://cdn.example.com/full.jpg",3000,4000],null]]};')
      }];
      return [];
    });

    const map = parseImageMetadata();
    expect(map['myDocId']).toBe('https://cdn.example.com/full.jpg');
  });

  it('unescapes Unicode sequences in URLs', () => {
    document.querySelectorAll.mockImplementation((sel) => {
      if (sel === 'script') return [{
        textContent: padScript('var d = {"x":[1,[0,"doc1",["https://encrypted-tbn0.gstatic.com/t",100,200],["https://example.com/img.jpg?w\\u003d800\\u0026h\\u003d600",600,800],null]]};')
      }];
      return [];
    });

    const map = parseImageMetadata();
    expect(map['doc1']).toBe('https://example.com/img.jpg?w=800&h=600');
  });

  it('parses multiple entries from same script', () => {
    document.querySelectorAll.mockImplementation((sel) => {
      if (sel === 'script') return [{
        textContent: padScript('var d = {"a":[1,[0,"d1",["https://encrypted-tbn0.gstatic.com/t",1,2],["https://a.com/1.jpg",100,200],null]],"b":[1,[0,"d2",["https://encrypted-tbn0.gstatic.com/t",1,2],["https://b.com/2.jpg",300,400],null]]};')
      }];
      return [];
    });

    const map = parseImageMetadata();
    expect(map['d1']).toBe('https://a.com/1.jpg');
    expect(map['d2']).toBe('https://b.com/2.jpg');
  });

  it('skips short script tags', () => {
    document.querySelectorAll.mockImplementation((sel) => {
      if (sel === 'script') return [{ textContent: 'short' }];
      return [];
    });

    expect(parseImageMetadata()).toEqual({});
  });
});
