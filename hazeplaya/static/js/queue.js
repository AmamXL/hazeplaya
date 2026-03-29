let dragSrcIndex = null;

function renderQueue() {
  const list = document.getElementById("queue-list");
  if (!list) return;
  
  if (App.queue.length === 0) {
    list.innerHTML = '<div class="queue-empty">Queue is empty</div>';
    return;
  }
  
  list.innerHTML = "";
  App.queue.forEach((song, i) => {
    const item = document.createElement("div");
    item.className = "queue-item" + (i === App.currentIndex ? " on" : "");
    if (App.adminUnlocked) item.draggable = true;
    
    const title = decodeHtmlEntities(song.title);
    const channel = decodeHtmlEntities(song.channel);
    const thumbnail = song.thumbnail || '';
    
    item.innerHTML = `
      <span class="queue-n">${i + 1}</span>
      <img class="queue-thumb" src="${thumbnail}" alt="">
      <div>
        <div class="queue-t">${escapeHtml(title)}</div>
        <div class="queue-d">${escapeHtml(channel)}</div>
      </div>
    `;

    item.addEventListener("click", (e) => {
      if (!App.adminUnlocked) { showPopup(); return; }
      App.socket.emit("play_song", { index: i });
    });

    if (App.adminUnlocked) {
      item.addEventListener("dragstart", () => { dragSrcIndex = i; item.style.opacity = "0.4"; });
      item.addEventListener("dragend", () => { item.style.opacity = ""; });
      item.addEventListener("dragover", (e) => { e.preventDefault(); });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        if (dragSrcIndex !== null && dragSrcIndex !== i) {
          App.socket.emit("reorder_queue", { from: dragSrcIndex, to: i });
        }
        dragSrcIndex = null;
      });
    }

    list.appendChild(item);
  });
}
