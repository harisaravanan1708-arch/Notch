const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notchAPI', {
  setNotchState: (state) => ipcRenderer.send('set-notch-state', state),
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  openPath: (filePath) => ipcRenderer.invoke('open-path', filePath),
  showInFolder: (filePath) => ipcRenderer.invoke('show-in-folder', filePath),
  copyToClipboard: (text) => ipcRenderer.send('copy-to-clipboard', text),
  closeApp: () => ipcRenderer.send('close-app'),

  // YouTube Music APIs
  searchYouTube: (query) => ipcRenderer.invoke('search-youtube', query),
  getTrendingSongs: () => ipcRenderer.invoke('get-trending-songs'),
  getYtMix: (videoId) => ipcRenderer.invoke('get-yt-mix', videoId),
  getRelatedSongs: (payload) => ipcRenderer.invoke('get-related-songs', payload),
  getFallbackAudio: (query) => ipcRenderer.invoke('get-fallback-audio', query),
  
  // Real Windows Master Speaker Volume APIs
  getSystemVolume: () => ipcRenderer.invoke('get-system-volume'),
  setSystemVolume: (vol) => ipcRenderer.invoke('set-system-volume', vol),
  toggleSystemMute: () => ipcRenderer.invoke('toggle-system-mute'),
  onSystemVolumeUpdated: (callback) => {
    ipcRenderer.on('system-volume-updated', (event, data) => callback(data));
  },

  onToggleShortcut: (callback) => {
    ipcRenderer.on('notch-toggle-shortcut', (event, expanded) => callback(expanded));
  },
  onTriggerExpand: (callback) => {
    ipcRenderer.on('notch-trigger-expand', () => callback());
  },

  // Real Windows System Notifications APIs
  getNotifications: () => ipcRenderer.invoke('get-notifications'),
  clearNotifications: () => ipcRenderer.invoke('clear-notifications'),
  onNotificationReceived: (callback) => {
    ipcRenderer.on('system-notification-received', (event, notifs) => callback(notifs));
  },
  onNotificationPopup: (callback) => {
    ipcRenderer.on('notch-notification-popup', (event, notif) => callback(notif));
  },
  onAutoCollapse: (callback) => {
    ipcRenderer.on('notch-auto-collapse', () => callback());
  }
});
