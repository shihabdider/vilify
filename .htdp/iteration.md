# Iteration

anchor: e95821c9455e7c9024a15551ab70c1b83a8582d8
started: 2026-02-10T04:32:52-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

When pressing 'i' to enter search mode on Google pages, the search input is always empty. Instead, it should be pre-filled with the current Google search query (from URL `?q=` param) so users can easily append/modify their search. This applies to both web search and image search Google pages.

## Data Definition Plan

No data definition changes. UIState.searchQuery already holds a string. The change is behavioral: `openSearch` callback accepts an optional initial query, and Google's 'i' key sequence extracts `?q=` from URL and passes it.
