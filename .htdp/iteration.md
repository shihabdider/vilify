# Iteration

anchor: 513442edb0da32bad32aa647afe59911424449a0
started: 2026-02-10T13:59:37-05:00
mode: data-definition-driven
language: JavaScript
transparent: true

## Problem

Enable Google site support in Vilify. The Google site implementation already exists (scraper, items, index) but is disabled: the hostname check in content.js is commented out, and manifest.json lacks Google URL match patterns.

## Data Definition Plan

No data definition changes needed. This is a wiring/configuration change to enable existing code.
