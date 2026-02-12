// Loading screen - Show/hide loading overlay during initialization
// Following HTDP design from .design/BLUEPRINT.md

import { el } from './view';

/**
 * CSS for loading screen.
 * Injected early before DOM is ready.
 */
const LOADING_CSS = `
  body.vilify-loading ytd-app,
  body.vilify-loading #content,
  body.vilify-loading ytd-browse,
  body.vilify-loading ytd-watch-flexy,
  body.vilify-loading ytd-search,
  html.vilify-loading ytd-app,
  html.vilify-loading #content,
  html.vilify-loading ytd-browse,
  html.vilify-loading ytd-watch-flexy,
  html.vilify-loading ytd-search,
  body.vilify-loading #searchform,
  body.vilify-loading #rcnt,
  body.vilify-loading #rso,
  body.vilify-loading #appbar,
  body.vilify-loading #botstuff,
  body.vilify-loading footer,
  body.vilify-loading #top_nav,
  html.vilify-loading #searchform,
  html.vilify-loading #rcnt,
  html.vilify-loading #rso,
  html.vilify-loading #appbar,
  html.vilify-loading #botstuff,
  html.vilify-loading footer,
  html.vilify-loading #top_nav {
    visibility: hidden !important;
  }
  
  #vilify-loading-overlay {
    position: fixed; inset: 0; z-index: 99999999;
    background: var(--bg-1, #002b36);
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    font-family: var(--font-mono, 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Consolas', monospace);
  }
  #vilify-loading-overlay.hidden { display: none; }
  
  .vilify-loading-logo {
    width: 120px; height: 27px; margin-bottom: 24px;
    background-size: contain;
    background-repeat: no-repeat;
    background-position: center;
  }
  
  .vilify-loading-spinner {
    width: 32px; height: 32px;
    border: 3px solid var(--bg-3, #073642);
    border-top-color: var(--accent, #ff0000);
    border-radius: 50%;
    animation: vilify-spin 0.8s linear infinite;
  }
  @keyframes vilify-spin { to { transform: rotate(360deg); } }
  
  .vilify-loading-text {
    margin-top: 16px; color: var(--txt-3, #657b83); font-size: 14px;
  }
`;

/** Track if styles have been injected */
let stylesInjected = false;

/**
 * Inject loading CSS into document head.
 * Call early, before DOM ready.
 * [I/O]
 *
 * @example
 * injectLoadingStyles()  // Adds <style> to head
 */
export function injectLoadingStyles() {
  // Template: I/O - DOM mutation
  // Only inject once
  if (stylesInjected) return;

  const style = document.createElement('style');
  style.id = 'vilify-loading-styles';
  style.textContent = LOADING_CSS;

  // Inject into head (or documentElement if head not ready)
  const target = document.head || document.documentElement;
  target.appendChild(style);

  // Add vilify-loading class to html element immediately so hiding
  // works at document_start before <body> exists
  document.documentElement.classList.add('vilify-loading');

  stylesInjected = true;
}

/**
 * Show loading overlay with site theme.
 * Adds vilify-loading class to body to hide site content.
 * Creates overlay with spinner and optional site logo.
 * [I/O]
 *
 * @param {Object} siteConfig - Site configuration object
 * @param {Object} [siteConfig.theme] - Theme colors (accent, bg1, bg3, txt3)
 * @param {string} [siteConfig.logo] - Optional logo data URL or URL
 *
 * @example
 * showLoadingScreen(youtubeConfig)
 * // Creates overlay with bg1 background, accent spinner, optional logo
 */
export function showLoadingScreen(siteConfig) {
  // Template: I/O - DOM creation and mutation
  // Ensure styles are injected
  injectLoadingStyles();

  // Add loading class to body to hide site content
  document.body?.classList.add('vilify-loading');

  // Remove existing overlay if present
  const existing = document.getElementById('vilify-loading-overlay');
  if (existing) existing.remove();

  // Extract theme colors from config (use defaults if not provided)
  const theme = siteConfig?.theme || {};
  const bg1 = theme.bg1 || '#002b36';
  const bg3 = theme.bg3 || '#073642';
  const accent = theme.accent || '#ff0000';
  const txt3 = theme.txt3 || '#657b83';

  // Build overlay children
  const children = [];

  // Add logo if provided
  if (siteConfig?.logo) {
    const logoDiv = el('div', { class: 'vilify-loading-logo' }, []);
    logoDiv.style.backgroundImage = `url('${siteConfig.logo}')`;
    children.push(logoDiv);
  }

  // Add spinner
  const spinner = el('div', { class: 'vilify-loading-spinner' }, []);
  spinner.style.borderColor = bg3;
  spinner.style.borderTopColor = accent;
  children.push(spinner);

  // Add loading text
  const text = el('div', { class: 'vilify-loading-text' }, ['Loading...']);
  text.style.color = txt3;
  children.push(text);

  // Create overlay
  const overlay = el('div', { id: 'vilify-loading-overlay' }, children);
  overlay.style.background = bg1;

  // Append to body (or documentElement if body not ready)
  const target = document.body || document.documentElement;
  target.appendChild(overlay);
}

/**
 * Hide and remove loading overlay.
 * Removes vilify-loading class from body.
 * Fades out and removes overlay element.
 * [I/O]
 *
 * @example
 * hideLoadingScreen()
 * // Fades out and removes overlay element
 */
export function hideLoadingScreen() {
  // Template: I/O - DOM mutation and removal
  // Remove loading class from body and html
  document.body?.classList.remove('vilify-loading');
  document.documentElement.classList.remove('vilify-loading');

  // Find overlay
  const overlay = document.getElementById('vilify-loading-overlay');
  if (!overlay) return;

  // Add hidden class for fade transition
  overlay.classList.add('hidden');

  // Remove after brief delay to allow any CSS transition
  setTimeout(() => {
    overlay.remove();
  }, 100);
}

// Legacy exports for backward compatibility
export { showLoadingScreen as showLoading };
export { hideLoadingScreen as hideLoading };

// Test-only export for CSS content verification
export { LOADING_CSS as _LOADING_CSS_FOR_TEST };
