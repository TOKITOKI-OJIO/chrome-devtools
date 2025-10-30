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

chrome.devtools.panels.create("demo panel", "icon.png", "panel.html", () => {
  console.log("user switched to this panel");
});

let recentData = [];

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

chrome.devtools.network.onRequestFinished.addListener((request) => {
  // request 是一个 HarEntry 对象

  // 1. 获取请求的基本信息
  const url = request.request.url;
  const method = request.request.method;
  const status = request.response.status;
  // 2. 尝试获取响应体内容
  // getContent 方法是异步的，它需要一个回调函数
  request.getContent((content, encoding) => {
    // 检查状态码和内容类型，只处理我们关心的请求
    if (
      status === 200 &&
      request.response.content.mimeType?.includes("application/json")
    ) {
      try {
        // 如果内容是 JSON，则解析它
        const jsonData = JSON.parse(content);

        // 3. 现在你可以对这些数据做任何事！
        // 例如：打印到 DevTools 的控制台（注意：这是扩展自己的后台控制台，不是页面的）
        // console.log(`监听到 API 返回: ${method} ${url}`, jsonData);

        if (url.indexOf("web/v1/search/notes") > -1) {
          console.log("redbook", url, request, jsonData);
          const postData = JSON.parse(request.request.postData.text);
          const keyword = postData.keyword;

          const items = jsonData.data.items || [];
          const cellData = items.map((item) => {
            const card = item?.note_card || "";
            const rt = {
              title: card?.display_title,
              usernamr: card?.user?.nickname,
              ...card?.interact_info,
            };
            return rt;
          });

          const storageData = {
            keyword,
            cellData,
            time: formatBeijingTime(),
          };

          // 添加到最近数据（限制数量）
          recentData.unshift(storageData);
          console.log(recentData, "recentData");
          if (recentData.length > 50) {
            recentData = recentData.slice(0, 50);
          }

          // 发送到 background.js
          chrome.runtime
            .sendMessage({
              type: "NEW_API_RESPONSE",
              data: storageData,
            })
            .catch((error) => {
              console.log("发送消息失败（可能 popup 未打开）:", error);
            });

          // 同时存储到 storage 供 popup 读取
          chrome.storage.local.set({
            recentData: recentData,
            lastUpdate: new Date().toISOString(),
          });
        }

        // 例如：将数据发送到你的面板进行处理和显示
        // 注意：这里不能直接操作 panel.html 的 DOM，需要通过 chrome.runtime API 通信
        chrome.runtime.sendMessage({
          type: "API_RESPONSE",
          data: {
            url: url,
            method: method,
            status: status,
            response: jsonData,
          },
        });
      } catch (e) {
        // 如果 JSON 解析失败
        console.warn(`解析响应失败 (${url}):`, e, content);
      }
    } else {
      // 对于非 JSON 或其他状态的请求，可以简单记录
      // console.log(`请求完成: ${method} ${url} [${status}]`);
    }
  });
});
