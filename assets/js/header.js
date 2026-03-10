(function () {

    const HEADER_CONFIG = window.__HEADER_CONFIG__ || {
        searchPage: "/search/",
        searchJson: "/search.json"
    };

    const root = document.documentElement;
    const themeToggle = document.getElementById("site-theme-toggle");

    const toggle = document.querySelector(".site-menu-toggle");
    const nav = document.getElementById("site-nav-panel");
    const header = document.querySelector(".site-header");

    const quickSearch = document.getElementById("quick-search");
    const quickSearchInput = document.getElementById("quick-search-input");
    const quickSearchForm = document.getElementById("quick-search-form");
    const quickSearchMeta = document.getElementById("quick-search-meta");
    const quickSearchResults = document.getElementById("quick-search-results");
    const quickSearchOpeners = document.querySelectorAll("[data-open-quick-search]");
    const quickSearchClosers = document.querySelectorAll("[data-quick-search-close]");

    let quickDocs = [];
    let activeIndex = -1;

    try {
        const savedTheme = localStorage.getItem("site-theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const theme = savedTheme || (prefersDark ? "dark" : "light");
        document.documentElement.setAttribute("data-theme", theme);
    } catch (e) {
    }

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
            const base = raw.slice(0, 120);
            return escapeHtml(base) + (raw.length > 120 ? "..." : "");
        }

        const lower = raw.toLowerCase();
        const idx = lower.indexOf(q);

        if (idx === -1) {
            const base = raw.slice(0, 120);
            return escapeHtml(base) + (raw.length > 120 ? "..." : "");
        }

        const start = Math.max(0, idx - 40);
        const end = Math.min(raw.length, idx + 90);
        let snippet = raw.slice(start, end);
        const escapedQ = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`(${escapedQ})`, "ig");

        snippet = escapeHtml(snippet).replace(regex, "<mark>$1</mark>");
        if (start > 0) snippet = "..." + snippet;
        if (end < raw.length) snippet += "...";
        return snippet;
    }

    function applyTheme(theme) {
        root.setAttribute("data-theme", theme);
        localStorage.setItem("site-theme", theme);
    }

    function initTheme() {
        const savedTheme = localStorage.getItem("site-theme");
        if (savedTheme === "dark" || savedTheme === "light") {
            applyTheme(savedTheme);
            return;
        }

        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        applyTheme(prefersDark ? "dark" : "light");
    }

    initTheme();

    if (themeToggle) {
        themeToggle.addEventListener("click", () => {
            const current = root.getAttribute("data-theme") || "light";
            applyTheme(current === "dark" ? "light" : "dark");
        });
    }

    function openMenu() {
        if (!toggle || !nav) return;
        toggle.setAttribute("aria-expanded", "true");
        nav.classList.add("is-open");
        document.body.classList.add("nav-open");
    }

    function closeMenu() {
        if (!toggle || !nav) return;
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        document.body.classList.remove("nav-open");
    }

    function openQuickSearch(initialValue = "") {
        if (!quickSearch || !quickSearchInput) return;
        quickSearch.setAttribute("aria-hidden", "false");
        document.body.classList.add("quick-search-open");
        quickSearchInput.value = initialValue;
        renderQuickResults();
        requestAnimationFrame(() => quickSearchInput.focus());
    }

    function closeQuickSearch() {
        if (!quickSearch) return;
        quickSearch.setAttribute("aria-hidden", "true");
        document.body.classList.remove("quick-search-open");
        activeIndex = -1;
    }

    function getFilteredDocs() {
        const q = normalize(quickSearchInput.value);
        const docs = [...quickDocs];

        if (!q) {
            return docs
                .sort((a, b) => String(b.sort_date || "").localeCompare(String(a.sort_date || "")))
                .slice(0, 6);
        }

        return docs
            .map((doc) => ({
                ...doc,
                _score: scoreDoc(doc, q),
                _searchText: buildSearchText(doc)
            }))
            .filter((doc) => doc._score > 0 && doc._searchText.includes(q))
            .sort((a, b) => {
                if (b._score !== a._score) return b._score - a._score;
                return String(b.sort_date || "").localeCompare(String(a.sort_date || ""));
            })
            .slice(0, 8);
    }

    function renderQuickResults() {
        if (!quickSearchResults || !quickSearchMeta) return;

        const q = normalize(quickSearchInput.value);
        const items = getFilteredDocs();

        if (!q) {
            quickSearchMeta.textContent = "최근 문서 · 방향키로 이동 · Enter로 열기";
        } else {
            quickSearchMeta.textContent = `${items.length}개의 결과 · 방향키로 이동 · Enter로 열기`;
        }

        if (!items.length) {
            quickSearchResults.innerHTML = `<div class="quick-search-results__empty">검색 결과가 없습니다.</div>`;
            activeIndex = -1;
            return;
        }

        if (activeIndex >= items.length) activeIndex = items.length - 1;

        quickSearchResults.innerHTML = items.map((doc, index) => {
            const activeClass = index === activeIndex ? " is-active" : "";
            const meta = [
                doc.section ? sectionLabel(doc.section) : "",
                doc.subcategory || "",
                doc.topic ? topicLabel(doc.topic) : "",
                doc.doc_type || ""
            ].filter(Boolean).map(escapeHtml).join(" · ");

            return `
        <a
          class="quick-search-item${activeClass}"
          href="${doc.url}"
          data-index="${index}"
        >
          <div class="quick-search-item__top">
            ${doc.section ? `<span class="quick-search-item__badge">${escapeHtml(sectionLabel(doc.section))}</span>` : ""}
            <strong>${escapeHtml(doc.title)}</strong>
          </div>
          ${meta ? `<div class="quick-search-item__meta">${meta}</div>` : ""}
          <div class="quick-search-item__snippet">${makeSnippet(doc.content, q)}</div>
        </a>
      `;
        }).join("");

        quickSearchResults.querySelectorAll(".quick-search-item").forEach((el) => {
            el.addEventListener("mouseenter", () => {
                activeIndex = Number(el.dataset.index);
                quickSearchResults.querySelectorAll(".quick-search-item").forEach((item) => {
                    item.classList.toggle(
                        "is-active",
                        Number(item.dataset.index) === activeIndex
                    );
                });
            });
        });
    }

    function goToActiveResult() {
        const items = getFilteredDocs();
        if (!items.length) {
            const q = quickSearchInput.value.trim();
            const target = q
              ? `${HEADER_CONFIG.searchPage}?q=${encodeURIComponent(q)}`
              : HEADER_CONFIG.searchPage;
            window.location.href = target;
            return;
        }

        const index = activeIndex >= 0 ? activeIndex : 0;
        window.location.href = items[index].url;
    }

    if (toggle && nav) {
        toggle.addEventListener("click", () => {
            const expanded = toggle.getAttribute("aria-expanded") === "true";
            expanded ? closeMenu() : openMenu();
        });

        document.addEventListener("click", (e) => {
            if (!nav.classList.contains("is-open")) return;

            const clickedInside =
                nav.contains(e.target) ||
                toggle.contains(e.target) ||
                header.contains(e.target);

            if (!clickedInside) closeMenu();
        });
    }

    if (quickSearch && quickSearchInput && quickSearchForm) {
        fetch(HEADER_CONFIG.searchJson)
            .then((res) => res.json())
            .then((data) => {
                quickDocs = Array.isArray(data) ? data : [];
            })
            .catch(() => {
                quickDocs = [];
            });

        quickSearchOpeners.forEach((el) => {
            el.addEventListener("click", (e) => {
                e.preventDefault();
                openQuickSearch("");
            });
        });

        quickSearchClosers.forEach((el) => {
            el.addEventListener("click", () => {
                closeQuickSearch();
            });
        });

        quickSearchForm.addEventListener("submit", (e) => {
            e.preventDefault();
            goToActiveResult();
        });

        quickSearchInput.addEventListener("input", () => {
            activeIndex = -1;
            renderQuickResults();
        });

        quickSearchInput.addEventListener("keydown", (e) => {
            const items = getFilteredDocs();

            if (e.key === "ArrowDown") {
                e.preventDefault();
                if (!items.length) return;
                activeIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
                renderQuickResults();
            }

            if (e.key === "ArrowUp") {
                e.preventDefault();
                if (!items.length) return;
                activeIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
                renderQuickResults();
            }

            if (e.key === "Enter") {
                e.preventDefault();
                goToActiveResult();
            }
        });

        document.addEventListener("keydown", (e) => {
            const isMac = navigator.platform.toUpperCase().includes("MAC");
            const shortcutPressed = isMac
                ? (e.metaKey && e.key.toLowerCase() === "k")
                : (e.ctrlKey && e.key.toLowerCase() === "k");

            if (shortcutPressed) {
                e.preventDefault();
                openQuickSearch("");
            }

            if (e.key === "Escape") {
                closeMenu();
                if (quickSearch.getAttribute("aria-hidden") === "false") {
                    closeQuickSearch();
                }
            }
        });
    }
})();