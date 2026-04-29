import { describe, expect, it, vi } from 'vitest';
import { makeOmnibarTestDom } from '../test-helpers/omnibar';
import {
  buildOmnibarStyleSheet,
  classForOmnibarItemKind,
  classForOmnibarStatusTone,
  ensureSelectedOmnibarRowVisible,
  getOmnibarViewDefinition,
} from './view';

describe('omnibar view definition', () => {
  it('defines a scrollable results viewport, wrapping row text, and explicit Vim-like classes', () => {
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
    expect(definition.theme.tokens).toMatchObject({
      background: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      foreground: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      prompt: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      navigation: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      statusWarning: expect.stringMatching(/^#[0-9a-f]{6}$/i),
      statusError: expect.stringMatching(/^#[0-9a-f]{6}$/i),
    });
  });

  it('builds CSS with fixed prompt/footer, a scrollable result viewport, wrapped rows, and no glass effects', () => {
    const css = buildOmnibarStyleSheet(getOmnibarViewDefinition());

    expect(css).toContain('--vilify-omnibar-background: #1c1f1a;');
    expect(css).toContain('--vilify-omnibar-selection-bg:');
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
    expect(css).not.toMatch(/gradient|glass|backdrop-filter|blur\(/i);
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
