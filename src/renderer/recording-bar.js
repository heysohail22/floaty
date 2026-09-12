document.addEventListener('DOMContentLoaded', () => {
  const recDot = document.getElementById('recDot');
  const recTimer = document.getElementById('recTimer');
  const pauseBtn = document.getElementById('pauseBtn');
  const pauseIcon = document.getElementById('pauseIcon');
  const resumeIcon = document.getElementById('resumeIcon');
  const finishBtn = document.getElementById('finishBtn');
  const cancelBtn = document.getElementById('cancelBtn');

  let isPaused = false;

  // Listen for state and timer updates from recording engine
  window.floatingCam?.onRecordingBarUpdate?.(data => {
    if (!data) return;

    if (data.time !== undefined) {
      recTimer.textContent = data.time;
    }

    if (data.state !== undefined) {
      isPaused = data.state === 'paused';
      if (isPaused) {
        recDot.classList.add('paused');
        pauseIcon.style.display = 'none';
        resumeIcon.style.display = 'block';
        pauseBtn.title = 'Resume Recording';
      } else {
        recDot.classList.remove('paused');
        pauseIcon.style.display = 'block';
        resumeIcon.style.display = 'none';
        pauseBtn.title = 'Pause Recording';
      }
    }
  });

  // Action buttons
  pauseBtn?.addEventListener('click', () => {
    window.floatingCam?.sendRecordingAction?.(isPaused ? 'resume' : 'pause');
  });

  finishBtn?.addEventListener('click', () => {
    window.floatingCam?.sendRecordingAction?.('finish');
  });

  cancelBtn?.addEventListener('click', () => {
    window.floatingCam?.sendRecordingAction?.('cancel');
  });
});
