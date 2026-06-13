/**
 * 浏览器插件 Background Service Worker
 * API 通信、HMAC 签名、消息路由
 */

const API_BASE_URL = 'http://localhost:8000/api/v1';

interface ApiKeyConfig {
  key: string;
  serverUrl: string;
}

async function getConfig(): Promise<ApiKeyConfig> {
  const result = await chrome.storage.local.get(['apiKey', 'serverUrl']);
  return {
    key: result.apiKey || '',
    serverUrl: result.serverUrl || API_BASE_URL,
  };
}

async function sendToServer(productData: unknown): Promise<{ success: boolean; error?: string }> {
  const config = await getConfig();
  if (!config.key) {
    return { success: false, error: '请先在插件设置中配置 API 密钥' };
  }

  try {
    const response = await fetch(`${config.serverUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.key,
      },
      body: JSON.stringify(productData),
    });

    const json = await response.json();
    return { success: json.success, error: json.error?.message };
  } catch (err: any) {
    return { success: false, error: err.message || '网络错误' };
  }
}

// 监听来自 popup 或 content script 的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'collect') {
    // 向当前活动标签页发送提取请求
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      if (!tabs[0]?.id) {
        sendResponse({ success: false, error: '无法获取当前页面' });
        return;
      }

      chrome.tabs.sendMessage(tabs[0].id, { action: 'extract' }, async (extracted) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: '请在 Ozon 商品详情页使用此功能' });
          return;
        }

        if (extracted?.success && extracted.data) {
          const result = await sendToServer(extracted.data);
          sendResponse(result);
        } else {
          sendResponse({ success: false, error: '商品信息提取失败' });
        }
      });
    });
    return true; // 保持消息通道开启
  }
});
