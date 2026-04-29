import { describe, expect, it, vi } from 'vitest';
import { makeOmnibarTestDom } from '../test-helpers/omnibar';
import type { OmnibarItem, OmnibarRowMarker } from './types';
import type { OmnibarLayoutDefinition } from './view';
import {
  buildOmnibarStyleSheet,
  classForOmnibarItemKind,
  classForOmnibarStatusTone,
  createReadableOmnibarLayoutDefinition,
  createSyntaxLikeOmnibarThemeTokens,
  deriveOmnibarRowMarker,
  deriveOmnibarSyntaxParts,
  ensureSelectedOmnibarRowVisible,
  getOmnibarViewDefinition,
  renderOmnibarSyntaxText,
} from './view';

function contrastRatio(foreground: string, background: string): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background));
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background));

  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hexColor: string): number {
  const [red, green, blue] = hexColor
    .replace('#', '')
    .match(/.{2}/g)!
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });

  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function makeRowMarkerItem(overrides: Partial<OmnibarItem> = {}): OmnibarItem {
  return {
    id: 'row-marker-item',
    kind: 'command',
    title: 'Row marker item',
    action: { kind: 'noop' },
    ...overrides,
  };
}

function cssLengthValue(length: string, unit: 'ch' | 'rem'): number {
  const match = new RegExp(`^(\\d+(?:\\.\\d+)?)${unit}$`).exec(length);
  if (!match) {
    throw new Error(`Expected ${length} to be a plain ${unit} length`);
  }

  return Number(match[1]);
}

function paddingInlineStartRem(padding: string): number {
  const parts = padding.trim().split(/\s+/);
  const inlineStart = parts.length === 1 ? parts[0] : parts.length === 4 ? parts[3] : parts[1];

  return cssLengthValue(inlineStart, 'rem');
}

function approximateDefaultYouTubePromptInputStartCh(layout: OmnibarLayoutDefinition): number {
  const approximateChPerRem = 1.65;
  const defaultYouTubePromptLabelCh = 'youtube ❯ :'.length;
  const promptInputFlexGapCh = 1;

  return (paddingInlineStartRem(layout.promptPadding) * approximateChPerRem)
    + defaultYouTubePromptLabelCh
    + promptInputFlexGapCh;
}

function approximateRowTitleStartCh(layout: OmnibarLayoutDefinition): number {
  const approximateChPerRem = 1.65;

  return (paddingInlineStartRem(layout.rowPadding) * approximateChPerRem)
    + cssLengthValue(layout.markerColumnWidth, 'ch')
    + cssLengthValue(layout.kindColumnWidth, 'ch')
    + (2 * cssLengthValue(layout.rowColumnGap, 'rem') * approximateChPerRem);
}

