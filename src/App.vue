<template>
  <div class="app-container">
    <!-- 设置按钮 -->
    <div class="settings-btn-container">
      <button 
        id="settings-btn" 
        class="settings-btn" 
        @click="openBackgroundModal"
        :style="{ backgroundColor: `rgba(255, 255, 255, ${settingsOpacity})` }"
      >⚙️</button>
    </div>
    
    <div class="container">
      <div class="search-section">
        <form id="bing-search" action="https://www.bing.com/search" method="get" target="_self">
          <input type="text" name="q" id="search-input" placeholder="在必应中搜索..." autocomplete="off">
          <button type="submit" id="search-btn">搜索</button>
        </form>
      </div>
      
      <div class="nav-section" :style="{ backgroundColor: `rgba(255, 255, 255, ${navOpacity})` }">
        <div class="nav-header">
          <h2>网站导航</h2>
          <button id="add-site-btn" @click="openEditModal(null)">添加网站</button>
        </div>
        <div class="nav-grid" id="nav-grid">
          <div 
            v-for="(site, index) in sites" 
            :key="index"
            class="site-item"
            draggable="true"
            @click="openSite(site)"
            @dragstart="handleDragStart($event, index)"
            @dragend="handleDragEnd"
            @dragover="handleDragOver($event)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, index)"
            :data-index="index"
          >
            <span class="edit-icon" @click.stop="openEditModal(index)">✎</span>
            <img class="site-icon" :src="site.icon || `https://www.google.com/s2/favicons?domain=${site.url}&sz=64`" :alt="site.name">
            <span class="site-name">{{ site.name }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 编辑弹窗 -->
    <div id="edit-modal" class="modal" v-if="showEditModal">
      <div class="modal-content">
        <span class="close" @click="closeEditModal">&times;</span>
        <h3>{{ currentEditIndex === null ? '添加网站' : '编辑网站' }}</h3>
        <form id="edit-form" @submit.prevent="handleFormSubmit">
          <div class="form-group">
            <label for="site-name">网站名称:</label>
            <input type="text" id="site-name" v-model="formData.name" required>
          </div>
          <div class="form-group">
            <label for="site-url">网站URL:</label>
            <input type="url" id="site-url" v-model="formData.url" required>
          </div>
          <div class="form-group">
            <label for="site-icon">网站图标URL (可选):</label>
            <input type="url" id="site-icon" v-model="formData.icon">
          </div>
          <div class="form-actions">
            <button 
              type="button" 
              id="delete-btn" 
              v-if="currentEditIndex !== null"
              @click="handleDelete"
            >
              删除
            </button>
            <button type="submit">保存</button>
          </div>
        </form>
      </div>
    </div>
    
    <!-- 背景设置弹窗 -->
    <div id="background-modal" class="modal" v-if="showBackgroundModal">
      <div class="modal-content">
        <span class="close" @click="closeBackgroundModal">&times;</span>
        <h3>设置</h3>
        <div class="background-options">
          <div class="background-option">
            <h4>背景设置</h4>
            <div class="background-option-item">
              <h5>默认背景</h5>
              <div class="background-preview default-bg" @click="setDefaultBackground"></div>
            </div>
            <div class="background-option-item">
              <h5>自定义图片URL</h5>
              <form id="background-form" @submit.prevent="handleBackgroundSubmit">
                <div class="form-group">
                  <label for="bg-url">图片URL:</label>
                  <input type="url" id="bg-url" v-model="bgUrl" placeholder="输入背景图片URL">
                </div>
                <div class="form-actions">
                  <button type="submit">应用</button>
                </div>
              </form>
            </div>
          </div>
          <div class="background-option">
            <h4>透明度设置</h4>
            <div class="form-group">
              <label for="opacity-slider">不透明度: {{ opacity * 100 }}%</label>
              <input 
                type="range" 
                id="opacity-slider" 
                min="0.1" 
                max="1" 
                step="0.1" 
                v-model.number="opacity"
                @input="updateOpacity"
              >
            </div>
          </div>
          <div class="background-option">
            <h4>数据管理</h4>
            <div class="form-actions data-management">
              <button type="button" @click="exportData">导出数据</button>
              <button type="button" @click="triggerImport">导入数据</button>
              <input 
                type="file" 
                id="import-file" 
                accept=".json" 
                style="display: none;" 
                @change="importData"
              >
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// 全局变量
const sites = ref([]);
const currentEditIndex = ref(null);
const backgroundImage = ref(null);
const showEditModal = ref(false);
const showBackgroundModal = ref(false);
const formData = ref({ name: '', url: '', icon: '' });
const bgUrl = ref('');
const opacity = ref(0.9); // 透明度，默认0.9
const navOpacity = ref(opacity.value); // 导航区透明度
const settingsOpacity = ref(opacity.value); // 设置按钮透明度

// 初始化
onMounted(() => {
  loadSites();
  loadBackgroundImage();
  loadSettings();
});

// 从Chrome存储加载网站数据
function loadSites() {
  chrome.storage.sync.get(['sites'], (result) => {
    console.log('从Chrome存储加载的网站数据:', result);
    let loadedSites = result.sites;
    
    if (loadedSites && Array.isArray(loadedSites) && loadedSites.length > 0) {
      sites.value = loadedSites;
    } else {
      // 默认网站数据
      sites.value = [
        {
          name: '谷歌',
          url: 'https://www.google.com',
          icon: 'https://www.google.com/favicon.ico'
        },
        {
          name: '必应',
          url: 'https://www.bing.com',
          icon: 'https://www.bing.com/favicon.ico'
        },
        {
          name: '百度',
          url: 'https://www.baidu.com',
          icon: 'https://www.baidu.com/favicon.ico'
        },
        {
          name: 'GitHub',
          url: 'https://github.com',
          icon: 'https://github.com/favicon.ico'
        }
      ];
      saveSites();
    }
    
    console.log('最终加载的网站数据:', sites.value);
  });
}

// 保存网站数据到Chrome存储
function saveSites() {
  // 使用JSON序列化/反序列化来移除Proxy包装，确保保存的是纯JavaScript对象
  const sitesToSave = JSON.parse(JSON.stringify(sites.value));
  console.log('要保存的网站数据:', sitesToSave);
  chrome.storage.sync.set({ sites: sitesToSave }, () => {
    console.log('网站数据已保存');
  });
}

// 从Chrome存储加载背景图片
function loadBackgroundImage() {
  chrome.storage.sync.get(['backgroundImage'], (result) => {
    backgroundImage.value = result.backgroundImage;
    applyBackgroundImage();
  });
}

// 保存背景图片到Chrome存储
function saveBackgroundImage() {
  chrome.storage.sync.set({ backgroundImage: backgroundImage.value }, () => {
    console.log('背景图片已保存');
  });
}

// 从Chrome存储加载设置
function loadSettings() {
  chrome.storage.sync.get(['opacity'], (result) => {
    if (result.opacity !== undefined) {
      // 验证并确保opacity是有效的数值
      const validOpacity = Math.max(0.1, Math.min(1, Number(result.opacity) || 0.9));
      opacity.value = validOpacity;
      updateOpacity();
    }
  });
}

// 保存设置到Chrome存储
function saveSettings() {
  // 保存前验证值
  const validOpacity = Math.max(0.1, Math.min(1, Number(opacity.value) || 0.9));
  chrome.storage.sync.set({ opacity: validOpacity }, () => {
    console.log('设置已保存');
  });
}

// 更新透明度
function updateOpacity() {
  // 确保透明度是有效的数值
  const validOpacity = Math.max(0.1, Math.min(1, Number(opacity.value) || 0.9));
  navOpacity.value = validOpacity;
  settingsOpacity.value = validOpacity;
  saveSettings();
}

// 导出数据到JSON文件
function exportData() {
  // 准备要导出的数据
  const exportData = {
    sites: sites.value,
    backgroundImage: backgroundImage.value,
    opacity: opacity.value,
    exportDate: new Date().toISOString()
  };
  
  // 创建JSON字符串
  const jsonString = JSON.stringify(exportData, null, 2);
  
  // 创建Blob对象
  const blob = new Blob([jsonString], { type: 'application/json' });
  
  // 创建下载链接
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `newtab-export-${new Date().toISOString().slice(0, 10)}.json`;
  
  // 触发下载
  document.body.appendChild(a);
  a.click();
  
  // 清理
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  console.log('数据已导出');
}

// 触发导入文件选择
function triggerImport() {
  document.getElementById('import-file').click();
}

// 导入数据
function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    try {
      const importData = JSON.parse(e.target.result);
      
      // 验证导入的数据格式
      if (importData.sites && Array.isArray(importData.sites)) {
        // 显示确认对话框
        if (confirm('确定要导入数据吗？这将覆盖当前的数据。')) {
          // 导入数据
          if (importData.sites) sites.value = importData.sites;
          if (importData.backgroundImage) backgroundImage.value = importData.backgroundImage;
          if (importData.opacity !== undefined) {
            opacity.value = importData.opacity;
            updateOpacity();
          }
          
          // 保存到Chrome存储
          saveSites();
          saveBackgroundImage();
          saveSettings();
          
          // 应用背景图片
          applyBackgroundImage();
          
          console.log('数据已导入');
        }
      } else {
        alert('导入的数据格式不正确');
      }
    } catch (error) {
      console.error('导入数据失败:', error);
      alert('导入数据失败，请检查文件格式');
    }
  };
  
  reader.readAsText(file);
  
  // 重置文件输入，以便下次可以再次选择同一文件
  event.target.value = '';
}

