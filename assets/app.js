(() => {
  const TZ = "America/New_York";
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const toMin = (hhmm) => { const [h, m] = String(hhmm).split(":").map(Number); return h * 60 + m; };
  const fmt = (hhmm) => {
    if (!hhmm) return "";
    let [h, m] = hhmm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    h = h % 12 || 12;
    return `${h}:${String(m).padStart(2, "0")}`+ ` ${ap}`;
  };
  const initials = (name) => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();

  // Current date and minutes-of-day in the event's time zone.
  function nowInTZ() {
    const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23"
    }).formatToParts(new Date()).map((p) => [p.type, p.value]));
    return { date: `${parts.year}-${parts.month}-${parts.day}`, min: Number(parts.hour) * 60 + Number(parts.minute) };
  }
  // ?preview=10:15 lets organizers check how the "Now" view looks before the day.
  const preview = new URLSearchParams(location.search).get("preview");

  let data, talksById = {};

  fetch(`data/event.json?v=${Date.now()}`, { cache: "no-store" })
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then((d) => { data = d; render(); tick(); setInterval(tick, 30000); })
    .catch(() => {
      $("run").innerHTML = `<li class="empty">The program couldn’t load. Check that data/event.json is valid JSON (a missing comma is the usual cause), then refresh.</li>`;
    });

  function questionUrl(t) { return t.questionUrl || data.event.defaultQuestionUrl || ""; }

  function actionsHTML(t) {
    const url = questionUrl(t);
    if (!url) return `<div class="actions"><span class="btn" aria-disabled="true">Questions open on the day</span></div>`;
    return `<div class="actions">
      <a class="btn" href="${esc(url)}" target="_blank" rel="noopener">Ask a question</a>
      <button class="btn ghost" type="button" data-qr="${esc(t.id)}">Show QR code</button>
    </div>`;
  }

  function render() {
    const e = data.event;
    document.title = `${e.name} ${e.edition || ""}`.trim();
    $("host").textContent = e.host || "";
    $("event-name").innerHTML = `${esc(e.name)}${e.edition ? ` <span class="yr">${esc(e.edition)}</span>` : ""}`;
    $("event-date").textContent = e.dateLabel || e.date;
    $("event-time").textContent = e.timeLabel || "";
    const place = [e.location, e.room].filter(Boolean).join(", ");
    $("event-place").innerHTML = e.mapUrl ? `<a href="${esc(e.mapUrl)}" style="color:inherit">${esc(place)}</a>` : esc(place);
    $("event-intro").textContent = e.intro || "";
    if (e.notice) { $("event-notice").textContent = e.notice; $("event-notice").hidden = false; }
    $("foot-host").textContent = `${e.name} ${e.edition || ""} · ${e.host || ""}`.trim();

    (data.talks || []).forEach((t) => (talksById[t.id] = t));

    // Program
    $("run").innerHTML = (data.agenda || []).map((s, i) => {
      const talks = (s.talks || []).map((id) => talksById[id]).filter(Boolean);
      const meta = s.moderator ? `Moderator: ${esc(s.moderator)}` : esc(s.who || "");
      return `<li class="slot ${esc(s.type || "")}" data-i="${i}" data-start="${esc(s.start)}" data-end="${esc(s.end)}">
        <div class="time">${fmt(s.start)}<small>${fmt(s.end)}</small></div>
        <div class="slot-body">
          <div class="slot-title">${esc(s.title)}<span class="now-label" hidden>Now</span></div>
          ${meta ? `<div class="slot-meta">${meta}</div>` : ""}
          ${talks.length ? `<ul class="talks">${talks.map(talkHTML).join("")}</ul>` : ""}
        </div>
      </li>`;
    }).join("");

    // Speakers
    const cats = [...new Set((data.talks || []).map((t) => t.category).filter(Boolean))];
    $("talk-filters").innerHTML = ["All", ...cats].map((c, i) =>
      `<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`).join("");
    renderSpeakers("All");

    // Posters
    renderPosters("");

    // Info
    if ((data.judges || []).length) {
      $("judges-wrap").hidden = false;
      $("judge-list").innerHTML = data.judges.map((j) => `<li>${esc(j)}</li>`).join("");
    }
    $("faq").innerHTML = (data.info || []).map((f) => `<dt>${esc(f.q)}</dt><dd>${esc(f.a)}</dd>`).join("");
    if (e.contactEmail) $("faq").innerHTML += `<dt>Email</dt><dd><a href="mailto:${esc(e.contactEmail)}">${esc(e.contactEmail)}</a></dd>`;
    makeQR($("site-qr"), location.href.split("#")[0].split("?")[0], 112);
  }

  function talkHTML(t) {
    return `<li><details class="talk" id="talk-${esc(t.id)}" data-start="${esc(t.start)}">
      <summary>
        <span class="talk-time">${fmt(t.start)}</span>
        <span><span class="talk-title">${esc(t.title)}</span><br><span class="talk-who">${esc(t.presenter)}</span></span>
        <svg class="chev" viewBox="0 0 20 20" aria-hidden="true"><path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </summary>
      <div class="talk-detail">
        <dl>
          <dt>Presenter</dt><dd>${esc(t.presenter)}</dd>
          ${t.lab ? `<dt>Lab</dt><dd>${esc(t.lab)}</dd>` : ""}
          ${t.department ? `<dt>Department</dt><dd>${esc(t.department)}</dd>` : ""}
          ${t.category ? `<dt>Category</dt><dd>${esc(t.category)}</dd>` : ""}
        </dl>
        ${actionsHTML(t)}
      </div>
    </details></li>`;
  }

  function renderSpeakers(cat) {
    const list = (data.talks || []).filter((t) => cat === "All" || t.category === cat);
    $("speaker-list").innerHTML = list.map((t) => `<li class="speaker">
      <div class="initials" aria-hidden="true">${esc(initials(t.presenter))}</div>
      <div>
        <h3>${esc(t.presenter)}</h3>
        <p class="aff">${esc([t.lab, t.department].filter(Boolean).join(", "))}</p>
        <p class="ttl">${esc(t.title)}</p>
        <p class="when">${esc(t.category || "")}${t.start ? `, <a href="#talk-${esc(t.id)}" data-open="${esc(t.id)}">${fmt(t.start)}</a>` : ""}</p>
        ${actionsHTML(t)}
      </div>
    </li>`).join("");
  }

  function renderPosters(q) {
    q = q.trim().toLowerCase();
    const list = (data.posters || []).filter((p) => !q || [p.number, p.presenter, p.title, p.category].join(" ").toLowerCase().includes(q));
    $("poster-list").innerHTML = list.map((p) => `<li class="poster">
      <span class="pnum">${esc(p.number)}</span>
      <div><div class="ttl">${esc(p.title)}</div><div class="who">${esc(p.presenter)}${p.category ? `, ${esc(p.category)}` : ""}</div></div>
    </li>`).join("");
    $("poster-empty").hidden = list.length > 0;
  }

  function makeQR(el, text, size) {
    el.innerHTML = "";
    if (window.QRCode) new QRCode(el, { text, width: size * 2, height: size * 2, correctLevel: QRCode.CorrectLevel.M });
  }

  // Live "now / next"
  function tick() {
    if (!data) return;
    const n = nowInTZ();
    const isDay = preview || n.date === data.event.date;
    const min = preview ? toMin(preview) : n.min;
    const slots = [...document.querySelectorAll(".slot")];
    let cur = null, next = null;
    slots.forEach((el) => {
      const s = toMin(el.dataset.start), e = toMin(el.dataset.end);
      const isNow = isDay && min >= s && min < e;
      el.classList.toggle("now", isNow);
      el.classList.toggle("past", isDay && min >= e);
      el.querySelector(".now-label").hidden = !isNow;
      if (isNow) cur = el;
      if (isDay && !next && s > min) next = el;
    });
    // Live talk inside a session
    document.querySelectorAll(".talk").forEach((t) => t.classList.remove("live"));
    let liveTalk = null;
    if (cur) {
      const talks = [...cur.querySelectorAll(".talk")];
      talks.forEach((t, i) => {
        const s = toMin(t.dataset.start);
        const e = talks[i + 1] ? toMin(talks[i + 1].dataset.start) : toMin(cur.dataset.end);
        if (min >= s && min < e) { t.classList.add("live"); liveTalk = t; }
      });
    }
    const bar = $("nowbar");
    bar.hidden = !isDay || (!cur && !next);
    if (!bar.hidden) {
      const title = (el) => el ? el.querySelector(".slot-title").firstChild.textContent : "";
      $("now-text").textContent = liveTalk ? liveTalk.querySelector(".talk-who").textContent + ": " + liveTalk.querySelector(".talk-title").textContent : (cur ? title(cur) : "Not started yet");
      $("next-text").textContent = next ? `${fmt(next.dataset.start)} ${title(next)}` : "That’s the last item";
    }
  }

  // Events
  document.addEventListener("click", (ev) => {
    const chip = ev.target.closest(".chip");
    if (chip) {
      document.querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", c === chip));
      renderSpeakers(chip.dataset.cat);
      return;
    }
    const qrBtn = ev.target.closest("[data-qr]");
    if (qrBtn) {
      const t = talksById[qrBtn.dataset.qr];
      $("qr-sub").textContent = `${t.presenter}: ${t.title}`;
      makeQR($("qr-big"), questionUrl(t), 280);
      $("qr-dialog").showModal();
      return;
    }
    const open = ev.target.closest("[data-open]");
    if (open) { const d = $("talk-" + open.dataset.open); if (d) d.open = true; }
  });
  $("poster-search").addEventListener("input", (e) => renderPosters(e.target.value));

  // Highlight the tab for the section in view
  const tabs = [...document.querySelectorAll(".tabs a")];
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) tabs.forEach((a) => a.setAttribute("aria-current", a.getAttribute("href") === "#" + en.target.id));
    });
  }, { rootMargin: "-40% 0px -55% 0px" });
  document.querySelectorAll("main section").forEach((s) => io.observe(s));
})();
