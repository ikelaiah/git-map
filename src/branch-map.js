const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
const themeStorageKey = "git-map-theme";
const legacyThemeStorageKey = "git-helper-theme";
const graph = document.querySelector("#branch-graph");
const currentBranchLabel = document.querySelector("#current-branch");
const branchNameInput = document.querySelector("#branch-name");
const commitMessageInput = document.querySelector("#commit-message");
const createBranchButton = document.querySelector("#create-branch");
const addCommitButton = document.querySelector("#add-commit");
const mergeToMainButton = document.querySelector("#merge-to-main");
const mergeSelectedButton = document.querySelector("#merge-selected");
const simulateConflictButton = document.querySelector("#simulate-conflict");
const mergeSourceSelect = document.querySelector("#merge-source");
const mergeTargetSelect = document.querySelector("#merge-target");
const undoButton = document.querySelector("#undo-action");
const resetButton = document.querySelector("#reset-map");
const copyHistoryButton = document.querySelector("#copy-history");
const historyList = document.querySelector("#command-history");
const stageHint = document.querySelector("#stage-hint");
const selectedBaseLabel = document.querySelector("#selected-base");
const commitTargetLabel = document.querySelector("#commit-target");
const mergeHelperLabel = document.querySelector("#merge-helper");
const conflictHelperLabel = document.querySelector("#conflict-helper");

const {
  laneGap,
  commitGap,
  mainY,
  defaultBranchName,
  defaultCommitMessage,
  conflictBranchName,
  conflictFileName,
  colors,
  initialState,
  cloneState,
  slugifyBranchName,
  cleanMessage,
  suggestNextBranchName,
  createBranchCommands,
  commitCommands,
  conflictScenarioCommands,
  branchLabelMetrics
} = window.gitBranchMapModel;

let state = cloneState(initialState);
const undoStack = [];

