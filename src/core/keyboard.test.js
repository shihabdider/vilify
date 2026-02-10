import { describe, it, expect, vi } from 'vitest';
import { handleKeyEvent } from './keyboard.js';

// Helper to create a minimal KeyboardEvent-like object
function keyEvent(key) {
  return { key, preventDefault: vi.fn(), stopPropagation: vi.fn() };
}

describe('handleKeyEvent - prefix disambiguation', () => {
  const mute = vi.fn();
  const watchLater = vi.fn();
  const subscribe = vi.fn();
  const goHome = vi.fn();
  const goSubs = vi.fn();

  const sequences = {
    'm': mute,
    'mw': watchLater,
    'ms': subscribe,
    'gh': goHome,
    'gs': goSubs,
  };

  it('returns pendingAction for ambiguous exact match (m has longer prefixes)', () => {
    const result = handleKeyEvent(keyEvent('m'), '', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBe(mute);
    expect(result.newSeq).toBe('m');
    expect(result.shouldPrevent).toBe(true);
  });

  it('returns action for unambiguous exact match (mw has no longer prefix)', () => {
    const result = handleKeyEvent(keyEvent('w'), 'm', sequences, 500);
    expect(result.action).toBe(watchLater);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
    expect(result.shouldPrevent).toBe(true);
  });

  it('returns action for unambiguous exact match (ms)', () => {
    const result = handleKeyEvent(keyEvent('s'), 'm', sequences, 500);
    expect(result.action).toBe(subscribe);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
  });

  it('keeps building sequence for prefix with no exact match (g)', () => {
    const result = handleKeyEvent(keyEvent('g'), '', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('g');
    expect(result.shouldPrevent).toBe(false);
  });

  it('resets on no match (mx)', () => {
    const result = handleKeyEvent(keyEvent('x'), 'm', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
    expect(result.shouldPrevent).toBe(false);
  });

  it('ignores modifier keys', () => {
    const result = handleKeyEvent(keyEvent('Shift'), 'g', sequences, 500);
    expect(result.action).toBeNull();
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('g');
  });

  it('fires gh immediately (no longer prefix)', () => {
    const result = handleKeyEvent(keyEvent('h'), 'g', sequences, 500);
    expect(result.action).toBe(goHome);
    expect(result.pendingAction).toBeNull();
    expect(result.newSeq).toBe('');
  });
});
