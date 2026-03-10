(function () {
  const cloud =
    document.getElementById("tag-cloud") ||
    document.getElementById("search-tag-cloud");

  const summary = document.getElementById("tag-results-summary");
  const results = document.getElementById("tag-results");

  if (!cloud) return;

  let docsCache = [];
  let tagMapCache = {};

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(text) {
    return String(text || "").trim().toLowerCase();
  }

  function sectionLabel(section) {
    const map = {
      foundations: "Foundations",
      engineering: "Engineering",
      ai_systems: "AI Systems",
      research: "Research",
      projects: "Projects"
    };
    return map[section] || String(section || "");
  }

  function buildTagMap(docs) {
    const map = {};
    docs.forEach((doc) => {
      if (!Array.isArray(doc.tags)) return;
      doc.tags.forEach((tag) => {
        if (!tag) return;
        map[tag] = (map[tag] || 0) + 1;
      });
    });
    return map;
  }

  function renderStandalone(selectedTag, docs) {
    if (!summary || !results) return;

    if (!selectedTag) {
      summary.textContent = "태그를 선택하세요.";
      results.innerHTML = "";
      return;
    }

    const filtered = docs.filter((doc) =>
      Array.isArray(doc.tags) &&
      doc.tags.map(normalize).includes(normalize(selectedTag))
    );

    summary.textContent = `${selectedTag} · ${filtered.length}개의 결과`;

    results.innerHTML = filtered.map((doc) => {
      const metaParts = [
        doc.section ? sectionLabel(doc.section) : "",
        doc.subcategory || "",
        doc.topic ? String(doc.topic).replace(/-/g, " ") : "",
        doc.doc_type || ""
      ].filter(Boolean);

      return `
        <article class="search-result-item">
          <div class="search-result-heading">
            ${doc.section ? `<span class="search-section-badge">${escapeHtml(sectionLabel(doc.section))}</span>` : ""}
            <h2><a href="${doc.url}">${escapeHtml(doc.title)}</a></h2>
          </div>
          ${metaParts.length ? `<div class="search-result-meta">${metaParts.map(escapeHtml).join('<span class="search-meta-sep">·</span>')}</div>` : ""}
        </article>
      `;
    }).join("");
  }

  function renderCloud(currentTag) {
    const entries = Object.entries(tagMapCache).sort((a, b) => {
      const aActive = normalize(a[0]) === normalize(currentTag) ? 1 : 0;
      const bActive = normalize(b[0]) === normalize(currentTag) ? 1 : 0;

      if (bActive !== aActive) return bActive - aActive;
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    cloud.innerHTML = entries.map(([tag, count]) => {
      const active = normalize(tag) === normalize(currentTag) ? " is-active" : "";
      const href = `/search/?tag=${encodeURIComponent(tag)}`;

      return `
        <a class="tag-chip${active}" href="${href}" data-tag="${escapeHtml(tag)}">
          ${escapeHtml(tag)} <span>${count}</span>
        </a>
      `;
    }).join("");

    cloud.querySelectorAll("[data-tag]").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (window.__archiveSearch) {
          e.preventDefault();
          window.__archiveSearch.setTag(el.dataset.tag);
        }
      });
    });
  }

  function syncWithSearchState() {
    if (!window.__archiveSearch) return;
    renderCloud(window.__archiveSearch.getCurrentTag());
  }

  fetch("/search.json")
    .then((res) => res.json())
    .then((docs) => {
      docsCache = Array.isArray(docs) ? docs : [];
      tagMapCache = buildTagMap(docsCache);

      const currentTag = window.__archiveSearch
        ? window.__archiveSearch.getCurrentTag()
        : new URL(window.location.href).searchParams.get("tag") || "";

      renderCloud(currentTag);
      renderStandalone(currentTag, docsCache);

      window.addEventListener("archive:search-state-change", syncWithSearchState);
    })
    .catch(() => {
      cloud.innerHTML = "";
      if (summary) summary.textContent = "";
      if (results) results.innerHTML = "";
    });
})();