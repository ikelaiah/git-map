const {
  zones,
  mainPathCommandIds,
  workspaceFocusedCommandIds,
  commands,
  toolCommands,
  statusScenarios,
  statusDetectors,
  sampleStatusOutput,
  commandJourneys
} = window.gitMapData;

const flowStartY = 288;
const lifelineStartY = 270;
const rowGap = 32;
let currentMapHeight = 560;

const map = document.querySelector(".git-map");
const mapShell = document.querySelector(".map-shell");
const svg = document.querySelector(".flow-layer");
const mapJumps = document.querySelector(".map-jumps");
const lifelineLabels = document.querySelector(".lifeline-labels");
renderMapAreas();
const zoneEls = [...document.querySelectorAll(".zone")];
const mapJumpButtons = [...document.querySelectorAll("[data-jump-zone]")];
const commandList = document.querySelector("#command-list");
const commandTitle = document.querySelector("#command-title");
const commandHelp = document.querySelector("#command-help");
const commandSpotlight = document.querySelector("#command-spotlight");
const modeNote = document.querySelector("#mode-note");
const areaSummary = document.querySelector("#area-summary");
const toolSection = document.querySelector("#tool-section");
const toolTitle = document.querySelector("#tool-title");
const toolList = document.querySelector("#tool-list");
const modeButtons = [...document.querySelectorAll("[data-mode]")];
const riskButtons = [...document.querySelectorAll("[data-risk-filter]")];
const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
const statusHelperChoice = document.querySelector("#status-helper-choice");
const statusHelperResult = document.querySelector("#status-helper-result");
const statusPaste = document.querySelector("#status-paste");
const analyzeStatusButton = document.querySelector("#analyze-status");
const loadStatusSampleButton = document.querySelector("#load-status-sample");
const clearStatusButton = document.querySelector("#clear-status");
const statusAnalysis = document.querySelector("#status-analysis");
const journeyChoice = document.querySelector("#journey-choice");
const journeyCurrent = document.querySelector("#journey-current");
const journeySteps = document.querySelector("#journey-steps");
const journeyReceipt = document.querySelector("#journey-receipt");
const journeyPrevButton = document.querySelector("#journey-prev");
const journeyNextButton = document.querySelector("#journey-next");
const themeStorageKey = "git-map-theme";
const legacyThemeStorageKey = "git-helper-theme";
let selectedZone = null;
let pinnedZone = null;
let displayMode = "focused";
let riskFilter = "safe";
let pinnedCommandId = null;
let activeJourneyId = commandJourneys[0]?.id || null;
let activeJourneyStep = 0;

function setTheme(theme) {
  const nextTheme = ["light", "dark", "system"].includes(theme) ? theme : "system";
  document.documentElement.dataset.theme = nextTheme;
  themeButtons.forEach((item) => {
    item.setAttribute("aria-pressed", String(item.dataset.themeChoice === nextTheme));
  });
  try {
    window.localStorage.setItem(themeStorageKey, nextTheme);
  } catch {
    // Ignore storage failures; the visual theme still changes for this page view.
  }
}

function initialTheme() {
  try {
    return window.localStorage.getItem(themeStorageKey)
      || window.localStorage.getItem(legacyThemeStorageKey)
      || "system";
  } catch {
    return "system";
  }
}

