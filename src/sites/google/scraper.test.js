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

const { getGooglePageType } = await import('./scraper.js');

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
