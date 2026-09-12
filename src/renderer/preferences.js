// Floaty Preferences Controller
document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  const cameraSelect = document.getElementById('cameraSelect');
  const refreshCamerasBtn = document.getElementById('refreshCamerasBtn');
  const flipSwitch = document.getElementById('flipSwitch');

  const presetButtons = document.querySelectorAll('.preset-btn');
  const widthInput = document.getElementById('prefWidthInput');
  const heightInput = document.getElementById('prefHeightInput');
  const applyDimsBtn = document.getElementById('applyDimsBtn');

  const shapeCircleBtn = document.getElementById('shapeCircleBtn');
  const shapeRectBtn = document.getElementById('shapeRectBtn');
  const radiusCard = document.getElementById('radiusCard');
  const radiusSlider = document.getElementById('prefRadiusSlider');
  const radiusBadge = document.getElementById('radiusBadge');

  const opacitySlider = document.getElementById('prefOpacitySlider');
  const opacityBadge = document.getElementById('opacityBadge');

  const alwaysOnTopSwitch = document.getElementById('alwaysOnTopSwitch');
  const autoHideBarSwitch = document.getElementById('autoHideBarSwitch');
  const snapshotBtn = document.getElementById('prefSnapshotBtn');

  // Tab Switching
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      tabButtons.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`tab-${targetTab}`);
      if (pane) pane.classList.add('active');
    });
  });

  // Populate Cameras
  async function loadCameras() {
    try {
      cameraSelect.innerHTML = '<option value="">Loading cameras...</option>';
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');

      cameraSelect.innerHTML = '';
      if (videoDevices.length === 0) {
        cameraSelect.innerHTML = '<option value="">No cameras detected</option>';
        return;
      }

      const savedDeviceId = localStorage.getItem('floaty_camera_id') || '';

      videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${index + 1}`;
        if (device.deviceId === savedDeviceId || (!savedDeviceId && index === 0)) {
          option.selected = true;
        }
        cameraSelect.appendChild(option);
      });
    } catch (err) {
      console.error('Failed to enumerate cameras:', err);
      cameraSelect.innerHTML = '<option value="">Permission denied or unavailable</option>';
    }
  }

  cameraSelect.addEventListener('change', e => {
    const deviceId = e.target.value;
    if (deviceId) {
      localStorage.setItem('floaty_camera_id', deviceId);
      window.floatingCam?.syncSetting('camera-device', deviceId);
      window.floatingCam?.saveSettings?.({ deviceId });
    }
  });

  refreshCamerasBtn?.addEventListener('click', () => {
    loadCameras();
  });

  // Mirror / Flip
  const savedFlip = localStorage.getItem('floaty_flip');
  flipSwitch.checked = savedFlip !== null ? savedFlip === 'true' : true;

  flipSwitch.addEventListener('change', e => {
    const isFlipped = e.target.checked;
    localStorage.setItem('floaty_flip', isFlipped);
    window.floatingCam?.syncSetting('flip', isFlipped);
    window.floatingCam?.saveSettings?.({ isFlipped });
  });

  // Aspect Ratio & Sizes
  const presetMap = {
    '1:1': { w: 240, h: 240 },
    '4:3': { w: 320, h: 240 },
    '16:9': { w: 384, h: 216 },
    '9:16': { w: 216, h: 384 }
  };

  function saveSize(w, h) {
    localStorage.setItem('floaty_width', w);
    localStorage.setItem('floaty_height', h);
    window.floatingCam?.saveSettings?.({ width: w, height: h });
    try {
      const raw = localStorage.getItem('floating-cam-settings');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.window = parsed.window || {};
      parsed.window.width = w;
      parsed.window.height = h;
      parsed.window.rectWidth = w;
      parsed.window.rectHeight = h;
      localStorage.setItem('floating-cam-settings', JSON.stringify(parsed));
    } catch (e) {
      console.warn('Could not persist size to floating-cam-settings', e);
    }
  }

  async function syncCurrentSizeInputs() {
    try {
      const size = await window.floatingCam?.getWindowSize();
      const settings = await window.floatingCam?.getSettings?.();
      let w = size?.width || settings?.width;
      let h = size?.height || settings?.height;

      if (!w || !h) {
        const savedW = parseInt(localStorage.getItem('floaty_width'), 10);
        const savedH = parseInt(localStorage.getItem('floaty_height'), 10);
        if (savedW && savedH) {
          w = savedW;
          h = savedH;
        } else {
          w = 240;
          h = 240;
        }
      }

      widthInput.value = w;
      heightInput.value = h;
      highlightActivePreset(w, h);
    } catch (e) {
      console.warn('Could not read window size', e);
    }
  }

  function highlightActivePreset(w, h) {
    presetButtons.forEach(btn => {
      const p = presetMap[btn.dataset.preset];
      if (p && Math.abs(p.w - w) < 4 && Math.abs(p.h - h) < 4) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  presetButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const preset = presetMap[btn.dataset.preset];
      if (preset) {
        widthInput.value = preset.w;
        heightInput.value = preset.h;
        highlightActivePreset(preset.w, preset.h);
        saveSize(preset.w, preset.h);

        await window.floatingCam?.setWindowSize(preset.w, preset.h);
        window.floatingCam?.syncSetting('size', { width: preset.w, height: preset.h });
        window.floatingCam?.saveSettings?.({ width: preset.w, height: preset.h });
      }
    });
  });

  applyDimsBtn?.addEventListener('click', async () => {
    const w = Math.max(160, Math.min(600, parseInt(widthInput.value, 10) || 240));
    const h = Math.max(160, Math.min(600, parseInt(heightInput.value, 10) || 240));
    widthInput.value = w;
    heightInput.value = h;
    highlightActivePreset(w, h);
    saveSize(w, h);

    await window.floatingCam?.setWindowSize(w, h);
    window.floatingCam?.syncSetting('size', { width: w, height: h });
    window.floatingCam?.saveSettings?.({ width: w, height: h });
  });

  // Shape Mode (Circle vs Rect)
  let isCircleMode = localStorage.getItem('floaty_shape') === 'circle';

  function updateShapeUI(isCircle) {
    isCircleMode = isCircle;
    if (isCircle) {
      shapeCircleBtn.classList.add('active');
      shapeRectBtn.classList.remove('active');
      if (radiusCard) radiusCard.style.opacity = '0.45';
      radiusSlider.disabled = true;
    } else {
      shapeCircleBtn.classList.remove('active');
      shapeRectBtn.classList.add('active');
      if (radiusCard) radiusCard.style.opacity = '1';
      radiusSlider.disabled = false;
    }
  }

  updateShapeUI(isCircleMode);

  shapeCircleBtn?.addEventListener('click', () => {
    updateShapeUI(true);
    localStorage.setItem('floaty_shape', 'circle');
    window.floatingCam?.syncSetting('shape', { isCircle: true });
    window.floatingCam?.saveSettings?.({ isCircle: true });
  });

  shapeRectBtn?.addEventListener('click', () => {
    updateShapeUI(false);
    localStorage.setItem('floaty_shape', 'rect');
    const radius = parseInt(radiusSlider.value, 10) || 16;
    window.floatingCam?.syncSetting('shape', { isCircle: false, radius });
    window.floatingCam?.saveSettings?.({ isCircle: false, radius });
  });

  function saveRadius(val) {
    localStorage.setItem('floaty_radius', val);
    window.floatingCam?.saveSettings?.({ radius: val });
    try {
      const raw = localStorage.getItem('floating-cam-settings');
      const parsed = raw ? JSON.parse(raw) : {};
      parsed.window = parsed.window || {};
      parsed.window.borderRadius = val;
      localStorage.setItem('floating-cam-settings', JSON.stringify(parsed));
    } catch (e) {
      console.warn('Could not persist radius to floating-cam-settings', e);
    }
  }

  // Radius Slider
  const savedRadius = localStorage.getItem('floaty_radius') || '16';
  radiusSlider.value = savedRadius;
  radiusBadge.textContent = `${savedRadius}%`;

  radiusSlider.addEventListener('input', e => {
    const val = Math.max(0, Math.min(50, parseInt(e.target.value, 10) || 0));
    radiusBadge.textContent = `${val}%`;
    saveRadius(val);
    if (!isCircleMode) {
      window.floatingCam?.syncSetting('radius', val);
      window.floatingCam?.saveSettings?.({ radius: val });
    }
  });

  // Opacity Slider
  const savedOpacity = localStorage.getItem('floaty_opacity') || '100';
  opacitySlider.value = savedOpacity;
  opacityBadge.textContent = `${savedOpacity}%`;

  opacitySlider.addEventListener('input', e => {
    const val = parseInt(e.target.value, 10);
    opacityBadge.textContent = `${val}%`;
    localStorage.setItem('floaty_opacity', val);
    window.floatingCam?.syncSetting('opacity', val / 100);
    window.floatingCam?.saveSettings?.({ opacity: val / 100 });
  });

  // Always on Top
  async function initAlwaysOnTop() {
    try {
      const isTop = await window.floatingCam?.isAlwaysOnTop();
      alwaysOnTopSwitch.checked = isTop !== false;
    } catch {
      alwaysOnTopSwitch.checked = true;
    }
  }

  alwaysOnTopSwitch.addEventListener('change', async e => {
    const checked = e.target.checked;
    await window.floatingCam?.setAlwaysOnTop(checked);
    localStorage.setItem('floaty_always_on_top', checked);
    window.floatingCam?.syncSetting('alwaysOnTop', checked);
    window.floatingCam?.saveSettings?.({ alwaysOnTop: checked });
  });

  // Auto-hide toolbar switch
  const savedAutoHide = localStorage.getItem('floaty_autohide_bar');
  autoHideBarSwitch.checked = savedAutoHide !== null ? savedAutoHide === 'true' : true;

  autoHideBarSwitch.addEventListener('change', e => {
    const checked = e.target.checked;
    localStorage.setItem('floaty_autohide_bar', checked);
    window.floatingCam?.syncSetting('autoHideBar', checked);
  });

  // Snapshot
  snapshotBtn?.addEventListener('click', () => {
    const originalText = snapshotBtn.innerHTML;
    snapshotBtn.innerHTML = '✨ Saved!';
    window.floatingCam?.syncSetting('snapshot', true);
    setTimeout(() => {
      snapshotBtn.innerHTML = originalText;
    }, 1500);
  });

  // Listen for sync events from Camera window (e.g. keyboard shortcuts pressed on camera)
  window.floatingCam?.onSettingSynced(data => {
    if (!data) return;
    const { key, value } = data;

    if (key === 'shape') {
      updateShapeUI(Boolean(value.isCircle));
      if (typeof value.radius === 'number') {
        radiusSlider.value = value.radius;
        radiusBadge.textContent = `${value.radius}%`;
      }
    } else if (key === 'radius') {
      radiusSlider.value = value;
      radiusBadge.textContent = `${value}%`;
    } else if (key === 'flip') {
      flipSwitch.checked = Boolean(value);
    } else if (key === 'opacity') {
      const pct = Math.round(value * 100);
      opacitySlider.value = pct;
      opacityBadge.textContent = `${pct}%`;
    } else if (key === 'alwaysOnTop') {
      alwaysOnTopSwitch.checked = Boolean(value);
    } else if (key === 'size') {
      if (value.width && value.height) {
        widthInput.value = value.width;
        heightInput.value = value.height;
        highlightActivePreset(value.width, value.height);
        saveSize(value.width, value.height);
      }
    }
  });

  async function syncCurrentShape() {
    try {
      const shape = await window.floatingCam?.getShape?.();
      const settings = await window.floatingCam?.getSettings?.();
      const isCircle =
        shape?.isCircle !== undefined ? Boolean(shape.isCircle) : Boolean(settings?.isCircle);
      updateShapeUI(isCircle);

      const radius =
        typeof shape?.radius === 'number'
          ? shape.radius
          : typeof settings?.radius === 'number'
            ? settings.radius
            : 16;
      radiusSlider.value = radius;
      radiusBadge.textContent = `${radius}%`;
      saveRadius(radius);
    } catch (e) {
      console.warn('Could not sync current shape in preferences:', e);
    }
  }

  // =========================================================================
  // Loom-Style Screen & App Recording Studio (with RAM Saver Mode)
  // =========================================================================
  async function initRecordingStudio() {
    const enableRecordingSwitch = document.getElementById('enableRecordingSwitch');
    const recordingStatusBadge = document.getElementById('recordingStatusBadge');
    const recordingDisabledState = document.getElementById('recordingDisabledState');
    const recordingStudioContent = document.getElementById('recordingStudioContent');
    const enableRecordingBtn = document.getElementById('enableRecordingBtn');

    const modeCards = document.querySelectorAll('.mode-card');
    const sourcePickerCard = document.getElementById('sourcePickerCard');
    const filterScreensBtn = document.getElementById('filterScreensBtn');
    const filterWindowsBtn = document.getElementById('filterWindowsBtn');
    const refreshSourcesBtn = document.getElementById('refreshSourcesBtn');
    const sourcesContainer = document.getElementById('sourcesContainer');

    const micSelect = document.getElementById('micSelect');
    const micStatusBadge = document.getElementById('micStatusBadge');
    const micLevelFill = document.getElementById('micLevelFill');
    const micLevelLabel = document.getElementById('micLevelLabel');
    const muteMicSwitch = document.getElementById('muteMicSwitch');

    const countdownSwitch = document.getElementById('countdownSwitch');
    const recordingQualitySelect = document.getElementById('recordingQualitySelect');
    const startRecordBtn = document.getElementById('startRecordBtn');

    const countdownOverlay = document.getElementById('countdownOverlay');
    const countdownNumber = document.getElementById('countdownNumber');

    const previewModal = document.getElementById('previewModal');
    const previewVideoPlayer = document.getElementById('previewVideoPlayer');
    const previewDuration = document.getElementById('previewDuration');
    const previewSize = document.getElementById('previewSize');
    const previewFormat = document.getElementById('previewFormat');
    const saveRecordingBtn = document.getElementById('saveRecordingBtn');
    const revealFileBtn = document.getElementById('revealFileBtn');
    const discardRecordingBtn = document.getElementById('discardRecordingBtn');
    const closePreviewBtn = document.getElementById('closePreviewBtn');

    let currentMode = 'screen-cam';
    let currentFilter = 'screen';
    let availableSources = [];
    let selectedSourceId = null;

    let micMonitorStream = null;
    let micAudioContext = null;
    let micAnalyser = null;
    const isMonitoringMic = true;

    let activeMediaRecorder = null;
    let activeStream = null;
    let recordedChunks = [];
    let recordingTimer = null;
    let recordingSeconds = 0;
    let isPaused = false;
    let lastRecordedBlob = null;
    let savedRecordingPath = null;

    // RAM Saver & Defaults
    const settings = await window.floatingCam?.getSettings?.();
    const savedRecMode = localStorage.getItem('floaty_enable_recording');
    const isRecordingModeEnabled =
      savedRecMode !== null
        ? savedRecMode === 'true'
        : settings?.recordingEnabled !== undefined
          ? Boolean(settings.recordingEnabled)
          : false;

    const savedMuteMic = localStorage.getItem('floaty_mute_mic');
    const isMicMuted =
      savedMuteMic !== null
        ? savedMuteMic === 'true'
        : settings?.micMuted !== undefined
          ? Boolean(settings.micMuted)
          : true;

    function stopMicMonitoring() {
      if (micMonitorStream) {
        micMonitorStream.getTracks().forEach(t => t.stop());
        micMonitorStream = null;
      }
      if (micAudioContext && micAudioContext.state !== 'closed') {
        try {
          micAudioContext.close();
        } catch (_e) {
          // ignore error on close
        }
        micAudioContext = null;
      }
      micAnalyser = null;
      if (micLevelFill) micLevelFill.style.width = '0%';
      if (micLevelLabel) micLevelLabel.textContent = 'Muted';
      if (micStatusBadge) {
        micStatusBadge.innerHTML = '<span style="color: #94a3b8;">Muted</span>';
      }
    }

    function stopAllRecordingResources() {
      stopMicMonitoring();
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
      }
      if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
        try {
          activeMediaRecorder.stop();
        } catch (_e) {
          // ignore error on stop
        }
        activeMediaRecorder = null;
      }
      window.floatingCam?.closeRecordingBar?.();
      availableSources = [];
      selectedSourceId = null;
      if (sourcesContainer) {
        sourcesContainer.innerHTML = '';
      }
    }

    async function setRecordingMode(enabled, persist = true) {
      const isEnabled = Boolean(enabled);
      if (enableRecordingSwitch) enableRecordingSwitch.checked = isEnabled;

      if (isEnabled) {
        if (recordingStatusBadge) {
          recordingStatusBadge.textContent = 'Active';
          recordingStatusBadge.className = 'status-badge active-badge';
        }
        if (recordingDisabledState) recordingDisabledState.style.display = 'none';
        if (recordingStudioContent) recordingStudioContent.style.display = 'block';

        // Load sources and microphones on demand
        await Promise.allSettled([loadSources(), loadAudioDevices()]);
      } else {
        if (recordingStatusBadge) {
          recordingStatusBadge.textContent = 'Disabled (RAM Saver Active)';
          recordingStatusBadge.className = 'status-badge ram-active';
        }
        if (recordingDisabledState) recordingDisabledState.style.display = 'flex';
        if (recordingStudioContent) recordingStudioContent.style.display = 'none';

        // Release all RAM / media resources immediately
        stopAllRecordingResources();
      }

      if (persist) {
        localStorage.setItem('floaty_enable_recording', isEnabled);
        window.floatingCam?.saveSettings?.({ recordingEnabled: isEnabled });
      }
    }

    enableRecordingSwitch?.addEventListener('change', e => {
      setRecordingMode(e.target.checked, true);
    });

    enableRecordingBtn?.addEventListener('click', () => {
      setRecordingMode(true, true);
    });

    if (muteMicSwitch) {
      muteMicSwitch.checked = isMicMuted;
      if (isMicMuted) {
        if (micLevelFill) micLevelFill.style.width = '0%';
        if (micLevelLabel) micLevelLabel.textContent = 'Muted';
        if (micStatusBadge) {
          micStatusBadge.innerHTML = '<span style="color: #94a3b8;">Muted</span>';
        }
      }
    }

    muteMicSwitch?.addEventListener('change', () => {
      const isMuted = muteMicSwitch.checked;
      localStorage.setItem('floaty_mute_mic', isMuted);
      window.floatingCam?.saveSettings?.({ micMuted: isMuted });
      if (isMuted) {
        stopMicMonitoring();
      } else {
        if (micStatusBadge) {
          micStatusBadge.innerHTML = '<span class="live-pulse"></span><span>Active</span>';
        }
        if (enableRecordingSwitch?.checked) {
          startMicMonitoring();
        }
      }
    });

    // Mode selection
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        currentMode = card.dataset.mode;

        if (currentMode === 'cam-only') {
          if (sourcePickerCard) sourcePickerCard.style.display = 'none';
        } else {
          if (sourcePickerCard) sourcePickerCard.style.display = 'block';
        }
      });
    });

    // Source Filter Switching (Screens vs Applications)
    filterScreensBtn?.addEventListener('click', () => {
      filterScreensBtn.classList.add('active');
      filterWindowsBtn?.classList.remove('active');
      currentFilter = 'screen';
      renderSources();
    });

    filterWindowsBtn?.addEventListener('click', () => {
      filterWindowsBtn.classList.add('active');
      filterScreensBtn?.classList.remove('active');
      currentFilter = 'window';
      renderSources();
    });

    refreshSourcesBtn?.addEventListener('click', () => {
      loadSources();
    });

    async function loadSources() {
      if (!enableRecordingSwitch?.checked) return;
      if (!sourcesContainer) return;
      sourcesContainer.innerHTML = `
        <div class="sources-loading">
          <div class="spinner"></div>
          <span>Scanning displays & applications...</span>
        </div>
      `;

      try {
        const sources = (await window.floatingCam?.getDesktopSources?.()) || [];
        availableSources = sources;
        if (!selectedSourceId && sources.length > 0) {
          const primaryScreen = sources.find(s => s.isScreen) || sources[0];
          selectedSourceId = primaryScreen.id;
        }
        renderSources();
      } catch (err) {
        console.error('Failed to get sources:', err);
        sourcesContainer.innerHTML =
          '<div class="sources-empty">Could not load capture sources.</div>';
      }
    }

    function renderSources() {
      if (!sourcesContainer) return;
      const filtered = availableSources.filter(s => {
        if (currentFilter === 'screen') return s.isScreen;
        return !s.isScreen;
      });

      if (filtered.length === 0) {
        sourcesContainer.innerHTML = `<div class="sources-empty">No ${currentFilter === 'screen' ? 'displays' : 'open application windows'} found.</div>`;
        return;
      }

      const grid = document.createElement('div');
      grid.className = 'sources-grid';

      filtered.forEach(source => {
        const card = document.createElement('div');
        card.className = `source-card ${source.id === selectedSourceId ? 'selected' : ''}`;
        card.dataset.id = source.id;

        const isScreenSource = source.isScreen;
        const fallbackSvg = isScreenSource
          ? '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>'
          : '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ec4899" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>';

        card.innerHTML = `
          <div class="source-thumb-wrapper">
            ${
  source.thumbnail
    ? `<img src="${source.thumbnail}" class="source-thumb" alt="${source.name}">`
    : `<div class="source-thumb-fallback">${fallbackSvg}<span>${isScreenSource ? 'Monitor Display' : 'App Window'}</span></div>`
}
          </div>
          <div class="source-check-badge">✓</div>
          <div class="source-info">
            ${source.appIcon ? `<img src="${source.appIcon}" class="source-app-icon" alt="App Icon">` : ''}
            <span class="source-title" title="${source.name}">${source.name}</span>
          </div>
        `;

        card.addEventListener('click', () => {
          selectedSourceId = source.id;
          document.querySelectorAll('.source-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
        });

        grid.appendChild(card);
      });

      sourcesContainer.innerHTML = '';
      sourcesContainer.appendChild(grid);
    }

    // Audio Devices & Live Volume Monitor
    async function loadAudioDevices() {
      if (!enableRecordingSwitch?.checked) return;

      try {
        // Trigger microphone warmup only if user has un-muted the mic
        if (!muteMicSwitch?.checked) {
          try {
            const warmupStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            warmupStream.getTracks().forEach(t => t.stop());
          } catch (warmupErr) {
            console.warn('Microphone warmup notice:', warmupErr);
          }
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(d => d.kind === 'audioinput');

        if (!micSelect) return;
        micSelect.innerHTML = '';
        if (audioInputs.length === 0) {
          micSelect.innerHTML = '<option value="">No microphones found</option>';
          return;
        }

        const savedMicId = localStorage.getItem('floaty_mic_id') || '';

        audioInputs.forEach((device, index) => {
          const opt = document.createElement('option');
          opt.value = device.deviceId;
          opt.textContent = device.label || `Microphone ${index + 1}`;
          if (device.deviceId === savedMicId || (!savedMicId && index === 0)) {
            opt.selected = true;
          }
          micSelect.appendChild(opt);
        });

        startMicMonitoring();
      } catch (err) {
        console.warn('Could not enumerate microphones:', err);
      }
    }

    micSelect?.addEventListener('change', () => {
      localStorage.setItem('floaty_mic_id', micSelect.value);
      startMicMonitoring();
    });

    muteMicSwitch?.addEventListener('change', () => {
      const isMuted = muteMicSwitch.checked;
      if (isMuted) {
        if (micLevelFill) micLevelFill.style.width = '0%';
        if (micLevelLabel) micLevelLabel.textContent = 'Muted';
        if (micStatusBadge) {
          micStatusBadge.innerHTML = '<span style="color: #94a3b8;">Muted</span>';
        }
      } else {
        if (micStatusBadge) {
          micStatusBadge.innerHTML = '<span class="live-pulse"></span><span>Active</span>';
        }
        startMicMonitoring();
      }
    });

    async function startMicMonitoring() {
      if (muteMicSwitch?.checked) return;

      try {
        if (micMonitorStream) {
          micMonitorStream.getTracks().forEach(t => t.stop());
        }
        if (micAudioContext && micAudioContext.state !== 'closed') {
          micAudioContext.close();
        }

        const deviceId = micSelect?.value;
        micMonitorStream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          video: false
        });

        micAudioContext = new (window.AudioContext || window.webkitAudioContext)();
        micAnalyser = micAudioContext.createAnalyser();
        micAnalyser.fftSize = 256;

        const source = micAudioContext.createMediaStreamSource(micMonitorStream);
        source.connect(micAnalyser);

        const bufferLength = micAnalyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateMeter = () => {
          if (!isMonitoringMic || muteMicSwitch?.checked) return;

          micAnalyser.getByteTimeDomainData(dataArray);
          let sumSquares = 0.0;
          for (let i = 0; i < bufferLength; i++) {
            const norm = (dataArray[i] - 128) / 128;
            sumSquares += norm * norm;
          }
          const rms = Math.sqrt(sumSquares / bufferLength);
          const level = Math.min(100, Math.round(rms * 280));

          if (micLevelFill) micLevelFill.style.width = `${level}%`;
          if (micLevelLabel) micLevelLabel.textContent = `${level}%`;

          requestAnimationFrame(updateMeter);
        };

        updateMeter();
      } catch (e) {
        console.warn('Microphone monitoring unavailable:', e);
        if (micLevelLabel) micLevelLabel.textContent = 'Standby';
      }
    }

    // Format Duration Helper
    function formatTime(seconds) {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }

    // Start Recording Pipeline
    startRecordBtn?.addEventListener('click', async () => {
      try {
        const quality = recordingQualitySelect?.value || '1080p';
        let maxW = 1920,
          maxH = 1080,
          maxFps = 60;
        if (quality === '720p') {
          maxW = 1280;
          maxH = 720;
          maxFps = 30;
        } else if (quality === 'max') {
          maxW = 3840;
          maxH = 2160;
          maxFps = 60;
        }

        let captureStream = null;

        if (currentMode === 'cam-only') {
          const camId = cameraSelect?.value;
          captureStream = await navigator.mediaDevices.getUserMedia({
            video: {
              deviceId: camId ? { exact: camId } : undefined,
              width: { ideal: maxW },
              height: { ideal: maxH },
              frameRate: { ideal: maxFps }
            },
            audio: false
          });
        } else {
          if (!selectedSourceId) {
            const sources = (await window.floatingCam?.getDesktopSources?.()) || [];
            if (sources.length > 0) {
              selectedSourceId = sources[0].id;
            }
          }

          const isWaylandSource =
            !selectedSourceId ||
            selectedSourceId.startsWith('display:') ||
            selectedSourceId.startsWith('wayland:') ||
            selectedSourceId.includes('system-picker');

          if (isWaylandSource || !navigator.mediaDevices.getUserMedia) {
            captureStream = await navigator.mediaDevices.getDisplayMedia({
              video: {
                width: { ideal: maxW },
                height: { ideal: maxH },
                frameRate: { ideal: maxFps }
              },
              audio: false
            });
          } else {
            try {
              captureStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                  mandatory: {
                    chromeMediaSource: 'desktop',
                    chromeMediaSourceId: selectedSourceId,
                    maxWidth: maxW,
                    maxHeight: maxH,
                    maxFrameRate: maxFps
                  }
                }
              });
            } catch (desktopErr) {
              console.warn(
                'getUserMedia desktop capture error, falling back to getDisplayMedia:',
                desktopErr
              );
              captureStream = await navigator.mediaDevices.getDisplayMedia({
                video: {
                  width: { ideal: maxW },
                  height: { ideal: maxH },
                  frameRate: { ideal: maxFps }
                },
                audio: false
              });
            }
          }
        }

        // Attach Microphone Audio if not muted
        const isMuted = muteMicSwitch?.checked;
        let finalStream = captureStream;

        if (!isMuted) {
          try {
            const micId = micSelect?.value;
            const micStream = await navigator.mediaDevices.getUserMedia({
              audio: micId ? { deviceId: { exact: micId } } : true,
              video: false
            });
            finalStream = new MediaStream([
              ...captureStream.getVideoTracks(),
              ...micStream.getAudioTracks()
            ]);
          } catch (micErr) {
            console.warn('Could not attach microphone to recording:', micErr);
          }
        }

        activeStream = finalStream;

        // 3-2-1 Countdown if enabled
        const showCountdown = countdownSwitch?.checked;
        if (showCountdown && countdownOverlay && countdownNumber) {
          countdownOverlay.classList.add('show');
          for (let count = 3; count > 0; count--) {
            countdownNumber.textContent = count;
            await new Promise(r => setTimeout(r, 900));
          }
          countdownNumber.textContent = 'GO!';
          await new Promise(r => setTimeout(r, 450));
          countdownOverlay.classList.remove('show');
        }

        // Adjust camera bubble visibility based on mode
        if (currentMode === 'screen-only') {
          window.floatingCam?.hideWindow?.();
        } else if (currentMode === 'screen-cam') {
          window.floatingCam?.showWindow?.();
        }

        // Hide Preferences window so it's not captured in recording
        window.floatingCam?.hidePreferences?.();

        // Initialize MediaRecorder
        let mimeType = 'video/webm;codecs=vp9,opus';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm;codecs=vp8,opus';
        }
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm';
        }

        recordedChunks = [];
        activeMediaRecorder = new MediaRecorder(finalStream, {
          mimeType,
          videoBitsPerSecond: quality === '1080p' ? 5000000 : 2500000
        });

        activeMediaRecorder.ondataavailable = e => {
          if (e.data && e.data.size > 0) {
            recordedChunks.push(e.data);
          }
        };

        activeMediaRecorder.onstop = () => {
          finalizeRecording(mimeType);
        };

        activeMediaRecorder.start(1000); // 1-second timeslices
        recordingSeconds = 0;
        isPaused = false;

        // Open floating recording capsule
        await window.floatingCam?.openRecordingBar?.();
        window.floatingCam?.updateRecordingBar?.({ time: '00:00', state: 'recording' });

        recordingTimer = setInterval(() => {
          if (!isPaused) {
            recordingSeconds++;
            const formatted = formatTime(recordingSeconds);
            window.floatingCam?.updateRecordingBar?.({ time: formatted, state: 'recording' });
          }
        }, 1000);
      } catch (err) {
        console.error('Recording initialization failed:', err);
        alert(`Could not start recording: ${err.message || err}`);
        window.floatingCam?.showPreferences?.();
      }
    });

    // Recording Actions triggered by floating control pill
    window.floatingCam?.onRecordingAction?.(action => {
      if (action === 'pause') {
        if (activeMediaRecorder && activeMediaRecorder.state === 'recording') {
          activeMediaRecorder.pause();
          isPaused = true;
          window.floatingCam?.updateRecordingBar?.({ state: 'paused' });
        }
      } else if (action === 'resume') {
        if (activeMediaRecorder && activeMediaRecorder.state === 'paused') {
          activeMediaRecorder.resume();
          isPaused = false;
          window.floatingCam?.updateRecordingBar?.({ state: 'recording' });
        }
      } else if (action === 'finish') {
        finishRecording();
      } else if (action === 'cancel') {
        discardRecording();
      }
    });

    function finishRecording() {
      if (recordingTimer) clearInterval(recordingTimer);
      window.floatingCam?.closeRecordingBar?.();

      if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
        activeMediaRecorder.stop();
      }

      // Stop all media tracks
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
      }

      // Restore camera bubble if it was hidden
      if (currentMode === 'screen-only') {
        window.floatingCam?.showWindow?.();
      }

      // Re-show Preferences window with preview modal
      window.floatingCam?.showPreferences?.();
    }

    function discardRecording() {
      if (recordingTimer) clearInterval(recordingTimer);
      window.floatingCam?.closeRecordingBar?.();

      if (activeMediaRecorder && activeMediaRecorder.state !== 'inactive') {
        activeMediaRecorder.stop();
      }

      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
        activeStream = null;
      }

      recordedChunks = [];
      if (currentMode === 'screen-only') {
        window.floatingCam?.showWindow?.();
      }
      window.floatingCam?.showPreferences?.();
    }

    // Finalize recording blob & show modal
    function finalizeRecording(mimeType) {
      if (recordedChunks.length === 0) return;

      lastRecordedBlob = new Blob(recordedChunks, { type: mimeType });
      const videoUrl = URL.createObjectURL(lastRecordedBlob);

      if (previewVideoPlayer) previewVideoPlayer.src = videoUrl;
      if (previewDuration)
        previewDuration.textContent = `⏱️ Duration: ${formatTime(recordingSeconds)}`;
      if (previewSize)
        previewSize.textContent = `📦 Size: ${(lastRecordedBlob.size / (1024 * 1024)).toFixed(1)} MB`;
      if (previewFormat)
        previewFormat.textContent = `🎬 Format: ${mimeType.includes('vp9') ? 'WebM (VP9)' : 'WebM'}`;

      // Reset save buttons
      if (saveRecordingBtn) {
        saveRecordingBtn.innerHTML = `
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
          Save Recording
        `;
        saveRecordingBtn.disabled = false;
      }
      if (revealFileBtn) revealFileBtn.style.display = 'none';

      previewModal?.classList.add('show');
    }

    // Modal Actions
    saveRecordingBtn?.addEventListener('click', async () => {
      if (!lastRecordedBlob) return;

      saveRecordingBtn.disabled = true;
      saveRecordingBtn.innerHTML = 'Saving...';

      try {
        const arrayBuffer = await lastRecordedBlob.arrayBuffer();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const defaultName = `Floaty_Recording_${timestamp}.webm`;

        const result = await window.floatingCam?.saveRecording?.(
          new Uint8Array(arrayBuffer),
          defaultName
        );

        if (result && result.success && result.filePath) {
          savedRecordingPath = result.filePath;
          saveRecordingBtn.innerHTML = '✓ Saved Successfully!';
          if (revealFileBtn) revealFileBtn.style.display = 'inline-flex';
        } else {
          saveRecordingBtn.disabled = false;
          saveRecordingBtn.innerHTML = 'Save Recording';
        }
      } catch (err) {
        console.error('Error saving recording:', err);
        saveRecordingBtn.disabled = false;
        saveRecordingBtn.innerHTML = 'Save Recording';
        alert(`Save failed: ${err.message || err}`);
      }
    });

    revealFileBtn?.addEventListener('click', () => {
      if (savedRecordingPath) {
        window.floatingCam?.showInFolder?.(savedRecordingPath);
      }
    });

    discardRecordingBtn?.addEventListener('click', () => {
      closePreviewModal();
    });

    closePreviewBtn?.addEventListener('click', () => {
      closePreviewModal();
    });

    function closePreviewModal() {
      previewModal?.classList.remove('show');
      if (previewVideoPlayer) {
        previewVideoPlayer.pause();
        previewVideoPlayer.src = '';
      }
      lastRecordedBlob = null;
    }

    // Apply initial recording mode (disabled by default, saving 100% RAM & CPU)
    await setRecordingMode(isRecordingModeEnabled, false);
  }

  // Initial runs
  await loadCameras();
  await syncCurrentSizeInputs();
  await syncCurrentShape();
  await initAlwaysOnTop();
  await initRecordingStudio();
});
