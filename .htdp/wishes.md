## Wish List

### Layer 3 (implement first)
- `getOmnibarViewDefinition(): OmnibarViewDefinition` in `src/omnibar/view.ts`
  Purpose: Define the scrollable results viewport, wrapped row text policy, and restrained Vim-inspired theme/kind/status tokens used by the omnibar renderer.
  Depends on: none
- `buildOmnibarStyleSheet(_definition: OmnibarViewDefinition): string` in `src/omnibar/view.ts`
  Purpose: Emit the omnibar CSS from explicit view/theme definitions, including fixed prompt/footer layout, scrollable result viewport, wrapped row text, and Vim-like color tokens.
  Depends on: none
- `ensureSelectedOmnibarRowVisible(_root: ParentNode, _adapter?: OmnibarSelectionVisibilityAdapter): void` in `src/omnibar/view.ts`
  Purpose: Find the selected result row in the scrollable results viewport and request nearest scrolling so keyboard selection never disappears behind the footer or outside the picker.
  Depends on: none
- `classForOmnibarItemKind(_kind: OmnibarItemKind): string` in `src/omnibar/view.ts`
  Purpose: Map each omnibar item kind to an explicit CSS class for navigation, command, video-scoped, search-result, and status styling.
  Depends on: none
- `classForOmnibarStatusTone(_tone: OmnibarStatusTone | undefined): string` in `src/omnibar/view.ts`
  Purpose: Map optional status tones to explicit CSS classes while returning a safe neutral class/no class for untinted rows.
  Depends on: none
- `parseYouTubeRootQueryIntent(_query: string): YouTubeRootQueryIntent` in `src/sites/youtube/query-intent.ts`
  Purpose: Parse open-omnibar YouTube root queries into default command filtering, `s/` YouTube search, `t/` transcript search, or `n/` navigation filtering intents.
  Depends on: none
- `buildYouTubeSearchUrl(_query: string): string` in `src/sites/youtube/query-intent.ts`
  Purpose: Build the URL-encoded YouTube search results URL for an `s/{query}` intent, handling empty or whitespace-only searches according to the provider policy.
  Depends on: none
- `deriveYouTubePageCapability(_context: ProviderContext): YouTubePageCapability` in `src/sites/youtube/capability.ts`
  Purpose: Derive live YouTube capability from ProviderContext, including current URL, watch video id, native video element availability, and whether video-scoped commands are actionable after SPA navigation.
  Depends on: none
- `satisfiesYouTubeCommandCapability(_capability: YouTubePageCapability, _requirement: YouTubeCommandCapabilityRequirement): boolean` in `src/sites/youtube/capability.ts`
  Purpose: Decide whether a command requirement (`always`, `watch-video`, or `native-video`) is satisfied by the current live YouTube capability.
  Depends on: none
- `filterYouTubeRootCommandsByIntent(_commands: readonly YouTubeRootCommand[], _intent: YouTubeRootQueryIntent): readonly YouTubeRootCommand[]` in `src/sites/youtube/default-mode.ts`
  Purpose: Apply query-intent-specific command filtering, including default fuzzy filtering and `n/{query}` navigation-only filtering.
  Depends on: none

### Layer 2
- `createYouTubeSearchIntentItem(_query: string): OmnibarItem` in `src/sites/youtube/default-mode.ts`
  Purpose: Create the generated action item for `s/{query}` that navigates to YouTube search results, or an appropriate concise status item for an empty search query.
  Depends on: buildYouTubeSearchUrl
- `availableYouTubeRootCommands(_commands: readonly YouTubeRootCommand[], _capability: YouTubePageCapability): readonly YouTubeRootCommand[]` in `src/sites/youtube/default-mode.ts`
  Purpose: Filter root command data by explicit scope/capability so non-actionable video-scoped commands are hidden from default command lists.
  Depends on: satisfiesYouTubeCommandCapability
- `getTranscriptSearchIntentItems(_context: ProviderContext, _query: string): readonly OmnibarItem[]` in `src/sites/youtube/default-mode.ts`
  Purpose: Return direct transcript search results for `t/{query}` on actionable watch pages, or one concise unavailable status on pages without a usable current video.
  Depends on: deriveYouTubePageCapability

### Layer 1
- `itemsForYouTubeRootIntent(_commands: readonly YouTubeRootCommand[], _capability: YouTubePageCapability, _intent: YouTubeRootQueryIntent, _context: ProviderContext): readonly OmnibarItem[]` in `src/sites/youtube/default-mode.ts`
  Purpose: Dispatch parsed YouTube root intents to capability-gated command lists, generated YouTube search items, direct transcript search results, or navigation-only filtering.
  Depends on: availableYouTubeRootCommands, filterYouTubeRootCommandsByIntent, createYouTubeSearchIntentItem, getTranscriptSearchIntentItems

### Layer 0 (implement last)
- `getYouTubeRootItems(_context: ProviderContext, _query: string): readonly OmnibarItem[]` in `src/sites/youtube/default-mode.ts`
  Purpose: Root provider entry point that recomputes live YouTube capability, parses the current query intent, and returns the correct root-mode items after pruning duplicate playback controls.
  Depends on: deriveYouTubePageCapability, parseYouTubeRootQueryIntent, itemsForYouTubeRootIntent

