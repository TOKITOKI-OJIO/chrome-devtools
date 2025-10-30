chrome.action.onClicked.addListener((tab) => {
  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"],
  });
});

// background.js
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message, "backgroundjs");
  if (message.type === "error") {
    console.error("Caught an error from content script:", message.message);
    // Here you can add custom logic to handle the error, e.g., sending it to a server
  }
});

