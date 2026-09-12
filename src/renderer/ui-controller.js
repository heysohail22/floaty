class UIController {
  constructor() {
    this.elements = this.initializeElements();
    this.state = {
      controlsVisible: false,
      sizePanelVisible: false,
      isCircle: false,
      opacity: 1,
      borderRadius: 16
    };

    this.opacities = [1, 0.9, 0.75, 0.6, 0.4];
    this.opacityIndex = 0;

    this.initializeEventListeners();
    this.setupKeyboardShortcuts();

    // Initialize window shape from saved state or defaults
    this.initShape();
  }

  async initShape() {
    try {
      const shape = await window.floatingCam?.getShape?.();
      if (shape) {
        if (typeof shape.radius === 'number') {
          this.state.borderRadius = shape.radius;
        }
        this.state.isCircle = Boolean(shape.isCircle);
        document.body.classList.toggle('circle', this.state.isCircle);
        this.updateCircleButton();
        if (!this.state.isCircle) {
          this.updateBorderRadius(this.state.borderRadius, false);
        }
        return;
      }
    } catch (e) {
      console.warn('Could not load initial shape:', e);
    }
    this.updateBorderRadius(this.state.borderRadius, false);
  }

  initializeElements() {
    return {
      // Main elements
      app: document.getElementById('app'),
      video: document.getElementById('video'),
      toolbar: document.querySelector('.toolbar'),
      contentArea: document.getElementById('contentArea'),

      // Controls
      toolbarCircleBtn: document.getElementById('toolbarCircleBtn'),
      toolbarPinBtn: document.getElementById('toolbarPinBtn'),
      toggleBtn: document.getElementById('toggleBtn'),
      controlsOverlay: document.getElementById('controlsOverlay'),
      closeOverlayBtn: document.getElementById('closeOverlayBtn'),

      // Action buttons
      pinBtn: document.getElementById('pinBtn'),
      flipBtn: document.getElementById('flipBtn'),
      circleBtn: document.getElementById('circleBtn'),
      opacityBtn: document.getElementById('opacityBtn'),
      settingsBtn: document.getElementById('settingsBtn'),
      hideBarBtn: document.getElementById('hideBarBtn'),

      // Radius control
      radiusRange: document.getElementById('radiusRange'),
      radiusValue: document.getElementById('radiusValue'),

      // Size panel
      sizePanel: document.getElementById('sizePanel'),
      widthInput: document.getElementById('widthInput'),
      heightInput: document.getElementById('heightInput'),
      applySizeBtn: document.getElementById('applySizeBtn'),

      // Resize handle
      resizeHandle: document.getElementById('resizeHandle'),

      // Quick action buttons
      snapshotBtn: document.getElementById('snapshotBtn'),
      preferencesBtn: document.getElementById('preferencesBtn'),

      // Device selection
      deviceSelect: document.getElementById('deviceSelect'),
      deviceSelection: document.getElementById('deviceSelection'),

      // Loading overlay
      loadingOverlay: null // Will be created dynamically
    };
  }

  initializeEventListeners() {
    // Toggle preferences window
    this.elements.toggleBtn?.addEventListener('click', () => {
      window.floatingCam?.openPreferences?.();
    });

    // Close overlay
    this.elements.closeOverlayBtn?.addEventListener('click', () => {
      this.hideControls();
    });

    // Close overlay when clicking backdrop
    this.elements.controlsOverlay?.addEventListener('click', e => {
      if (e.target === this.elements.controlsOverlay) {
        this.hideControls();
      }
    });

    // Always on top / Sticky controls
    this.elements.toolbarPinBtn?.addEventListener('click', () => {
      this.toggleAlwaysOnTop();
    });

    this.elements.pinBtn?.addEventListener('click', () => {
      this.toggleAlwaysOnTop();
    });

    // Camera controls
    this.elements.toolbarCircleBtn?.addEventListener('click', () => {
      this.toggleCircle();
    });

    this.elements.flipBtn?.addEventListener('click', () => {
      window.cameraManager?.toggleFlip();
    });

    this.elements.circleBtn?.addEventListener('click', () => {
      this.toggleCircle();
    });

    this.elements.opacityBtn?.addEventListener('click', () => {
      this.cycleOpacity();
    });

    // Radius control
    this.elements.radiusRange?.addEventListener('input', e => {
      this.updateBorderRadius(e.target.value);
    });

    window.addEventListener('resize', () => {
      if (!this.state.isCircle) {
        this.updateBorderRadius(this.state.borderRadius, false);
      }
    });

    // Size panel
    this.elements.settingsBtn?.addEventListener('click', () => {
      this.toggleSizePanel();
    });

    this.elements.applySizeBtn?.addEventListener('click', () => {
      this.applySize();
    });

    // Preset buttons
    this.elements.sizePanel?.querySelectorAll('.presets button').forEach(btn => {
      btn.addEventListener('click', () => {
        this.applyPreset(btn.dataset.preset);
      });
    });

    // Quick action buttons
    this.elements.snapshotBtn?.addEventListener('click', () => {
      this.takeSnapshot();
    });

    this.elements.preferencesBtn?.addEventListener('click', () => {
      this.showPreferences();
    });

    this.elements.hideBarBtn?.addEventListener('click', () => {
      this.toggleToolbarVisibility();
    });

    // Device selection
    this.elements.deviceSelect?.addEventListener('change', e => {
      if (e.target.value && window.cameraManager) {
        window.cameraManager.switchCamera(e.target.value);
      }
    });

    // Resize handle
    this.setupResizeHandle();

    // Draggable window from video
    this.setupWindowDragging();

    // Listen for camera events
    this.setupCameraEventListeners();

    // Listen for IPC events
    this.setupIPCEventListeners();

    // Prevent context menu
    window.addEventListener('contextmenu', e => e.preventDefault());
  }

  setupCameraEventListeners() {
    window.addEventListener('camera-loading', e => {
      this.showLoading(e.detail.isLoading);
    });

    window.addEventListener('camera-started', e => {
      this.hideError();
    });

    window.addEventListener('camera-error', e => {
      this.showError(`Camera Error: ${e.detail.error}`);
    });

    window.addEventListener('camera-flipped', e => {
      this.updateFlipButton(e.detail.isFlipped);
      window.floatingCam?.syncSetting?.('flip', e.detail.isFlipped);
    });
  }

  setupIPCEventListeners() {
    // Listen for real-time synchronization from the Preferences window
    window.floatingCam?.onSettingSynced?.(data => {
      if (!data) return;
      const { key, value } = data;

      if (key === 'shape') {
        if (this.state.isCircle !== value.isCircle) {
          this.setCircle(value.isCircle, false);
        }
        if (!value.isCircle && value.radius !== undefined) {
          this.updateBorderRadius(value.radius, false);
        }
      } else if (key === 'radius') {
        this.updateBorderRadius(value, false);
      } else if (key === 'flip') {
        if (window.cameraManager && window.cameraManager.isFlipped !== value) {
          window.cameraManager.toggleFlip();
        }
      } else if (key === 'opacity') {
        this.setOpacity(value);
      } else if (key === 'alwaysOnTop') {
        this.updateAlwaysOnTopUI(value);
      } else if (key === 'camera-device') {
        window.cameraManager?.switchCamera(value);
      } else if (key === 'snapshot') {
        this.takeSnapshot();
      } else if (key === 'autoHideBar') {
        this.elements.toolbar?.classList.toggle('always-visible', !value);
      } else if (key === 'size') {
        if (value && value.width && value.height) {
          const w = Math.max(160, Math.min(600, parseInt(value.width, 10)));
          const h = Math.max(160, Math.min(600, parseInt(value.height, 10)));
          this.savedRectSize = { width: w, height: h };
          if (window.settingsManager) {
            window.settingsManager.update({
              'window.width': w,
              'window.height': h,
              'window.rectWidth': w,
              'window.rectHeight': h
            });
          }
        }
      }
    });

    // Listen for IPC setting sync from Preferences or other windows
    window.floatingCam?.onSettingSynced?.(data => {
      if (!data) return;
      if (data.key === 'shape' && data.value) {
        if (
          typeof data.value.isCircle === 'boolean' &&
          data.value.isCircle !== this.state.isCircle
        ) {
          this.setCircle(data.value.isCircle, false);
        }
        if (typeof data.value.radius === 'number') {
          this.updateBorderRadius(data.value.radius, false);
        }
      } else if (data.key === 'radius') {
        this.updateBorderRadius(Number(data.value), false);
      } else if (data.key === 'opacity') {
        this.setOpacity(data.value);
      } else if (data.key === 'alwaysOnTop') {
        this.updateAlwaysOnTopUI(Boolean(data.value));
      } else if (data.key === 'flip') {
        window.cameraManager?.setFlipped(data.value);
      } else if (data.key === 'camera-device') {
        window.cameraManager?.switchCamera(data.value);
      }
    });

    // Listen for IPC events from main process (e.g. global shortcuts)
    window.addEventListener('message', event => {
      if (event.data.type === 'show-controls') {
        window.floatingCam?.openPreferences?.();
      } else if (event.data.type === 'reload-camera') {
        window.cameraManager?.initialize();
      } else if (event.data.type === 'toggle-flip') {
        window.cameraManager?.toggleFlip();
      } else if (event.data.type === 'toggle-circle') {
        this.toggleCircle();
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Only handle shortcuts when not in input fields
      if (e.target.tagName === 'INPUT') return;

      switch (e.key) {
      case 'Escape':
        this.hideControls();
        break;
      case ' ':
        e.preventDefault();
        window.floatingCam?.openPreferences?.();
        break;
      case 'f':
      case 'F':
        window.cameraManager?.toggleFlip();
        break;
      case 'c':
      case 'C':
        this.toggleCircle();
        break;
      case 'o':
      case 'O':
        this.cycleOpacity();
        break;
      case 's':
      case 'S':
        this.toggleSizePanel();
        break;
      case 'h':
      case 'H':
        this.toggleToolbarVisibility();
        break;
      case 'p':
      case 'P':
        this.toggleAlwaysOnTop();
        break;
      }
    });
  }

  // Control methods
  showControls() {
    this.state.controlsVisible = true;
    this.elements.controlsOverlay?.removeAttribute('hidden');
    this.elements.app?.classList.add('controls-open');
  }

  hideControls() {
    this.state.controlsVisible = false;
    this.elements.controlsOverlay?.setAttribute('hidden', '');
    this.elements.sizePanel?.setAttribute('hidden', '');
    this.state.sizePanelVisible = false;
    this.elements.app?.classList.remove('controls-open');
  }

  toggleControls() {
    if (this.state.controlsVisible) {
      this.hideControls();
    } else {
      this.showControls();
    }
  }

  async setCircle(isCircle, save = true) {
    this.state.isCircle = Boolean(isCircle);
    document.body.classList.toggle('circle', this.state.isCircle);

    if (this.state.isCircle) {
      // Save current dimensions before converting to circle
      try {
        const currentSize = await window.floatingCam?.getWindowSize();
        if (currentSize) {
          this.savedRectSize = { width: currentSize.width, height: currentSize.height };
          if (save && window.settingsManager) {
            window.settingsManager.update({
              'window.rectWidth': currentSize.width,
              'window.rectHeight': currentSize.height
            });
          }
          // Set to a square 1:1 aspect ratio so it's a true, perfect circle (Loom style)
          const diameter = Math.min(currentSize.width, currentSize.height);
          await window.floatingCam?.setWindowSize(diameter, diameter);
        }
      } catch (err) {
        console.warn('Could not set circle size:', err);
      }
    } else {
      // Restore previous rectangular size and custom radius
      let rectW =
        this.savedRectSize?.width || window.settingsManager?.get('window.rectWidth') || 240;
      let rectH =
        this.savedRectSize?.height || window.settingsManager?.get('window.rectHeight') || 240;

      rectW = Math.min(Math.max(rectW, 160), 600);
      rectH = Math.min(Math.max(rectH, 160), 600);

      await window.floatingCam?.setWindowSize(rectW, rectH);
      this.updateBorderRadius(this.state.borderRadius, false);
    }

    this.updateCircleButton();
    window.floatingCam?.updateShape?.(this.state.isCircle, this.state.borderRadius);
    window.floatingCam?.syncSetting?.('shape', {
      isCircle: this.state.isCircle,
      radius: this.state.borderRadius
    });
    window.floatingCam?.saveSettings?.({
      isCircle: this.state.isCircle,
      radius: this.state.borderRadius
    });
    if (save && window.settingsManager) {
      window.settingsManager.set('camera.isCircle', this.state.isCircle);
    }
  }

  async toggleCircle() {
    await this.setCircle(!this.state.isCircle, true);
    this.showStatus(this.state.isCircle ? 'Circle mode enabled' : 'Rectangle mode enabled', 'info');
  }

  setOpacity(value) {
    this.state.opacity = Math.max(0.1, Math.min(1, parseFloat(value) || 1));
    if (this.elements.video) {
      this.elements.video.style.opacity = this.state.opacity;
    }
    this.updateOpacityButton();
  }

  cycleOpacity() {
    this.opacityIndex = (this.opacityIndex + 1) % this.opacities.length;
    this.state.opacity = this.opacities[this.opacityIndex];

    if (this.elements.video) {
      this.elements.video.style.opacity = this.state.opacity;
    }

    this.updateOpacityButton();
    window.floatingCam?.syncSetting?.('opacity', this.state.opacity);
  }

  updateBorderRadius(value, broadcast = true) {
    const val = Math.max(0, Math.min(50, parseInt(value, 10) || 0));
    this.state.borderRadius = val;

    const width = window.innerWidth || 240;
    const height = window.innerHeight || 240;
    const minDim = Math.min(width, height);
    const radiusPx = Math.round((val / 100) * minDim);

    if (!this.state.isCircle) {
      const radiusCss = `${radiusPx}px`;

      if (this.elements.app) {
        this.elements.app.style.borderRadius = radiusCss;
      }
      if (this.elements.contentArea) {
        this.elements.contentArea.style.borderRadius = radiusCss;
      }
      if (this.elements.video) {
        this.elements.video.style.borderRadius = radiusCss;
      }
      if (this.elements.controlsOverlay) {
        this.elements.controlsOverlay.style.borderRadius = radiusCss;
      }

      window.floatingCam?.updateShape?.(false, val);
      if (broadcast) {
        window.floatingCam?.syncSetting?.('radius', val);
      }
      window.floatingCam?.saveSettings?.({ radius: val });
      if (window.settingsManager) {
        window.settingsManager.update({
          'window.borderRadius': val
        });
      }
    }

    if (this.elements.radiusValue) {
      this.elements.radiusValue.textContent = `${val}%`;
    }

    if (this.elements.radiusRange) {
      this.elements.radiusRange.value = val;
    }
  }

  // Size panel methods
  toggleSizePanel() {
    if (this.state.sizePanelVisible) {
      this.hideSizePanel();
    } else {
      this.showSizePanel();
    }
  }

  async showSizePanel() {
    this.state.sizePanelVisible = true;

    // Get current window size
    try {
      const size = await window.floatingCam?.getWindowSize();
      if (size) {
        if (this.elements.widthInput) this.elements.widthInput.value = size.width;
        if (this.elements.heightInput) this.elements.heightInput.value = size.height;
      }
    } catch (error) {
      console.error('Failed to get window size:', error);
    }

    this.elements.sizePanel?.removeAttribute('hidden');
  }

  hideSizePanel() {
    this.state.sizePanelVisible = false;
    this.elements.sizePanel?.setAttribute('hidden', '');
  }

  async applySize() {
    let width = parseInt(this.elements.widthInput?.value, 10);
    let height = parseInt(this.elements.heightInput?.value, 10);

    if (this.state.isCircle) {
      width = Math.min(width, height);
      height = width;
    }

    if (width && height) {
      try {
        width = Math.min(Math.max(width, 160), 500);
        height = Math.min(Math.max(height, 160), 500);
        await window.floatingCam?.setWindowSize(width, height);

        if (window.settingsManager) {
          const updates = { 'window.width': width, 'window.height': height };
          if (!this.state.isCircle) {
            updates['window.rectWidth'] = width;
            updates['window.rectHeight'] = height;
          }
          window.settingsManager.update(updates);
        }
      } catch (error) {
        console.error('Failed to set window size:', error);
        this.showToast('Failed to resize window');
      }
    }
  }

  async applyPreset(ratio) {
    try {
      if (this.state.isCircle) {
        await this.setCircle(false, true);
      }
      const size = await window.floatingCam?.getWindowSize();
      if (!size) return;

      const [rw, rh] = ratio.split(':').map(Number);
      if (!rw || !rh) return;

      const newWidth = Math.min(Math.max(size.width, 160), 500);
      const newHeight = Math.min(Math.max(Math.round(newWidth * (rh / rw)), 160), 500);

      await window.floatingCam?.setWindowSize(newWidth, newHeight);

      if (this.elements.widthInput) this.elements.widthInput.value = newWidth;
      if (this.elements.heightInput) this.elements.heightInput.value = newHeight;

      if (window.settingsManager) {
        window.settingsManager.update({
          'window.width': newWidth,
          'window.height': newHeight,
          'window.rectWidth': newWidth,
          'window.rectHeight': newHeight
        });
      }
    } catch (error) {
      console.error('Failed to apply preset:', error);
      this.showToast('Failed to apply preset');
    }
  }

  // Resize handle
  setupResizeHandle() {
    if (!this.elements.resizeHandle) return;

    let resizing = false;
    let startX, startY, startW, startH;

    this.elements.resizeHandle.addEventListener('mousedown', async e => {
      e.preventDefault();

      try {
        const size = await window.floatingCam?.getWindowSize();
        if (!size) return;

        resizing = true;
        startX = e.screenX;
        startY = e.screenY;
        startW = size.width;
        startH = size.height;

        document.body.classList.add('resizing');
      } catch (error) {
        console.error('Failed to start resize:', error);
      }
    });

    window.addEventListener('mouseup', async () => {
      if (resizing) {
        resizing = false;
        document.body.classList.remove('resizing');
        try {
          const size = await window.floatingCam?.getWindowSize();
          if (size) {
            const updates = { 'window.width': size.width, 'window.height': size.height };
            if (!this.state.isCircle) {
              updates['window.rectWidth'] = size.width;
              updates['window.rectHeight'] = size.height;
              this.savedRectSize = { width: size.width, height: size.height };
            }
            window.settingsManager?.update(updates);
            window.floatingCam?.saveSettings?.(
              this.state.isCircle
                ? { width: size.width, height: size.height, isCircle: true }
                : {
                  width: size.width,
                  height: size.height,
                  rectWidth: size.width,
                  rectHeight: size.height,
                  isCircle: false
                }
            );
          }
        } catch (err) {
          console.warn('Could not save resized size:', err);
        }
      }
    });

    window.addEventListener('mousemove', async e => {
      if (!resizing) return;

      const dx = e.screenX - startX;
      const dy = e.screenY - startY;
      let newW = Math.max(160, startW + dx);
      let newH = Math.max(160, startH + dy);

      if (this.state.isCircle) {
        const delta = Math.abs(dx) > Math.abs(dy) ? dx : dy;
        const diameter = Math.min(Math.max(160, startW + delta), 500);
        newW = diameter;
        newH = diameter;
      } else {
        newW = Math.min(newW, 500);
        newH = Math.min(newH, 500);
      }

      try {
        await window.floatingCam?.setWindowSize(newW, newH);

        if (this.elements.widthInput) this.elements.widthInput.value = newW;
        if (this.elements.heightInput) this.elements.heightInput.value = newH;
      } catch (error) {
        console.error('Failed to resize:', error);
      }
    });
  }

  // UI feedback methods
  updateFlipButton(isFlipped) {
    if (this.elements.flipBtn) {
      this.elements.flipBtn.classList.toggle('active', isFlipped);
    }
  }

  updateCircleButton() {
    if (this.elements.circleBtn) {
      this.elements.circleBtn.classList.toggle('active', this.state.isCircle);
    }
    if (this.elements.toolbarCircleBtn) {
      this.elements.toolbarCircleBtn.classList.toggle('active', this.state.isCircle);
    }
  }

  updateOpacityButton() {
    if (this.elements.opacityBtn) {
      const opacityPercent = Math.round(this.state.opacity * 100);
      this.elements.opacityBtn.title = `Opacity: ${opacityPercent}%`;
    }
  }

  // Loading and error states
  showLoading(show) {
    if (show) {
      if (!this.elements.loadingOverlay) {
        this.createLoadingOverlay();
      }
      this.elements.loadingOverlay.style.display = 'flex';
    } else {
      if (this.elements.loadingOverlay) {
        this.elements.loadingOverlay.style.display = 'none';
      }
    }
  }

  createLoadingOverlay() {
    this.elements.loadingOverlay = document.createElement('div');
    this.elements.loadingOverlay.className = 'loading-overlay';
    this.elements.loadingOverlay.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-text">Starting camera...</div>
      </div>
    `;
    this.elements.contentArea?.appendChild(this.elements.loadingOverlay);
  }

  showError(message) {
    this.showToast(message, 'error');
  }

  hideError() {
    // Remove any error messages
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => el.remove());
  }

  showStatus(message, type = 'info') {
    this.showToast(message, type);
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => toast.classList.add('show'), 100);

    // Remove after delay
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Initialize UI state
  initialize() {
    // Set initial values
    this.updateBorderRadius(this.state.borderRadius);
    this.updateOpacityButton();
    this.updateCircleButton();

    // Initialize camera manager reference
    if (window.cameraManager) {
      this.updateFlipButton(window.cameraManager.getFlipState());
    }

    // Setup device selection
    this.setupDeviceSelection();
  }

  // Snapshot functionality
  async takeSnapshot() {
    try {
      if (!window.cameraManager || !window.cameraManager.isActive()) {
        this.showToast('Camera not available for snapshot', 'error');
        return;
      }

      this.showToast('Taking snapshot...', 'info');

      const blob = await window.cameraManager.takeSnapshot();
      if (blob) {
        // Create download link
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `floating-cam-snapshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
        a.click();

        URL.revokeObjectURL(url);
        this.showToast('Snapshot saved!', 'success');
      } else {
        this.showToast('Failed to take snapshot', 'error');
      }
    } catch (error) {
      console.error('Snapshot error:', error);
      this.showToast('Failed to take snapshot', 'error');
    }
  }

  // Preferences functionality
  showPreferences() {
    window.floatingCam?.openPreferences?.();
  }

  // Device selection setup
  async setupDeviceSelection() {
    try {
      if (window.cameraManager) {
        // Listen for device updates
        window.addEventListener('camera-devices-updated', e => {
          this.updateDeviceList(e.detail.devices);
        });

        // Try to get initial devices
        const devices = window.cameraManager.getDevices();
        if (devices && devices.length > 0) {
          this.updateDeviceList(devices);
        }
      }
    } catch (error) {
      console.error('Failed to setup device selection:', error);
    }
  }

  // Update device list
  updateDeviceList(devices) {
    if (!this.elements.deviceSelect || !this.elements.deviceSelection) return;

    // Clear existing options
    this.elements.deviceSelect.innerHTML = '<option value="">Select camera...</option>';

    if (devices && devices.length > 0) {
      devices.forEach(device => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${devices.indexOf(device) + 1}`;
        this.elements.deviceSelect.appendChild(option);
      });

      // Show device selection if multiple devices
      if (devices.length > 1) {
        this.elements.deviceSelection.style.display = 'block';
      }

      // Select current device
      if (window.cameraManager && window.cameraManager.currentDeviceId) {
        this.elements.deviceSelect.value = window.cameraManager.currentDeviceId;
      }
    } else {
      this.elements.deviceSelection.style.display = 'none';
    }
  }

  async toggleAlwaysOnTop() {
    if (window.floatingCam?.toggleAlwaysOnTop) {
      const isTop = await window.floatingCam.toggleAlwaysOnTop();
      this.updateAlwaysOnTopUI(isTop);
      window.floatingCam?.syncSetting?.('alwaysOnTop', isTop);
      if (window.settingsManager) {
        window.settingsManager.set('window.alwaysOnTop', isTop);
      }
      this.showStatus(isTop ? 'Always on Top enabled' : 'Always on Top disabled', 'info');
    }
  }

  updateAlwaysOnTopUI(isTop) {
    this.state.isAlwaysOnTop = isTop;
    if (this.elements.toolbarPinBtn) {
      this.elements.toolbarPinBtn.classList.toggle('active', isTop);
      this.elements.toolbarPinBtn.title = isTop
        ? 'Always on Top: ON (Sticky)'
        : 'Always on Top: OFF';
    }
    if (this.elements.pinBtn) {
      this.elements.pinBtn.classList.toggle('active', isTop);
      this.elements.pinBtn.title = isTop ? 'Always on Top: ON (Sticky)' : 'Always on Top: OFF';
    }
  }

  toggleToolbarVisibility() {
    this.state.toolbarHidden = !this.state.toolbarHidden;
    document.body.classList.toggle('toolbar-hidden', this.state.toolbarHidden);
    if (this.elements.hideBarBtn) {
      this.elements.hideBarBtn.classList.toggle('active', this.state.toolbarHidden);
      const label = this.elements.hideBarBtn.querySelector('span:last-child');
      if (label) {
        label.textContent = this.state.toolbarHidden ? 'Show Bar' : 'Hide Bar';
      }
    }
    this.showStatus(
      this.state.toolbarHidden ? 'Top bar hidden (Press H to restore)' : 'Top bar visible',
      'info'
    );
  }

  setupWindowDragging() {
    let isDragging = false;
    let startScreenX = 0;
    let startScreenY = 0;
    let startWinX = 0;
    let startWinY = 0;

    const dragTarget = this.elements.contentArea || this.elements.app;
    if (!dragTarget) return;

    dragTarget.addEventListener('mousedown', async e => {
      // Don't drag if clicking buttons, inputs, controls overlay or resize handle
      if (e.button !== 0) return;
      if (e.target.closest('button, input, select, #resizeHandle, .controls-overlay, .toolbar'))
        return;

      try {
        const pos = await window.floatingCam?.getWindowPosition();
        if (!pos) return;
        isDragging = true;
        startScreenX = e.screenX;
        startScreenY = e.screenY;
        startWinX = pos.x;
        startWinY = pos.y;
        document.body.style.userSelect = 'none';
      } catch (err) {
        console.warn('Drag initialization error:', err);
      }
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.screenX - startScreenX;
      const dy = e.screenY - startScreenY;
      window.floatingCam?.setWindowPosition(Math.round(startWinX + dx), Math.round(startWinY + dy));
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        document.body.style.userSelect = '';
      }
    });
  }
}

window.UIController = UIController;
