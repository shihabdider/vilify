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

const { getGooglePageType, scrapeImageResults, parseImageMetadata } = await import('./scraper');

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
