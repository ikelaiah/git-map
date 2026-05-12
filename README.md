# Git Map

[🌐 Live Demo](https://ikelaiah.github.io/git-map/)

[![HTML5](https://img.shields.io/badge/Made%20with-HTML5-e34f26?style=for-the-badge&logo=html5&logoColor=white)](index.html)
[![CSS](https://img.shields.io/badge/CSS-theme--tokens-2f6fed?style=for-the-badge&logo=css&logoColor=white)](index.html)
[![Vanilla JavaScript](https://img.shields.io/badge/Vanilla-JavaScript-f7df1e?style=for-the-badge&logo=javascript&logoColor=111111)](index.html)
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

Git Map is a single-page Git visualisation for beginners. It shows the main Git areas:

- 📦 Stash
- 📝 Local Workspace
- 🎯 Staging Area
- 🗂️ Local Repo
- 🌐 Remote Repo

## 🧭 How To Use

- Use **Focused** mode to learn one area at a time.
- Hover over a top card to preview commands for that Git area.
- Click a top card to pin it active while you scroll and read the help panel.
- Click the pinned top card again to unpin it.
- Click another top card to change the pinned area.
- Press `Enter` or `Space` on a focused top card to pin it with the keyboard.
- Use **Everything** mode to see the full command map. This clears the pinned area.
- Use **Light**, **Dark**, or **System** appearance mode to match your preferred theme.
- Click a command ribbon in the diagram to highlight and jump to its detail card.
- Use the command card **Copy** buttons to copy example commands.

⚠️ The page also marks risky commands, such as commands that discard edits or rewrite recent local history. Appearance choice is saved locally in the browser.

🚀 Use the [live demo](https://ikelaiah.github.io/git-map/) or open `index.html` in a browser to run it locally.

## 🧰 Command Coverage

- `git switch <branch>`: move to another branch.
- `git switch -c <branch>`: create and move to a new branch.
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

## 🌍 Publish With GitHub Pages

1. Push this repository to GitHub.
2. Go to repository **Settings** > **Pages**.
3. Set the source to the branch that contains `index.html`.
4. Save the setting and open the published Pages URL.

✨ No build step or external dependency is required.

## 📄 License

MIT License. See [LICENSE](LICENSE).
