importScripts('config.js');

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.sync.set(HABR_CONFIG.defaults);
  }
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'hiddenCounter' && sender.tab) {
    const count = message.count > 0 ? message.count.toString() : '';

    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: count
    });

    const badgeColor = message.isInverted ? '#0066cc' : '#666666';

    chrome.action.setBadgeBackgroundColor({
      tabId: sender.tab.id,
      color: badgeColor
    });
  }
});
