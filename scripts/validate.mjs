import fs from "node:fs";
import vm from "node:vm";
import { validatePanicData } from "./panic-validator.mjs";

const errors = [];
const dataCode = fs.readFileSync("src/data.js", "utf8");
const branchModelCode = fs.readFileSync("src/branch-map-model.js", "utf8");
const panicDataCode = fs.readFileSync("src/panic-data.js", "utf8");
const versionCode = fs.readFileSync("src/version.js", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const changelog = fs.readFileSync("CHANGELOG.md", "utf8");
const indexHtml = fs.readFileSync("index.html", "utf8");
const branchHtml = fs.readFileSync("branch-map.html", "utf8");
const panicHtml = fs.readFileSync("panic.html", "utf8");
const context = { window: {} };

vm.createContext(context);
vm.runInContext(dataCode, context, { filename: "src/data.js" });
vm.runInContext(branchModelCode, context, { filename: "src/branch-map-model.js" });
vm.runInContext(panicDataCode, context, { filename: "src/panic-data.js" });

const data = context.window.gitMapData;
const branchModel = context.window.gitBranchMapModel;
const panicData = context.window.panicData;
const version = versionCode.match(/const version = "([^"]+)";/)?.[1];

function fail(message) {
  errors.push(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

if (!version) {
  fail("src/version.js is missing a string version constant.");
} else {
  if (!readme.includes(`Version-${version}`)) {
    fail(`README version badge does not match src/version.js (${version}).`);
  }
  if (!changelog.includes(`## [${version}]`)) {
    fail(`CHANGELOG is missing an entry for src/version.js (${version}).`);
  }
  [
    ["index.html", indexHtml],
    ["branch-map.html", branchHtml],
    ["panic.html", panicHtml]
  ].forEach(([name, html]) => {
    if (!html.includes('class="app-version"')) {
      fail(`${name} is missing an app-version label.`);
    }
    if (!html.includes('src="src/version.js"')) {
      fail(`${name} does not load src/version.js.`);
    }
    if (html.includes(`>v${version}<`)) {
      fail(`${name} hardcodes v${version} instead of using src/version.js.`);
    }
  });
}

if (!data) {
  fail("src/data.js did not expose window.gitMapData.");
} else {
  const zoneKeys = new Set(Object.keys(data.zones || {}));
  const commandIds = new Set();
  const commandStrings = new Set();
  const toolCommandStrings = new Set();

  Object.entries(data.zones || {}).forEach(([key, zone]) => {
    ["label", "icon", "color", "description", "command", "summary", "next"].forEach((field) => {
      if (!isNonEmptyString(zone[field])) {
        fail(`Zone "${key}" is missing ${field}.`);
      }
    });
    if (typeof zone.x !== "number") {
      fail(`Zone "${key}" is missing numeric x coordinate.`);
    }
    if (!Array.isArray(zone.nextCommands)) {
      fail(`Zone "${key}" is missing nextCommands array.`);
    }
  });

  (data.commands || []).forEach((command) => {
    if (!isNonEmptyString(command.id)) {
      fail("A command is missing id.");
      return;
    }
    if (commandIds.has(command.id)) {
      fail(`Duplicate command id "${command.id}".`);
    }
    commandIds.add(command.id);
    commandStrings.add(command.command);

    ["command", "title", "from", "to", "color", "note"].forEach((field) => {
      if (!isNonEmptyString(command[field])) {
        fail(`Command "${command.id}" is missing ${field}.`);
      }
    });
    ["from", "to"].forEach((field) => {
      if (!zoneKeys.has(command[field])) {
        fail(`Command "${command.id}" references unknown ${field} zone "${command[field]}".`);
      }
    });
    if (!Array.isArray(command.zones) || command.zones.length === 0) {
      fail(`Command "${command.id}" is missing zones array.`);
    } else {
      command.zones.forEach((zone) => {
        if (!zoneKeys.has(zone)) {
          fail(`Command "${command.id}" references unknown related zone "${zone}".`);
        }
      });
      [command.from, command.to].forEach((zone) => {
        if (!command.zones.includes(zone)) {
          fail(`Command "${command.id}" zones[] should include "${zone}".`);
        }
      });
    }
    if (command.risk && !isNonEmptyString(command.caution)) {
      fail(`Risky command "${command.id}" is missing caution copy.`);
    }
    if (!command.preview || typeof command.preview !== "object") {
      fail(`Command "${command.id}" is missing before/after preview data.`);
    } else {
      ["before", "after", "effect"].forEach((field) => {
        if (!isNonEmptyString(command.preview[field])) {
          fail(`Command "${command.id}" preview is missing ${field}.`);
        }
      });
    }
  });

  ["mainPathCommandIds", "workspaceFocusedCommandIds"].forEach((setName) => {
    Array.from(data[setName] || []).forEach((id) => {
      if (!commandIds.has(id)) {
        fail(`${setName} references unknown command id "${id}".`);
      }
    });
  });

  Object.entries(data.toolCommands || {}).forEach(([key, tools]) => {
    if (key !== "all" && !zoneKeys.has(key)) {
      fail(`toolCommands has unknown key "${key}".`);
    }
    if (!Array.isArray(tools)) {
      fail(`toolCommands.${key} is not an array.`);
      return;
    }
    tools.forEach((tool, index) => {
      if (!isNonEmptyString(tool.command) || !isNonEmptyString(tool.note)) {
        fail(`toolCommands.${key}[${index}] is missing command or note.`);
      }
      toolCommandStrings.add(tool.command);
    });
  });

  const statusScenarioIds = new Set();
  (data.statusScenarios || []).forEach((scenario) => {
    if (!isNonEmptyString(scenario.id)) {
      fail("A status scenario is missing id.");
      return;
    }
    if (statusScenarioIds.has(scenario.id)) {
      fail(`Duplicate status scenario id "${scenario.id}".`);
    }
    statusScenarioIds.add(scenario.id);
    ["label", "summary", "zone", "commandId"].forEach((field) => {
      if (!isNonEmptyString(scenario[field])) {
        fail(`Status scenario "${scenario.id}" is missing ${field}.`);
      }
    });
    if (!zoneKeys.has(scenario.zone)) {
      fail(`Status scenario "${scenario.id}" references unknown zone "${scenario.zone}".`);
    }
    if (!commandIds.has(scenario.commandId)) {
      fail(`Status scenario "${scenario.id}" references unknown command id "${scenario.commandId}".`);
    }
    ["checks", "next"].forEach((field) => {
      if (!Array.isArray(scenario[field]) || scenario[field].length === 0) {
        fail(`Status scenario "${scenario.id}" is missing ${field} commands.`);
      } else {
        scenario[field].forEach((command) => {
          if (!isNonEmptyString(command)) {
            fail(`Status scenario "${scenario.id}" has an empty ${field} command.`);
          }
        });
      }
    });
  });

  (data.statusDetectors || []).forEach((detector, index) => {
    if (!isNonEmptyString(detector.scenarioId)) {
      fail(`Status detector ${index} is missing scenarioId.`);
      return;
    }
    if (!statusScenarioIds.has(detector.scenarioId)) {
      fail(`Status detector ${index} references unknown scenario "${detector.scenarioId}".`);
    }
    if (!isNonEmptyString(detector.label)) {
      fail(`Status detector ${index} is missing label.`);
    }
    if (typeof detector.priority !== "number") {
      fail(`Status detector "${detector.scenarioId}" is missing numeric priority.`);
    }
    if (!Array.isArray(detector.patterns) || detector.patterns.length === 0 || !detector.patterns.every(isNonEmptyString)) {
      fail(`Status detector "${detector.scenarioId}" is missing string patterns.`);
    }
  });

  (data.commandJourneys || []).forEach((journey, journeyIndex) => {
    if (!isNonEmptyString(journey.id)) {
      fail(`Command journey ${journeyIndex} is missing id.`);
      return;
    }
    ["title", "summary"].forEach((field) => {
      if (!isNonEmptyString(journey[field])) {
        fail(`Command journey "${journey.id}" is missing ${field}.`);
      }
    });
    if (!Array.isArray(journey.steps) || journey.steps.length === 0) {
      fail(`Command journey "${journey.id}" is missing steps.`);
      return;
    }
    journey.steps.forEach((step, stepIndex) => {
      if (!isNonEmptyString(step.title) || !isNonEmptyString(step.note)) {
        fail(`Command journey "${journey.id}" step ${stepIndex} is missing title or note.`);
      }
      if (!isNonEmptyString(step.zone) || !zoneKeys.has(step.zone)) {
        fail(`Command journey "${journey.id}" step ${stepIndex} references unknown zone "${step.zone}".`);
      }
      if (step.commandId && !commandIds.has(step.commandId)) {
        fail(`Command journey "${journey.id}" step ${stepIndex} references unknown command "${step.commandId}".`);
      }
      if (!step.commandId && !isNonEmptyString(step.command)) {
        fail(`Command journey "${journey.id}" step ${stepIndex} needs commandId or command.`);
      }
    });
  });

  Object.entries(data.zones || {}).forEach(([key, zone]) => {
    (zone.nextCommands || []).forEach((command) => {
      if (!commandStrings.has(command) && !toolCommandStrings.has(command)) {
        fail(`Zone "${key}" nextCommands references unknown command "${command}".`);
      }
    });
  });

  const commandCoverage = readme.split("## 🧰 Command Coverage")[1]?.split("\n## ")[0] || "";
  const documentedCommands = [...commandCoverage.matchAll(/^- `([^`]+)`:/gm)].map((match) => match[1]);
  documentedCommands.forEach((command) => {
    if (!commandStrings.has(command) && !toolCommandStrings.has(command)) {
      fail(`README documents unknown command "${command}".`);
    }
  });
}

if (!branchModel) {
  fail("src/branch-map-model.js did not expose window.gitBranchMapModel.");
} else {
  branchModel.validateBranchState(branchModel.initialState).forEach((error) => {
    fail(`Initial branch sandbox state: ${error}`);
  });

  const createCommands = branchModel.createBranchCommands("feature-a", "c2");
  if (createCommands[0] !== "git switch -c feature-a c2") {
    fail("Branch creation command must include the selected base commit.");
  }

  const commitCommands = branchModel.commitCommands("feature-a", "Use \"quoted\" message");
  if (!commitCommands.includes("git add <file>")) {
    fail("Commit command generation should stage a file before committing.");
  }
  if (commitCommands.at(-1) !== "git commit -m \"Use 'quoted' message\"") {
    fail("Commit command generation should keep generated shell quoting valid.");
  }

  [
    ["Feature A", "feature-a"],
    ["/bad//name.lock.", "bad/name-lock"],
    ["@", ""],
    ["bug@{one}", "bug-one}"]
  ].forEach(([input, expected]) => {
    const actual = branchModel.slugifyBranchName(input);
    if (actual !== expected) {
      fail(`Branch name cleanup expected "${input}" to become "${expected}", got "${actual}".`);
    }
  });

  const conflictCommands = branchModel.conflictScenarioCommands("conflict-demo", "c3");
  [
    "git switch -c conflict-demo c3",
    "# edit index.html",
    "git add index.html",
    "git merge conflict-demo",
    "# CONFLICT (content): Merge conflict in index.html",
    "git status",
    "git diff",
    "git add index.html",
    "git commit"
  ].forEach((command) => {
    if (!conflictCommands.includes(command)) {
      fail(`Conflict scenario is missing "${command}".`);
    }
  });

  const label = branchModel.branchLabelMetrics(1460, "feature-long-name", 1500);
  if (label.x < 18 || label.x + label.width > 1482) {
    fail("Branch label positioning should stay inside the graph viewBox.");
  }

  const conflictState = branchModel.cloneState(branchModel.initialState);
  conflictState.branches.push({ name: "conflict-demo", color: "#12836f", lane: 1, head: "c4", base: "c3" });
  conflictState.commits.push(
    { id: "c4", branch: "conflict-demo", message: "Edit index.html on conflict-demo", parents: ["c3"], x: 478, y: 170, type: "commit" },
    { id: "c5", branch: "main", message: "Edit index.html on main", parents: ["c3"], x: 478, y: 98, type: "commit" },
    { id: "c6", branch: "main", message: "Resolve conflict", parents: ["c5", "c4"], mergedFrom: "conflict-demo", x: 608, y: 98, type: "merge", conflict: true }
  );
  conflictState.branches[0].head = "c6";
  conflictState.currentBranch = "main";
  conflictState.selectedBranch = "main";
  conflictState.selectedCommit = "c6";
  conflictState.nextCommitNumber = 7;
  conflictState.nextLane = 2;
  conflictState.commandGroups.push({
    title: "Resolve conflict-demo conflict",
    commands: conflictCommands,
    note: "Resolved index.html after Git reported a merge conflict."
  });
  branchModel.validateBranchState(conflictState).forEach((error) => {
    fail(`Conflict branch sandbox state: ${error}`);
  });
}

if (!panicData) {
  fail("src/panic-data.js did not expose window.panicData.");
} else {
  validatePanicData(panicData).forEach(fail);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Validation passed.");
