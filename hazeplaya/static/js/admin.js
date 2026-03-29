let popupTimer = null;

function initAdmin(socket) {
  const unlockInput = document.getElementById("unlock-input");
  const unlockStatus = document.getElementById("unlock-status");
  
  if (!unlockInput || !unlockStatus) return;

  unlockInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      socket.emit("verify_password", { password: e.target.value });
      e.target.value = "";
    }
  });

  socket.on("unlock_result", (data) => {
    App.adminUnlocked = data.success;
    
    const statusText = data.success ? "UNLOCKED" : data.locked ? "LOCKED OUT" : "WRONG";
    unlockStatus.textContent = statusText;
    
    if (data.success) {
      unlockInput.blur();
    }
    
    renderQueue();
  });
}

function showPopup() {
  const popup = document.getElementById("popup");
  if (!popup) return;
  
  popup.classList.add("show");
  clearTimeout(popupTimer);
  popupTimer = setTimeout(() => popup.classList.remove("show"), 3000);
}
