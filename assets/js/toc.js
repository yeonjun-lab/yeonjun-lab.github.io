(function () {
  const content = document.getElementById("doc-content");
  const tocNav = document.getElementById("doc-toc-nav");
  const tocPanel = document.querySelector(".doc-toc");

  if (!content || !tocNav || !tocPanel) return;

  const headings = Array.from(content.querySelectorAll("h2, h3, h4"));

  if (!headings.length) {
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
    const level = heading.tagName.toLowerCase();

    li.className = `doc-toc-item level-${level}`;

    const a = document.createElement("a");
    a.href = `#${heading.id}`;
    a.textContent = heading.textContent.trim();
    a.dataset.targetId = heading.id;
    a.dataset.depth = heading.tagName.replace("H", "");

    li.appendChild(a);
    list.appendChild(li);
  });

  tocNav.innerHTML = "";
  tocNav.appendChild(list);

  const tocLinks = Array.from(tocNav.querySelectorAll("a"));
  const headerOffset = 110;
  let hasUserScrolled = false;
  let activeLockId = null;
  let activeLockTimer = null;

  function setActiveById(id, shouldScrollIntoView = false) {
    let activeLink = null;

    tocLinks.forEach((link) => {
      const isActive = link.dataset.targetId === id;
      link.classList.toggle("is-active", isActive);

      if (isActive) {
        activeLink = link;
      }
    });

    if (!shouldScrollIntoView || !activeLink || window.innerWidth <= 1100) return;

    const titleHeight =
      document.querySelector(".doc-toc-title")?.getBoundingClientRect().height ?? 0;
    const panelRect = tocPanel.getBoundingClientRect();
    const linkRect = activeLink.getBoundingClientRect();
    const topLimit = panelRect.top + titleHeight;
    const bottomLimit = panelRect.bottom;

    if (linkRect.top < topLimit) {
      tocPanel.scrollTop -= topLimit - linkRect.top + 8;
    } else if (linkRect.bottom > bottomLimit) {
      tocPanel.scrollTop += linkRect.bottom - bottomLimit + 8;
    }
  }

  function findClosestHeading() {
    let closest = headings[0];
    let closestDistance = Infinity;

    headings.forEach((heading) => {
      const rect = heading.getBoundingClientRect();
      const distance = Math.abs(rect.top - headerOffset);

      if (rect.top - headerOffset <= window.innerHeight * 0.5 && distance < closestDistance) {
        closest = heading;
        closestDistance = distance;
      }
    });

    return closest;
  }

  function setActiveLink() {
    if (activeLockId) return;

    const closest = findClosestHeading();
    if (closest) {
      setActiveById(closest.id, hasUserScrolled);
    }
  }

  tocLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();

      const targetId = link.dataset.targetId;
      const target = document.getElementById(targetId);

      if (!target) return;

      activeLockId = targetId;
      window.clearTimeout(activeLockTimer);
      setActiveById(targetId, false);

      const targetTop =
        window.scrollY + target.getBoundingClientRect().top - headerOffset;

      window.scrollTo({
        top: Math.max(targetTop, 0),
        behavior: "smooth"
      });

      window.history.replaceState(null, "", `#${targetId}`);

      activeLockTimer = window.setTimeout(() => {
        activeLockId = null;
        setActiveLink();
      }, 450);
    });
  });

  let ticking = false;

  function onScroll() {
    hasUserScrolled = true;

    if (ticking) return;
    ticking = true;

    window.requestAnimationFrame(() => {
      setActiveLink();
      ticking = false;
    });
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", () => {
    if (!ticking) {
      window.requestAnimationFrame(setActiveLink);
    }
  });

  setActiveById(headings[0].id, false);
  setActiveLink();
})();