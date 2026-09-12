const { BrowserWindow, app, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

function getWindowShapeRects(width, height, isCircle, radiusVal = 16) {
  let radius = 16;
  if (isCircle) {
    radius = Math.floor(Math.min(width, height) / 2);
  } else {
    const num = Number(radiusVal);
    if (!isNaN(num) && num >= 0 && num <= 50) {
      radius = Math.round((num / 100) * Math.min(width, height));
    } else {
      radius = 16;
    }
  }

  radius = Math.min(radius, Math.floor(width / 2), Math.floor(height / 2));
  if (radius <= 0) return [{ x: 0, y: 0, width, height }];

  const rects = [];
  for (let y = 0; y < height; y++) {
    let dx = 0;
    if (y < radius) {
      const dy = radius - y;
      dx = Math.round(radius - Math.sqrt(radius * radius - dy * dy));
    } else if (y >= height - radius) {
      const dy = y - (height - radius - 1);
      dx = Math.round(radius - Math.sqrt(radius * radius - dy * dy));
    }

    const w = width - 2 * dx;
    if (w > 0) {
      rects.push({ x: dx, y: y, width: w, height: 1 });
    }
  }
  return rects;
}

class WindowManager {
  constructor() {
    this.window = null;
    this.preferencesWindow = null;
    this.recordingBarWindow = null;
    this.isQuitting = false;
    this.isCircle = false;
    this.radius = 16;
  }

  getSettingsPath() {
    try {
      return path.join(app.getPath('userData'), 'floaty-settings.json');
    } catch {
      return null;
    }
  }

  loadSettings() {
    try {
      const p = this.getSettingsPath();
      if (p && fs.existsSync(p)) {
        const raw = fs.readFileSync(p, 'utf8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read floaty-settings.json', e);
    }
    return {};
  }

  saveSettings(newSettings = {}) {
    try {
      const p = this.getSettingsPath();
      if (p) {
        const current = this.loadSettings();
        const merged = { ...current, ...newSettings };
        fs.writeFileSync(p, JSON.stringify(merged, null, 2), 'utf8');
        return merged;
      }
    } catch (e) {
      console.warn('Could not save floaty-settings.json', e);
    }
    return null;
  }

  getWindowStatePath() {
    try {
      return path.join(app.getPath('userData'), 'window-state.json');
    } catch {
      return null;
    }
  }

  loadWindowState() {
    try {
      const statePath = this.getWindowStatePath();
      if (statePath && fs.existsSync(statePath)) {
        const raw = fs.readFileSync(statePath, 'utf8');
        const data = JSON.parse(raw);
        if (data.width >= 160 && data.width <= 600 && data.height >= 160 && data.height <= 600) {
          return data;
        }
      }
    } catch (e) {
      console.warn('Could not read window-state.json', e);
    }
    return null;
  }

  saveWindowState() {
    try {
      const statePath = this.getWindowStatePath();
      if (statePath && this.window && !this.window.isDestroyed()) {
        const [w, h] = this.window.getSize();
        const data = {
          width: Math.max(160, Math.min(600, w)),
          height: Math.max(160, Math.min(600, h)),
          isCircle: Boolean(this.isCircle),
          radius: Number(this.radius) || 16
        };
        fs.writeFileSync(statePath, JSON.stringify(data, null, 2), 'utf8');
        this.saveSettings(data);
      }
    } catch (e) {
      console.warn('Could not save window-state.json', e);
    }
  }

  createWindow() {
    const savedSettings = this.loadSettings();
    const savedState = this.loadWindowState();

    const initialWidth = savedSettings?.width || savedState?.width || 240;
    const initialHeight = savedSettings?.height || savedState?.height || 240;
    this.isCircle =
      savedSettings.isCircle !== undefined
        ? Boolean(savedSettings.isCircle)
        : Boolean(savedState?.isCircle);
    this.radius =
      savedSettings.radius !== undefined
        ? Number(savedSettings.radius)
        : (savedState?.radius !== undefined ? Number(savedState.radius) : 16);

    const iconPath = path.join(__dirname, '../../assets/icon.png');
    const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;

    this.window = new BrowserWindow({
      icon: appIcon || iconPath,
      width: initialWidth,
      height: initialHeight,
      minWidth: 160,
      minHeight: 160,
      maxWidth: 600,
      maxHeight: 600,
      maximizable: false,
      fullscreenable: false,
      transparent: true,
      backgroundColor: '#00000000',
      frame: false,
      alwaysOnTop: true,
      resizable: true,
      hasShadow: false,
      vibrancy: process.platform === 'darwin' ? 'under-window' : undefined,
      visualEffectState: process.platform === 'darwin' ? 'active' : undefined,
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        enableRemoteModule: false,
        webSecurity: true
      }
    });

    // Enhanced window properties for floating behavior
    this.setAlwaysOnTop(true);

    if (process.platform === 'linux' && appIcon && !appIcon.isEmpty()) {
      this.window.setIcon(appIcon);
    }

    // Hide dock icon on macOS for cleaner experience
    if (process.platform === 'darwin') {
      app.dock.hide();
    }

    // Forward renderer console logs
    this.window.webContents.on('console-message', (event, level, message, line, sourceId) => {
      console.log(`[Renderer] ${message}`);
    });

    // Load the renderer
    this.window.loadFile(path.join(__dirname, '../renderer/index.html'));
    this.window.setBackgroundColor('#00000000');

    // Window event handlers
    this.window.on('closed', () => {
      this.window = null;
    });

    // Prevent window from being destroyed when closed on macOS
    this.window.on('close', event => {
      if (process.platform === 'darwin' && !this.isQuitting) {
        event.preventDefault();
        this.window.hide();
      }
    });

    // Handle window blur/focus for better UX
    this.window.on('blur', () => {
      if (this.window) {
        this.window.webContents.send('window-blur');
      }
    });

    // Apply window shape mask to eliminate black corner artifacts
    this.window.once('ready-to-show', () => {
      this.applyWindowShape();
    });

    this.window.on('resize', () => {
      this.applyWindowShape();
      this.saveWindowState();
    });

    return this.window;
  }

  applyWindowShape() {
    if (!this.window || typeof this.window.setShape !== 'function') return;
    try {
      const [width, height] = this.window.getSize();
      const rects = getWindowShapeRects(width, height, this.isCircle, this.radius);
      this.window.setShape(rects);
    } catch (err) {
      console.warn('Could not apply window shape:', err);
    }
  }

  setShape(isCircle, radius) {
    if (typeof isCircle === 'boolean') {
      this.isCircle = isCircle;
    }
    if (radius !== undefined && radius !== null) {
      this.radius = radius;
    }
    this.applyWindowShape();
    this.saveWindowState();
    this.saveSettings({
      isCircle: this.isCircle,
      radius: this.radius
    });
  }

  getWindow() {
    return this.window;
  }

  showWindow() {
    if (this.window) {
      this.window.show();
      this.window.focus();
    }
  }

  hideWindow() {
    if (this.window) {
      this.window.hide();
    }
  }

  toggleWindow() {
    if (this.window) {
      if (this.window.isVisible()) {
        this.hideWindow();
      } else {
        this.showWindow();
      }
    }
  }

  setAlwaysOnTop(flag) {
    if (!this.window) return;
    const shouldBeOnTop = Boolean(flag);
    if (process.platform === 'darwin') {
      this.window.setAlwaysOnTop(shouldBeOnTop, 'screen-saver');
      this.window.setVisibleOnAllWorkspaces(shouldBeOnTop, { visibleOnFullScreen: true });
    } else {
      // On Linux/Windows, standard always-on-top without macOS-specific level string
      this.window.setAlwaysOnTop(shouldBeOnTop);
      this.window.setVisibleOnAllWorkspaces(shouldBeOnTop);
    }
  }

  setQuitting(isQuitting) {
    this.isQuitting = isQuitting;
  }

  openPreferencesWindow() {
    if (this.preferencesWindow && !this.preferencesWindow.isDestroyed()) {
      this.preferencesWindow.show();
      this.preferencesWindow.focus();
      return this.preferencesWindow;
    }

    const iconPath = path.join(__dirname, '../../assets/icon.png');
    const appIcon = fs.existsSync(iconPath) ? nativeImage.createFromPath(iconPath) : null;

    this.preferencesWindow = new BrowserWindow({
      icon: appIcon || iconPath,
      width: 580,
      height: 680,
      minWidth: 500,
      minHeight: 560,
      title: 'Floaty Settings',
      backgroundColor: '#0c0d12',
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    this.preferencesWindow.loadFile(path.join(__dirname, '../renderer/preferences.html'));

    this.preferencesWindow.on('closed', () => {
      this.preferencesWindow = null;
    });

    return this.preferencesWindow;
  }

  openRecordingBarWindow() {
    if (this.recordingBarWindow && !this.recordingBarWindow.isDestroyed()) {
      this.recordingBarWindow.show();
      return this.recordingBarWindow;
    }

    const { screen } = require('electron');
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: screenWidth, height: screenHeight } = primaryDisplay.workAreaSize;
    const barWidth = 320;
    const barHeight = 64;

    this.recordingBarWindow = new BrowserWindow({
      width: barWidth,
      height: barHeight,
      x: Math.round((screenWidth - barWidth) / 2),
      y: screenHeight - barHeight - 48,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      resizable: false,
      skipTaskbar: true,
      hasShadow: false,
      webPreferences: {
        preload: path.join(__dirname, '../preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    });

    if (process.platform === 'darwin') {
      this.recordingBarWindow.setAlwaysOnTop(true, 'screen-saver');
      this.recordingBarWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    } else {
      this.recordingBarWindow.setAlwaysOnTop(true);
      this.recordingBarWindow.setVisibleOnAllWorkspaces(true);
    }

    this.recordingBarWindow.loadFile(path.join(__dirname, '../renderer/recording-bar.html'));

    this.recordingBarWindow.on('closed', () => {
      this.recordingBarWindow = null;
    });

    return this.recordingBarWindow;
  }

  closeRecordingBarWindow() {
    if (this.recordingBarWindow && !this.recordingBarWindow.isDestroyed()) {
      this.recordingBarWindow.close();
      this.recordingBarWindow = null;
    }
  }

  destroy() {
    if (this.recordingBarWindow && !this.recordingBarWindow.isDestroyed()) {
      this.recordingBarWindow.destroy();
      this.recordingBarWindow = null;
    }
    if (this.preferencesWindow && !this.preferencesWindow.isDestroyed()) {
      this.preferencesWindow.destroy();
      this.preferencesWindow = null;
    }
    if (this.window) {
      this.window.destroy();
      this.window = null;
    }
  }
}

module.exports = WindowManager;
