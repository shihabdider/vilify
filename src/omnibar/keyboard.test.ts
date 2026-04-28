import { describe, expect, it } from 'vitest';
import { createKeyDownEvent, makeOmnibarTestDom } from '../test-helpers/omnibar';
import { getOpenOmnibarKeyIntent, isOmnibarOpenerKey } from './keyboard';

function keyEvent(key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  return createKeyDownEvent(makeOmnibarTestDom().window, key, init);
}

describe('getOpenOmnibarKeyIntent', () => {
  it.each([
    { name: 'ArrowUp', key: 'ArrowUp', init: {}, intent: 'move-up' },
    { name: 'Ctrl+p', key: 'p', init: { ctrlKey: true }, intent: 'move-up' },
    { name: 'ArrowDown', key: 'ArrowDown', init: {}, intent: 'move-down' },
    { name: 'Ctrl+n', key: 'n', init: { ctrlKey: true }, intent: 'move-down' },
    { name: 'Enter', key: 'Enter', init: {}, intent: 'execute' },
    { name: 'Escape', key: 'Escape', init: {}, intent: 'escape' },
  ] as const)('maps $name to $intent', ({ key, init, intent }) => {
    expect(getOpenOmnibarKeyIntent(keyEvent(key, init))).toBe(intent);
  });

  it('returns null for unrelated keys and unmodified n/p', () => {
    expect(getOpenOmnibarKeyIntent(keyEvent('a'))).toBeNull();
    expect(getOpenOmnibarKeyIntent(keyEvent('n'))).toBeNull();
    expect(getOpenOmnibarKeyIntent(keyEvent('p'))).toBeNull();
  });
});

describe('isOmnibarOpenerKey', () => {
  it('keeps closed-state opener limited to unmodified colon', () => {
    expect(isOmnibarOpenerKey(keyEvent(':'))).toBe(true);
    expect(isOmnibarOpenerKey(keyEvent(':', { ctrlKey: true }))).toBe(false);
    expect(isOmnibarOpenerKey(keyEvent('n', { ctrlKey: true }))).toBe(false);
    expect(isOmnibarOpenerKey(keyEvent('p', { ctrlKey: true }))).toBe(false);
  });
});
