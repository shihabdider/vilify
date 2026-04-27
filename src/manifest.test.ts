import { describe, expect, it } from 'vitest';
import manifest from '../manifest.json';
import packageJson from '../package.json';

describe('manifest scaffold', () => {
  it('activates only the isolated content script and main-world YouTube bridge', () => {
    expect(manifest.version).toBe(packageJson.version);
    expect(packageJson.version).toBe('0.6.57');
    expect(manifest.version).toBe('0.6.57');
    expect(manifest.permissions ?? []).toEqual(['clipboardWrite']);
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(manifest.background).toBeUndefined();
    expect(manifest.action).toBeUndefined();

    expect(manifest.content_scripts).toHaveLength(2);
    expect(manifest.content_scripts.map((script: any) => script.js)).toEqual([
      ['dist/data-bridge.js'],
      ['dist/content.js'],
    ]);
    expect(manifest.content_scripts[0].world).toBe('MAIN');
    expect(manifest.content_scripts[1].world).toBeUndefined();
  });

  it('does not include Google match patterns', () => {
    const matches = manifest.content_scripts.flatMap((script: any) => script.matches);

    expect(matches).not.toContainEqual(expect.stringContaining('google'));
    expect(matches.every((pattern: string) => pattern.includes('youtube.com'))).toBe(true);
  });
});