function commandLabel(command) {
  return command
    .replace(" <file>", "")
    .replace(" <branch>", "")
    .replace(" <commit>", "")
    .replace(" <name>", "")
    .replace(" <url>", "")
    .replace(" -m \"message\"", "");
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function renderMapAreas() {
  const zoneEntries = Object.entries(zones);
  mapJumps.innerHTML = zoneEntries.map(([key, zone]) => `
    <button class="map-jump" type="button" data-jump-zone="${escapeHtml(key)}" aria-label="Show ${escapeHtml(zone.label)}" style="--jump-color: ${escapeHtml(zone.color)}">${escapeHtml(zone.icon)}</button>
  `).join("");
  lifelineLabels.innerHTML = zoneEntries
    .map(([, zone]) => `<span>${escapeHtml(zone.label)}</span>`)
    .join("");
  map.insertAdjacentHTML("beforeend", zoneEntries.map(([key, zone]) => `
    <article class="zone" tabindex="0" data-zone="${escapeHtml(key)}" style="--zone-color: ${escapeHtml(zone.color)}">
      <div class="zone-topline">
        <div class="zone-icon">${escapeHtml(zone.icon)}</div>
        <div class="zone-scene place-${escapeHtml(zone.placeType || key)}" aria-hidden="true">
          <span class="place-shape"></span>
          <span>${escapeHtml(zone.place || zone.label)}</span>
        </div>
      </div>
      <div>
        <h2>${escapeHtml(zone.label)}</h2>
        <p>${escapeHtml(zone.description)}</p>
      </div>
      <code>${escapeHtml(zone.command)}</code>
    </article>
  `).join(""));
}

async function copyCommand(command, button) {
  try {
    await navigator.clipboard.writeText(command);
    button.textContent = "OK";
    window.setTimeout(() => {
      button.textContent = "Copy";
    }, 1200);
  } catch {
    button.textContent = "Copy";
  }
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function ribbonPoints(startX, endX, y, height, headSize) {
  const half = height / 2;
  const direction = endX >= startX ? 1 : -1;
  if (direction > 0) {
    const neckX = Math.max(startX + 20, endX - headSize);
    return `${startX},${y - half} ${neckX},${y - half} ${endX},${y} ${neckX},${y + half} ${startX},${y + half}`;
  }
  const neckX = Math.min(startX - 20, endX + headSize);
  return `${startX},${y - half} ${neckX},${y - half} ${endX},${y} ${neckX},${y + half} ${startX},${y + half}`;
}

function loopGeometry(zone, y) {
  const edgePadding = 46;
  const minX = edgePadding;
  const maxX = 1400 - edgePadding;
  const width = 180;
  let startX = zone.x - width - 16;
  let endX = zone.x - 16;
  if (startX < minX) {
    startX = zone.x + 16;
    endX = startX + width;
  }
  if (endX > maxX) {
    endX = maxX;
    startX = endX - width;
  }
  return {
    startX,
    endX,
    labelX: (startX + endX) / 2,
    labelY: y + 4
  };
}

function isDailyPathCommand(item) {
  return mainPathCommandIds.has(item.id);
}

function isRiskyCommand(item) {
  return item.risk === "danger";
}

function applyRiskFilter(items) {
  if (riskFilter === "all") {
    return items;
  }
  return items.filter((item) => !isRiskyCommand(item));
}

function isRiskyCommandText(command) {
  const mapCommand = commands.find((item) => item.command === command);
  if (mapCommand) {
    return isRiskyCommand(mapCommand);
  }
  return Object.values(toolCommands)
    .flat()
    .some((tool) => tool.command === command && tool.caution);
}

function commandUseText(item) {
  if (isDailyPathCommand(item)) {
    return "Use it in the daily edit, stage, commit, and share routine.";
  }
  if (item.risk === "danger") {
    return "Use it only after checking status and confirming the changes are safe to rewrite or discard.";
  }
  if (item.from === item.to) {
    return `Use it when you are working inside ${zones[item.from].label}.`;
  }
  return `Use it when work needs to move from ${zones[item.from].label} to ${zones[item.to].label}.`;
}

function commandWatchText(item) {
  if (item.caution) {
    return item.caution;
  }
  if (isDailyPathCommand(item)) {
    return "This belongs to the beginner daily path.";
  }
  return "Run git status first if you are unsure what Git will change.";
}

function routePlaceText(item) {
  const from = zones[item.from];
  const to = zones[item.to];
  if (item.from === item.to) {
    return `${from.place || from.label} loop`;
  }
  return `${from.place || from.label} -> ${to.place || to.label}`;
}

function commandById(commandId) {
  return commands.find((item) => item.id === commandId);
}

function previewForCommand(item) {
  if (item?.preview) {
    return item.preview;
  }
  if (!item) {
    return null;
  }
  const from = zones[item.from]?.label || "current state";
  const to = zones[item.to]?.label || "next state";
  return {
    before: item.from === item.to ? `You are working inside ${from}.` : `Work is associated with ${from}.`,
    after: item.from === item.to ? `${from} changes shape but stays in the same area.` : `Work moves toward ${to}.`,
    effect: item.note
  };
}

function renderPreviewMarkup(item, className = "command-preview") {
  const preview = previewForCommand(item);
  if (!preview) {
    return "";
  }
  return `
    <div class="${className}">
      <div>
        <span>Before</span>
        <p>${escapeHtml(preview.before)}</p>
      </div>
      <div>
        <span>After</span>
        <p>${escapeHtml(preview.after)}</p>
      </div>
      <div>
        <span>Effect</span>
        <p>${escapeHtml(preview.effect)}</p>
      </div>
    </div>
  `;
}

function renderSpotlight(items, commandId) {
  if (!items.length) {
    commandSpotlight.hidden = true;
    commandSpotlight.innerHTML = "";
    return;
  }

  const spotlightId = commandId || pinnedCommandId;
  const item = items.find((candidate) => candidate.id === spotlightId)
    || items.find((candidate) => isDailyPathCommand(candidate))
    || items[0];
  const from = zones[item.from];
  const to = zones[item.to];
  const samePlace = item.from === item.to;
  commandSpotlight.hidden = false;
  commandSpotlight.style.setProperty("--spot-color", item.color);
  commandSpotlight.innerHTML = `
    <div class="spotlight-top">
      <div>
        <span class="spotlight-kicker">${isDailyPathCommand(item) ? "Daily route" : "Command route"}</span>
        <h3>${escapeHtml(item.title)}</h3>
      </div>
      <div class="spotlight-route" aria-label="Command route">
        <span>${escapeHtml(from.label)}</span>
        <b>${samePlace ? "loop" : "->"}</b>
        ${samePlace ? "" : `<span>${escapeHtml(to.label)}</span>`}
      </div>
    </div>
    <div class="spotlight-command-row">
      <code>${escapeHtml(item.command)}</code>
      <button class="copy-button spotlight-copy" type="button" data-spotlight-copy aria-label="Copy ${escapeHtml(item.command)}">Copy</button>
    </div>
    <dl class="spotlight-facts">
      <div>
        <dt>Moves through</dt>
        <dd>${escapeHtml(routePlaceText(item))}</dd>
      </div>
      <div>
        <dt>Use when</dt>
        <dd>${escapeHtml(commandUseText(item))}</dd>
      </div>
      <div>
        <dt>Watch for</dt>
        <dd>${escapeHtml(commandWatchText(item))}</dd>
      </div>
    </dl>
    ${renderPreviewMarkup(item, "spotlight-preview")}
  `;
  commandSpotlight.querySelector("[data-spotlight-copy]").addEventListener("click", (event) => {
    copyCommand(item.command, event.currentTarget);
  });
}

function updateMapMetrics(commandCount) {
  const height = displayMode === "all"
    ? Math.max(735, flowStartY + Math.max(commandCount, 1) * rowGap + 104)
    : Math.max(470, flowStartY + Math.max(commandCount, 1) * rowGap + 104);
  currentMapHeight = height;
  map.style.setProperty("--map-height", `${height}px`);
  map.style.setProperty("--map-bottom", `${Math.max(170, height - 252)}px`);
  svg.setAttribute("viewBox", `0 0 1400 ${height}`);
  document.querySelectorAll("[data-lifeline]").forEach((group) => {
    const line = group.querySelector(".lifeline-line");
    if (line) {
      line.setAttribute("y1", lifelineStartY);
      line.setAttribute("y2", height - 78);
    }
  });
}

function centerZoneInMap(zoneKey) {
  const zone = map.querySelector(`[data-zone="${zoneKey}"]`);
  if (!zone || !mapShell || mapShell.scrollWidth <= mapShell.clientWidth) {
    return;
  }

  const targetLeft = zone.offsetLeft + zone.offsetWidth / 2 - mapShell.clientWidth / 2;
  mapShell.scrollTo({
    left: Math.max(0, targetLeft),
    behavior: "smooth"
  });
}

function updateMapJumps() {
  mapJumpButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.jumpZone === selectedZone));
  });
}

