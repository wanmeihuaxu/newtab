import localforage from 'localforage';

localforage.config({
  name: 'NewTab',
  storeName: 'localDatas',
  description: '存储新标签页的数据'
});

const DEFAULT_CONFIG = {
  sites: [],
  backgroundImage: null,
  opacity: 0.9,
  categories: [
    { id: 'default', name: '默认', color: '#6366f1' }
  ],
  searchEngines: [
    { id: 'bing', name: '必应', url: 'https://www.bing.com/search?q=', icon: '🔍' },
    { id: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=', icon: '🔍' },
    { id: 'google', name: 'Google', url: 'https://www.google.com/search?q=', icon: '🔍' },
    { id: 'duckduckgo', name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=', icon: '🔍' }
  ],
  defaultSearchEngine: 'bing',
  searchHistory: [],
  backupSettings: {
    enabled: true,
    interval: 7,
    maxBackups: 10,
    lastBackup: null
  },
  encryptionEnabled: false,
  animationEnabled: true,
  particleBackground: true
};

class DataManager {
  constructor() {
    this.encryptionKey = null;
    this.listeners = [];
  }

  async init() {
    await this.loadEncryptionKey();
    await this.checkAndRestore();
  }

  async loadEncryptionKey() {
    try {
      const result = await chrome.storage.local.get(['encryptionKey']);
      if (result.encryptionKey) {
        this.encryptionKey = result.encryptionKey;
      }
    } catch (error) {
      console.error('加载加密密钥失败:', error);
    }
  }

  async generateKey() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  simpleEncrypt(text, key) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  }

  simpleDecrypt(encrypted, key) {
    try {
      const decoded = atob(encrypted);
      let result = '';
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      return result;
    } catch (error) {
      console.error('解密失败:', error);
      return null;
    }
  }

  async enableEncryption() {
    if (!this.encryptionKey) {
      this.encryptionKey = await this.generateKey();
      await chrome.storage.local.set({ encryptionKey: this.encryptionKey });
    }
    
    const data = await this.loadAllData();
    const encryptedData = this.simpleEncrypt(JSON.stringify(data), this.encryptionKey);
    
    await chrome.storage.local.set({ 
      encryptedData,
      encryptionEnabled: true 
    });
    
    await chrome.storage.sync.remove(['sites', 'opacity']);
    
    DEFAULT_CONFIG.encryptionEnabled = true;
    return true;
  }

  async disableEncryption() {
    try {
      const result = await chrome.storage.local.get(['encryptedData', 'encryptionKey']);
      
      if (result.encryptedData && result.encryptionKey) {
        const decrypted = this.simpleDecrypt(result.encryptedData, result.encryptionKey);
        if (decrypted) {
          const data = JSON.parse(decrypted);
          
          if (data.sites) {
            await chrome.storage.sync.set({ sites: data.sites });
          }
          if (data.opacity !== undefined) {
            await chrome.storage.sync.set({ opacity: data.opacity });
          }
        }
      }
      
      await chrome.storage.local.remove(['encryptedData', 'encryptionEnabled']);
      DEFAULT_CONFIG.encryptionEnabled = false;
      
      return true;
    } catch (error) {
      console.error('禁用加密失败:', error);
      return false;
    }
  }

  async isEncryptionEnabled() {
    try {
      const result = await chrome.storage.local.get(['encryptionEnabled']);
      return result.encryptionEnabled === true;
    } catch (error) {
      return false;
    }
  }

  async loadAllData() {
    const isEncrypted = await this.isEncryptionEnabled();
    
    if (isEncrypted && this.encryptionKey) {
      try {
        const result = await chrome.storage.local.get(['encryptedData']);
        if (result.encryptedData) {
          const decrypted = this.simpleDecrypt(result.encryptedData, this.encryptionKey);
          if (decrypted) {
            return JSON.parse(decrypted);
          }
        }
      } catch (error) {
        console.error('加载加密数据失败:', error);
      }
    }
    
    const syncResult = await new Promise(resolve => {
      chrome.storage.sync.get(null, resolve);
    });
    
    const localResult = await localforage.getItem('appData') || {};
    
    return {
      ...DEFAULT_CONFIG,
      ...syncResult,
      ...localResult
    };
  }

  async saveData(key, value) {
    const isEncrypted = await this.isEncryptionEnabled();
    
    if (isEncrypted && this.encryptionKey) {
      const currentData = await this.loadAllData();
      currentData[key] = value;
      
      const encryptedData = this.simpleEncrypt(JSON.stringify(currentData), this.encryptionKey);
      await chrome.storage.local.set({ encryptedData });
    } else {
      if (['sites', 'opacity'].includes(key)) {
        await new Promise(resolve => {
          chrome.storage.sync.set({ [key]: value }, resolve);
        });
      } else {
        const currentData = await localforage.getItem('appData') || {};
        currentData[key] = value;
        await localforage.setItem('appData', currentData);
      }
    }
    
    await this.autoBackup();
    
    this.notifyListeners(key, value);
  }

  async loadData(key, defaultValue = undefined) {
    const data = await this.loadAllData();
    return data[key] !== undefined ? data[key] : defaultValue;
  }

  async createBackup() {
    const data = await this.loadAllData();
    const backup = {
      timestamp: Date.now(),
      version: 1,
      data: data
    };
    
    const backups = await this.loadBackups();
    backups.push(backup);
    
    const backupSettings = await this.loadData('backupSettings', DEFAULT_CONFIG.backupSettings);
    if (backups.length > backupSettings.maxBackups) {
      backups.sort((a, b) => b.timestamp - a.timestamp);
      backups.splice(backupSettings.maxBackups);
    }
    
    await localforage.setItem('backups', backups);
    await this.saveData('backupSettings', {
      ...backupSettings,
      lastBackup: Date.now()
    });
    
    return backup;
  }

  async loadBackups() {
    return await localforage.getItem('backups') || [];
  }

  async restoreBackup(backup) {
    if (!backup || !backup.data) {
      throw new Error('无效的备份数据');
    }
    
    const data = backup.data;
    
    const isEncrypted = await this.isEncryptionEnabled();
    
    if (isEncrypted && this.encryptionKey) {
      const encryptedData = this.simpleEncrypt(JSON.stringify(data), this.encryptionKey);
      await chrome.storage.local.set({ encryptedData });
    } else {
      if (data.sites) {
        await new Promise(resolve => {
          chrome.storage.sync.set({ sites: data.sites }, resolve);
        });
      }
      if (data.opacity !== undefined) {
        await new Promise(resolve => {
          chrome.storage.sync.set({ opacity: data.opacity }, resolve);
        });
      }
      
      const { sites, opacity, ...rest } = data;
      await localforage.setItem('appData', rest);
    }
    
    return true;
  }

  async deleteBackup(timestamp) {
    const backups = await this.loadBackups();
    const filteredBackups = backups.filter(b => b.timestamp !== timestamp);
    await localforage.setItem('backups', filteredBackups);
    return filteredBackups;
  }

  async autoBackup() {
    const backupSettings = await this.loadData('backupSettings', DEFAULT_CONFIG.backupSettings);
    
    if (!backupSettings.enabled) {
      return false;
    }
    
    const now = Date.now();
    const intervalMs = backupSettings.interval * 24 * 60 * 60 * 1000;
    
    if (!backupSettings.lastBackup || (now - backupSettings.lastBackup) > intervalMs) {
      await this.createBackup();
      return true;
    }
    
    return false;
  }

  async checkAndRestore() {
    try {
      const data = await this.loadAllData();
      
      if (!data || Object.keys(data).length === 0) {
        const backups = await this.loadBackups();
        
        if (backups.length > 0) {
          backups.sort((a, b) => b.timestamp - a.timestamp);
          await this.restoreBackup(backups[0]);
          console.log('从最新备份恢复数据成功');
        }
      }
    } catch (error) {
      console.error('数据检查和恢复失败:', error);
    }
  }

  async exportFullData() {
    const data = await this.loadAllData();
    
    const allIcons = {};
    await localforage.iterate((value, key) => {
      if (key.startsWith('icon-')) {
        allIcons[key] = value;
      }
    });
    
    data.siteIcons = allIcons;
    data.exportDate = new Date().toISOString();
    
    return data;
  }

  async importFullData(importData) {
    if (!importData) {
      throw new Error('无效的导入数据');
    }
    
    if (importData.siteIcons && typeof importData.siteIcons === 'object') {
      for (const [key, value] of Object.entries(importData.siteIcons)) {
        if (key.startsWith('icon-')) {
          await localforage.setItem(key, value);
        }
      }
    }
    
    const { siteIcons, exportDate, ...dataToSave } = importData;
    
    for (const [key, value] of Object.entries(dataToSave)) {
      await this.saveData(key, value);
    }
    
    return true;
  }

  async resetToDefault() {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    await localforage.clear();
    
    await this.loadEncryptionKey();
    
    return DEFAULT_CONFIG;
  }

  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      const index = this.listeners.indexOf(callback);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  notifyListeners(key, value) {
    this.listeners.forEach(callback => {
      try {
        callback(key, value);
      } catch (error) {
        console.error('监听器执行失败:', error);
      }
    });
  }
}

const dataManager = new DataManager();

export default dataManager;
export { DEFAULT_CONFIG };
