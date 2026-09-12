// Main renderer entry point
class FloatingCamApp {
  constructor() {
    this.cameraManager = null;
    this.uiController = null;
    this.settingsManager = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      console.log('Initializing Floating Cam...');

      // Initialize settings first
      this.settingsManager = new SettingsManager();
      window.settingsManager = this.settingsManager;
      await this.settingsManager.load();

      // Initialize UI controller
      this.uiController = new UIController();
      window.uiController = this.uiController;
      await this.uiController.initShape();

      // Initialize camera manager
      this.cameraManager = new CameraManager();
      window.cameraManager = this.cameraManager;

      // Set up cross-component communication
      this.setupEventListeners();

      // Apply saved settings
      await this.settingsManager.applySettings();

      // Initialize UI
      this.uiController.initialize();

      // Sync always-on-top state with UI
      if (window.floatingCam?.isAlwaysOnTop) {
        const isTop = await window.floatingCam.isAlwaysOnTop();
        this.uiController.updateAlwaysOnTopUI(isTop);
      }

      // Start camera if auto-start is enabled
      if (this.settingsManager.get('camera.autoStart')) {
        await this.cameraManager.initialize();
      }

      this.isInitialized = true;
      console.log('Floating Cam initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Floating Cam:', error);
      this.showInitializationError(error);
    }
  }

  setupEventListeners() {
    // Settings events
    this.settingsManager.on('setting-changed', event => {
      this.handleSettingChange(event);
    });

    // Camera events
    window.addEventListener('camera-started', () => {
      // Save the current camera device
      if (this.cameraManager.currentDeviceId) {
        this.settingsManager.set('camera.deviceId', this.cameraManager.currentDeviceId);
      }
    });

    window.addEventListener('camera-flipped', event => {
      // Save flip state
      this.settingsManager.set('camera.isFlipped', event.detail.isFlipped);
    });

    // Window events (debounced, and only after initial load finishes)
    let resizeTimer = null;
    window.addEventListener('resize', () => {
      if (!this.isInitialized) return;
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.saveWindowSize();
      }, 250);
    });

    // Handle window focus/blur
    window.addEventListener('window-focus', () => {
      document.body.classList.add('window-focused');
    });

    window.addEventListener('window-blur', () => {
      document.body.classList.remove('window-focused');
    });

    // Handle IPC messages from main process
    if (window.electronAPI) {
      window.electronAPI.onMessage(message => {
        this.handleIPCMessage(message);
      });
    }

    // Handle page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Page is hidden, pause camera if needed
        this.handleVisibilityChange(false);
      } else {
        // Page is visible, resume camera if needed
        this.handleVisibilityChange(true);
      }
    });

    // Handle before unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  async handleSettingChange(event) {
    const { path, value } = event;

    try {
      // Handle specific setting changes
      switch (path) {
      case 'window.width':
      case 'window.height':
        await this.applyWindowSize();
        break;

      case 'window.opacity':
        this.applyOpacity(value);
        break;

      case 'window.borderRadius':
        this.uiController.updateBorderRadius(value);
        break;

      case 'camera.deviceId':
        if (value && this.cameraManager.isActive()) {
          this.cameraManager.switchCamera(value);
        }
        break;

      case 'ui.theme':
        this.applyTheme(value);
        break;

      case 'ui.showToolbar':
        this.toggleToolbar(value);
        break;
      }
    } catch (error) {
      console.error(`Failed to apply setting change for ${path}:`, error);
    }
  }

  handleIPCMessage(message) {
    switch (message.type) {
    case 'show-controls':
      this.uiController.showControls();
      break;

    case 'reload-camera':
      this.cameraManager.initialize();
      break;

    case 'toggle-flip':
      this.cameraManager.toggleFlip();
      break;

    case 'toggle-circle':
      this.uiController.toggleCircle();
      break;

    case 'show-about':
      this.showAboutDialog();
      break;

    case 'show-preferences':
      this.showPreferences();
      break;

    case 'show-shortcuts':
      this.showShortcuts();
      break;

    case 'always-on-top-changed':
      this.uiController.updateAlwaysOnTopUI(message.value);
      this.settingsManager.set('window.alwaysOnTop', message.value);
      break;
    }
  }

  handleVisibilityChange(isVisible) {
    if (isVisible) {
      // Resume camera if it was active
      if (this.settingsManager.get('camera.autoStart') && !this.cameraManager.isActive()) {
        this.cameraManager.initialize();
      }
    } else {
      // Optionally pause camera to save resources
      // This depends on user preference
    }
  }

  async saveWindowSize() {
    if (!this.isInitialized) return;
    try {
      const size = await window.floatingCam?.getWindowSize();
      if (size) {
        const w = Math.min(Math.max(size.width, 160), 600);
        const h = Math.min(Math.max(size.height, 160), 600);
        const updates = {
          'window.width': w,
          'window.height': h
        };
        // When not in circle mode, also update the rectangle restore dimensions
        if (!this.uiController?.state?.isCircle) {
          updates['window.rectWidth'] = w;
          updates['window.rectHeight'] = h;
        }
        this.settingsManager.update(updates);
        window.floatingCam?.saveSettings?.(
          this.uiController?.state?.isCircle
            ? { width: w, height: h, isCircle: true }
            : { width: w, height: h, rectWidth: w, rectHeight: h, isCircle: false }
        );
      }
    } catch (error) {
      console.error('Failed to save window size:', error);
    }
  }

  async applyWindowSize() {
    const width = this.settingsManager.get('window.width');
    const height = this.settingsManager.get('window.height');

    if (width && height && window.floatingCam) {
      const w = Math.min(Math.max(width, 160), 600);
      const h = Math.min(Math.max(height, 160), 600);
      await window.floatingCam.setWindowSize(w, h);
    }
  }

  applyOpacity(opacity) {
    const video = document.getElementById('video');
    if (video) {
      video.style.opacity = opacity;
    }
  }

  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
  }

  toggleToolbar(show) {
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) {
      toolbar.style.display = show ? 'flex' : 'none';
    }
  }

  showInitializationError(error) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'initialization-error';
    errorDiv.innerHTML = `
      <div class="error-content">
        <h2>Initialization Error</h2>
        <p>Failed to start Floating Cam:</p>
        <code>${error.message}</code>
        <button onclick="location.reload()">Retry</button>
      </div>
    `;

    document.body.appendChild(errorDiv);
  }

  showAboutDialog() {
    // Create and show about dialog
    const aboutDialog = document.createElement('div');
    aboutDialog.className = 'modal-overlay';
    aboutDialog.innerHTML = `
      <div class="modal-content about-dialog">
        <div class="modal-header">
          <h2>About Floating Cam</h2>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="app-icon">
            <img src="../../assets/icon.png" alt="Floating Cam Icon" class="about-app-logo" />
          </div>
          <h3>Floating Cam</h3>
          <p>Version ${window.floatingCam?.getVersion?.() || '1.0.0'}</p>
          <p>A cross-platform floating camera window that stays always on top.</p>
          <div class="credits">
            <p>Created with ❤️ using Electron</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(aboutDialog);
  }

  showPreferences() {
    // Create and show preferences dialog
    const prefsDialog = document.createElement('div');
    prefsDialog.className = 'modal-overlay preferences-dialog';
    prefsDialog.innerHTML = this.createPreferencesHTML();

    // Add click outside to close
    prefsDialog.addEventListener('click', e => {
      if (e.target === prefsDialog) {
        prefsDialog.remove();
      }
    });

    // Add escape key to close
    const handleEscape = e => {
      if (e.key === 'Escape') {
        prefsDialog.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    document.body.appendChild(prefsDialog);
    this.initializePreferencesHandlers(prefsDialog);

    // Focus the modal for accessibility
    setTimeout(() => {
      const firstButton = prefsDialog.querySelector('.tab-btn');
      if (firstButton) firstButton.focus();
    }, 100);
  }

  createPreferencesHTML() {
    const settings = this.settingsManager.settings;

    return `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Preferences</h2>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="preferences-tabs">
            <button class="tab-btn active" data-tab="general">General</button>
            <button class="tab-btn" data-tab="camera">Camera</button>
            <button class="tab-btn" data-tab="shortcuts">Shortcuts</button>
            <button class="tab-btn" data-tab="advanced">Advanced</button>
          </div>
          
          <div class="tab-content" id="general">
            <div class="setting-group">
              <label>
                <input type="checkbox" ${settings.ui.showToolbar ? 'checked' : ''} data-setting="ui.showToolbar">
                Show toolbar
              </label>
              
              <label>
                <input type="checkbox" ${settings.ui.animationsEnabled ? 'checked' : ''} data-setting="ui.animationsEnabled">
                Enable animations
              </label>
              
              <label>
                Theme:
                <select data-setting="ui.theme">
                  <option value="dark" ${settings.ui.theme === 'dark' ? 'selected' : ''}>Dark</option>
                  <option value="light" ${settings.ui.theme === 'light' ? 'selected' : ''}>Light</option>
                </select>
              </label>
            </div>
          </div>
          
          <div class="tab-content" id="camera" style="display: none;">
            <div class="setting-group">
              <label>
                <input type="checkbox" ${settings.camera.autoStart ? 'checked' : ''} data-setting="camera.autoStart">
                Auto-start camera
              </label>
              
              <label>
                <input type="checkbox" ${settings.camera.isFlipped ? 'checked' : ''} data-setting="camera.isFlipped">
                Mirror camera by default
              </label>
            </div>
          </div>
          
          <div class="tab-content" id="shortcuts" style="display: none;">
            <div class="setting-group">
              <p>Keyboard shortcuts:</p>
              <ul class="shortcuts-list">
                <li><kbd>Space</kbd> - Toggle controls</li>
                <li><kbd>F</kbd> - Flip camera</li>
                <li><kbd>C</kbd> - Toggle circle mode</li>
                <li><kbd>O</kbd> - Cycle opacity</li>
                <li><kbd>S</kbd> - Toggle size panel</li>
                <li><kbd>Escape</kbd> - Close controls</li>
              </ul>
            </div>
          </div>
          
          <div class="tab-content" id="advanced" style="display: none;">
            <div class="setting-group">
              <label>
                <input type="checkbox" ${settings.advanced.hardwareAcceleration ? 'checked' : ''} data-setting="advanced.hardwareAcceleration">
                Hardware acceleration
              </label>
              
              <label>
                <input type="checkbox" ${settings.advanced.debugMode ? 'checked' : ''} data-setting="advanced.debugMode">
                Debug mode
              </label>
              
              <button class="settings-btn" onclick="window.app.resetSettings()">Reset to defaults</button>
              <button class="settings-btn" onclick="window.app.exportSettings()">Export settings</button>
              <button class="settings-btn" onclick="window.app.importSettings()">Import settings</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  initializePreferencesHandlers(dialog) {
    // Tab switching
    dialog.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tabId = btn.dataset.tab;

        // Update tab buttons
        dialog.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update tab content
        dialog.querySelectorAll('.tab-content').forEach(content => {
          content.style.display = content.id === tabId ? 'block' : 'none';
        });
      });
    });

    // Setting inputs
    dialog.querySelectorAll('[data-setting]').forEach(input => {
      input.addEventListener('change', () => {
        const setting = input.dataset.setting;
        const value = input.type === 'checkbox' ? input.checked : input.value;
        this.settingsManager.set(setting, value);
      });
    });
  }

  showShortcuts() {
    const shortcutsDialog = document.createElement('div');
    shortcutsDialog.className = 'modal-overlay';
    shortcutsDialog.innerHTML = `
      <div class="modal-content shortcuts-dialog">
        <div class="modal-header">
          <h2>Keyboard Shortcuts</h2>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-grid">
            <div class="shortcut-item">
              <kbd>Space</kbd>
              <span>Toggle controls</span>
            </div>
            <div class="shortcut-item">
              <kbd>F</kbd>
              <span>Flip camera</span>
            </div>
            <div class="shortcut-item">
              <kbd>C</kbd>
              <span>Toggle circle mode</span>
            </div>
            <div class="shortcut-item">
              <kbd>O</kbd>
              <span>Cycle opacity</span>
            </div>
            <div class="shortcut-item">
              <kbd>S</kbd>
              <span>Toggle size panel</span>
            </div>
            <div class="shortcut-item">
              <kbd>Escape</kbd>
              <span>Close controls</span>
            </div>
            <div class="shortcut-item">
              <kbd>Cmd+Alt+H</kbd>
              <span>Hide/Show window</span>
            </div>
            <div class="shortcut-item">
              <kbd>Cmd+Alt+P</kbd>
              <span>Toggle always on top (Sticky)</span>
            </div>
            <div class="shortcut-item">
              <kbd>Cmd+Alt+R</kbd>
              <span>Reload camera</span>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(shortcutsDialog);
  }

  resetSettings() {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      this.settingsManager.reset();
      location.reload();
    }
  }

  exportSettings() {
    const settings = this.settingsManager.export();
    const blob = new Blob([settings], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'floating-cam-settings.json';
    a.click();

    URL.revokeObjectURL(url);
  }

  importSettings() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const success = this.settingsManager.import(e.target.result);
            if (success) {
              alert('Settings imported successfully!');
              location.reload();
            } else {
              alert('Failed to import settings. Please check the file format.');
            }
          } catch (error) {
            alert('Failed to import settings: ' + error.message);
          }
        };
        reader.readAsText(file);
      }
    };

    input.click();
  }

  cleanup() {
    // Clean up resources before unload
    if (this.cameraManager) {
      this.cameraManager.stopCamera();
    }

    // Save current state
    this.saveWindowSize();
  }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new FloatingCamApp();
  window.app.initialize();
});

// Export for debugging
window.FloatingCamApp = FloatingCamApp;
