<template>
  <div class="popup-container">
    <h2>添加到导航</h2>
    
    <form @submit.prevent="handleFormSubmit">
      <div class="form-group">
        <label for="site-name">网站名称:</label>
        <input 
          type="text" 
          id="site-name" 
          v-model="formData.name" 
          required 
          placeholder="自动获取"
        >
      </div>
      
      <div class="form-group">
        <label for="site-url">网站URL:</label>
        <input 
          type="url" 
          id="site-url" 
          v-model="formData.url" 
          required 
          placeholder="自动获取"
        >
      </div>
      
      <div class="form-group">
        <label for="site-icon">网站图标URL:</label>
        
        <div class="icon-preview">
          <img id="icon-preview-img" :src="formData.icon" alt="预览" v-if="formData.icon">
        </div>
      </div>
      
      <div class="form-actions">
        <button 
          type="submit" 
          id="save-btn" 
          :disabled="isSaving"
        >
          {{ isSaving ? '保存中...' : '添加到导航' }}
        </button>
      </div>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
// 引入localforage
import localforage from 'localforage';

// 初始化localforage
localforage.config({
  name: 'NewTab',
  storeName: 'localDatas',
  description: '存储网站图标'
});

// 表单数据
const formData = ref({
  name: '',
  url: '',
  icon: ''
});

// 保存状态
const isSaving = ref(false);

// 初始化
onMounted(() => {
  // 从当前标签页获取网站信息
  getCurrentTabInfo();
});

// 获取当前标签页信息
function getCurrentTabInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tab = tabs[0];
      const url = tab.url;
      const title = tab.title;
      
      // 自动填充表单
      formData.value.name = title;
      formData.value.url = url;
      
      // 尝试获取网站图标
      getSiteIcon(url);
    }
  });
}

// 发送消息给background脚本，获取页面图标
function getPageIconFromBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'getPageIcon'
    }, (response) => {
      if (response && response.success) {
        resolve(response.data);
      } else {
        console.error('Background获取图标失败:', response.error);
        // 如果获取失败，返回空字符串
        resolve('');
      }
    });
  });
}

// 获取网站图标
async function getSiteIcon(url) {
  // 直接从background获取base64格式的图标
  const base64Icon = await getPageIconFromBackground();
  if (base64Icon) {
    formData.value.icon = base64Icon;
  } else {
    // 如果获取失败，使用Google Favicon Service作为备选
    const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
    formData.value.icon = googleFaviconUrl;
  }
}

// 处理表单提交
async function handleFormSubmit() {
  // 显示加载状态
  isSaving.value = true;
  
  try {
    // 获取表单数据
    const siteName = formData.value.name.trim();
    const siteUrl = formData.value.url.trim();
    const iconBase64 = formData.value.icon.trim() || '';
    
    // 创建网站对象
    const site = {
      name: siteName,
      url: siteUrl,
      icon: '' // 先设为空，后面会设置为图标的键
    };
    
    // 如果有图标，将图标存储到localforage
    if (iconBase64) {
      // 使用网站URL的哈希值作为图标的键，避免直接使用URL
      const iconKey = `icon-${hashString(siteUrl)}`;
      // 存储图标到localforage
      await localforage.setItem(iconKey, iconBase64);
      // 设置网站对象的图标键
      site.icon = iconKey;
    }
    
    console.log('准备保存的网站数据:', site);
    
    // 保存到Chrome存储
    await saveSiteToStorage(site);
    
    // 显示成功消息
    alert('网站已成功添加到导航！');
    
    // 关闭弹出窗口
    window.close();
  } catch (error) {
    console.error('保存失败:', error);
    alert('保存失败，请重试！');
  } finally {
    // 恢复按钮状态
    isSaving.value = false;
  }
}

// 生成字符串的简单哈希值
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 转换为32位整数
  }
  return Math.abs(hash).toString(16);
}

// 保存网站到Chrome存储
function saveSiteToStorage(site) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['sites'], (result) => {
      const sites = result.sites || [];
      
      // 添加新网站
      sites.push(site);
      
      // 保存到存储
      chrome.storage.sync.set({ sites: sites }, () => {
        resolve();
      });
    });
  });
}
</script>

<style scoped>
.popup-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  width: 320px;
  padding: 16px;
  background-color: #f5f7fa;
  color: #333;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

h2 {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 16px;
  color: #0066cc;
  text-align: center;
  padding-bottom: 12px;
  border-bottom: 1px solid #eee;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #555;
}

.form-group input {
  width: 100%;
  padding: 10px 12px;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 6px;
  outline: none;
  transition: all 0.3s ease;
}

.form-group input:focus {
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.icon-preview {
  margin-top: 8px;
  text-align: center;
}

.icon-preview img {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #eee;
  object-fit: cover;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

#save-btn {
  width: 100%;
  padding: 10px 20px;
  font-size: 14px;
  background-color: #0066cc;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

#save-btn:hover:not(:disabled) {
  background-color: #0052a3;
  box-shadow: 0 2px 8px rgba(0, 102, 204, 0.3);
  transform: translateY(-1px);
}

#save-btn:disabled {
  background-color: #ccc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

#save-btn:active:not(:disabled) {
  transform: translateY(0);
}
</style>