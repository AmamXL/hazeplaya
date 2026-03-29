const App = {
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  adminUnlocked: false,
  serverPosition: 0,
  serverPositionAt: 0,
  socket: null,
  currentTheme: 'burn',
};

(function init() {
  const socketPath = window.location.pathname.startsWith("/hazeplaya") ? "/hazeplaya/socket.io" : "/socket.io";
  App.socket = io({ path: socketPath });

  // Load saved theme
  const savedTheme = localStorage.getItem('hazeplaya-theme') || 'burn';
  setTheme(savedTheme);

  // Initialize visualizer bars
  initVisualizer();

  // Settings modal - open via logo click
  const sidebarLogo = document.getElementById('sidebar-logo');
  const settingsOverlay = document.getElementById('settings-overlay');
  const settingsClose = document.getElementById('settings-close');
  const themeOptions = document.querySelectorAll('.theme-option');

  sidebarLogo.addEventListener('click', () => {
    settingsOverlay.classList.add('visible');
  });

  settingsClose.addEventListener('click', () => {
    settingsOverlay.classList.remove('visible');
  });

  settingsOverlay.addEventListener('click', (e) => {
    if (e.target === settingsOverlay) {
      settingsOverlay.classList.remove('visible');
    }
  });

  themeOptions.forEach(option => {
    option.addEventListener('click', () => {
      const theme = option.dataset.theme;
      setTheme(theme);
      localStorage.setItem('hazeplaya-theme', theme);
      
      themeOptions.forEach(o => o.classList.remove('active'));
      option.classList.add('active');
    });
  });

  // Playlist modal close
  document.getElementById('playlist-modal-close')?.addEventListener('click', closePlaylistModal);
  document.getElementById('playlist-modal')?.addEventListener('click', (e) => {
    if (e.target.id === 'playlist-modal') {
      closePlaylistModal();
    }
  });

  // State sync
  App.socket.on("state", (state) => {
    App.queue = state.queue;
    App.currentIndex = state.current_index;
    App.isPlaying = state.is_playing;
    App.serverPosition = state.position || 0;
    App.serverPositionAt = Date.now();

    renderQueue();

    if (App.currentIndex === -1) {
      resetNowPlaying();
      return;
    }

    const song = App.queue[App.currentIndex];
    const newVideoId = song ? song.id : null;

    if (song) {
      const title = decodeHtmlEntities(song.title);
      const artist = decodeHtmlEntities(song.channel);
      
      // Update both center display and player bar
      document.getElementById("now-title").textContent = title;
      document.getElementById("now-artist").textContent = artist;
      document.getElementById("player-title").textContent = title;
      document.getElementById("player-artist").textContent = artist;
      
      // Show thumbnail
      const thumb = document.getElementById("now-playing-thumb");
      if (song.thumbnail) {
        thumb.src = song.thumbnail;
        thumb.classList.add('visible');
      } else {
        thumb.classList.remove('visible');
      }
    }

    // Always try to load/sync the current song if we have one
    if (newVideoId) {
      const seekTo = App.isPlaying
        ? Math.max(0, App.serverPosition + (Date.now() - App.serverPositionAt) / 1000)
        : App.serverPosition;

      if (fallbackMode || FORCE_FALLBACK) {
        if (newVideoId !== lastVideoId) {
          loadFallbackSong(song, seekTo, App.isPlaying);
          lastVideoId = newVideoId;
        } else {
          syncPlayback(seekTo);
        }
      } else if (playerReady) {
        if (newVideoId !== lastVideoId) {
          loadSong(song, seekTo, App.isPlaying);
        } else {
          syncPlayback(seekTo);
        }
      }
    }

    document.getElementById("btn-play").textContent = App.isPlaying ? "\u23F8" : "\u25B6";
  });

  // Controls
  document.getElementById("btn-play").addEventListener("click", () => {
    if (!App.adminUnlocked) { showPopup(); return; }
    if (App.currentIndex === -1) return;
    if (fallbackMode) {
      if (audioEl.paused) { audioEl.play(); App.socket.emit("set_playing", { playing: true }); }
      else { audioEl.pause(); App.socket.emit("set_playing", { playing: false }); }
      return;
    }
    if (!playerReady) return;
    App.socket.emit("set_playing", { playing: !App.isPlaying });
  });

  document.getElementById("btn-next").addEventListener("click", () => {
    if (!App.adminUnlocked) { showPopup(); return; }
    App.socket.emit("admin_skip_next");
  });

  document.getElementById("btn-prev").addEventListener("click", () => {
    if (!App.adminUnlocked) { showPopup(); return; }
    App.socket.emit("admin_skip_prev");
  });

  document.getElementById("volume").addEventListener("input", (e) => {
    const sliderVal = parseInt(e.target.value);
    const curvedVol = applyVolumeCurve(sliderVal);
    document.getElementById("vol-pct").textContent = sliderVal + "%";
    if (fallbackMode) audioEl.volume = curvedVol / 100;
    else if (playerReady) player.setVolume(curvedVol);
  });

  // Progress bar click to seek
  document.getElementById("progress-wrap").addEventListener("click", (e) => {
    if (!App.adminUnlocked) { showPopup(); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    let position;
    if (fallbackMode) {
      position = pct * audioEl.duration;
      audioEl.currentTime = position;
    } else {
      if (!playerReady || !player.getDuration || !player.getDuration()) return;
      position = pct * player.getDuration();
      player.seekTo(position, true);
    }
    App.socket.emit("seek", { position });
  });

  // Autoplay toggle
  document.getElementById("autoplay-toggle").addEventListener("change", (e) => {
    App.socket.emit("set_autoplay", { enabled: e.target.checked });
  });

  App.socket.on("autoplay_state", (data) => {
    document.getElementById("autoplay-toggle").checked = data.enabled;
  });

  // Quota updates via WebSocket
  App.socket.on("quota_update", (data) => {
    document.getElementById("quota-used").textContent = data.used;
    document.getElementById("quota-total").textContent = data.total;
  });

  // Escape closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closePlaylistModal();
      document.getElementById("settings-overlay").classList.remove("visible");
    }
  });

  // Init modules
  initAdmin(App.socket);
  initSearch(App.socket);
  renderPlaylists(App.socket);

  // Test YouTube API (for debugging)
  window.testYouTubeAPI = async function() {
    try {
      const res = await fetch("test-api");
      const data = await res.json();
      alert(`YouTube API Test:\n${data.keys.filter(k => k.status === "OK").length}/${data.keys.length} keys working\nQuota: ${data.quota.used}/${data.quota.total}`);
    } catch (e) {
      alert("API test failed: " + e.message);
    }
  };
})();

