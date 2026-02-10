# Iteration

anchor: a89e5fc8579d9966d266d729980ce7a292ecbec6
started: 2026-02-10T13:59:37-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Vilify's manifest.json matches `*://www.google.com/*` which causes the extension to load on ALL google.com services (Maps, Docs, etc.). It should only activate on Google Search results pages (`/search`).

## Data Definition Plan

No data definition changes needed. This is a configuration/URL-matching restriction:
1. Narrow manifest.json match patterns to `/search*` paths only
2. Add pathname guard in `getSiteConfig()` in content.js
3. Update `matches` array in googleConfig
4. Add tests for URL filtering
5. Version bump
