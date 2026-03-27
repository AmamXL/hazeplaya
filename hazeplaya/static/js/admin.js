let popupTimer = null;

function initAdmin(socket) {
  document.getElementById("unlock-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      socket.emit("verify_password", { password: e.target.value });
      e.target.value = "";
    }
  });

  socket.on("unlock_result", (data) => {
    App.adminUnlocked = data.success;
    document.getElementById("unlock-row").classList.toggle("unlocked", data.success);
    const statusText = data.success ? "UNLOCKED" : data.locked ? "LOCKED OUT" : "WRONG";
    document.getElementById("unlock-status").textContent = statusText;
    document.getElementById("unlock-status").classList.toggle("unlocked", data.success);
    if (data.success) document.getElementById("unlock-input").blur();
    document.getElementById("autoplay-row").style.display = data.success ? "flex" : "none";
    renderQueue();
  });

  document.getElementById("popup").addEventListener("click", () => {
    document.getElementById("popup").classList.remove("visible");
    clearTimeout(popupTimer);
  });
}

function showPopup() {
  const popup = document.getElementById("popup");
  popup.classList.add("visible");
  clearTimeout(popupTimer);
  popupTimer = setTimeout(() => popup.classList.remove("visible"), 3000);
}
