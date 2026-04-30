<template>
  <div class="app-container" :class="{ 'no-transition': !settings.animationEnabled }">
    <ParticleBackground v-if="settings.particleBackground" />
    
    <div class="settings-btn-container">
      <button 
        class="settings-btn icon-btn" 
        @click="toggleHistorySidebar"
        :style="{ backgroundColor: `rgba(255, 255, 255, ${settings.opacity})` }"
        title="浏览历史"
      >
        <span class="btn-icon">📜</span>
      </button>
      <button 
        class="settings-btn icon-btn" 
        @click="toggleSettingsPanel"
        :style="{ backgroundColor: `rgba(255, 255, 255, ${settings.opacity})` }"
        title="设置"
      >
        <span class="btn-icon">⚙️</span>
      </button>
    </div>
    
    <div 
      class="sidebar-overlay" 
      v-if="showHistorySidebar || showSettingsPanel"
      @click="closeAllPanels"
    ></div>
    
    <div class="history-sidebar" :class="{ 'sidebar-open': showHistorySidebar }">
      <div class="sidebar-header">
        <h3>浏览历史</h3>
        <div class="sidebar-actions">
          <button 
            class="action-btn" 
            @click="toggleHistoryBatchMode"
            :class="{ 'active': historyBatchMode }"
            title="批量操作"
          >
            <span v-if="!historyBatchMode">☑️</span>
            <span v-else>✓</span>
          </button>
          <button class="action-btn" @click="clearAllHistory" title="清空历史">🗑️</button>
          <button class="sidebar-close-btn" @click="toggleHistorySidebar">×</button>
        </div>
      </div>
      
      <div class="sidebar-content">
        <div class="history-filters">
          <div class="filter-row">
            <input 
              type="text" 
              class="filter-input" 
              placeholder="搜索历史..." 
              v-model="historySearchQuery"
              @input="searchHistory"
            >
          </div>
          <div class="filter-row">
            <select class="filter-select" v-model="historyTimeFilter" @change="filterHistory">
              <option value="all">全部时间</option>
              <option value="today">今天</option>
              <option value="week">最近7天</option>
              <option value="month">最近30天</option>
            </select>
            <select class="filter-select" v-model="historySortOrder" @change="sortHistory">
              <option value="desc">最新优先</option>
              <option value="asc">最旧优先</option>
            </select>
          </div>
        </div>
        
        <div class="history-batch-actions" v-if="historyBatchMode && selectedHistoryItems.length > 0">
          <span class="batch-info">已选 {{ selectedHistoryItems.length }} 项</span>
          <button class="batch-delete-btn" @click="deleteSelectedHistory">删除选中</button>
          <button class="batch-select-btn" @click="toggleSelectAllHistory">
            {{ allHistorySelected ? '取消全选' : '全选' }}
          </button>
        </div>
        
        <div class="history-list">
          <div 
            class="history-item" 
            v-for="(item, index) in filteredHistory" 
            :key="index"
            :class="{ 'selected': selectedHistoryItems.includes(index), 'batch-mode': historyBatchMode }"
            @click="handleHistoryItemClick(item, index)"
          >
            <div class="history-checkbox" v-if="historyBatchMode" @click.stop="toggleHistorySelection(index)">
              <span v-if="selectedHistoryItems.includes(index)">✓</span>
            </div>
            <img 
              class="history-favicon" 
              :src="getFaviconUrl(item.url)" 
              alt=""
              @error="handleFaviconError"
            >
            <div class="history-item-content">
              <div class="history-item-title">{{ item.title || item.url }}</div>
              <div class="history-item-url">{{ item.url }}</div>
              <div class="history-item-time">{{ formatDate(item.lastVisitTime) }}</div>
            </div>
            <div class="history-item-actions" v-if="!historyBatchMode">
              <button class="item-action-btn" @click.stop="deleteHistoryItem(index)" title="删除">×</button>
            </div>
          </div>
          
          <div class="no-history" v-if="filteredHistory.length === 0 && !isLoadingHistory">
            {{ historySearchQuery ? '没有找到匹配的历史记录' : '没有浏览历史记录' }}
          </div>
          
          <div class="loading-history" v-if="isLoadingHistory">
            加载中...
          </div>
        </div>
      </div>
    </div>
    
    <div class="settings-panel" :class="{ 'panel-open': showSettingsPanel }">
      <div class="sidebar-header">
        <h3>设置</h3>
        <button class="sidebar-close-btn" @click="toggleSettingsPanel">×</button>
      </div>
      
      <div class="sidebar-content">
        <div class="settings-section">
          <div class="accordion-header" @click="toggleAccordion('appearance')">
            <span>🎨 外观设置</span>
            <span class="accordion-icon" :class="{ 'open': accordions.appearance }">▼</span>
          </div>
          <div class="accordion-content" :class="{ 'open': accordions.appearance }">
            <div class="setting-item">
              <label class="setting-label">
                <span>粒子背景</span>
                <div class="toggle-switch" :class="{ 'active': settings.particleBackground }" @click="toggleSetting('particleBackground')">
                  <div class="toggle-slider"></div>
                </div>
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span>动画效果</span>
                <div class="toggle-switch" :class="{ 'active': settings.animationEnabled }" @click="toggleSetting('animationEnabled')">
                  <div class="toggle-slider"></div>
                </div>
              </label>
            </div>
            <div class="setting-item">
              <label class="setting-label">
                <span>不透明度: {{ Math.round(settings.opacity * 100) }}%</span>
              </label>
              <input 
                type="range" 
                class="slider-input"
                min="0.1" 
                max="1" 
                step="0.1" 
                :value="settings.opacity"
                @input="updateOpacity($event.target.value)"
              >
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="accordion-header" @click="toggleAccordion('search')">
            <span>🔍 搜索设置</span>
            <span class="accordion-icon" :class="{ 'open': accordions.search }">▼</span>
          </div>
          <div class="accordion-content" :class="{ 'open': accordions.search }">
            <div class="setting-item">
              <label class="setting-label">默认搜索引擎</label>
              <div class="engine-list">
                <div 
                  v-for="engine in settings.searchEngines" 
                  :key="engine.id"
                  class="engine-item"
                  :class="{ 'active': settings.defaultSearchEngine === engine.id }"
                  @click="setDefaultSearchEngine(engine.id)"
                >
                  <span class="engine-icon">{{ engine.icon }}</span>
                  <span class="engine-name">{{ engine.name }}</span>
                  <span class="engine-check" v-if="settings.defaultSearchEngine === engine.id">✓</span>
                </div>
              </div>
            </div>
            <div class="setting-item">
              <label class="setting-label">搜索历史</label>
              <div class="search-history-list" v-if="settings.searchHistory.length > 0">
                <div 
                  v-for="(query, index) in settings.searchHistory.slice(0, 10)" 
                  :key="index"
                  class="search-history-item"
                >
                  <span class="history-query">{{ query }}</span>
                  <button class="history-remove" @click="removeSearchHistory(index)">×</button>
                </div>
              </div>
              <div class="no-history" v-else>暂无搜索历史</div>
              <button class="clear-history-btn" v-if="settings.searchHistory.length > 0" @click="clearSearchHistory">
                清空搜索历史
              </button>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="accordion-header" @click="toggleAccordion('categories')">
            <span>📁 分类管理</span>
            <span class="accordion-icon" :class="{ 'open': accordions.categories }">▼</span>
          </div>
          <div class="accordion-content" :class="{ 'open': accordions.categories }">
            <div class="category-list">
              <div 
                v-for="category in settings.categories" 
                :key="category.id"
                class="category-item"
              >
                <div class="category-color" :style="{ backgroundColor: category.color }"></div>
                <input 
                  type="text" 
                  class="category-name-input"
                  :value="category.name"
                  @input="updateCategoryName(category.id, $event.target.value)"
                >
                <div class="category-actions">
                  <input 
                    type="color" 
                    class="category-color-picker"
                    :value="category.color"
                    @input="updateCategoryColor(category.id, $event.target.value)"
                  >
                  <button 
                    class="category-delete" 
                    v-if="category.id !== 'default'"
                    @click="deleteCategory(category.id)"
                  >×</button>
                </div>
              </div>
            </div>
            <button class="add-category-btn" @click="addCategory">
              + 添加分类
            </button>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="accordion-header" @click="toggleAccordion('backup')">
            <span>💾 数据备份</span>
            <span class="accordion-icon" :class="{ 'open': accordions.backup }">▼</span>
          </div>
          <div class="accordion-content" :class="{ 'open': accordions.backup }">
            <div class="setting-item">
              <label class="setting-label">
                <span>自动备份</span>
                <div class="toggle-switch" :class="{ 'active': settings.backupSettings.enabled }" @click="toggleAutoBackup">
                  <div class="toggle-slider"></div>
                </div>
              </label>
            </div>
            <div class="setting-item" v-if="settings.backupSettings.enabled">
              <label class="setting-label">
                <span>备份间隔: {{ settings.backupSettings.interval }} 天</span>
              </label>
              <input 
                type="range" 
                class="slider-input"
                min="1" 
                max="30" 
                step="1" 
                :value="settings.backupSettings.interval"
                @input="updateBackupInterval($event.target.value)"
              >
            </div>
            <div class="backup-list">
              <h4>现有备份</h4>
              <div class="backup-items" v-if="backups.length > 0">
                <div v-for="backup in backups" :key="backup.timestamp" class="backup-item">
                  <span class="backup-time">{{ formatBackupTime(backup.timestamp) }}</span>
                  <div class="backup-actions">
                    <button class="backup-restore" @click="restoreBackup(backup)">恢复</button>
                    <button class="backup-delete" @click="deleteBackup(backup.timestamp)">删除</button>
                  </div>
                </div>
              </div>
              <div class="no-backup" v-else>暂无备份</div>
            </div>
            <div class="backup-manual">
              <button class="backup-now-btn" @click="createBackup">立即备份</button>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="accordion-header" @click="toggleAccordion('security')">
            <span>🔒 安全设置</span>
            <span class="accordion-icon" :class="{ 'open': accordions.security }">▼</span>
          </div>
          <div class="accordion-content" :class="{ 'open': accordions.security }">
            <div class="setting-item">
              <label class="setting-label">
                <span>加密存储</span>
                <div class="toggle-switch" :class="{ 'active': settings.encryptionEnabled }" @click="toggleEncryption">
                  <div class="toggle-slider"></div>
                </div>
              </label>
              <p class="setting-hint">启用后数据将被加密存储</p>
            </div>
          </div>
        </div>
        
        <div class="settings-section">
          <div class="accordion-header" @click="toggleAccordion('data')">
            <span>📊 数据管理</span>
            <span class="accordion-icon" :class="{ 'open': accordions.data }">▼</span>
          </div>
          <div class="accordion-content" :class="{ 'open': accordions.data }">
            <div class="data-actions">
              <button class="data-btn export-btn" @click="exportData">📤 导出数据</button>
              <button class="data-btn import-btn" @click="triggerImport">📥 导入数据</button>
              <input 
                type="file" 
                id="import-file" 
                accept=".json" 
                style="display: none;" 
                @change="importData"
              >
            </div>
            <div class="reset-section">
              <button class="reset-btn" @click="confirmReset">🔄 一键还原</button>
              <p class="reset-hint">警告：这将清除所有数据并恢复默认设置</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div class="container">
      <div class="search-section">
        <form id="bing-search" @submit.prevent="handleSearchSubmit" class="search-form">
          <div class="search-wrapper">
            <button type="button" class="search-engine-toggle" @click="toggleSearchEngineMenu">
              {{ currentSearchEngine?.icon || '🔍' }}
            </button>
            <input 
              type="text" 
              class="search-input" 
              placeholder="搜索..." 
              autocomplete="off" 
              v-model="searchQuery"
              @focus="showSearchSuggestions = true"
              @blur="hideSearchSuggestions"
            >
            <button type="submit" class="search-btn">
              <svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="M21 21l-4.35-4.35"></path>
              </svg>
            </button>
          </div>
          
          <div class="search-engine-menu" v-if="showSearchEngineMenu" @click.stop>
            <div 
              v-for="engine in settings.searchEngines" 
              :key="engine.id"
              class="engine-menu-item"
              :class="{ 'active': settings.defaultSearchEngine === engine.id }"
              @click="selectSearchEngine(engine.id)"
            >
              <span class="engine-icon">{{ engine.icon }}</span>
              <span class="engine-name">{{ engine.name }}</span>
            </div>
          </div>
          
          <div class="search-suggestions" v-if="showSearchSuggestions && searchSuggestions.length > 0">
            <div 
              v-for="(suggestion, index) in searchSuggestions" 
              :key="index"
              class="suggestion-item"
              @mousedown="selectSuggestion(suggestion)"
            >
              <span class="suggestion-icon">🕐</span>
              <span class="suggestion-text">{{ suggestion }}</span>
            </div>
          </div>
        </form>
      </div>
      
      <div class="category-tabs">
        <div 
          v-for="category in filteredCategories" 
          :key="category.id"
          class="category-tab"
          :class="{ 'active': selectedCategory === category.id }"
          @click="selectCategory(category.id)"
        >
          <div class="tab-indicator" :style="{ backgroundColor: category.color }"></div>
          <span class="tab-name">{{ category.name }}</span>
          <span class="tab-count">({{ getCategorySiteCount(category.id) }})</span>
        </div>
        <div class="category-tab add-tab" @click="toggleNavBatchMode" :class="{ 'active': navBatchMode }">
          <span class="tab-name">{{ navBatchMode ? '完成' : '批量操作' }}</span>
        </div>
      </div>
      
      <div 
        class="nav-section" 
        :style="{ backgroundColor: `rgba(255, 255, 255, ${settings.opacity})` }"
      >
        <div class="nav-batch-actions" v-if="navBatchMode">
          <span class="batch-info">已选 {{ selectedNavItems.length }} 项</span>
          <div class="batch-controls">
            <select class="batch-select" v-model="batchMoveCategory">
              <option value="">移动到分类...</option>
              <option v-for="cat in settings.categories" :key="cat.id" :value="cat.id">
                {{ cat.name }}
              </option>
            </select>
            <button class="batch-action-btn" @click="moveSelectedToCategory" v-if="batchMoveCategory">
              移动
            </button>
            <button class="batch-action-btn danger" @click="deleteSelectedNavItems">
              删除选中
            </button>
            <button class="batch-action-btn" @click="toggleSelectAllNavItems">
              {{ allNavItemsSelected ? '取消全选' : '全选' }}
            </button>
          </div>
        </div>
        
        <div class="nav-grid" id="nav-grid">
          <div 
            v-for="(site, index) in filteredSites" 
            :key="index"
            class="site-item"
            :class="{ 
              'dragging': dragIndex === index,
              'dragover': dragOverIndex === index,
              'selected': selectedNavItems.includes(site.originalIndex),
              'batch-mode': navBatchMode
            }"
            draggable="!navBatchMode"
            @click="handleSiteClick(site, site.originalIndex)"
            @dragstart="handleDragStart($event, site.originalIndex)"
            @dragend="handleDragEnd"
            @dragover="handleDragOver($event, index)"
            @dragleave="handleDragLeave"
            @drop="handleDrop($event, index)"
          >
            <div class="site-checkbox" v-if="navBatchMode" @click.stop="toggleNavSelection(site.originalIndex)">
              <span v-if="selectedNavItems.includes(site.originalIndex)">✓</span>
            </div>
            <div class="edit-icon" @click.stop="openEditModal(site.originalIndex)" v-if="!navBatchMode">✎</div>
            <img class="site-icon" :src="siteIcons[site.icon] || getFaviconUrl(site.url)" :alt="site.name">
            <span class="site-name">{{ site.name }}</span>
            <div class="site-category" :style="{ backgroundColor: getCategoryColor(site.category) }">
              {{ getCategoryName(site.category) }}
            </div>
          </div>
          
          <div class="site-item add-site" @click="openAddSiteModal" v-if="!navBatchMode">
            <div class="add-icon">+</div>
            <span class="site-name">添加网站</span>
          </div>
        </div>
      </div>
    </div>
    
    <transition name="modal">
      <div class="modal" v-if="showEditModal" @click.self="closeEditModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ currentEditIndex === null ? '添加网站' : '编辑网站' }}</h3>
            <span class="close" @click="closeEditModal">&times;</span>
          </div>
          <form @submit.prevent="handleFormSubmit">
            <div class="form-group">
              <label for="site-name">网站名称</label>
              <input type="text" id="site-name" v-model="formData.name" required>
            </div>
            <div class="form-group">
              <label for="site-url">网站URL</label>
              <input type="url" id="site-url" v-model="formData.url" required>
            </div>
            <div class="form-group">
              <label for="site-category">分类</label>
              <select id="site-category" v-model="formData.category">
                <option v-for="cat in settings.categories" :key="cat.id" :value="cat.id">
                  {{ cat.name }}
                </option>
              </select>
            </div>
            <div class="form-actions">
              <button 
                type="button" 
                class="btn btn-danger"
                v-if="currentEditIndex !== null"
                @click="handleDelete"
              >
                删除
              </button>
              <button type="button" class="btn btn-secondary" @click="closeEditModal">取消</button>
              <button type="submit" class="btn btn-primary">保存</button>
            </div>
          </form>
        </div>
      </div>
    </transition>
    
    <transition name="modal">
      <div class="modal confirm-modal" v-if="showConfirmModal" @click.self="closeConfirmModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>{{ confirmTitle }}</h3>
          </div>
          <p class="confirm-message">{{ confirmMessage }}</p>
          <div class="form-actions">
            <button class="btn btn-secondary" @click="closeConfirmModal">取消</button>
            <button class="btn btn-primary" @click="executeConfirmAction">确认</button>
          </div>
        </div>
      </div>
    </transition>
    
    <div class="toast-container">
      <transition-group name="toast">
        <div 
          v-for="toast in toasts" 
          :key="toast.id"
          class="toast"
          :class="toast.type"
        >
          {{ toast.message }}
        </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import localforage from 'localforage';
