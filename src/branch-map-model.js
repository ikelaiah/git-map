(() => {
  const laneGap = 72;
  const startX = 88;
  const commitGap = 130;
  const mainY = 98;
  const defaultBranchName = "feature-a";
  const defaultCommitMessage = "Add first change";
  const conflictBranchName = "conflict-demo";
  const conflictFileName = "index.html";
  const colors = ["#2f6fed", "#12836f", "#b56b12", "#7556f6", "#cf3f49", "#0f766e"];

  const initialState = {
    currentBranch: "main",
    selectedCommit: "c2",
    selectedBranch: "main",
    commandGroups: [
      {
        title: "Start repository",
        commands: ["git switch main"],
        note: "The sandbox starts on main."
      }
    ],
    branches: [
      { name: "main", color: "var(--blue)", lane: 0, head: "c3", base: null }
    ],
    commits: [
      { id: "c1", branch: "main", message: "Initial commit", parents: [], x: startX, y: mainY, type: "commit" },
      { id: "c2", branch: "main", message: "Set up app shell", parents: ["c1"], x: startX + commitGap, y: mainY, type: "commit" },
      { id: "c3", branch: "main", message: "Document workflow", parents: ["c2"], x: startX + commitGap * 2, y: mainY, type: "commit" }
    ],
    nextCommitNumber: 4,
    nextLane: 1
  };

  function cloneState(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function slugifyBranchName(value) {
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._/-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/\/{2,}/g, "/");
  }

  function cleanMessage(value) {
    return value.trim().replace(/\s+/g, " ") || "Update feature";
  }

  function commandSafeMessage(value) {
    return value.replace(/"/g, "'");
  }

  function suggestNextBranchName(previousName) {
    const letterMatch = previousName.match(/^(.*-)([a-z])$/);
    if (letterMatch && letterMatch[2] !== "z") {
      return `${letterMatch[1]}${String.fromCharCode(letterMatch[2].charCodeAt(0) + 1)}`;
    }
    const match = previousName.match(/^(.*?)(\d+)$/);
    if (match) {
      return `${match[1]}${Number(match[2]) + 1}`;
    }
    return `${previousName}-2`;
  }

  function createBranchCommands(branchName, commitId) {
    return [
      "git switch main",
      `git switch -c ${branchName} ${commitId}`
    ];
  }

  function commitCommands(branchName, message) {
    return [
      `git switch ${branchName}`,
      `git commit -m "${commandSafeMessage(message)}"`
    ];
  }

  function conflictScenarioCommands(branchName, baseCommitId, fileName = conflictFileName) {
    return [
      `git switch -c ${branchName} ${baseCommitId}`,
      `git commit -m "Edit ${fileName} on ${branchName}"`,
      "git switch main",
      `git commit -m "Edit ${fileName} on main"`,
      `git merge ${branchName}`,
      `# CONFLICT (content): Merge conflict in ${fileName}`,
      "git status",
      "git diff",
      `git add ${fileName}`,
      "git commit"
    ];
  }

  function branchLabelMetrics(headX, branchName, graphWidth, padding = 18) {
    const width = Math.max(74, branchName.length * 8 + 34);
    const maxX = Math.max(padding, graphWidth - width - padding);
    return {
      width,
      x: Math.min(headX + 18, maxX)
    };
  }

  function isNonEmptyString(value) {
    return typeof value === "string" && value.trim().length > 0;
  }

  function validateBranchState(snapshot) {
    const errors = [];
    if (!snapshot || typeof snapshot !== "object") {
      return ["Branch state is missing."];
    }

    const branches = Array.isArray(snapshot.branches) ? snapshot.branches : [];
    const commits = Array.isArray(snapshot.commits) ? snapshot.commits : [];
    const commandGroups = Array.isArray(snapshot.commandGroups) ? snapshot.commandGroups : [];
    const branchNames = new Set();
    const commitIds = new Set();

    if (!branches.some((branch) => branch.name === "main")) {
      errors.push("Branch state is missing main.");
    }

    commits.forEach((commit) => {
      if (!isNonEmptyString(commit.id)) {
        errors.push("A commit is missing id.");
        return;
      }
      if (commitIds.has(commit.id)) {
        errors.push(`Duplicate commit id "${commit.id}".`);
      }
      commitIds.add(commit.id);
    });

    branches.forEach((branch) => {
      if (!isNonEmptyString(branch.name)) {
        errors.push("A branch is missing name.");
        return;
      }
      if (branchNames.has(branch.name)) {
        errors.push(`Duplicate branch name "${branch.name}".`);
      }
      branchNames.add(branch.name);
      if (typeof branch.lane !== "number") {
        errors.push(`Branch "${branch.name}" is missing numeric lane.`);
      }
      if (!commitIds.has(branch.head)) {
        errors.push(`Branch "${branch.name}" points at unknown head "${branch.head}".`);
      }
      if (branch.name !== "main" && !commitIds.has(branch.base)) {
        errors.push(`Branch "${branch.name}" points at unknown base "${branch.base}".`);
      }
    });

    commits.forEach((commit) => {
      if (!branchNames.has(commit.branch)) {
        errors.push(`Commit "${commit.id}" references unknown branch "${commit.branch}".`);
      }
      if (!isNonEmptyString(commit.message)) {
        errors.push(`Commit "${commit.id}" is missing message.`);
      }
      if (typeof commit.x !== "number" || typeof commit.y !== "number") {
        errors.push(`Commit "${commit.id}" is missing numeric coordinates.`);
      }
      if (!Array.isArray(commit.parents)) {
        errors.push(`Commit "${commit.id}" is missing parents array.`);
      } else {
        commit.parents.forEach((parentId) => {
          if (!commitIds.has(parentId)) {
            errors.push(`Commit "${commit.id}" references unknown parent "${parentId}".`);
          }
        });
      }
      if ((commit.type === "merge" || commit.conflict) && (!Array.isArray(commit.parents) || commit.parents.length < 2)) {
        errors.push(`Merge commit "${commit.id}" must have two parents.`);
      }
      if (commit.mergedFrom && !branchNames.has(commit.mergedFrom)) {
        errors.push(`Merge commit "${commit.id}" references unknown source "${commit.mergedFrom}".`);
      }
    });

    if (!branchNames.has(snapshot.currentBranch)) {
      errors.push(`Current branch "${snapshot.currentBranch}" is unknown.`);
    }
    if (!branchNames.has(snapshot.selectedBranch)) {
      errors.push(`Selected branch "${snapshot.selectedBranch}" is unknown.`);
    }
    if (!commitIds.has(snapshot.selectedCommit)) {
      errors.push(`Selected commit "${snapshot.selectedCommit}" is unknown.`);
    }
    if (typeof snapshot.nextLane !== "number" || snapshot.nextLane <= Math.max(...branches.map((branch) => branch.lane))) {
      errors.push("nextLane must be greater than the highest branch lane.");
    }

    const numberedCommits = commits
      .map((commit) => Number(commit.id.match(/^c(\d+)$/)?.[1]))
      .filter(Number.isFinite);
    if (typeof snapshot.nextCommitNumber !== "number" || snapshot.nextCommitNumber <= Math.max(...numberedCommits)) {
      errors.push("nextCommitNumber must be greater than the highest commit number.");
    }

    commandGroups.forEach((group, index) => {
      if (!isNonEmptyString(group.title) || !isNonEmptyString(group.note)) {
        errors.push(`Command group ${index} is missing title or note.`);
      }
      if (!Array.isArray(group.commands) || !group.commands.every(isNonEmptyString)) {
        errors.push(`Command group ${index} is missing commands.`);
      }
    });

    return errors;
  }

  window.gitBranchMapModel = {
    laneGap,
    startX,
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
    branchLabelMetrics,
    validateBranchState
  };
})();
