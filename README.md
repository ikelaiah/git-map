# Git Map

[Live Demo](https://ikelaiah.github.io/git-map/)
[GitHub Repository](https://github.com/ikelaiah/git-map)

[![Version](https://img.shields.io/badge/Version-1.4.0-2f6fed?style=for-the-badge)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-34d399?style=for-the-badge)](LICENSE)
[![No Build](https://img.shields.io/badge/Build-none-3bc5a7?style=for-the-badge)](index.html)
[![Dependencies](https://img.shields.io/badge/Dependencies-none-22c55e?style=for-the-badge)](package.json)
[![Offline Ready](https://img.shields.io/badge/Offline-ready-0ea5e9?style=for-the-badge)](index.html)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-ready-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)

Git Map is a no-install visual Git sandbox for beginners. It helps you see where your work is, test branch and merge ideas safely, and recover from common Git mistakes with plain-English guidance and real commands.

## What It Does

### Flow Map: where am I?

The main page maps how Git commands move work between stash, workspace, staging, local history, and remote. It includes focused and full-map views, safe/risky command filtering, a beginner daily path, scenario journeys, and a pasteable `git status` analyzer.

### Branch Map: what happens if I branch here?

The Branch Map is an interactive sandbox for experimenting without touching a real repository. Click any commit, create a branch from that point, add commits, switch branches, merge, simulate conflicts, undo, reset, and copy the commands that would create the graph.

### Panic Recovery: how do I fix this?

Panic Recovery asks a few questions and points to a recovery card with a diagnosis, exact commands, a reversibility badge, and a short prevention tip. It covers wrong-branch commits, accidental commits to main, mistakes in the last local commit, lost edits after `git reset --hard`, detached HEAD, rejected push, merge/rebase conflict aborts, lost stashes, deleted branches, force-push damage, and committed secrets or huge files.

Commands in the app are examples. Replace placeholders such as `<file>`, `<branch>`, `<commit>`, and visual IDs like `c2` with real paths, branch names, commit SHAs, tags, or refs from your repository.

## How To Use

### Flow Map

- Use **Focused** mode to learn one area at a time.
- Use **Safe first** to hide destructive commands, or **Show risky** when you want the full map.
- Follow the **Daily path** markers for the common sync, add, commit, and push flow.
- Paste real `git status` output into **Paste git status** to detect clean, staged, unstaged, untracked, ahead, behind, diverged, and conflict states.
- Step through **Scenario journeys** for common workflows such as careful staging, conflict rescue, rejected push recovery, safe undo, and stash interruptions.

### Branch Map

- Open **Branch Map** from the page tabs.
- Click any commit to choose where a new branch should start.
- Create feature branches, add commits, switch branches, and merge branches visually.
- Simulate a conflict to see the edit, `git add`, and `git commit` steps Git expects during resolution.
- Review or copy the generated command history for the graph you built.

### Panic Recovery

- Open **Panic Recovery** from the page tabs when something feels broken.
- Answer the **Guided rescue** questions in order; the matching recovery card scrolls into view and pulses so the destination is obvious.
- Or skip the tree and pick directly from the scenarios listed below it.
- Each card has a reversibility badge (**Reversible**, **Reversible with care**, or **Partly reversible**), the exact commands with copy buttons, a "why this works" paragraph, and one tip for avoiding the same panic next time.
- Use **Start over** to reset the tree and try a different path.

The app marks risky commands, such as commands that discard edits or rewrite recent local history. Appearance choice is saved locally in the browser.

Use the [live demo](https://ikelaiah.github.io/git-map/) or open `index.html` in a browser to run it locally.

## Maintenance

The project stays no-build and dependency-free, split by responsibility:

- `index.html`: Flow Map, status analyzer, and scenario journeys.
- `branch-map.html`: interactive branch, commit, and merge sandbox.
- `panic.html`: Panic Recovery page shell.
- `src/styles.css`: theme tokens, layout, and responsive styles.
- `src/version.js`: shared browser-side version label for the HTML pages.
- `src/data.js`: Git areas, command flows, before/after previews, status detectors, and scenario journeys.
- `src/branch-map-model.js`: pure branch sandbox constants, command generators, and validation helpers.
- `src/panic-data.js`: Panic Recovery scenarios and decision-tree definition.
- `src/app.js`: rendering, SVG map drawing, and interactions.
- `src/branch-map.js`: branch sandbox state, SVG graph drawing, undo/reset, and command history.
- `src/panic.js`: Panic Recovery decision-tree rendering and card highlight.
- `scripts/validate.mjs`: data integrity checks.

Run tests and validators:

```bash
npm test
```

## 🧰 Command Coverage

- `git status`: inspect branch, workspace, staging, conflict, and remote tracking state.
- `git add <file>`: stage selected workspace changes.
- `git add -p`: stage selected hunks instead of whole files.
- `git commit -m "message"`: save staged changes as a local commit.
- `git push`: publish local commits to the shared remote branch.
- `git pull`: fetch and integrate remote commits into the current branch.
- `git pull --ff-only`: fetch and update only when the current branch can fast-forward.
- `git pull --rebase`: fetch and replay local commits on top of the upstream.
- `git pull --no-rebase`: fetch and merge the upstream, creating a merge commit when needed.
- `git fetch`: update remote-tracking branches without changing workspace files.
- `git diff`: review unstaged workspace edits.
- `git diff --staged`: review the staged snapshot before committing.
- `git switch <branch>`: move to another branch.
- `git switch -c <branch>`: create and move to a new branch.
- `git switch -c <new-branch> <start-point>`: create and move to a new branch from a specific commit, branch, tag, or ref.
- `git merge <branch>`: bring another branch into the current branch.
- `git rebase <branch>`: replay commits on top of another branch.
- `git cherry-pick <commit>`: copy one commit onto the current branch.
- `git revert <commit>`: safely undo a commit by creating a new commit.
- `git reset --hard HEAD`: discard all local tracked changes.
- `git restore .`: discard unstaged workspace edits by restoring files from the index.
- `git stash -u`: stash tracked and untracked files.
- `git stash branch <branch>`: create a branch from a stash.
- `git log --oneline --graph --decorate --all`: view commit history as a graph.
- `git blame <file>`: see who last changed each line.
- `git tag <name>`: mark a release point.
- `git remote add origin <url>`: record a remote URL in local Git config.

## License

MIT License. See [LICENSE](LICENSE).
