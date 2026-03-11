---
phase: 04-commands-and-sidebar
plan: "02"
subsystem: ui
tags: [obsidian, itemview, sidebar, jest, typescript, tdd]

# Dependency graph
requires:
  - phase: 04-commands-and-sidebar/04-01
    provides: Failing sidebar tests (TDD red), extended Obsidian mock with WorkspaceLeaf/Menu/MenuItem
  - phase: 03-generation-service
    provides: GenerationService.generate(), Jest + ts-jest infrastructure
provides:
  - src/sidebar.ts - ActiveRecallSidebarView ItemView subclass plus pure helper functions
  - All 10 sidebar unit tests passing (TDD green)
  - getFolderStatuses, getLastGeneratedDate, buildActivateView, buildContextMenuHandler exports
affects: [04-03-commands, main.ts wiring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ItemView subclass with _app private field to avoid collision with inherited app property
    - Structural typing for getLastGeneratedDate parameter (avoids coupling to full TFile type)
    - Optional app+viewType params on buildContextMenuHandler for post-generate sidebar refresh

key-files:
  created:
    - src/sidebar.ts
  modified:
    - src/__mocks__/obsidian.ts

key-decisions:
  - "Use structural type { stat: { mtime: number } } for getLastGeneratedDate param - avoids TypeScript conflict between mock TFile and real Obsidian TFile"
  - "buildContextMenuHandler accepts plain generate function as first arg for testability - production callers pass generationService.generate.bind(generationService)"
  - "Extended obsidian mock with ItemView base class, TAbstractFile type alias, and App interface so sidebar.ts compiles cleanly against mocks"

patterns-established:
  - "Structural typing for Obsidian API params: use minimal interface shapes instead of full Obsidian class types to avoid mock/real type conflicts"
  - "ItemView mock: makeMockEl() factory returns chainable createDiv/createEl/createSpan mocks so renderPanel() can call DOM methods without crashing"

requirements-completed: [UI-01, UI-02]

# Metrics
duration: 3min
completed: 2026-03-11
---

# Phase 4 Plan 02: Sidebar Implementation Summary

**ActiveRecallSidebarView ItemView with getFolderStatuses/buildActivateView/buildContextMenuHandler - all 10 sidebar tests green, 27 total passing**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-11T23:23:36Z
- **Completed:** 2026-03-11T23:26:13Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Created `src/sidebar.ts` with full implementation: VIEW_TYPE_ACTIVE_RECALL constant, FolderStatus interface, all four exported helper functions, and ActiveRecallSidebarView class
- Extended `src/__mocks__/obsidian.ts` with ItemView base class, TAbstractFile type alias, App interface, and makeMockEl() DOM mock helper
- All 27 Jest tests pass (17 generation + 10 sidebar), TypeScript compiles with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement sidebar.ts pure helper functions (make unit tests green)** - `f1bfa36` (feat)
2. **Task 2: Full test suite stays green** - verified in same commit, no new files

**Plan metadata:** (docs commit follows)

_Note: Task 2 was verification-only. All changes landed in the Task 1 commit._

## Files Created/Modified

- `src/sidebar.ts` - Full sidebar implementation: VIEW_TYPE_ACTIVE_RECALL, FolderStatus, getFolderStatuses, getLastGeneratedDate, buildActivateView, buildContextMenuHandler, ActiveRecallSidebarView
- `src/__mocks__/obsidian.ts` - Added ItemView class, TAbstractFile type, App interface, and makeMockEl() DOM factory for sidebar render testing

## Decisions Made

- Used a structural type `{ stat: { mtime: number } }` instead of `TFile` for the `getLastGeneratedDate` parameter. This prevents a TypeScript assignment error when the test passes the mock TFile (which lacks vault/name/parent properties the real Obsidian TFile has).
- `buildContextMenuHandler` takes a plain `generate: (folderPath: string) => Promise<void>` as its first argument, matching what the tests pass (`jest.fn()`). Production code will pass `generationService.generate.bind(generationService)`.
- Added `ItemView` to the mock as a class (not just a type) so `extends ItemView` works at runtime in the Jest environment. The contentEl uses a makeMockEl() factory that returns chainable mock methods.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added ItemView, TAbstractFile, App interface to obsidian mock**
- **Found during:** Task 1 (implement sidebar.ts)
- **Issue:** sidebar.ts imports `ItemView`, `TAbstractFile`, `App` from 'obsidian' but the mock didn't export them, causing "Class extends value undefined" runtime error
- **Fix:** Added ItemView class with mock contentEl, TAbstractFile type alias, App interface, and makeMockEl() DOM helper to `src/__mocks__/obsidian.ts`
- **Files modified:** src/__mocks__/obsidian.ts
- **Verification:** npx jest --testPathPatterns sidebar - 10/10 pass; npx tsc --noEmit - clean
- **Committed in:** f1bfa36 (Task 1 commit)

**2. [Rule 1 - Bug] Used structural type for getLastGeneratedDate parameter**
- **Found during:** Task 1 (TypeScript validation)
- **Issue:** TypeScript rejected mock TFile as argument because it lacks vault/name/parent properties from the real Obsidian TFile class
- **Fix:** Changed parameter type from `TFile` to `{ stat: { mtime: number } }` - still correct semantically, just structurally typed
- **Files modified:** src/sidebar.ts
- **Verification:** npx tsc --noEmit passes cleanly
- **Committed in:** f1bfa36 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 type bug)
**Impact on plan:** Both fixes necessary for TypeScript correctness and Jest runtime. No scope creep.

## Issues Encountered

- Mock App interface needed to be defined before ItemView (which references it in constructor) to avoid TypeScript circular reference errors - resolved by ordering: classes first, then App interface, then createMockApp factory, then ItemView.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- src/sidebar.ts is complete and tested; plan 04-03 can import and wire it into main.ts
- buildActivateView and buildContextMenuHandler signatures are finalized - plan 04-03 will call them with the plugin's generationService instance
- All mock infrastructure in place for plan 04-03 command tests

## Self-Check: PASSED

- src/sidebar.ts - FOUND
- src/__mocks__/obsidian.ts - FOUND
- commit f1bfa36 - FOUND

---
*Phase: 04-commands-and-sidebar*
*Completed: 2026-03-11*
