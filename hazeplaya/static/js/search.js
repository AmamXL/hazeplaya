let searchTimer = null;

function initSearch(socket) {
  const input = document.getElementById("search-input");
  const btn = document.getElementById("search-btn");
  const results = document.getElementById("search-results");

  if (!input || !btn) return;

  input.addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value.trim();
    if (!q) { hideResults(); return; }
    searchTimer = setTimeout(() => doSearch(q, socket), 450);
  });

  btn.addEventListener("click", () => {
    const q = input.value.trim();
    if (q) doSearch(q, socket);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(searchTimer);
      const q = e.target.value.trim();
      if (q) doSearch(q, socket);
    }
    if (e.key === "Escape") hideResults();
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-section")) hideResults();
  });
}

async function doSearch(q, socket) {
  try {
    const res = await fetch("search?q=" + encodeURIComponent(q));
    const results = await res.json();
    showResults(results, socket);
  } catch {
    showResults([], socket);
  }
}

function showResults(results, socket) {
  const box = document.getElementById("search-results");
  if (!box) return;
  
  box.innerHTML = "";
  if (!results.length) {
    box.innerHTML = '<div class="no-results">No results found</div>';
    box.classList.add("visible");
    return;
  }
  
  results.forEach((r) => {
    const item = document.createElement("div");
    item.className = "result-item";
    item.innerHTML = `
      <img class="result-thumb" src="${r.thumbnail}" alt="">
      <div class="result-info">
        <div class="result-title">${escapeHtml(r.title)}</div>
        <div class="result-channel">${escapeHtml(r.channel)}</div>
      </div>
      <span class="result-add">+</span>
    `;
    item.addEventListener("click", () => {
      socket.emit("add_song", r);
      document.getElementById("search-input").value = "";
      hideResults();
    });
    box.appendChild(item);
  });
  box.classList.add("visible");
}

function hideResults() {
  const box = document.getElementById("search-results");
  if (box) {
    box.classList.remove("visible");
    box.innerHTML = "";
  }
}
