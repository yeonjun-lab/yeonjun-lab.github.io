(function () {
  const cloud = document.getElementById("tag-cloud");
  const summary = document.getElementById("tag-results-summary");
  const results = document.getElementById("tag-results");

  if (!cloud || !summary || !results) return;

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

  function renderDocs(tag, docs) {
    summary.textContent = tag ? `${tag} · ${docs.length}개의 문서` : "";

    if (!tag) {
      results.innerHTML = `<div class="search-empty">태그를 선택하세요.</div>`;
      return;
    }

    if (docs.length === 0) {
      results.innerHTML = `<div class="search-empty">해당 태그의 문서가 없습니다.</div>`;
      return;
    }

    results.innerHTML = docs.map(doc => {
      const meta = [
        doc.section || "",
        doc.subcategory || "",
        doc.topic || "",
        doc.doc_type || ""
      ].filter(Boolean).join(" · ");

      const tags = Array.isArray(doc.tags) && doc.tags.length
        ? `<div class="search-result-tags">${doc.tags.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>`
        : "";

      return `
        <article class="search-result-item">
          <h2><a href="${doc.url}">${escapeHtml(doc.title)}</a></h2>
          ${meta ? `<div class="search-result-meta">${escapeHtml(meta)}</div>` : ""}
          ${tags}
        </article>
      `;
    }).join("");
  }

  function renderCloud(tagMap, currentTag, docs) {
    const entries = Object.entries(tagMap).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    cloud.innerHTML = entries.map(([tag, count]) => {
      const active = normalize(tag) === normalize(currentTag) ? " is-active" : "";
      const href = `/tags/?tag=${encodeURIComponent(tag)}`;
      return `<a class="tag-chip${active}" href="${href}">${escapeHtml(tag)} <span>${count}</span></a>`;
    }).join("");
  }

  function applyTag(tag, docs, tagMap) {
    const normalizedTag = normalize(tag);
    const matched = docs
      .filter(doc => Array.isArray(doc.tags) && doc.tags.map(normalize).includes(normalizedTag))
      .sort((a, b) => String(b.sort_date || "").localeCompare(String(a.sort_date || "")));

    renderCloud(tagMap, tag, docs);
    renderDocs(tag, matched);
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

      const url = new URL(window.location.href);
      const currentTag = url.searchParams.get("tag") || "";

      renderCloud(tagMap, currentTag, docs);
      applyTag(currentTag, docs, tagMap);
    })
    .catch(() => {
      cloud.innerHTML = "";
      summary.textContent = "";
      results.innerHTML = `<div class="search-empty">태그 인덱스를 불러오지 못했습니다.</div>`;
    });
})();
