const PREMADE_PLAYLISTS = [
  {
    genre: "K-POP #1",
    songs: [
      { id: "lRETqod3SxY", title: "HANDS UP", channel: "MEOVV", thumbnail: "https://i.ytimg.com/vi/lRETqod3SxY/mqdefault.jpg" },
      { id: "XAULcrSh80E", title: "Gabriela", channel: "KATSEYE", thumbnail: "https://i.ytimg.com/vi/XAULcrSh80E/mqdefault.jpg" },
      { id: "vkLpkQV8v4w", title: "Rich Man", channel: "aespa", thumbnail: "https://i.ytimg.com/vi/vkLpkQV8v4w/mqdefault.jpg" },
      { id: "YVMUjAE-0SM", title: "Magnetic", channel: "ILLIT", thumbnail: "https://i.ytimg.com/vi/YVMUjAE-0SM/mqdefault.jpg" },
      { id: "-bC4iak3kxg", title: "Gameboy", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/-bC4iak3kxg/mqdefault.jpg" },
      { id: "l9CZykYZkOQ", title: "Touch", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/l9CZykYZkOQ/mqdefault.jpg" },
      { id: "n7ePZLn9_lQ", title: "Super Shy", channel: "NewJeans - Topic", thumbnail: "https://i.ytimg.com/vi/n7ePZLn9_lQ/mqdefault.jpg" },
      { id: "mMRddwYFW8A", title: "OMG", channel: "Pop_Kpop", thumbnail: "https://i.ytimg.com/vi/mMRddwYFW8A/mqdefault.jpg" },
      { id: "DfX4F5a6JE8", title: "ETA", channel: "Jaeguchi", thumbnail: "https://i.ytimg.com/vi/DfX4F5a6JE8/mqdefault.jpg" },
      { id: "R2-yomhYAj4", title: "Gnarly", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/R2-yomhYAj4/mqdefault.jpg" },
      { id: "-nEGVrzPaiU", title: "Tick-Tack", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/-nEGVrzPaiU/mqdefault.jpg" },
      { id: "bYg6aMDQ_TA", title: "Debut", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/bYg6aMDQ_TA/mqdefault.jpg" },
      { id: "CM4CkVFmTds", title: "I CAN'T STOP ME", channel: "JYP Entertainment", thumbnail: "https://i.ytimg.com/vi/CM4CkVFmTds/mqdefault.jpg" },
      { id: "eHHQaoEW30Q", title: "THIS IS FOR", channel: "JYP Entertainment", thumbnail: "https://i.ytimg.com/vi/eHHQaoEW30Q/mqdefault.jpg" },
      { id: "jWQx2f-CErU", title: "Whiplash", channel: "SMTOWN", thumbnail: "https://i.ytimg.com/vi/jWQx2f-CErU/mqdefault.jpg" },
      { id: "CgCVZdcKcqY", title: "JUMP", channel: "BLACKPINK", thumbnail: "https://i.ytimg.com/vi/CgCVZdcKcqY/mqdefault.jpg" },
      { id: "dyRsYk0LyA8", title: "Lovesick Girls", channel: "BLACKPINK", thumbnail: "https://i.ytimg.com/vi/dyRsYk0LyA8/mqdefault.jpg" },
    ],
  },
  {
    genre: "K-POP #2",
    songs: [
      { id: "JDRyqUx1X8M", title: "Shut Down", channel: "BLACKPINK", thumbnail: "https://i.ytimg.com/vi/JDRyqUx1X8M/mqdefault.jpg" },
      { id: "vsgdqdbQuc8", title: "ANTIFRAGILE", channel: "Rubik Music", thumbnail: "https://i.ytimg.com/vi/vsgdqdbQuc8/mqdefault.jpg" },
      { id: "negtrQu5mTA", title: "Bilyeoon Goyangi (Do the Dance)", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/negtrQu5mTA/mqdefault.jpg" },
      { id: "6ZUIwj3FgUY", title: "I AM", channel: "STARSHIP", thumbnail: "https://i.ytimg.com/vi/6ZUIwj3FgUY/mqdefault.jpg" },
      { id: "2S24-y0Ij3Y", title: "Kill This Love", channel: "BLACKPINK", thumbnail: "https://i.ytimg.com/vi/2S24-y0Ij3Y/mqdefault.jpg" },
      { id: "ioNng23DkIM", title: "How You Like That", channel: "BLACKPINK", thumbnail: "https://i.ytimg.com/vi/ioNng23DkIM/mqdefault.jpg" },
      { id: "o8RkbHv2_a0", title: "Attention", channel: "K MUSIC", thumbnail: "https://i.ytimg.com/vi/o8RkbHv2_a0/mqdefault.jpg" },
      { id: "IHNzOHi8sJs", title: "DDU-DU DDU-DU", channel: "BLACKPINK", thumbnail: "https://i.ytimg.com/vi/IHNzOHi8sJs/mqdefault.jpg" },
      { id: "bNKXxwOQYB8", title: "EASY", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/bNKXxwOQYB8/mqdefault.jpg" },
      { id: "lEThmt0saQg", title: "SHEESH", channel: "BABYMONSTER", thumbnail: "https://i.ytimg.com/vi/lEThmt0saQg/mqdefault.jpg" },
      { id: "64q9zY13PVc", title: "As If It's Your Last", channel: "BLACKPINK - Topic", thumbnail: "https://i.ytimg.com/vi/64q9zY13PVc/mqdefault.jpg" },
      { id: "3or3dp3qNQU", title: "Pink Venom", channel: "BLACKPINK", thumbnail: "https://i.ytimg.com/vi/3or3dp3qNQU/mqdefault.jpg" },
      { id: "phuiiNCxRMg", title: "Supernova", channel: "SMTOWN", thumbnail: "https://i.ytimg.com/vi/phuiiNCxRMg/mqdefault.jpg" },
      { id: "n6B5gQXlB-0", title: "CRAZY", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/n6B5gQXlB-0/mqdefault.jpg" },
      { id: "nmbiBVPe5bY", title: "Strategy", channel: "TWICE - Topic", thumbnail: "https://i.ytimg.com/vi/nmbiBVPe5bY/mqdefault.jpg" },
      { id: "haCpjUXIhrI", title: "Ditto", channel: "Jaeguchi", thumbnail: "https://i.ytimg.com/vi/haCpjUXIhrI/mqdefault.jpg" },
      { id: "fQ4D_NY83cw", title: "Dark Arts", channel: "Jaeguchi", thumbnail: "https://i.ytimg.com/vi/fQ4D_NY83cw/mqdefault.jpg" },
    ],
  },
  {
    genre: "K-POP #3",
    songs: [
      { id: "gdZLi9oWNZg", title: "Dynamite", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/gdZLi9oWNZg/mqdefault.jpg" },
      { id: "oKBwWQI-IoI", title: "Perfect Night", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/oKBwWQI-IoI/mqdefault.jpg" },
      { id: "Q97pvL6GsIA", title: "Look At Me", channel: "TWICE - Topic", thumbnail: "https://i.ytimg.com/vi/Q97pvL6GsIA/mqdefault.jpg" },
      { id: "3_7cdiGSWsI", title: "HOWLING", channel: "JXS_BP Official", thumbnail: "https://i.ytimg.com/vi/3_7cdiGSWsI/mqdefault.jpg" },
      { id: "4TWR90KJl84", title: "Next Level", channel: "SMTOWN", thumbnail: "https://i.ytimg.com/vi/4TWR90KJl84/mqdefault.jpg" },
      { id: "i0p1bmr0EmE", title: "What is Love?", channel: "JYP Entertainment", thumbnail: "https://i.ytimg.com/vi/i0p1bmr0EmE/mqdefault.jpg" },
      { id: "fTt3dbNBH20", title: "How Sweet", channel: "Jaeguchi", thumbnail: "https://i.ytimg.com/vi/fTt3dbNBH20/mqdefault.jpg" },
      { id: "b-9GNw-_1LA", title: "Rewind", channel: "Wonder Girls - Topic", thumbnail: "https://i.ytimg.com/vi/b-9GNw-_1LA/mqdefault.jpg" },
      { id: "x_RYZsOfpKY", title: "NOT CUTE ANYMORE", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/x_RYZsOfpKY/mqdefault.jpg" },
      { id: "BlHv3BbBv6A", title: "Tell Me", channel: "JYP Entertainment", thumbnail: "https://i.ytimg.com/vi/BlHv3BbBv6A/mqdefault.jpg" },
      { id: "2ips2mM7Zqw", title: "BANG BANG BANG", channel: "BIGBANG", thumbnail: "https://i.ytimg.com/vi/2ips2mM7Zqw/mqdefault.jpg" },
      { id: "WMweEpGlu_U", title: "Butter", channel: "HYBE LABELS", thumbnail: "https://i.ytimg.com/vi/WMweEpGlu_U/mqdefault.jpg" },
      { id: "U1_0Vc-9mNw", title: "UP", channel: "aespa - Topic", thumbnail: "https://i.ytimg.com/vi/U1_0Vc-9mNw/mqdefault.jpg" },
      { id: "rGD5U8u1Dk0", title: "1-800-hot-n-fun", channel: "LE SSERAFIM", thumbnail: "https://i.ytimg.com/vi/rGD5U8u1Dk0/mqdefault.jpg" },
      { id: "8Cp-8gZ4mnE", title: "SPAGHETTI", channel: "LE SSERAFIM - Topic", thumbnail: "https://i.ytimg.com/vi/8Cp-8gZ4mnE/mqdefault.jpg" },
      { id: "ekr2nIex040", title: "APT.", channel: "ROSE", thumbnail: "https://i.ytimg.com/vi/ekr2nIex040/mqdefault.jpg" },
      { id: "5q9EjSUovc4", title: "Internet Girl", channel: "KATSEYE", thumbnail: "https://i.ytimg.com/vi/5q9EjSUovc4/mqdefault.jpg" },
    ],
  },
  { genre: "ROCK", songs: [] },
  { genre: "OTHER", songs: [] },
];

function renderPlaylists(socket) {
  const row = document.getElementById("playlists-row");
  PREMADE_PLAYLISTS.forEach((pl) => {
    if (pl.songs.length === 0) return;
    const thumbs = pl.songs.slice(0, 4);
    const card = document.createElement("div");
    card.className = "playlist-card";
    card.innerHTML = `
      <div class="playlist-grid">
        ${thumbs.map((s) => `<img src="${s.thumbnail}" alt="">`).join("")}
      </div>
      <div class="playlist-meta">
        <span class="playlist-genre">${pl.genre}</span>
        <span class="playlist-count">${pl.songs.length} songs</span>
      </div>
      <button class="playlist-add-btn">Add All</button>`;
    card.querySelector(".playlist-add-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      pl.songs.forEach((s) => socket.emit("add_song", s));
    });
    card.querySelector(".playlist-grid").addEventListener("click", () => openPlaylistModal(pl, socket));
    row.appendChild(card);
  });
}

function openPlaylistModal(pl, socket) {
  const overlay = document.getElementById("playlist-modal");
  const title = document.getElementById("playlist-modal-title");
  const list = document.getElementById("playlist-modal-list");
  title.textContent = pl.genre;
  list.innerHTML = "";
  pl.songs.forEach((s) => {
    const item = document.createElement("div");
    item.className = "pl-modal-item";
    item.innerHTML = `
      <img src="${s.thumbnail}" alt="">
      <div class="pl-modal-info">
        <div class="pl-modal-title">${s.title}</div>
        <div class="pl-modal-channel">${s.channel}</div>
      </div>
      <button class="pl-modal-add">+</button>`;
    item.querySelector(".pl-modal-add").addEventListener("click", () => socket.emit("add_song", s));
    list.appendChild(item);
  });
  overlay.style.display = "flex";
}
