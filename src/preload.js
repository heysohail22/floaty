const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('floatingCam', {
  // Window management
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', { width, height }),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  setWindowPosition: (x, y) => ipcRenderer.invoke('set-window-position', { x, y }),

  // Window state
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  setAlwaysOnTop: flag => ipcRenderer.invoke('set-always-on-top', flag),
  isAlwaysOnTop: () => ipcRenderer.invoke('is-always-on-top'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  hideWindow: () => ipcRenderer.invoke('hide-window'),
  showWindow: () => ipcRenderer.invoke('show-window'),

  // App control
  quitApp: () => ipcRenderer.invoke('quit-app'),
  getVersion: () => ipcRenderer.invoke('get-app-version'),

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: settings => ipcRenderer.invoke('save-settings', settings),

  // Camera
  getCameraDevices: () => ipcRenderer.invoke('get-camera-devices'),

  // Window shape (anti-black-corner masking)
  updateShape: (isCircle, radius) => ipcRenderer.invoke('update-shape', { isCircle, radius }),
  getShape: () => ipcRenderer.invoke('get-shape'),

  // Dedicated Preferences Window & Realtime Setting Sync
  openPreferences: () => ipcRenderer.invoke('open-preferences'),
  hidePreferences: () => ipcRenderer.invoke('hide-preferences'),
  showPreferences: () => ipcRenderer.invoke('show-preferences'),
  syncSetting: (key, value) => ipcRenderer.invoke('sync-setting', { key, value }),
  onSettingSynced: callback => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('setting-synced', handler);
    return () => ipcRenderer.removeListener('setting-synced', handler);
  },

  // Loom-style Desktop Recording & Capture
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  saveRecording: (buffer, defaultName) =>
    ipcRenderer.invoke('save-recording', { buffer, defaultName }),
  showInFolder: filePath => ipcRenderer.invoke('show-item-in-folder', filePath),
  openRecordingBar: () => ipcRenderer.invoke('open-recording-bar'),
  closeRecordingBar: () => ipcRenderer.invoke('close-recording-bar'),
  updateRecordingBar: data => ipcRenderer.invoke('update-recording-bar', data),
  sendRecordingAction: action => ipcRenderer.invoke('send-recording-action', action),
  onRecordingBarUpdate: callback => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('recording-bar-update', handler);
    return () => ipcRenderer.removeListener('recording-bar-update', handler);
  },
  onRecordingAction: callback => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('recording-action', handler);
    return () => ipcRenderer.removeListener('recording-action', handler);
  }
});

// Expose a limited API for receiving messages from main process
contextBridge.exposeInMainWorld('electronAPI', {
  onMessage: callback => {
    ipcRenderer.on('message', (event, data) => callback(data));
  },

  // Remove listeners
  removeAllListeners: channel => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Expose system information
contextBridge.exposeInMainWorld('systemInfo', {
  platform: process.platform,
  arch: process.arch,
  versions: process.versions
});

// Development helpers (only in development)
if (process.env.NODE_ENV === 'development') {
  contextBridge.exposeInMainWorld('devTools', {
    openDevTools: () => ipcRenderer.invoke('open-dev-tools'),
    reload: () => ipcRenderer.invoke('reload-window'),

    // Console methods for debugging
    log: (...args) => console.log('[DEV]', ...args),
    error: (...args) => console.error('[DEV]', ...args),
    warn: (...args) => console.warn('[DEV]', ...args)
  });
}
