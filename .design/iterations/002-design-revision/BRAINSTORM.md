# Iteration 002: Design Revision

## Status: COMPLETE

**Date:** January 28, 2026

## Goal

Revise design documents after failed iteration 001.

## Behaviors

| ID | Behavior | Test Method | Status |
|----|----------|-------------|--------|
| B1 | DATA.md has all core types | Review document | ✓ |
| B2 | DATA.md has all YouTube types | Review document | ✓ |
| B3 | BLUEPRINT.md has all function signatures | Review document | ✓ |
| B4 | STYLES.md has TUI design language | Review document | ✓ |
| B5 | SCRAPING.md has verified YouTube selectors | Test selectors in DevTools | ✓ |

## Key Decisions

- Unified modal state (core owns field, sites extend values)
- Capture-phase keyboard handling
- Split AppState (core) + SiteState (site-specific)
- Module assignments in DATA.md "Where" column

## Outcome

Design docs updated. Ready for fresh implementation.
