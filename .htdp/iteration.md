# Iteration

anchor: ded420bc0f8d4e1409d66a49f060df70099ee84a
started: 2026-02-11T11:55:00-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Add site favicons to Google web search result list items. Use Google's favicon service (https://www.google.com/s2/favicons?domain=DOMAIN&sz=32) to derive the favicon URL from the existing item.url at render time.

## Data Definition Plan

No data definition changes. Favicon URL derived from existing item.url in the renderer. Changes: renderGoogleItem in items.js (add img element), GOOGLE_ITEM_CSS (favicon styling).