// 应用背景图片
function applyBackgroundImage() {
  if (backgroundImage.value) {
    document.body.style.backgroundImage = `url('${backgroundImage.value}')`;
  } else {
    document.body.style.backgroundImage = 'none';
  }
}

// 打开网站
function openSite(site) {
  window.location.href = site.url;
}

// 打开编辑弹窗
function openEditModal(index) {
  currentEditIndex.value = index;
  
  if (index === null) {
    // 添加新网站
    formData.value = { name: '', url: '', icon: '' };
  } else {
    // 编辑现有网站
    formData.value = { ...sites.value[index] };
  }
  
  showEditModal.value = true;
  // 自动聚焦到第一个输入框
  setTimeout(() => {
    document.getElementById('site-name')?.focus();
  }, 100);
}

// 关闭编辑弹窗
function closeEditModal() {
  showEditModal.value = false;
  currentEditIndex.value = null;
}

// 关闭背景弹窗
function closeBackgroundModal() {
  showBackgroundModal.value = false;
  bgUrl.value = '';
}

// 打开背景弹窗
function openBackgroundModal() {
  showBackgroundModal.value = true;
}

// 处理表单提交
function handleFormSubmit() {
  const site = {
    name: formData.value.name.trim(),
    url: formData.value.url.trim(),
    icon: formData.value.icon.trim() || ''
  };
  
  if (currentEditIndex.value === null) {
    // 添加新网站
    sites.value.push(site);
  } else {
    // 更新现有网站
    sites.value[currentEditIndex.value] = site;
  }
  
  saveSites();
  closeEditModal();
}