import ParticleBackground from './components/ParticleBackground.vue';
import dataManager, { DEFAULT_CONFIG } from './utils/dataManager.js';

localforage.config({
  name: 'NewTab',
  storeName: 'localDatas',
  description: '存储新标签页的背景图片'
});

const settings = reactive({
  ...DEFAULT_CONFIG
});

const sites = ref([]);
const currentEditIndex = ref(null);
const backgroundImage = ref(null);
const showEditModal = ref(false);
const formData = ref({ name: '', url: '', icon: '', category: 'default' });
const siteIcons = ref({});
const opacity = ref(0.9);

const showHistorySidebar = ref(false);
const showSettingsPanel = ref(false);
const historyItems = ref([]);
const filteredHistory = ref([]);
const historySearchQuery = ref('');
const historyTimeFilter = ref('all');
const historySortOrder = ref('desc');
const historyBatchMode = ref(false);
const selectedHistoryItems = ref([]);
const isLoadingHistory = ref(false);

const searchQuery = ref('');
const showSearchEngineMenu = ref(false);
const showSearchSuggestions = ref(false);
const searchSuggestions = ref([]);
const currentSearchEngine = computed(() => {
  return settings.searchEngines.find(e => e.id === settings.defaultSearchEngine);
});

const selectedCategory = ref('all');
const filteredCategories = computed(() => {
  return [
    { id: 'all', name: '全部', color: '#6366f1' },
    ...settings.categories
  ];
});
const filteredSites = computed(() => {
  return sites.value
    .map((site, index) => ({ ...site, originalIndex: index }))
    .filter(site => {
      if (selectedCategory.value === 'all') return true;
      return site.category === selectedCategory.value;
    });
});

