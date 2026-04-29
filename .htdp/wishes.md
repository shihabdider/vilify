## Wish List

### Layer 2 (implement first)
- `shouldDiscardStaleTranscriptResult(request: TranscriptRequestIdentity, result: TranscriptResult): boolean` in `src/sites/youtube/transcript-mode.ts`
  Purpose: Decide whether a transcript bridge result is stale for the request/cache identity and must be discarded instead of stored as unavailable or loaded data.
  Depends on: none
- `loadStateFromResult(request: TranscriptRequestIdentity, result: Exclude<TranscriptResult, { readonly status: 'stale' }>): TranscriptSettledLoadState` in `src/sites/youtube/transcript-mode.ts`
  Purpose: Convert a fresh loaded/unavailable transcript result into the settled cache state for the request's video id.
  Depends on: none
- `applyTranscriptLoadSettlement(state: TranscriptProviderState, settlement: TranscriptLoadSettlement): void` in `src/sites/youtube/transcript-mode.ts`
  Purpose: Store fresh transcript settlements under their video cache key or remove stale loading slots so future calls can retry the active video.
  Depends on: none
- `createSyntaxLikeOmnibarThemeTokens(): Record<OmnibarThemeToken, string>` in `src/omnibar/view.ts`
  Purpose: Return differentiated Vim-like color tokens for prefix, keyword, example, description, kind, status, and selected-row states.
  Depends on: none
- `createReadableOmnibarLayoutDefinition(): OmnibarLayoutDefinition` in `src/omnibar/view.ts`
  Purpose: Return larger readable font/line-height/panel/spacing bounds that keep the omnibar compact and viewport-bounded.
  Depends on: none
- `deriveOmnibarRowMarker(item: OmnibarItem, query: string): OmnibarRowMarker` in `src/omnibar/view.ts`
  Purpose: Resolve the display-only row marker from explicit item display metadata or active prefix query context, never from action semantics.
  Depends on: none
- `deriveOmnibarSyntaxParts(item: OmnibarItem): readonly OmnibarSyntaxPart[]` in `src/omnibar/view.ts`
  Purpose: Segment item title/subtitle display text into syntax-highlightable prefix, placeholder, keyword/example/description/status/title parts.
  Depends on: none
- `renderOmnibarSyntaxText(document: Document, className: string, fallbackText: string, parts: readonly OmnibarSyntaxPart[]): HTMLSpanElement` in `src/omnibar/view.ts`
  Purpose: Render syntax parts as semantic spans using stable omnibar syntax classes while preserving the fallback text content.
  Depends on: none
- `applyYouTubePrefixDisplayMetadata(items: readonly OmnibarItem[], intent: YouTubeRootPrefixIntent): readonly OmnibarItem[]` in `src/sites/youtube/default-mode.ts`
  Purpose: Attach display-only prefix marker metadata (`s/`, `t/`, or `n/`) to rows produced by prefixed YouTube root intents without changing actions.
  Depends on: none

### Layer 1
- `settleTranscriptLoadResult(request: TranscriptRequestIdentity, result: TranscriptResult): TranscriptLoadSettlement` in `src/sites/youtube/transcript-mode.ts`
  Purpose: Classify transcript bridge results into fresh cache stores or stale discard/retry settlements using the request identity.
  Depends on: shouldDiscardStaleTranscriptResult, loadStateFromResult
- `getOmnibarViewDefinition(): OmnibarViewDefinition` in `src/omnibar/view.ts`
  Purpose: Compose the static viewport/text class definitions with the syntax-like theme tokens and readable layout tokens.
  Depends on: createSyntaxLikeOmnibarThemeTokens, createReadableOmnibarLayoutDefinition
- `renderItem(item: OmnibarItem, selected: boolean): HTMLDivElement` in `src/omnibar/runtime.ts`
  Purpose: Render an omnibar row using display-only prefix markers and syntax-highlighted text, replacing bare status `!` markers.
  Depends on: deriveOmnibarRowMarker, deriveOmnibarSyntaxParts, renderOmnibarSyntaxText
- `itemsForYouTubeRootIntent(commands: readonly YouTubeRootCommand[], capability: YouTubePageCapability, intent: YouTubeRootQueryIntent, context: ProviderContext): readonly OmnibarItem[]` in `src/sites/youtube/default-mode.ts`
  Purpose: Route prefixed YouTube root intent results through prefix display metadata while preserving command filtering/search/transcript semantics.
  Depends on: applyYouTubePrefixDisplayMetadata

