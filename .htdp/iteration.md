# Iteration

anchor: e1baf5fdc26e02513b2337b2fade8dc7abf05c3c
started: 2026-02-10T13:59:37-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Google site loading is slow (~5s) because `waitForContent` in core/index.js uses hardcoded YouTube DOM selectors that never match on Google, causing a full timeout. Google's page config defines `waitForContent` but it's never consulted. Additionally, returning to previously visited pages requires a full reload.

## Data Definition Plan

No new data definitions needed. `PageConfig.waitForContent` already exists. Cache uses sessionStorage with existing `ContentItem[]` shape. Two changes:
1. Make `waitForContent` generic — use page config predicates
2. Add sessionStorage page cache for Google — instant render on revisit