const navBatchMode = ref(false);
const selectedNavItems = ref([]);
const batchMoveCategory = ref('');

const accordions = reactive({
  appearance: true,
  search: false,
  categories: false,
  backup: false,
  security: false,
  data: false
});

const backups = ref([]);
const toasts = ref([]);
let toastId = 0;

const showConfirmModal = ref(false);
const confirmTitle = ref('');
const confirmMessage = ref('');
let confirmAction = null;

const dragIndex = ref(null);
const dragOverIndex = ref(null);

const allHistorySelected = computed(() => {
  return selectedHistoryItems.value.length === filteredHistory.value.length && filteredHistory.value.length > 0;
});

const allNavItemsSelected = computed(() => {
  return selectedNavItems.value.length === filteredSites.value.length && filteredSites.value.length > 0;
});

function showToast(message, type = 'success') {
  const id = ++toastId;
  toasts.value.push({ id, message, type });
  setTimeout(() => {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index > -1) toasts.value.splice(index, 1);
  }, 3000);
}

function showConfirm(title, message, action) {
  confirmTitle.value = title;
  confirmMessage.value = message;
  confirmAction = action;
  showConfirmModal.value = true;
}

function closeConfirmModal() {
  showConfirmModal.value = false;
  confirmAction = null;
}

function executeConfirmAction() {
  if (confirmAction) {
    confirmAction();
  }
  closeConfirmModal();
}

