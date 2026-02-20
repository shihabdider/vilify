const SUPPORTED_HOSTS = ['www.youtube.com', 'youtube.com', 'www.google.com', 'google.com'];

const RED_ICONS = { 16: '/icons/icon-16.png', 32: '/icons/icon-32.png' };
const GRAY_ICONS = { 16: '/icons/icon-gray-16.png', 32: '/icons/icon-gray-32.png' };

function updateIcon(tabId: number, url: string | undefined) {
  try {
    const host = url ? new URL(url).hostname : '';
    const active = SUPPORTED_HOSTS.includes(host);
    chrome.action.setIcon({ tabId, path: active ? RED_ICONS : GRAY_ICONS });
  } catch {
    chrome.action.setIcon({ tabId, path: GRAY_ICONS });
  }
}

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => updateIcon(tabId, tab.url));
});

chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
  updateIcon(tabId, tab.url);
});

// Add a listener for when the user clicks the extension's action button (the icon)
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    // Execute a script in the current tab to re-enable Vilify
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Remove the disabled flag from sessionStorage
        sessionStorage.removeItem('vilify-disabled');
        // Reload the page to re-initialize the content script
        window.location.reload();
      }
    });
  }
});
