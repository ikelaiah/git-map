const {
  zones,
  mainPathCommandIds,
  workspaceFocusedCommandIds,
  commands,
  toolCommands
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
const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
const themeStorageKey = "git-map-theme";
const legacyThemeStorageKey = "git-helper-theme";
let selectedZone = null;
let pinnedZone = null;
let displayMode = "focused";
let pinnedCommandId = null;

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
  return value.replace(/[&<>"']/g, (char) => ({
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
  if (displayMode === "all") {
    return commands;
  }
  if (!selectedZone) {
    return [];
  }
  if (selectedZone === "workspace") {
    return commands.filter((item) => workspaceFocusedCommandIds.has(item.id));
  }
  return commands.filter((item) => item.zones.includes(selectedZone));
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

function selectCommand(commandId) {
  pinnedCommandId = commandId;
  setActiveCommand(commandId);
  const card = commandList.querySelector(`[data-command-id="${commandId}"]`);
  if (card) {
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });
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
  const tools = key ? toolCommands[key] || [] : [];
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

function selectZone(zone, options = {}) {
  if (options.pin && pinnedZone === zone) {
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
drawLifelines();
selectZone("workspace");
window.requestAnimationFrame(() => centerZoneInMap("workspace"));
