(function () {
  const docContent = document.getElementById("doc-content");
  if (!docContent) return;

  const codeBlocks = Array.from(docContent.querySelectorAll("pre > code"));
  if (!codeBlocks.length) return;

  const LANGUAGE_LABELS = {
    js: "JavaScript",
    javascript: "JavaScript",
    ts: "TypeScript",
    typescript: "TypeScript",
    jsx: "JSX",
    tsx: "TSX",
    py: "Python",
    python: "Python",
    java: "Java",
    c: "C",
    cpp: "C++",
    "c++": "C++",
    cs: "C#",
    csharp: "C#",
    go: "Go",
    rust: "Rust",
    ruby: "Ruby",
    php: "PHP",
    swift: "Swift",
    kotlin: "Kotlin",
    scala: "Scala",
    r: "R",
    sql: "SQL",
    bash: "Bash",
    shell: "Shell",
    zsh: "Zsh",
    sh: "Shell",
    html: "HTML",
    css: "CSS",
    scss: "SCSS",
    sass: "Sass",
    json: "JSON",
    yaml: "YAML",
    yml: "YAML",
    xml: "XML",
    markdown: "Markdown",
    md: "Markdown",
    dockerfile: "Dockerfile",
    makefile: "Makefile"
  };

  let toastTimer = null;

  function createButton() {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "code-copy-button";
    button.textContent = "Copy";
    button.setAttribute("aria-label", "코드 복사");
    return button;
  }

  function createBadge(label) {
    const badge = document.createElement("span");
    badge.className = "code-language-badge";
    badge.textContent = label;
    return badge;
  }

  function getToast() {
    let toast = document.getElementById("code-copy-toast");
    if (toast) return toast;

    toast = document.createElement("div");
    toast.id = "code-copy-toast";
    toast.className = "code-copy-toast";
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
    return toast;
  }

  function showToast(message, isError) {
    const toast = getToast();

    toast.textContent = message;
    toast.classList.toggle("is-error", Boolean(isError));
    toast.classList.add("is-visible");

    if (toastTimer) {
      window.clearTimeout(toastTimer);
    }

    toastTimer = window.setTimeout(() => {
      toast.classList.remove("is-visible");
    }, 1800);
  }

  function extractLanguage(code) {
    const classList = Array.from(code.classList);
    const languageClass = classList.find((cls) => cls.startsWith("language-"));
    if (!languageClass) return "";

    const raw = languageClass.replace("language-", "").toLowerCase().trim();
    return LANGUAGE_LABELS[raw] || raw.toUpperCase();
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }

    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "absolute";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    document.body.removeChild(textarea);
  }

  codeBlocks.forEach((code) => {
    const pre = code.parentElement;
    if (!pre || pre.dataset.copyReady === "true") return;

    pre.dataset.copyReady = "true";
    pre.classList.add("code-copy-wrap");

    const language = extractLanguage(code);
    if (language) {
      pre.appendChild(createBadge(language));
    }

    const button = createButton();
    pre.appendChild(button);

    button.addEventListener("click", async () => {
      const rawText = code.innerText;

      try {
        await copyText(rawText);
        button.textContent = "Copied";
        button.classList.add("is-copied");
        showToast("코드를 복사했습니다.", false);

        window.setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("is-copied");
        }, 1600);
      } catch (error) {
        button.textContent = "Failed";
        showToast("복사에 실패했습니다.", true);

        window.setTimeout(() => {
          button.textContent = "Copy";
          button.classList.remove("is-copied");
        }, 1600);
      }
    });
  });
})();