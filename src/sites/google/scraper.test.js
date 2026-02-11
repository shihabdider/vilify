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

const { getGooglePageType, scrapeImageResults } = await import('./scraper.js');

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
  // imgs: optional array of { src, classes?, alt? } for multiple <img> elements
  //   When omitted, a single img is created from imgSrc/imgAlt (legacy).
  function mockImageResult({ lpage, imgSrc, ariaLabel, imgAlt, text, imgs }) {
    const imgElements = [];

    if (imgs) {
      for (const imgDef of imgs) {
        imgElements.push({
          src: imgDef.src || '',
          classList: { contains: (cls) => (imgDef.classes || []).includes(cls) },
          getAttribute: (name) => {
            if (name === 'alt') return imgDef.alt ?? null;
            if (name === 'src') return imgDef.src ?? null;
            return null;
          },
        });
      }
    } else if (imgSrc !== undefined) {
      imgElements.push({
        src: imgSrc,
        classList: { contains: () => false },
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

  // Helper: configure document mock with image result elements
  function setupDOM(mockResults) {
    const elements = mockResults.map(r => mockImageResult(r));
    document.querySelectorAll.mockImplementation((sel) => {
      if (sel.includes('data-lpage')) return elements;
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

  // --- imageUrl extraction ---

  it('extracts full-size HTTP image URL when data-URI thumbnail and HTTP image are both present', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      ariaLabel: 'Sunset photo',
      imgs: [
        { src: 'data:image/jpeg;base64,abc123', classes: ['YQ4gaf'] },       // thumbnail
        { src: 'https://cdn.example.com/full-size.jpg', classes: [] },        // full-size
        { src: 'data:image/png;base64,favicon', classes: ['YQ4gaf', 'zr758c'] }, // favicon
      ],
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].thumbnail).toBe('data:image/jpeg;base64,abc123');
    expect(results[0].imageUrl).toBe('https://cdn.example.com/full-size.jpg');
  });

  it('imageUrl is empty when only data-URI thumbnail exists (no HTTP image)', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      ariaLabel: 'Only thumbnail',
      imgs: [
        { src: 'data:image/jpeg;base64,abc123', classes: ['YQ4gaf'] },
      ],
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBe('');
  });

  it('imageUrl ignores favicon with YQ4gaf class even if src is HTTP', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      ariaLabel: 'With favicon',
      imgs: [
        { src: 'data:image/jpeg;base64,thumb', classes: ['YQ4gaf'] },
        { src: 'https://example.com/favicon.ico', classes: ['YQ4gaf'] },     // has YQ4gaf → skip
        { src: 'https://cdn.example.com/real-image.jpg', classes: [] },       // full-size
      ],
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBe('https://cdn.example.com/real-image.jpg');
  });

  it('imageUrl is empty when no images exist at all', () => {
    setupDOM([{
      lpage: 'https://example.com/page',
      ariaLabel: 'No images',
      // no imgs, no imgSrc → querySelectorAll('img') returns []
    }]);

    const results = scrapeImageResults();
    expect(results).toHaveLength(1);
    expect(results[0].imageUrl).toBe('');
  });
});
