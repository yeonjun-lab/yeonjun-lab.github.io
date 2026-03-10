(function () {
  const input = document.getElementById("search-input");
  const summary = document.getElementById("search-summary");
  const results = document.getElementById("search-results");
  const activeFilters = document.getElementById("search-active-filters");
  const resetButton = document.getElementById("search-reset");
  const mode = document.getElementById("search-mode");
  const discoverySummary = document.getElementById("search-discovery-summary");
  const discoveryPanel = document.querySelector(".search-discovery");

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

  function buildSearchText(doc) {
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
    if (!q) return 0;

    let score = 0;
    const title = normalize(doc.title);
    const section = normalize(doc.section);
    const subcategory = normalize(doc.subcategory);
    const topic = normalize(doc.topic);
    const docType = normalize(doc.doc_type);
    const tags = normalize(Array.isArray(doc.tags) ? doc.tags.join(" ") : "");
    const content = normalize(doc.content);

    if (title.includes(q)) score += 60;
    if (tags.includes(q)) score += 22;
    if (topic.includes(q)) score += 16;
    if (subcategory.includes(q)) score += 10;
    if (section.includes(q)) score += 8;
    if (docType.includes(q)) score += 5;
    if (content.includes(q)) score += 3;

    return score;
  }

  function makeSnippet(content, q) {
    const raw = String(content || "").trim();
    if (!raw) return "";

    if (!q) {
      const base = raw.slice(0, 180);
      return escapeHtml(base) + (raw.length > 180 ? "..." : "");
    }

    const lower = raw.toLowerCase();
    const idx = lower.indexOf(q);

    if (idx === -1) {
      const base = raw.slice(0, 180);
      return escapeHtml(base) + (raw.length > 180 ? "..." : "");
    }

    const start = Math.max(0, idx - 60);
    const end = Math.min(raw.length, idx + 120);
    let snippet = raw.slice(start, end);

    const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQ})`, "ig");
    snippet = escapeHtml(snippet).replace(regex, "<mark>$1</mark>");

    if (start > 0) snippet = "..." + snippet;
    if (end < raw.length) snippet += "...";

    return snippet;
  }

  function updateUrl(q, tag, topic) {
    const url = new URL(window.location.href);

    if (q) url.searchParams.set("q", q);
    else url.searchParams.delete("q");

    if (tag) url.searchParams.set("tag", tag);
    else url.searchParams.delete("tag");

    if (topic) url.searchParams.set("topic", topic);
    else url.searchParams.delete("topic");

    history.replaceState({}, "", url);
  }

  function renderActiveFilters(q, tag, topic) {
    if (!activeFilters) return;

    const chips = [];

    if (q) {
      chips.push(`
        <button type="button" class="active-filter-chip" data-clear="q">
          검색어: ${escapeHtml(q)} ×
        </button>
      `);
    }

    if (tag) {
      chips.push(`
        <button type="button" class="active-filter-chip" data-clear="tag">
          태그: ${escapeHtml(tag)} ×
        </button>
      `);
    }

    if (topic) {
      chips.push(`
        <button type="button" class="active-filter-chip" data-clear="topic">
          토픽: ${escapeHtml(topicLabel(topic))} ×
        </button>
      `);
    }

    activeFilters.innerHTML = chips.join("");

    activeFilters.querySelectorAll("[data-clear]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.clear;

        if (key === "q") input.value = "";
        if (key === "tag") currentTag = "";
        if (key === "topic") currentTopic = "";

        applyFilters();
      });
    });
  }

  function updateResetButton(q, tag, topic) {
    if (!resetButton) return;
    resetButton.disabled = !(q || tag || topic);
  }

  function renderMode(q, tag, topic) {
    if (!mode) return;

    if (q) {
      mode.innerHTML = `<span class="search-mode-badge">검색 모드</span>`;
      return;
    }

    if (tag) {
      mode.innerHTML = `<span class="search-mode-badge">태그 탐색 모드</span>`;
      return;
    }

    if (topic) {
      mode.innerHTML = `<span class="search-mode-badge">토픽 탐색 모드</span>`;
      return;
    }

    mode.innerHTML = "";
  }

  function renderDiscoverySummary(q, tag, topic) {
    if (!discoverySummary) return;

    if (q) {
      discoverySummary.textContent = "태그 또는 토픽으로 전환";
      return;
    }

    if (tag) {
      discoverySummary.textContent = "태그 변경 / 토픽 탐색";
      return;
    }

    if (topic) {
      discoverySummary.textContent = "토픽 변경 / 태그 탐색";
      return;
    }

    discoverySummary.textContent = "Tags / Topics 탐색";
  }

  function syncDiscoveryPanel(q, tag, topic) {
    if (!discoveryPanel) return;

    if (window.innerWidth <= 900) {
      discoveryPanel.open = false;
      return;
    }

    if (tag || topic) {
      discoveryPanel.open = true;
      return;
    }

    if (q) {
      discoveryPanel.open = false;
      return;
    }

    discoveryPanel.open = false;
  }

  function bindResultInteractions() {
    results.querySelectorAll("[data-result-tag]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.__archiveSearch) {
          window.__archiveSearch.setTag(btn.dataset.resultTag);
        }
      });
    });

    results.querySelectorAll("[data-result-topic]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (window.__archiveSearch) {
          window.__archiveSearch.setTopic(btn.dataset.resultTopic);
        }
      });
    });
  }

  function renderRecommendedDocs() {
    const recommended = [...docs]
      .sort((a, b) => String(b.sort_date || "").localeCompare(String(a.sort_date || "")))
      .slice(0, 3);

    if (recommended.length === 0) {
      results.innerHTML = `<div class="search-empty">검색어를 입력하거나 태그 또는 토픽을 선택하세요.</div>`;
      return;
    }

    results.innerHTML = `
      <div class="search-recommended">
        <div class="search-recommended-header">최근 문서</div>
        <div class="search-recommended-list">
          ${recommended.map((doc) => {
            const metaHtmlParts = [];

            if (doc.subcategory) {
              metaHtmlParts.push(`<span>${escapeHtml(doc.subcategory)}</span>`);
            }

            if (doc.topic) {
              metaHtmlParts.push(`
                <button
                  type="button"
                  class="search-result-topic-button"
                  data-result-topic="${escapeHtml(doc.topic)}"
                >
                  ${escapeHtml(topicLabel(doc.topic))}
                </button>
              `);
            }

            if (doc.doc_type) {
              metaHtmlParts.push(`<span>${escapeHtml(doc.doc_type)}</span>`);
            }

            const tagsHtml = Array.isArray(doc.tags) && doc.tags.length
              ? `
                <div class="search-result-tags">
                  ${doc.tags.map((t) => `
                    <button
                      type="button"
                      class="search-result-tag-button"
                      data-result-tag="${escapeHtml(t)}"
                    >
                      ${escapeHtml(t)}
                    </button>
                  `).join("")}
                </div>
              `
              : "";

            return `
              <article class="search-recommended-item">
                <div class="search-result-heading">
                  ${doc.section ? `<span class="search-section-badge">${escapeHtml(sectionLabel(doc.section))}</span>` : ""}
                  <h2><a href="${doc.url}">${escapeHtml(doc.title)}</a></h2>
                </div>
                ${metaHtmlParts.length ? `<div class="search-result-meta">${metaHtmlParts.join('<span class="search-meta-sep">·</span>')}</div>` : ""}
                <p>${makeSnippet(doc.content, "")}</p>
                ${tagsHtml}
              </article>
            `;
          }).join("")}
        </div>
      </div>
    `;

    bindResultInteractions();
  }

  function render(items, q, tag, topic) {
    const filters = [];
    if (q) filters.push(`검색어: ${q}`);
    if (tag) filters.push(`태그: ${tag}`);
    if (topic) filters.push(`토픽: ${topicLabel(topic)}`);

    if (!q && !tag && !topic) {
      summary.textContent = "최근 문서를 먼저 둘러볼 수 있습니다.";
      renderActiveFilters("", "", "");
      updateResetButton("", "", "");
      renderMode("", "", "");
      renderDiscoverySummary("", "", "");
      syncDiscoveryPanel("", "", "");
      renderRecommendedDocs();
      return;
    }

    summary.textContent = `${filters.join(" / ")} · ${items.length}개의 결과`;
    renderActiveFilters(q, tag, topic);
    updateResetButton(q, tag, topic);
    renderMode(q, tag, topic);
    renderDiscoverySummary(q, tag, topic);
    syncDiscoveryPanel(q, tag, topic);

    if (items.length === 0) {
      results.innerHTML = `<div class="search-empty">검색 결과가 없습니다.</div>`;
      return;
    }

    results.innerHTML = items.map((doc) => {
      const metaHtmlParts = [];

      if (doc.subcategory) {
        metaHtmlParts.push(`<span>${escapeHtml(doc.subcategory)}</span>`);
      }

      if (doc.topic) {
        metaHtmlParts.push(`
          <button
            type="button"
            class="search-result-topic-button"
            data-result-topic="${escapeHtml(doc.topic)}"
          >
            ${escapeHtml(topicLabel(doc.topic))}
          </button>
        `);
      }

      if (doc.doc_type) {
        metaHtmlParts.push(`<span>${escapeHtml(doc.doc_type)}</span>`);
      }

      const tagsHtml = Array.isArray(doc.tags) && doc.tags.length
        ? `
          <div class="search-result-tags">
            ${doc.tags.map((t) => `
              <button
                type="button"
                class="search-result-tag-button"
                data-result-tag="${escapeHtml(t)}"
              >
                ${escapeHtml(t)}
              </button>
            `).join("")}
          </div>
        `
        : "";

      return `
        <article class="search-result-item">
          <div class="search-result-heading">
            ${doc.section ? `<span class="search-section-badge">${escapeHtml(sectionLabel(doc.section))}</span>` : ""}
            <h2><a href="${doc.url}">${escapeHtml(doc.title)}</a></h2>
          </div>
          ${metaHtmlParts.length ? `<div class="search-result-meta">${metaHtmlParts.join('<span class="search-meta-sep">·</span>')}</div>` : ""}
          <p>${makeSnippet(doc.content, q)}</p>
          ${tagsHtml}
        </article>
      `;
    }).join("");

    bindResultInteractions();
  }

  function applyFilters() {
    const q = normalize(input.value);

    const matched = docs
      .map((doc) => ({
        ...doc,
        _score: scoreDoc(doc, q),
        _searchText: buildSearchText(doc)
      }))
      .filter((doc) => {
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
    updateUrl(q, currentTag, currentTopic);
    window.dispatchEvent(new CustomEvent("archive:search-state-change"));
  }

  function setSearchMode() {
    currentTag = "";
    currentTopic = "";
  }

  function setTagMode(tag) {
    input.value = "";
    currentTopic = "";
    currentTag = tag || "";
  }

  function setTopicMode(topic) {
    input.value = "";
    currentTag = "";
    currentTopic = topic || "";
  }

  fetch("/search.json")
    .then((res) => res.json())
    .then((data) => {
      docs = Array.isArray(data) ? data : [];

      const url = new URL(window.location.href);
      const initialQ = url.searchParams.get("q") || "";
      const initialTag = url.searchParams.get("tag") || "";
      const initialTopic = url.searchParams.get("topic") || "";

      if (initialQ) {
        input.value = initialQ;
      } else if (initialTag) {
        currentTag = initialTag;
      } else if (initialTopic) {
        currentTopic = initialTopic;
      }

      input.addEventListener("input", () => {
        setSearchMode();
        applyFilters();
      });

      if (resetButton) {
        resetButton.addEventListener("click", () => {
          if (window.__archiveSearch) {
            window.__archiveSearch.clearAll();
          }
        });
      }

      window.__archiveSearch = {
        docs,
        getCurrentTag: () => currentTag,
        getCurrentTopic: () => currentTopic,
        setTag(tag) {
          setTagMode(tag);
          applyFilters();
        },
        setTopic(topic) {
          setTopicMode(topic);
          applyFilters();
        },
        clearAll() {
          input.value = "";
          currentTag = "";
          currentTopic = "";
          applyFilters();
        }
      };

      applyFilters();
    })
    .catch(() => {
      summary.textContent = "";
      results.innerHTML = `<div class="search-empty">검색 인덱스를 불러오지 못했습니다.</div>`;
      renderActiveFilters("", "", "");
      updateResetButton("", "", "");
      renderMode("", "", "");
      renderDiscoverySummary("", "", "");
      syncDiscoveryPanel("", "", "");
    });
})();