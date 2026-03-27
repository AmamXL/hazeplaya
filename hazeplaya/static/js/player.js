let player = null;
let playerReady = false;
let lastVideoId = null;
let playbackCheckTimer = null;
let autoplayCheckTimer = null;
let progressInterval = null;

// Fallback
let fallbackMode = false;
let fallbackActivating = false;
const audioEl = document.createElement("audio");

function onYouTubeIframeAPIReady() {
  player = new YT.Player("yt-player", {
    width: 1,
    height: 1,
    playerVars: { autoplay: 0, controls: 0 },
    events: {
      onReady: () => {
        playerReady = true;
        if (App.currentIndex >= 0 && App.queue[App.currentIndex]) {
          const song = App.queue[App.currentIndex];
          lastVideoId = song.id;
          const seekTo = App.isPlaying
            ? Math.max(0, App.serverPosition + (Date.now() - App.serverPositionAt) / 1000)
            : App.serverPosition;
          if (App.isPlaying && App.tosAccepted) {
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
      onError: () => {
        activateFallback(App.queue[App.currentIndex]);
      },
    },
  });
}

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
  stopFallback();
  lastVideoId = song.id;
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
  if (playerReady) player.stopVideo();
}
