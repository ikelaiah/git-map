import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validatePanicData } from "../scripts/panic-validator.mjs";

function goodData() {
  return {
    recoveries: [
      {
        id: "r1",
        title: "Title",
        diagnosis: "Diagnosis text.",
        reversibility: "safe",
        commands: [{ command: "git status", note: "Look around." }],
        whyItWorks: "Because reasons.",
        avoidNextTime: "Be careful."
      }
    ],
    tree: {
      rootQuestion: "What happened?",
      rootOptions: [
        { id: "opt1", label: "Option 1", recoveryId: "r1" }
      ]
    }
  };
}

function expectError(errors, fragment) {
  assert.ok(
    errors.some((message) => message.includes(fragment)),
    `expected an error containing "${fragment}", got:\n  ${errors.join("\n  ") || "(no errors)"}`
  );
}

describe("validatePanicData", () => {
  it("accepts a well-formed dataset", () => {
    assert.deepEqual(validatePanicData(goodData()), []);
  });

  it("rejects null input", () => {
    expectError(validatePanicData(null), "panicData is missing");
  });

  it("flags a recovery with no id", () => {
    const data = goodData();
    delete data.recoveries[0].id;
    expectError(validatePanicData(data), "missing id");
  });

  it("flags duplicate recovery ids", () => {
    const data = goodData();
    data.recoveries.push({ ...data.recoveries[0] });
    expectError(validatePanicData(data), "Duplicate panic recovery id");
  });

  it("flags missing required string fields on a recovery", () => {
    const data = goodData();
    data.recoveries[0].whyItWorks = "";
    expectError(validatePanicData(data), "missing whyItWorks");
  });

  it("flags an unknown reversibility value", () => {
    const data = goodData();
    data.recoveries[0].reversibility = "maybe";
    expectError(validatePanicData(data), "unknown reversibility");
  });

  it("flags a recovery with no commands", () => {
    const data = goodData();
    data.recoveries[0].commands = [];
    expectError(validatePanicData(data), "missing commands");
  });

  it("flags a command step missing its note", () => {
    const data = goodData();
    data.recoveries[0].commands = [{ command: "git status", note: "" }];
    expectError(validatePanicData(data), "missing command or note");
  });

  it("flags a tree leaf pointing at an unknown recovery", () => {
    const data = goodData();
    data.tree.rootOptions[0].recoveryId = "does-not-exist";
    expectError(validatePanicData(data), "unknown recovery");
  });

  it("flags an orphaned recovery", () => {
    const data = goodData();
    data.recoveries.push({
      id: "orphan",
      title: "Title",
      diagnosis: "Diagnosis.",
      reversibility: "safe",
      commands: [{ command: "git status", note: "Look around." }],
      whyItWorks: "Because.",
      avoidNextTime: "Care."
    });
    expectError(validatePanicData(data), "not reachable");
  });

  it("flags a non-leaf option without a nextQuestion", () => {
    const data = goodData();
    data.tree.rootOptions = [
      {
        id: "branch1",
        label: "Branch",
        options: [{ id: "leaf", label: "Leaf", recoveryId: "r1" }]
      }
    ];
    expectError(validatePanicData(data), "no nextQuestion");
  });

  it("flags an option with no recovery, no children, and no stub flag", () => {
    const data = goodData();
    data.tree.rootOptions = [{ id: "dead-end", label: "Dead end" }];
    expectError(validatePanicData(data), "no recovery, no children");
  });

  it("accepts stub options without a recovery or children", () => {
    const data = goodData();
    data.tree.rootOptions.push({ id: "later", label: "Coming later", stub: true });
    assert.deepEqual(validatePanicData(data), []);
  });

  it("flags an empty rootOptions array", () => {
    const data = goodData();
    data.tree.rootOptions = [];
    expectError(validatePanicData(data), "missing options");
  });

  it("flags a missing rootQuestion", () => {
    const data = goodData();
    delete data.tree.rootQuestion;
    expectError(validatePanicData(data), "missing rootQuestion");
  });
});
