// background.js - Service Worker

// 存储数据
let apiDataStore = [];

// 监听来自 devtools 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background 收到消息:", message.type);

  if (message.type === "NEW_API_RESPONSE") {
    // 存储数据
    apiDataStore.unshift(message.data);

    // 限制存储数量
    if (apiDataStore.length > 100) {
      apiDataStore = apiDataStore.slice(0, 100);
    }

    // 更新 storage，这样 popup 可以读取
    chrome.storage.local.set({
      apiData: apiDataStore,
      lastApiResponse: message.data,
      lastUpdate: new Date().toISOString(),
    });

    // 可以在这里发送通知等
    console.log("已存储 API 数据，总数:", apiDataStore.length);
  }

  if (message.type === "GET_ALL_DATA") {
    sendResponse({ data: apiDataStore });
  }

  if (message.type === "CLEAR_ALL_DATA") {
    apiDataStore = [];
    chrome.storage.local.set({ apiData: [] });
    sendResponse({ success: true });
  }

  return true; // 保持消息通道开放用于 sendResponse
});
