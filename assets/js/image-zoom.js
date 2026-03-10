document.querySelectorAll("#doc-content img").forEach((img) => {
  img.style.cursor = "zoom-in";

  img.addEventListener("click", () => {
    const overlay = document.createElement("div");
    overlay.className = "image-zoom-overlay";

    const clone = img.cloneNode();
    clone.className = "image-zoomed";

    overlay.appendChild(clone);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", () => {
      overlay.remove();
    });
  });
});