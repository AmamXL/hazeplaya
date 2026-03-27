let searchTimer = null;

function initSearch(socket) {
  const input = document.getElementById("search-input");
  const btn = document.getElementById("search-btn");

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
        <div class="result-title">${escHtml(r.title)}</div>
        <div class="result-channel">${escHtml(r.channel)}</div>
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
  box.classList.remove("visible");
  box.innerHTML = "";
}
