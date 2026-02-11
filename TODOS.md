# TODOs - Google Site

1. **Loading screen injection** — Inject loading screen early so the original Google page doesn't flash before the Vilify overlay appears. Currently the loading CSS only hides YouTube-specific selectors (`ytd-app`, `#content`, etc.). Need to add Google-specific selectors and ensure the overlay is injected before the Google DOM renders.
2. **Show page number** — Display the current Google search results page number in the status bar (e.g., "Page 2"). Google's URL contains `&start=10` for page 2, etc.
3. [google] don't clear input
