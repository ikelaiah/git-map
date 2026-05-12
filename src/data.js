(() => {
const zones = {
  stash: {
    label: "Stash",
    icon: "S",
    place: "Shelf",
    placeType: "shelf",
    x: 140,
    color: "var(--violet)",
    description: "Temporary shelf for unfinished work you want to hide and restore later.",
    command: "git stash",
    summary: "Temporary shelf for unfinished work while you switch context.",
    next: "Use git stash pop when you are ready to bring work back.",
    nextCommands: ["git stash pop"]
  },
  workspace: {
    label: "Local Workspace",
    icon: "W",
    place: "Desk",
    placeType: "desk",
    x: 420,
    color: "var(--blue)",
    description: "Your checked-out files. This is where edits, new files, conflicts, and deletions appear first.",
    command: "git status",
    summary: "Where file edits live before they are prepared for a commit.",
    next: "Most common next step: git add <file>.",
    nextCommands: ["git add <file>"]
  },
  staging: {
    label: "Staging Area",
    icon: "A",
    place: "Packing table",
    placeType: "packing",
    x: 700,
    color: "var(--amber)",
    description: "The prepared snapshot for your next commit. Add only what belongs together.",
    command: "git diff --staged",
    summary: "The exact snapshot that will become your next commit.",
    next: "Most common next step: git commit -m \"message\".",
    nextCommands: ["git commit -m \"message\""]
  },
  local: {
    label: "Local Repo",
    icon: "L",
    place: "Archive",
    placeType: "archive",
    x: 980,
    color: "var(--green)",
    description: "Your local commit history. Commits are saved here before they are shared.",
    command: "git log --oneline",
    summary: "Your local commit history before it is shared.",
    next: "Most common next step: git push.",
    nextCommands: ["git push"]
  },
  remote: {
    label: "Remote Repo",
    icon: "R",
    place: "Mailbox",
    placeType: "mailbox",
    x: 1260,
    color: "var(--red)",
    description: "The shared copy on GitHub, GitLab, Bitbucket, or another Git server.",
    command: "git remote -v",
    summary: "The shared repository on GitHub, GitLab, Bitbucket, or another server.",
    next: "Use git pull to receive changes or git push to share commits.",
    nextCommands: ["git pull", "git push"]
  }
};

const mainPathCommandIds = new Set(["pull", "add", "commit", "push"]);
const workspaceFocusedCommandIds = new Set(["stash-save", "stash-untracked", "stash-pop", "stash-apply", "stash-branch", "add", "restore-staged", "restore", "restore-all", "reset-hard", "pull", "commit", "push", "clone", "switch", "switch-create"]);
const commands = [
  {
    id: "stash-save",
    command: "git stash push -m \"message\"",
    label: "git stash push",
    title: "Shelve unfinished edits",
    from: "workspace",
    to: "stash",
    color: "var(--violet)",
    marker: "arrow-violet",
    zones: ["workspace", "stash"],
    note: "Moves tracked edits and staged changes out of your workspace so you can switch context."
  },
  {
    id: "stash-pop",
    command: "git stash pop",
    title: "Restore shelved work",
    from: "stash",
    to: "workspace",
    color: "var(--violet)",
    marker: "arrow-violet",
    zones: ["stash", "workspace"],
    risk: "caution",
    caution: "May create conflicts",
    note: "Applies the latest stash and removes it from the stash list."
  },
  {
    id: "stash-apply",
    command: "git stash apply",
    title: "Copy stash back",
    from: "stash",
    to: "workspace",
    color: "var(--violet)",
    marker: "arrow-violet",
    zones: ["stash", "workspace"],
    note: "Applies a stash but keeps it available for reuse."
  },
  {
    id: "stash-untracked",
    command: "git stash -u",
    title: "Stash untracked files too",
    from: "workspace",
    to: "stash",
    color: "var(--violet)",
    marker: "arrow-violet",
    zones: ["workspace", "stash"],
    note: "Stores tracked changes plus untracked files, which plain git stash leaves behind."
  },
  {
    id: "stash-branch",
    command: "git stash branch <branch>",
    label: "git stash branch",
    title: "Branch from a stash",
    from: "stash",
    to: "local",
    color: "var(--violet)",
    marker: "arrow-violet",
    zones: ["stash", "workspace", "local"],
    note: "Creates a new local branch from the stash base, checks it out, and applies the stash."
  },
  {
    id: "add",
    command: "git add <file>",
    title: "Stage selected changes",
    from: "workspace",
    to: "staging",
    color: "var(--amber)",
    marker: "arrow-amber",
    zones: ["workspace", "staging"],
    note: "Copies chosen workspace changes into the next commit snapshot."
  },
  {
    id: "restore-staged",
    command: "git restore --staged <file>",
    title: "Unstage changes",
    from: "staging",
    to: "workspace",
    color: "var(--amber)",
    marker: "arrow-amber",
    zones: ["staging", "workspace"],
    note: "Removes changes from staging while keeping the file edits in your workspace."
  },
  {
    id: "restore",
    command: "git restore <file>",
    title: "Discard workspace edits",
    from: "staging",
    to: "workspace",
    color: "var(--blue)",
    marker: "arrow-blue",
    zones: ["workspace", "staging", "local"],
    risk: "danger",
    caution: "Discards edits",
    note: "Restores a workspace file from the index. Staged changes stay staged."
  },
  {
    id: "restore-all",
    command: "git restore .",
    title: "Discard all workspace edits",
    from: "staging",
    to: "workspace",
    color: "var(--blue)",
    marker: "arrow-blue",
    zones: ["workspace", "staging", "local"],
    risk: "danger",
    caution: "Discards edits",
    note: "Restores all tracked workspace files from the index. Staged changes stay staged."
  },
  {
    id: "commit",
    command: "git commit -m \"message\"",
    title: "Save staged snapshot",
    from: "staging",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["staging", "local"],
    note: "Creates a new commit in your local repository from staged changes."
  },
  {
    id: "reset-soft",
    command: "git reset --soft HEAD~1",
    label: "git reset --soft",
    title: "Undo commit, keep staged",
    from: "local",
    to: "staging",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local", "staging"],
    risk: "danger",
    caution: "Rewrites last local commit",
    note: "Moves the last commit back to staging so you can adjust and recommit."
  },
  {
    id: "reset-hard",
    command: "git reset --hard HEAD",
    label: "git reset --hard",
    title: "Discard tracked local changes",
    from: "local",
    to: "workspace",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local", "workspace", "staging"],
    risk: "danger",
    caution: "Discards edits",
    note: "Resets tracked files and staging back to HEAD. Uncommitted tracked changes are lost."
  },
  {
    id: "switch",
    command: "git switch <branch>",
    title: "Move to another branch",
    from: "local",
    to: "workspace",
    color: "var(--blue)",
    marker: "arrow-blue",
    zones: ["local", "workspace"],
    note: "Use when the branch already exists. Git checks it out and updates your workspace to match it."
  },
  {
    id: "switch-create",
    command: "git switch -c <branch>",
    label: "git switch -c",
    title: "Create and switch branch",
    from: "local",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local", "workspace"],
    note: "Use when the branch does not exist yet. Git creates it at the current commit and switches to it."
  },
  {
    id: "merge",
    command: "git merge <branch>",
    title: "Merge a branch",
    from: "local",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local", "workspace"],
    note: "Brings another branch into the current branch, creating a merge commit when needed."
  },
  {
    id: "rebase",
    command: "git rebase <branch>",
    title: "Replay commits on another base",
    from: "local",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local", "workspace"],
    risk: "danger",
    caution: "Rewrites commits",
    note: "Replays current branch commits on top of another branch. Avoid rebasing shared commits."
  },
  {
    id: "cherry-pick",
    command: "git cherry-pick <commit>",
    label: "git cherry-pick",
    title: "Copy one commit",
    from: "local",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local", "workspace"],
    note: "Applies one existing commit onto the current branch as a new commit."
  },
  {
    id: "revert",
    command: "git revert <commit>",
    title: "Safely undo a commit",
    from: "local",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local", "workspace"],
    note: "Creates a new commit that reverses an earlier commit without rewriting history."
  },
  {
    id: "log-graph",
    command: "git log --oneline --graph --decorate --all",
    label: "git log graph",
    title: "View the full commit graph",
    from: "local",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local"],
    note: "Shows branches, tags, and commits as a compact visual history."
  },
  {
    id: "blame",
    command: "git blame <file>",
    title: "Inspect line history",
    from: "workspace",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local", "workspace"],
    note: "Uses a workspace file path to look up which local commit last changed each line."
  },
  {
    id: "tag",
    command: "git tag <name>",
    title: "Mark a release point",
    from: "local",
    to: "local",
    color: "var(--green)",
    marker: "arrow-green",
    zones: ["local"],
    note: "Adds a named tag to the current commit, commonly used for releases."
  },
  {
    id: "fetch",
    command: "git fetch",
    title: "Download remote history",
    from: "remote",
    to: "local",
    color: "var(--red)",
    marker: "arrow-red",
    zones: ["remote", "local"],
    note: "Updates remote-tracking branches without changing your workspace."
  },
  {
    id: "pull",
    command: "git pull",
    title: "Bring remote changes in",
    from: "remote",
    to: "workspace",
    color: "var(--red)",
    marker: "arrow-red",
    zones: ["remote", "workspace"],
    note: "Fetches remote commits, integrates them locally, and updates your files."
  },
  {
    id: "push",
    command: "git push",
    title: "Share local commits",
    from: "local",
    to: "remote",
    color: "var(--red)",
    marker: "arrow-red",
    zones: ["local", "remote"],
    note: "Uploads your local commits to the shared remote branch."
  },
  {
    id: "remote-add",
    command: "git remote add origin <url>",
    label: "git remote add",
    title: "Connect to a remote",
    from: "remote",
    to: "local",
    color: "var(--red)",
    marker: "arrow-red",
    zones: ["local", "remote"],
    note: "Records a remote repository URL in local config so origin can be used later."
  },
  {
    id: "clone",
    command: "git clone <url>",
    title: "Create a local copy",
    from: "remote",
    to: "workspace",
    color: "var(--blue)",
    marker: "arrow-blue",
    zones: ["remote", "workspace", "local"],
    note: "Creates a working directory and local repository from an existing remote."
  }
];

const toolCommands = {
  stash: [
    { command: "git stash list", note: "Show saved stashes." },
    { command: "git stash show -p", note: "Preview what is inside a stash." },
    { command: "git stash -u", note: "Stash tracked and untracked files." },
    { command: "git stash branch <branch>", note: "Create a branch from a stash." }
  ],
  workspace: [
    { command: "git status", note: "See changed, staged, and untracked files." },
    { command: "git diff", note: "Review workspace edits before staging." },
    { command: "git switch <branch>", note: "Move to an existing branch." },
    { command: "git switch -c <branch>", note: "Create a new branch and switch to it." },
    { command: "git restore .", note: "Discard all tracked workspace edits. Use carefully.", caution: true },
    { command: "git clean -fd", note: "Remove untracked files. Use carefully.", caution: true }
  ],
  staging: [
    { command: "git diff --staged", note: "Review exactly what will be committed." },
    { command: "git add -p", note: "Stage selected hunks instead of whole files." }
  ],
  local: [
    { command: "git log --oneline --graph --decorate --all", note: "Read branches, tags, and commits as a compact graph." },
    { command: "git branch", note: "List local branches." },
    { command: "git merge <branch>", note: "Bring another branch into the current branch." },
    { command: "git rebase <branch>", note: "Replay commits on top of another branch. Use carefully.", caution: true },
    { command: "git cherry-pick <commit>", note: "Copy one commit onto the current branch." },
    { command: "git revert <commit>", note: "Safely undo a commit with a new commit." },
    { command: "git blame <file>", note: "See who last changed each line." },
    { command: "git tag <name>", note: "Mark a release point." },
    { command: "git reset --hard HEAD", note: "Discard all tracked local changes. Use carefully.", caution: true }
  ],
  remote: [
    { command: "git remote add origin <url>", note: "Connect a local repository to a remote." },
    { command: "git remote -v", note: "Show remote repository URLs." },
    { command: "git branch -r", note: "List branches known from the remote." }
  ],
  all: [
    { command: "git status", note: "Start here when you are unsure what Git sees." },
    { command: "git diff", note: "Inspect unstaged changes." },
    { command: "git diff --staged", note: "Inspect staged changes." },
    { command: "git log --oneline --graph --decorate --all", note: "Read commit history." },
    { command: "git switch -c <branch>", note: "Create a branch before starting work." }
  ]
};

const statusScenarios = [
  {
    id: "unstaged",
    label: "Unstaged changes",
    zone: "workspace",
    commandId: "add",
    summary: "Edits are in your workspace but are not prepared for a commit yet.",
    checks: ["git status", "git diff"],
    next: ["git add <file>", "git restore <file>"]
  },
  {
    id: "staged",
    label: "Staged changes",
    zone: "staging",
    commandId: "commit",
    summary: "The next commit snapshot is ready in the staging area.",
    checks: ["git status", "git diff --staged"],
    next: ["git commit -m \"message\"", "git restore --staged <file>"]
  },
  {
    id: "ahead",
    label: "Ahead of remote",
    zone: "local",
    commandId: "push",
    summary: "Your local branch has commits that are not on the shared remote yet.",
    checks: ["git status", "git log --oneline --graph --decorate --all"],
    next: ["git push"]
  },
  {
    id: "behind",
    label: "Behind remote",
    zone: "remote",
    commandId: "pull",
    summary: "The remote branch has commits your local branch does not have yet.",
    checks: ["git status", "git fetch"],
    next: ["git pull"]
  },
  {
    id: "diverged",
    label: "Diverged",
    zone: "remote",
    commandId: "fetch",
    summary: "Both local and remote have commits the other side does not have.",
    checks: ["git status", "git fetch", "git log --oneline --graph --decorate --all"],
    next: ["git pull", "git rebase <branch>", "git merge <branch>"]
  },
  {
    id: "conflict",
    label: "Merge conflict",
    zone: "workspace",
    commandId: "add",
    summary: "Git stopped during a merge because the same file area changed in different ways.",
    checks: ["git status", "git diff"],
    next: ["git add <file>", "git commit"]
  },
  {
    id: "untracked",
    label: "Untracked files",
    zone: "workspace",
    commandId: "add",
    summary: "Git sees new files that are not part of the next commit yet.",
    checks: ["git status"],
    next: ["git add <file>", "git clean -fd"]
  }
];


  window.gitMapData = {
    zones,
    mainPathCommandIds,
    workspaceFocusedCommandIds,
    commands,
    toolCommands,
    statusScenarios
  };
})();