onMounted(async () => {
  await dataManager.init();
  await loadAllSettings();
  await loadSites();
  await loadBackups();
  applyBackgroundImage();
});

async function loadAllSettings() {
  const savedSettings = await dataManager.loadAllData();
  Object.assign(settings, savedSettings);
  opacity.value = settings.opacity;
}

async function loadBackups() {
  backups.value = await dataManager.loadBackups();
}

function toggleAccordion(key) {
  accordions[key] = !accordions[key];
}

function toggleSetting(key) {
  settings[key] = !settings[key];
  saveSettings();
}

async function toggleEncryption() {
  if (settings.encryptionEnabled) {
    const disabled = await dataManager.disableEncryption();
    if (disabled) {
      settings.encryptionEnabled = false;
      showToast('加密已禁用');
    }
  } else {
    const enabled = await dataManager.enableEncryption();
    if (enabled) {
      settings.encryptionEnabled = true;
      showToast('加密已启用');
    }
  }
}

function toggleAutoBackup() {
  settings.backupSettings.enabled = !settings.backupSettings.enabled;
  saveSettings();
}

function updateBackupInterval(value) {
  settings.backupSettings.interval = parseInt(value);
  saveSettings();
}

async function createBackup() {
  try {
    await dataManager.createBackup();
    await loadBackups();
    showToast('备份创建成功');
  } catch (error) {
    showToast('备份创建失败', 'error');
  }
}

