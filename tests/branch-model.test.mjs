import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadBrowserGlobals } from "./helpers.mjs";

const { gitBranchMapModel } = loadBrowserGlobals(["src/branch-map-model.js"]);

describe("gitBranchMapModel", () => {
  it("exposes the public surface", () => {
    ["initialState", "cloneState", "validateBranchState", "createBranchCommands", "commitCommands", "slugifyBranchName", "conflictScenarioCommands", "branchLabelMetrics"].forEach((name) => {
      assert.ok(name in gitBranchMapModel, `gitBranchMapModel missing ${name}`);
    });
  });

  describe("cloneState", () => {
    it("returns a value structurally equal to the input", () => {
      const clone = gitBranchMapModel.cloneState(gitBranchMapModel.initialState);
      assert.equal(JSON.stringify(clone), JSON.stringify(gitBranchMapModel.initialState));
    });

    it("returns a new top-level object (not the same reference)", () => {
      const clone = gitBranchMapModel.cloneState(gitBranchMapModel.initialState);
      assert.notEqual(clone, gitBranchMapModel.initialState, "clone must not be the same reference");
    });

    it("isolates mutations to nested arrays", () => {
      const original = gitBranchMapModel.initialState;
      const clone = gitBranchMapModel.cloneState(original);
      clone.branches.push({ name: "rogue", color: "#000", lane: 99, head: "x", base: "x" });
      assert.notEqual(clone.branches.length, original.branches.length, "mutating clone.branches must not affect original");
    });

    it("isolates mutations to nested objects", () => {
      const original = gitBranchMapModel.initialState;
      const clone = gitBranchMapModel.cloneState(original);
      clone.branches[0].name = "tampered";
      assert.notEqual(clone.branches[0].name, original.branches[0].name, "mutating clone.branches[0] must not bleed into original");
    });
  });

  it("initial state validates", () => {
    const errors = gitBranchMapModel.validateBranchState(gitBranchMapModel.initialState);
    assert.equal(errors.length, 0, `initialState should validate cleanly, got: ${[...errors].join(", ")}`);
  });

  it("createBranchCommands includes the selected base commit", () => {
    const commands = gitBranchMapModel.createBranchCommands("feature-a", "c2");
    assert.equal(commands[0], "git switch -c feature-a c2");
  });

  it("commitCommands stages a file before committing", () => {
    const commands = gitBranchMapModel.commitCommands("feature-a", "simple message");
    assert.ok(commands.includes("git add <file>"), "expected git add <file> in commit commands");
  });

  it("commitCommands keeps shell quoting valid when message contains double quotes", () => {
    const commands = gitBranchMapModel.commitCommands("feature-a", "Use \"quoted\" message");
    assert.equal(commands.at(-1), "git commit -m \"Use 'quoted' message\"");
  });

  describe("slugifyBranchName", () => {
    const cases = [
      ["Feature A", "feature-a"],
      ["/bad//name.lock.", "bad/name-lock"],
      ["@", ""],
      ["bug@{one}", "bug-one}"]
    ];
    cases.forEach(([input, expected]) => {
      it(`"${input}" → "${expected}"`, () => {
        assert.equal(gitBranchMapModel.slugifyBranchName(input), expected);
      });
    });
  });

  it("conflictScenarioCommands includes the expected steps", () => {
    const commands = gitBranchMapModel.conflictScenarioCommands("conflict-demo", "c3");
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
    ].forEach((expected) => {
      assert.ok(commands.includes(expected), `conflict scenario missing "${expected}"`);
    });
  });

  it("branchLabelMetrics keeps label inside the viewBox", () => {
    const label = gitBranchMapModel.branchLabelMetrics(1460, "feature-long-name", 1500);
    assert.ok(label.x >= 18, `label.x ${label.x} below safe margin`);
    assert.ok(label.x + label.width <= 1482, `label.x+width ${label.x + label.width} overflows viewBox`);
  });
});
