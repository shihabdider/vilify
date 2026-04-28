import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readRepoFile(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

describe('active v1 scope audit', () => {
  it('builds only the isolated omnibar content script and YouTube structured-data bridge', () => {
    const buildScript = readRepoFile('build.js');

    expect(buildScript).toContain("entryPoints: ['src/content.ts']");
    expect(buildScript).toContain("entryPoints: ['src/sites/youtube/main-world-bridge.ts']");
    expect(buildScript).not.toMatch(/src\/(core|sites\/google|sites\/youtube\/(app|focus|listing|drawer|comments?|watch-later|dismiss|subscribe))/i);
  });

  it('keeps the content script imports on the omnibar runtime and stateless plugin registry', () => {
    const contentScript = readRepoFile('src/content.ts');
    const importLines = contentScript.match(/^import .*$/gm) ?? [];
    const joinedImports = importLines.join('\n');

    expect(importLines).toEqual([
      "import { createOmnibarRuntime } from './omnibar/runtime';",
      "import { getActivePlugin, getPluginDefaultMode, sitePlugins } from './plugins/registry';",
      "import type { OmnibarActionExecutor, OmnibarMode } from './omnibar/types';",
      "import type { SitePlugin } from './plugins/types';",
    ]);
    expect(joinedImports).not.toMatch(/google|focus|listing|drawer|comments?|watch.?later|dismiss|subscribe|renderWatch|visible.?control/i);
  });

  it('documents the current product as a YouTube-wide omnibar rather than legacy multi-site focus mode', () => {
    const readme = readRepoFile('README.md');
    const todos = readRepoFile('TODOS.md');

    expect(readme).toContain('YouTube pages');
    expect(readme).toContain('Open the omnibar on supported YouTube pages with `:`');
    expect(readme).toContain('| Google pages | Out of active scope |');
    expect(readme).toContain('Full focus-mode/page replacement UI | Out of active scope');
    expect(readme).not.toMatch(/Supported Sites|Press `\/` to open|Want to add a new site|deep, site-specific/i);
    expect(todos).toContain('No Google or full focus-mode work is active in v1');
    expect(todos).toContain('YouTube-wide omnibar scope');
  });
});
