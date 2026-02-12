// Tests for buildSearchUrl - pure URL construction for search
// Following HtDP: derive tests from input types (config × query)

import { describe, it, expect } from 'vitest';
import { buildSearchUrl } from './index';

describe('buildSearchUrl', () => {
  // =========================================================================
  // Config WITHOUT searchUrl (fallback to YouTube-style URL)
  // =========================================================================
  describe('without config.searchUrl (fallback)', () => {
    const config = {};

    it('returns YouTube-style URL for a normal query', () => {
      expect(buildSearchUrl(config, 'hello world')).toBe(
        '/results?search_query=hello%20world'
      );
    });

    it('encodes special characters in the query', () => {
      expect(buildSearchUrl(config, 'a&b=c')).toBe(
        '/results?search_query=a%26b%3Dc'
      );
    });

    it('handles single-word query', () => {
      expect(buildSearchUrl(config, 'test')).toBe(
        '/results?search_query=test'
      );
    });

    it('handles query with unicode characters', () => {
      expect(buildSearchUrl(config, 'café')).toBe(
        '/results?search_query=caf%C3%A9'
      );
    });
  });

  // =========================================================================
  // Config WITH searchUrl (site-specific URL builder)
  // =========================================================================
  describe('with config.searchUrl', () => {
    it('uses config.searchUrl to build the URL (Google-style)', () => {
      const config = {
        searchUrl: (query) => '/search?q=' + encodeURIComponent(query),
      };
      expect(buildSearchUrl(config, 'hello world')).toBe(
        '/search?q=hello%20world'
      );
    });

    it('passes the query directly to config.searchUrl', () => {
      const config = {
        searchUrl: (query) => '/find/' + encodeURIComponent(query),
      };
      expect(buildSearchUrl(config, 'my query')).toBe(
        '/find/my%20query'
      );
    });

    it('uses config.searchUrl even for simple queries', () => {
      const config = {
        searchUrl: (query) => '/s?q=' + query,
      };
      expect(buildSearchUrl(config, 'test')).toBe('/s?q=test');
    });
  });

  // =========================================================================
  // Edge: config.searchUrl explicitly undefined or null
  // =========================================================================
  describe('config.searchUrl falsy', () => {
    it('falls back when searchUrl is undefined', () => {
      const config = { searchUrl: undefined };
      expect(buildSearchUrl(config, 'query')).toBe(
        '/results?search_query=query'
      );
    });

    it('falls back when searchUrl is null', () => {
      const config = { searchUrl: null };
      expect(buildSearchUrl(config, 'query')).toBe(
        '/results?search_query=query'
      );
    });
  });
});