## Data Definitions Created/Modified
- `src/omnibar/types.ts`: added `OmnibarStatusTone`, added optional `tone?: OmnibarStatusTone` to `OmnibarItem`, and removed `playPause` / `setPlaybackRate` from `OmnibarAction`.
- `src/omnibar/view.ts`: added omnibar viewport, wrapping, selection visibility adapter, theme token, kind class, and status tone data definitions plus implementation stubs.
- `src/omnibar/runtime.ts`: added `selectionVisibilityAdapter` runtime option and delegated style, kind/status class, and selected-row visibility behavior to the new view stubs.
- `src/sites/youtube/capability.ts`: added `YouTubePageCapability`, `YouTubePageSurface`, and `YouTubeCommandCapabilityRequirement` definitions plus capability stubs.
- `src/sites/youtube/query-intent.ts`: added `YouTubeRootQueryIntent` discriminated union and query/search URL stubs.
- `src/sites/youtube/default-mode.ts`: replaced ad hoc item arrays with explicit `YouTubeRootCommand` data carrying scope/category/capability, pruned root playback shortcut commands, and added root-intent/provider stubs.
- `src/omnibar/actions.ts`: removed executor branches and helper functions for removed `playPause` and `setPlaybackRate` actions.
- `package.json`: bumped extension/package version from `0.6.79` to `0.6.80`.
- `manifest.json`: bumped extension manifest version from `0.6.79` to `0.6.80`.

## Assertion Changes Flagged
- `src/manifest.test.ts:8`: `expect(packageJson.version).toBe('0.6.79')` — expected package version must change to `0.6.80`.
- `src/manifest.test.ts:9`: `expect(manifest.version).toBe('0.6.79')` — expected manifest version must change to `0.6.80`.
- `src/omnibar/runtime.test.ts:206`: `expect(rowRule).toMatch(/white-space:\s*nowrap/)` — obsolete one-line row expectation; row title/subtitle/status text should wrap.
- `src/omnibar/runtime.test.ts:208-209`: selected-row assertions tied to old foreground/background variables need review for the new Vim-inspired theme tokens.
- `src/omnibar/runtime.test.ts:358` and `src/omnibar/runtime.test.ts:374`: exact child `className` arrays may need review because kind/status theme classes are now explicit.
- `src/sites/youtube/default-mode.test.ts:22`: old root inventory assertion includes removed playback controls and lacks capability-aware watch/non-watch contexts.
- `src/sites/youtube/default-mode.test.ts:65-81`: assertions for `youtube-video-play-pause`, relative seek, and playback-rate root commands are obsolete after pruning duplicate YouTube shortcuts.
- `src/sites/youtube/default-mode.test.ts:104-108`: old filtering expectations need review; playback-rate queries should no longer match, and transcript/copy-time results are now capability-gated.
- `src/omnibar/actions.test.ts:85` and `src/omnibar/actions.test.ts:91`: `playPause` execution assertions are obsolete because the action variant was removed.
- `src/omnibar/actions.test.ts:106-114`: missing-video assertion list includes removed `playPause` and `setPlaybackRate` actions and needs review.
- `src/omnibar/actions.test.ts:146-147`: `setPlaybackRate` execution assertion is obsolete because the action variant was removed.
- `src/sites/youtube/plugin.test.ts:90-99`: default transcript command assertion needs a capability-aware provider context or direct root-command-data assertion.
- `src/sites/youtube/transcript-mode.test.ts:539` and `src/sites/youtube/transcript-mode.test.ts:577`: root-to-transcript integration assertions need review for video capability gating and/or direct `t/{query}` prefix behavior.

## Assumptions / Interpretations
- I treated the configured `bun run build` verifier as the compiler source of truth; it remained clean after the type/data-definition pass, so I derived the wish list from the new data definitions and existing tests.
- I retained `OmnibarAction`'s `seek` variant and its existing `relative | absolute` mode because the requirement explicitly keeps transcript absolute seek behavior; only root-mode relative seek command data was pruned. Alternative: narrow `seek` to absolute-only and update executor/tests accordingly.
- I retained `OmnibarItemKind`'s `video-action` variant for compatibility and styling semantics, while making YouTube command video scope explicit in `YouTubeRootCommand.scope`/`capability`. Alternative: remove `video-action` entirely if no active provider should ever emit it.
- I modeled transcript entry and copy-URL-at-current-time as `native-video` capability requirements because the resolved requirement says video-scoped commands require an actionable watch video/native video. Alternative: transcript search could require only a watch video id and defer native-video checks to seek execution.
- I put the explicit `t/{query}` missing-video/unavailable status responsibility in `getTranscriptSearchIntentItems`; default command lists remain governed by capability filtering.
- I interpreted `n/{query}` as filtering commands whose `YouTubeRootCommand.category` is `navigation`, not as a global URL/history navigator.
- I added optional `OmnibarItem.tone` instead of changing every status item immediately, so existing item construction remains source-compatible while status styling can become explicit.
- I bumped `package.json` and `manifest.json` only; `package-lock.json` already contains stale `0.5.26` metadata and was not treated as the extension version source in this stub pass.

## Notes
- `bun run build` is clean after the stub pass.
- `bun run test` was run and fails as expected because new wish stubs intentionally throw; the observed run had 31 failing tests and 65 passing tests.
- No test files were edited in this stub pass, so `diff-check` was not run.
- Stubs intentionally contain `throw new Error("not implemented: ...")`; implementer should replace these with real logic and update/extend tests around the flagged assertions.