function setTheme(theme) {
  const nextTheme = ["light", "dark", "system"].includes(theme) ? theme : "system";
  document.documentElement.dataset.theme = nextTheme;
  themeButtons.forEach((item) => {
    item.setAttribute("aria-pressed", String(item.dataset.themeChoice === nextTheme));
  });
  try {
    window.localStorage.setItem(themeStorageKey, nextTheme);
  } catch {
    // The page can still render without persisted preferences.
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

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function branchByName(name) {
  return state.branches.find((branch) => branch.name === name);
}

function commitById(id) {
  return state.commits.find((commit) => commit.id === id);
}

function isAncestor(ancestorId, commitId, visited = new Set()) {
  if (ancestorId === commitId) {
    return true;
  }
  if (visited.has(commitId)) {
    return false;
  }
  visited.add(commitId);
  const commit = commitById(commitId);
  if (!commit) {
    return false;
  }
  return commit.parents.some((parentId) => isAncestor(ancestorId, parentId, visited));
}

function commitsForBranch(branchName) {
  return state.commits
    .filter((commit) => commit.branch === branchName)
    .sort((a, b) => a.x - b.x);
}

function pushUndo() {
  undoStack.push(cloneState(state));
  undoButton.disabled = false;
}

function addCommandGroup(title, commands, note) {
  state.commandGroups.push({ title, commands, note });
}

function selectCommit(commitId) {
  const commit = commitById(commitId);
  if (!commit) {
    return;
  }
  state.selectedCommit = commitId;
  state.selectedBranch = commit.branch;
  if (branchByName(commit.branch)) {
    state.currentBranch = commit.branch;
  }
  render();
}

function selectBranch(branchName) {
  if (!branchByName(branchName)) {
    return;
  }
  state.selectedBranch = branchName;
  state.currentBranch = branchName;
  state.selectedCommit = branchByName(branchName).head;
  render();
}

function createBranch() {
  const selectedCommit = commitById(state.selectedCommit);
  const branchName = slugifyBranchName(branchNameInput.value);
  if (!selectedCommit) {
    showHint("Select a commit before creating a branch.");
    return;
  }
  if (!branchName) {
    showHint("Enter a branch name first.");
    return;
  }
  if (branchByName(branchName)) {
    showHint(`Branch ${branchName} already exists.`);
    return;
  }

  pushUndo();
  const lane = state.nextLane;
  const branch = {
    name: branchName,
    color: colors[lane % colors.length],
    lane,
    head: selectedCommit.id,
    base: selectedCommit.id
  };
  state.branches.push(branch);
  state.nextLane += 1;
  state.currentBranch = branchName;
  state.selectedBranch = branchName;
  state.selectedCommit = selectedCommit.id;
  branchNameInput.value = suggestNextBranchName(branchName);
  addCommandGroup(`Create ${branchName}`, createBranchCommands(branchName, selectedCommit.id), `Branch ${branchName} now points at ${selectedCommit.id}.`);
  render();
}

function addCommit() {
  const branch = branchByName(state.currentBranch);
  if (!branch) {
    return;
  }

  pushUndo();
  const parent = commitById(branch.head);
  const branchCommits = commitsForBranch(branch.name).filter((commit) => commit.type !== "merge");
  const firstBranchCommit = branch.name === "main" ? null : branchCommits[0];
  const x = parent.branch === branch.name
    ? parent.x + commitGap
    : parent.x + commitGap;
  const y = branch.name === "main" ? mainY : mainY + branch.lane * laneGap;
  const message = cleanMessage(commitMessageInput.value);
  const commit = {
    id: `c${state.nextCommitNumber}`,
    branch: branch.name,
    message,
    parents: [branch.head],
    x: Math.max(x, firstBranchCommit ? firstBranchCommit.x + commitGap * branchCommits.length : x),
    y,
    type: "commit"
  };
  state.nextCommitNumber += 1;
  state.commits.push(commit);
  branch.head = commit.id;
  state.selectedCommit = commit.id;
  state.selectedBranch = branch.name;
  addCommandGroup(`Commit on ${branch.name}`, commitCommands(branch.name, message), `Added ${commit.id} to ${branch.name}.`);
  render();
}

function mergeToMain() {
  if (state.currentBranch === "main") {
    showHint("Select a feature branch before merging back into main.");
    return;
  }
  mergeBranches(state.currentBranch, "main");
}

function mergeSelected() {
  const source = mergeSourceSelect.value;
  const target = mergeTargetSelect.value;
  mergeBranches(source, target);
}

function mergeBranches(sourceName, targetName) {
  const source = branchByName(sourceName);
  const target = branchByName(targetName);
  if (!source || !target || sourceName === targetName) {
    showHint("Choose two different branches to merge.");
    return;
  }

  const sourceHead = commitById(source.head);
  const targetHead = commitById(target.head);
  if (!sourceHead || !targetHead) {
    return;
  }
  if (isAncestor(source.head, target.head)) {
    showHint(`${source.name} has no commits that ${target.name} needs yet.`);
    return;
  }
  const mergeCommand = isAncestor(target.head, source.head)
    ? `git merge --no-ff ${source.name}`
    : `git merge ${source.name}`;

  pushUndo();
  const y = target.name === "main" ? mainY : mainY + target.lane * laneGap;
  const x = Math.max(targetHead.x, sourceHead.x) + commitGap;
  const commit = {
    id: `c${state.nextCommitNumber}`,
    branch: target.name,
    message: `Merge ${source.name}`,
    parents: [target.head, source.head],
    mergedFrom: source.name,
    x,
    y,
    type: "merge"
  };
  state.nextCommitNumber += 1;
  state.commits.push(commit);
  target.head = commit.id;
  state.currentBranch = target.name;
  state.selectedBranch = target.name;
  state.selectedCommit = commit.id;
  addCommandGroup(`Merge ${source.name} into ${target.name}`, [
    `git switch ${target.name}`,
    mergeCommand
  ], `Created merge commit ${commit.id} on ${target.name}.`);
  render();
}

function uniqueBranchName(baseName) {
  let candidate = baseName;
  let suffix = 2;
  while (branchByName(candidate)) {
    candidate = `${baseName}-${suffix}`;
    suffix += 1;
  }
  return candidate;
}

function nextCommitId() {
  const id = `c${state.nextCommitNumber}`;
  state.nextCommitNumber += 1;
  return id;
}

function createConflictScenario() {
  const mainBranch = branchByName("main");
  const baseCommit = mainBranch ? commitById(mainBranch.head) : null;
  if (!mainBranch || !baseCommit) {
    showHint("Reset the sandbox before creating a conflict scenario.");
    return;
  }

  pushUndo();
  const branchName = uniqueBranchName(conflictBranchName);
  const lane = state.nextLane;
  const branch = {
    name: branchName,
    color: colors[lane % colors.length],
    lane,
    head: baseCommit.id,
    base: baseCommit.id
  };
  state.nextLane += 1;
  state.branches.push(branch);

  const branchCommit = {
    id: nextCommitId(),
    branch: branch.name,
    message: `Edit ${conflictFileName} on ${branch.name}`,
    parents: [baseCommit.id],
    x: baseCommit.x + commitGap,
    y: mainY + branch.lane * laneGap,
    type: "commit"
  };
  state.commits.push(branchCommit);
  branch.head = branchCommit.id;

  const mainCommit = {
    id: nextCommitId(),
    branch: "main",
    message: `Edit ${conflictFileName} on main`,
    parents: [baseCommit.id],
    x: baseCommit.x + commitGap,
    y: mainY,
    type: "commit"
  };
  state.commits.push(mainCommit);
  mainBranch.head = mainCommit.id;

  const conflictCommit = {
    id: nextCommitId(),
    branch: "main",
    message: "Resolve conflict",
    parents: [mainBranch.head, branch.head],
    mergedFrom: branch.name,
    x: Math.max(mainCommit.x, branchCommit.x) + commitGap,
    y: mainY,
    type: "merge",
    conflict: true
  };
  state.commits.push(conflictCommit);
  mainBranch.head = conflictCommit.id;
  state.currentBranch = "main";
  state.selectedBranch = "main";
  state.selectedCommit = conflictCommit.id;
  addCommandGroup(
    `Resolve ${branch.name} conflict`,
    conflictScenarioCommands(branch.name, baseCommit.id),
    `Resolved ${conflictFileName} after Git reported a merge conflict.`
  );
  render();
}

function undo() {
  const previous = undoStack.pop();
  if (!previous) {
    return;
  }
  state = previous;
  undoButton.disabled = undoStack.length === 0;
  render();
}

function reset() {
  pushUndo();
  state = cloneState(initialState);
  branchNameInput.value = defaultBranchName;
  commitMessageInput.value = defaultCommitMessage;
  render();
}

async function copyHistory() {
  const commands = state.commandGroups.flatMap((group) => group.commands).join("\n");
  try {
    await navigator.clipboard.writeText(commands);
    copyHistoryButton.textContent = "OK";
    window.setTimeout(() => {
      copyHistoryButton.textContent = "Copy";
    }, 1200);
  } catch {
    copyHistoryButton.textContent = "Copy";
  }
}

function showHint(message) {
  stageHint.innerHTML = escapeHtml(message);
}

function createSvgElement(name, attributes = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", name);
  Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function branchPath(branch) {
  if (branch.name === "main") {
    const commits = commitsForBranch("main");
    return commits.length ? `M ${commits[0].x} ${mainY} L ${commits[commits.length - 1].x} ${mainY}` : "";
  }

  const base = commitById(branch.base);
  const branchCommits = commitsForBranch(branch.name);
  const laneY = mainY + branch.lane * laneGap;
  const endX = branchCommits.length ? branchCommits[branchCommits.length - 1].x : base.x + 86;
  return `M ${base.x} ${base.y} C ${base.x + 32} ${base.y}, ${base.x + 38} ${laneY}, ${base.x + 72} ${laneY} L ${endX} ${laneY}`;
}

function parentConnection(commit) {
  if (commit.parents.length < 2) {
    return "";
  }
  const source = commitById(commit.parents[1]);
  return `M ${source.x} ${source.y} C ${source.x + 44} ${source.y}, ${commit.x - 54} ${commit.y}, ${commit.x} ${commit.y}`;
}

function renderGraph() {
  const graphWidth = Math.max(980, Math.max(...state.commits.map((commit) => commit.x)) + 150);
  const graphHeight = Math.max(420, mainY + Math.max(...state.branches.map((branch) => branch.lane)) * laneGap + 150);
  graph.setAttribute("viewBox", `0 0 ${graphWidth} ${graphHeight}`);
  graph.style.width = `max(${graphWidth}px, 100%)`;
  graph.innerHTML = "";
  graph.append(
    createSvgElement("title", { id: "graph-title" }),
    createSvgElement("desc", { id: "graph-desc" })
  );
  graph.querySelector("title").textContent = "Interactive Git branch graph";
  graph.querySelector("desc").textContent = "A visual Git graph with clickable commits and branch lanes.";

  state.branches.forEach((branch) => {
    const path = createSvgElement("path", {
      d: branchPath(branch),
      class: `branch-line${branch.name === state.selectedBranch ? " is-selected" : ""}`,
      stroke: branch.color
    });
    graph.append(path);
  });

  state.commits.filter((commit) => commit.type === "merge").forEach((commit) => {
    const path = createSvgElement("path", {
      d: parentConnection(commit),
      class: "merge-line",
      stroke: branchByName(commit.mergedFrom)?.color || "var(--green)"
    });
    graph.append(path);
  });

  state.branches.forEach((branch) => {
    const branchHead = commitById(branch.head);
    const labelMetrics = branchLabelMetrics(branchHead.x, branch.name, graphWidth);
    const labelX = labelMetrics.x;
    const label = createSvgElement("g", {
      class: `branch-label${branch.name === state.currentBranch ? " is-current" : ""}`,
      tabindex: "0",
      role: "button",
      "aria-label": `Switch to ${branch.name}`
    });
    label.dataset.branchName = branch.name;
    const y = branch.name === "main" ? mainY - 42 : mainY + branch.lane * laneGap - 42;
    const text = createSvgElement("text", { x: labelX + 13, y: y + 20 });
    text.textContent = branch.name;
    label.append(
      createSvgElement("rect", { x: labelX, y, width: labelMetrics.width, height: 30, rx: 8, fill: branch.color }),
      text
    );
    label.addEventListener("click", () => selectBranch(branch.name));
    label.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectBranch(branch.name);
      }
    });
    graph.append(label);
  });

  state.commits.forEach((commit) => {
    const branch = branchByName(commit.branch) || branchByName("main");
    const group = createSvgElement("g", {
      class: `commit-node${commit.id === state.selectedCommit ? " is-selected" : ""}${commit.type === "merge" ? " is-merge" : ""}${commit.conflict ? " is-conflict" : ""}`,
      tabindex: "0",
      role: "button",
      "aria-label": `${commit.id}: ${commit.message}`
    });
    group.dataset.commitId = commit.id;
    group.append(
      createSvgElement("circle", { cx: commit.x, cy: commit.y, r: commit.type === "merge" ? 15 : 13, fill: commit.conflict ? "var(--warning-ink)" : branch.color }),
      createSvgElement("circle", { cx: commit.x, cy: commit.y, r: 5, fill: "var(--panel)" })
    );
    const idText = createSvgElement("text", { x: commit.x, y: commit.y + 35, "text-anchor": "middle" });
    idText.textContent = commit.id;
    const msgText = createSvgElement("text", { x: commit.x, y: commit.y + 53, "text-anchor": "middle" });
    msgText.textContent = commit.message;
    group.append(idText, msgText);
    group.addEventListener("click", () => selectCommit(commit.id));
    group.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectCommit(commit.id);
      }
    });
    graph.append(group);
  });
}

