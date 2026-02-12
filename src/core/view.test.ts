// @vitest-environment jsdom
// Tests for view.ts — DOM utilities and pure navigation calculators

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { el, clear, updateListSelection, showMessage, flashBoundary, navigateList, scrollHalfPage, isInputElement } from './view';

// =============================================================================
// el — DOM element creator
// =============================================================================
describe('el', () => {
  it('creates element with given tag', () => {
    const div = el('div');
    expect(div.tagName).toBe('DIV');
  });

  it('creates element with attributes', () => {
    const span = el('span', { id: 'msg', class: 'highlight' });
    expect(span.getAttribute('id')).toBe('msg');
    expect(span.getAttribute('class')).toBe('highlight');
  });

  it('creates element with text children', () => {
    const p = el('p', {}, ['Hello']);
    expect(p.textContent).toBe('Hello');
    expect(p.childNodes.length).toBe(1);
    expect(p.childNodes[0].nodeType).toBe(Node.TEXT_NODE);
  });

  it('creates element with element children', () => {
    const li1 = el('li', {}, ['One']);
    const li2 = el('li', {}, ['Two']);
    const ul = el('ul', {}, [li1, li2]);
    expect(ul.children.length).toBe(2);
    expect(ul.children[0].textContent).toBe('One');
    expect(ul.children[1].textContent).toBe('Two');
  });

  it('skips null/undefined attribute values', () => {
    const div = el('div', { id: null, class: undefined, 'data-x': 'yes' } as any);
    expect(div.hasAttribute('id')).toBe(false);
    expect(div.hasAttribute('class')).toBe(false);
    expect(div.getAttribute('data-x')).toBe('yes');
  });

  it('defaults attrs and children to empty', () => {
    const div = el('div');
    expect(div.attributes.length).toBe(0);
    expect(div.childNodes.length).toBe(0);
  });

  it('ignores non-string non-Node children', () => {
    const div = el('div', {}, [42 as any, 'text']);
    // 42 is skipped, only 'text' appended
    expect(div.childNodes.length).toBe(1);
    expect(div.textContent).toBe('text');
  });
});

// =============================================================================
// clear — DOM clearing utility
// =============================================================================
describe('clear', () => {
  it('removes all children from element', () => {
    const div = document.createElement('div');
    div.appendChild(document.createElement('span'));
    div.appendChild(document.createTextNode('hello'));
    expect(div.childNodes.length).toBe(2);
    clear(div);
    expect(div.childNodes.length).toBe(0);
    expect(div.innerHTML).toBe('');
  });

  it('is no-op on already empty element', () => {
    const div = document.createElement('div');
    clear(div);
    expect(div.innerHTML).toBe('');
  });
});

// =============================================================================
// updateListSelection — list selection highlighter
// =============================================================================
describe('updateListSelection', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    for (let i = 0; i < 5; i++) {
      const item = document.createElement('div');
      item.className = 'item';
      item.textContent = `Item ${i}`;
      // jsdom doesn't implement scrollIntoView
      item.scrollIntoView = vi.fn();
      container.appendChild(item);
    }
  });

  it('adds .selected to item at given index', () => {
    updateListSelection(container, '.item', 2);
    const items = container.querySelectorAll('.item');
    expect(items[2].classList.contains('selected')).toBe(true);
  });

  it('removes .selected from previously selected item', () => {
    updateListSelection(container, '.item', 1);
    updateListSelection(container, '.item', 3);
    const items = container.querySelectorAll('.item');
    expect(items[1].classList.contains('selected')).toBe(false);
    expect(items[3].classList.contains('selected')).toBe(true);
  });

  it('handles index out of bounds gracefully', () => {
    updateListSelection(container, '.item', 99);
    const items = container.querySelectorAll('.item');
    for (const item of items) {
      expect(item.classList.contains('selected')).toBe(false);
    }
  });

  it('handles empty container', () => {
    const empty = document.createElement('div');
    // Should not throw
    updateListSelection(empty, '.item', 0);
  });
});

