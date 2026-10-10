// "Rate this talk" buttons unlock when each talk starts on the event day (Florida time)
// and close at event.ratingCloses. Add ?preview=HH:MM to the URL to test any time.
(() => {
  const TZ = "America/New_York";
  const toMin = (s) => { const [h, m] = String(s).split(":").map(Number); return h * 60 + m; };
  const fmt = (s) => { let [h, m] = s.split(":").map(Number); return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`; };
  const preview = new URLSearchParams(location.search).get("preview");
  let cfg = null;

  function now() {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, min: +p.hour * 60 + +p.minute };
  }

  function refresh() {
    if (!cfg) return;
    const n = now();
    const date = preview ? cfg.date : n.date, min = preview ? toMin(preview) : n.min;
    const close = toMin(cfg.closes || "23:59");
    document.querySelectorAll(".rate-btn").forEach((b) => {
      const start = b.dataset.start;
      let open = false, label;
      if (date < cfg.date || (date === cfg.date && start && min < toMin(start))) label = `Rating opens at ${fmt(start)}`;
      else if (date > cfg.date || min >= close) label = "Rating closed";
      else { open = true; label = b.dataset.openLabel || "Rate this talk"; }
      b.textContent = label;
      if (open) { b.href = b.dataset.url; b.removeAttribute("aria-disabled"); b.removeAttribute("tabindex"); }
      else { b.removeAttribute("href"); b.setAttribute("aria-disabled", "true"); b.setAttribute("tabindex", "-1"); }
    });
  }

  window.MRFARating = {
    init(event) { cfg = { date: event.date, closes: event.ratingCloses }; refresh(); setInterval(refresh, 30000); },
    button(t, event) {
      const url = event.ratingUrl;
      return url ? `<a class="btn rate-btn" data-url="${url.replace(/"/g, "&quot;")}" data-start="${t.start || ""}" target="_blank" rel="noopener" aria-disabled="true">Rate this talk</a>` : "";
    },
    refresh,
  };
})();