### Layer 0 (implement last)
- `startTranscriptLoad(state: TranscriptProviderState, createBridgeClient: (context: ProviderContext) => YouTubeBridgeClient, context: ProviderContext, videoId: string): readonly OmnibarItem[]` in `src/sites/youtube/transcript-mode.ts`
  Purpose: Start transcript fetches under the current request identity and settle async responses via discard/retry-aware transcript settlements.
  Depends on: settleTranscriptLoadResult, applyTranscriptLoadSettlement

## Data Definitions Created/Modified
- `src/sites/youtube/transcript-mode.ts`: revised `TranscriptRequestIdentity` with `activeVideoIdAtRequest`, removed cached `stale` as a terminal `TranscriptLoadState`, added `TranscriptSettledLoadState`, and revised `TranscriptLoadSettlement` to model `store` vs `discard-stale` with `retryVideoId`.
- `src/omnibar/types.ts`: uses display-only `OmnibarRowMarker`, `OmnibarItemDisplay`, and `OmnibarSyntaxPart` definitions to keep marker/theme presentation separate from command/action semantics.
- `src/omnibar/view.ts`: `OmnibarThemeToken`, `OmnibarThemeDefinition`, and `OmnibarLayoutDefinition` are the explicit syntax/theme and type-scale/layout token data definitions; `getOmnibarViewDefinition` now delegates token/layout construction to stubs.
- `src/sites/youtube/query-intent.ts`: `YouTubeRootQueryIntent` already carries explicit `prefix` data for `s/`, `t/`, and `n/`; tests now assert this prefix context.
- `src/sites/youtube/default-mode.ts`: prefixed root intents now pass result rows through the display-only `applyYouTubePrefixDisplayMetadata` stub.
- `src/omnibar/runtime.ts`: row rendering now structurally depends on row marker and syntax-part stubs instead of hard-coding a status `!` marker.
- `manifest.json`, `package.json`, `src/manifest.test.ts`: already at the required `0.6.84` version in the inspected baseline; no further bump beyond `0.6.84` was made.

