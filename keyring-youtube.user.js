// ==UserScript==
// @name         Keyring - YouTube
// @namespace    https://github.com/user/keyring
// @version      0.1.0
// @description  Cmd+K command palette for YouTube
// @author       user
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @grant        GM_setClipboard
// @run-at       document-end
// ==/UserScript==

(function () {
  'use strict';

  // ============================================
  // Styles - YouTube Dark Theme
  // ============================================
  const CSS = `
    :root {
      --yt-bg-primary: #0f0f0f;
      --yt-bg-secondary: #272727;
      --yt-bg-hover: #3f3f3f;
      --yt-text-primary: #f1f1f1;
      --yt-text-secondary: #aaaaaa;
      --yt-red: #ff0000;
      --yt-red-hover: #cc0000;
      --yt-border: #3f3f3f;
      --yt-font: 'Roboto', 'Arial', sans-serif;
    }

    #keyring-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: flex-start;
      justify-content: center;
      padding-top: 15vh;
      z-index: 9999999;
      font-family: var(--yt-font);
    }

    #keyring-overlay.open {
      display: flex;
    }

    #keyring-modal {
      width: 560px;
      max-width: 90vw;
      max-height: 70vh;
      background: var(--yt-bg-primary);
      border: 1px solid var(--yt-border);
      border-radius: 12px;
      box-shadow: 0 16px 48px rgba(0, 0, 0, 0.6);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    #keyring-header {
      background: var(--yt-bg-secondary);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--yt-border);
    }

    #keyring-header-logo {
      width: 24px;
      height: 24px;
      background: var(--yt-red);
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    #keyring-header-logo::before {
      content: '';
      width: 0;
      height: 0;
      border-left: 8px solid white;
      border-top: 5px solid transparent;
      border-bottom: 5px solid transparent;
      margin-left: 2px;
    }

    #keyring-header-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--yt-text-primary);
    }

    #keyring-input-wrapper {
      padding: 12px 16px;
      background: var(--yt-bg-primary);
      border-bottom: 1px solid var(--yt-border);
    }

    #keyring-input {
      width: 100%;
      padding: 10px 12px;
      background: var(--yt-bg-secondary);
      border: 1px solid var(--yt-border);
      border-radius: 8px;
      font-size: 14px;
      font-family: var(--yt-font);
      color: var(--yt-text-primary);
      outline: none;
    }

    #keyring-input::placeholder {
      color: var(--yt-text-secondary);
    }

    #keyring-input:focus {
      border-color: var(--yt-red);
    }

    #keyring-list {
      flex: 1;
      overflow-y: auto;
      max-height: 400px;
    }

    .keyring-group-label {
      padding: 12px 16px 8px;
      font-size: 11px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--yt-text-secondary);
      background: var(--yt-bg-primary);
    }

    .keyring-item {
      display: flex;
      align-items: center;
      padding: 10px 16px;
      cursor: pointer;
      font-size: 14px;
      color: var(--yt-text-primary);
      background: var(--yt-bg-primary);
    }

    .keyring-item:hover {
      background: var(--yt-bg-hover);
    }

    .keyring-item.selected {
      background: var(--yt-red);
    }

    .keyring-item.selected .keyring-shortcut kbd {
      background: rgba(255, 255, 255, 0.2);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .keyring-item.selected .keyring-meta {
      color: rgba(255, 255, 255, 0.8);
    }

    .keyring-icon {
      width: 32px;
      height: 32px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 16px;
      color: var(--yt-text-secondary);
      background: var(--yt-bg-secondary);
      border-radius: 6px;
    }

    .keyring-item.selected .keyring-icon {
      background: rgba(255, 255, 255, 0.2);
      color: white;
    }

    .keyring-label {
      flex: 1;
    }

    .keyring-meta {
      font-size: 12px;
      color: var(--yt-text-secondary);
      margin-left: 8px;
    }

    .keyring-shortcut {
      margin-left: 12px;
      display: flex;
      gap: 4px;
    }

    .keyring-shortcut kbd {
      background: var(--yt-bg-secondary);
      border: 1px solid var(--yt-border);
      border-radius: 4px;
      padding: 2px 6px;
      font-size: 11px;
      font-family: var(--yt-font);
      color: var(--yt-text-secondary);
    }

    #keyring-footer {
      display: flex;
      gap: 20px;
      padding: 10px 16px;
      background: var(--yt-bg-secondary);
      border-top: 1px solid var(--yt-border);
      font-size: 12px;
      color: var(--yt-text-secondary);
    }

    #keyring-footer kbd {
      background: var(--yt-bg-primary);
      border: 1px solid var(--yt-border);
      border-radius: 4px;
      padding: 2px 6px;
      margin: 0 4px;
      font-size: 11px;
    }

    .keyring-empty {
      padding: 40px;
      text-align: center;
      color: var(--yt-text-secondary);
      font-size: 14px;
    }

    .keyring-toast {
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--yt-bg-secondary);
      color: var(--yt-text-primary);
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 10000000;
      opacity: 0;
      transition: opacity 0.2s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
    }

    .keyring-toast.show {
      opacity: 1;
    }
  `;

  console.log('[Keyring] YouTube palette loaded');

})();
