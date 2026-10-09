// Theme: "auto" follows the device; the button cycles Auto -> Light -> Dark.
(() => {
  const KEY = "mrfa-theme";
  const root = document.documentElement;
  let mode = "auto";
  try { mode = localStorage.getItem(KEY) || "auto"; } catch (e) {}
  const apply = (m) => {
    mode = m;
    if (m === "auto") root.removeAttribute("data-theme"); else root.setAttribute("data-theme", m);
    const btn = document.getElementById("theme-btn");
    if (btn) {
      const label = { auto: "Auto", light: "Light", dark: "Dark" }[m];
      btn.querySelector(".theme-label").textContent = label;
      btn.setAttribute("aria-label", `Theme: ${label}. Tap to change.`);
      btn.dataset.mode = m;
    }
  };
  apply(mode);
  document.addEventListener("DOMContentLoaded", () => {
    apply(mode);
    const btn = document.getElementById("theme-btn");
    if (!btn) return;
    btn.addEventListener("click", () => {
      const next = { auto: "light", light: "dark", dark: "auto" }[mode];
      apply(next);
      try { next === "auto" ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, next); } catch (e) {}
    });
  });
})();
