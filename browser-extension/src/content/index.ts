import { extractProduct } from './extractor';

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'extract') {
    try {
      const product = extractProduct();
      sendResponse({ success: true, data: product });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : '提取失败',
      });
    }
  }
  return false;
});
