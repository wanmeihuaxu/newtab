// 监听来自background脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content脚本收到消息:', message);
  
  if (message.action === 'getPageIcon') {
    getPageIconAsBase64()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => {
        console.error('获取或转换图标失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }
  
  return false;
});

// 带超时的fetch包装
function fetchWithTimeout(url, { timeout = 2000, json = false } = {}) {
  return Promise.race([
    fetch(url).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return json ? r.json() : r.blob();
    }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeout))
  ]);
}

// 将blob转换为base64
function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// 将图片URL转换为base64格式
function convertImageToBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      canvas.getContext('2d').drawImage(img, 0, 0, 128, 128);
      resolve(canvas.toDataURL('image/png'));
      canvas.remove();
    };
    img.onerror = () => reject(new Error('图片加载失败'));
    img.src = url;
  });
}

// 从页面中获取所有图标URL
function getIconUrlsFromPage() {
  return [...document.querySelectorAll('link')]
    .filter(tag => /^(shortcut )?icon$/i.test(tag.getAttribute('rel')))
    .map(tag => tag.getAttribute('href'))
    .filter(Boolean)
    .map(href => new URL(href, window.location.origin).href);
}

// 获取页面图标并转换为base64格式
async function getPageIconAsBase64() {
  const { origin, hostname } = window.location;
  
  const strategies = [
    // xxapi.cn 接口
    async () => {
      const json = await fetchWithTimeout(`https://v2.xxapi.cn/api/ico?url=${encodeURIComponent(origin)}`, { json: true });
      if (json.code !== 200 || !json.data) throw new Error(json.msg || 'API返回错误');
      return convertImageToBase64(json.data);
    },
    // 本地页面图标
    async () => {
      for (const url of getIconUrlsFromPage()) {
        try { return await convertImageToBase64(url); } catch (e) { /* continue */ }
      }
      throw new Error('无可用的本地图标');
    },
    // 默认 favicon.ico
    () => convertImageToBase64(`${origin}/favicon.ico`)
  ];
  
  for (const strategy of strategies) {
    try { return await strategy(); } catch (e) { console.log('图标获取策略失败:', e.message); }
  }
  
  throw new Error('所有图标获取策略均失败');
}
