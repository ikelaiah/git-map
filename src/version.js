(() => {
  const version = "1.2.1";
  const startHereStorageKey = "git-map-start-here-dismissed";

  window.gitMapVersion = version;

  function applyVersionLabels(root = document) {
    root.querySelectorAll(".app-version").forEach((label) => {
      label.textContent = `v${version}`;
      label.setAttribute("aria-label", `Version ${version}`);
    });
  }

  function readDismissed() {
    try {
      return window.localStorage.getItem(startHereStorageKey) === "1";
    } catch {
      return false;
    }
  }

  function writeDismissed() {
    try {
      window.localStorage.setItem(startHereStorageKey, "1");
    } catch {
      // Ignore storage failures; the callout will reappear next visit.
    }
  }

  function setupStartHere(root = document) {
    const callout = root.querySelector("#start-here");
    if (!callout) {
      return;
    }
    if (readDismissed()) {
      callout.hidden = true;
      return;
    }
    callout.hidden = false;
    const dismiss = root.querySelector("#start-here-dismiss");
    if (dismiss) {
      dismiss.addEventListener("click", () => {
        callout.hidden = true;
        writeDismissed();
      });
    }
  }

  function init() {
    applyVersionLabels();
    setupStartHere();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
