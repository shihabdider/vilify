# Iteration

anchor: 45730a8dd820d96ef2988e75368e7219d9db079a
started: 2026-02-10T04:32:52-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Loading screen injection for Google: The original Google page flashes before the Vilify overlay appears because (1) LOADING_CSS only hides YouTube-specific selectors, (2) loading styles are injected at DOMContentLoaded (too late), and (3) the hiding class targets `body` which doesn't exist at `document_start`.

## Data Definition Plan

No data definition changes. Fix is behavioral:
1. Add Google-specific selectors to LOADING_CSS
2. Support `html.vilify-loading` selector (works at document_start before body exists)
3. In content.js, inject loading styles + hiding class immediately at document_start
