const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('floatingCam', {
  ping: () => ipcRenderer.invoke('ping'),
  setWindowSize: (width, height) => ipcRenderer.invoke('set-window-size', { width, height }),
  getWindowSize: () => ipcRenderer.invoke('get-window-size'),
  getWindowPosition: () => ipcRenderer.invoke('get-window-position'),
  setWindowPosition: (x, y) => ipcRenderer.invoke('set-window-position', { x, y }),
  toggleAlwaysOnTop: () => ipcRenderer.invoke('toggle-always-on-top'),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke('set-always-on-top', flag),
  isAlwaysOnTop: () => ipcRenderer.invoke('is-always-on-top'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getShape: () => ipcRenderer.invoke('get-shape'),
  updateShape: (isCircle, radius) => ipcRenderer.invoke('update-shape', { isCircle, radius }),
  openPreferences: () => ipcRenderer.invoke('open-preferences'),
  hidePreferences: () => ipcRenderer.invoke('hide-preferences'),
  showPreferences: () => ipcRenderer.invoke('show-preferences'),
  syncSetting: (key, value) => ipcRenderer.invoke('sync-setting', { key, value }),
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  onSettingSynced: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('setting-synced', handler);
    return () => ipcRenderer.removeListener('setting-synced', handler);
  },
  getDesktopSources: () => ipcRenderer.invoke('get-desktop-sources'),
  saveRecording: (buffer, defaultName) => ipcRenderer.invoke('save-recording', { buffer, defaultName }),
  showInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
  openRecordingBar: () => ipcRenderer.invoke('open-recording-bar'),
  closeRecordingBar: () => ipcRenderer.invoke('close-recording-bar'),
  updateRecordingBar: (data) => ipcRenderer.invoke('update-recording-bar', data),
  sendRecordingAction: (action) => ipcRenderer.invoke('send-recording-action', action),
  onRecordingBarUpdate: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('recording-bar-update', handler);
    return () => ipcRenderer.removeListener('recording-bar-update', handler);
  },
  onRecordingAction: (callback) => {
    const handler = (event, data) => callback(data);
    ipcRenderer.on('recording-action', handler);
    return () => ipcRenderer.removeListener('recording-action', handler);
  },
});

