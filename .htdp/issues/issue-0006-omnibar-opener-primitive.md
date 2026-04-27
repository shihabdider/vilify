---
id: issue-0006
status: draft
type: feature
mode: AFK
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on:
  - issue-0005
remote:
  github: null
---

# Implement the omnibar opener and generic interaction primitive

## What to build

Implement the generic omnibar runtime: closed-state `:` opener, an unobtrusive Spotlight-like overlay, focused text input, result list, selected index, Enter execution, and Escape behavior. This slice can use a small static test mode or placeholder items; it does not need real YouTube providers yet.

Use these v1 defaults unless a later HITL review changes them: Escape in a nested mode pops to the previous mode; Escape at the root mode closes the omnibar. Transcript mode entry will be handled by selecting an item from the default mode, not by adding a prefix command in this slice.

## Acceptance examples

- [ ] Given Vilify is closed on a supported page and focus is not inside an editable target, when the user presses `:`, then the browser/site key event is prevented and the omnibar opens with its input focused.
- [ ] Given Vilify is closed on an unsupported page, when the user presses `:`, then Vilify does not open and does not prevent the key event.
- [ ] Given focus is in an `input`, `textarea`, `select`, or `contenteditable` element, when the user types `:`, then Vilify leaves the event alone.
- [ ] Given the omnibar is open, when the user types, then `query` updates and displayed results are recomputed from the active mode.
- [ ] Given the omnibar is open with multiple results, when the user uses result navigation keys, then `selectedIndex` stays in bounds and the selected row is visibly updated in Vilify's own DOM.
- [ ] Given the omnibar is open with a selected result, when the user presses Enter, then the selected item's action is invoked through the typed action executor.
- [ ] Given the omnibar is open at the root mode, when the user presses Escape, then the omnibar closes and normal site/browser keys work again.
- [ ] Given the omnibar is open in a nested mode, when the user presses Escape, then the mode stack pops back to the previous mode without mutating the target site's DOM.

## Data definition impact

Expected new data definitions:

- `OmnibarState` with `open`, `query`, `selectedIndex`, and `modeStack`.
- `OmnibarModeId` or equivalent stable mode identifier.
- Minimal `OmnibarItem` and `OmnibarAction` definitions sufficient for placeholder commands and Enter execution.
- Small input/event helper definitions for editable-target detection and key handling outcomes.

## HtDP entry note

Phase 0 problem statement: build Vilify's one custom UI primitive without coupling it to YouTube provider work. The closed state must intercept only the opener key on supported pages, and the open state must own text input, result navigation, Enter, and Escape. Keep all DOM mutations inside Vilify's own mounted omnibar root.

Constraints:

- Do not implement ambient multi-key bindings beyond the `:` opener.
- Do not hide, replace, or scrape target-site UI.
- Do not add site-specific app state or page render hooks.
- Keep visual styling minimal and unobtrusive; detailed polish is out of scope.

## Verification

- `bun run build`
- `bun run test`
- jsdom tests for closed-state opener behavior, editable-target bypass, open-state query updates, selection bounds, Enter execution, Escape close, and nested-mode Escape pop.
- Manual YouTube watch-page smoke test that `:` opens the omnibar and all other closed-state keys remain native.

## Blocked by

- None beyond `depends_on`.

## HtDP iterations

- None yet.

## Out of scope

- Real YouTube navigation or video actions.
- Transcript retrieval or transcript search.
- Plugin/provider registry design beyond the minimum needed to supply placeholder items.
- Final visual design polish.
