window.panicData = (() => {
  const recoveries = [
    {
      id: "panic-wrong-branch-local",
      title: "I committed to the wrong branch (not pushed yet)",
      reversibility: "safe",
      diagnosis: "Your commit is on the wrong branch but it only exists on your machine. Nothing is shared yet, so this is fully reversible.",
      commands: [
        { command: "git log --oneline -5", note: "Confirm the commit is the most recent one on the wrong branch." },
        { command: "git reset --soft HEAD~1", note: "Undo the commit but keep the changes staged." },
        { command: "git stash", note: "Set the staged changes aside so you can switch branches cleanly." },
        { command: "git switch <correct-branch>", note: "Move to the branch the commit was meant for." },
        { command: "git stash pop", note: "Bring the changes back, still staged." },
        { command: "git commit -m \"<your message>\"", note: "Re-commit on the correct branch." }
      ],
      whyItWorks: "git reset --soft moves the branch tip back one commit while keeping your file changes staged. Stashing carries those staged changes across the branch switch, and stash pop restores them on the new branch ready to commit.",
      avoidNextTime: "Run git status before committing to confirm which branch you are on."
    },
    {
      id: "panic-commit-on-main",
      title: "I committed to main by accident (not pushed yet)",
      reversibility: "safe",
      diagnosis: "You made one or more commits directly on main, but you have not pushed. You can move those commits onto a feature branch and rewind main locally.",
      commands: [
        { command: "git log --oneline -5", note: "Note the SHA of the commit main was on before your accidental commits." },
        { command: "git branch <feature-branch>", note: "Create a feature branch that points at your current commit, preserving the work." },
        { command: "git reset --hard <main-original-sha>", note: "Rewind main back to where it was. Safe here because main has not been pushed since the accident." },
        { command: "git switch <feature-branch>", note: "Continue your work on the new branch." }
      ],
      whyItWorks: "Creating the new branch first captures your commits by name. Resetting main with --hard then moves only main back; your commits stay on the feature branch because the branch you just created still points at them.",
      avoidNextTime: "Configure your editor or shell prompt to show the current branch. Some teams also protect main locally with a pre-commit hook."
    },
    {
      id: "panic-commit-mistake-local",
      title: "My last commit has a mistake (not pushed yet)",
      reversibility: "safe",
      diagnosis: "You committed but the message is wrong, you forgot a file, or you included something you should not have. Because the commit is local, you can amend it freely.",
      commands: [
        { command: "git status", note: "See what is currently in the workspace and staging area." },
        { command: "git add <forgotten-file>", note: "Stage anything that should have been in the commit." },
        { command: "git reset HEAD <unwanted-file>", note: "Unstage anything that should not be in the commit." },
        { command: "git commit --amend", note: "Replace the last commit with the new staged snapshot and edit the message." },
        { command: "git commit --amend --no-edit", note: "Use this variant if you only fixed the files and want to keep the original message." }
      ],
      whyItWorks: "git commit --amend rewrites the most recent commit using whatever is currently staged. The old commit is replaced rather than added on top, which is safe as long as nobody else has pulled it yet.",
      avoidNextTime: "Glance at git status and git diff --staged before committing. Use git commit -v to see the diff in your editor while writing the message."
    },
    {
      id: "panic-reset-hard-lost-edits",
      title: "I ran git reset --hard and lost my edits",
      reversibility: "caution",
      diagnosis: "git reset --hard discards uncommitted edits. If those edits were never committed, they are gone. If they were committed even briefly, git reflog can find the commit and bring it back.",
      commands: [
        { command: "git reflog", note: "Look for a recent entry that mentions HEAD@{n}: commit or HEAD@{n}: ... before the reset." },
        { command: "git switch -c rescue <reflog-sha>", note: "Create a rescue branch at the commit you want back." },
        { command: "git log --oneline rescue", note: "Confirm the work is on the rescue branch." },
        { command: "git switch <your-branch>", note: "Return to your original branch." },
        { command: "git merge rescue", note: "Bring the rescued commits back into your working branch." }
      ],
      whyItWorks: "Git keeps a log of every position HEAD has pointed at (the reflog) for about 90 days by default. Even after a hard reset, the commits still exist as long as the reflog remembers them; you just need a branch name to make them reachable again.",
      avoidNextTime: "Commit early and often, even with throwaway messages. A commit is recoverable; an uncommitted edit is not. Prefer git restore or git stash over git reset --hard for cleanup."
    },
    {
      id: "panic-detached-head",
      title: "Git says I am in 'detached HEAD' state",
      reversibility: "safe",
      diagnosis: "You checked out a commit, tag, or remote-tracking branch directly instead of a branch. Any commits you make here are not attached to a branch name and can be lost if you switch away without saving them.",
      commands: [
        { command: "git status", note: "Git tells you what you are detached at and warns about unsaved commits." },
        { command: "git switch -c <new-branch>", note: "If you made commits or want to keep working here, create a branch so the work is reachable." },
        { command: "git switch <existing-branch>", note: "If you did not make commits and just want to leave, switch back to a normal branch." }
      ],
      whyItWorks: "Detached HEAD means HEAD points straight at a commit, not at a branch that points at a commit. Creating a branch attaches a name to your current position so the commits stop being orphaned.",
      avoidNextTime: "Use git switch <branch> instead of git checkout <sha> when you want to move to a branch. If you need to inspect an old commit, do it from a real branch and use git log or git show."
    },
    {
      id: "panic-push-rejected",
      title: "My push was rejected (non-fast-forward)",
      reversibility: "safe",
      diagnosis: "Someone pushed to the same branch after you last pulled. Your local branch is behind the remote, so the remote refuses your push to protect their work. You need to integrate their commits before pushing yours.",
      commands: [
        { command: "git fetch", note: "Download the remote commits without changing your files." },
        { command: "git status", note: "Confirm the branch is now reported as diverged or behind." },
        { command: "git pull --rebase", note: "Replay your local commits on top of the remote commits (linear history)." },
        { command: "git pull --no-rebase", note: "Merge the remote commits into your branch instead (creates a merge commit)." },
        { command: "git push", note: "Push again once the histories are aligned." }
      ],
      whyItWorks: "Git refuses non-fast-forward pushes by default because they would erase commits the remote already has. Pulling first brings those commits into your branch; once your branch contains all of them plus yours, the push fast-forwards cleanly.",
      avoidNextTime: "Run git pull before starting work, and again before pushing if you have been working a while. The Situation Solver on the main page can walk through the diverged-pull decision."
    },
    {
      id: "panic-merge-conflict-abort",
      title: "I am stuck in a merge conflict and want out",
      reversibility: "safe",
      diagnosis: "A merge or rebase started, conflicts appeared, and you do not want to resolve them right now. You can abort and go back to the state before the merge or rebase began.",
      commands: [
        { command: "git status", note: "Confirm whether you are mid-merge or mid-rebase. The output names which one." },
        { command: "git merge --abort", note: "Use this if git status says you are merging." },
        { command: "git rebase --abort", note: "Use this if git status says you are rebasing." },
        { command: "git status", note: "Verify the working tree is clean and you are back on your original branch." }
      ],
      whyItWorks: "Git keeps a record of the state before a merge or rebase started. The --abort flag restores that state, including your files, the branch tip, and the index. Nothing about the conflict is preserved, which is what you want when you are bailing out.",
      avoidNextTime: "Before merging or rebasing, commit or stash your in-progress work so a possible conflict only involves the branches, not your uncommitted edits."
    },
    {
      id: "panic-lost-stash",
      title: "I cannot find work I stashed",
      reversibility: "caution",
      diagnosis: "Stashes have short names like stash@{0} and they shift when you add new ones. If you popped or dropped a stash, it is removed from the list but its commit usually still exists in the reflog.",
      commands: [
        { command: "git stash list", note: "Check whether the stash is still in the list under a different index." },
        { command: "git fsck --no-reflog | findstr dangling", note: "On Windows PowerShell. Use grep dangling on macOS or Linux. Lists dangling commits, which is where dropped stashes go." },
        { command: "git show <dangling-sha>", note: "Inspect a candidate commit to see if it is the stash you want." },
        { command: "git stash apply <dangling-sha>", note: "Apply the dangling stash commit back into your workspace." }
      ],
      whyItWorks: "A stash is a real commit on a hidden ref. Dropping it removes the ref but the commit object survives in the object database until garbage collection runs (default: about 2 weeks for unreachable objects). fsck lists those objects so you can recover one.",
      avoidNextTime: "Prefer git stash push -m \"<message>\" so each stash has a description. Apply stashes with git stash apply (not pop) until you are sure the result is correct, then drop them deliberately."
    },
    {
      id: "panic-deleted-branch",
      title: "I deleted a branch that had unmerged commits",
      reversibility: "safe",
      diagnosis: "Deleting a branch only removes the name, not the commits. As long as you have not run garbage collection, the commits are still in the reflog and recoverable.",
      commands: [
        { command: "git reflog", note: "Find the entry where the deleted branch's tip last lived (often labelled checkout: moving from <branch>)." },
        { command: "git branch <branch-name> <reflog-sha>", note: "Recreate the branch pointing at the recovered commit." },
        { command: "git log --oneline <branch-name>", note: "Confirm the history is back." }
      ],
      whyItWorks: "A branch in Git is just a movable label pointing at a commit. Deleting the label leaves the commit untouched; the reflog still knows which commit the label used to point at. Recreating a branch at that commit fully restores the branch.",
      avoidNextTime: "Use git branch -d (lowercase) which refuses to delete unmerged branches. Reserve -D (uppercase) for branches you are sure are safe to drop."
    },
    {
      id: "panic-force-push-overwrote",
      title: "I force-pushed and overwrote someone else's commits",
      reversibility: "danger",
      diagnosis: "Your force push replaced the remote branch tip and dropped commits the other person had pushed. Their commits are not in your local clone, so you cannot recover them yourself. The other person's clone almost certainly still has them.",
      commands: [
        { command: "git fetch", note: "First, confirm what is currently on the remote so you do not overwrite anything else." },
        { command: "git log origin/<branch>", note: "Inspect what the remote looks like now." },
        { command: "# Ask the teammate: git reflog", note: "On their machine, the reflog still shows the commit SHA their branch tip used to point at." },
        { command: "# Ask the teammate: git push --force-with-lease origin <sha>:<branch>", note: "They can restore the branch tip to include both their lost commits and yours, then everyone re-pulls." }
      ],
      whyItWorks: "Force-push rewrites the remote branch ref to your local tip. The dropped commits still exist in any clone that pulled them recently, including the teammate's clone. The reflog there preserves the SHA, which is enough to push the branch back to a point that contains the missing work.",
      avoidNextTime: "Use git push --force-with-lease instead of --force; it refuses the push if the remote tip is not what you expected, catching cases where someone else has pushed since your last fetch. Avoid force-pushing shared branches at all when possible."
    },
    {
      id: "panic-secrets-committed",
      title: "I committed a secret or a huge file",
      reversibility: "caution",
      diagnosis: "If you have not pushed yet, amend or reset to remove it from history. If you have already pushed, the secret is in the shared history; you must rotate the secret AND rewrite history. Rewriting shared history is disruptive — coordinate with your team.",
      commands: [
        { command: "git log --oneline -3", note: "Confirm whether the bad file is in the most recent commit or further back." },
        { command: "git reset --soft HEAD~1", note: "Local only: undo the last commit, keep changes staged so you can fix the file." },
        { command: "git restore --staged <file>", note: "Unstage the bad file. Then delete it or add it to .gitignore." },
        { command: "git commit -m \"<your message>\"", note: "Re-commit without the bad file." },
        { command: "# If already pushed: rotate the secret immediately.", note: "Treat the secret as compromised. Generate a new one and invalidate the old one before doing anything else." },
        { command: "# Then use git filter-repo or BFG Repo-Cleaner to rewrite history.", note: "These are separate tools. See https://github.com/newren/git-filter-repo and warn your team before force-pushing." }
      ],
      whyItWorks: "Until a commit is pushed, it is purely local and can be replaced freely. Once pushed, the commit exists in every clone and on the server; rewriting history is possible with filter-repo, but anyone who pulled the bad commit must reset their clone. For secrets, history rewriting does not undo exposure — it only stops new clones from seeing it.",
      avoidNextTime: "Keep a .gitignore that excludes credential files (.env, *.pem, service-account-*.json). Consider pre-commit hooks like gitleaks. For large binaries, use Git LFS or a separate artifact store."
    }
  ];

  const tree = {
    rootQuestion: "What did you do?",
    rootOptions: [
      {
        id: "committed",
        label: "Committed something",
        nextQuestion: "Have you pushed it yet?",
        options: [
          {
            id: "committed/local",
            label: "No, only local",
            nextQuestion: "What is wrong with the commit?",
            options: [
              { id: "committed/local/wrong-branch", label: "It is on the wrong branch", recoveryId: "panic-wrong-branch-local" },
              { id: "committed/local/on-main", label: "It is on main and should not be", recoveryId: "panic-commit-on-main" },
              { id: "committed/local/mistake", label: "It contains a mistake", recoveryId: "panic-commit-mistake-local" },
              { id: "committed/local/secret", label: "It includes a secret or a huge file", recoveryId: "panic-secrets-committed" }
            ]
          },
          {
            id: "committed/pushed",
            label: "Yes, already pushed",
            nextQuestion: "What is the problem?",
            options: [
              { id: "committed/pushed/rejected", label: "My push was rejected", recoveryId: "panic-push-rejected" },
              { id: "committed/pushed/secret", label: "It included a secret or a huge file", recoveryId: "panic-secrets-committed" },
              { id: "committed/pushed/force-overwrote", label: "I force-pushed and overwrote a teammate", recoveryId: "panic-force-push-overwrote" }
            ]
          }
        ]
      },
      {
        id: "reset",
        label: "Reset or discarded something",
        nextQuestion: "What disappeared?",
        options: [
          { id: "reset/edits", label: "My uncommitted edits, after git reset --hard", recoveryId: "panic-reset-hard-lost-edits" },
          { id: "reset/branch", label: "A branch I deleted that had unmerged commits", recoveryId: "panic-deleted-branch" },
          { id: "reset/stash", label: "A stash I cannot find", recoveryId: "panic-lost-stash" }
        ]
      },
      {
        id: "stuck",
        label: "I am stuck mid-operation",
        nextQuestion: "What is Git showing?",
        options: [
          { id: "stuck/conflict", label: "Merge or rebase conflict I want to abort", recoveryId: "panic-merge-conflict-abort" },
          { id: "stuck/detached", label: "It says 'detached HEAD'", recoveryId: "panic-detached-head" },
          { id: "stuck/rejected", label: "My push was rejected", recoveryId: "panic-push-rejected" }
        ]
      },
      {
        id: "other",
        label: "Something else",
        recoveryId: null,
        stub: true
      }
    ]
  };

  return { recoveries, tree };
})();