// =============================================================================
// navigateList — list navigation calculator (PURE)
// =============================================================================
describe('navigateList', () => {
  it('moves down by one', () => {
    expect(navigateList('down', 2, 10)).toEqual({ index: 3, boundary: null });
  });

  it('reports bottom boundary when at last item', () => {
    expect(navigateList('down', 9, 10)).toEqual({ index: 9, boundary: 'bottom' });
  });

  it('moves up by one', () => {
    expect(navigateList('up', 5, 10)).toEqual({ index: 4, boundary: null });
  });

  it('reports top boundary when at first item', () => {
    expect(navigateList('up', 0, 10)).toEqual({ index: 0, boundary: 'top' });
  });

  it('jumps to top', () => {
    expect(navigateList('top', 5, 10)).toEqual({ index: 0, boundary: null });
  });

  it('jumps to bottom', () => {
    expect(navigateList('bottom', 5, 10)).toEqual({ index: 9, boundary: null });
  });

  it('handles empty list', () => {
    expect(navigateList('down', 0, 0)).toEqual({ index: 0, boundary: null });
    expect(navigateList('up', 0, 0)).toEqual({ index: 0, boundary: null });
  });

  it('handles single-item list', () => {
    expect(navigateList('down', 0, 1)).toEqual({ index: 0, boundary: 'bottom' });
    expect(navigateList('up', 0, 1)).toEqual({ index: 0, boundary: 'top' });
  });

  it('returns current index for unknown direction', () => {
    expect(navigateList('unknown' as any, 3, 10)).toEqual({ index: 3, boundary: null });
  });
});

// =============================================================================
// scrollHalfPage — half-page scroll calculator (PURE)
// =============================================================================
describe('scrollHalfPage', () => {
  it('scrolls down by half visible count', () => {
    expect(scrollHalfPage('down', 5, 100, 20)).toBe(15);
  });

  it('scrolls up by half visible count', () => {
    expect(scrollHalfPage('up', 15, 100, 20)).toBe(5);
  });

  it('clamps to max index when scrolling down past end', () => {
    expect(scrollHalfPage('down', 95, 100, 20)).toBe(99);
  });

  it('clamps to 0 when scrolling up past start', () => {
    expect(scrollHalfPage('up', 3, 100, 20)).toBe(0);
  });

  it('handles visibleCount of 1 (half = 1)', () => {
    expect(scrollHalfPage('down', 5, 100, 1)).toBe(6);
    expect(scrollHalfPage('up', 5, 100, 1)).toBe(4);
  });

  it('handles visibleCount of 0 (half = min 1)', () => {
    expect(scrollHalfPage('down', 5, 100, 0)).toBe(6);
  });

  it('returns current index for unknown direction', () => {
    expect(scrollHalfPage('unknown' as any, 5, 100, 20)).toBe(5);
  });

  it('handles empty list (count=0)', () => {
    expect(scrollHalfPage('down', 0, 0, 20)).toBe(0);
    expect(scrollHalfPage('up', 0, 0, 20)).toBe(0);
  });
});

// =============================================================================
// isInputElement — input element detector (PURE)
// =============================================================================
describe('isInputElement', () => {
  it('returns true for input element', () => {
    const input = document.createElement('input');
    expect(isInputElement(input)).toBe(true);
  });

  it('returns true for textarea element', () => {
    const textarea = document.createElement('textarea');
    expect(isInputElement(textarea)).toBe(true);
  });

  it('returns true for select element', () => {
    const select = document.createElement('select');
    expect(isInputElement(select)).toBe(true);
  });

  it('returns true for contenteditable element', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isInputElement(div)).toBe(true);
  });

  it('returns false for regular div', () => {
    const div = document.createElement('div');
    expect(isInputElement(div)).toBe(false);
  });

  it('returns false for span', () => {
    const span = document.createElement('span');
    expect(isInputElement(span)).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isInputElement(null as any)).toBe(false);
    expect(isInputElement(undefined as any)).toBe(false);
  });
});

// =============================================================================
// showMessage — status message display (I/O)
// =============================================================================
describe('showMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const msgEl = document.createElement('div');
    msgEl.id = 'vilify-status-message';
    document.body.appendChild(msgEl);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('sets message text on status element', () => {
    showMessage('Hello');
    const msgEl = document.getElementById('vilify-status-message')!;
    expect(msgEl.textContent).toBe('Hello');
  });

  it('clears message after duration', () => {
    showMessage('Temporary', 1000);
    const msgEl = document.getElementById('vilify-status-message')!;
    expect(msgEl.textContent).toBe('Temporary');
    vi.advanceTimersByTime(1000);
    expect(msgEl.textContent).toBe('');
  });

  it('sets empty message immediately without timeout', () => {
    showMessage('');
    const msgEl = document.getElementById('vilify-status-message')!;
    expect(msgEl.textContent).toBe('');
  });
});

// =============================================================================
// flashBoundary — boundary flash effect (I/O)
// =============================================================================
describe('flashBoundary', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const container = document.createElement('div');
    container.id = 'vilify-content';
    document.body.appendChild(container);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('adds and removes flash-end class', () => {
    flashBoundary();
    const container = document.getElementById('vilify-content')!;
    expect(container.classList.contains('flash-end')).toBe(true);
    vi.advanceTimersByTime(150);
    expect(container.classList.contains('flash-end')).toBe(false);
  });

  it('does not throw when container is missing', () => {
    document.body.innerHTML = '';
    expect(() => flashBoundary()).not.toThrow();
  });
});
