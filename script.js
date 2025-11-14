document.addEventListener('DOMContentLoaded', () => {
    const videoInput = document.getElementById('videoInput');
    const urlInputContainer = document.getElementById('urlInputContainer');
    const youtubeUrlInput = document.getElementById('youtubeUrlInput');
    const playerWrapper = document.getElementById('player-wrapper');
    const videoContainer = document.getElementById('videoContainer');
    const videoPlayer = document.getElementById('videoPlayer');
    const youtubePlayerContainer = document.getElementById('youtubePlayerContainer');
    const pcFeedbackOverlay = document.getElementById('pcFeedbackOverlay');
    const mobileUiOverlay = document.getElementById('mobileUiOverlay');
    const mobilePlayPauseIcon = document.getElementById('mobilePlayPauseIcon');
    const videoControls = document.getElementById('videoControls');
    const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBar = document.getElementById('progressBar');
    const repeatRangeBar = document.getElementById('repeatRangeBar');
    const progressTimeTooltip = document.getElementById('progressTimeTooltip');
    const timeDisplay = document.getElementById('timeDisplay');
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    const repeatRangeDisplay = document.getElementById('repeatRangeDisplay');
    const speedRange = document.getElementById('speedRange');
    const speedValue = document.getElementById('speedValue');
    const staticActionButtonsContainer = document.getElementById('staticActionButtons');
    const floatingPanelContainer = document.getElementById('floating-panel-container');
    const actionButtons = document.getElementById('actionButtons');
    const resizeHandle = document.getElementById('resizeHandle');
    const togglePanelBtn = document.getElementById('toggle-panel-btn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const setStartBtn = document.getElementById('setStartBtn');
    const setEndBtn = document.getElementById('setEndBtn');
    const goStartBtn = document.getElementById('goStartBtn');
    const skipBackwardBtn = document.getElementById('skipBackwardBtn');
    const skipForwardBtn = document.getElementById('skipForwardBtn');
    const resetButton = document.getElementById('resetButton');

    let activePlayer = null;
    let youtubePlayer = null;
    let timeUpdateInterval = null;
    let repeatStart = null;
    let repeatEnd = null;
    let isDragging = false;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let controlsTimer = null;
    let inactiveTimer = null;
    let isPanelDragging = false;
    let isResizing = false;
    let panelOffsetX, panelOffsetY, startWidth, startX;

    const startMarker = createMarker('startMarker');
    const endMarker = createMarker('endMarker');
    const currentMarker = createMarker('currentMarker');

    const FULLSCREEN_ICON = '<svg viewBox="0 0 24 24"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"></path></svg>';
    const EXIT_FULLSCREEN_ICON = '<svg viewBox="0 0 24 24"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"></path></svg>';

    const playerInterface = {
        play: () => activePlayer && activePlayer.play(),
        pause: () => activePlayer && activePlayer.pause(),
        seekTo: (time) => activePlayer && activePlayer.seekTo(time),
        setPlaybackRate: (rate) => activePlayer && activePlayer.setPlaybackRate(rate),
        getCurrentTime: () => activePlayer ? activePlayer.getCurrentTime() : 0,
        getDuration: () => activePlayer ? activePlayer.getDuration() : 0,
        isPaused: () => activePlayer ? activePlayer.isPaused() : true,
    };

    if (isTouchDevice) playerWrapper.classList.add('is-mobile');
    staticActionButtonsContainer.appendChild(actionButtons);

    window.onYouTubeIframeAPIReady = () => {};

    function loadYoutubeVideo(videoId) {
        clearInterval(timeUpdateInterval);
        if (youtubePlayer) youtubePlayer.destroy();
        youtubePlayerContainer.classList.remove('player-hidden');
        videoContainer.classList.add('player-hidden');
        youtubePlayer = new YT.Player('youtubePlayerContainer', {
            height: '100%', width: '100%', videoId: videoId,
            playerVars: { 'playsinline': 1, 'controls': 0, 'rel': 0, 'showinfo': 0, 'modestbranding': 1 },
            events: { 'onReady': onYoutubePlayerReady, 'onStateChange': onYoutubePlayerStateChange, 'onError': onYoutubePlayerError }
        });
    }

    function onYoutubePlayerError(event) {
        if (event.data === 101 || event.data === 150) { showToast('この動画は埋め込みが許可されていません。');
        } else { showToast(`YouTubeプレーヤーエラーが発生しました (コード: ${event.data})`); }
        if(youtubePlayer) { youtubePlayer.destroy(); youtubePlayer = null; }
        activePlayer = null;
        youtubePlayerContainer.classList.add('player-hidden');
    }

    function onYoutubePlayerReady(event) {
        activePlayer = {
            play: () => event.target.playVideo(),
            pause: () => event.target.pauseVideo(),
            seekTo: (time) => event.target.seekTo(time, true),
            setPlaybackRate: (rate) => event.target.setPlaybackRate(rate),
            getCurrentTime: () => event.target.getCurrentTime(),
            getDuration: () => event.target.getDuration(),
            isPaused: () => {
                const state = event.target.getPlayerState();
                return state !== YT.PlayerState.PLAYING && state !== YT.PlayerState.BUFFERING;
            }
        };
        event.target.playVideo();
        updateUI();
    }

    function onYoutubePlayerStateChange(event) {
        clearInterval(timeUpdateInterval);
        if (event.data === YT.PlayerState.PLAYING) {
            timeUpdateInterval = setInterval(handleTimeUpdate, 250);
        }
        updateCentralPlayPauseIcon();
    }

    function loadLocalVideo(file) {
        clearInterval(timeUpdateInterval);
        if (youtubePlayer) { youtubePlayer.destroy(); youtubePlayer = null; }
        youtubePlayerContainer.classList.add('player-hidden');
        videoContainer.classList.remove('player-hidden');
        const url = URL.createObjectURL(file);
        videoPlayer.src = url;
        activePlayer = {
            play: () => videoPlayer.play(),
            pause: () => videoPlayer.pause(),
            seekTo: (time) => { videoPlayer.currentTime = time; },
            setPlaybackRate: (rate) => { videoPlayer.playbackRate = rate; },
            getCurrentTime: () => videoPlayer.currentTime,
            getDuration: () => videoPlayer.duration,
            isPaused: () => videoPlayer.paused
        };
        videoPlayer.play();
        resetRepeat(true);
        updateUI();
    }

    function createMarker(id) { const marker = document.createElement('div'); marker.id = id; marker.classList.add('marker'); progressBarContainer.appendChild(marker); return marker; }
    function showToast(message) { const container = document.getElementById('toastContainer'); while (container.children.length >= 3) { container.removeChild(container.firstChild); } const toast = document.createElement('div'); toast.className = 'toast'; toast.textContent = message; container.appendChild(toast); toast.addEventListener('animationend', () => { toast.remove(); }); }
    function setStartTime(time) { const duration = playerInterface.getDuration(); if (!duration) return; const newStartTime = (time !== undefined) ? time : playerInterface.getCurrentTime(); if (repeatEnd !== null && newStartTime >= repeatEnd) { showToast('開始位置は終了位置より前に設定してください。'); return; } repeatStart = newStartTime; updateUI(); showToast(`開始位置を設定: ${formatTime(repeatStart)}`); }
    function setEndTime(time) { const duration = playerInterface.getDuration(); if (!duration) return; const newEndTime = (time !== undefined) ? time : playerInterface.getCurrentTime(); if (repeatStart === null || newEndTime <= repeatStart) { showToast(repeatStart === null ? '先に開始位置を設定してください。' : '終了位置は開始位置より後に設定してください。'); return; } repeatEnd = newEndTime; updateUI(); showToast(`終了位置を設定: ${formatTime(repeatEnd)}`); }
    function resetRepeat(silent = false) { repeatStart = null; repeatEnd = null; updateUI(); if (!silent) showToast('リピート区間をリセットしました。'); }
    function goToStart() { if (repeatStart !== null) playerInterface.seekTo(repeatStart); }
    function skipTime(seconds) { const currentTime = playerInterface.getCurrentTime(); const duration = playerInterface.getDuration(); if (!duration) return; playerInterface.seekTo(Math.max(0, Math.min(duration, currentTime + seconds))); }
    function togglePlayPause() { if (!activePlayer) return; if (playerInterface.isPaused()) { playerInterface.play(); } else { playerInterface.pause(); } }
    function setPlaybackRate(rateStr) { const rate = parseFloat(rateStr); if (isNaN(rate)) return; const validatedRate = Math.max(0.25, Math.min(rate, 4)); playerInterface.setPlaybackRate(validatedRate); speedRange.value = validatedRate; speedValue.value = validatedRate.toFixed(2); }
    function toggleFullscreen() { const elem = playerWrapper; if (!document.fullscreenElement) { (elem.requestFullscreen || elem.mozRequestFullScreen || elem.webkitRequestFullScreen || elem.msRequestFullscreen).call(elem); } else { (document.exitFullscreen || document.mozCancelFullScreen || document.webkitExitFullscreen || document.msExitFullscreen).call(document); } }
    function updateUI() { updateMarkers(); updateRepeatDisplay(); }
    function updateMarkers() { const duration = playerInterface.getDuration(); if (!duration) return; startMarker.style.display = repeatStart !== null ? 'block' : 'none'; if (repeatStart !== null) startMarker.style.left = (repeatStart / duration) * 100 + '%'; endMarker.style.display = repeatEnd !== null ? 'block' : 'none'; if (repeatEnd !== null) endMarker.style.left = (repeatEnd / duration) * 100 + '%'; if (repeatStart !== null && repeatEnd !== null) { const startPercent = (repeatStart / duration) * 100; const endPercent = (repeatEnd / duration) * 100; repeatRangeBar.style.left = `${startPercent}%`; repeatRangeBar.style.width = `${endPercent - startPercent}%`; repeatRangeBar.style.display = 'block'; } else { repeatRangeBar.style.display = 'none'; } }
    function updateProgressUI() { const duration = playerInterface.getDuration(); if (!duration) return; const percent = (playerInterface.getCurrentTime() / duration) * 100; progressBar.style.width = percent + '%'; currentMarker.style.left = percent + '%'; }
    function formatTime(seconds) { if (isNaN(seconds)) return '00:00'; const m = Math.floor(seconds / 60); const s = Math.floor(seconds % 60); return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; }
    function updateTimeDisplay() { const current = formatTime(playerInterface.getCurrentTime()); const duration = formatTime(playerInterface.getDuration()); timeDisplay.textContent = `${current} / ${duration}`; }
    function updateRepeatDisplay() { const startStr = repeatStart !== null ? formatTime(repeatStart) : '未設定'; const endStr = repeatEnd !== null ? formatTime(repeatEnd) : '未設定'; repeatRangeDisplay.textContent = `リピート区間: ${startStr} - ${endStr}`; }
    function handleTimeUpdate() { if (!isDragging) updateProgressUI(); updateTimeDisplay(); if (repeatStart !== null && repeatEnd !== null) { const currentTime = playerInterface.getCurrentTime(); if (currentTime >= repeatEnd || currentTime < repeatStart) playerInterface.seekTo(repeatStart); } }
    function updateCentralPlayPauseIcon() { const iconElement = isTouchDevice ? mobilePlayPauseIcon : pcFeedbackOverlay.querySelector('#playPauseIcon'); if (iconElement) iconElement.className = playerInterface.isPaused() ? 'play' : 'pause'; }
    function flashPcPlayPauseIcon() { if (isTouchDevice) return; pcFeedbackOverlay.innerHTML = `<div id="playPauseIcon" class="${playerInterface.isPaused() ? 'pause' : 'play'}"></div>`; pcFeedbackOverlay.classList.add('feedback-flash'); setTimeout(() => pcFeedbackOverlay.classList.remove('feedback-flash'), 500); }
    function hideMobileControls() { playerWrapper.classList.remove('mobile-controls-visible'); clearTimeout(controlsTimer); }
    function showMobileControls() { playerWrapper.classList.add('mobile-controls-visible'); updateCentralPlayPauseIcon(); clearTimeout(controlsTimer); controlsTimer = setTimeout(hideMobileControls, 3000); }
    function resetInactiveTimer() { clearTimeout(inactiveTimer); playerWrapper.classList.remove('is-inactive'); if (document.fullscreenElement && !isTouchDevice) { inactiveTimer = setTimeout(() => playerWrapper.classList.add('is-inactive'), 3000); } }
    const handleDragMove = (e) => { if (!isDragging || !playerInterface.getDuration()) return; const clientX = e.touches ? e.touches[0].clientX : e.clientX; const rect = progressBarContainer.getBoundingClientRect(); const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)); playerInterface.seekTo(ratio * playerInterface.getDuration()); updateProgressUI(); };
    const handleDragEnd = () => { if (!isDragging) return; isDragging = false; document.body.classList.remove('is-scrubbing'); window.removeEventListener('mousemove', handleDragMove); window.removeEventListener('mouseup', handleDragEnd); window.removeEventListener('touchmove', handleDragMove); window.removeEventListener('touchend', handleDragEnd); };
    const handleDragStart = (e) => { if (!playerInterface.getDuration() || e.shiftKey || e.altKey) return; e.preventDefault(); isDragging = true; document.body.classList.add('is-scrubbing'); handleDragMove(e); window.addEventListener('mousemove', handleDragMove); window.addEventListener('mouseup', handleDragEnd); window.addEventListener('touchmove', handleDragMove); window.addEventListener('touchend', handleDragEnd); };
    function onPanelDragStart(e) { if (e.target === resizeHandle) return; isPanelDragging = true; const event = e.touches ? e.touches[0] : e; panelOffsetX = event.clientX - floatingPanelContainer.offsetLeft; panelOffsetY = event.clientY - floatingPanelContainer.offsetTop; actionButtons.style.cursor = 'grabbing'; e.preventDefault(); }
    function onPanelDragMove(e) { if (!isPanelDragging) return; const event = e.touches ? e.touches[0] : e; floatingPanelContainer.style.left = `${event.clientX - panelOffsetX}px`; floatingPanelContainer.style.top = `${event.clientY - panelOffsetY}px`; }
    function onPanelDragEnd() { isPanelDragging = false; actionButtons.style.cursor = 'grab'; }
    function onResizeStart(e) { isResizing = true; const event = e.touches ? e.touches[0] : e; startWidth = floatingPanelContainer.offsetWidth; startX = event.clientX; e.preventDefault(); e.stopPropagation(); }
    function onResizeMove(e) { if (!isResizing) return; const event = e.touches ? e.touches[0] : e; const newWidth = startWidth + (event.clientX - startX); floatingPanelContainer.style.width = `${newWidth}px`; }
    function onResizeEnd() { isResizing = false; }

    videoInput.addEventListener('change', (e) => { const file = e.target.files[0]; if (file) loadLocalVideo(file); });
    urlInputContainer.addEventListener('submit', (e) => { e.preventDefault(); const url = youtubeUrlInput.value; const videoId = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/); if (videoId) { loadYoutubeVideo(videoId[1]); } else { showToast('無効なYouTube URLです。'); } });
    videoPlayer.addEventListener('timeupdate', handleTimeUpdate);
    videoPlayer.addEventListener('play', updateCentralPlayPauseIcon);
    videoPlayer.addEventListener('pause', updateCentralPlayPauseIcon);
    progressBarContainer.addEventListener('mousedown', handleDragStart);
    progressBarContainer.addEventListener('touchstart', handleDragStart);
    progressBarContainer.addEventListener('click', (e) => { if (!playerInterface.getDuration() || isDragging) return; const rect = progressBarContainer.getBoundingClientRect(); const ratio = (e.clientX - rect.left) / rect.width; const clickedTime = playerInterface.getDuration() * ratio; if (e.shiftKey && e.altKey) { setEndTime(clickedTime); } else if (e.shiftKey) { setStartTime(clickedTime); } else { playerInterface.seekTo(clickedTime); } });
    progressBarContainer.addEventListener('mousemove', (e) => { if (!playerInterface.getDuration()) return; const rect = progressBarContainer.getBoundingClientRect(); const hoverRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); progressTimeTooltip.textContent = formatTime(hoverRatio * playerInterface.getDuration()); progressTimeTooltip.style.left = `${hoverRatio * 100}%`; });
    playerWrapper.addEventListener('click', (e) => { const clickedOnUI = videoControls.contains(e.target); if (isTouchDevice) { if (playerWrapper.classList.contains('mobile-controls-visible')) { if (e.target === mobilePlayPauseIcon) { togglePlayPause(); hideMobileControls(); } else if (!clickedOnUI) { hideMobileControls(); } } else { showMobileControls(); } } else { if (!clickedOnUI) { togglePlayPause(); flashPcPlayPauseIcon(); } } });
    setStartBtn.addEventListener('click', () => setStartTime());
    setEndBtn.addEventListener('click', () => setEndTime());
    goStartBtn.addEventListener('click', goToStart);
    skipBackwardBtn.addEventListener('click', () => skipTime(-1));
    skipForwardBtn.addEventListener('click', () => skipTime(1));
    resetButton.addEventListener('click', () => resetRepeat());
    speedRange.addEventListener('input', (e) => setPlaybackRate(e.target.value));
    speedValue.addEventListener('change', (e) => setPlaybackRate(e.target.value));
    fullscreenBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleFullscreen(); });
    
    function handleFullscreenChange() {
        if (document.fullscreenElement) {
            if (isTouchDevice) {
                floatingPanelContainer.appendChild(actionButtons);
                togglePanelBtn.style.display = 'block';
            } else {
                resetInactiveTimer();
            }
        } else {
            clearTimeout(inactiveTimer);
            playerWrapper.classList.remove('is-inactive');
            staticActionButtonsContainer.appendChild(actionButtons);
            togglePanelBtn.style.display = 'none';
            floatingPanelContainer.style.display = 'none';
        }
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);
    
    playerWrapper.addEventListener('mousemove', () => { if (!isTouchDevice && document.fullscreenElement) { resetInactiveTimer(); } });
    
    togglePanelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        floatingPanelContainer.style.display = floatingPanelContainer.style.display === 'none' ? 'block' : 'none';
    });
    actionButtons.addEventListener('mousedown', onPanelDragStart);
    actionButtons.addEventListener('touchstart', onPanelDragStart, { passive: false });
    window.addEventListener('mousemove', onPanelDragMove);
    window.addEventListener('touchmove', onPanelDragMove, { passive: false });
    window.addEventListener('mouseup', onPanelDragEnd);
    window.addEventListener('touchend', onPanelDragEnd);
    resizeHandle.addEventListener('mousedown', onResizeStart);
    resizeHandle.addEventListener('touchstart', onResizeStart, { passive: false });
    window.addEventListener('mousemove', onResizeMove);
    window.addEventListener('touchmove', onResizeMove, { passive: false });
    window.addEventListener('mouseup', onResizeEnd);
    window.addEventListener('touchend', onResizeEnd);

    window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT') return;
        const keysToPrevent = [' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'f', 'home', 'end'];
        if (keysToPrevent.includes(e.key.toLowerCase())) e.preventDefault();
        switch (e.key.toLowerCase()) {
            case 'z': setStartTime(); break;
            case 'x': setEndTime(); break;
            case 'c': resetRepeat(); break;
            case 'v': goToStart(); break;
            case ' ': togglePlayPause(); flashPcPlayPauseIcon(); break;
            case 'arrowright': setPlaybackRate((parseFloat(speedRange.value) + 0.1).toFixed(2)); showToast(`再生速度: ${speedValue.value}x`); break;
            case 'arrowleft': setPlaybackRate((parseFloat(speedRange.value) - 0.1).toFixed(2)); showToast(`再生速度: ${speedValue.value}x`); break;
            case 'arrowup': setPlaybackRate((parseFloat(speedRange.value) + 0.01).toFixed(2)); showToast(`再生速度: ${speedValue.value}x`); break;
            case 'arrowdown': setPlaybackRate((parseFloat(speedRange.value) - 0.01).toFixed(2)); showToast(`再生速度: ${speedValue.value}x`); break;
            case 'home': skipTime(1); break;
            case 'end': skipTime(-1); break;
            case 'f': toggleFullscreen(); break;
        }
    });
    
    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        themeToggleBtn.textContent = document.body.classList.contains('light-theme') ? '☀️' : '🌙';
    });

    updateUI();
});