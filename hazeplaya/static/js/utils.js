function decodeHtmlEntities(s) {
  const el = document.createElement("textarea");
  el.innerHTML = s;
  return el.value;
}

function escapeHtml(s) {
  const div = document.createElement("div");
  div.textContent = s;
  return div.innerHTML;
}

function fmtTime(s) {
  s = Math.floor(s || 0);
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m + ":" + (sec < 10 ? "0" : "") + sec;
}

function applyVolumeCurve(sliderValue) {
  const normalized = sliderValue / 100;
  const curved = Math.pow(normalized, 2.5);
  return curved * 100;
}
