<template>
  <div class="popup-container">
    <div class="popup-header">
      <h2>添加到导航</h2>
    </div>
    
    <form @submit.prevent="handleFormSubmit">
      <div class="form-group">
        <label for="site-name">网站名称</label>
        <input 
          type="text" 
          id="site-name" 
          v-model="formData.name" 
          required 
          placeholder="自动获取"
        >
      </div>
      
      <div class="form-group">
        <label for="site-url">网站URL</label>
        <input 
          type="url" 
          id="site-url" 
          v-model="formData.url" 
          required 
          placeholder="自动获取"
        >
      </div>
      
      <div class="form-group">
        <label for="site-category">分类</label>
        <select id="site-category" v-model="formData.category">
          <option v-for="cat in categories" :key="cat.id" :value="cat.id">
            {{ cat.name }}
          </option>
        </select>
      </div>
      
      <div class="form-group" v-if="formData.icon">
        <label>图标预览</label>
        <div class="icon-preview">
          <img id="icon-preview-img" :src="formData.icon" alt="预览">
        </div>
      </div>
      
      <div class="form-actions">
        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="isSaving"
        >
          {{ isSaving ? '保存中...' : '添加到导航' }}
        </button>
      </div>
    </form>
    
    <div class="toast-container" v-if="showToast">
      <div class="toast" :class="toastType">
        {{ toastMessage }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive } from 'vue';
import localforage from 'localforage';

localforage.config({
  name: 'NewTab',
  storeName: 'localDatas',
  description: '存储网站图标'
});

const DEFAULT_CATEGORIES = [
  { id: 'default', name: '默认', color: '#6366f1' }
];

const formData = reactive({
  name: '',
  url: '',
  icon: '',
  category: 'default'
});

const categories = ref(DEFAULT_CATEGORIES);
const isSaving = ref(false);
const showToast = ref(false);
const toastMessage = ref('');
const toastType = ref('success');

function displayToast(message, type = 'success') {
  toastMessage.value = message;
  toastType.value = type;
  showToast.value = true;
  setTimeout(() => {
    showToast.value = false;
  }, 2000);
}

onMounted(() => {
  loadCategories();
  getCurrentTabInfo();
});

async function loadCategories() {
  try {
    const result = await new Promise(resolve => {
      chrome.storage.sync.get(['categories'], resolve);
    });
    
    if (result.categories && Array.isArray(result.categories)) {
      categories.value = result.categories;
    }
  } catch (error) {
    console.error('加载分类失败:', error);
  }
}

function getCurrentTabInfo() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs.length > 0) {
      const tab = tabs[0];
      const url = tab.url;
      const title = tab.title;
      
      formData.name = title;
      formData.url = url;
      
      getSiteIcon(url);
    }
  });
}

function getPageIconFromBackground() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({
      action: 'getPageIcon'
    }, (response) => {
      if (response && response.success) {
        resolve(response.data);
      } else {
        console.error('Background获取图标失败:', response?.error);
        resolve('');
      }
    });
  });
}

function isValidHostname(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  
  if (hostname.length < 3 || hostname.length > 255) return false;
  
  if (hostname.includes(' ')) return false;
  
  if (hostname.includes('..')) return false;
  
  if (!hostname.includes('.')) return false;
  
  const parts = hostname.split('.');
  if (parts.length < 2) return false;
  
  const tld = parts[parts.length - 1];
  if (tld.length < 2 || tld.length > 10) return false;
  
  if (/^[a-zA-Z]{2,}$/.test(tld) === false) return false;
  
  if (/^[^a-zA-Z0-9]/.test(hostname)) return false;
  if (/[^a-zA-Z0-9]$/.test(hostname)) return false;
  
  return true;
}

async function getSiteIcon(url) {
  const base64Icon = await getPageIconFromBackground();
  if (base64Icon) {
    formData.icon = base64Icon;
  } else {
    try {
      if (!url || typeof url !== 'string') {
        throw new Error('Invalid URL');
      }
      
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        throw new Error('URL must start with http:// or https://');
      }
      
      const parsedUrl = new URL(url);
      const hostname = parsedUrl.hostname;
      
      if (!isValidHostname(hostname)) {
        throw new Error('Invalid hostname');
      }
      
      const googleFaviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=64`;
      formData.icon = googleFaviconUrl;
    } catch (e) {
      console.error('解析URL失败:', e);
    }
  }
}

async function handleFormSubmit() {
  isSaving.value = true;
  
  try {
    const siteName = formData.name.trim();
    const siteUrl = formData.url.trim();
    const iconBase64 = formData.icon.trim() || '';
    
    const site = {
      name: siteName,
      url: siteUrl,
      icon: '',
      category: formData.category || 'default'
    };
    
    if (iconBase64) {
      const iconKey = `icon-${hashString(siteUrl)}`;
      await localforage.setItem(iconKey, iconBase64);
      site.icon = iconKey;
    }
    
    console.log('准备保存的网站数据:', site);
    
    await saveSiteToStorage(site);
    
    displayToast('网站已成功添加到导航！', 'success');
    
    setTimeout(() => {
      window.close();
    }, 1000);
  } catch (error) {
    console.error('保存失败:', error);
    displayToast('保存失败，请重试！', 'error');
  } finally {
    isSaving.value = false;
  }
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function saveSiteToStorage(site) {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['sites'], (result) => {
      const sites = result.sites || [];
      
      sites.push(site);
      
      chrome.storage.sync.set({ sites: sites }, () => {
        resolve();
      });
    });
  });
}
</script>

<style scoped>
.popup-container {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif;
  width: 340px;
  padding: 0;
  background: white;
  color: #1f2937;
  border-radius: 16px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.popup-header {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  padding: 16px 20px;
}

.popup-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

.popup-container form {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 10px 14px;
  font-size: 14px;
  border: 2px solid #e5e7eb;
  border-radius: 8px;
  outline: none;
  transition: all 0.2s ease;
  background: white;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group input::placeholder {
  color: #9ca3af;
}

.icon-preview {
  margin-top: 8px;
  text-align: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  border: 1px dashed #e5e7eb;
}

.icon-preview img {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background-color: #f3f4f6;
  object-fit: cover;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.form-actions {
  margin-top: 24px;
}

.btn {
  width: 100%;
  padding: 12px 24px;
  font-size: 14px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: white;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(99, 102, 241, 0.4);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.toast-container {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 100;
}

.toast {
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  animation: slideIn 0.3s ease;
}

.toast.success {
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: white;
}

.toast.error {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
