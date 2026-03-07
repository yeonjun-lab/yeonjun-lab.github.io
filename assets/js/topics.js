(function () {
  const cloud = document.getElementById("topic-cloud");
  const summary = document.getElementById("topic-results-summary");
  const results = document.getElementById("topic-results");

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

  function topicLabel(topic) {
    return String(topic || "").replace(/-/g, " ");
  }

  function renderDocs(topic, docs) {
    summary.textContent = topic ? `${topicLabel(topic)} · ${docs.length}개의 문서` : "";

    if (!topic) {
      results.innerHTML = `<div class="search-empty">토픽을 선택하세요.</div>`;
      return;
    }

    if (docs.length === 0) {
      results.innerHTML = `<div class="search-empty">해당 토픽의 문서가 없습니다.</div>`;
      return;
    }

    results.innerHTML = docs.map(doc => {
      const meta = [
        doc.section || "",
        doc.subcategory || "",
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

  function renderCloud(topicMap, currentTopic) {
    const entries = Object.entries(topicMap).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    cloud.innerHTML = entries.map(([topic, count]) => {
      const active = normalize(topic) === normalize(currentTopic) ? " is-active" : "";
      const href = `/topics/?topic=${encodeURIComponent(topic)}`;
      return `<a class="topic-chip${active}" href="${href}">${escapeHtml(topicLabel(topic))} <span>${count}</span></a>`;
    }).join("");
  }

  function applyTopic(topic, docs, topicMap) {
    const normalizedTopic = normalize(topic);
    const matched = docs
      .filter(doc => normalize(doc.topic) === normalizedTopic)
      .sort((a, b) => String(b.sort_date || "").localeCompare(String(a.sort_date || "")));

    renderCloud(topicMap, topic);
    renderDocs(topic, matched);
  }

  fetch("/search.json")
    .then(res => res.json())
    .then(docs => {
      const topicMap = {};

      docs.forEach(doc => {
        if (!doc.topic) return;
        topicMap[doc.topic] = (topicMap[doc.topic] || 0) + 1;
      });

      const url = new URL(window.location.href);
      const currentTopic = url.searchParams.get("topic") || "";

      renderCloud(topicMap, currentTopic);
      applyTopic(currentTopic, docs, topicMap);
    })
    .catch(() => {
      cloud.innerHTML = "";
      summary.textContent = "";
      results.innerHTML = `<div class="search-empty">토픽 인덱스를 불러오지 못했습니다.</div>`;
    });
})();
