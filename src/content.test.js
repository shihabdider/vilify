// Content script getSiteConfig() tests
// Verifies URL-based site detection including Google /search restriction

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock DOM APIs needed at import time by transitive dependencies
vi.stubGlobal('document', {
  readyState: 'complete',
  querySelector: vi.fn(() => null),
  querySelectorAll: vi.fn(() => []),
  createElement: vi.fn(() => ({
    style: {},
    setAttribute: vi.fn(),
    appendChild: vi.fn(),
    classList: { add: vi.fn(), contains: vi.fn(() => false) },
  })),
  head: { appendChild: vi.fn() },
  getElementById: vi.fn(() => null),
  addEventListener: vi.fn(),
});

vi.stubGlobal('window', {
  location: { hostname: 'www.google.com', pathname: '/search', href: 'https://www.google.com/search?q=test' },
});

// Default location stub — tests override per case
vi.stubGlobal('location', {
  hostname: 'www.google.com',
  pathname: '/search',
  href: 'https://www.google.com/search?q=test',
});

// Mock initSite so content.js doesn't actually run site init
vi.mock('./core/index.js', () => ({ initSite: vi.fn() }));

const { getSiteConfig } = await import('./content.js');
const { googleConfig } = await import('./sites/google/index.js');
const { youtubeConfig } = await import('./sites/youtube/index.js');

describe('getSiteConfig', () => {
  it('returns googleConfig for www.google.com/search', () => {
    location.hostname = 'www.google.com';
    location.pathname = '/search';
    expect(getSiteConfig()).toBe(googleConfig);
  });

  it('returns googleConfig for google.com/search', () => {
    location.hostname = 'google.com';
    location.pathname = '/search';
    expect(getSiteConfig()).toBe(googleConfig);
  });

  it('returns googleConfig for /search with query params', () => {
    location.hostname = 'www.google.com';
    location.pathname = '/search';
    expect(getSiteConfig()).toBe(googleConfig);
  });

  it('returns null for www.google.com/maps', () => {
    location.hostname = 'www.google.com';
    location.pathname = '/maps';
    expect(getSiteConfig()).toBeNull();
  });

  it('returns null for www.google.com/ (homepage)', () => {
    location.hostname = 'www.google.com';
    location.pathname = '/';
    expect(getSiteConfig()).toBeNull();
  });

  it('returns null for www.google.com/docs', () => {
    location.hostname = 'www.google.com';
    location.pathname = '/docs';
    expect(getSiteConfig()).toBeNull();
  });

  it('returns youtubeConfig for www.youtube.com', () => {
    location.hostname = 'www.youtube.com';
    location.pathname = '/';
    expect(getSiteConfig()).toBe(youtubeConfig);
  });

  it('returns youtubeConfig for youtube.com', () => {
    location.hostname = 'youtube.com';
    location.pathname = '/watch';
    expect(getSiteConfig()).toBe(youtubeConfig);
  });

  it('returns null for unsupported sites', () => {
    location.hostname = 'www.example.com';
    location.pathname = '/';
    expect(getSiteConfig()).toBeNull();
  });
});
