(function () {
  const sidebarDetails = document.querySelector(".doc-sidebar-details");
  const mobileSidebarBreakpoint = window.matchMedia("(max-width: 1100px)");
  const toc = document.querySelector(".doc-toc");
  const tocNav = document.getElementById("doc-toc-nav");

  function syncSidebarDisclosure(event) {
    if (!sidebarDetails) return;

    const summary = sidebarDetails.querySelector(".doc-sidebar-summary");
    const isDesktop = !event.matches;

    sidebarDetails.classList.toggle("is-open", isDesktop);
    if (summary) {
      summary.setAttribute("aria-expanded", isDesktop ? "true" : "false");
    }
  }

  function syncTocVisibility() {
    if (!toc || !tocNav) return;

    const hasMeaningfulContent =
      tocNav.children.length > 0 &&
      !tocNav.querySelector(".doc-toc-empty");

    toc.hidden = !hasMeaningfulContent;
  }

  function scrollSidebarItemIntoView(sidebarBody, target, behavior = "smooth") {
    if (!sidebarBody || !target) return;

    const bodyRect = sidebarBody.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();

    const topPadding = 20;
    const bottomPadding = 20;

    const fullyVisible =
      targetRect.top >= bodyRect.top + topPadding &&
      targetRect.bottom <= bodyRect.bottom - bottomPadding;

    if (fullyVisible) return;

    const targetTopWithinContainer = target.offsetTop;
    const desiredTop = Math.max(
      targetTopWithinContainer - sidebarBody.clientHeight * 0.25,
      0
    );

    sidebarBody.scrollTo({
      top: desiredTop,
      behavior
    });
  }

  function setupTopicGroups() {
    const topicGroups = Array.from(document.querySelectorAll(".sidebar-topic-group"));
    if (!topicGroups.length) return;

    function setGroupOpen(group, isOpen) {
      const toggle = group.querySelector('[data-topic-toggle="true"]');
      group.classList.toggle("is-open", isOpen);

      if (toggle) {
        toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
      }
    }

    function closeAllGroups() {
      topicGroups.forEach((group) => setGroupOpen(group, false));
    }

    topicGroups.forEach((group) => {
      const toggleButton = group.querySelector('[data-topic-toggle="true"]');
      if (!toggleButton) return;

      toggleButton.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();

        const isOpen = group.classList.contains("is-open");

        if (isOpen) {
          setGroupOpen(group, false);
          return;
        }

        closeAllGroups();
        setGroupOpen(group, true);

        const sidebarBody = document.querySelector(".doc-sidebar-body");
        const topicRow = group.querySelector('[data-topic-row="true"]');

        requestAnimationFrame(() => {
          scrollSidebarItemIntoView(sidebarBody, topicRow, "smooth");
        });
      });
    });
  }

  function setupMobileSidebarPanel() {
    if (!sidebarDetails) return;

    const summary = sidebarDetails.querySelector(".doc-sidebar-summary");
    if (!summary) return;

    summary.addEventListener("click", (event) => {
      if (!mobileSidebarBreakpoint.matches) return;

      event.preventDefault();

      const willOpen = !sidebarDetails.classList.contains("is-open");
      sidebarDetails.classList.toggle("is-open", willOpen);
      summary.setAttribute("aria-expanded", willOpen ? "true" : "false");
    });
  }

  function focusCurrentSidebarTopic() {
    if (window.innerWidth <= 1100) return;

    const sidebarBody = document.querySelector(".doc-sidebar-body");
    if (!sidebarBody) return;

    const currentDocLink = sidebarBody.querySelector(".sidebar-link.is-current:not(.sidebar-topic-link)");
    const currentTopicLink = sidebarBody.querySelector(".sidebar-topic-group.is-open .sidebar-topic-link");
    const target = currentDocLink || currentTopicLink;

    if (!target) return;

    requestAnimationFrame(() => {
      scrollSidebarItemIntoView(sidebarBody, target, "auto");
    });
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

  setupTopicGroups();
  setupMobileSidebarPanel();
  focusCurrentSidebarTopic();
  document.documentElement.classList.add("doc-ui-ready");
})();