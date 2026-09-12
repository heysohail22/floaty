const { ipcMain, desktopCapturer, dialog, shell, app } = require('electron');
const fs = require('fs');
const path = require('path');

class IPCHandlers {
  constructor(windowManager) {
    this.windowManager = windowManager;
    this.setupHandlers();
  }

  setupHandlers() {
    // Window management handlers
    ipcMain.handle('get-window-size', () => {
      const window = this.windowManager.getWindow();
      if (!window) return null;
      const [width, height] = window.getSize();
      return { width, height };
    });

    ipcMain.handle('set-window-size', (event, { width, height }) => {
      const window = this.windowManager.getWindow();
      if (!window) return false;

      const w = Math.max(160, Math.min(600, parseInt(width, 10)) || 0);
      const h = Math.max(160, Math.min(600, parseInt(height, 10)) || 0);

      if (w && h) {
        window.setSize(w, h, true);
        this.windowManager.applyWindowShape();
        this.windowManager.saveWindowState();
        this.windowManager.saveSettings({ width: w, height: h });
        return true;
      }
      return false;
    });

    ipcMain.handle('update-shape', (event, { isCircle, radius }) => {
      this.windowManager.setShape(isCircle, radius);
      return true;
    });

    ipcMain.handle('get-shape', () => {
      return {
        isCircle: Boolean(this.windowManager.isCircle),
        radius: this.windowManager.radius !== undefined ? this.windowManager.radius : 16
      };
    });

    ipcMain.handle('get-window-position', () => {
      const window = this.windowManager.getWindow();
      if (!window) return null;
      const [x, y] = window.getPosition();
      return { x, y };
    });

    ipcMain.handle('set-window-position', (event, { x, y }) => {
      const window = this.windowManager.getWindow();
      if (!window) return false;

      window.setPosition(x, y);
      return true;
    });

    // Window state handlers
    ipcMain.handle('toggle-always-on-top', () => {
      const window = this.windowManager.getWindow();
      if (!window) return false;

      const nextState = !window.isAlwaysOnTop();
      this.windowManager.setAlwaysOnTop(nextState);
      return nextState;
    });

    ipcMain.handle('set-always-on-top', (event, flag) => {
      const window = this.windowManager.getWindow();
      if (!window) return false;

      this.windowManager.setAlwaysOnTop(Boolean(flag));
      return window.isAlwaysOnTop();
    });

    ipcMain.handle('is-always-on-top', () => {
      const window = this.windowManager.getWindow();
      if (!window) return false;
      return window.isAlwaysOnTop();
    });

    ipcMain.handle('minimize-window', () => {
      const window = this.windowManager.getWindow();
      if (window) {
        window.minimize();
      }
    });

    ipcMain.handle('hide-window', () => {
      this.windowManager.hideWindow();
    });

    ipcMain.handle('show-window', () => {
      this.windowManager.showWindow();
    });

    ipcMain.handle('open-preferences', () => {
      this.windowManager.openPreferencesWindow();
      return true;
    });

    ipcMain.handle('hide-preferences', () => {
      if (
        this.windowManager.preferencesWindow &&
        !this.windowManager.preferencesWindow.isDestroyed()
      ) {
        this.windowManager.preferencesWindow.hide();
      }
      return true;
    });

    ipcMain.handle('show-preferences', () => {
      if (
        this.windowManager.preferencesWindow &&
        !this.windowManager.preferencesWindow.isDestroyed()
      ) {
        this.windowManager.preferencesWindow.show();
        this.windowManager.preferencesWindow.focus();
      }
      return true;
    });

    ipcMain.handle('sync-setting', (event, { key, value }) => {
      if (key === 'radius') {
        const rad = Number(value);
        if (!isNaN(rad)) {
          this.windowManager.setShape(this.windowManager.isCircle, rad);
        }
      } else if (key === 'shape' && value) {
        this.windowManager.setShape(value.isCircle, value.radius);
      } else if (key === 'size' && value) {
        const w = Math.max(160, Math.min(600, parseInt(value.width, 10)));
        const h = Math.max(160, Math.min(600, parseInt(value.height, 10)));
        const win = this.windowManager.getWindow();
        if (win && !win.isDestroyed()) {
          win.setSize(w, h, true);
          this.windowManager.applyWindowShape();
        }
        this.windowManager.saveWindowState();
        this.windowManager.saveSettings({ width: w, height: h });
      } else if (key === 'alwaysOnTop') {
        this.windowManager.setAlwaysOnTop(Boolean(value));
        this.windowManager.saveSettings({ alwaysOnTop: Boolean(value) });
      } else if (key) {
        this.windowManager.saveSettings({ [key]: value });
      }

      const mainWindow = this.windowManager.getWindow();
      if (mainWindow && !mainWindow.isDestroyed() && event.sender !== mainWindow.webContents) {
        mainWindow.webContents.send('setting-synced', { key, value });
      }
      const prefWin = this.windowManager.preferencesWindow;
      if (prefWin && !prefWin.isDestroyed() && event.sender !== prefWin.webContents) {
        prefWin.webContents.send('setting-synced', { key, value });
      }
      return true;
    });

    // App control handlers
    ipcMain.handle('quit-app', () => {
      const { app } = require('electron');
      this.windowManager.setQuitting(true);
      app.quit();
    });

    ipcMain.handle('get-app-version', () => {
      const { app } = require('electron');
      return app.getVersion();
    });

    // Settings handlers
    ipcMain.handle('get-settings', () => {
      const saved = this.windowManager.loadSettings();
      return {
        ...saved,
        isCircle: Boolean(this.windowManager.isCircle),
        radius: this.windowManager.radius !== undefined ? this.windowManager.radius : 16
      };
    });

    ipcMain.handle('save-settings', (event, settings) => {
      if (settings && typeof settings === 'object') {
        if (typeof settings.isCircle === 'boolean' || settings.radius !== undefined) {
          this.windowManager.setShape(settings.isCircle, settings.radius);
        }
        if (settings.width && settings.height) {
          const w = Math.max(160, Math.min(600, parseInt(settings.width, 10)));
          const h = Math.max(160, Math.min(600, parseInt(settings.height, 10)));
          const win = this.windowManager.getWindow();
          if (win && !win.isDestroyed()) {
            win.setSize(w, h, true);
            this.windowManager.applyWindowShape();
          }
        }
        return this.windowManager.saveSettings(settings);
      }
      return true;
    });

    // Camera handlers
    ipcMain.handle('get-camera-devices', async () => {
      // This will be handled by the renderer's navigator.mediaDevices
      // But we can provide a fallback or additional device info here
      return [];
    });

    // Screen & Application capture sources
    ipcMain.handle('get-desktop-sources', async () => {
      try {
        const isWayland =
          process.platform === 'linux' &&
          Boolean(process.env.WAYLAND_DISPLAY || process.env.XDG_SESSION_TYPE === 'wayland');

        if (isWayland) {
          const { screen } = require('electron');
          const displays = screen.getAllDisplays();
          const mappedSources = displays.map((d, idx) => ({
            id: `display:${d.id}`,
            name:
              displays.length > 1
                ? `Screen ${idx + 1} (${d.bounds.width}×${d.bounds.height})`
                : `Primary Display (${d.bounds.width}×${d.bounds.height})`,
            display_id: String(d.id),
            isScreen: true,
            isWayland: true,
            width: d.bounds.width,
            height: d.bounds.height,
            thumbnail: null,
            appIcon: null
          }));

          mappedSources.push({
            id: 'wayland:system-picker',
            name: 'Choose Application Window (System Selector)',
            display_id: '',
            isScreen: false,
            isWayland: true,
            thumbnail: null,
            appIcon: null
          });

          return mappedSources;
        }

        // On X11 / macOS / Windows:
        let sources = [];
        try {
          sources = await desktopCapturer.getSources({
            types: ['screen', 'window'],
            thumbnailSize: { width: 320, height: 180 },
            fetchWindowIcons: true
          });
        } catch (capturerErr) {
          console.warn('desktopCapturer.getSources notice:', capturerErr);
        }

        const mappedSources = sources
          .filter(s => s.name || s.id.startsWith('screen:'))
          .map(source => ({
            id: source.id,
            name: source.name || 'Screen Display',
            display_id: source.display_id,
            isScreen: source.id.startsWith('screen:'),
            thumbnail:
              source.thumbnail && !source.thumbnail.isEmpty() ? source.thumbnail.toDataURL() : null,
            appIcon: source.appIcon && !source.appIcon.isEmpty() ? source.appIcon.toDataURL() : null
          }));

        return mappedSources;
      } catch (err) {
        console.error('Failed to get desktop sources:', err);
        return [];
      }
    });

    // Save recording to file
    ipcMain.handle('save-recording', async (event, { buffer, defaultName }) => {
      try {
        const defaultDir = app.getPath('videos') || app.getPath('documents') || app.getPath('home');
        const filename = defaultName || `Floaty_Recording_${Date.now()}.webm`;
        const defaultPath = path.join(defaultDir, filename);

        const { canceled, filePath } = await dialog.showSaveDialog({
          title: 'Save Floaty Recording',
          defaultPath,
          filters: [
            { name: 'WebM Video (*.webm)', extensions: ['webm'] },
            { name: 'MP4 Video (*.mp4)', extensions: ['mp4'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (canceled || !filePath) {
          return { success: false, canceled: true };
        }

        const nodeBuffer = Buffer.from(buffer);
        fs.writeFileSync(filePath, nodeBuffer);
        return { success: true, filePath };
      } catch (err) {
        console.error('Failed to save recording:', err);
        return { success: false, error: err.message };
      }
    });

    // Reveal item in native file explorer
    ipcMain.handle('show-item-in-folder', async (event, filePath) => {
      try {
        if (filePath && fs.existsSync(filePath)) {
          shell.showItemInFolder(filePath);
          return true;
        }
      } catch (err) {
        console.error('Failed to show item in folder:', err);
      }
      return false;
    });

    // Floating Recording Bar Controls
    ipcMain.handle('open-recording-bar', () => {
      this.windowManager.openRecordingBarWindow();
      return true;
    });

    ipcMain.handle('close-recording-bar', () => {
      this.windowManager.closeRecordingBarWindow();
      return true;
    });

    ipcMain.handle('update-recording-bar', (event, data) => {
      const bar = this.windowManager.recordingBarWindow;
      if (bar && !bar.isDestroyed()) {
        bar.webContents.send('recording-bar-update', data);
      }
      return true;
    });

    ipcMain.handle('send-recording-action', (event, action) => {
      const pref = this.windowManager.preferencesWindow;
      if (pref && !pref.isDestroyed()) {
        pref.webContents.send('recording-action', action);
      }
      return true;
    });
  }
}

module.exports = IPCHandlers;
