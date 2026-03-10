(function () {
  const cloud =
    document.getElementById("topic-cloud") ||
    document.getElementById("search-topic-cloud");

  const summary = document.getElementById("topic-results-summary");
  const results = document.getElementById("topic-results");

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

  function topicLabel(topic) {
    return String(topic || "").replace(/-/g, " ");
  }

  function renderStandalone(selectedTopic, docs) {
    if (!summary || !results) return;

    if (!selectedTopic) {
      summary.textContent = "토픽을 선택하세요.";
      results.innerHTML = "";
      return;
    }

    const filtered = docs.filter(doc => normalize(doc.topic) === normalize(selectedTopic));
    summary.textContent = `${topicLabel(selectedTopic)} · ${filtered.length}개의 결과`;

    results.innerHTML = filtered.map(doc => `
      <article class="search-result-item">
        <h2><a href="${doc.url}">${escapeHtml(doc.title)}</a></h2>
        <p>${escapeHtml(doc.subcategory || "")}${doc.doc_type ? " · " + escapeHtml(doc.doc_type) : ""}</p>
      </article>
    `).join("");
  }

  function renderCloud(topicMap, currentTopic) {
    const entries = Object.entries(topicMap).sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    cloud.innerHTML = entries.map(([topic, count]) => {
      const active = normalize(topic) === normalize(currentTopic) ? " is-active" : "";
      const href = `/search/?topic=${encodeURIComponent(topic)}`;
      return `<a class="topic-chip${active}" href="${href}" data-topic="${escapeHtml(topic)}">${escapeHtml(topicLabel(topic))} <span>${count}</span></a>`;
    }).join("");

    cloud.querySelectorAll("[data-topic]").forEach(el => {
      el.addEventListener("click", (e) => {
        if (window.__archiveSearch) {
          e.preventDefault();
          window.__archiveSearch.setTopic(el.dataset.topic);
        }
      });
    });
  }

  fetch("/search.json")
    .then(res => res.json())
    .then(docs => {
      const topicMap = {};
      docs.forEach(doc => {
        if (!doc.topic) return;
        topicMap[doc.topic] = (topicMap[doc.topic] || 0) + 1;
      });

      const currentTopic = window.__archiveSearch
        ? window.__archiveSearch.getCurrentTopic()
        : new URL(window.location.href).searchParams.get("topic") || "";

      renderCloud(topicMap, currentTopic);
      renderStandalone(currentTopic, docs);
    })
    .catch(() => {
      cloud.innerHTML = "";
      if (summary) summary.textContent = "";
      if (results) results.innerHTML = "";
    });
})();