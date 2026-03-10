(function () {
  const input = document.getElementById("search-input");
  const summary = document.getElementById("search-summary");
  const results = document.getElementById("search-results");

  if (!input || !summary || !results) return;

  let docs = [];
  let currentTag = "";
  let currentTopic = "";

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalize(text) {
    return String(text || "").toLowerCase().trim();
  }

  function topicLabel(topic) {
    return String(topic || "").replace(/-/g, " ");
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
    if (!q) {
      return escapeHtml(raw.slice(0, 180)) + (raw.length > 180 ? "..." : "");
    }

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

  function render(items, q, tag, topic) {
    const filters = [];
    if (q) filters.push(`검색어: ${q}`);
    if (tag) filters.push(`태그: ${tag}`);
    if (topic) filters.push(`토픽: ${topicLabel(topic)}`);

    summary.textContent = filters.length
      ? `${filters.join(" / ")} · ${items.length}개의 결과`
      : "";

    if (!q && !tag && !topic) {
      results.innerHTML = `<div class="search-empty">검색어를 입력하거나 태그 또는 토픽을 선택하세요.</div>`;
      return;
    }

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
        doc.topic ? topicLabel(doc.topic) : "",
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

  function applyFilters() {
    const q = normalize(input.value);

    const matched = docs
      .map(doc => ({ ...doc, _score: scoreDoc(doc, q), _searchText: makeSearchText(doc) }))
      .filter(doc => {
        const byQ = !q || (doc._score > 0 && doc._searchText.includes(q));
        const byTag = !currentTag || (Array.isArray(doc.tags) && doc.tags.map(normalize).includes(normalize(currentTag)));
        const byTopic = !currentTopic || normalize(doc.topic) === normalize(currentTopic);
        return byQ && byTag && byTopic;
      })
      .sort((a, b) => {
        if (q && b._score !== a._score) return b._score - a._score;
        return String(b.sort_date || "").localeCompare(String(a.sort_date || ""));
      });

    render(matched, q, currentTag, currentTopic);

    const url = new URL(window.location.href);
    if (q) url.searchParams.set("q", q); else url.searchParams.delete("q");
    if (currentTag) url.searchParams.set("tag", currentTag); else url.searchParams.delete("tag");
    if (currentTopic) url.searchParams.set("topic", currentTopic); else url.searchParams.delete("topic");
    history.replaceState({}, "", url);
  }

  fetch("/search.json")
    .then(res => res.json())
    .then(data => {
      docs = Array.isArray(data) ? data : [];

      const url = new URL(window.location.href);
      const initialQ = url.searchParams.get("q") || "";
      currentTag = url.searchParams.get("tag") || "";
      currentTopic = url.searchParams.get("topic") || "";

      input.value = initialQ;
      input.addEventListener("input", applyFilters);

      window.__archiveSearch = {
        docs,
        getCurrentTag: () => currentTag,
        getCurrentTopic: () => currentTopic,
        setTag(tag) {
          currentTag = tag || "";
          applyFilters();
        },
        setTopic(topic) {
          currentTopic = topic || "";
          applyFilters();
        }
      };

      applyFilters();
    })
    .catch(() => {
      summary.textContent = "";
      results.innerHTML = `<div class="search-empty">검색 인덱스를 불러오지 못했습니다.</div>`;
    });
})();