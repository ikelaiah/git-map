import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadBrowserGlobals } from "./helpers.mjs";

const { gitMapData } = loadBrowserGlobals(["src/data.js"]);
const { statusDetectors, statusScenarios } = gitMapData;

const scenarioById = (id) => statusScenarios.find((scenario) => scenario.id === id);

function matchStatus(value) {
  const text = value.trim().toLowerCase();
  if (!text) {
    return [];
  }
  const matches = statusDetectors
    .filter((detector) => detector.patterns.some((pattern) => text.includes(pattern.toLowerCase())))
    .map((detector) => ({ detector, scenario: scenarioById(detector.scenarioId) }))
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

describe("status matcher", () => {
  it("returns nothing for empty input", () => {
    assert.deepEqual(matchStatus(""), []);
    assert.deepEqual(matchStatus("   "), []);
  });

  it("detects a clean working tree", () => {
    const result = matchStatus("On branch main\nnothing to commit, working tree clean");
    assert.ok(result.length > 0, "should match at least one scenario");
    assert.equal(result[0].scenario.id, "clean", `expected clean scenario, got ${result[0].scenario.id}`);
  });

  it("detects unstaged edits", () => {
    const result = matchStatus("On branch main\nChanges not staged for commit:\n  modified: src/app.js");
    assert.ok(result.some((match) => match.scenario.id === "unstaged"), "should detect unstaged scenario");
  });

  it("detects staged changes", () => {
    const result = matchStatus("On branch main\nChanges to be committed:\n  new file: src/x.js");
    assert.ok(result.some((match) => match.scenario.id === "staged"), "should detect staged scenario");
  });

  it("detects diverged history", () => {
    const result = matchStatus("Your branch and 'origin/main' have diverged");
    assert.ok(result.some((match) => match.scenario.id === "diverged"), "should detect diverged scenario");
  });

  it("detects merge conflict", () => {
    const result = matchStatus("You have unmerged paths.\n  both modified: index.html");
    assert.ok(result.some((match) => match.scenario.id === "conflict"), "should detect conflict scenario");
  });

  it("orders matches by descending detector priority", () => {
    const result = matchStatus("On branch main\nChanges to be committed:\n  new file: a.js\nChanges not staged for commit:\n  modified: b.js");
    for (let i = 1; i < result.length; i++) {
      assert.ok(result[i - 1].detector.priority >= result[i].detector.priority, `priority not descending at index ${i}`);
    }
  });

  it("deduplicates scenarios when multiple detectors match the same scenario", () => {
    const result = matchStatus("On branch main\nnothing to commit, working tree clean");
    const ids = result.map((match) => match.scenario.id);
    assert.equal(new Set(ids).size, ids.length, "scenario ids should be unique");
  });

  it("detects ahead of remote", () => {
    const result = matchStatus("On branch main\nYour branch is ahead of 'origin/main' by 2 commits.");
    assert.ok(result.some((match) => match.scenario.id === "ahead"), "should detect ahead scenario");
  });

  it("detects behind remote", () => {
    const result = matchStatus("On branch main\nYour branch is behind 'origin/main' by 3 commits");
    assert.ok(result.some((match) => match.scenario.id === "behind"), "should detect behind scenario");
  });

  it("detects untracked files", () => {
    const result = matchStatus("On branch main\nUntracked files:\n  newfile.txt");
    assert.ok(result.some((match) => match.scenario.id === "untracked"), "should detect untracked scenario");
  });

  it("detects fresh repo with no commits", () => {
    const result = matchStatus("On branch main\n\nNo commits yet");
    assert.ok(result.some((match) => match.scenario.id === "new-repo"), "should detect new-repo scenario");
  });

  it("matches patterns regardless of input case", () => {
    const result = matchStatus("ON BRANCH MAIN\nCHANGES NOT STAGED FOR COMMIT:\n  MODIFIED: src/app.js");
    assert.ok(result.some((match) => match.scenario.id === "unstaged"), "should still detect unstaged when input is upper-case");
  });

  it("orders conflict above staged when both appear", () => {
    const result = matchStatus("On branch main\nYou have unmerged paths.\n  both modified: x.js\nChanges to be committed:\n  modified: y.js");
    assert.equal(result[0].scenario.id, "conflict", "conflict should win when conflict + staged both match");
  });

  it("returns no false matches for garbage input", () => {
    const result = matchStatus("the quick brown fox jumps over the lazy dog 12345 !@#$%");
    assert.equal(result.length, 0, "irrelevant input must not produce any matches");
  });

  it("returns no false matches for whitespace-only input", () => {
    assert.deepEqual(matchStatus("\n\n\t   \n"), []);
  });

  it("does not match the word 'clean' in unrelated prose", () => {
    const result = matchStatus("Please clean up the staged area before lunch.");
    assert.ok(!result.some((match) => match.scenario.id === "clean"), "matcher must not match the bare word 'clean'");
  });

  it("staged + unstaged mixed state surfaces staged first", () => {
    const result = matchStatus("On branch main\nChanges to be committed:\n  modified: a.js\nChanges not staged for commit:\n  modified: b.js");
    assert.equal(result[0].scenario.id, "staged", "staged has higher priority than unstaged");
    assert.ok(result.some((match) => match.scenario.id === "unstaged"), "unstaged should also appear in the list");
  });
});