function drawLifelines() {
  Object.entries(zones).forEach(([key, zone]) => {
    const group = createSvgElement("g", { "data-lifeline": key });
    const line = createSvgElement("line", {
      x1: zone.x,
      x2: zone.x,
      y1: lifelineStartY,
      y2: currentMapHeight - 78,
      stroke: zone.color,
      "stroke-width": 1.8,
      "stroke-dasharray": "3 9",
      "stroke-linecap": "round"
    });
    const cap = createSvgElement("circle", {
      cx: zone.x,
      cy: lifelineStartY,
      r: 5,
      fill: zone.color
    });
    line.classList.add("lifeline", "lifeline-line");
    cap.classList.add("lifeline");
    group.append(line, cap);
    svg.append(group);
  });
}

function drawFlows(items) {
  svg.querySelectorAll(".command-flow").forEach((group) => group.remove());
  items.forEach((item, index) => {
    const y = flowStartY + index * rowGap;
    const from = zones[item.from];
    const to = zones[item.to];
    const isLoop = item.from === item.to;
    const direction = to.x >= from.x ? 1 : -1;
    const loop = isLoop ? loopGeometry(from, y) : null;
    const startX = loop ? loop.startX : from.x + direction * 14;
    const endX = loop ? loop.endX : to.x - direction * 18;
    const text = item.label || commandLabel(item.command);
    const ribbonHeight = 24;
    const arrowHead = 24;
    const labelX = loop ? loop.labelX : (from.x + to.x) / 2;
    const labelY = loop ? loop.labelY : y + 4;
    const group = createSvgElement("g");
    group.classList.add("command-flow");
    group.classList.toggle("is-daily-path", isDailyPathCommand(item));
    group.dataset.commandId = item.id;
    group.setAttribute("tabindex", "0");
    group.setAttribute("role", "button");
    group.setAttribute("aria-label", `${item.command}: ${item.title}`);

    const connectorStart = createSvgElement("line", {
      x1: from.x,
      x2: from.x,
      y1: y - 5,
      y2: y + 5,
      stroke: item.color,
      "stroke-width": 2.5,
      "stroke-linecap": "round"
    });
    connectorStart.style.setProperty("--path-length", "10");
    const connectorEnd = createSvgElement("line", {
      x1: to.x,
      x2: to.x,
      y1: y - 5,
      y2: y + 5,
      stroke: item.color,
      "stroke-width": 2.5,
      "stroke-linecap": "round"
    });
    connectorEnd.style.setProperty("--path-length", "10");
    const ribbon = createSvgElement("polygon", {
      points: ribbonPoints(startX, endX, y, ribbonHeight, arrowHead),
      fill: item.color
    });
    connectorStart.classList.add("flow-line");
    connectorEnd.classList.add("flow-line");
    ribbon.classList.add("flow-ribbon");
    ribbon.classList.toggle("is-danger", item.risk === "danger");

    const label = createSvgElement("text", {
      x: labelX,
      y: labelY,
      "text-anchor": "middle"
    });
    label.classList.add("flow-label");
    label.classList.toggle("is-danger", item.risk === "danger");
    label.textContent = text;
    const markerX = startX + direction * 28;
    const dailyMarker = createSvgElement("circle", {
      cx: markerX,
      cy: y,
      r: 8
    });
    const dailyMarkerText = createSvgElement("text", {
      x: markerX,
      y: y + 3,
      "text-anchor": "middle"
    });
    dailyMarker.classList.add("flow-daily-marker");
    dailyMarkerText.classList.add("flow-daily-marker-text");
    dailyMarkerText.textContent = "D";

    group.addEventListener("mouseenter", () => setActiveCommand(item.id));
    group.addEventListener("mouseleave", () => setActiveCommand(null));
    group.addEventListener("focus", () => setActiveCommand(item.id));
    group.addEventListener("blur", () => setActiveCommand(null));
    group.addEventListener("click", () => selectCommand(item.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCommand(item.id);
      }
    });

    group.append(connectorStart);
    if (!isLoop) {
      group.append(connectorEnd);
    }
    group.append(ribbon, label);
    if (isDailyPathCommand(item)) {
      group.append(dailyMarker, dailyMarkerText);
    }
    svg.append(group);
  });
}

