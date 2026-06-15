<template>
  <div class="app-container">
    <!-- 历史记录和设置按钮 -->
    <div class="settings-btn-container">
      <!-- 历史记录按钮 -->
      <button 
        id="history-btn" 
        class="settings-btn" 
        @click="toggleHistorySidebar"
        :style="{ backgroundColor: `rgba(255, 255, 255, ${settingsOpacity})` }"
      >📜</button>
      <!-- 设置按钮 -->
      <button 
        id="settings-btn" 
        class="settings-btn" 
        @click="openBackgroundModal"
        :style="{ backgroundColor: `rgba(255, 255, 255, ${settingsOpacity})` }"
      >⚙️</button>
    </div>
    
    <!-- 历史记录弹窗遮罩层 -->
    <div 
      class="sidebar-overlay" 
      v-if="showHistorySidebar"
      @click="toggleHistorySidebar"
    ></div>
    
    <!-- 历史记录侧边栏 -->
    <div class="history-sidebar" :class="{ 'sidebar-open': showHistorySidebar }">
      <div class="sidebar-header">
        <h3>浏览历史</h3>
        <button class="sidebar-close-btn" @click="toggleHistorySidebar">×</button>
      </div>
      <div class="sidebar-content">
        <!-- 搜索框 -->
        <div class="search-box">
          <input 
            type="text" 
            id="history-search" 
            placeholder="搜索浏览历史..." 
            v-model="historySearchQuery"
            @input="searchHistory"
          >
        </div>
        <!-- 历史记录列表 -->
        <div class="history-list">
          <div 
            class="history-item" 
            v-for="(item, index) in filteredHistory" 
            :key="index"
            @click="openHistoryItem(item)"
          >
            <div class="history-item-content">
              <div class="history-item-title">{{ item.title || item.url }}</div>
              <div class="history-item-url">{{ item.url }}</div>
              <div class="history-item-time">{{ formatDate(item.lastVisitTime) }}</div>
            </div>
          </div>
          <div class="no-history" v-if="filteredHistory.length === 0">
            {{ historySearchQuery ? '没有找到匹配的历史记录' : '没有浏览历史记录' }}
          </div>
        </div>
      </div>
    </div>
    
    <div class="container">
      <div class="search-section">
        <form id="bing-search" @submit.prevent="handleSearchSubmit">
          <input type="text" name="q" id="search-input" placeholder="在必应中搜索..." autocomplete="off" v-model="searchQuery">
          <button type="submit" id="search-btn">搜索</button>
        </form>
      </div>
      
      <div class="nav-section" :style="{ backgroundColor: `rgba(255, 255, 255, ${navOpacity})` }">
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
            <img class="site-icon" :src="siteIcons[site.icon] || 'icon48.png'" :alt="site.name" :style="{ borderRadius: `${iconBorderRadius}%`, width: `${iconSize}px`, height: `${iconSize}px`, opacity: iconOpacity }">
            <span class="site-name">{{ site.name }}</span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 编辑弹窗 -->
    <div id="edit-modal" class="modal" v-if="showEditModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ currentEditIndex === null ? '添加网站' : '编辑网站' }}</h3>
          <span class="close" @click="closeEditModal">&times;</span>
        </div>
        <div class="modal-body">
        <form id="edit-form" @submit.prevent="handleFormSubmit">
          <div class="form-group">
            <label for="site-name">网站名称:</label>
            <input type="text" id="site-name" v-model="formData.name" required>
          </div>
          <div class="form-group">
            <label for="site-url">网站URL:</label>
            <input type="url" id="site-url" v-model="formData.url" required>
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
    </div>
    
    <!-- 背景设置弹窗 -->
    <div id="background-modal" class="modal" v-if="showBackgroundModal" @click.self="saveAndCloseBackgroundModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>设置</h3>
          <span class="close" @click="closeBackgroundModal">&times;</span>
        </div>
        <div class="modal-body">
        <div class="background-options">
          <div class="background-option">
            <h4>背景设置</h4>
            <div class="background-option-item">
              <h5>默认背景</h5>
              <div class="background-preview default-bg" @click="setDefaultBackground"></div>
            </div>
            <div class="background-option-item">
              <h5>本地上传图片</h5>
              <!-- 图片预览 -->
              <div class="image-preview-container" v-if="imagePreview">
                <h6>图片预览:</h6>
                <div class="image-preview" :style="{ backgroundImage: `url('${imagePreview}')` }"></div>
              </div>
              <div class="form-group">
                <label for="bg-file">选择图片:</label>
                <input type="file" id="bg-file" accept="image/*" @change="handleFileUpload">
              </div>
            </div>
          </div>
          <div class="background-option">
            <h4>透明度设置</h4>
            <div class="form-group">
              <label for="opacity-slider">不透明度: {{ Math.round((Number(opacity) || 0) * 100) }}%</label>
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
            <h4>图标设置</h4>
            <div class="form-group">
              <label for="icon-radius-slider">图标圆角: {{ iconBorderRadius }}%</label>
              <input 
                type="range" 
                id="icon-radius-slider" 
                min="0" 
                max="50" 
                step="1" 
                v-model.number="iconBorderRadius"
                @input="updateIconSettings"
              >
            </div>
            <div class="form-group">
              <label for="icon-size-slider">图标大小: {{ iconSize }}px</label>
              <input 
                type="range" 
                id="icon-size-slider" 
                min="24" 
                max="96" 
                step="2" 
                v-model.number="iconSize"
                @input="updateIconSettings"
              >
            </div>
            <div class="form-group">
              <label for="icon-opacity-slider">图标不透明度: {{ Math.round((Number(iconOpacity) || 0) * 100) }}%</label>
              <input 
                type="range" 
                id="icon-opacity-slider" 
                min="0.1" 
                max="1" 
                step="0.1" 
                v-model.number="iconOpacity"
                @input="updateIconSettings"
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
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

