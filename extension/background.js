chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'CAPTURE') {
    chrome.tabs.captureVisibleTab(null, { format: 'jpeg', quality: 85 })
      .then(dataUrl => sendResponse({ ok: true, dataUrl }))
      .catch(() => sendResponse({ ok: false }));
    return true; // keeps channel open for async response
  }
});