function setTheme(theme) {
  App.currentTheme = theme;
  
  // Remove existing theme stylesheets
  document.querySelectorAll('link[data-theme-css]').forEach(el => el.remove());
  
  // Add new theme stylesheet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = `/static/css/theme-${theme}.css`;
  link.dataset.themeCss = '';
  document.head.appendChild(link);
  
  // Update background text based on theme
  const bgText = document.getElementById('now-playing-bg');
  if (bgText) {
    bgText.textContent = theme === 'ivory' ? 'HAZE' : 'PLAY';
  }
}

function initVisualizer() {
  const viz = document.getElementById('visualizer');
  if (!viz) return;
  
  viz.innerHTML = '';
  for (let i = 0; i < 16; i++) {
    const bar = document.createElement('div');
    bar.className = 'vis-bar';
    bar.style.height = '34px';
    bar.style.animationDuration = (0.4 + Math.random() * 0.65).toFixed(2) + 's';
    bar.style.animationDelay = (i * 0.058).toFixed(2) + 's';
    viz.appendChild(bar);
  }
}

function resetNowPlaying() {
  document.getElementById("now-title").textContent = "—";
  document.getElementById("now-artist").textContent = "Nothing in queue";
  document.getElementById("player-title").textContent = "—";
  document.getElementById("player-artist").textContent = "Nothing in queue";
  document.getElementById("now-playing-thumb").classList.remove('visible');
  document.getElementById("progress-line").style.width = "0%";
  document.getElementById("time-current").textContent = "0:00";
  document.getElementById("time-total").textContent = "0:00";
  lastVideoId = null;
  stopProgress();
  stopFallback();
  if (playerReady && player) player.stopVideo();
}