async function restoreBackup(backup) {
  showConfirm('恢复备份', '确定要从该备份恢复数据吗？这将覆盖当前数据。', async () => {
    try {
      await dataManager.restoreBackup(backup);
      await loadAllSettings();
      await loadSites();
      showToast('数据恢复成功');
    } catch (error) {
      showToast('恢复失败', 'error');
    }
  });
}

async function deleteBackup(timestamp) {
  try {
    backups.value = await dataManager.deleteBackup(timestamp);
    showToast('备份已删除');
  } catch (error) {
    showToast('删除失败', 'error');
  }
}

function formatBackupTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function getCategoryName(categoryId) {
  const cat = settings.categories.find(c => c.id === categoryId);
  return cat ? cat.name : '默认';
}

function getCategoryColor(categoryId) {
  const cat = settings.categories.find(c => c.id === categoryId);
  return cat ? cat.color : '#6366f1';
}

function getCategorySiteCount(categoryId) {
  if (categoryId === 'all') return sites.value.length;
  return sites.value.filter(s => s.category === categoryId).length;
}

function addCategory() {
  const colors = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6'];
  const newCategory = {
    id: `cat-${Date.now()}`,
    name: `新分类${settings.categories.length + 1}`,
    color: colors[Math.floor(Math.random() * colors.length)]
  };
  settings.categories.push(newCategory);
  saveSettings();
}

function updateCategoryName(id, name) {
  const cat = settings.categories.find(c => c.id === id);
  if (cat) {
    cat.name = name;
    saveSettings();
  }
}

