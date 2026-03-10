(function () {
  const cloud =
    document.getElementById("tag-cloud") ||
    document.getElementById("search-tag-cloud");

  const summary = document.getElementById("tag-results-summary");
  const results = document.getElementById("tag-results");

  if (!cloud) return;

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

  function renderStandalone(selectedTag, docs) {
    if (!summary || !results) return;

    if (!selectedTag) {
      summary.textContent = "태그를 선택하세요.";
      results.innerHTML = "";
      return;
    }

    const filtered = docs.filter(doc =>
      Array.isArray(doc.tags) && doc.tags.map(normalize).includes(normalize(selectedTag))
    );

    summary.textContent = `${selectedTag} · ${filtered.length}개의 결과`;

    results.innerHTML = filtered.map(doc => `
      <article class="search-result-item">
        <h2><a href="${doc.url}">${escapeHtml(doc.title)}</a></h2>
        <p>${escapeHtml(doc.subcategory || "")}${doc.topic ? " · " + escapeHtml(doc.topic) : ""}${doc.doc_type ? " · " + escapeHtml(doc.doc_type) : ""}</p>
      </article>
    `).join("");
  }

  function renderCloud(tagMap, currentTag) {
    const entries = Object.entries(tagMap).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    cloud.innerHTML = entries.map(([tag, count]) => {
      const active = normalize(tag) === normalize(currentTag) ? " is-active" : "";
      const href = `/search/?tag=${encodeURIComponent(tag)}`;
      return `<a class="tag-chip${active}" href="${href}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)} <span>${count}</span></a>`;
    }).join("");

    cloud.querySelectorAll("[data-tag]").forEach(el => {
      el.addEventListener("click", (e) => {
        if (window.__archiveSearch) {
          e.preventDefault();
          window.__archiveSearch.setTag(el.dataset.tag);
        }
      });
    });
  }

  fetch("/search.json")
    .then(res => res.json())
    .then(docs => {
      const tagMap = {};
      docs.forEach(doc => {
        if (!Array.isArray(doc.tags)) return;
        doc.tags.forEach(tag => {
          if (!tag) return;
          tagMap[tag] = (tagMap[tag] || 0) + 1;
        });
      });

      const currentTag = window.__archiveSearch
        ? window.__archiveSearch.getCurrentTag()
        : new URL(window.location.href).searchParams.get("tag") || "";

      renderCloud(tagMap, currentTag);
      renderStandalone(currentTag, docs);
    })
    .catch(() => {
      cloud.innerHTML = "";
      if (summary) summary.textContent = "";
      if (results) results.innerHTML = "";
    });
})();