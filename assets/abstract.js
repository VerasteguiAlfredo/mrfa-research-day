(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (hhmm) => {
    if (!hhmm) return "";
    let [h, m] = hhmm.split(":").map(Number);
    const ap = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ap}`;
  };
  const roman = (n) => (n === 1 ? "I" : n === 2 ? "II" : String(n));
  const clean = (n) => String(n).replace(/\(.*?\)/g, "").replace(/,.*$/, "").trim();
  const initials = (n) => clean(n).split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
  const id = new URLSearchParams(location.search).get("talk");
  const bust = `?v=${Date.now()}`;

  Promise.all([
    fetch(`data/event.json${bust}`, { cache: "no-store" }).then((r) => r.json()),
    fetch(`data/abstracts.json${bust}`, { cache: "no-store" }).then((r) => r.json()),
  ]).then(([data, abstracts]) => render(data, abstracts)).catch(() => {
    $("abs").innerHTML = `<p class="empty">This abstract couldn’t load. <a href="./#program">Go back to the program</a>.</p>`;
  });

  function render(data, abstracts) {
    const talks = data.talks || [];
    const i = talks.findIndex((t) => t.id === id);
    if (i < 0) { $("abs").innerHTML = `<p class="empty">That talk isn’t in the program. <a href="./#program">See all talks</a>.</p>`; return; }
    const t = talks[i], a = abstracts[id];
    document.title = `${t.title} | MRFA Research Day, Florida 2026`;

    // Authors: presenter (underlined) followed by co-authors, without repeating the presenter.
    const coNames = t.coauthors && t.coauthors.includes(";") ? t.coauthors.split(/;\s*/) : splitNames(t.coauthors);
    const names = [t.presenter, ...coNames.filter((n) => clean(n) !== clean(t.presenter))];
    const multi = a && a.affiliations && a.affiliations.length > 1;
    const authorsHTML = names.map((n, k) => {
      const sup = multi && a.authorAffil ? `<sup>${a.authorAffil[k] || ""}</sup>` : "";
      return k === 0 ? `<span class="presenting">${esc(n)}</span>${sup}` : `${esc(n)}${sup}`;
    }).join(", ");
    const affil = a && a.affiliations ? `<ul class="abs-affil">${a.affiliations.map((x, k) => `<li>${multi ? `<sup>${k + 1}</sup> ` : ""}${esc(x)}</li>`).join("")}</ul>` : "";

    const body = a ? a.sections.map((s) => `${s.h ? `<h2>${esc(s.h)}</h2>` : ""}${s.p.map((p) => `<p>${esc(p)}</p>`).join("")}`).join("")
      : `<p class="abs-missing">The abstract for this talk will be posted soon.</p>`;

    const q = t.questionUrl || data.event.defaultQuestionUrl || "";
    const pick = `${roman(t.session)}-${t.order} ${String(t.presenter).replace(/,.*$/, "").trim()}`;
    const prev = talks[i - 1], next = talks[i + 1];
    const navLink = (x, cls, label) => x ? `<a class="${cls}" href="abstract.html?talk=${esc(x.id)}"><small>${label}: Session ${roman(x.session)}, talk ${x.order}</small><span>${esc(clean(x.presenter))}</span></a>` : "";
    const photo = t.photo ? `<img src="${esc(t.photo)}" alt="" onerror="this.remove()">` : "";

    $("abs").innerHTML = `
      <p class="abs-meta">
        <span class="fmt ${/rapid/i.test(t.format) ? "rapid" : "full"}">${esc(t.format)}</span>
        <span>Session ${roman(t.session)}, talk ${esc(t.order)}</span>
        ${t.start ? `<span class="sep" aria-hidden="true"></span><span>${fmt(t.start)}${t.minutes ? `, ${t.minutes} min` : ""}</span>` : ""}
        ${a && a.category ? `<span class="sep" aria-hidden="true"></span><span>${esc(a.category)}</span>` : ""}
      </p>
      <h1 class="abs-title">${esc(t.title)}</h1>
      <p class="abs-authors">${authorsHTML}</p>
      ${affil}
      <p class="abs-note">Presenting author underlined.${t.pi ? ` Principal investigator: ${esc(t.pi)}.` : ""}</p>

      <div class="abs-presenter">
        <div class="initials" aria-hidden="true"><span>${esc(initials(t.presenter))}</span>${photo}</div>
        <div><strong>${esc(t.presenter)}</strong><span class="small">Presenting ${t.start ? `at ${fmt(t.start)}` : ""} in Kinne Auditorium</span></div>
      </div>

      <article class="abs-body">${body}
        ${a && a.keywords ? `<p class="abs-kw"><strong>Keywords:</strong> ${esc(a.keywords)}</p>` : ""}
      </article>

      <div class="abs-actions">
        ${q ? `<p class="pick">In the form, choose <strong>${esc(pick)}</strong></p>
               <a class="btn" href="${esc(q)}" target="_blank" rel="noopener">Ask a question</a>
               <button class="btn ghost" type="button" id="show-qr">Show QR code</button>`
            : `<span class="btn" aria-disabled="true">Questions open on the day</span>`}
        <button class="btn ghost" type="button" onclick="window.print()">Print</button>
      </div>
      <nav class="abs-nav" aria-label="Other abstracts">${navLink(prev, "prev", "Previous")}${navLink(next, "next", "Next")}</nav>`;

    const qrBtn = $("show-qr");
    if (qrBtn) qrBtn.addEventListener("click", () => {
      $("qr-sub").innerHTML = `Then choose <strong>${esc(pick)}</strong> in the form.`;
      const qr = qrcode(0, "M"); qr.addData(q); qr.make();
      $("qr-big").innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
      $("qr-dialog").showModal();
    });
  }

  // Comma-separated author list, where credentials like "MD" also follow commas.
  function splitNames(s) {
    if (!s) return [];
    const parts = s.split(/,\s*/), out = [];
    for (const p of parts) {
      if (/^(MD|PhD|DO|MBBS|MBChB|MPH|MS|MSc|RN|PharmD|DNP|BS|BA|LP|ABPP-CN)\.?$/i.test(p) && out.length) out[out.length - 1] += ", " + p;
      else out.push(p);
    }
    return out;
  }
})();
