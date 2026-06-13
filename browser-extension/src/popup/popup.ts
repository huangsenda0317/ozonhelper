/**
 * 插件 Popup UI
 * 采集按钮、状态展示、设置入口、API 密钥配置
 */

document.addEventListener('DOMContentLoaded', () => {
  const collectBtn = document.getElementById('collect-btn');
  const statusEl = document.getElementById('status');
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  const apiKeyInput = document.getElementById('api-key') as HTMLInputElement;
  const saveSettingsBtn = document.getElementById('save-settings');

  // 加载配置
  chrome.storage.local.get(['apiKey', 'serverUrl'], (result) => {
    if (apiKeyInput) apiKeyInput.value = result.apiKey || '';
  });

  // 采集按钮
  collectBtn?.addEventListener('click', () => {
    if (collectBtn) collectBtn.textContent = '采集中...';
    if (statusEl) statusEl.textContent = '';

    chrome.runtime.sendMessage({ action: 'collect' }, (response) => {
      if (collectBtn) collectBtn.textContent = '一键采集';
      if (statusEl) {
        if (response?.success) {
          statusEl.textContent = '✅ 采集成功！';
          statusEl.className = 'text-green';
        } else {
          statusEl.textContent = `❌ ${response?.error || '采集失败'}`;
          statusEl.className = 'text-red';
        }
      }
    });
  });

  // 设置面板切换
  settingsBtn?.addEventListener('click', () => {
    if (settingsPanel) {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    }
  });

  // 保存设置
  saveSettingsBtn?.addEventListener('click', () => {
    const key = apiKeyInput?.value?.trim() || '';
    chrome.storage.local.set({ apiKey: key }, () => {
      if (settingsPanel) settingsPanel.style.display = 'none';
      if (statusEl) {
        statusEl.textContent = '✅ 设置已保存';
        statusEl.className = 'text-green';
      }
    });
  });
});
