(() => {
  const version = "1.1.0";

  window.gitMapVersion = version;

  function applyVersionLabels(root = document) {
    root.querySelectorAll(".app-version").forEach((label) => {
      label.textContent = `v${version}`;
      label.setAttribute("aria-label", `Version ${version}`);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => applyVersionLabels());
  } else {
    applyVersionLabels();
  }
})();
