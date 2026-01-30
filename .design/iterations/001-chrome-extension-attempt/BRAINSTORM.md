# Iteration 001: Chrome Extension Attempt

## Status: FAILED (Scrapped)

**Date:** January 28, 2026

## Goal

Convert working YouTube userscript into Chrome extension with modular architecture.

## What Was Tried

- Modular architecture (core/ + sites/youtube/)
- Mousetrap for keyboard handling
- esbuild for bundling
- Separation of concerns (state, layout, orchestration)

## What Went Wrong

1. Over-engineering from the start
2. Lost feature parity with userscript
3. Keyboard handling fundamentally broken (Mousetrap uses bubble phase, YouTube uses capture)
4. Ignored the working reference (userscript)
5. Data model drift

## Lessons Learned

- Use capture phase for keyboard (YouTube uses capture)
- Don't use Mousetrap
- Test frequently, one thing at a time
- Reference the working userscript

## Outcome

Scrapped. Started fresh in iteration 003.
