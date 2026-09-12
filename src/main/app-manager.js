const { app, BrowserWindow, session } = require('electron');
const WindowManager = require('./window-manager');
const IPCHandlers = require('./ipc-handlers');
const ShortcutManager = require('./shortcut-manager');
const MenuManager = require('./menu-manager');

class AppManager {
  constructor() {
    this.windowManager = new WindowManager();
    this.ipcHandlers = new IPCHandlers(this.windowManager);
    this.shortcutManager = new ShortcutManager(this.windowManager);
    this.menuManager = new MenuManager(this.windowManager);
    this.isReady = false;
  }

  async initialize() {
    // Handle app events
    app.whenReady().then(() => {
      this.onReady();
    });

    app.on('window-all-closed', () => {
      this.onWindowAllClosed();
    });

    app.on('activate', () => {
      this.onActivate();
    });

    app.on('before-quit', () => {
      this.onBeforeQuit();
    });

    app.on('will-quit', () => {
      this.onWillQuit();
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (event, contents) => {
      contents.on('new-window', (event, navigationUrl) => {
        event.preventDefault();
        console.log('Prevented new window creation:', navigationUrl);
      });
    });

    // Handle certificate errors
    app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
      // In development, ignore certificate errors for localhost
      if (process.env.NODE_ENV === 'development' && url.startsWith('https://localhost')) {
        event.preventDefault();
        callback(true);
      } else {
        callback(false);
      }
    });
  }

  async onReady() {
    this.isReady = true;

    // Grant media permissions (camera, microphone)
    if (session.defaultSession) {
      session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
        if (
          [
            'media',
            'videoCapture',
            'audioCapture',
            'camera',
            'microphone',
            'display-capture',
            'screen'
          ].includes(permission)
        ) {
          return callback(true);
        }
        callback(false);
      });

      session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
        if (
          [
            'media',
            'videoCapture',
            'audioCapture',
            'camera',
            'microphone',
            'display-capture',
            'screen'
          ].includes(permission)
        ) {
          return true;
        }
        return false;
      });

      if (session.defaultSession.setDevicePermissionHandler) {
        session.defaultSession.setDevicePermissionHandler(() => true);
      }

      if (session.defaultSession.setDisplayMediaRequestHandler) {
        session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
          callback({ useSystemPicker: true });
        });
      }
    }

    // On Linux, delaying window creation by 300ms prevents the compositor race condition where transparency renders black
    const initWindow = async () => {
      this.windowManager.createWindow();
      this.menuManager.createMenu();
      await this.shortcutManager.checkPermissions();
      this.shortcutManager.registerShortcuts();
      console.log('Floaty is ready!');
    };

    if (process.platform === 'linux') {
      setTimeout(initWindow, 300);
    } else {
      await initWindow();
    }
  }

  onWindowAllClosed() {
    // On macOS, keep the app running even when all windows are closed
    if (process.platform !== 'darwin') {
      app.quit();
    }
  }

  onActivate() {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      this.windowManager.createWindow();
    } else {
      this.windowManager.showWindow();
    }
  }

  onBeforeQuit() {
    this.windowManager.setQuitting(true);
  }

  onWillQuit() {
    // Clean up global shortcuts
    this.shortcutManager.unregisterAll();
  }

  getWindowManager() {
    return this.windowManager;
  }

  getShortcutManager() {
    return this.shortcutManager;
  }

  getMenuManager() {
    return this.menuManager;
  }
}

module.exports = AppManager;