function visibleCommands() {
  let items;
  if (displayMode === "all") {
    items = commands;
  } else if (!selectedZone) {
    return [];
  } else if (selectedZone === "workspace") {
    items = commands.filter((item) => workspaceFocusedCommandIds.has(item.id));
  } else {
    items = commands.filter((item) => item.zones.includes(selectedZone));
  }
  return applyRiskFilter(items);
}

function setActiveCommand(commandId) {
  const activeCommandId = commandId || pinnedCommandId;
  const command = activeCommandId ? commands.find((item) => item.id === activeCommandId) : null;
  document.querySelectorAll(".command-flow, .flow-line, .flow-ribbon, .flow-label, .command-card").forEach((el) => {
    const isActive = Boolean(activeCommandId)
      && (el.dataset.commandId === activeCommandId || el.closest(`[data-command-id="${activeCommandId}"]`));
    el.classList.toggle("is-active", isActive);
  });
  document.querySelectorAll("[data-lifeline]").forEach((group) => {
    const active = command && [command.from, command.to].includes(group.dataset.lifeline);
    group.querySelectorAll(".lifeline").forEach((el) => el.classList.toggle("is-active", active));
  });
  zoneEls.forEach((el) => {
    el.classList.toggle("is-command-active", Boolean(command) && [command.from, command.to].includes(el.dataset.zone));
  });
  renderSpotlight(visibleCommands(), activeCommandId);
}

function selectCommand(commandId, options = {}) {
  pinnedCommandId = commandId;
  setActiveCommand(commandId);
  if (options.scroll === false) {
    return;
  }
  const card = commandList.querySelector(`[data-command-id="${commandId}"]`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.remove("is-just-focused");
    void card.offsetWidth;
    card.classList.add("is-just-focused");
    card.addEventListener("animationend", () => card.classList.remove("is-just-focused"), { once: true });
  }
}