## Assertion Changes Flagged
```text
  - src/omnibar/runtime.test.ts:183:     expect(panelRule).toMatch(/width:\s*min\((?:7[2-9]|8[0-8])ch,/);
  + src/omnibar/runtime.test.ts:183:     expect(rootRule).toMatch(/--vilify-omnibar-font-size:\s*(?:1[6-9]px|clamp\()/);
  + src/omnibar/runtime.test.ts:184:     expect(rootRule).toMatch(/--vilify-omnibar-panel-width:\s*min\((?:8[8-9]|9[0-6])ch,\s*calc\(100vw - 2rem\)\)/);
  + src/omnibar/runtime.test.ts:185:     expect(panelRule).toMatch(/width:\s*var\(--vilify-omnibar-panel-width\)/);
  - src/omnibar/runtime.test.ts:420:     expect(row.querySelector('.vilify-omnibar-kind')?.textContent).toBe('!');
  + src/omnibar/runtime.test.ts:422:     expect(row.querySelector('.vilify-omnibar-kind')?.textContent).toBe('');
  + src/omnibar/runtime.test.ts:423:     expect(row.querySelector('.vilify-omnibar-kind')?.textContent).not.toBe('!');
  + src/omnibar/runtime.test.ts:455:     expect(itemRow(dom.window.document, 'transcript-loading').querySelector('.vilify-omnibar-kind')?.textContent).toBe('t/');
  + src/omnibar/runtime.test.ts:456:     expect(itemRow(dom.window.document, 'youtube-search').querySelector('.vilify-omnibar-kind')?.textContent).toBe('s/');
  + src/omnibar/runtime.test.ts:457:     expect(resultsList(dom.window.document).textContent).not.toContain('!');
  + src/omnibar/view.test.ts:63:     expect(definition.theme.syntaxPartClasses).toEqual({
  - src/omnibar/view.test.ts:78:     expect(contrastRatio(definition.theme.tokens.selectionForeground, definition.theme.tokens.selectionBackground)).toBeGreaterThan(15);
  + src/omnibar/view.test.ts:100:     expect(contrastRatio(definition.theme.tokens.selectionForeground, definition.theme.tokens.selectionBackground)).toBeGreaterThan(10);
  + src/omnibar/view.test.ts:106:     expect(tokens.syntaxPrefix).toBe('#87ff5f');
  + src/omnibar/view.test.ts:107:     expect(tokens.syntaxKeyword).toBe('#ffd75f');
  + src/omnibar/view.test.ts:108:     expect(tokens.syntaxExample).toBe('#87d7ff');
  + src/omnibar/view.test.ts:109:     expect(tokens.syntaxDescription).toBe('#d7d7af');
  + src/omnibar/view.test.ts:110:     expect(tokens.syntaxKind).toBe('#ff87d7');
  + src/omnibar/view.test.ts:111:     expect(tokens.syntaxStatus).toBe('#ffaf00');
  + src/omnibar/view.test.ts:112:     expect(tokens.selectionBackground).toBe('#ffd75f');
  + src/omnibar/view.test.ts:113:     expect(new Set([
  + src/omnibar/view.test.ts:126:     expect(layout.baseFontSize).toMatch(/^(?:1[6-9]px|clamp\()/);
  + src/omnibar/view.test.ts:127:     expect(layout.lineHeight).toMatch(/^(?:1\.[4-9]|clamp\()/);
  + src/omnibar/view.test.ts:128:     expect(layout.panelWidth).toMatch(/^min\((?:8[8-9]|9[0-6])ch,\s*calc\(100vw - 2rem\)\)$/);
  + src/omnibar/view.test.ts:129:     expect(layout.panelMaxHeight).toMatch(/^min\((?:7[4-9]|8[0-5])vh,/);
  + src/omnibar/view.test.ts:130:     expect(layout.resultsMaxHeight).toMatch(/^min\((?:5[8-9]|6[0-8])vh,/);
  + src/omnibar/view.test.ts:131:     expect(layout.rowPadding).not.toBe('0.45rem 0.75rem');
  + src/omnibar/view.test.ts:145:     expect(deriveOmnibarRowMarker(item, 't/needle')).toEqual({ kind: 'prefix', prefix: 't/' });
  + src/omnibar/view.test.ts:146:     expect(deriveOmnibarSyntaxParts(item)).toEqual([
  + src/omnibar/view.test.ts:151:     expect(item.action).toBe(action);
  + src/omnibar/view.test.ts:162:     expect(element.className).toBe('vilify-omnibar-item-title');
  + src/omnibar/view.test.ts:163:     expect(element.textContent).toBe('t/{query} — search transcript');
  + src/omnibar/view.test.ts:164:     expect(Array.from(element.children).map((child) => child.className)).toEqual([
  - src/omnibar/view.test.ts:85:     expect(css).toContain('--vilify-omnibar-selection-bg: #ffff00;');
  + src/omnibar/view.test.ts:175:     expect(css).toContain('--vilify-omnibar-selection-bg: #ffd75f;');
  + src/omnibar/view.test.ts:177:     expect(css).toContain('--vilify-omnibar-syntax-prefix: #87ff5f;');
  + src/omnibar/view.test.ts:178:     expect(css).toContain('--vilify-omnibar-syntax-keyword: #ffd75f;');
  - src/omnibar/view.test.ts:106:     expect(relativeLuminance(definition.theme.tokens.selectionBackground)).toBeGreaterThan(0.9);
  + src/omnibar/view.test.ts:198:     expect(relativeLuminance(definition.theme.tokens.selectionBackground)).toBeGreaterThan(0.55);
  - src/omnibar/view.test.ts:108:     expect(contrastRatio(definition.theme.tokens.selectionForeground, definition.theme.tokens.selectionBackground)).toBeGreaterThan(15);
  + src/omnibar/view.test.ts:200:     expect(contrastRatio(definition.theme.tokens.selectionForeground, definition.theme.tokens.selectionBackground)).toBeGreaterThan(10);
  - src/sites/youtube/default-mode.test.ts:235:     expect(ids(getYouTubeRootItems(context, 'n/home'))).toEqual(['youtube-nav-home']);
  + src/sites/youtube/default-mode.test.ts:235:     expect(getYouTubeRootItems(context, 'n/home')).toEqual([
  - src/sites/youtube/query-intent.test.ts:12:     expect(parseYouTubeRootQueryIntent('s/lofi beats')).toEqual({ kind: 'youtube-search', query: 'lofi beats' });
  - src/sites/youtube/query-intent.test.ts:13:     expect(parseYouTubeRootQueryIntent('t/needle phrase')).toEqual({ kind: 'transcript-search', query: 'needle phrase' });
  - src/sites/youtube/query-intent.test.ts:14:     expect(parseYouTubeRootQueryIntent('n/home')).toEqual({ kind: 'navigation-filter', query: 'home' });
  - src/sites/youtube/query-intent.test.ts:15:     expect(parseYouTubeRootQueryIntent('s/a/b/c')).toEqual({ kind: 'youtube-search', query: 'a/b/c' });
  + src/sites/youtube/query-intent.test.ts:12:     expect(parseYouTubeRootQueryIntent('s/lofi beats')).toEqual({ kind: 'youtube-search', query: 'lofi beats', prefix: 's/' });
  + src/sites/youtube/query-intent.test.ts:13:     expect(parseYouTubeRootQueryIntent('t/needle phrase')).toEqual({ kind: 'transcript-search', query: 'needle phrase', prefix: 't/' });
  + src/sites/youtube/query-intent.test.ts:14:     expect(parseYouTubeRootQueryIntent('n/home')).toEqual({ kind: 'navigation-filter', query: 'home', prefix: 'n/' });
  + src/sites/youtube/query-intent.test.ts:15:     expect(parseYouTubeRootQueryIntent('s/a/b/c')).toEqual({ kind: 'youtube-search', query: 'a/b/c', prefix: 's/' });
  - src/sites/youtube/query-intent.test.ts:19:     expect(parseYouTubeRootQueryIntent('s/')).toEqual({ kind: 'youtube-search', query: '' });
  - src/sites/youtube/query-intent.test.ts:20:     expect(parseYouTubeRootQueryIntent('t/   ')).toEqual({ kind: 'transcript-search', query: '   ' });
  - src/sites/youtube/query-intent.test.ts:21:     expect(parseYouTubeRootQueryIntent('n/')).toEqual({ kind: 'navigation-filter', query: '' });
  + src/sites/youtube/query-intent.test.ts:19:     expect(parseYouTubeRootQueryIntent('s/')).toEqual({ kind: 'youtube-search', query: '', prefix: 's/' });
  + src/sites/youtube/query-intent.test.ts:20:     expect(parseYouTubeRootQueryIntent('t/   ')).toEqual({ kind: 'transcript-search', query: '   ', prefix: 't/' });
  + src/sites/youtube/query-intent.test.ts:21:     expect(parseYouTubeRootQueryIntent('n/')).toEqual({ kind: 'navigation-filter', query: '', prefix: 'n/' });
  + src/sites/youtube/transcript-mode.test.ts:113:     expect(shouldDiscardStaleTranscriptResult(request, staleResult)).toBe(true);
  + src/sites/youtube/transcript-mode.test.ts:114:     expect(settleTranscriptLoadResult(request, staleResult)).toEqual({
  + src/sites/youtube/transcript-mode.test.ts:148:     expect(state.cacheByVideoId.has('retry-video-0020')).toBe(false);
  - src/sites/youtube/transcript-mode.test.ts:184:     expect(requests).toHaveLength(1);
  + src/sites/youtube/transcript-mode.test.ts:242:     expect(requests).toHaveLength(2);
  + src/sites/youtube/transcript-mode.test.ts:243:     expect(requests[1]).toMatchObject({ kind: 'get-transcript', videoId: 'resolver-old-video-0012' });
  + src/sites/youtube/transcript-mode.test.ts:551:     expect(requests).toHaveLength(2);
  + src/sites/youtube/transcript-mode.test.ts:552:     expect(requests[1]).toMatchObject({ kind: 'get-transcript', videoId: 'stale-response-video-0012' });

65 assertion change(s) flagged
```

## Assumptions / Interpretations
- The stale transcript requirement was interpreted as: stale bridge responses are never cached as terminal unavailable states; they remove/isolate the affected loading slot and allow a fresh request for the request/cache video id.
- The bridge client stale result shape was left unchanged; the provider settlement layer owns discard/retry cache policy because the bridge client itself does not cache transcript rows.
- The active prefix marker was interpreted as display text in the existing row kind/marker area; the selected-row cursor remains separate.
- The exact Vim-like color values in tests (`#87ff5f`, `#ffd75f`, `#87d7ff`, etc.) are an interpretation of the screenshot direction, since the issues do not specify exact colors.
- The readable type scale was interpreted as at least `16px` or a `clamp(...)`-based font size with a proportionally wider `88–96ch` panel and larger viewport-bounded result area.
- The required version bump was already present in `manifest.json`, `package.json`, and `src/manifest.test.ts` at `0.6.84`; I did not bump again to `0.6.85`.

## Notes
- `bun run build` passes after the Phase 1 stubs.
- `bun run test` is expected to fail in Phase 1; current failures are from the new/rewired stubs and updated expectations for issues 0020–0023.
- Pre-existing working tree changes in `.htdp/iteration.md` and `.htdp/status.md` were left untouched.
