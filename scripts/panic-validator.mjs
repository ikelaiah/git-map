const VALID_REVERSIBILITY = new Set(["safe", "caution", "danger"]);
const DESTRUCTIVE_OR_REWRITING_COMMAND = /(?:--force(?:-with-lease)?|\bpush -f\b|\breset --(?:hard|soft)\b|\bcommit --amend\b|\bfilter-repo\b|\bbranch -D\b|\bclean -fd?\b)/;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function validatePanicData(panicData) {
  const errors = [];
  const fail = (message) => errors.push(message);

  if (!panicData) {
    fail("panicData is missing.");
    return errors;
  }

  const recoveryIds = new Set();
  (panicData.recoveries || []).forEach((recovery) => {
    if (!isNonEmptyString(recovery.id)) {
      fail("A panic recovery is missing id.");
      return;
    }
    if (recoveryIds.has(recovery.id)) {
      fail(`Duplicate panic recovery id "${recovery.id}".`);
    }
    recoveryIds.add(recovery.id);

    ["title", "diagnosis", "whyItWorks", "avoidNextTime"].forEach((field) => {
      if (!isNonEmptyString(recovery[field])) {
        fail(`Panic recovery "${recovery.id}" is missing ${field}.`);
      }
    });

    if (!VALID_REVERSIBILITY.has(recovery.reversibility)) {
      fail(`Panic recovery "${recovery.id}" has unknown reversibility "${recovery.reversibility}".`);
    }

    if (!Array.isArray(recovery.commands) || recovery.commands.length === 0) {
      fail(`Panic recovery "${recovery.id}" is missing commands.`);
    } else {
      recovery.commands.forEach((step, index) => {
        if (isNonEmptyString(step.heading)) {
          return;
        }
        if (!isNonEmptyString(step.command) || !isNonEmptyString(step.note)) {
          fail(`Panic recovery "${recovery.id}" command ${index} is missing command or note.`);
        }
      });
    }

    if (recovery.reversibility === "safe") {
      recovery.commands.forEach((step) => {
        if (DESTRUCTIVE_OR_REWRITING_COMMAND.test(step.command || "")) {
          fail(`Panic recovery "${recovery.id}" is marked safe but includes a destructive or history-rewriting command.`);
        }
      });
    }
  });

  const referencedRecoveryIds = new Set();

  function walkTreeOptions(options, path) {
    if (!Array.isArray(options) || options.length === 0) {
      fail(`Panic tree node at ${path || "root"} is missing options.`);
      return;
    }
    options.forEach((option, index) => {
      const optionPath = `${path}[${index}]`;
      if (!isNonEmptyString(option.id) || !isNonEmptyString(option.label)) {
        fail(`Panic tree option ${optionPath} is missing id or label.`);
        return;
      }
      const hasRecovery = isNonEmptyString(option.recoveryId);
      const hasChildren = Array.isArray(option.options);
      const isStub = option.stub === true;
      if (hasRecovery) {
        referencedRecoveryIds.add(option.recoveryId);
        if (!recoveryIds.has(option.recoveryId)) {
          fail(`Panic tree option "${option.id}" references unknown recovery "${option.recoveryId}".`);
        }
      } else if (hasChildren) {
        if (!isNonEmptyString(option.nextQuestion)) {
          fail(`Panic tree option "${option.id}" has children but no nextQuestion.`);
        }
        walkTreeOptions(option.options, `${optionPath}.options`);
      } else if (!isStub) {
        fail(`Panic tree option "${option.id}" has no recovery, no children, and is not marked stub.`);
      }
    });
  }

  if (!panicData.tree || !isNonEmptyString(panicData.tree.rootQuestion)) {
    fail("Panic tree is missing rootQuestion.");
  } else {
    walkTreeOptions(panicData.tree.rootOptions, "rootOptions");
  }

  recoveryIds.forEach((id) => {
    if (!referencedRecoveryIds.has(id)) {
      fail(`Panic recovery "${id}" is not reachable from the decision tree.`);
    }
  });

  return errors;
}
