---
id: issue-0021
status: done
type: feature
mode: HITL
source_prd: .htdp/prds/prd-0001-omnibar-reset.md
depends_on: []
remote:
  github: null
---

# Refine omnibar colors into a syntax-like Vim palette

## What to build

Refine the omnibar palette so it no longer reads as mostly one blue/cyan color. Use Vim-like syntax color hierarchy to distinguish command prefixes, keywords, examples, descriptions, row kinds, warnings, and the selected row. The picker should stay restrained and text-first, but should look closer to the provided reference screenshot where syntax elements are visibly differentiated by color.

Source screenshots from the feedback:

- Current Vilify picker: `/var/folders/vb/vpcg5jdd3xsbq6xd77tv1x0jdgfsjw/T/pi-clipboard-41d48444-72dc-4db2-8340-520ec8a50ced.png`
- Reference syntax-color direction: `/var/folders/vb/vpcg5jdd3xsbq6xd77tv1x0jdgfsjw/T/pi-clipboard-2ebd67c3-e4c9-4bf1-94c0-c359a842811a.png`

## Acceptance examples

- [x] Given the default picker shows prefix help rows such as `s/{query}`, `t/{query}`, `n/{query}`, and `type text`, when colors render, then prefixes/keywords, placeholders, titles, examples, and descriptions are not all the same blue/cyan token.
- [x] Given a row is selected, when the highlight renders, then it uses a readable Vim-like highlight treatment that matches the reference direction better than the current loud monotone treatment.
- [x] Given navigation, search/transcript, video action, and status/unavailable rows render, when the user scans the list, then row purpose is distinguishable through color as well as text.
- [x] Given warning or unavailable status rows render, when colors render, then error emphasis is clear but does not dominate the whole picker or make normal text feel monochrome.

## Data definition impact

Implemented display-only theme/syntax definitions: `OmnibarThemeToken` syntax tokens, `OmnibarSyntaxPart`, syntax-part class mapping, and safe syntax-span rendering. Command/provider semantics were not changed for palette behavior.

## HtDP entry note

Completed. Future palette changes should stay presentation-only unless a new PRD expands product behavior.

## Verification

- `bun run build`
- `bun run test`
- DOM/CSS tests for semantic theme tokens and syntax-part classes.
- Manual screenshot review passed on 2026-04-29. Remaining visual note about result/input alignment was split to `issue-0024`.

## Blocked by

- None - done.

## HtDP iterations

- 2026-04-29: Implemented syntax-like Vim palette and syntax-part rendering through version `0.6.98`; symbolic verification passed and final human visual verification passed.

## Out of scope

- Configurable themes.
- Font-size/layout changes beyond completed readability pass; see `issue-0022`.
- Result/input column alignment polish; see `issue-0024`.
- Transcript fetching correctness; see `issue-0020`.
