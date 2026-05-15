# Changelog

## [1.2.0] - 2026-05-15

### Added

- Added a dismissible "Start here" callout under the page intro on `index.html` and `branch-map.html`, with the dismissed state stored in `localStorage` under `git-map-start-here-dismissed`.
- Added an `id="daily-path"` anchor on the Beginner Daily Path block so the overview callout can jump to it.
- Added `git fetch` to the diverged scenario `next` steps so the standalone `git merge origin/<branch>` recommendation is paired with the preceding fetch.

### Changed

- Softened `git reset --soft HEAD~1` from `danger` to `caution` because the command keeps your edits staged; the note now also reminds users to avoid it on shared commits.
- Updated the diverged scenario summary to describe the fetch-then-merge option alongside rebase and merge.
- Moved the start-here setup into `src/version.js` so both HTML pages share the same callout behaviour without duplicating code.

## [1.1.0] - 2026-05-15

### Added

- Added GitHub repository links to the `index.html` and `branch-map.html` page navigation.
- Added a quiet `v1.1.0` version label to both HTML page headers.
- Added `src/version.js` as the shared browser-side version source for both HTML pages.
- Added short command example notes for placeholders and visual commit IDs.
- Added validation coverage for branch command generation, staged commit flow, branch name cleanup, and shared version labels.

### Changed

- Updated the Git Branch Map so users can create a new branch from any selected commit, not only commits on `main`.
- Updated generated branch sandbox commands to show realistic edit, stage, and commit sequences.
- Updated merge conflict command history to include the required `git add` steps before committing.
- Clarified current `git pull` guidance with explicit fast-forward, rebase, and merge options for diverged histories.
- Tightened generated branch name cleanup to better match Git ref-name constraints.
- Tightened the main page intro copy.
- Aligned the page header layout across Git Map and Git Branch Map, with Git Map desktop filters sharing a compact row.
- Reduced the Situation Solver heading hierarchy so the feature name is the heading and the route-matching text is supporting copy.
- Updated README command coverage and usage notes for the latest branch behavior.

## [1.0.0] - 2026-05-13

### Added

- Added a pasteable `git status` analyzer that detects clean, staged, unstaged, untracked, ahead, behind, diverged, conflict, and new-repository states.
- Added scenario journeys for edit-to-push, careful staging, merge conflict rescue, rejected push recovery, safe undo, and stash interruption workflows.
- Added before/after/effect previews to command spotlight, command cards, and journey steps.
- Added command receipts for guided journeys.
- Expanded validation to cover command preview data, status detectors, and journey definitions.

### Changed

- Updated the main page copy and README for the 1.0.0 release.

## [0.9.0] - 2026-05-12

### Added

- Added the dependency-free Git Map overview for Stash, Local Workspace, Staging Area, Local Repo, and Remote Repo.
- Added focused and everything views for exploring command flows one Git area at a time or as a full map.
- Added safe-first and show-risky filters for destructive or history-rewriting commands.
- Added daily path markers for the common `git pull`, `git add`, `git commit`, and `git push` workflow.
- Added hover, focus, click, and keyboard interactions for pinning Git areas and command routes.
- Added command cards with copy buttons, notes, badges, and route highlighting.
- Added the What State Am I In helper for common `git status` situations.
- Added useful check commands for each Git area.
- Added light, dark, and system appearance modes with local browser persistence.
- Added responsive layout support, including mobile area jump buttons and horizontal map scrolling.
- Added the Git Branch Map sandbox for creating branches, adding commits, switching branches, merging, undoing, resetting, copying command history, and simulating conflicts.
- Added the pure branch map model and validation helpers.
- Added the project validator for command, zone, README, and branch sandbox data integrity.