function renderCommands() {
  const items = visibleCommands();
  commandList.innerHTML = "";
  commandHelp.hidden = items.length > 0;
  commandTitle.textContent = displayMode === "all" ? "Everything Git flows" : selectedZone ? `${zones[selectedZone].label} commands` : "Hover an area";
  renderSummary();
  renderSpotlight(items);

  items.forEach((item) => {
    const li = document.createElement("li");
    li.className = "command-card";
    li.classList.toggle("is-daily-path", isDailyPathCommand(item));
    li.classList.toggle("is-danger", item.risk === "danger");
    li.tabIndex = 0;
    li.dataset.commandId = item.id;
    li.style.setProperty("--cmd-color", item.color);
    li.innerHTML = `
      <div class="command-card-header">
        <strong>${escapeHtml(item.title)}</strong>
        ${isDailyPathCommand(item) ? '<span class="badge badge-daily">Daily path</span>' : ""}
        ${item.caution ? `<span class="badge">${escapeHtml(item.caution)}</span>` : ""}
      </div>
      <div class="command-row">
        <code>${escapeHtml(item.command)}</code>
        <button class="copy-button" type="button" aria-label="Copy ${escapeHtml(item.command)}">Copy</button>
      </div>
      <p>${escapeHtml(item.note)}</p>
      ${renderPreviewMarkup(item)}
    `;
    li.querySelector(".copy-button").addEventListener("click", (event) => {
      event.stopPropagation();
      copyCommand(item.command, event.currentTarget);
    });
    li.addEventListener("mouseenter", () => setActiveCommand(item.id));
    li.addEventListener("focus", () => setActiveCommand(item.id));
    li.addEventListener("mouseleave", () => setActiveCommand(null));
    li.addEventListener("blur", () => setActiveCommand(null));
    li.addEventListener("click", () => selectCommand(item.id));
    commandList.append(li);
  });
  renderTools();
}

function renderSummary() {
  if (displayMode === "all") {
    modeNote.hidden = false;
    modeNote.innerHTML = "<strong>Everything mode:</strong> use this as a map, not a step-by-step workflow. Hover or click a command pill to connect it with the detail card below.";
    areaSummary.hidden = true;
    areaSummary.textContent = "";
    return;
  }

  modeNote.hidden = true;
  modeNote.textContent = "";
  if (!selectedZone) {
    areaSummary.hidden = true;
    areaSummary.textContent = "";
    return;
  }

  const zone = zones[selectedZone];
  let next = escapeHtml(zone.next);
  zone.nextCommands.forEach((command) => {
    next = next.replace(escapeHtml(command), `<code>${escapeHtml(command)}</code>`);
  });
  areaSummary.hidden = false;
  areaSummary.innerHTML = `<strong>${escapeHtml(zone.label)}:</strong> ${escapeHtml(zone.summary)}<br>${next}`;
}

function renderTools() {
  const key = displayMode === "all" ? "all" : selectedZone;
  const tools = key
    ? (toolCommands[key] || []).filter((tool) => riskFilter === "all" || !tool.caution)
    : [];
  toolSection.hidden = tools.length === 0;
  toolList.innerHTML = "";
  if (!tools.length) {
    return;
  }
  toolTitle.textContent = displayMode === "all" ? "Useful checks before changing anything" : `${zones[selectedZone].label} checks`;
  tools.forEach((tool) => {
    const li = document.createElement("li");
    li.className = "tool-card";
    li.classList.toggle("is-danger", Boolean(tool.caution));
    li.innerHTML = `
      <code>${escapeHtml(tool.command)}</code>
      ${tool.caution ? `<span class="badge">Use carefully</span>` : ""}
      <p>${escapeHtml(tool.note)}</p>
    `;
    toolList.append(li);
  });
}

function renderStatusHelperOptions() {
  if (!statusHelperChoice || !statusHelperResult) {
    return;
  }
  statusHelperChoice.innerHTML = statusScenarios.map((scenario) => `
    <option value="${escapeHtml(scenario.id)}">${escapeHtml(scenario.label)}</option>
  `).join("");
  renderStatusHelper();
}

function currentStatusScenario() {
  return statusScenarios.find((scenario) => scenario.id === statusHelperChoice.value)
    || statusScenarios[0];
}

