const App = {
  queue: [],
  currentIndex: -1,
  isPlaying: false,
  adminUnlocked: false,
  tosAccepted: false,
  serverPosition: 0,
  serverPositionAt: 0,
  socket: null,
};

(function init() {
  const socketPath = window.location.pathname.startsWith("/hazeplaya") ? "/hazeplaya/socket.io" : "/socket.io";
  App.socket = io({ path: socketPath });

  // ToS
  const joinOverlay = document.getElementById("join-overlay");
  joinOverlay.style.display = "flex";

  document.getElementById("tos-accept").addEventListener("click", () => {
    App.tosAccepted = true;
    joinOverlay.style.display = "none";
    // Try to start playback if there's a song that should be playing
    if (App.currentIndex >= 0 && App.queue[App.currentIndex] && App.isPlaying) {
      const song = App.queue[App.currentIndex];
      const liveSeek = Math.max(0, App.serverPosition + (Date.now() - App.serverPositionAt) / 1000);
      if (fallbackMode) { 
        audioEl.currentTime = liveSeek; 
        audioEl.play(); 
      } else if (!playerReady) { 
        // Player not ready yet, will be handled when it becomes ready
      } else { 
        player.seekTo(liveSeek, true); 
        player.playVideo(); 
      }
    }
  });

  document.getElementById("tos-decline").addEventListener("click", () => {
    document.getElementById("tos-error").style.display = "block";
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
      document.getElementById("now-title").textContent = decodeHtmlEntities(song.title);
      document.getElementById("now-channel").textContent = decodeHtmlEntities(song.channel);
      const thumb = document.getElementById("now-thumb");
      thumb.src = song.thumbnail;
      thumb.style.display = "block";
      document.getElementById("now-placeholder").style.display = "none";
    }

    // Always try to load/sync the current song if we have one and ToS accepted
    if (newVideoId && App.tosAccepted) {
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

  // Autoplay
  document.getElementById("autoplay-toggle").addEventListener("change", (e) => {
    App.socket.emit("set_autoplay", { enabled: e.target.checked });
  });

  App.socket.on("autoplay_state", (data) => {
    document.getElementById("autoplay-toggle").checked = data.enabled;
  });

  // Quota updates via WebSocket (no polling needed)
  App.socket.on("quota_update", (data) => {
    document.getElementById("quota-used").textContent = data.used;
    document.getElementById("quota-total").textContent = data.total;
  });

  // Escape closes modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") document.getElementById("playlist-modal").style.display = "none";
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
