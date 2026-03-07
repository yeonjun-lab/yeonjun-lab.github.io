(function () {
  const content = document.getElementById("doc-content");
  const tocNav = document.getElementById("doc-toc-nav");

  if (!content || !tocNav) return;

  const headings = Array.from(content.querySelectorAll("h2, h3"));
  if (headings.length === 0) {
    tocNav.innerHTML = '<div class="doc-toc-empty">목차가 없습니다.</div>';
    return;
  }

  function slugify(text) {
    return String(text || "")
      .toLowerCase()
      .trim()
      .replace(/[^\w가-힣\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-");
  }

  headings.forEach((heading, index) => {
    if (!heading.id) {
      const slug = slugify(heading.textContent) || `section-${index + 1}`;
      let uniqueId = slug;
      let counter = 2;
      while (document.getElementById(uniqueId)) {
        uniqueId = `${slug}-${counter++}`;
      }
      heading.id = uniqueId;
    }
  });

  const list = document.createElement("ul");
  list.className = "doc-toc-list";

  headings.forEach((heading) => {
    const li = document.createElement("li");
    li.className = `doc-toc-item level-${heading.tagName.toLowerCase()}`;

    const a = document.createElement("a");
    a.href = `#${heading.id}`;
    a.textContent = heading.textContent;
    a.dataset.targetId = heading.id;

    li.appendChild(a);
    list.appendChild(li);
  });

  tocNav.appendChild(list);

  const tocLinks = Array.from(tocNav.querySelectorAll("a"));

  function setActiveLink() {
    let activeId = null;
    const offset = 120;

    for (const heading of headings) {
      const rect = heading.getBoundingClientRect();
      if (rect.top <= offset) {
        activeId = heading.id;
      }
    }

    tocLinks.forEach((link) => {
      if (link.dataset.targetId === activeId) {
        link.classList.add("is-active");
      } else {
        link.classList.remove("is-active");
      }
    });
  }

  window.addEventListener("scroll", setActiveLink, { passive: true });
  setActiveLink();
})();
