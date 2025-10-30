// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// 存储数据
let apiDataStore = [];

function formatBeijingTime(date = new Date()) {
  // 转换为北京时间（UTC+8）
  const beijingOffset = 8 * 60; // 东八区，8小时 * 60分钟
  const localOffset = date.getTimezoneOffset(); // 本地时区偏移
  const beijingTimestamp =
    date.getTime() + (localOffset + beijingOffset) * 60 * 1000;
  const beijingDate = new Date(beijingTimestamp);

  const year = beijingDate.getFullYear();
  const month = String(beijingDate.getMonth() + 1).padStart(2, "0");
  const day = String(beijingDate.getDate()).padStart(2, "0");
  const hours = String(beijingDate.getHours()).padStart(2, "0");
  const minutes = String(beijingDate.getMinutes()).padStart(2, "0");
  const seconds = String(beijingDate.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// 使用示例

function aggregateData(data) {
  const aggregated = {};

  data.forEach((item) => {
    const keyword = item.keyword;

    if (!aggregated[keyword]) {
      aggregated[keyword] = {
        keyword: keyword,
        cellData: [],
        time: "",
        totalItems: 0,
      };
    }

    // 合并 cellData，过滤空对象
    const validCellData = item.cellData.filter(
      (cell) =>
        cell && (cell.title || cell.usernamr) && Object.keys(cell).length > 1
    );

    aggregated[keyword].cellData.push(...validCellData);
    aggregated[keyword].time = item.time;
    aggregated[keyword].totalItems += aggregated[keyword].cellData.length;
  });

  return Object.values(aggregated);
}
// 监听来自 devtools 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Background 收到消息:", message.type);

  if (message.type === "NEW_API_RESPONSE") {
    // 存储数据
    apiDataStore.unshift(message.data);
    apiDataStore = aggregateData(apiDataStore);
    // 限制存储数量
    if (apiDataStore.length > 100) {
      apiDataStore = apiDataStore.slice(0, 100);
    }

    // 可以在这里发送通知等
    console.log("已存储 API 数据，总数:", apiDataStore.length);
  }

  return true; // 保持消息通道开放用于 sendResponse
});

// popup.js
document.addEventListener("DOMContentLoaded", function () {
  const dataList = document.getElementById("dataList");
  const refreshBtn = document.getElementById("refreshBtn");
  const clearBtn = document.getElementById("clearBtn");
  const exportBtn = document.getElementById("exportBtn");

  // 加载数据
  loadData();

  // 刷新按钮
  refreshBtn.addEventListener("click", loadData);

  // 清空按钮
  clearBtn.addEventListener("click", clearData);
  exportBtn.addEventListener("click", exportData);

  // 监听 storage 变化（实时更新）
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.apiData) {
      loadData();
    }
  });

  function loadData() {
    displayData(apiDataStore);
  }

  function displayData(data) {
    if (data.length === 0) {
      dataList.innerHTML =
        '<div class="empty-state">暂无数据，请打开 DevTools 开始监控</div>';
      return;
    }

    dataList.innerHTML = data
      .map(
        (item) => `
            <div class="container">
        <h3>${item.keyword}</h3>
        <h4>${item.time}</h4>
        <p> <span class="count">total:${item.totalItems}</span></p>
    </div>
        `
      )
      .join("");
  }

  function clearData() {
    if (confirm("确定要清空所有数据吗？")) {
      // 通过 background.js 清空数据
      apiDataStore = [];
      displayData([]);
    }
  }

  function exportData() {
    const csvContent = [];
    const headers = [
      "关键词",
      "标题",
      "作者",
      "点赞数",
      "评论数",
      "收藏数",
      "转发数",
    ];

    csvContent.push(headers.join(","));

    apiDataStore.forEach((group) => {
      group.cellData.forEach((item) => {
        const row = [
          `"${group.keyword}"`,
          `"${(item.title || "").replace(/"/g, '""')}"`,
          `"${(item.usernamr || "").replace(/"/g, '""')}"`,
          parseInt(item.liked_count) || 0,
          parseInt(item.comment_count) || 0,
          parseInt(item.collected_count) || 0,
          parseInt(item.shared_count) || 0,
        ];
        csvContent.push(row.join(","));
      });
    });

    const csvString = "\uFEFF" + csvContent.join("\n");
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `数据聚合_${formatBeijingTime()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
});
