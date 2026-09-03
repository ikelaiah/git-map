window.panicData = (() => {
  const recoveries = [
    {
      id: "panic-wrong-branch-local",
      title: "I committed to the wrong branch (not pushed yet)",
      reversibility: "caution",
      diagnosis: "Your commit is on the wrong branch but it only exists on your machine. Nothing is shared yet. This rewrites only local history, but stash restoration can still conflict, so check each step before continuing.",
      commands: [
        { command: "git log --oneline -5", note: "Confirm the commit is the most recent one on the wrong branch." },
        { command: "git reset --soft HEAD~1", note: "Undo the commit but keep its changes staged in the index." },
        { command: "git stash push -m \"move wrong-branch commit\"", note: "Save the working tree and index so you can switch branches cleanly." },
        { command: "git switch <correct-branch>", note: "Move to the branch the commit was meant for." },
        { command: "git stash pop --index", note: "Restore the working tree and ask Git to restore the saved staging/index state too. Plain git stash pop restores worktree changes but does not guarantee that they remain staged." },
        { command: "git commit -m \"<your message>\"", note: "Re-commit on the correct branch." }
      ],
      whyItWorks: "git reset --soft moves the branch tip back one commit while keeping the snapshot staged. A stash records both the working tree and index. The --index option asks Git to reinstate that index snapshot; if it conflicts, resolve and stage the result before committing.",
      avoidNextTime: "Run git status before committing to confirm which branch you are on."
    },
    {
      id: "panic-commit-on-main",
      title: "I committed to main by accident (not pushed yet)",
      reversibility: "caution",
      diagnosis: "You made one or more commits directly on main, but you have not pushed. You can move those commits onto a feature branch and rewind main locally. The rewind step uses git reset --hard, which is destructive — capture the feature branch first so the work survives.",
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
      reversibility: "caution",
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
      reversibility: "danger",
      diagnosis: "git reset --hard discards uncommitted edits. If those edits were never committed, they are gone. If they were committed even briefly, reflog may help you locate the commit; recover it as soon as possible because reflog entries are temporary.",
      commands: [
        { command: "git reflog", note: "Look for a recent entry that mentions HEAD@{n}: commit or HEAD@{n}: ... before the reset." },
        { command: "git switch -c rescue <reflog-sha>", note: "Create a rescue branch at the commit you want back." },
        { command: "git log --oneline rescue", note: "Confirm the work is on the rescue branch." },
        { command: "git switch <your-branch>", note: "Return to your original branch." },
        { command: "git merge rescue", note: "Bring the rescued commits back into your working branch." }
      ],
      whyItWorks: "Reflog records recent positions of HEAD and branch refs, so a reset can leave a committed snapshot discoverable for a while. Retention and garbage collection depend on repository configuration and reachability. Create a rescue branch immediately once you find the commit.",
      avoidNextTime: "Commit early and often, even with throwaway messages. A commit is recoverable; an uncommitted edit is not. Prefer git restore or git stash over git reset --hard for cleanup."
    },
    {
      id: "panic-detached-head",
      title: "Git says I am in 'detached HEAD' state",
      reversibility: "caution",
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
      reversibility: "caution",
      diagnosis: "Someone pushed to the same branch after you last pulled. Your local branch is behind the remote, so the remote refuses your push to protect their work. You need to integrate their commits before pushing yours.",
      commands: [
        { command: "git fetch", note: "Download the remote commits without changing your files." },
        { command: "git status", note: "Confirm the branch is now reported as diverged or behind." },
        { heading: "Choose one integration approach — do not run both." },
        { command: "git pull --rebase", note: "Option A: replay your unpushed local commits on top of the remote commits for a linear history." },
        { command: "git pull --no-rebase", note: "Option B: merge the remote commits into your branch when your project expects merge commits." },
        { command: "git push", note: "Push again once the histories are aligned." }
      ],
      whyItWorks: "Git refuses non-fast-forward pushes by default because they would erase commits the remote already has. Pulling first brings those commits into your branch; once your branch contains all of them plus yours, the push fast-forwards cleanly.",
      avoidNextTime: "Run git pull before starting work, and again before pushing if you have been working a while. The Situation Solver on the main page can walk through the diverged-pull decision."
    },
    {
      id: "panic-merge-conflict-abort",
      title: "I am stuck in a merge conflict and want out",
      reversibility: "caution",
      diagnosis: "A merge or rebase started, conflicts appeared, and you do not want to resolve them right now. Abort the operation named by git status. These commands return the operation to its pre-start state, but Git may not be able to reconstruct unrelated uncommitted work that was present before it began.",
      commands: [
        { command: "git status", note: "Confirm whether you are mid-merge or mid-rebase. The output names which one." },
        { heading: "Run exactly one abort command, based on git status." },
        { command: "git merge --abort", note: "Use this only if git status says you are merging." },
        { command: "git rebase --abort", note: "Use this only if git status says you are rebasing." },
        { command: "git status", note: "Verify the working tree is clean and you are back on your original branch." }
      ],
      whyItWorks: "Git records the state needed to stop a merge or rebase and return the branch tip to where the operation started. The conflict result is discarded. This is most predictable when you began with a clean working tree, so save unrelated work before starting integrations.",
      avoidNextTime: "Before merging or rebasing, commit or stash your in-progress work so a possible conflict only involves the branches, not your uncommitted edits."
    },
    {
      id: "panic-lost-stash",
      title: "I cannot find work I stashed",
      reversibility: "danger",
      diagnosis: "Stashes have short names like stash@{0} and they shift when you add new ones. If you popped or dropped a stash, it is removed from the list. The recovery window is temporary and recovery is not guaranteed, so investigate immediately.",
      commands: [
        { command: "git stash list", note: "Check whether the stash is still in the list under a different index." },
        { command: "git fsck --no-reflog | findstr dangling", note: "On Windows PowerShell. Use grep dangling on macOS or Linux. Lists dangling commits, which is where dropped stashes go." },
        { command: "git show <dangling-sha>", note: "Inspect a candidate commit to see if it is the stash you want." },
        { command: "git stash apply <dangling-sha>", note: "Apply the dangling stash commit back into your workspace." }
      ],
      whyItWorks: "A stash is represented by Git objects behind a stash ref. Dropping it removes that ref; unreachable objects can remain until reflog expiry and garbage collection, which vary by configuration. fsck can expose candidates while they still exist, but save a recovered result under a named branch or stash immediately.",
      avoidNextTime: "Prefer git stash push -m \"<message>\" so each stash has a description. Apply stashes with git stash apply (not pop) until you are sure the result is correct, then drop them deliberately."
    },
    {
      id: "panic-deleted-branch",
      title: "I deleted a branch that had unmerged commits",
      reversibility: "caution",
      diagnosis: "Deleting a branch removes its name, not necessarily its commits. A recent reflog may still identify its former tip, but reflog entries and unreachable objects are temporary. Recover it as soon as possible.",
      commands: [
        { command: "git reflog", note: "Find the entry where the deleted branch's tip last lived (often labelled checkout: moving from <branch>)." },
        { command: "git branch <branch-name> <reflog-sha>", note: "Recreate the branch pointing at the recovered commit." },
        { command: "git log --oneline <branch-name>", note: "Confirm the history is back." }
      ],
      whyItWorks: "A branch is a movable label pointing at a commit. Removing that label can leave the commit reachable through recent reflog information. Once you recreate a named branch at the intended commit, it is protected from ordinary unreachable-object cleanup again.",
      avoidNextTime: "Use git branch -d (lowercase) which refuses to delete unmerged branches. Reserve -D (uppercase) for branches you are sure are safe to drop."
    },
    {
      id: "panic-force-push-overwrote",
      title: "I force-pushed and overwrote someone else's commits",
      reversibility: "danger",
      diagnosis: "Stop making destructive changes. Your force push replaced the remote branch tip and may have dropped commits that are not in your clone. Recovery needs a clone that still has the missing commits and a deliberate plan to integrate them with the current remote history.",
      commands: [
        { command: "git fetch origin", note: "First, inspect the current remote without overwriting anything else." },
        { command: "git log --oneline --graph --decorate --all", note: "Compare the current origin/<branch> history with the history available in local clones." },
        { heading: "On a clone that still contains the missing commits:" },
        { command: "git reflog", note: "Locate the missing commit SHA, then verify it with git show <lost-sha>." },
        { command: "git branch rescue/lost-work <lost-sha>", note: "Create a named rescue branch immediately so the missing commits are preserved." },
        { command: "git push origin rescue/lost-work", note: "If useful, publish the rescue branch separately. This does not change the shared branch." },
        { command: "git log --left-right --graph origin/<branch>...rescue/lost-work", note: "Compare the rescued history with the current remote before choosing an integration." },
        { command: "git cherry-pick <lost-sha>", note: "One possible integration: copy a specific missing commit onto a prepared branch. A merge can be appropriate when whole histories should be joined; choose deliberately with the team." },
        { heading: "Only if a coordinated shared-branch rewrite is truly required:" },
        { command: "git push --force-with-lease origin <branch>", note: "Force-with-lease checks that the remote tip is still what you expect, but it does not combine histories. Do this only after the missing work has been preserved and the team has agreed." }
      ],
      whyItWorks: "A force push rewrites the remote branch ref; it does not merge the old and new histories. Another clone may still retain the missing commits in its local history or reflog. Naming them on a rescue branch prevents accidental loss, then lets the team compare and deliberately merge or cherry-pick the work before considering any shared-branch rewrite.",
      avoidNextTime: "Use git push --force-with-lease instead of --force; it refuses the push if the remote tip is not what you expected, catching cases where someone else has pushed since your last fetch. Avoid force-pushing shared branches at all when possible."
    },
    {
      id: "panic-secrets-committed",
      title: "I committed a secret or a huge file",
      reversibility: "danger",
      diagnosis: "If you have not pushed yet, you can replace the local commit. If you have already pushed a secret, treat it as exposed: rotate it first, then coordinate any history rewrite. Rewriting shared history is disruptive and does not undo the exposure.",
      commands: [
        { command: "git log --oneline -3", note: "Confirm whether the bad file is in the most recent commit or further back." },
        { heading: "If the bad commit has not been pushed:" },
        { command: "git reset --soft HEAD~1", note: "Local only: undo the last commit, keep changes staged so you can fix the file." },
        { command: "git restore --staged <file>", note: "Unstage the bad file. Then delete it or add it to .gitignore." },
        { command: "git commit -m \"<your message>\"", note: "Re-commit without the bad file." },
        { heading: "If the secret was already pushed: rotate and invalidate it before touching Git history." },
        { command: "git filter-repo --path <file> --invert-paths", note: "After coordinating with the team, use this separately installed tool (or an equivalent reviewed procedure) to remove the file from history." },
        { command: "git push --force-with-lease origin <branch>", note: "Only after the rewrite has been reviewed and teammates have been warned. Force-with-lease does not remove copies already fetched or undo secret exposure." }
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