function updateCategoryColor(id, color) {
  const cat = settings.categories.find(c => c.id === id);
  if (cat) {
    cat.color = color;
    saveSettings();
  }
}

function deleteCategory(id) {
  showConfirm('删除分类', '确定要删除这个分类吗？分类下的网站将移至默认分类。', () => {
    const index = settings.categories.findIndex(c => c.id === id);
    if (index > -1) {
      sites.value.forEach(site => {
        if (site.category === id) {
          site.category = 'default';
        }
      });
      settings.categories.splice(index, 1);
      if (selectedCategory.value === id) {
        selectedCategory.value = 'all';
      }
      saveSettings();
      saveSites();
    }
  });
}

function selectCategory(id) {
  selectedCategory.value = id;
}

function toggleHistorySidebar() {
  showHistorySidebar.value = !showHistorySidebar.value;
  if (showHistorySidebar.value) {
    loadHistory();
  }
}

function toggleSettingsPanel() {
  showSettingsPanel.value = !showSettingsPanel.value;
  if (showSettingsPanel.value) {
    loadBackups();
  }
}

function closeAllPanels() {
  showHistorySidebar.value = false;
  showSettingsPanel.value = false;
}

function loadHistory() {
  if (!chrome.history) return;
  
  isLoadingHistory.value = true;
  chrome.history.search({
    text: '',
    startTime: 0,
    maxResults: 200
  }, (results) => {
    historyItems.value = results;
    filterHistory();
    isLoadingHistory.value = false;
  });
}

function searchHistory() {
  filterHistory();
}

function filterHistory() {
  let filtered = [...historyItems.value];
  
  if (historySearchQuery.value) {
    const query = historySearchQuery.value.toLowerCase();
    filtered = filtered.filter(item => {
      const title = (item.title || '').toLowerCase();
      const url = item.url.toLowerCase();
      return title.includes(query) || url.includes(query);
    });
  }
  
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  
  switch (historyTimeFilter.value) {
    case 'today':
      filtered = filtered.filter(item => now - item.lastVisitTime < dayMs);
      break;
    case 'week':
      filtered = filtered.filter(item => now - item.lastVisitTime < 7 * dayMs);
      break;
    case 'month':
      filtered = filtered.filter(item => now - item.lastVisitTime < 30 * dayMs);
      break;
  }
  
  filteredHistory.value = filtered;
  sortHistory();
}

function sortHistory() {
  filteredHistory.value.sort((a, b) => {
    if (historySortOrder.value === 'desc') {
      return b.lastVisitTime - a.lastVisitTime;
    }
    return a.lastVisitTime - b.lastVisitTime;
  });
}

function handleHistoryItemClick(item, index) {
  if (historyBatchMode.value) {
    toggleHistorySelection(index);
  } else {
    openHistoryItem(item);
  }
}

function openHistoryItem(item) {
  window.location.href = item.url;
}

function toggleHistoryBatchMode() {
  historyBatchMode.value = !historyBatchMode.value;
  selectedHistoryItems.value = [];
}

function toggleHistorySelection(index) {
  const idx = selectedHistoryItems.value.indexOf(index);
  if (idx > -1) {
    selectedHistoryItems.value.splice(idx, 1);
  } else {
    selectedHistoryItems.value.push(index);
  }
}

function toggleSelectAllHistory() {
  if (allHistorySelected.value) {
    selectedHistoryItems.value = [];
  } else {
    selectedHistoryItems.value = filteredHistory.value.map((_, i) => i);
  }
}

function deleteHistoryItem(index) {
  const item = filteredHistory.value[index];
  if (item && chrome.history) {
    showConfirm('删除历史', '确定要删除这条历史记录吗？', () => {
      chrome.history.deleteUrl({ url: item.url }, () => {
        loadHistory();
        showToast('历史记录已删除');
      });
    });
  }
}

function deleteSelectedHistory() {
  if (selectedHistoryItems.value.length === 0) return;
  
  showConfirm('删除选中', `确定要删除选中的 ${selectedHistoryItems.value.length} 条历史记录吗？`, () => {
    const urlsToDelete = selectedHistoryItems.value.map(i => filteredHistory.value[i].url);
    
    if (chrome.history && chrome.history.deleteUrl) {
      urlsToDelete.forEach(url => {
        chrome.history.deleteUrl({ url }, () => {});
      });
    }
    
    selectedHistoryItems.value = [];
    loadHistory();
    showToast('已删除选中的历史记录');
  });
}

function clearAllHistory() {
  showConfirm('清空历史', '确定要清空所有浏览历史记录吗？此操作不可恢复。', () => {
    if (chrome.history) {
      chrome.history.deleteAll(() => {
        loadHistory();
        showToast('历史记录已清空');
      });
    }
  });
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const dayMs = 24 * 60 * 60 * 1000;
  
  if (diffMs < 60 * 1000) {
    return '刚刚';
  } else if (diffMs < 60 * 60 * 1000) {
    return `${Math.floor(diffMs / (60 * 1000))}分钟前`;
  } else if (diffMs < dayMs) {
    return `${Math.floor(diffMs / (60 * 60 * 1000))}小时前`;
  } else if (diffMs < 7 * dayMs) {
    return `${Math.floor(diffMs / dayMs)}天前`;
  }
  
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric'
  });
}

