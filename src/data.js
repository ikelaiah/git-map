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
    next: "Use git pull --ff-only to receive fast-forward changes or git push to share commits.",
    nextCommands: ["git pull --ff-only", "git push"]
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
    risk: "caution",
    caution: "Rewrites last local commit",
    note: "Moves the last commit back to staging so you can adjust and recommit. Soft reset keeps your edits staged, but avoid it on commits you have already shared."
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
    note: "Fetches the configured upstream and integrates it into the current branch. For divergent histories, choose or configure a rebase or merge strategy; --ff-only is a separate explicit safety option."
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
    { command: "git stash pop --index", note: "Restore a stash and ask Git to restore its saved staging/index state too." },
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
    { command: "git switch -c <new-branch> <start-point>", note: "Create a branch at a specific commit, branch, tag, or ref." },
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
    { command: "git branch -r", note: "List branches known from the remote." },
    { command: "git pull --ff-only", note: "Fetch and update only when the current branch can fast-forward." },
    { command: "git pull --rebase", note: "Fetch and replay local commits on top of the upstream. Use carefully.", caution: true },
    { command: "git pull --no-rebase", note: "Fetch and merge the upstream, creating a merge commit when needed." }
  ],
  all: [
    { command: "git status", note: "Start here when you are unsure what Git sees." },
    { command: "git diff", note: "Inspect unstaged changes." },
    { command: "git diff --staged", note: "Inspect staged changes." },
    { command: "git log --oneline --graph --decorate --all", note: "Read commit history." },
    { command: "git switch -c <branch>", note: "Create a branch before starting work." }
  ]
};

const commandPreviews = {
  "stash-save": {
    before: "Tracked edits are visible in the workspace and may block a branch switch.",
    after: "Those edits move onto the stash shelf and the workspace returns to a clean checkout.",
    effect: "Good for pausing work without making a commit."
  },
  "stash-pop": {
    before: "A stash entry is saved away from the working tree.",
    after: "The latest stash is applied back into the workspace and removed from the stash list.",
    effect: "Can create conflicts when the files changed since the stash was made."
  },
  "stash-apply": {
    before: "A stash entry is saved away from the working tree.",
    after: "The stash content is copied back into the workspace and the stash entry remains available.",
    effect: "Useful when you want to test the stash before deleting it."
  },
  "stash-untracked": {
    before: "Tracked edits and new untracked files are sitting in the workspace.",
    after: "Both tracked and untracked work are stored in a stash entry.",
    effect: "Plain git stash leaves untracked files behind; this version includes them."
  },
  "stash-branch": {
    before: "A stash belongs to work that may no longer apply cleanly on the current branch.",
    after: "A new branch is created from the stash base and the stash is applied there.",
    effect: "Best when shelved work has grown into its own branch."
  },
  add: {
    before: "Edits are in the workspace but are not part of the next commit yet.",
    after: "Selected file changes are copied into the staging area.",
    effect: "Only staged changes become part of the next commit."
  },
  "restore-staged": {
    before: "Changes are staged and ready to become part of the next commit.",
    after: "Those changes leave staging but remain edited in the workspace.",
    effect: "Use it to remove accidental files from the next commit."
  },
  restore: {
    before: "A tracked file has workspace edits you have not committed.",
    after: "That file is reset from the index and the unstaged edits are gone.",
    effect: "This discards file content, so inspect git diff first."
  },
  "restore-all": {
    before: "Tracked files have unstaged workspace edits.",
    after: "All tracked workspace edits are discarded.",
    effect: "This is broad; check git diff before running it."
  },
  commit: {
    before: "The staging area contains the snapshot you want to save.",
    after: "A new local commit records that snapshot in history.",
    effect: "The commit stays local until you push it."
  },
  "reset-soft": {
    before: "The latest local commit exists in history.",
    after: "The branch moves back one commit and the changes stay staged.",
    effect: "This rewrites local history; avoid it for commits other people may have pulled."
  },
  "reset-hard": {
    before: "Tracked workspace or staged changes differ from HEAD.",
    after: "Tracked files and staging match HEAD exactly.",
    effect: "Uncommitted tracked changes are lost."
  },
  switch: {
    before: "Your workspace reflects the current branch.",
    after: "Your workspace updates to match the target branch.",
    effect: "Git may ask you to commit or stash first if local edits would be overwritten."
  },
  "switch-create": {
    before: "You are on the current commit of the current branch.",
    after: "A new branch points at that commit and becomes the active branch.",
    effect: "Use before starting focused work so commits land in the right place."
  },
  merge: {
    before: "Two branches have separate lines of work.",
    after: "The source branch changes are integrated into the current branch.",
    effect: "Git may create a merge commit or stop for conflicts."
  },
  rebase: {
    before: "Your branch has commits based on an older branch point.",
    after: "Your commits are replayed on top of another branch.",
    effect: "This rewrites commit IDs; avoid rebasing shared commits."
  },
  "cherry-pick": {
    before: "A useful commit exists on another branch.",
    after: "That change is copied onto the current branch as a new commit.",
    effect: "Good for moving one fix without merging a whole branch."
  },
  revert: {
    before: "A committed change exists in history.",
    after: "A new commit reverses that change.",
    effect: "This is the safest undo for shared history."
  },
  "log-graph": {
    before: "Branch and commit relationships may be unclear.",
    after: "You see a compact graph of all known branches, tags, and commits.",
    effect: "Use before merge, rebase, cherry-pick, or recovery work."
  },
  blame: {
    before: "A file line changed, but the responsible commit is unknown.",
    after: "Each line is annotated with the last commit that touched it.",
    effect: "Use for investigation, not for changing files."
  },
  tag: {
    before: "A commit marks an important point such as a release.",
    after: "A named tag points at that commit.",
    effect: "Tags are useful for releases and deployment references."
  },
  fetch: {
    before: "Your local view of the remote may be stale.",
    after: "Remote-tracking branches update without changing workspace files.",
    effect: "Good first step before comparing or deciding whether to pull."
  },
  pull: {
    before: "The remote may have commits you do not have locally.",
    after: "Remote commits are fetched and integrated when the result matches the pull strategy.",
    effect: "With current Git defaults, diverged histories need an explicit rebase or merge choice."
  },
  push: {
    before: "Local commits exist that the remote does not have.",
    after: "Those commits are uploaded to the shared remote branch.",
    effect: "Push publishes your local branch history."
  },
  "remote-add": {
    before: "The local repository has no saved remote destination.",
    after: "origin points at the remote URL.",
    effect: "After this, push and pull can target origin."
  },
  clone: {
    before: "The project exists only on a remote server.",
    after: "You have a local repository and workspace checked out from that remote.",
    effect: "This is usually the first command for joining an existing project."
  }
};

