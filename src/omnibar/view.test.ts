import { describe, expect, it, vi } from 'vitest';
import { makeOmnibarTestDom } from '../test-helpers/omnibar';
import {
  buildOmnibarStyleSheet,
  classForOmnibarItemKind,
  classForOmnibarStatusTone,
  ensureSelectedOmnibarRowVisible,
  getOmnibarViewDefinition,
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

describe('omnibar view definition', () => {
  it('defines a scrollable results viewport, wrapping row text, explicit classes, and a default Vim dark palette', () => {
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
    expect(definition.theme.tokens).toEqual({
      background: '#000000',
      foreground: '#e0e0e0',
      muted: '#808080',
      border: '#444444',
      prompt: '#00ff00',
      selectionBackground: '#ffff00',
      selectionForeground: '#000000',
      navigation: '#00ffff',
      command: '#ffff00',
      videoScoped: '#ff00ff',
      searchResult: '#00ff00',
      statusInfo: '#00ffff',
      statusWarning: '#ffd75f',
      statusError: '#ff5f5f',
    });
    for (const muddyToken of ['#1c1f1a', '#d7d7c7', '#8f9a88', '#b8bb26']) {
      expect(Object.values(definition.theme.tokens)).not.toContain(muddyToken);
    }
    expect(contrastRatio(definition.theme.tokens.foreground, definition.theme.tokens.background)).toBeGreaterThan(10);
    expect(contrastRatio(definition.theme.tokens.selectionForeground, definition.theme.tokens.selectionBackground)).toBeGreaterThan(15);
  });

  it('builds CSS with fixed prompt/footer, a scrollable result viewport, wrapped rows, and no glass effects', () => {
    const css = buildOmnibarStyleSheet(getOmnibarViewDefinition());

    expect(css).toContain('--vilify-omnibar-background: #000000;');
    expect(css).toContain('--vilify-omnibar-selection-bg: #ffff00;');
    expect(css).toContain('--vilify-omnibar-selection-fg: #000000;');
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

    expect(relativeLuminance(definition.theme.tokens.selectionBackground)).toBeGreaterThan(0.9);
    expect(relativeLuminance(definition.theme.tokens.selectionForeground)).toBe(0);
    expect(contrastRatio(definition.theme.tokens.selectionForeground, definition.theme.tokens.selectionBackground)).toBeGreaterThan(15);

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