function renderStatusHelper() {
  const scenario = currentStatusScenario();
  if (!scenario) {
    statusHelperResult.innerHTML = "";
    return;
  }
  const targetCommand = commands.find((item) => item.id === scenario.commandId);
  const targetLabel = targetCommand ? commandLabel(targetCommand.command) : zones[scenario.zone].label;
  const nextCommands = scenario.next.filter((command) => riskFilter === "all" || !isRiskyCommandText(command));
  const hiddenRiskyCount = scenario.next.length - nextCommands.length;
  statusHelperResult.innerHTML = `
    <p>${escapeHtml(scenario.summary)}</p>
    <div class="status-helper-groups">
      <div>
        <span>Check</span>
        ${scenario.checks.map((command) => `<code>${escapeHtml(command)}</code>`).join("")}
      </div>
      <div>
        <span>Next</span>
        ${nextCommands.map((command) => `<code>${escapeHtml(command)}</code>`).join("")}
      </div>
    </div>
    ${hiddenRiskyCount ? `<small>${hiddenRiskyCount} risky option${hiddenRiskyCount === 1 ? "" : "s"} hidden.</small>` : ""}
    <button class="status-helper-action" type="button" data-status-helper-target>Show ${escapeHtml(targetLabel)}</button>
  `;
  statusHelperResult.querySelector("[data-status-helper-target]").addEventListener("click", () => {
    focusStatusScenario(scenario);
  });
}

function focusStatusScenario(scenario, options = {}) {
  centerZoneInMap(scenario.zone);
  selectZone(scenario.zone, { pin: true, force: true });
  if (scenario.commandId && visibleCommands().some((item) => item.id === scenario.commandId)) {
    selectCommand(scenario.commandId, { scroll: options.scroll !== false });
  }
}

function scenarioById(scenarioId) {
  return statusScenarios.find((scenario) => scenario.id === scenarioId);
}

function filteredNextCommands(scenario) {
  return scenario.next.filter((command) => riskFilter === "all" || !isRiskyCommandText(command));
}

function renderCommandPills(commandItems) {
  return commandItems.map((command) => `<code>${escapeHtml(command)}</code>`).join("");
}

function statusMatchesFromText(value) {
  const text = value.trim().toLowerCase();
  if (!text) {
    return [];
  }
  const matches = statusDetectors
    .filter((detector) => detector.patterns.some((pattern) => text.includes(pattern.toLowerCase())))
    .map((detector) => ({
      detector,
      scenario: scenarioById(detector.scenarioId)
    }))
    .filter((match) => match.scenario)
    .sort((a, b) => b.detector.priority - a.detector.priority);
  const seen = new Set();
  return matches.filter((match) => {
    if (seen.has(match.scenario.id)) {
      return false;
    }
    seen.add(match.scenario.id);
    return true;
  });
}

function renderStatusAnalysis(matches, hasInput = Boolean(statusPaste?.value.trim())) {
  if (!statusAnalysis) {
    return;
  }
  if (!hasInput) {
    statusAnalysis.innerHTML = `
      <div class="status-analysis-empty">
        <strong>No status pasted yet</strong>
        <p>Paste the output from <code>git status</code> to get a route through the map.</p>
      </div>
    `;
    return;
  }
  if (!matches.length) {
    statusAnalysis.innerHTML = `
      <div class="status-analysis-empty">
        <strong>No clear match</strong>
        <p>The parser looks for clean, staged, unstaged, untracked, ahead, behind, diverged, and conflict states. Run <code>git status</code> again and paste the full output.</p>
      </div>
    `;
    return;
  }

  const [primary, ...secondary] = matches;
  const scenario = primary.scenario;
  const nextCommands = filteredNextCommands(scenario);
  const hiddenRiskyCount = scenario.next.length - nextCommands.length;
  statusAnalysis.innerHTML = `
    <div class="status-analysis-card">
      <span class="analysis-kicker">Primary state</span>
      <strong>${escapeHtml(scenario.label)}</strong>
      <p>${escapeHtml(scenario.summary)}</p>
      <div class="status-helper-groups">
        <div>
          <span>Check</span>
          ${renderCommandPills(scenario.checks)}
        </div>
        <div>
          <span>Next</span>
          ${renderCommandPills(nextCommands)}
        </div>
      </div>
      ${hiddenRiskyCount ? `<small>${hiddenRiskyCount} risky option${hiddenRiskyCount === 1 ? "" : "s"} hidden.</small>` : ""}
      ${secondary.length ? `
        <div class="analysis-signals">
          <span>Also detected</span>
          ${secondary.map((match) => `<b>${escapeHtml(match.scenario.label)}</b>`).join("")}
        </div>
      ` : ""}
      <button class="status-helper-action" type="button" data-analysis-focus>Take me to <code>${escapeHtml(commandById(scenario.commandId)?.command || "the command")}</code></button>
    </div>
  `;
  statusAnalysis.querySelector("[data-analysis-focus]").addEventListener("click", () => {
    focusStatusScenario(scenario);
  });
}

function analyzeStatus(options = {}) {
  const shouldFocus = options.focus !== false;
  const matches = statusMatchesFromText(statusPaste?.value || "");
  renderStatusAnalysis(matches);
  if (shouldFocus && matches[0]) {
    focusStatusScenario(matches[0].scenario, { scroll: false });
  }
}