// 处理删除网站
function handleDelete() {
  if (currentEditIndex.value !== null) {
    if (confirm('确定要删除这个网站吗？')) {
      sites.value.splice(currentEditIndex.value, 1);
      saveSites();
      closeEditModal();
    }
  }
}

// 处理背景表单提交
function handleBackgroundSubmit() {
  if (bgUrl.value.trim()) {
    setBackgroundImage(bgUrl.value.trim());
    closeBackgroundModal();
  }
}

// 设置背景图片
function setBackgroundImage(url) {
  backgroundImage.value = url;
  applyBackgroundImage();
  saveBackgroundImage();
}

// 设置默认背景
function setDefaultBackground() {
  backgroundImage.value = null;
  applyBackgroundImage();
  saveBackgroundImage();
  closeBackgroundModal();
}

// 拖拽事件处理
function handleDragStart(e, index) {
  e.dataTransfer.setData('text/plain', index);
  e.currentTarget.classList.add('dragging');
}

function handleDragEnd(e) {
  e.currentTarget.classList.remove('dragging');
  // 移除所有dragover类
  document.querySelectorAll('.dragover').forEach(el => {
    el.classList.remove('dragover');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
  e.currentTarget.classList.remove('dragover');
}

function handleDrop(e, dropIndex) {
  e.preventDefault();
  e.currentTarget.classList.remove('dragover');
  
  const draggingIndex = parseInt(e.dataTransfer.getData('text/plain'));
  
  // 创建新的数组，移动拖拽的元素到新位置
  const newSitesOrder = [...sites.value];
  const [draggedItem] = newSitesOrder.splice(draggingIndex, 1);
  newSitesOrder.splice(dropIndex, 0, draggedItem);
  
  // 更新sites数组并保存
  sites.value = newSitesOrder;
  saveSites();
}
</script>

<style scoped>
/* 样式将在单独的style.css中引入 */
</style>
