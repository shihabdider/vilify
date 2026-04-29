---
id: issue-0021
status: draft
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

- [ ] Given the default picker shows prefix help rows such as `s/{query}`, `t/{query}`, `n/{query}`, and `type text`, when colors render, then prefixes/keywords, placeholders, titles, examples, and descriptions are not all the same blue/cyan token.
- [ ] Given a row is selected, when the highlight renders, then it uses a readable Vim-like highlight treatment that matches the reference direction better than the current loud monotone treatment.
- [ ] Given navigation, search/transcript, video action, and status/unavailable rows render, when the user scans the list, then row purpose is distinguishable through color as well as text.
- [ ] Given warning or unavailable status rows render, when colors render, then error emphasis is clear but does not dominate the whole picker or make normal text feel monochrome.

## Data definition impact

No command semantics should change. Expected presentational changes include clearer CSS theme tokens and possibly finer-grained row markup/spans for syntax parts such as prefix, placeholder, title, example label, and description. If the renderer needs a small display-only classification for syntax coloring, keep it separate from provider/action behavior.

## HtDP entry note

Phase 0 problem statement: follow up the completed Vim-inspired palette work with the user's visual feedback that the current picker is too monotone. Tune semantic colors and row text segmentation so the UI resembles a syntax-highlighted Vim buffer more than a single-color terminal list. This is visual polish only; do not broaden product scope or alter command behavior.

## Verification

- `bun run build`
- `bun run test`
- DOM/CSS tests for semantic theme tokens or syntax-part classes where useful.
- Manual screenshot review of default prefix help, filtered command results, selected rows, status/unavailable rows, and transcript results against the provided reference direction.

## Blocked by

- Human visual judgment is required before marking done; palette matching cannot be fully verified symbolically.

## HtDP iterations

- None yet.

## Out of scope

- Configurable themes.
- Font-size/layout changes; see `issue-0022`.
- Left marker/prefix-column behavior; see `issue-0023`.
- Transcript fetching correctness; see `issue-0020`.
