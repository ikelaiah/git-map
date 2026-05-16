import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadBrowserGlobals } from "./helpers.mjs";

const { panicData } = loadBrowserGlobals(["src/panic-data.js"]);

const VALID_REVERSIBILITY = new Set(["safe", "caution", "danger"]);

function collectTreeLeaves(options, leaves = []) {
  options.forEach((option) => {
    if (option.recoveryId) {
      leaves.push(option);
    }
    if (Array.isArray(option.options)) {
      collectTreeLeaves(option.options, leaves);
    }
  });
  return leaves;
}

describe("panicData", () => {
  it("exposes recoveries and tree", () => {
    assert.ok(Array.isArray(panicData.recoveries) && panicData.recoveries.length > 0, "recoveries should be a non-empty array");
    assert.ok(panicData.tree && typeof panicData.tree.rootQuestion === "string", "tree.rootQuestion should be a string");
    assert.ok(Array.isArray(panicData.tree.rootOptions) && panicData.tree.rootOptions.length > 0, "tree.rootOptions should be a non-empty array");
  });

  it("every recovery has the required fields", () => {
    panicData.recoveries.forEach((recovery) => {
      assert.ok(recovery.id, "recovery.id");
      ["title", "diagnosis", "whyItWorks", "avoidNextTime"].forEach((field) => {
        assert.ok(typeof recovery[field] === "string" && recovery[field].trim().length > 0, `${recovery.id} missing ${field}`);
      });
      assert.ok(VALID_REVERSIBILITY.has(recovery.reversibility), `${recovery.id} has unknown reversibility "${recovery.reversibility}"`);
      assert.ok(Array.isArray(recovery.commands) && recovery.commands.length > 0, `${recovery.id} has no commands`);
      recovery.commands.forEach((step, index) => {
        assert.ok(step.command && step.note, `${recovery.id} command ${index} missing command or note`);
      });
    });
  });

  it("has no duplicate recovery ids", () => {
    const ids = panicData.recoveries.map((recovery) => recovery.id);
    assert.equal(new Set(ids).size, ids.length, "duplicate recovery ids detected");
  });

  it("every tree leaf with recoveryId points at a real recovery", () => {
    const recoveryIds = new Set(panicData.recoveries.map((recovery) => recovery.id));
    const leaves = collectTreeLeaves(panicData.tree.rootOptions);
    assert.ok(leaves.length > 0, "tree must have at least one leaf with a recoveryId");
    leaves.forEach((leaf) => {
      assert.ok(recoveryIds.has(leaf.recoveryId), `tree leaf "${leaf.id}" references unknown recovery "${leaf.recoveryId}"`);
    });
  });

  it("every recovery is reachable from the tree", () => {
    const leaves = collectTreeLeaves(panicData.tree.rootOptions);
    const referenced = new Set(leaves.map((leaf) => leaf.recoveryId));
    panicData.recoveries.forEach((recovery) => {
      assert.ok(referenced.has(recovery.id), `recovery "${recovery.id}" is orphaned (no tree leaf reaches it)`);
    });
  });

  it("every non-stub option without a recovery has children and a nextQuestion", () => {
    function walk(options) {
      options.forEach((option) => {
        if (option.recoveryId || option.stub === true) {
          return;
        }
        assert.ok(Array.isArray(option.options) && option.options.length > 0, `option "${option.id}" has no children and is not a stub`);
        assert.ok(typeof option.nextQuestion === "string" && option.nextQuestion.length > 0, `option "${option.id}" is missing nextQuestion`);
        walk(option.options);
      });
    }
    walk(panicData.tree.rootOptions);
  });

  it("every option has a unique id within its parent", () => {
    function walk(options, path) {
      const seen = new Set();
      options.forEach((option) => {
        assert.ok(!seen.has(option.id), `duplicate option id "${option.id}" at ${path}`);
        seen.add(option.id);
        if (Array.isArray(option.options)) {
          walk(option.options, `${path} > ${option.id}`);
        }
      });
    }
    walk(panicData.tree.rootOptions, "root");
  });

  it("recoveries marked 'safe' do not contain dangerous commands", () => {
    const dangerSignals = [
      /--force(?!-with-lease)/,
      /reset --hard/,
      /filter-repo/,
      /push -f\b/,
      /branch -D\b/,
      /clean -fd?\b/
    ];
    const offenders = [];
    panicData.recoveries.forEach((recovery) => {
      if (recovery.reversibility !== "safe") {
        return;
      }
      recovery.commands.forEach((step) => {
        dangerSignals.forEach((pattern) => {
          if (pattern.test(step.command)) {
            offenders.push(`${recovery.id}: "${step.command}" looks dangerous but recovery is marked safe (matches ${pattern})`);
          }
        });
      });
    });
    assert.equal(offenders.length, 0, `Safe recoveries contain dangerous commands:\n  ${offenders.join("\n  ")}`);
  });
});
