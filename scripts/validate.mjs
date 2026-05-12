import fs from "node:fs";
import vm from "node:vm";

const errors = [];
const dataCode = fs.readFileSync("src/data.js", "utf8");
const readme = fs.readFileSync("README.md", "utf8");
const context = { window: {} };

vm.createContext(context);
vm.runInContext(dataCode, context, { filename: "src/data.js" });

const data = context.window.gitMapData;

function fail(message) {
  errors.push(message);
}

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
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

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}

console.log("Validation passed.");
