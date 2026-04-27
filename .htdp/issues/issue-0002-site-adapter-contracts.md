---
id: issue-0002
status: draft
type: architecture
mode: HITL
source_prd: null
source_architecture: .htdp/architecture/review-0001-render-site-boundaries.md
depends_on: []
remote:
  github: null
---

# Type the site adapter and app callback contracts

## What to build

Replace the broad `any`/`Function` surfaces at the core/site boundary with named data definitions for app callbacks, commands, key bindings, page lifecycle context, and site config hooks.

The goal is not strict TypeScript everywhere. The goal is to make the existing YouTube and Google adapter contracts explicit enough that adding or changing an app capability is compiler-guided rather than convention-guided.

## Acceptance examples

- [ ] Given YouTube and Google key sequence builders, when they receive app callbacks, then the callback object is typed as a named `AppCallbacks` contract rather than `any` or the public `App` object.
- [ ] Given a site page `onEnter` hook, when it updates site state or refreshes items, then its context is typed as a named lifecycle context with `getSiteState`, `updateSiteState`, `render`, and `refreshItems`.
- [ ] Given command palette builders, when they return commands, then commands have a named shape covering group headers, labels, keys, icons, and actions.
- [ ] Given `setupKeyboardEngine`, when it calls `config.getKeySequences`, then the config, state accessors, app callbacks, and key binding map no longer require `any`.
- [ ] Given a new app callback is added or renamed, when type checking runs, then all affected site adapters and tests are discoverable from type errors.

## Data definition impact

Expected new or changed definitions:

- `AppCallbacks`
- `Command` and/or `CommandGroup`
- `KeyBindingMap = Record<string, () => void>` or equivalent
- `PageLifecycleContext<S>`
- `NavigationDirection`, `PaletteMode`, and possibly `DrawerId`
- Incremental generic forms such as `SiteConfig<S = unknown>` and `PageConfig<S = unknown>` if useful

Avoid a large speculative plugin interface until the current two site adapters fit the named contracts.

## HtDP entry note

Phase 0 problem statement: the TypeScript migration added `src/types.ts`, but the most important extension seams still use `any`, `Function`, and index signatures. Add data definitions for the current contracts first, then migrate the existing call sites without behavior changes.

Constraints:

- Prefer the minimal named-contract approach first. Do not redesign the whole site plugin model unless the examples force it.
- Keep YouTube-specific optional capabilities explicit where they are truly optional.
- Do not fold this into the render transaction refactor except for shared context types.

## Verification

- `bun run build`
- `bun run test`
- Type-focused tests or compile checks for YouTube and Google configs satisfying the contract.
- `npx tsc --noEmit` after local dependencies include `@types/chrome`; current checkout blocks before code checking because that package is absent from `node_modules`.

## Blocked by

- Human review of how far to take generics now: minimal named contracts first, or a generic `SiteAdapter<S, PageType>` in one pass.

## HtDP iterations

- None yet.

## Out of scope

- Runtime behavior changes.
- Strict-mode TypeScript conversion for every file.
- Refactoring YouTube bridge/data internals.
