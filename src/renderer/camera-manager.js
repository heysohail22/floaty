class CameraManager {
  constructor() {
    this.stream = null;
    this.currentDeviceId = null;
    this.devices = [];
    this.videoElement = document.getElementById('video');
    this.isFlipped = true; // Default mirrored
    this.isLoading = false;
    this.retryCount = 0;
    this.maxRetries = 3;

    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Listen for device changes
    navigator.mediaDevices.addEventListener('devicechange', () => {
      this.refreshDevices();
    });

    // Listen for video events
    if (this.videoElement) {
      this.videoElement.addEventListener('loadstart', () => {
        this.onLoadStart();
      });

      this.videoElement.addEventListener('loadeddata', () => {
        this.onLoadedData();
      });

      this.videoElement.addEventListener('error', e => {
        this.onError(e);
      });

      this.videoElement.addEventListener('playing', () => {
        this.onPlaying();
      });
    }
  }

  async initialize() {
    this.showLoading(true);
    try {
      await this.refreshDevices();
      await this.startCamera();
    } catch (error) {
      console.error('Failed to initialize camera:', error);
      this.showError('Failed to initialize camera');
    }
  }

  async refreshDevices() {
    try {
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      console.log('All enumerated devices:', JSON.stringify(allDevices));
      this.devices = allDevices.filter(device => device.kind === 'videoinput');
      console.log('Video devices count:', this.devices.length, JSON.stringify(this.devices));

      // Dispatch event for UI to update device list
      window.dispatchEvent(
        new CustomEvent('camera-devices-updated', {
          detail: { devices: this.devices }
        })
      );
    } catch (error) {
      console.error('Failed to enumerate devices:', error);
      throw error;
    }
  }

  async startCamera(deviceId = null) {
    this.isLoading = true;
    this.showLoading(true);
    this.hideError();

    try {
      // Stop existing stream
      if (this.stream) {
        this.stopCamera();
      }

      if (!this.videoElement || !this.videoElement.isConnected) {
        this.videoElement = document.getElementById('video');
      }

      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: false
      };

      try {
        this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (firstError) {
        if (firstError.name === 'NotReadableError' || firstError.name === 'NotAllowedError') {
          throw firstError;
        }
        // Try fallback with basic constraints
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: false
        });
      }

      if (this.videoElement) {
        this.videoElement.srcObject = this.stream;
        this.currentDeviceId = deviceId;
        this.applyFlip();
      }

      this.retryCount = 0;
      this.hideError();

      // Dispatch success event
      window.dispatchEvent(
        new CustomEvent('camera-started', {
          detail: { deviceId: this.currentDeviceId }
        })
      );
    } catch (error) {
      console.error('Failed to start camera:', error);

      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(`Retrying camera start (${this.retryCount}/${this.maxRetries})...`);
        setTimeout(() => this.startCamera(deviceId), 1000 * this.retryCount);
      } else {
        let msg = 'Camera unavailable or permission denied';
        if (
          error.name === 'NotReadableError' ||
          (error.message && error.message.includes('Could not start video source'))
        ) {
          msg = 'Camera is busy (in use by another app like OBS Studio, Zoom, or Discord)';
        } else if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          msg = 'Camera permission denied';
        } else if (error.name === 'NotFoundError' || (this.devices && this.devices.length === 0)) {
          msg = 'Camera is locked by another app (e.g. OBS Studio) or disconnected';
        } else if (error.name === 'OverconstrainedError') {
          msg = 'Camera resolution not supported';
        }

        this.showError(msg);
        window.dispatchEvent(
          new CustomEvent('camera-error', {
            detail: { error: msg }
          })
        );
      }
    } finally {
      this.isLoading = false;
      this.showLoading(false);
    }
  }

  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
    }

    this.currentDeviceId = null;

    // Dispatch stop event
    window.dispatchEvent(new CustomEvent('camera-stopped'));
  }

  switchCamera(deviceId) {
    if (deviceId !== this.currentDeviceId) {
      this.startCamera(deviceId);
    }
  }

  setFlipped(flipped) {
    this.isFlipped = Boolean(flipped);
    this.applyFlip();
    window.dispatchEvent(
      new CustomEvent('camera-flipped', {
        detail: { isFlipped: this.isFlipped }
      })
    );
  }

  toggleFlip() {
    this.isFlipped = !this.isFlipped;
    this.applyFlip();

    // Dispatch flip event
    window.dispatchEvent(
      new CustomEvent('camera-flipped', {
        detail: { isFlipped: this.isFlipped }
      })
    );
  }

  applyFlip() {
    if (this.videoElement) {
      this.videoElement.style.transform = this.isFlipped ? 'scaleX(-1)' : 'scaleX(1)';
    }
  }

  async takeSnapshot() {
    if (!this.videoElement || !this.stream) {
      throw new Error('Camera not available');
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    canvas.width = this.videoElement.videoWidth;
    canvas.height = this.videoElement.videoHeight;

    // Apply flip if needed
    if (this.isFlipped) {
      context.scale(-1, 1);
      context.translate(-canvas.width, 0);
    }

    context.drawImage(this.videoElement, 0, 0);

    return new Promise(resolve => {
      canvas.toBlob(resolve, 'image/png');
    });
  }

  showLoading(show) {
    window.dispatchEvent(
      new CustomEvent('camera-loading', {
        detail: { isLoading: show }
      })
    );
  }

  showError(message) {
    this.hideError();
    const contentArea = document.getElementById('contentArea');
    if (contentArea) {
      const errorDiv = document.createElement('div');
      errorDiv.className = 'error-message';
      errorDiv.innerHTML = `
        <div class="error-icon">📹</div>
        <div class="error-text">${message}</div>
        <button class="retry-btn">Retry</button>
      `;
      const retryBtn = errorDiv.querySelector('.retry-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', async e => {
          e.stopPropagation();
          retryBtn.textContent = 'Connecting...';
          retryBtn.disabled = true;
          this.retryCount = 0;
          await this.initialize();
        });
      }
      contentArea.appendChild(errorDiv);
    }
  }

  hideError() {
    const errorElements = document.querySelectorAll('.error-message');
    errorElements.forEach(el => el.remove());
  }

  // Event handlers
  onLoadStart() {
    console.log('Camera loading started');
  }

  onLoadedData() {
    console.log('Camera data loaded');
  }

  onError(event) {
    console.error('Video error:', event);
    this.showError('Camera error occurred');
  }

  onPlaying() {
    console.log('Camera playing');
    this.showLoading(false);
  }

  // Getters
  isActive() {
    return this.stream !== null;
  }

  getCurrentDevice() {
    return this.devices.find(device => device.deviceId === this.currentDeviceId);
  }

  getDevices() {
    return this.devices;
  }

  getFlipState() {
    return this.isFlipped;
  }
}

window.CameraManager = CameraManager;
