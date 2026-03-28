let player = null;
let playerReady = false;
let lastVideoId = null;
let playbackCheckTimer = null;
let autoplayCheckTimer = null;
let progressInterval = null;

// Set to true to force yt-dlp fallback mode (for testing visualizers)
// Set to false to use YouTube IFrame player (default, faster)
const FORCE_FALLBACK = true;

// Expose for app.js
window.FORCE_FALLBACK = FORCE_FALLBACK;

// Fallback
let fallbackMode = false;
let fallbackActivating = false;
const audioEl = document.createElement("audio");
audioEl.id = "fallback-audio";
audioEl.style.display = "none";
document.body.appendChild(audioEl);

// Track when YouTube API starts loading
const _ytApiLoadStart = Date.now();
let _ytApiLoadTime = null;

// YouTube API calls this function when ready - MUST be global!
window.onYouTubeIframeAPIReady = function() {
  _ytApiLoadTime = Date.now() - _ytApiLoadStart;
  initPlayer();
};

function initPlayer() {
  playerReady = true;
  
  // If FORCE_FALLBACK is enabled, skip IFrame and use direct stream
  if (FORCE_FALLBACK) {
    if (App.currentIndex >= 0 && App.queue[App.currentIndex] && App.tosAccepted) {
      activateFallback(App.queue[App.currentIndex]);
    }
    return;
  }
  
  player = new YT.Player("yt-player", {
    width: 1,
    height: 1,
    playerVars: { autoplay: 0, controls: 0 },
    events: {
      onReady: () => {
        // Check if there's already a song that should be playing
        if (App.currentIndex >= 0 && App.queue[App.currentIndex] && App.tosAccepted) {
          const song = App.queue[App.currentIndex];
          lastVideoId = song.id;
          const seekTo = App.isPlaying
            ? Math.max(0, App.serverPosition + (Date.now() - App.serverPositionAt) / 1000)
            : App.serverPosition;
          if (App.isPlaying) {
            player.loadVideoById({ videoId: song.id, startSeconds: seekTo });
            player.setVolume(applyVolumeCurve(parseInt(document.getElementById("volume").value)));
            player.playVideo();
          } else {
            player.cueVideoById({ videoId: song.id, startSeconds: seekTo });
            player.setVolume(applyVolumeCurve(parseInt(document.getElementById("volume").value)));
          }
        }
      },
      onStateChange: onPlayerStateChange,
      onError: (e) => {
        activateFallback(App.queue[App.currentIndex]);
      },
    },
  });
}

// Fallback: manually trigger if YouTube API doesn't call the callback
setTimeout(() => {
  if (!playerReady && typeof window.onYouTubeIframeAPIReady === 'function') {
    window.onYouTubeIframeAPIReady();
  }
}, 5000);

function onPlayerStateChange(e) {
  if (e.data === YT.PlayerState.PLAYING) {
    if (playbackCheckTimer) { clearTimeout(playbackCheckTimer); playbackCheckTimer = null; }
    if (autoplayCheckTimer) { clearTimeout(autoplayCheckTimer); autoplayCheckTimer = null; }
    document.getElementById("join-overlay").style.display = "none";
    document.getElementById("btn-play").textContent = "\u23F8";
    startProgress();
  } else if (e.data === YT.PlayerState.PAUSED) {
    document.getElementById("btn-play").textContent = "\u25B6";
    stopProgress();
  } else if (e.data === YT.PlayerState.ENDED) {
    stopProgress();
    App.socket.emit("remove_song", { index: App.currentIndex, reason: "yt_ended" });
  }
}

async function activateFallback(song) {
  if (fallbackMode || fallbackActivating) return;
  fallbackActivating = true;
  if (!song) {
    fallbackActivating = false;
    App.socket.emit("remove_song", { index: App.currentIndex, reason: "fallback_no_song" });
    return;
  }
  const streamPath = window.location.pathname.startsWith("/hazeplaya") ? "/hazeplaya/stream/" : "/stream/";
  try {
    const res = await fetch(streamPath + song.id);
    const data = await res.json();
    if (data.error) {
      fallbackActivating = false;
      App.socket.emit("remove_song", { index: App.currentIndex, reason: "fallback_stream_error" });
      return;
    }
    fallbackMode = true;
    fallbackActivating = false;
    lastVideoId = song.id;
    audioEl.src = data.url;
    audioEl.volume = applyVolumeCurve(parseInt(document.getElementById("volume").value)) / 100;
    const seekTo = Math.max(0, App.serverPosition + (Date.now() - App.serverPositionAt) / 1000);
    audioEl.addEventListener("loadedmetadata", () => { audioEl.currentTime = seekTo; }, { once: true });
    audioEl.play();
    audioEl.onended = () => { fallbackMode = false; App.socket.emit("remove_song", { index: App.currentIndex, reason: "fallback_ended" }); };
    audioEl.onplay = () => { document.getElementById("join-overlay").style.display = "none"; document.getElementById("btn-play").textContent = "\u23F8"; startProgress(); };
    audioEl.onpause = () => { document.getElementById("btn-play").textContent = "\u25B6"; stopProgress(); };
  } catch {
    fallbackActivating = false;
    App.socket.emit("remove_song", { index: App.currentIndex, reason: "fallback_fetch_error" });
  }
}

