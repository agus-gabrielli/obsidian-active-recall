---
phase: 09-flexible-note-collection
plan: 03
subsystem: ui
tags: [typescript, obsidian-api, commands, context-menu, modals, vault-listeners]

# Dependency graph
requires:
  - phase: 09-flexible-note-collection
    provides: "Plan 01 collectors, Plan 02 modals and refactored GenerationService"
provides:
  - "3 new command palette commands (tag, links, single-note)"
  - "File-level context menu with self-test exclusion"
  - "Expanded vault listeners for _self-tests/ and *_self-test patterns"
  - "Backlinks support in link collection (bidirectional BFS)"
  - "Full-path wikilinks in frontmatter to avoid basename resolution conflicts"
  - "Shared generating state between GenerationService and sidebar"
affects: [sidebar-enhancements, spaced-repetition]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Shared state on service class for cross-component coordination"
    - "Bidirectional BFS for link traversal (outgoing + backlinks)"
    - "Full-path wikilinks with display alias for cross-folder references"

key-files:
  created: []
  modified:
    - src/main.ts
    - src/sidebar.ts
    - src/collectors.ts
    - src/generation.ts
    - src/modals.ts

key-decisions:
  - "Added backlinks to link collection per user feedback - bidirectional BFS via resolvedLinks reverse lookup"
  - "Changed singleNoteOutputMode default to 'centralized' per user preference"
  - "Full-path wikilinks [[path/to/note|display]] to avoid self-test files resolving to themselves"
  - "Moved generatingFolders state to GenerationService for sidebar visibility regardless of open timing"

patterns-established:
  - "Self-test exclusion: isSelfTestFile used consistently across all collection modes"
  - "Sidebar exclusion: _self-tests/ folders filtered from getFolderStatuses"

requirements-completed: [COL-01, COL-02, COL-04, COL-05, COL-06, COL-07]

# Metrics
duration: 25min
completed: 2026-03-25
---

# Plan 03: Command Wiring Summary

**3 new palette commands, file context menu, backlinks support, and self-test isolation fixes across all collection modes**

## Performance

- **Duration:** 25 min
- **Tasks:** 2 (1 code + 1 human-verify)
- **Files modified:** 5

## Accomplishments
- Three new commands: Generate Self-Test by Tag, from Linked Notes, for Current Note
- File-level context menu with isSelfTestFile guard
- Backlinks included in link collection via bidirectional BFS with deduplication
- Full-path wikilinks prevent basename resolution conflicts in _self-tests/
- Folder-mode collectNoteFiles now excludes all self-test patterns
- Sidebar hides _self-tests/ folders and shows spinner for externally-started generation

## Task Commits

1. **Task 1: Commands, context menu, vault listeners** - `56de4dd` (feat)
2. **Fix: Backlinks + sidebar exclusion** - `b2ffd55` (fix, from checkpoint feedback)
3. **Fix: Full-path wikilinks + folder self-test exclusion** - `c10a7ce` (fix, from checkpoint feedback)
4. **Fix: Centralized default + shared generating state** - `2317423` (fix, from checkpoint feedback)

## Deviations from Plan

### Checkpoint-driven additions

**1. Backlinks in link collection**
- **Found during:** Human verification (Check 2)
- **Issue:** Only outgoing links collected, missing contextually relevant backlinks
- **Fix:** Added reverse lookup of resolvedLinks in BFS, dedup via visited set
- **Files modified:** src/collectors.ts, src/__tests__/collectors.test.ts, src/modals.ts

**2. Sidebar showing _self-tests/ folders**
- **Found during:** Human verification (Check 1 sidebar observation)
- **Fix:** getFolderStatuses skips folders with path _self-tests or _self-tests/*
- **Files modified:** src/sidebar.ts, src/__tests__/sidebar.test.ts

**3. Wikilinks resolving to self-test file**
- **Found during:** Human verification (Check 1 frontmatter)
- **Fix:** buildFrontmatter emits [[full/path|display]] instead of [[basename]]
- **Files modified:** src/collectors.ts, src/__tests__/collectors.test.ts

**4. Folder mode including *_self-test.md files**
- **Found during:** Human verification discussion
- **Fix:** collectNoteFiles uses isSelfTestFile instead of basename-only check
- **Files modified:** src/generation.ts, src/__tests__/generation.test.ts

**5. Single-note default + sidebar spinner timing**
- **Found during:** User preference + edge case report
- **Fix:** Default to centralized, move generatingFolders to GenerationService
- **Files modified:** src/settings.ts, src/generation.ts, src/sidebar.ts

---

**Total deviations:** 5 checkpoint-driven fixes
**Impact on plan:** All fixes address real UX issues found during human testing. No scope creep.

## Issues Encountered
None beyond checkpoint feedback items.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All collection modes working end-to-end
- Self-test isolation robust across all modes
- Sidebar ready for future enhancement to show non-folder self-tests

---
*Phase: 09-flexible-note-collection*
*Completed: 2026-03-25*
