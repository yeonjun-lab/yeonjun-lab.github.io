(function () {
  const images = Array.from(document.querySelectorAll("#doc-content img"));
  if (!images.length) return;

  let activeOverlay = null;
  let activeKeyHandler = null;

  function closeOverlay() {
    if (!activeOverlay) return;

    if (activeKeyHandler) {
      document.removeEventListener("keydown", activeKeyHandler);
      activeKeyHandler = null;
    }

    document.body.classList.remove("image-zoom-open");
    activeOverlay.remove();
    activeOverlay = null;
  }

  images.forEach((img) => {
    img.style.cursor = "zoom-in";

    img.addEventListener("click", () => {
      if (activeOverlay) return;

      const overlay = document.createElement("div");
      overlay.className = "image-zoom-overlay";

      const clone = img.cloneNode();
      clone.className = "image-zoomed";
      clone.alt = img.alt || "";

      overlay.appendChild(clone);
      document.body.appendChild(overlay);
      document.body.classList.add("image-zoom-open");

      activeOverlay = overlay;

      activeKeyHandler = (event) => {
        if (event.key === "Escape") {
          closeOverlay();
        }
      };

      document.addEventListener("keydown", activeKeyHandler);

      overlay.addEventListener("click", (event) => {
        if (event.target === overlay) {
          closeOverlay();
        }
      });

      clone.addEventListener("click", (event) => {
        event.stopPropagation();
      });
    });
  });
})();