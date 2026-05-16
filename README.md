# Git Map

[🌐 Live Demo](https://ikelaiah.github.io/git-map/)
[GitHub Repository](https://github.com/ikelaiah/git-map)

[![Version](https://img.shields.io/badge/Version-1.3.0-2f6fed?style=for-the-badge)](CHANGELOG.md)
[![HTML5](https://img.shields.io/badge/Made%20with-HTML5-e34f26?style=for-the-badge&logo=html5&logoColor=white)](index.html)
[![CSS](https://img.shields.io/badge/CSS-theme--tokens-2f6fed?style=for-the-badge&logo=css&logoColor=white)](src/styles.css)
[![Vanilla JavaScript](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=for-the-badge&logo=javascript&logoColor=111111)](src/app.js)
[![No Framework](https://img.shields.io/badge/Framework-none-64748b?style=for-the-badge)](index.html)
[![No Dependencies](https://img.shields.io/badge/Dependencies-none-22c55e?style=for-the-badge)](index.html)
[![Theme](https://img.shields.io/badge/Theme-light%20%7C%20dark%20%7C%20system-9b7cff?style=for-the-badge)](index.html)
[![Offline Ready](https://img.shields.io/badge/Offline-ready-0ea5e9?style=for-the-badge)](index.html)
[![Responsive](https://img.shields.io/badge/Layout-responsive-8b5cf6?style=for-the-badge)](index.html)
[![Keyboard Accessible](https://img.shields.io/badge/Keyboard-accessible-06b6d4?style=for-the-badge)](index.html)
[![Beginner Friendly](https://img.shields.io/badge/Beginner-friendly-f97316?style=for-the-badge)](README.md)
[![No Build](https://img.shields.io/badge/Build-none-3bc5a7?style=for-the-badge)](index.html)
[![License: MIT](https://img.shields.io/badge/License-MIT-34d399?style=for-the-badge)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-ready-222222?style=for-the-badge&logo=github&logoColor=white)](https://pages.github.com/)

Git Map is a dependency-free Git visualisation and situation solver for beginners. The overview page shows the main Git areas:

- 📦 Stash
- 📝 Local Workspace
- 🎯 Staging Area
- 🗂️ Local Repo
- 🌐 Remote Repo

Version 1.3 adds **Panic Recovery**, a third page (`panic.html`) for beginners who think they have broken something. A guided decision tree asks two or three questions ("Did you commit? Did you push? What disappeared?") and lands the reader on a recovery card with a plain-English diagnosis, the exact commands to fix it, a "why this works" explanation, and one tip to avoid the same panic next time. A full list of scenarios appears below the tree for users who would rather scan. v1.3 ships with 11 recoveries covering wrong-branch commits, accidental commits to main, mistakes in a local commit, lost edits after `git reset --hard`, detached HEAD, rejected push, aborting a merge or rebase conflict, lost stashes, deleted branches, overwriting a teammate with force push, and committed secrets or huge files.

Version 1.2 sharpens onboarding and refines the risk and recovery guidance. A dismissible "Start here" callout points beginners at the Beginner Daily Path on the overview page and at the create-from-commit flow on the Git Branch Map. The diverged pull scenario now suggests `git fetch` followed by `git merge origin/<branch>` as a clear two-step pair, and `git reset --soft HEAD~1` is presented as a caution rather than a danger because it keeps your edits staged.

Version 1.1 updated the command guidance for current Git behavior. The Git Branch Map creates branches from any selected commit, generated histories include the realistic edit, stage, and commit flow, diverged pull guidance shows explicit fast-forward, rebase, and merge choices, and both HTML pages link back to the GitHub repository.

Commands in the app are examples. Replace placeholders such as `<file>`, `<branch>`, `<commit>`, and visual IDs like `c2` with real paths, branch names, commit SHAs, tags, or refs from your repository.

## 🧭 How To Use

### How To Use Git Map

- Use **Focused** mode to learn one area at a time.
- Use **Safe first** to hide destructive commands, or **Show risky** when you want the full map.
- Follow the **Daily path** markers for the common sync, add, commit, and push flow.
- Paste real `git status` output into **Paste git status** to detect clean, staged, unstaged, untracked, ahead, behind, diverged, and conflict states.
- Step through **Scenario journeys** for common workflows such as careful staging, conflict rescue, rejected push recovery, safe undo, and stash interruptions.

### How To Use Panic Recovery

- Open **Panic Recovery** from the page tabs when something feels broken.
- Answer the **Guided rescue** questions in order; the matching recovery card scrolls into view and pulses so the destination is obvious.
- Or skip the tree and pick directly from the scenarios listed below it.
- Each card has a reversibility badge (**Reversible**, **Reversible with care**, or **Partly reversible**), the exact commands with copy buttons, a "why this works" paragraph, and one tip for avoiding the same panic next time.
- Use **Start over** to reset the tree and try a different path.

### How To Use Git Branch Map

- Open **Git Branch Map** from the page tabs.
- Click any commit to choose where a new branch should start.
- Create feature branches, add commits, switch branches, and merge branches visually.
- Simulate a conflict to see the edit, `git add`, and `git commit` steps Git expects during resolution.
- Review or copy the generated command history for the graph you built.

⚠️ The page also marks risky commands, such as commands that discard edits or rewrite recent local history. Appearance choice is saved locally in the browser.

🚀 Use the [live demo](https://ikelaiah.github.io/git-map/) or open `index.html` in a browser to run it locally.

## 🛠️ Maintenance

The project stays no-build and dependency-free, but the page is split by responsibility:

- `index.html`: page shell and static content.
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

Run the validator after changing commands or zones:

```bash
node scripts/validate.mjs
```

## 🧰 Command Coverage

- `git status`: inspect branch, workspace, staging, conflict, and remote tracking state.
- `git add <file>`: stage selected workspace changes.
- `git add -p`: stage selected hunks instead of whole files.
- `git commit -m "message"`: save staged changes as a local commit.
- `git push`: publish local commits to the shared remote branch.
- `git pull`: fetch and integrate remote commits into the current branch; current Git defaults to fast-forward-only unless pull strategy config or options say otherwise.
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

## 📄 License

MIT License. See [LICENSE](LICENSE).
