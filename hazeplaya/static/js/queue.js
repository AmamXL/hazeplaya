let dragSrcIndex = null;

function renderQueue() {
  const list = document.getElementById("queue-list");
  if (App.queue.length === 0) {
    list.innerHTML = '<div class="queue-empty">Queue is empty</div>';
    return;
  }
  list.innerHTML = "";
  App.queue.forEach((song, i) => {
    const item = document.createElement("div");
    item.className = "queue-item" + (i === App.currentIndex ? " active" : "");
    if (App.adminUnlocked) item.draggable = true;
    item.innerHTML = `
      <span class="queue-num">${i + 1}</span>
      <img class="queue-thumb" src="${song.thumbnail}" alt="">
      <div class="queue-song-info">
        <span class="queue-title">${escHtml(song.title)}</span>
        <span class="queue-channel">${escHtml(song.channel)}</span>
      </div>
      ${App.adminUnlocked ? `<span class="queue-remove" data-idx="${i}">&times;</span>` : ""}
    `;

    item.addEventListener("click", (e) => {
      if (e.target.classList.contains("queue-remove")) {
        App.socket.emit("remove_song", { index: parseInt(e.target.dataset.idx), reason: "manual" });
      } else {
        if (!App.adminUnlocked) { showPopup(); return; }
        App.socket.emit("play_song", { index: i });
      }
    });

    if (App.adminUnlocked) {
      item.addEventListener("dragstart", () => { dragSrcIndex = i; item.style.opacity = "0.4"; });
      item.addEventListener("dragend", () => { item.style.opacity = ""; });
      item.addEventListener("dragover", (e) => { e.preventDefault(); item.style.borderTop = i !== dragSrcIndex ? "2px solid var(--accent)" : ""; });
      item.addEventListener("dragleave", () => { item.style.borderTop = ""; });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        item.style.borderTop = "";
        if (dragSrcIndex !== null && dragSrcIndex !== i) {
          App.socket.emit("reorder_queue", { from: dragSrcIndex, to: i });
        }
        dragSrcIndex = null;
      });
    }

    list.appendChild(item);
  });
}
