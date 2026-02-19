// Tests for :help command palette entry in Google config

import { describe, it, expect, vi } from 'vitest';

vi.stubGlobal('document', {
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
});

const mockLocation = { href: 'https://www.google.com/search?q=test', pathname: '/search', search: '?q=test' };
vi.stubGlobal('window', { location: mockLocation });
vi.stubGlobal('location', mockLocation);

vi.mock('../../core/actions', () => ({
  copyToClipboard: vi.fn(),
  copyImageToClipboard: vi.fn(),
}));

vi.mock('../../core/help-window', () => ({
  openHelpWindow: vi.fn(),
}));

const { googleConfig } = await import('./index');
import { openHelpWindow } from '../../core/help-window';

describe('googleConfig.getCommands - :help palette entry', () => {
  it('returns a non-empty commands array', () => {
    const commands = googleConfig.getCommands({});
    expect(Array.isArray(commands)).toBe(true);
    expect(commands.length).toBeGreaterThan(0);
  });

  it('includes a :help command entry', () => {
    const commands = googleConfig.getCommands({});
    const helpCmd = commands.find((c: any) => c.keys === ':help');
    expect(helpCmd).toBeDefined();
    expect(helpCmd.label).toBe('Show keybind help');
    expect(helpCmd.icon).toBe('?');
  });

  it(':help command entry calls openHelpWindow', () => {
    const commands = googleConfig.getCommands({});
    const helpCmd = commands.find((c: any) => c.keys === ':help');
    helpCmd.action();
    expect(openHelpWindow).toHaveBeenCalled();
  });
});