commands.forEach((command) => {
  command.preview = commandPreviews[command.id];
});

const statusScenarios = [
  {
    id: "clean",
    label: "Clean working tree",
    zone: "remote",
    commandId: "pull",
    summary: "There are no local file edits or staged changes waiting to be saved.",
    checks: ["git status", "git fetch"],
    next: ["git pull --ff-only", "git switch -c <branch>"]
  },
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
    next: ["git pull --ff-only"]
  },
  {
    id: "diverged",
    label: "Diverged",
    zone: "remote",
    commandId: "fetch",
    summary: "Both local and remote have commits the other side does not have. Choose a rebase or merge strategy, or fetch first and then merge origin/<branch>; do not treat these alternatives as a sequence.",
    checks: ["git status", "git fetch", "git log --oneline --graph --decorate --all"],
    next: ["git pull --rebase", "git pull --no-rebase", "git fetch", "git merge origin/<branch>"]
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
  },
  {
    id: "new-repo",
    label: "New repository",
    zone: "workspace",
    commandId: "add",
    summary: "This repository has no commits yet, so the first snapshot still needs to be staged and committed.",
    checks: ["git status"],
    next: ["git add <file>", "git commit -m \"message\"", "git remote add origin <url>"]
  }
];

const statusDetectors = [
  {
    scenarioId: "conflict",
    label: "Conflict markers",
    priority: 100,
    patterns: ["unmerged paths", "both modified:", "both added:", "deleted by us:", "deleted by them:", "CONFLICT", "fix conflicts and run"]
  },
  {
    scenarioId: "diverged",
    label: "Diverged branch",
    priority: 88,
    patterns: ["have diverged", "and have 1 and", "different commits each"]
  },
  {
    scenarioId: "staged",
    label: "Staged snapshot",
    priority: 82,
    patterns: ["changes to be committed"]
  },
  {
    scenarioId: "unstaged",
    label: "Unstaged edits",
    priority: 78,
    patterns: ["changes not staged for commit"]
  },
  {
    scenarioId: "untracked",
    label: "Untracked files",
    priority: 74,
    patterns: ["untracked files:"]
  },
  {
    scenarioId: "behind",
    label: "Behind remote",
    priority: 68,
    patterns: ["your branch is behind"]
  },
  {
    scenarioId: "ahead",
    label: "Ahead of remote",
    priority: 64,
    patterns: ["your branch is ahead"]
  },
  {
    scenarioId: "new-repo",
    label: "No commits yet",
    priority: 58,
    patterns: ["no commits yet", "initial commit"]
  },
  {
    scenarioId: "clean",
    label: "Clean tree",
    priority: 10,
    patterns: ["nothing to commit, working tree clean", "working tree clean"]
  }
];

const sampleStatusOutput = `On branch feature-map
Your branch is ahead of 'origin/feature-map' by 1 commit.
  (use "git push" to publish your local commits)

Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  modified:   src/app.js

Untracked files:
  (use "git add <file>..." to include in what will be committed)
  src/status-parser.js`;