function getFaviconUrl(url) {
  try {
    const hostname = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
  } catch {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>';
  }
}

function handleFaviconError(e) {
  e.target.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"><circle cx="12" cy="12" r="10"/></svg>';
}

function toggleSearchEngineMenu() {
  showSearchEngineMenu.value = !showSearchEngineMenu.value;
}

function selectSearchEngine(id) {
  settings.defaultSearchEngine = id;
  showSearchEngineMenu.value = false;
  saveSettings();
}

function setDefaultSearchEngine(id) {
  settings.defaultSearchEngine = id;
  saveSettings();
  showToast(`已设置 ${settings.searchEngines.find(e => e.id === id)?.name} 为默认搜索引擎`);
}

function handleSearchSubmit() {
  const query = searchQuery.value.trim();
  if (!query) return;
  
  if (!settings.searchHistory.includes(query)) {
    settings.searchHistory.unshift(query);
    if (settings.searchHistory.length > 50) {
      settings.searchHistory = settings.searchHistory.slice(0, 50);
    }
    saveSettings();
  }
  
  const engine = settings.searchEngines.find(e => e.id === settings.defaultSearchEngine);
  if (engine) {
    window.location.href = `${engine.url}${encodeURIComponent(query)}`;
  }
}

watch(searchQuery, (newQuery) => {
  if (newQuery) {
    searchSuggestions.value = settings.searchHistory
      .filter(q => q.toLowerCase().includes(newQuery.toLowerCase()))
      .slice(0, 5);
  } else {
    searchSuggestions.value = settings.searchHistory.slice(0, 5);
  }
});

function selectSuggestion(query) {
  searchQuery.value = query;
  setTimeout(() => handleSearchSubmit(), 50);
}

function hideSearchSuggestions() {
  setTimeout(() => {
    showSearchSuggestions.value = false;
  }, 200);
}

function removeSearchHistory(index) {
  settings.searchHistory.splice(index, 1);
  saveSettings();
}

function clearSearchHistory() {
  showConfirm('清空搜索历史', '确定要清空所有搜索历史吗？', () => {
    settings.searchHistory = [];
    saveSettings();
    showToast('搜索历史已清空');
  });
}

function toggleNavBatchMode() {
  navBatchMode.value = !navBatchMode.value;
  selectedNavItems.value = [];
}

function handleSiteClick(site, originalIndex) {
  if (navBatchMode.value) {
    toggleNavSelection(originalIndex);
  } else {
    openSite(site);
  }
}

function toggleNavSelection(originalIndex) {
  const idx = selectedNavItems.value.indexOf(originalIndex);
  if (idx > -1) {
    selectedNavItems.value.splice(idx, 1);
  } else {
    selectedNavItems.value.push(originalIndex);
  }
}

function toggleSelectAllNavItems() {
  if (allNavItemsSelected.value) {
    selectedNavItems.value = [];
  } else {
    selectedNavItems.value = filteredSites.value.map(s => s.originalIndex);
  }
}

function moveSelectedToCategory() {
  if (!batchMoveCategory.value || selectedNavItems.value.length === 0) return;
  
  selectedNavItems.value.forEach(index => {
    if (sites.value[index]) {
      sites.value[index].category = batchMoveCategory.value;
    }
  });
  
  selectedNavItems.value = [];
  batchMoveCategory.value = '';
  saveSites();
  showToast('已移动到新分类');
}

function deleteSelectedNavItems() {
  if (selectedNavItems.value.length === 0) return;
  
  showConfirm('删除选中', `确定要删除选中的 ${selectedNavItems.value.length} 个网站吗？`, () => {
    const sortedIndices = [...selectedNavItems.value].sort((a, b) => b - a);
    sortedIndices.forEach(index => {
      if (sites.value[index]) {
        sites.value.splice(index, 1);
      }
    });
    
    selectedNavItems.value = [];
    saveSites();
    showToast('已删除选中的网站');
  });
}

async function loadSites() {
  const savedSites = await dataManager.loadData('sites', []);
  sites.value = savedSites;
  
  siteIcons.value = {};
  for (const site of sites.value) {
    if (site.icon && !site.icon.startsWith('http')) {
      try {
        const iconBase64 = await localforage.getItem(site.icon);
        if (iconBase64) {
          siteIcons.value[site.icon] = iconBase64;
        }
      } catch (e) {
        console.error('加载图标失败:', e);
      }
    }
  }
}

async function saveSites() {
  await dataManager.saveData('sites', JSON.parse(JSON.stringify(sites.value)));
}