// 引入localforage
import localforage from 'localforage';

// 初始化localforage
localforage.config({
  name: 'NewTab',
  storeName: 'localDatas',
  description: '存储新标签页的背景图片'
});

// 全局变量
const sites = ref([]);
const currentEditIndex = ref(null);
const backgroundImage = ref(null);
const showEditModal = ref(false);
const showBackgroundModal = ref(false);
const formData = ref({ name: '', url: '', icon: '' });
const imagePreview = ref(null); // 图片预览URL
const opacity = ref(0.9); // 透明度，默认0.9
const navOpacity = ref(opacity.value); // 导航区透明度
const settingsOpacity = ref(opacity.value); // 设置按钮透明度
const siteIcons = ref({}); // 存储图标映射，键为site.icon，值为base64图标数据
const iconBorderRadius = ref(50); // 图标圆角百分比，默认50（圆形）
const iconSize = ref(48); // 图标大小（像素），默认48
const iconOpacity = ref(1); // 图标不透明度，默认1

// 历史记录相关变量
const showHistorySidebar = ref(false); // 控制历史记录侧边栏的显示
const historyItems = ref([]); // 存储所有历史记录
const filteredHistory = ref([]); // 存储过滤后的历史记录
const historySearchQuery = ref(''); // 历史记录搜索查询

// 搜索相关变量
const searchQuery = ref(''); // 搜索框的值

// 初始化
onMounted(() => {
  loadSites();
  loadBackgroundImage();
  loadSettings();
  loadHistory(); // 加载浏览历史
});

// 切换历史记录侧边栏
function toggleHistorySidebar() {
  showHistorySidebar.value = !showHistorySidebar.value;
  // 如果打开侧边栏，重新加载历史记录
  if (showHistorySidebar.value) {
    loadHistory();
  }
}

// 加载浏览历史
function loadHistory() {
  // 检查是否有权限访问浏览历史
  if (chrome.history) {
    // 获取最近100条历史记录
    chrome.history.search({
      text: '', // 空字符串表示获取所有历史记录
      startTime: 0, // 从时间原点开始
      maxResults: 100 // 最多获取100条
    }, (results) => {
      historyItems.value = results;
      filteredHistory.value = results;
      console.log('加载的历史记录:', results);
    });
  } else {
    console.error('无法访问浏览历史，需要添加history权限');
  }
}

// 搜索历史记录
function searchHistory() {
  const query = historySearchQuery.value.toLowerCase();
  if (!query) {
    filteredHistory.value = historyItems.value;
    return;
  }
  
  filteredHistory.value = historyItems.value.filter(item => {
    const title = (item.title || '').toLowerCase();
    const url = item.url.toLowerCase();
    return title.includes(query) || url.includes(query);
  });
}

// 打开历史记录项
function openHistoryItem(item) {
  window.location.href = item.url;
}