const commandJourneys = [
  {
    id: "edit-push",
    title: "Edit files, commit, push",
    summary: "The everyday path from changed files to a shared branch.",
    steps: [
      { title: "Sync first", commandId: "pull", zone: "remote", note: "Start by bringing in remote commits so your work is based on the latest shared branch." },
      { title: "Review edits", command: "git diff", zone: "workspace", note: "Inspect unstaged workspace changes before choosing what belongs in the next commit." },
      { title: "Stage the right files", commandId: "add", zone: "workspace", note: "Move only the intended file changes into the staging area." },
      { title: "Check the snapshot", command: "git diff --staged", zone: "staging", note: "Confirm the staged snapshot is exactly what you want to save." },
      { title: "Commit locally", commandId: "commit", zone: "staging", note: "Save the staged snapshot into local history." },
      { title: "Publish", commandId: "push", zone: "local", note: "Upload local commits to the shared remote branch." }
    ]
  },
  {
    id: "stage-carefully",
    title: "Stage only what belongs",
    summary: "A careful path for turning a messy workspace into a clean commit.",
    steps: [
      { title: "See all changes", command: "git status", zone: "workspace", note: "Start with the file-level state Git sees." },
      { title: "Inspect content", command: "git diff", zone: "workspace", note: "Read unstaged edits before staging anything." },
      { title: "Stage hunks", command: "git add -p", zone: "staging", note: "Choose individual hunks when one file contains multiple unrelated changes." },
      { title: "Unstage mistakes", commandId: "restore-staged", zone: "staging", note: "Move accidental staged changes back to the workspace without discarding them." },
      { title: "Commit the focused snapshot", commandId: "commit", zone: "staging", note: "Commit once the staged set tells one clear story." }
    ]
  },
  {
    id: "conflict-rescue",
    title: "Resolve a merge conflict",
    summary: "The calm route after Git stops a merge and asks for a decision.",
    steps: [
      { title: "Read the conflict state", command: "git status", zone: "workspace", note: "Find files listed under unmerged paths." },
      { title: "Inspect conflict hunks", command: "git diff", zone: "workspace", note: "Use the diff to decide what each conflicted file should contain." },
      { title: "Edit files", command: "# edit conflicted files", zone: "workspace", note: "Remove conflict markers and keep the final intended content." },
      { title: "Mark resolved", commandId: "add", zone: "workspace", note: "Staging the file tells Git the conflict is resolved." },
      { title: "Finish the merge", command: "git commit", zone: "local", note: "Complete the merge commit after all conflicted files are resolved." }
    ]
  },
  {
    id: "push-rejected",
    title: "Push was rejected",
    summary: "Recover when the remote branch moved before your push.",
    steps: [
      { title: "Update remote view", commandId: "fetch", zone: "remote", note: "Download remote history without changing your workspace." },
      { title: "Read the graph", commandId: "log-graph", zone: "local", note: "See whether your branch is behind or diverged." },
      { title: "Integrate remote commits", command: "git pull --rebase", zone: "remote", note: "Replay your unpushed local commits on top of the updated upstream. Use git pull --no-rebase instead when the project expects merge commits." },
      { title: "Resolve if needed", command: "git status", zone: "workspace", note: "If Git reports conflicts, resolve and stage them before continuing." },
      { title: "Push again", commandId: "push", zone: "local", note: "Publish after your branch includes the remote changes." }
    ]
  },
  {
    id: "safe-undo",
    title: "Undo a shared commit safely",
    summary: "Back out a committed change without rewriting public history.",
    steps: [
      { title: "Find the commit", commandId: "log-graph", zone: "local", note: "Identify the commit you need to undo." },
      { title: "Create the reversing commit", commandId: "revert", zone: "local", note: "Record a new commit that reverses the chosen change." },
      { title: "Check the result", command: "git status", zone: "workspace", note: "Confirm the working tree is clean after the revert commit." },
      { title: "Share the undo", commandId: "push", zone: "local", note: "Push the new revert commit so teammates get the same correction." }
    ]
  },
  {
    id: "stash-interruption",
    title: "Pause work for an interruption",
    summary: "Shelve unfinished edits, switch context, then bring them back.",
    steps: [
      { title: "Check what will move", command: "git status", zone: "workspace", note: "Review changed and untracked files before stashing." },
      { title: "Shelve work", commandId: "stash-save", zone: "workspace", note: "Move tracked edits and staged changes out of the workspace." },
      { title: "Switch context", commandId: "switch", zone: "local", note: "Move to the branch that needs attention." },
      { title: "Return to your work", commandId: "stash-pop", zone: "stash", note: "Apply the shelved work back into the workspace when ready." }
    ]
  }
];


  window.gitMapData = {
    zones,
    mainPathCommandIds,
    workspaceFocusedCommandIds,
    commands,
    toolCommands,
    statusScenarios,
    statusDetectors,
    sampleStatusOutput,
    commandJourneys
  };
})();
