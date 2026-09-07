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
    this.isQuitting = false;
    this.isCircle = false;
    this.radius = 16;
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
          if (data.width >= 480 && data.height >= 480) {
            data.width = 240;
            data.height = 240;
          }
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
          width: w >= 480 && h >= 480 ? 240 : w,
          height: w >= 480 && h >= 480 ? 240 : h,
          isCircle: this.isCircle,
          radius: this.radius
        };
        fs.writeFileSync(statePath, JSON.stringify(data, null, 2), 'utf8');
      }
    } catch (e) {
      console.warn('Could not save window-state.json', e);
    }
  }

  createWindow() {
    const savedState = this.loadWindowState();
    const initialWidth = savedState?.width || 240;
    const initialHeight = savedState?.height || 240;
    this.isCircle = Boolean(savedState?.isCircle);
    this.radius = savedState?.radius !== undefined ? savedState.radius : 16;

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
      width: 500,
      height: 560,
      minWidth: 440,
      minHeight: 480,
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

  destroy() {
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