describe('omnibar view definition', () => {
  it('composes a scrollable viewport, wrapping row text, explicit classes, readable layout, and Vim-like theme tokens', () => {
    const definition = getOmnibarViewDefinition();

    expect(definition.resultsViewport).toEqual({
      className: 'vilify-omnibar-results',
      datasetKey: 'vilifyOmnibarResults',
      scrollsInsidePicker: true,
      fixedPromptAndFooter: true,
      selectionVisibility: 'nearest-scrollport',
    });
    expect(definition.rowText).toEqual({
      titleWrap: 'wrap',
      subtitleWrap: 'wrap',
      statusWrap: 'wrap',
    });
    expect(definition.layout).toEqual(createReadableOmnibarLayoutDefinition());
    expect(definition.theme.kindClasses).toEqual({
      navigation: 'vilify-omnibar-kind-navigation',
      command: 'vilify-omnibar-kind-command',
      'video-action': 'vilify-omnibar-kind-video-scoped',
      'search-result': 'vilify-omnibar-kind-search-result',
      status: 'vilify-omnibar-kind-status vilify-omnibar-status-row',
    });
    expect(definition.theme.statusToneClasses).toEqual({
      info: 'vilify-omnibar-status-info',
      warning: 'vilify-omnibar-status-warning',
      error: 'vilify-omnibar-status-error',
    });
    expect(definition.theme.syntaxPartClasses).toEqual({
      prefix: 'vilify-omnibar-syntax-prefix',
      keyword: 'vilify-omnibar-syntax-keyword',
      placeholder: 'vilify-omnibar-syntax-placeholder',
      example: 'vilify-omnibar-syntax-example',
      description: 'vilify-omnibar-syntax-description',
      kind: 'vilify-omnibar-syntax-kind',
      status: 'vilify-omnibar-syntax-status',
      title: 'vilify-omnibar-syntax-title',
    });
    expect(definition.theme.tokens).toEqual(createSyntaxLikeOmnibarThemeTokens());
    expect(definition.theme.tokens).toEqual({
      background: '#000000',
      foreground: '#e8e8d3',
      muted: '#8a8a8a',
      border: '#5f5f5f',
      prompt: '#87ff5f',
      selectionBackground: '#ffd75f',
      selectionForeground: '#000000',
      navigation: '#87d7ff',
      command: '#ffd75f',
      videoScoped: '#ff87d7',
      searchResult: '#87ffaf',
      statusInfo: '#87d7ff',
      statusWarning: '#ffaf00',
      statusError: '#ff5f5f',
      syntaxPrefix: '#87ff5f',
      syntaxKeyword: '#ffd75f',
      syntaxPlaceholder: '#af87ff',
      syntaxExample: '#87d7ff',
      syntaxDescription: '#d7d7af',
      syntaxKind: '#ff87d7',
      syntaxStatus: '#ffaf00',
    });
    for (const muddyToken of ['#1c1f1a', '#d7d7c7', '#8f9a88', '#b8bb26']) {
      expect(Object.values(definition.theme.tokens)).not.toContain(muddyToken);
    }
    expect(contrastRatio(definition.theme.tokens.foreground, definition.theme.tokens.background)).toBeGreaterThan(10);
    expect(contrastRatio(definition.theme.tokens.selectionForeground, definition.theme.tokens.selectionBackground)).toBeGreaterThan(10);
  });

  it('derives syntax-like theme tokens with differentiated prefix, keyword, example, description, kind, status, and selection colors', () => {
    const tokens = createSyntaxLikeOmnibarThemeTokens();

    expect(tokens.syntaxPrefix).toBe('#87ff5f');
    expect(tokens.syntaxKeyword).toBe('#ffd75f');
    expect(tokens.syntaxExample).toBe('#87d7ff');
    expect(tokens.syntaxDescription).toBe('#d7d7af');
    expect(tokens.syntaxKind).toBe('#ff87d7');
    expect(tokens.syntaxStatus).toBe('#ffaf00');
    expect(tokens.selectionBackground).toBe('#ffd75f');
    expect(new Set([
      tokens.syntaxPrefix,
      tokens.syntaxKeyword,
      tokens.syntaxExample,
      tokens.syntaxDescription,
      tokens.syntaxKind,
      tokens.syntaxStatus,
    ]).size).toBeGreaterThanOrEqual(5);
  });

  it('returns a complete valid dark Vim-like theme token map with readable selected-row contrast', () => {
    const tokens = createSyntaxLikeOmnibarThemeTokens();

    expect(Object.keys(tokens).sort()).toEqual([
      'background',
      'border',
      'command',
      'foreground',
      'muted',
      'navigation',
      'prompt',
      'searchResult',
      'selectionBackground',
      'selectionForeground',
      'statusError',
      'statusInfo',
      'statusWarning',
      'syntaxDescription',
      'syntaxExample',
      'syntaxKeyword',
      'syntaxKind',
      'syntaxPlaceholder',
      'syntaxPrefix',
      'syntaxStatus',
      'videoScoped',
    ].sort());
    expect(Object.values(tokens).every((token) => /^#[0-9a-f]{6}$/i.test(token))).toBe(true);
    expect(tokens.background).toBe('#000000');
    expect(tokens.selectionForeground).toBe('#000000');
    expect(relativeLuminance(tokens.selectionBackground)).toBeGreaterThan(0.55);
    expect(contrastRatio(tokens.selectionForeground, tokens.selectionBackground)).toBeGreaterThan(10);
  });

  it('derives readable type-scale layout tokens bounded to the viewport', () => {
    const layout = createReadableOmnibarLayoutDefinition();

    expect(Object.keys(layout).sort()).toEqual([
      'baseFontSize',
      'footerPadding',
      'kindColumnWidth',
      'lineHeight',
      'markerColumnWidth',
      'overlayPadding',
      'panelMaxHeight',
      'panelWidth',
      'promptPadding',
      'resultsMaxHeight',
      'rowColumnGap',
      'rowGap',
      'rowPadding',
    ].sort());
    expect(layout.baseFontSize).toMatch(/^(?:1[6-9]px|clamp\()/);
    expect(layout.lineHeight).toMatch(/^(?:1\.[4-9]|clamp\()/);
    expect(layout.panelWidth).toMatch(/^min\((?:8[8-9]|9[0-6])ch,\s*calc\(100vw - 2rem\)\)$/);
    expect(layout.panelMaxHeight).toMatch(/^min\((?:7[4-9]|8[0-5])vh,/);
    expect(layout.panelMaxHeight).toContain('calc(100vh - 2rem)');
    expect(layout.resultsMaxHeight).toMatch(/^min\((?:5[8-9]|6[0-8])vh,/);
    expect(layout.resultsMaxHeight).toContain('calc(100vh - 8rem)');
    expect(layout.overlayPadding).toBe('1rem');
    expect(layout.promptPadding).toMatch(/^0\.[6-9]rem 0\.9rem$/);
    expect(layout.rowPadding).toMatch(/^0\.[5-7]rem 0\.9rem$/);
    expect(layout.rowPadding).not.toBe('0.45rem 0.75rem');
    expect(layout.footerPadding).toMatch(/^0\.[5-7]rem 0\.9rem$/);
    expect(layout.markerColumnWidth).toMatch(/^[12]ch$/);
    expect(layout.kindColumnWidth).toMatch(/^[2-8]ch$/);
    expect(layout.rowColumnGap).toMatch(/^0\.[6-9]rem$/);
    expect(layout.rowGap).toMatch(/^0\.[12]rem$/);
  });

  it('aligns the result title column near the default YouTube prompt input start without hiding two-character prefix markers', () => {
    const layout = createReadableOmnibarLayoutDefinition();
    const promptInputStartCh = approximateDefaultYouTubePromptInputStartCh(layout);
    const rowTitleStartCh = approximateRowTitleStartCh(layout);

    expect(cssLengthValue(layout.kindColumnWidth, 'ch')).toBeGreaterThanOrEqual(2);
    expect(layout.kindColumnWidth).not.toBe('12ch');
    expect(Math.abs(rowTitleStartCh - promptInputStartCh)).toBeLessThanOrEqual(1);
  });

  describe('deriveOmnibarRowMarker', () => {
    it('returns the explicit display marker when one is present', () => {
      const marker: OmnibarRowMarker = { kind: 'prefix', prefix: 't/' };
      const emptyMarker: OmnibarRowMarker = { kind: 'empty' };
      const item = makeRowMarkerItem({ display: { marker } });
      const emptyItem = makeRowMarkerItem({ display: { marker: emptyMarker } });

      expect(deriveOmnibarRowMarker(item, 's/active search')).toBe(marker);
      expect(deriveOmnibarRowMarker(emptyItem, 't/active search')).toBe(emptyMarker);
    });

    it.each([
      ['s/lofi beats', 's/'],
      ['t/needle', 't/'],
      ['n/history', 'n/'],
      ['s/', 's/'],
    ] as const)('derives prefix marker %s from active prefix query context', (query, prefix) => {
      expect(deriveOmnibarRowMarker(makeRowMarkerItem(), query)).toEqual({ kind: 'prefix', prefix });
    });

    it.each(['', 'search text', 'x/s/lofi', 'S/lofi', ' t/needle'] as const)(
      'returns an empty marker for non-prefix query %j',
      (query) => {
        expect(deriveOmnibarRowMarker(makeRowMarkerItem(), query)).toEqual({ kind: 'empty' });
      },
    );

    it('does not derive a marker from status or action semantics', () => {
      const item = makeRowMarkerItem({
        kind: 'status',
        tone: 'warning',
        action: { kind: 'close' },
      });

      expect(deriveOmnibarRowMarker(item, 'warning')).toEqual({ kind: 'empty' });
    });
  });

  describe('deriveOmnibarSyntaxParts', () => {
    it('returns explicit display title parts unchanged when present', () => {
      const explicitTitleParts = [
        { kind: 'keyword', text: 'Custom' },
        { kind: 'title', text: ' title' },
      ] as const;
      const item = makeRowMarkerItem({
        title: 's/{query} — search YouTube',
        display: { titleParts: explicitTitleParts },
      });

      expect(deriveOmnibarSyntaxParts(item)).toBe(explicitTitleParts);
    });

    it.each([
      ['s/{query} — search YouTube', 's/', 'search', ' YouTube'],
      ['t/{query} — search transcript', 't/', 'search', ' transcript'],
      ['n/{query} — filter navigation', 'n/', 'filter', ' navigation'],
    ] as const)('segments prefix hint title %s into prefix, placeholder, keyword, and title parts', (title, prefix, keyword, titleRest) => {
      const parts = deriveOmnibarSyntaxParts(makeRowMarkerItem({ kind: 'status', title }));

      expect(parts).toEqual([
        { kind: 'prefix', text: prefix },
        { kind: 'placeholder', text: '{query}' },
        { kind: 'description', text: ' — ' },
        { kind: 'keyword', text: keyword },
        { kind: 'title', text: titleRest },
      ]);
      expect(parts.map((part) => part.text).join('')).toBe(title);
    });

    it('segments plain typing hints into keyword, description, and title parts', () => {
      const title = 'type text — filter commands';
      const parts = deriveOmnibarSyntaxParts(makeRowMarkerItem({ kind: 'status', title }));

      expect(parts).toEqual([
        { kind: 'keyword', text: 'type text' },
        { kind: 'description', text: ' — ' },
        { kind: 'keyword', text: 'filter' },
        { kind: 'title', text: ' commands' },
      ]);
      expect(parts.map((part) => part.text).join('')).toBe(title);
    });

    it('segments example text into example, prefix, keyword, and title parts', () => {
      const title = 'Example: t/needle searches the current video transcript.';
      const parts = deriveOmnibarSyntaxParts(makeRowMarkerItem({ title }));

      expect(parts).toEqual([
        { kind: 'example', text: 'Example:' },
        { kind: 'description', text: ' ' },
        { kind: 'prefix', text: 't/' },
        { kind: 'keyword', text: 'needle' },
        { kind: 'title', text: ' searches the current video transcript.' },
      ]);
      expect(parts.map((part) => part.text).join('')).toBe(title);
    });

    it.each([
      ['Transcript unavailable', 'Transcript', ' unavailable'],
      ['No active YouTube video', 'No', ' active YouTube video'],
      ['Loading…', 'Loading…', ''],
    ] as const)('segments status row title %s into status and title parts', (title, statusText, titleRest) => {
      const parts = deriveOmnibarSyntaxParts(makeRowMarkerItem({ kind: 'status', title }));
      const expectedParts = titleRest
        ? [
            { kind: 'status', text: statusText },
            { kind: 'title', text: titleRest },
          ]
        : [{ kind: 'status', text: statusText }];

      expect(parts).toEqual(expectedParts);
      expect(parts.map((part) => part.text).join('')).toBe(title);
    });

    it('falls back to title parts for normal rows and no parts for empty titles', () => {
      expect(deriveOmnibarSyntaxParts(makeRowMarkerItem({ kind: 'command', title: 'Search transcript' }))).toEqual([
        { kind: 'title', text: 'Search transcript' },
      ]);
      expect(deriveOmnibarSyntaxParts(makeRowMarkerItem({ title: '' }))).toEqual([]);
    });

    it('derives display-only row marker and syntax parts without changing item actions', () => {
      const action = { kind: 'noop' as const };
      const item = {
        id: 'youtube-root-hint-transcript',
        kind: 'status' as const,
        title: 't/{query} — search transcript',
        subtitle: 'Example: t/needle searches the current video transcript.',
        display: { marker: { kind: 'prefix' as const, prefix: 't/' as const } },
        action,
      };

      expect(deriveOmnibarRowMarker(item, 't/needle')).toEqual({ kind: 'prefix', prefix: 't/' });
      expect(deriveOmnibarSyntaxParts(item)).toEqual([
        { kind: 'prefix', text: 't/' },
        { kind: 'placeholder', text: '{query}' },
        { kind: 'description', text: ' — ' },
        { kind: 'keyword', text: 'search' },
        { kind: 'title', text: ' transcript' },
      ]);
      expect(item.action).toBe(action);
    });
  });

  describe('renderOmnibarSyntaxText', () => {
    it('renders syntax text as semantic spans while preserving fallback text for accessibility', () => {
      const dom = makeOmnibarTestDom();
      const element = renderOmnibarSyntaxText(dom.window.document, 'vilify-omnibar-item-title', 't/{query} — search transcript', [
        { kind: 'prefix', text: 't/' },
        { kind: 'placeholder', text: '{query}' },
        { kind: 'description', text: ' — search transcript' },
      ]);

      expect(element.className).toBe('vilify-omnibar-item-title');
      expect(element.textContent).toBe('t/{query} — search transcript');
      expect(Array.from(element.children).map((child) => child.className)).toEqual([
        'vilify-omnibar-syntax-prefix',
        'vilify-omnibar-syntax-placeholder',
        'vilify-omnibar-syntax-description',
      ]);
    });

    it('uses fallback text directly when no syntax parts are present', () => {
      const dom = makeOmnibarTestDom();
      const element = renderOmnibarSyntaxText(dom.window.document, 'vilify-omnibar-item-subtitle', '<b>Plain fallback</b>', []);

      expect(element.className).toBe('vilify-omnibar-item-subtitle');
      expect(element.children).toHaveLength(0);
      expect(element.textContent).toBe('<b>Plain fallback</b>');
      expect(element.querySelector('b')).toBeNull();
    });

    it('maps every syntax part kind to a stable semantic class without injecting HTML', () => {
      const dom = makeOmnibarTestDom();
      const element = renderOmnibarSyntaxText(dom.window.document, 'vilify-omnibar-item-title', 's/{query} Example: search <em>status</em> title kind', [
        { kind: 'prefix', text: 's/' },
        { kind: 'placeholder', text: '{query}' },
        { kind: 'description', text: ' ' },
        { kind: 'example', text: 'Example:' },
        { kind: 'keyword', text: ' search' },
        { kind: 'status', text: ' <em>status</em>' },
        { kind: 'title', text: ' title' },
        { kind: 'kind', text: ' kind' },
      ]);

      expect(element.textContent).toBe('s/{query} Example: search <em>status</em> title kind');
      expect(Array.from(element.children).map((child) => [child.className, child.textContent])).toEqual([
        ['vilify-omnibar-syntax-prefix', 's/'],
        ['vilify-omnibar-syntax-placeholder', '{query}'],
        ['vilify-omnibar-syntax-description', ' '],
        ['vilify-omnibar-syntax-example', 'Example:'],
        ['vilify-omnibar-syntax-keyword', ' search'],
        ['vilify-omnibar-syntax-status', ' <em>status</em>'],
        ['vilify-omnibar-syntax-title', ' title'],
        ['vilify-omnibar-syntax-kind', ' kind'],
      ]);
      expect(element.querySelector('em')).toBeNull();
    });
  });

  it('builds CSS with fixed prompt/footer, a scrollable result viewport, wrapped rows, and no glass effects', () => {
    const css = buildOmnibarStyleSheet(getOmnibarViewDefinition());

    expect(css).toContain('--vilify-omnibar-background: #000000;');
    expect(css).toContain('--vilify-omnibar-selection-bg: #ffd75f;');
    expect(css).toContain('--vilify-omnibar-selection-fg: #000000;');
    expect(css).toContain('--vilify-omnibar-syntax-prefix: #87ff5f;');
    expect(css).toContain('--vilify-omnibar-syntax-keyword: #ffd75f;');
    expect(css).toContain('.vilify-omnibar-prompt');
    expect(css).toContain('flex: 0 0 auto;');
    expect(css).toContain('.vilify-omnibar-footer');
    expect(css).toContain('.vilify-omnibar-results');
    expect(css).toMatch(/\.vilify-omnibar-results\s*\{[^}]*overflow-y:\s*auto;/s);
    expect(css).toMatch(/\.vilify-omnibar-results\s*\{[^}]*overscroll-behavior:\s*contain;/s);
    expect(css).toMatch(/\.vilify-omnibar-row\s*\{[^}]*white-space:\s*normal;/s);
    expect(css).toMatch(/\.vilify-omnibar-item-title,[^{]*\.vilify-omnibar-status\s*\{[^}]*overflow-wrap:\s*anywhere;/s);
    expect(css).toContain('.vilify-omnibar-kind-navigation');
    expect(css).toContain('.vilify-omnibar-kind-video-scoped');
    expect(css).toContain('.vilify-omnibar-status-warning');
    expect(css).not.toContain('#1c1f1a');
    expect(css).not.toMatch(/gradient|glass|backdrop-filter|blur\(/i);
  });

  it('keeps selected row text dark on the bright selected background after kind and status colors', () => {
    const definition = getOmnibarViewDefinition();
    const css = buildOmnibarStyleSheet(definition);

    expect(relativeLuminance(definition.theme.tokens.selectionBackground)).toBeGreaterThan(0.55);
    expect(relativeLuminance(definition.theme.tokens.selectionForeground)).toBe(0);
    expect(contrastRatio(definition.theme.tokens.selectionForeground, definition.theme.tokens.selectionBackground)).toBeGreaterThan(10);

    const lastKindColorIndex = Math.max(
      css.lastIndexOf('.vilify-omnibar-kind-navigation'),
      css.lastIndexOf('.vilify-omnibar-kind-command'),
      css.lastIndexOf('.vilify-omnibar-kind-video-scoped'),
      css.lastIndexOf('.vilify-omnibar-kind-search-result'),
      css.lastIndexOf('.vilify-omnibar-status-error'),
    );
    const selectedOverrideIndex = css.lastIndexOf(
      '#vilify-omnibar-root .vilify-omnibar-row[data-selected="true"] .vilify-omnibar-kind',
    );
    const selectedOverride = css.slice(selectedOverrideIndex, css.indexOf('}', selectedOverrideIndex) + 1);

    expect(selectedOverrideIndex).toBeGreaterThan(lastKindColorIndex);
    expect(selectedOverride).toContain('.vilify-omnibar-row[data-selected="true"] .vilify-omnibar-kind');
    expect(selectedOverride).toContain('.vilify-omnibar-row[data-selected="true"] .vilify-omnibar-item-title');
    expect(selectedOverride).toContain('.vilify-omnibar-row[data-selected="true"] .vilify-omnibar-item-subtitle');
    expect(selectedOverride).toContain('.vilify-omnibar-row[data-selected="true"] .vilify-omnibar-status');
    expect(selectedOverride).toContain('color: var(--vilify-omnibar-selection-fg);');
  });

  it('maps item kinds and optional status tones to stable CSS classes', () => {
    expect(classForOmnibarItemKind('navigation')).toBe('vilify-omnibar-kind-navigation');
    expect(classForOmnibarItemKind('command')).toBe('vilify-omnibar-kind-command');
    expect(classForOmnibarItemKind('video-action')).toBe('vilify-omnibar-kind-video-scoped');
    expect(classForOmnibarItemKind('search-result')).toBe('vilify-omnibar-kind-search-result');
    expect(classForOmnibarItemKind('status')).toBe('vilify-omnibar-kind-status vilify-omnibar-status-row');

    expect(classForOmnibarStatusTone(undefined)).toBe('vilify-omnibar-status-neutral');
    expect(classForOmnibarStatusTone('info')).toBe('vilify-omnibar-status-info');
    expect(classForOmnibarStatusTone('warning')).toBe('vilify-omnibar-status-warning');
    expect(classForOmnibarStatusTone('error')).toBe('vilify-omnibar-status-error');
  });
});

describe('ensureSelectedOmnibarRowVisible', () => {
  it('asks the adapter to keep the selected row visible inside the results viewport', () => {
    const dom = makeOmnibarTestDom();
    dom.window.document.body.innerHTML = `
      <div id="root">
        <div data-vilify-omnibar-results="true">
          <div data-vilify-omnibar-item="true" data-selected="false" data-item-id="alpha"></div>
          <div data-vilify-omnibar-item="true" data-selected="true" data-item-id="beta"></div>
        </div>
      </div>
    `;
    const root = dom.window.document.getElementById('root')!;
    const selected = dom.window.document.querySelector<HTMLElement>('[data-item-id="beta"]')!;
    const viewport = dom.window.document.querySelector<HTMLElement>('[data-vilify-omnibar-results="true"]')!;
    const keepVisible = vi.fn();

    ensureSelectedOmnibarRowVisible(root, { keepVisible });

    expect(keepVisible).toHaveBeenCalledWith(selected, viewport);
  });

  it('falls back to native nearest scrollIntoView when no adapter is supplied', () => {
    const dom = makeOmnibarTestDom();
    dom.window.document.body.innerHTML = `
      <div id="root">
        <div data-vilify-omnibar-results="true">
          <div data-vilify-omnibar-item="true" data-selected="true" data-item-id="alpha"></div>
        </div>
      </div>
    `;
    const root = dom.window.document.getElementById('root')!;
    const selected = dom.window.document.querySelector<HTMLElement>('[data-item-id="alpha"]')!;
    selected.scrollIntoView = vi.fn();

    ensureSelectedOmnibarRowVisible(root);

    expect(selected.scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest' });
  });

  it('does nothing when either the viewport or selected row is absent', () => {
    const dom = makeOmnibarTestDom();
    const keepVisible = vi.fn();

    ensureSelectedOmnibarRowVisible(dom.window.document, { keepVisible });

    expect(keepVisible).not.toHaveBeenCalled();
  });
});
