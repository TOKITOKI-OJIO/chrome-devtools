console.log("Content script is running!");

// Simulate an
console.error("This is a test");

(function () {
  const targetUrl1 = "/web/v1/search/notes"; // 替换为你要监听的接口URL
  const targetUrl2 = "xiaohongshu"; // 替换为你要监听的接口URL

  chrome.webRequest.onBeforeRequest.addListener(
    function (details) {
      console.log("onBeforeRequest", details);
      if (
        details.url.includes(targetUrl1) &&
        details.url.includes(targetUrl2)
      ) {
        console.log("Request to:", details.url);
        console.log("Request headers:", details.requestHeaders);
      }
    },
    { urls: [targetUrl] },
    ["blocking", "requestHeaders"]
  );

  chrome.webRequest.onCompleted.addListener(
    function (details) {
      if (
        details.url.includes(targetUrl1) &&
        details.url.includes(targetUrl2)
      ) {
        console.log("Response from:", details.url);
        fetch(details.url)
          .then((response) => response.json())
          .then((data) => {
            console.log("Response data:", data);
          })
          .catch((error) => console.error("Error:", error));
      }
    },
    { urls: [targetUrl] }
  );
})();
