import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";

const gitExecutable = process.platform === "win32" ? "git.exe" : "git";
const gitAvailable = spawnSync(gitExecutable, ["--version"], { encoding: "utf8" }).status === 0;
const gitSkip = gitAvailable ? false : "Git executable was not found; real Git integration tests cannot run.";

function git(directory, args, { allowFailure = false } = {}) {
  const result = spawnSync(gitExecutable, args, { cwd: directory, encoding: "utf8" });
  if (!allowFailure && result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  }
  return result;
}

function output(directory, args, options) {
  return git(directory, args, options).stdout.trim();
}

function readText(filePath) {
  return readFileSync(filePath, "utf8").replaceAll("\r\n", "\n");
}

function withTemporaryDirectory(run) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "git-map-integration-"));
  try {
    return run(directory);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function configureRepository(directory) {
  git(directory, ["config", "user.name", "Git Map test"]);
  git(directory, ["config", "user.email", "git-map@example.test"]);
}

function makeRepository(directory) {
  git(directory, ["init", "--initial-branch=main"]);
  configureRepository(directory);
  writeFileSync(path.join(directory, "README.md"), "base\n");
  git(directory, ["add", "README.md"]);
  git(directory, ["commit", "-m", "base"]);
}

function status(directory) {
  return output(directory, ["status", "--porcelain=v1"]);
}

test("wrong-branch recovery preserves staged work only with stash pop --index", { skip: gitSkip }, () => {
  withTemporaryDirectory((directory) => {
    makeRepository(directory);
    git(directory, ["switch", "-c", "wrong-branch"]);
    writeFileSync(path.join(directory, "moved.txt"), "move me\n");
    git(directory, ["add", "moved.txt"]);
    git(directory, ["commit", "-m", "wrong branch commit"]);

    git(directory, ["reset", "--soft", "HEAD~1"]);
    assert.match(status(directory), /^A  moved\.txt$/m);
    git(directory, ["stash", "push", "-m", "move wrong commit"]);
    git(directory, ["switch", "main"]);
    git(directory, ["stash", "pop", "--index"]);

    assert.equal(readText(path.join(directory, "moved.txt")), "move me\n");
    assert.match(status(directory), /^A  moved\.txt$/m);
    git(directory, ["commit", "-m", "correct branch commit"]);
    assert.equal(output(directory, ["branch", "--show-current"]), "main");
    assert.match(output(directory, ["log", "--oneline", "-1"]), /correct branch commit/);
  });
});

test("accidental commits on main remain reachable after moving a branch pointer", { skip: gitSkip }, () => {
  withTemporaryDirectory((directory) => {
    makeRepository(directory);
    writeFileSync(path.join(directory, "feature.txt"), "preserve me\n");
    git(directory, ["add", "feature.txt"]);
    git(directory, ["commit", "-m", "accidental main commit"]);
    git(directory, ["branch", "feature/rescued"]);
    git(directory, ["reset", "--hard", "HEAD~1"]);

    assert.notEqual(git(directory, ["show", "main:feature.txt"], { allowFailure: true }).status, 0);
    git(directory, ["switch", "feature/rescued"]);
    assert.equal(readText(path.join(directory, "feature.txt")), "preserve me\n");
    assert.match(output(directory, ["log", "--oneline", "-1"]), /accidental main commit/);
  });
});

test("detached HEAD commits become durable when a rescue branch is created", { skip: gitSkip }, () => {
  withTemporaryDirectory((directory) => {
    makeRepository(directory);
    git(directory, ["switch", "--detach", "HEAD"]);
    writeFileSync(path.join(directory, "rescue.txt"), "saved\n");
    git(directory, ["add", "rescue.txt"]);
    git(directory, ["commit", "-m", "detached work"]);
    const detachedCommit = output(directory, ["rev-parse", "HEAD"]);
    git(directory, ["switch", "-c", "rescue"]);

    assert.equal(output(directory, ["branch", "--show-current"]), "rescue");
    assert.equal(output(directory, ["rev-parse", "rescue"]), detachedCommit);
  });
});

test("merge --abort restores the pre-merge branch and files after a real conflict", { skip: gitSkip }, () => {
  withTemporaryDirectory((directory) => {
    makeRepository(directory);
    git(directory, ["switch", "-c", "feature"]);
    writeFileSync(path.join(directory, "README.md"), "feature\n");
    git(directory, ["commit", "-am", "feature edit"]);
    git(directory, ["switch", "main"]);
    writeFileSync(path.join(directory, "README.md"), "main\n");
    git(directory, ["commit", "-am", "main edit"]);
    const beforeMerge = output(directory, ["rev-parse", "HEAD"]);

    assert.notEqual(git(directory, ["merge", "feature"], { allowFailure: true }).status, 0);
    assert.match(status(directory), /^UU README\.md$/m);
    git(directory, ["merge", "--abort"]);

    assert.equal(output(directory, ["rev-parse", "HEAD"]), beforeMerge);
    assert.equal(readText(path.join(directory, "README.md")), "main\n");
    assert.equal(status(directory), "");
  });
});

test("rebase --abort restores the pre-rebase branch and files after a real conflict", { skip: gitSkip }, () => {
  withTemporaryDirectory((directory) => {
    makeRepository(directory);
    git(directory, ["switch", "-c", "feature"]);
    writeFileSync(path.join(directory, "README.md"), "feature\n");
    git(directory, ["commit", "-am", "feature edit"]);
    const beforeRebase = output(directory, ["rev-parse", "HEAD"]);
    git(directory, ["switch", "main"]);
    writeFileSync(path.join(directory, "README.md"), "main\n");
    git(directory, ["commit", "-am", "main edit"]);
    git(directory, ["switch", "feature"]);

    assert.notEqual(git(directory, ["rebase", "main"], { allowFailure: true }).status, 0);
    git(directory, ["rebase", "--abort"]);

    assert.equal(output(directory, ["rev-parse", "HEAD"]), beforeRebase);
    assert.equal(readText(path.join(directory, "README.md")), "feature\n");
    assert.equal(status(directory), "");
  });
});

test("a deleted unmerged branch can be recreated from its former tip", { skip: gitSkip }, () => {
  withTemporaryDirectory((directory) => {
    makeRepository(directory);
    git(directory, ["switch", "-c", "feature/deleted"]);
    writeFileSync(path.join(directory, "deleted.txt"), "recover me\n");
    git(directory, ["add", "deleted.txt"]);
    git(directory, ["commit", "-m", "unmerged work"]);
    const formerTip = output(directory, ["rev-parse", "HEAD"]);
    git(directory, ["switch", "main"]);
    git(directory, ["branch", "-D", "feature/deleted"]);
    assert.match(output(directory, ["reflog"]), new RegExp(formerTip.slice(0, 7)));
    git(directory, ["branch", "feature/restored", formerTip]);

    assert.equal(output(directory, ["rev-parse", "feature/restored"]), formerTip);
    assert.equal(output(directory, ["show", "feature/restored:deleted.txt"]), "recover me");
  });
});

test("a rejected push succeeds after fetching and deliberately integrating remote work", { skip: gitSkip }, () => {
  withTemporaryDirectory((directory) => {
    const remote = path.join(directory, "remote.git");
    const seed = path.join(directory, "seed");
    const first = path.join(directory, "first");
    const second = path.join(directory, "second");
    git(directory, ["init", "--bare", "--initial-branch=main", remote]);
    git(directory, ["init", "--initial-branch=main", seed]);
    configureRepository(seed);
    writeFileSync(path.join(seed, "README.md"), "base\n");
    git(seed, ["add", "README.md"]);
    git(seed, ["commit", "-m", "base"]);
    git(seed, ["remote", "add", "origin", remote]);
    git(seed, ["push", "-u", "origin", "main"]);
    execFileSync(gitExecutable, ["clone", "-b", "main", remote, first], { encoding: "utf8" });
    execFileSync(gitExecutable, ["clone", "-b", "main", remote, second], { encoding: "utf8" });
    configureRepository(first);
    configureRepository(second);

    writeFileSync(path.join(first, "first.txt"), "remote work\n");
    git(first, ["add", "first.txt"]);
    git(first, ["commit", "-m", "first push"]);
    git(first, ["push"]);
    writeFileSync(path.join(second, "second.txt"), "local work\n");
    git(second, ["add", "second.txt"]);
    git(second, ["commit", "-m", "second push"]);

    assert.notEqual(git(second, ["push"], { allowFailure: true }).status, 0);
    git(second, ["fetch", "origin"]);
    git(second, ["merge", "origin/main"]);
    git(second, ["push"]);

    assert.match(output(second, ["log", "origin/main", "--oneline"]), /first push/);
    assert.match(output(second, ["log", "origin/main", "--oneline"]), /second push/);
  });
});
