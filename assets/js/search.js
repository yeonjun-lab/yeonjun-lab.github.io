(function () {
  const input = document.getElementById("search-input");
  const summary = document.getElementById("search-summary");
  const results = document.getElementById("search-results");

  if (!input || !summary || !results) return;

  let docs = [];

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(text) {
    return String(text || "")
      .toLowerCase()
      .trim();
  }

  function makeSearchText(doc) {
    return normalize([
      doc.title,
      doc.section,
      doc.subcategory,
      doc.topic,
      doc.doc_type,
      Array.isArray(doc.tags) ? doc.tags.join(" ") : "",
      doc.content
    ].join(" "));
  }

  function scoreDoc(doc, q) {
    let score = 0;
    const title = normalize(doc.title);
    const section = normalize(doc.section);
    const subcategory = normalize(doc.subcategory);
    const topic = normalize(doc.topic);
    const docType = normalize(doc.doc_type);
    const tags = normalize(Array.isArray(doc.tags) ? doc.tags.join(" ") : "");
    const content = normalize(doc.content);

    if (title.includes(q)) score += 50;
    if (tags.includes(q)) score += 20;
    if (topic.includes(q)) score += 15;
    if (subcategory.includes(q)) score += 10;
    if (section.includes(q)) score += 8;
    if (docType.includes(q)) score += 5;
    if (content.includes(q)) score += 3;

    return score;
  }

  function makeSnippet(content, q) {
    const raw = String(content || "");
    const lower = raw.toLowerCase();
    const idx = lower.indexOf(q);

    if (idx === -1) {
      return escapeHtml(raw.slice(0, 180)) + (raw.length > 180 ? "..." : "");
    }

    const start = Math.max(0, idx - 60);
    const end = Math.min(raw.length, idx + 120);
    let snippet = raw.slice(start, end);

    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig");
    snippet = escapeHtml(snippet).replace(regex, "<mark>$1</mark>");

    if (start > 0) snippet = "..." + snippet;
    if (end < raw.length) snippet += "...";

    return snippet;
  }

  function render(items, q) {
    if (!q) {
      summary.textContent = "";
      results.innerHTML = "";
      return;
    }

    summary.textContent = `${items.length}개의 결과`;

    if (items.length === 0) {
      results.innerHTML = `<div class="search-empty">검색 결과가 없습니다.</div>`;
      return;
    }

    results.innerHTML = items.map(doc => {
      const tags = Array.isArray(doc.tags) && doc.tags.length
        ? `<div class="search-result-tags">${doc.tags.map(t => `<span>${escapeHtml(t)}</span>`).join("")}</div>`
        : "";

      const meta = [
        doc.section || "",
        doc.subcategory || "",
        doc.topic || "",
        doc.doc_type || ""
      ].filter(Boolean).map(escapeHtml).join(" · ");

      return `
        <article class="search-result-item">
          <h2><a href="${doc.url}">${escapeHtml(doc.title)}</a></h2>
          ${meta ? `<div class="search-result-meta">${meta}</div>` : ""}
          <p>${makeSnippet(doc.content, q)}</p>
          ${tags}
        </article>
      `;
    }).join("");
  }

  function runSearch() {
    const q = normalize(input.value);

    if (!q) {
      render([], "");
      return;
    }

    const matched = docs
      .map(doc => ({ ...doc, _score: scoreDoc(doc, q), _searchText: makeSearchText(doc) }))
      .filter(doc => doc._score > 0 && doc._searchText.includes(q))
      .sort((a, b) => {
        if (b._score !== a._score) return b._score - a._score;
        return String(b.sort_date || "").localeCompare(String(a.sort_date || ""));
      });

    render(matched, q);
  }

  fetch("/search.json")
    .then(res => res.json())
    .then(data => {
      docs = Array.isArray(data) ? data : [];
      input.addEventListener("input", runSearch);

      const url = new URL(window.location.href);
      const initialQ = url.searchParams.get("q");
      if (initialQ) {
        input.value = initialQ;
        runSearch();
      }
    })
    .catch(() => {
      summary.textContent = "";
      results.innerHTML = `<div class="search-empty">검색 인덱스를 불러오지 못했습니다.</div>`;
    });
})();
