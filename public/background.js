let activeTabId = null;
let activeDomain = null;
let startTime = null;
let trackingEnabled = true;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'toggleTracking') {
    trackingEnabled = message.enabled;
    chrome.storage.local.set({ tracking_enabled: trackingEnabled });
  }
  if (message.action === 'syncTrackingState') {
    sendResponse({ trackingEnabled });
    return true;
  }
});

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await logTime();
  const tab = await chrome.tabs.get(activeInfo.tabId);
  updateState(tab);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.status === 'complete') {
    logTime();
    updateState(tab);
  }
});

chrome.idle.onStateChanged.addListener((newState) => {
  if (newState !== 'active') logTime();
});

async function updateState(tab) {
  try {
    if (!tab || typeof tab.url !== 'string') return;
    try {
      const url = new URL(tab.url);
      activeTabId = tab.id;
      activeDomain = url.hostname;
      startTime = Date.now();
    } catch (innerErr) {
      console.warn("Invalid URL encountered:", tab.url);
    }
  } catch (err) {
    console.warn("Failed to process tab info:", err);
  }
}

async function logTime() {
  if (!trackingEnabled || !activeDomain || !startTime) return;
  const duration = Date.now() - startTime;
  const data = await chrome.storage.local.get([activeDomain]);
  const prev = data[activeDomain] || 0;
  await chrome.storage.local.set({ [activeDomain]: prev + duration });
}