function currentJourney() {
  return commandJourneys.find((journey) => journey.id === activeJourneyId) || commandJourneys[0];
}

function commandTextForJourneyStep(step) {
  if (step.commandId) {
    return commandById(step.commandId)?.command || "";
  }
  return step.command || "";
}

function focusJourneyStep(step) {
  const command = step.commandId ? commandById(step.commandId) : null;
  const zone = step.zone || command?.from || "workspace";
  centerZoneInMap(zone);
  selectZone(zone, { pin: true, force: true });
  if (command && visibleCommands().some((item) => item.id === command.id)) {
    selectCommand(command.id);
  }
}

function setJourneyStep(index, options = {}) {
  const journey = currentJourney();
  if (!journey) {
    return;
  }
  activeJourneyStep = Math.max(0, Math.min(index, journey.steps.length - 1));
  renderJourney();
  if (options.focus !== false) {
    focusJourneyStep(journey.steps[activeJourneyStep]);
  }
}

function renderJourneyOptions() {
  if (!journeyChoice) {
    return;
  }
  journeyChoice.innerHTML = commandJourneys.map((journey) => `
    <option value="${escapeHtml(journey.id)}">${escapeHtml(journey.title)}</option>
  `).join("");
  journeyChoice.value = activeJourneyId;
}

function renderJourney() {
  if (!journeyCurrent || !journeySteps || !journeyReceipt) {
    return;
  }
  const journey = currentJourney();
  if (!journey) {
    journeyCurrent.innerHTML = "";
    journeySteps.innerHTML = "";
    journeyReceipt.innerHTML = "";
    return;
  }
  const step = journey.steps[activeJourneyStep] || journey.steps[0];
  const command = step.commandId ? commandById(step.commandId) : null;
  const commandText = commandTextForJourneyStep(step);
  journeyCurrent.style.setProperty("--journey-color", command?.color || zones[step.zone]?.color || "var(--blue)");
  journeyCurrent.innerHTML = `
    <span>Step ${activeJourneyStep + 1} of ${journey.steps.length}</span>
    <strong>${escapeHtml(step.title)}</strong>
    ${commandText ? `<code>${escapeHtml(commandText)}</code>` : ""}
    <p>${escapeHtml(step.note)}</p>
    ${command ? renderPreviewMarkup(command, "journey-preview") : ""}
  `;
  journeySteps.innerHTML = journey.steps.map((item, index) => {
    const itemCommand = item.commandId ? commandById(item.commandId) : null;
    const itemColor = itemCommand?.color || zones[item.zone]?.color || "var(--blue)";
    return `
      <li>
        <button type="button" data-journey-step="${index}" style="--journey-color: ${escapeHtml(itemColor)}" aria-current="${index === activeJourneyStep ? "step" : "false"}">
          <span>${index + 1}</span>
          <strong>${escapeHtml(item.title)}</strong>
        </button>
      </li>
    `;
  }).join("");
  journeyReceipt.innerHTML = `
    <span>Command receipt</span>
    <pre><code>${journey.steps.map(commandTextForJourneyStep).filter(Boolean).map(escapeHtml).join("\n")}</code></pre>
  `;
  journeySteps.querySelectorAll("[data-journey-step]").forEach((button) => {
    button.addEventListener("click", () => setJourneyStep(Number(button.dataset.journeyStep)));
  });
  if (journeyPrevButton) {
    journeyPrevButton.disabled = activeJourneyStep === 0;
  }
  if (journeyNextButton) {
    journeyNextButton.disabled = activeJourneyStep >= journey.steps.length - 1;
  }
}

function updateFlows() {
  const visible = visibleCommands();
  const visibleMap = visible.filter((item) => item.from !== item.to);
  if (pinnedCommandId && !visible.some((item) => item.id === pinnedCommandId)) {
    pinnedCommandId = null;
  }
  updateMapMetrics(visibleMap.length);
  map.classList.toggle("is-everything", displayMode === "all");
  map.classList.toggle("has-selection", displayMode !== "all" && Boolean(selectedZone));
  drawFlows(visibleMap);
  const items = new Set(visibleMap.map((item) => item.id));
  document.querySelectorAll("[data-command-id]").forEach((group) => {
    const show = items.has(group.dataset.commandId);
    group.querySelectorAll(".flow-line, .flow-ribbon, .flow-label, .flow-daily-marker, .flow-daily-marker-text").forEach((el) => {
      el.classList.toggle("is-visible", show);
    });
  });
  const relatedZones = new Set();
  const mainPathZones = new Set();
  visible.forEach((item) => {
    [item.from, item.to].forEach((zone) => relatedZones.add(zone));
    if (isDailyPathCommand(item)) {
      [item.from, item.to].forEach((zone) => mainPathZones.add(zone));
    }
  });
  if (selectedZone) {
    relatedZones.add(selectedZone);
  }
  document.querySelectorAll("[data-lifeline]").forEach((group) => {
    const involved = displayMode === "all" || relatedZones.has(group.dataset.lifeline);
    group.querySelectorAll(".lifeline").forEach((el) => el.classList.toggle("is-selected", involved));
  });
  zoneEls.forEach((el) => {
    el.classList.toggle("is-related", relatedZones.has(el.dataset.zone));
    el.classList.toggle("is-main-path", mainPathZones.has(el.dataset.zone));
  });
  updateMapJumps();
  renderCommands();
  setActiveCommand(null);
}

