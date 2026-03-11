---
phase: 04-commands-and-sidebar
plan: "01"
subsystem: testing
tags: [jest, ts-jest, obsidian-mock, tdd, sidebar]

# Dependency graph
requires:
  - phase: 03-generation-service
    provides: GenerationService.generate(), TFile/TFolder mock classes, Jest + ts-jest infrastructure
provides:
  - Failing sidebar tests (TDD red) covering getFolderStatuses, getLastGeneratedDate, activateView, and context-menu handler
  - Extended Obsidian mock with WorkspaceLeaf, Menu, MenuItem, vault.getAllFolders, and workspace mock
affects: [04-02-sidebar-implementation, 04-03-commands]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD red-green-refactor, factory functions for testability (buildContextMenuHandler, buildActivateView)]

key-files:
  created:
    - src/__tests__/sidebar.test.ts
  modified:
    - src/__mocks__/obsidian.ts

key-decisions:
  - "Export buildContextMenuHandler and buildActivateView as factory functions from sidebar.ts for testability - avoids coupling tests to plugin class lifecycle"
  - "Use vault.getAllFolders() (false = exclude root) as the source of folders to evaluate - matches sidebar eligibility logic"
  - "Use TFile.stat.mtime for last-generated date - simpler than parsing YAML frontmatter, acceptable per context discretion"

patterns-established:
  - "Factory function pattern: buildX(app) => handler - enables unit testing of Obsidian event handlers without plugin class"
  - "TDD wave 0: tests exist and fail before any implementation file is touched"

requirements-completed: [CMD-02, CMD-03, UI-01, UI-02]

# Metrics
duration: 8min
completed: 2026-03-11
---

# Phase 4 Plan 01: Sidebar Test Scaffold Summary

**10 failing sidebar unit tests (TDD red) plus extended Obsidian mock with WorkspaceLeaf, Menu, vault.getAllFolders, and workspace APIs**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-11T23:19:31Z
- **Completed:** 2026-03-11T23:27:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended `src/__mocks__/obsidian.ts` with all sidebar-required APIs: WorkspaceLeaf, Menu, MenuItem, stat.mtime on TFile, vault.getAllFolders, and workspace mock with getLeavesOfType/getRightLeaf/revealLeaf
- Created `src/__tests__/sidebar.test.ts` with 10 tests covering all four requirements (CMD-02, CMD-03, UI-01, UI-02) - all fail with "Cannot find module '../sidebar'" as expected
- Existing generation tests (17) remain green throughout

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend obsidian mock with sidebar APIs** - `314ee76` (feat)
2. **Task 2: Write failing sidebar unit tests (TDD red)** - `4172848` (test)

**Plan metadata:** (docs commit follows)

_Note: TDD task 2 is the RED phase only. GREEN phase is in plan 04-02._

## Files Created/Modified

- `src/__mocks__/obsidian.ts` - Added WorkspaceLeaf, Menu, MenuItem classes; stat.mtime on TFile; vault.getAllFolders and workspace on createMockApp(); createMockWorkspaceLeaf() helper
- `src/__tests__/sidebar.test.ts` - 10 failing unit tests: 5 for getFolderStatuses eligibility, 1 for getLastGeneratedDate, 2 for activateView workspace interaction, 2 for context menu handler

## Decisions Made

- Chose factory function pattern (`buildContextMenuHandler`, `buildActivateView`) as the testability interface - lets tests inject mocks without instantiating a full Obsidian Plugin class
- Used `TFile.stat.mtime` for last-generated date derivation (discretion left to implementation per CONTEXT.md)
- Tests assert concrete behavior: folder filtering logic, null vs. non-null selfTestFile, exact menu item title "Generate Self-Test"

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Wave 0 complete: all sidebar tests exist and are failing (red)
- Plan 04-02 can implement `src/sidebar.ts` to turn these tests green
- Mock infrastructure is sufficient for all remaining phase 4 plans
- Constraint: sidebar.ts must export `getFolderStatuses`, `getLastGeneratedDate`, `buildContextMenuHandler`, `buildActivateView` at the top level

---
*Phase: 04-commands-and-sidebar*
*Completed: 2026-03-11*
