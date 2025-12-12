// 监听来自background脚本的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content脚本收到消息:', message);
  
  if (message.action === 'getPageIcon') {
    // 获取页面图标并转换为base64
    getPageIconAsBase64()
      .then(base64Icon => {
        sendResponse({ success: true, data: base64Icon });
      })
      .catch(error => {
        console.error('获取或转换图标失败:', error);
        sendResponse({ success: false, error: error.message });
      });
    
    // 保持消息通道开放，直到异步操作完成
    return true;
  }
  
  return false;
});

// 获取页面图标并转换为base64格式
async function getPageIconAsBase64() {
  try {
    // 1. 获取页面中所有的图标URL
    const iconUrls = getIconUrlsFromPage();
    
    // 2. 如果没有找到图标，使用默认的favicon路径
    if (iconUrls.length === 0) {
      iconUrls.push(`${window.location.origin}/favicon.ico`);
    }
    
    // 3. 尝试获取并转换第一个可用的图标
    for (const iconUrl of iconUrls) {
      try {
        const base64Icon = await convertImageUrlToBase64(iconUrl);
        return base64Icon;
      } catch (error) {
        console.error(`获取图标失败: ${iconUrl}`, error);
        // 尝试下一个图标URL
        continue;
      }
    }
    
    // 4. 如果所有图标都获取失败，使用Google Favicon Service作为备选
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=64`;
    return await convertImageUrlToBase64(googleFaviconUrl);
  } catch (error) {
    console.error('获取页面图标失败:', error);
    throw error;
  }
}

// 从页面中获取所有图标URL
function getIconUrlsFromPage() {
  const iconUrls = [];
  
  // 获取所有link标签
  const linkTags = document.querySelectorAll('link');
  
  // 查找rel属性为icon或shortcut icon的标签
  linkTags.forEach(tag => {
    const rel = tag.getAttribute('rel');
    if (rel && (rel.toLowerCase() === 'icon' || rel.toLowerCase() === 'shortcut icon')) {
      const href = tag.getAttribute('href');
      if (href) {
        // 如果是相对路径，转换为绝对路径
        const absoluteUrl = new URL(href, window.location.origin).href;
        iconUrls.push(absoluteUrl);
      }
    }
  });
  
  return iconUrls;
}

// 将图片URL转换为base64格式
function convertImageUrlToBase64(url) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    // 允许跨域图片
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      try {
        // 设置canvas大小
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        
        // 绘制图片
        ctx.drawImage(img, 0, 0, size, size);
        
        // 转换为base64
        const base64Data = canvas.toDataURL('image/png');
        resolve(base64Data);
        
        // 清理
        canvas.remove();
      } catch (error) {
        reject(new Error('图片绘制失败'));
      }
    };
    
    img.onerror = () => {
      reject(new Error('图片加载失败'));
    };
    
    img.src = url;
  });
}