(function () {
  const cloud =
    document.getElementById("topic-cloud") ||
    document.getElementById("search-topic-cloud");

  const summary = document.getElementById("topic-results-summary");
  const results = document.getElementById("topic-results");

  if (!cloud) return;

  let docsCache = [];
  let topicMapCache = {};

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

  function buildTopicMap(docs) {
    const map = {};
    docs.forEach((doc) => {
      if (!doc.topic) return;
      map[doc.topic] = (map[doc.topic] || 0) + 1;
    });
    return map;
  }

  function renderStandalone(selectedTopic, docs) {
    if (!summary || !results) return;

    if (!selectedTopic) {
      summary.textContent = "토픽을 선택하세요.";
      results.innerHTML = "";
      return;
    }

    const filtered = docs.filter((doc) =>
      normalize(doc.topic) === normalize(selectedTopic)
    );

    summary.textContent = `${topicLabel(selectedTopic)} · ${filtered.length}개의 결과`;

    results.innerHTML = filtered.map((doc) => {
      const metaParts = [
        doc.section ? sectionLabel(doc.section) : "",
        doc.subcategory || "",
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

  function renderCloud(currentTopic) {
    const entries = Object.entries(topicMapCache).sort((a, b) => {
      const aActive = normalize(a[0]) === normalize(currentTopic) ? 1 : 0;
      const bActive = normalize(b[0]) === normalize(currentTopic) ? 1 : 0;

      if (bActive !== aActive) return bActive - aActive;
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });

    cloud.innerHTML = entries.map(([topic, count]) => {
      const active = normalize(topic) === normalize(currentTopic) ? " is-active" : "";
      const href = `/search/?topic=${encodeURIComponent(topic)}`;

      return `
        <a class="topic-chip${active}" href="${href}" data-topic="${escapeHtml(topic)}">
          ${escapeHtml(topicLabel(topic))} <span>${count}</span>
        </a>
      `;
    }).join("");

    cloud.querySelectorAll("[data-topic]").forEach((el) => {
      el.addEventListener("click", (e) => {
        if (window.__archiveSearch) {
          e.preventDefault();
          window.__archiveSearch.setTopic(el.dataset.topic);
        }
      });
    });
  }

  function syncWithSearchState() {
    if (!window.__archiveSearch) return;
    renderCloud(window.__archiveSearch.getCurrentTopic());
  }

  fetch("/search.json")
    .then((res) => res.json())
    .then((docs) => {
      docsCache = Array.isArray(docs) ? docs : [];
      topicMapCache = buildTopicMap(docsCache);

      const currentTopic = window.__archiveSearch
        ? window.__archiveSearch.getCurrentTopic()
        : new URL(window.location.href).searchParams.get("topic") || "";

      renderCloud(currentTopic);
      renderStandalone(currentTopic, docsCache);

      window.addEventListener("archive:search-state-change", syncWithSearchState);
    })
    .catch(() => {
      cloud.innerHTML = "";
      if (summary) summary.textContent = "";
      if (results) results.innerHTML = "";
    });
})();