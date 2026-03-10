(function () {
  const sidebarDetails = document.querySelector(".doc-sidebar-details");
  const mobileSidebarBreakpoint = window.matchMedia("(max-width: 1100px)");
  const toc = document.querySelector(".doc-toc");
  const tocNav = document.getElementById("doc-toc-nav");

  function syncSidebarDisclosure(event) {
    if (!sidebarDetails) return;
    sidebarDetails.open = !event.matches;
  }

  function syncTocVisibility() {
    if (!toc || !tocNav) return;

    const hasMeaningfulContent =
      tocNav.children.length > 0 &&
      !tocNav.querySelector(".doc-toc-empty");

    toc.hidden = !hasMeaningfulContent;
  }

  syncSidebarDisclosure(mobileSidebarBreakpoint);
  mobileSidebarBreakpoint.addEventListener("change", syncSidebarDisclosure);

  syncTocVisibility();

  if (tocNav) {
    const observer = new MutationObserver(syncTocVisibility);
    observer.observe(tocNav, {
      childList: true,
      subtree: true
    });
  }
})();