function renderControls() {
  currentBranchLabel.textContent = state.currentBranch;
  const selectedCommit = commitById(state.selectedCommit);
  const branchOptions = state.branches.map((branch) => `<option value="${escapeHtml(branch.name)}">${escapeHtml(branch.name)}</option>`).join("");
  mergeSourceSelect.innerHTML = branchOptions;
  mergeTargetSelect.innerHTML = branchOptions;
  mergeSourceSelect.value = state.currentBranch === "main"
    ? state.branches.find((branch) => branch.name !== "main")?.name || "main"
    : state.currentBranch;
  mergeTargetSelect.value = state.currentBranch === "main" ? "main" : "main";
  selectedBaseLabel.textContent = selectedCommit
    ? `From ${selectedCommit.id} on ${selectedCommit.branch}`
    : "Select a commit";
  commitTargetLabel.textContent = `On ${state.currentBranch}`;
  mergeHelperLabel.textContent = state.branches.length < 2
    ? "Create a branch first"
    : state.currentBranch === "main"
      ? "Choose a source below"
      : `${state.currentBranch} can merge into main`;
  conflictHelperLabel.textContent = state.branches.some((branch) => branch.name.startsWith(conflictBranchName))
    ? "Add another scenario"
    : "Same-file edits";
  createBranchButton.disabled = !selectedCommit;
  mergeToMainButton.disabled = state.currentBranch === "main";
  mergeSelectedButton.disabled = state.branches.length < 2;
  createBranchButton.textContent = selectedCommit
    ? `Create branch from ${selectedCommit.id}`
    : "Select a commit first";
  addCommitButton.textContent = `Commit to ${state.currentBranch}`;
  mergeToMainButton.textContent = state.currentBranch === "main"
    ? "Select a branch to merge to main"
    : `Merge ${state.currentBranch} into main`;
  undoButton.disabled = undoStack.length === 0;
  showHint(state.currentBranch === "main"
    ? "Click any commit to create a branch from that point, or add another commit to main."
    : `Working on ${state.currentBranch}. Add commits, switch branches, or merge it back into main.`);
}

function renderHistory() {
  historyList.innerHTML = state.commandGroups.map((group) => `
    <li>
      <strong>${escapeHtml(group.title)}</strong>
      <pre><code>${group.commands.map(escapeHtml).join("\n")}</code></pre>
      <span>${escapeHtml(group.note)}</span>
    </li>
  `).join("");
}

function render() {
  renderGraph();
  renderControls();
  renderHistory();
}

themeButtons.forEach((button) => {
  button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
});

createBranchButton.addEventListener("click", createBranch);
addCommitButton.addEventListener("click", addCommit);
mergeToMainButton.addEventListener("click", mergeToMain);
mergeSelectedButton.addEventListener("click", mergeSelected);
simulateConflictButton.addEventListener("click", createConflictScenario);
undoButton.addEventListener("click", undo);
resetButton.addEventListener("click", reset);
copyHistoryButton.addEventListener("click", copyHistory);

setTheme(initialTheme());
render();