function stopFallback() {
  if (fallbackMode) { audioEl.pause(); audioEl.src = ""; fallbackMode = false; }
  fallbackActivating = false;
}

function loadSong(song, seekTo, shouldPlay) {
  if (!playerReady) return;
  
  // If FORCE_FALLBACK is enabled, always use direct stream
  if (FORCE_FALLBACK) {
    activateFallback(song);
    return;
  }
  
  stopFallback();
  lastVideoId = song.id;  // Always update this for proper skip detection
  const vol = applyVolumeCurve(parseInt(document.getElementById("volume").value));
  if (shouldPlay && App.tosAccepted) {
    player.loadVideoById({ videoId: song.id, startSeconds: seekTo });
    player.setVolume(vol);
    player.playVideo();
  } else {
    player.cueVideoById({ videoId: song.id, startSeconds: seekTo });
    player.setVolume(vol);
  }
  if (playbackCheckTimer) clearTimeout(playbackCheckTimer);
  if (shouldPlay) {
    playbackCheckTimer = setTimeout(() => {
      if (!fallbackMode && !fallbackActivating && player && player.getPlayerState) {
        const st = player.getPlayerState();
        if (st === YT.PlayerState.UNSTARTED || st === YT.PlayerState.CUED || st === -1) {
          activateFallback(App.queue[App.currentIndex]);
        }
      }
    }, 4000);
  }
}

function syncPlayback(livePos) {
  if (fallbackMode) {
    const drift = Math.abs((audioEl.currentTime || 0) - livePos);
    if (drift > 2) audioEl.currentTime = livePos;
    if (App.isPlaying && audioEl.paused && App.tosAccepted) audioEl.play();
    else if (!App.isPlaying && !audioEl.paused) audioEl.pause();
  } else {
    const currentPos = player.getCurrentTime ? player.getCurrentTime() : 0;
    const drift = Math.abs(currentPos - livePos);
    if (drift > 2) player.seekTo(livePos, true);
    if (App.isPlaying && App.tosAccepted && player.getPlayerState() !== YT.PlayerState.PLAYING) {
      player.playVideo();
    } else if (!App.isPlaying && player.getPlayerState() === YT.PlayerState.PLAYING) {
      player.pauseVideo();
    }
  }
}

// Load a new song in fallback mode
function loadFallbackSong(song, seekTo, shouldPlay) {
  if (!song) return;
  fallbackMode = true;
  fallbackActivating = true;
  const streamPath = window.location.pathname.startsWith("/hazeplaya") ? "/hazeplaya/stream/" : "/stream/";
  fetch(streamPath + song.id)
    .then(res => res.json())
    .then(data => {
      if (data.error) {
        fallbackActivating = false;
        App.socket.emit("remove_song", { index: App.currentIndex, reason: "fallback_stream_error" });
        return;
      }
      fallbackActivating = false;
      lastVideoId = song.id;
      audioEl.src = data.url;
      audioEl.volume = applyVolumeCurve(parseInt(document.getElementById("volume").value)) / 100;
      audioEl.addEventListener("loadedmetadata", () => {
        audioEl.currentTime = seekTo;
        if (shouldPlay && App.tosAccepted) {
          audioEl.play();
        }
      }, { once: true });
      audioEl.onplay = () => {
        document.getElementById("join-overlay").style.display = "none";
        document.getElementById("btn-play").textContent = "\u23F8";
        startProgress();
      };
      audioEl.onended = () => {
        fallbackMode = false;
        App.socket.emit("remove_song", { index: App.currentIndex, reason: "fallback_ended" });
      };
    })
    .catch(() => {
      fallbackActivating = false;
      App.socket.emit("remove_song", { index: App.currentIndex, reason: "fallback_fetch_error" });
    });
}

// Expose for app.js
window.loadFallbackSong = loadFallbackSong;
window.syncPlayback = syncPlayback;

function startProgress() {
  stopProgress();
  progressInterval = setInterval(updateProgress, 500);
}

function stopProgress() {
  if (progressInterval) clearInterval(progressInterval);
}

function updateProgress() {
  const current = fallbackMode ? (audioEl.currentTime || 0) : (playerReady ? player.getCurrentTime() || 0 : 0);
  const total = fallbackMode ? (audioEl.duration || 0) : (playerReady ? player.getDuration() || 0 : 0);
  document.getElementById("progress-fill").style.width = total > 0 ? (current / total * 100) + "%" : "0%";
  document.getElementById("time-current").textContent = fmtTime(current);
  document.getElementById("time-total").textContent = fmtTime(total);
}

function resetNowPlaying() {
  document.getElementById("now-title").textContent = "\u2014";
  document.getElementById("now-channel").textContent = "Nothing in queue";
  document.getElementById("now-thumb").style.display = "none";
  document.getElementById("now-placeholder").style.display = "";
  document.getElementById("progress-fill").style.width = "0%";
  document.getElementById("time-current").textContent = "0:00";
  document.getElementById("time-total").textContent = "0:00";
  lastVideoId = null;
  stopProgress();
  stopFallback();
  if (playerReady && player) player.stopVideo();
}
