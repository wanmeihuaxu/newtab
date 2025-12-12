// 监听来自popup的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background收到消息:', message);
  
  if (message.action === 'getPageIcon') {
    // 获取当前活动标签页
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs.length === 0) {
        sendResponse({ success: false, error: '没有找到活动标签页' });
        return;
      }
      
      const activeTab = tabs[0];
      
      // 向content脚本发送消息，请求获取页面图标
      chrome.tabs.sendMessage(activeTab.id, { action: 'getPageIcon' }, (response) => {
        if (chrome.runtime.lastError) {
          console.error('发送消息到content脚本失败:', chrome.runtime.lastError);
          sendResponse({ success: false, error: '无法连接到content脚本' });
          return;
        }
        
        console.log('收到content脚本的响应:', response);
        
        if (response && response.success) {
          sendResponse({ success: true, data: response.data });
        } else {
          console.error('获取图标失败:', response.error);
          sendResponse({ success: false, error: response.error });
        }
      });
    });
    
    // 保持消息通道开放，直到异步操作完成
    return true;
  }
  
  return false;
});