async function saveSettings() {
  await dataManager.saveData('opacity', settings.opacity);
  await dataManager.saveData('categories', settings.categories);
  await dataManager.saveData('searchEngines', settings.searchEngines);
  await dataManager.saveData('defaultSearchEngine', settings.defaultSearchEngine);
  await dataManager.saveData('searchHistory', settings.searchHistory);
  await dataManager.saveData('backupSettings', settings.backupSettings);
  await dataManager.saveData('encryptionEnabled', settings.encryptionEnabled);
  await dataManager.saveData('animationEnabled', settings.animationEnabled);
  await dataManager.saveData('particleBackground', settings.particleBackground);
}

function updateOpacity(value) {
  settings.opacity = parseFloat(value);
  opacity.value = settings.opacity;
  saveSettings();
}

async function loadBackgroundImage() {
  backgroundImage.value = await localforage.getItem('backgroundImage');
}

function applyBackgroundImage() {
  if (backgroundImage.value) {
    document.body.style.backgroundImage = `url('${backgroundImage.value}')`;
  } else {
    document.body.style.backgroundImage = 'none';
  }
}

function openSite(site) {
  window.location.href = site.url;
}

function openEditModal(index) {
  currentEditIndex.value = index;
  
  if (index === null) {
    formData.value = { name: '', url: '', icon: '', category: 'default' };
  } else {
    formData.value = { ...sites.value[index] };
  }
  
  showEditModal.value = true;
}

function openAddSiteModal() {
  openEditModal(null);
}

function closeEditModal() {
  showEditModal.value = false;
  currentEditIndex.value = null;
}

async function handleFormSubmit() {
  const siteName = formData.value.name.trim();
  const siteUrl = formData.value.url.trim();
  const iconBase64 = formData.value.icon.trim() || '';
  
  const site = {
    name: siteName,
    url: siteUrl,
    icon: '',
    category: formData.value.category || 'default'
  };
  
  if (iconBase64) {
    const iconKey = `icon-${hashString(siteUrl)}`;
    await localforage.setItem(iconKey, iconBase64);
    site.icon = iconKey;
  }
  
  if (currentEditIndex.value === null) {
    sites.value.push(site);
    showToast('网站已添加');
  } else {
    sites.value[currentEditIndex.value] = site;
    showToast('网站已更新');
  }
  
  saveSites();
  closeEditModal();
}

function handleDelete() {
  if (currentEditIndex.value !== null) {
    showConfirm('删除网站', '确定要删除这个网站吗？', () => {
      sites.value.splice(currentEditIndex.value, 1);
      saveSites();
      closeEditModal();
      showToast('网站已删除');
    });
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

async function exportData() {
  try {
    const data = await dataManager.exportFullData();
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `newtab-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast('数据导出成功');
  } catch (error) {
    showToast('导出失败', 'error');
  }
}

function triggerImport() {
  document.getElementById('import-file').click();
}

async function importData(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const importData = JSON.parse(e.target.result);
      
      showConfirm('导入数据', '确定要导入数据吗？这将覆盖当前的数据。', async () => {
        await dataManager.importFullData(importData);
        await loadAllSettings();
        await loadSites();
        applyBackgroundImage();
        showToast('数据导入成功');
      });
    } catch (error) {
      showToast('导入失败，请检查文件格式', 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

function confirmReset() {
  showConfirm('一键还原', '警告：这将清除所有数据并恢复默认设置！此操作不可恢复。', async () => {
    await dataManager.resetToDefault();
    await loadAllSettings();
    await loadSites();
    sites.value = [];
    backgroundImage.value = null;
    applyBackgroundImage();
    showToast('已恢复默认设置');
  });
}

function handleDragStart(e, index) {
  e.dataTransfer.setData('text/plain', index);
  dragIndex.value = index;
  e.currentTarget.classList.add('dragging');
}

function handleDragEnd(e) {
  dragIndex.value = null;
  dragOverIndex.value = null;
  e.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.dragover').forEach(el => {
    el.classList.remove('dragover');
  });
}

function handleDragOver(e, index) {
  e.preventDefault();
  dragOverIndex.value = index;
  e.currentTarget.classList.add('dragover');
}

function handleDragLeave(e) {
  dragOverIndex.value = null;
  e.currentTarget.classList.remove('dragover');
}

function handleDrop(e, dropIndex) {
  e.preventDefault();
  dragOverIndex.value = null;
  e.currentTarget.classList.remove('dragover');
  
  const draggingIndex = parseInt(e.dataTransfer.getData('text/plain'));
  
  if (draggingIndex !== dropIndex) {
    const newSitesOrder = [...sites.value];
    const [draggedItem] = newSitesOrder.splice(draggingIndex, 1);
    newSitesOrder.splice(dropIndex, 0, draggedItem);
    sites.value = newSitesOrder;
    saveSites();
  }
}
</script>

<style scoped>
/* 样式将在全局style.css中定义 */
</style>
