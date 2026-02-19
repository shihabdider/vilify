// @vitest-environment jsdom
// Tests for sanitizeDescriptionHtml (via getDescription) - view count filtering
// Tests the defensive view count stripping in description sanitization.

import { describe, it, expect, beforeEach } from 'vitest';

// We need to test sanitizeDescriptionHtml which is not exported.
// We test it indirectly via getDescription which calls it.
// Set up DOM with the expected structure.

import { getDescription } from './scraper';

// =============================================================================
// Helper: create a description expander element like YouTube's DOM
// =============================================================================

function setUpDescription(innerHTML: string): void {
  // Clean up
  document.body.innerHTML = '';

  // YouTube's description lives inside ytd-text-inline-expander#description-inline-expander
  // with content inside yt-attributed-string
  const expander = document.createElement('ytd-text-inline-expander');
  expander.id = 'description-inline-expander';

  const attrString = document.createElement('yt-attributed-string');
  attrString.innerHTML = innerHTML;
  expander.appendChild(attrString);

  document.body.appendChild(expander);
}

// =============================================================================
// sanitizeDescriptionHtml - view count filtering
// =============================================================================

describe('sanitizeDescriptionHtml - view count filtering', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('preserves normal description text', () => {
    setUpDescription('Hello world, this is a description.');
    const result = getDescription();
    expect(result).toContain('Hello world, this is a description.');
  });

  it('preserves links in description', () => {
    setUpDescription('Check out <a href="https://example.com">this link</a>');
    const result = getDescription();
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('this link');
    expect(result).toContain('</a>');
  });

  it('preserves br tags for line breaks', () => {
    setUpDescription('Line one<br>Line two');
    const result = getDescription();
    expect(result).toContain('<br>');
    expect(result).toContain('Line one');
    expect(result).toContain('Line two');
  });

  it('strips leaf elements containing only view count text', () => {
    setUpDescription(
      '<span>1,234,567 views</span><br>This is the real description.'
    );
    const result = getDescription();
    expect(result).not.toContain('1,234,567 views');
    expect(result).toContain('This is the real description.');
  });

  it('strips view count with "view" (singular)', () => {
    setUpDescription(
      '<span>1 view</span><br>Description text.'
    );
    const result = getDescription();
    expect(result).not.toContain('1 view');
    expect(result).toContain('Description text.');
  });

  it('does not strip text that merely contains digits', () => {
    setUpDescription('I have 500 reasons to subscribe.');
    const result = getDescription();
    expect(result).toContain('I have 500 reasons to subscribe.');
  });

  it('strips elements with ytd-video-primary-info-renderer class', () => {
    setUpDescription(
      '<span class="ytd-video-primary-info-renderer">Some metadata</span>Real description.'
    );
    const result = getDescription();
    expect(result).not.toContain('Some metadata');
    expect(result).toContain('Real description.');
  });

  it('preserves hashtag links', () => {
    setUpDescription(
      'Check this <a href="/hashtag/coding">#coding</a> content'
    );
    const result = getDescription();
    expect(result).toContain('#coding');
    expect(result).toContain('/hashtag/coding');
  });

  it('preserves social handle links', () => {
    setUpDescription(
      'Follow <a href="/@creator">@creator</a> for more'
    );
    const result = getDescription();
    expect(result).toContain('@creator');
    expect(result).toContain('/@creator');
  });

  it('returns empty string when no description element exists', () => {
    document.body.innerHTML = '';
    const result = getDescription();
    expect(result).toBe('');
  });
});