// 格式化日期
function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// 处理必应搜索表单提交
function handleSearchSubmit() {
  // 使用响应式数据获取搜索值
  const query = searchQuery.value.trim();
  
  // 如果搜索框为空，不触发搜索
  if (!query) {
    return;
  }
  
  // 正常提交搜索表单
  window.location.href = `https://www.bing.com/search?q=${encodeURIComponent(query)}`;
}

// 从Chrome存储加载网站数据
function loadSites() {
  chrome.storage.sync.get(['sites'], (result) => {
    console.log('从Chrome存储加载的网站数据:', result);
    let loadedSites = result.sites;
    
    if (loadedSites && Array.isArray(loadedSites) && loadedSites.length > 0) {
      // 加载站点数据，不直接修改sites数组的icon属性
      sites.value = loadedSites;
      
      // 重置图标映射
      siteIcons.value = {};
      
      // 为每个站点加载图标
      sites.value.forEach(site => {
        if (site.icon && !site.icon.startsWith('http')) {
          // 如果图标是存储键（不是URL），从localforage获取图标
          localforage.getItem(site.icon)
            .then(iconBase64 => {
              if (iconBase64) {
                // 将图标存储到siteIcons映射中，不修改原始sites数组
                siteIcons.value[site.icon] = iconBase64;
              }
            })
            .catch(error => {
              console.error(`获取站点图标失败: ${site.name}`, error);
            });
        }
      });
    }
    
    console.log('最终加载的网站数据:', sites.value);
    console.log('加载的图标映射:', siteIcons.value);
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

// 从localforage加载背景图片
function loadBackgroundImage() {
  // 直接从localforage获取背景图片URL
  localforage.getItem('backgroundImage').then((backgroundImageUrl) => {
    backgroundImage.value = backgroundImageUrl;
    
    // 如果有URL且不是DataURL，尝试从localforage获取缓存的图片
    if (backgroundImageUrl && !backgroundImageUrl.startsWith('data:')) {
      localforage.getItem(backgroundImageUrl).then((cachedImage) => {
        if (cachedImage) {
          // 使用缓存的图片
          backgroundImage.value = cachedImage;
        }
        applyBackgroundImage();
      });
    } else {
      // 没有URL或已经是DataURL，直接应用
      applyBackgroundImage();
    }
  });
}

// 保存背景图片到localforage
function saveBackgroundImage() {
  // 保存背景图片URL到localforage
  localforage.setItem('backgroundImage', backgroundImage.value).then(() => {
    console.log('背景图片URL已保存到localforage');
  });
}

// 从Chrome存储加载设置
function loadSettings() {
  chrome.storage.sync.get(['opacity', 'iconBorderRadius', 'iconSize', 'iconOpacity'], (result) => {
    if (result.opacity !== undefined) {
      const validOpacity = Math.max(0.1, Math.min(1, Number(result.opacity) || 0.9));
      opacity.value = validOpacity;
      navOpacity.value = validOpacity;
      settingsOpacity.value = validOpacity;
    }
    if (result.iconBorderRadius !== undefined) {
      iconBorderRadius.value = Math.max(0, Math.min(50, Number(result.iconBorderRadius) || 50));
    }
    if (result.iconSize !== undefined) {
      iconSize.value = Math.max(24, Math.min(96, Number(result.iconSize) || 48));
    }
    if (result.iconOpacity !== undefined) {
      iconOpacity.value = Math.max(0.1, Math.min(1, Number(result.iconOpacity) || 1));
    }
  });
}

// 保存设置到Chrome存储
function saveSettings() {
  // 保存前验证值
  const validOpacity = Math.max(0.1, Math.min(1, Number(opacity.value) || 0.9));
  const validIconBorderRadius = Math.max(0, Math.min(50, Number(iconBorderRadius.value) || 50));
  const validIconSize = Math.max(24, Math.min(96, Number(iconSize.value) || 48));
  const validIconOpacity = Math.max(0.1, Math.min(1, Number(iconOpacity.value) || 1));
  chrome.storage.sync.set({ 
    opacity: validOpacity,
    iconBorderRadius: validIconBorderRadius,
    iconSize: validIconSize,
    iconOpacity: validIconOpacity
  }, () => {
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

// 更新图标设置
function updateIconSettings() {
  iconBorderRadius.value = Math.max(0, Math.min(50, Number(iconBorderRadius.value) || 50));
  iconSize.value = Math.max(24, Math.min(96, Number(iconSize.value) || 48));
  iconOpacity.value = Math.max(0.1, Math.min(1, Number(iconOpacity.value) || 1));
  saveSettings();
}

// 导出数据到JSON文件
async function exportData() {
  try {
    // 从localforage获取所有图标数据
    const allIcons = {};
    await localforage.iterate((value, key) => {
      // 只导出图标数据（键以icon-开头）
      if (key.startsWith('icon-')) {
        allIcons[key] = value;
      }
    });
    
    // 准备要导出的数据
    const exportData = {
      sites: sites.value,
      backgroundImage: backgroundImage.value,
      opacity: opacity.value,
      iconBorderRadius: iconBorderRadius.value,
      iconSize: iconSize.value,
      iconOpacity: iconOpacity.value,
      siteIcons: allIcons, // 包含所有图标数据
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
    
    console.log('数据已导出，包含', Object.keys(allIcons).length, '个图标');
  } catch (error) {
    console.error('导出数据失败:', error);
    alert('导出数据失败，请重试！');
  }
}

// 触发导入文件选择
function triggerImport() {
  document.getElementById('import-file').click();
}

// 导入数据
async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = async (e) => {
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
          if (importData.iconBorderRadius !== undefined) {
            iconBorderRadius.value = importData.iconBorderRadius;
          }
          if (importData.iconSize !== undefined) {
            iconSize.value = importData.iconSize;
          }
          if (importData.iconOpacity !== undefined) {
            iconOpacity.value = importData.iconOpacity;
          }
          
          // 导入图标数据到localforage
          if (importData.siteIcons && typeof importData.siteIcons === 'object') {
            const iconKeys = Object.keys(importData.siteIcons);
            console.log('准备导入', iconKeys.length, '个图标');
            
            // 先清空现有的图标数据
            await clearAllIcons();
            
            // 逐个保存图标数据
            for (const key of iconKeys) {
              if (key.startsWith('icon-')) {
                await localforage.setItem(key, importData.siteIcons[key]);
              }
            }
            
            // 更新siteIcons映射
            siteIcons.value = { ...importData.siteIcons };
            console.log('成功导入', iconKeys.length, '个图标');
          }
          
          // 保存到Chrome存储
          saveSites();
          saveBackgroundImage();
          saveSettings();
          
          // 应用背景图片
          applyBackgroundImage();
          
          console.log('数据已导入');
          alert('数据导入成功！');
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

// 清空所有图标数据
async function clearAllIcons() {
  await localforage.iterate((value, key) => {
    if (key.startsWith('icon-')) {
      return localforage.removeItem(key);
    }
  });
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
  imagePreview.value = null;
}

// 保存设置并关闭背景弹窗
function saveAndCloseBackgroundModal() {
  saveSettings();
  closeBackgroundModal();
}

// 打开背景弹窗
function openBackgroundModal() {
  showBackgroundModal.value = true;
}

// 处理表单提交
async function handleFormSubmit() {
  const siteName = formData.value.name.trim();
  const siteUrl = formData.value.url.trim();
  const iconBase64 = formData.value.icon.trim() || '';
  
  // 创建网站对象
  const site = {
    name: siteName,
    url: siteUrl,
    icon: iconBase64 // 先保存完整的base64数据到内存中
  };
  
  if (currentEditIndex.value === null) {
    // 添加新网站
    sites.value.push(site);
  } else {
    // 更新现有网站
    sites.value[currentEditIndex.value] = site;
  }
  
  // 保存网站数据到Chrome存储
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

// 设置默认背景
function setDefaultBackground() {
  backgroundImage.value = null;
  applyBackgroundImage();
  saveBackgroundImage();
  closeBackgroundModal();
}

// 处理本地文件上传
function handleFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  // 检查文件类型是否为图片
  if (!file.type.startsWith('image/')) {
    alert('请选择图片文件！');
    return;
  }
  
  // 读取文件并转换为DataURL
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    // 显示图片预览
    imagePreview.value = dataUrl;
    // 设置为背景图片
    backgroundImage.value = dataUrl;
    applyBackgroundImage();
    saveBackgroundImage();
    // 不自动关闭弹窗
  };
  
  reader.onerror = () => {
    alert('图片读取失败，请重试！');
  };
  
  // 读取文件
  reader.readAsDataURL(file);
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
