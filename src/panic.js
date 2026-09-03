(() => {
  const data = window.panicData;
  if (!data) {
    return;
  }

  const treeRoot = document.querySelector("#panic-tree");
  const resetButton = document.querySelector("#panic-tree-reset");
  const cardList = document.querySelector("#panic-cards");
  const stubMessage = document.querySelector("#panic-stub-message");

  if (!treeRoot || !cardList) {
    return;
  }

  const REVERSIBILITY_LABEL = {
    safe: "Reversible",
    caution: "Reversible with care",
    danger: "Partly reversible"
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#39;");
  }

  async function copyToClipboard(text, button) {
    try {
      await navigator.clipboard.writeText(text);
      button.textContent = "OK";
    } catch {
      button.textContent = "Copy";
      return;
    }
    window.setTimeout(() => { button.textContent = "Copy"; }, 1200);
  }

  function renderCards() {
    cardList.innerHTML = data.recoveries.map((recovery) => `
      <article class="panic-card" id="${escapeHtml(recovery.id)}" data-recovery-id="${escapeHtml(recovery.id)}">
        <header class="panic-card-header">
          <h3>${escapeHtml(recovery.title)}</h3>
          <span class="panic-badge panic-badge-${escapeHtml(recovery.reversibility)}">${escapeHtml(REVERSIBILITY_LABEL[recovery.reversibility] || recovery.reversibility)}</span>
        </header>
        <p class="panic-diagnosis"><strong>What happened.</strong> ${escapeHtml(recovery.diagnosis)}</p>
        <div class="panic-section">
          <h4>Fix it</h4>
          <ol class="panic-commands">
            ${recovery.commands.map((step) => step.heading ? `
              <li class="panic-command-heading"><strong>${escapeHtml(step.heading)}</strong></li>
            ` : `
              <li>
                <div class="panic-command-row">
                  <code>${escapeHtml(step.command)}</code>
                  <button class="copy-button" type="button" data-copy="${escapeHtml(step.command)}" aria-label="Copy ${escapeHtml(step.command)}">Copy</button>
                </div>
                <p>${escapeHtml(step.note)}</p>
              </li>
            `).join("")}
          </ol>
        </div>
        <div class="panic-section">
          <h4>Why this works</h4>
          <p>${escapeHtml(recovery.whyItWorks)}</p>
        </div>
        <div class="panic-section panic-avoid">
          <h4>Avoid next time</h4>
          <p>${escapeHtml(recovery.avoidNextTime)}</p>
        </div>
      </article>
    `).join("");

    cardList.querySelectorAll("[data-copy]").forEach((button) => {
      button.addEventListener("click", () => copyToClipboard(button.dataset.copy, button));
    });
  }

  function scrollAndPulse(recoveryId) {
    const card = document.getElementById(recoveryId);
    if (!card) {
      return;
    }
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("is-just-focused");
    void card.offsetWidth;
    card.classList.add("is-just-focused");
    card.addEventListener("animationend", () => card.classList.remove("is-just-focused"), { once: true });
  }

  function renderStub() {
    if (!stubMessage) {
      return;
    }
    stubMessage.hidden = false;
    stubMessage.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function hideStub() {
    if (stubMessage) {
      stubMessage.hidden = true;
    }
  }

  function buildQuestion(question, options, depth) {
    const wrapper = document.createElement("div");
    wrapper.className = "panic-question";
    wrapper.dataset.depth = String(depth);
    wrapper.innerHTML = `
      <p class="panic-question-text">${escapeHtml(question)}</p>
      <div class="panic-options" role="group" aria-label="${escapeHtml(question)}"></div>
    `;
    const buttonsHost = wrapper.querySelector(".panic-options");
    options.forEach((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "panic-option";
      button.textContent = option.label;
      button.addEventListener("click", () => handleAnswer(option, wrapper, depth));
      buttonsHost.append(button);
    });
    return wrapper;
  }

  function clearBelow(depth) {
    treeRoot.querySelectorAll(".panic-question").forEach((node) => {
      if (Number(node.dataset.depth) > depth) {
        node.remove();
      }
    });
    treeRoot.querySelectorAll(".panic-option").forEach((button) => {
      const parentDepth = Number(button.closest(".panic-question")?.dataset.depth || -1);
      if (parentDepth <= depth) {
        button.classList.remove("is-selected");
      }
    });
    hideStub();
  }

  function markSelected(questionEl, option) {
    questionEl.querySelectorAll(".panic-option").forEach((button) => {
      button.classList.toggle("is-selected", button.textContent === option.label);
    });
  }

  function handleAnswer(option, questionEl, depth) {
    clearBelow(depth);
    markSelected(questionEl, option);

    if (option.recoveryId) {
      scrollAndPulse(option.recoveryId);
      return;
    }
    if (option.stub) {
      renderStub();
      return;
    }
    if (option.options && option.nextQuestion) {
      const next = buildQuestion(option.nextQuestion, option.options, depth + 1);
      treeRoot.append(next);
    }
  }

  function resetTree() {
    treeRoot.innerHTML = "";
    hideStub();
    const root = buildQuestion(data.tree.rootQuestion, data.tree.rootOptions, 0);
    treeRoot.append(root);
  }

  if (resetButton) {
    resetButton.addEventListener("click", resetTree);
  }

  renderCards();
  resetTree();
})();