function setMode(mode) {
  displayMode = mode;
  modeButtons.forEach((item) => item.setAttribute("aria-pressed", String(item.dataset.mode === mode)));
}

function setRiskFilter(filter) {
  riskFilter = filter === "all" ? "all" : "safe";
  riskButtons.forEach((item) => {
    item.setAttribute("aria-pressed", String(item.dataset.riskFilter === riskFilter));
  });
}

function selectZone(zone, options = {}) {
  if (options.pin && pinnedZone === zone && !options.force) {
    selectedZone = null;
    pinnedZone = null;
    pinnedCommandId = null;
    setMode("focused");
    zoneEls.forEach((el) => el.classList.remove("is-selected", "is-pinned", "is-related", "is-main-path"));
    updateFlows();
    return;
  }
  selectedZone = zone;
  if (options.pin) {
    pinnedZone = zone;
  }
  setMode("focused");
  zoneEls.forEach((el) => {
    el.classList.toggle("is-selected", el.dataset.zone === zone);
    el.classList.toggle("is-pinned", el.dataset.zone === pinnedZone);
  });
  updateFlows();
}

zoneEls.forEach((zone) => {
  zone.addEventListener("mouseenter", () => {
    if (!pinnedZone) {
      selectZone(zone.dataset.zone);
    }
  });
  zone.addEventListener("focus", () => {
    if (!pinnedZone) {
      selectZone(zone.dataset.zone);
    }
  });
  zone.addEventListener("click", () => selectZone(zone.dataset.zone, { pin: true }));
  zone.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectZone(zone.dataset.zone, { pin: true });
    }
  });
});

modeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setMode(button.dataset.mode);
    if (displayMode === "all") {
      selectedZone = null;
      pinnedZone = null;
      zoneEls.forEach((el) => el.classList.remove("is-selected", "is-pinned"));
    }
    updateFlows();
  });
});

riskButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setRiskFilter(button.dataset.riskFilter);
    renderStatusHelper();
    analyzeStatus({ focus: false });
    updateFlows();
  });
});

if (statusHelperChoice) {
  statusHelperChoice.addEventListener("change", renderStatusHelper);
}

if (analyzeStatusButton) {
  analyzeStatusButton.addEventListener("click", () => analyzeStatus());
}

if (loadStatusSampleButton && statusPaste) {
  loadStatusSampleButton.addEventListener("click", () => {
    statusPaste.value = sampleStatusOutput;
    analyzeStatus();
  });
}

if (clearStatusButton && statusPaste) {
  clearStatusButton.addEventListener("click", () => {
    statusPaste.value = "";
    renderStatusAnalysis([], false);
    statusPaste.focus();
  });
}

if (statusPaste) {
  statusPaste.addEventListener("keydown", (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      analyzeStatus();
    }
  });
}

if (journeyChoice) {
  journeyChoice.addEventListener("change", () => {
    activeJourneyId = journeyChoice.value;
    activeJourneyStep = 0;
    renderJourney();
    const journey = currentJourney();
    if (journey) {
      focusJourneyStep(journey.steps[0]);
    }
  });
}

if (journeyPrevButton) {
  journeyPrevButton.addEventListener("click", () => setJourneyStep(activeJourneyStep - 1));
}

if (journeyNextButton) {
  journeyNextButton.addEventListener("click", () => setJourneyStep(activeJourneyStep + 1));
}

mapJumpButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const zone = button.dataset.jumpZone;
    centerZoneInMap(zone);
    if (selectedZone !== zone || pinnedZone !== zone) {
      selectZone(zone, { pin: true });
    }
  });
});

themeButtons.forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
});

setTheme(initialTheme());
setRiskFilter("safe");
renderStatusHelperOptions();
renderStatusAnalysis([], false);
renderJourneyOptions();
renderJourney();
drawLifelines();
selectZone("workspace");
window.requestAnimationFrame(() => centerZoneInMap("workspace"));
