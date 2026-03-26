---
phase: 12-v2-release
plan: 01
subsystem: ui
tags: [obsidian, plugin, rename, css, typescript]

# Dependency graph
requires:
  - phase: 11-sidebar-delete-and-native-picker
    provides: Final feature-complete plugin codebase prior to release
provides:
  - Plugin renamed from "AI Active Recall" to "Self Test" across all source, config, CSS, and test files
  - manifest.json with id=self-test, name=Self Test
  - styles.css with self-test-* CSS class namespace
  - SelfTestPlugin, SelfTestSidebarView, SelfTestSettings, SelfTestSettingTab exported from src/
affects: [12-02, 12-03, store-submission]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "All CSS classes use self-test-* prefix"
    - "All TypeScript types/classes use SelfTest prefix"
    - "Plugin ID is 'self-test' in manifest.json"

key-files:
  created: []
  modified:
    - manifest.json
    - package.json
    - package-lock.json
    - LICENSE
    - styles.css
    - src/main.ts
    - src/sidebar.ts
    - src/settings.ts
    - src/generation.ts
    - src/modals.ts
    - src/__tests__/sidebar.test.ts
    - src/__tests__/generation.test.ts
    - src/__mocks__/obsidian.ts

key-decisions:
  - "All active-recall-* CSS class names replaced with self-test-* in a single atomic pass"
  - "VIEW_TYPE_SELF_TEST = 'self-test-panel' replaces VIEW_TYPE_ACTIVE_RECALL"
  - "LICENSE copyright updated from Dynalist Inc. to Agustin Gabrielli (2025-2026)"

patterns-established:
  - "Rename applied via replace_all across all files before any commit - atomic by design"

requirements-completed: [DIST-04]

# Metrics
duration: 15min
completed: 2026-03-25
---

# Phase 12 Plan 01: Rename Summary

**Full plugin rename from "AI Active Recall" to "Self Test" - plugin ID, CSS namespace, TypeScript classes, user-facing text, and LICENSE copyright updated atomically with 137 tests green and zero TS errors**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-25T00:00:00Z
- **Completed:** 2026-03-25T00:15:00Z
- **Tasks:** 1
- **Files modified:** 13

## Accomplishments

- manifest.json now uses `"id": "self-test"`, `"name": "Self Test"`, and updated description
- All 23+ CSS classes renamed from `active-recall-*` to `self-test-*` in styles.css, sidebar.ts, modals.ts, and sidebar.test.ts
- TypeScript exports renamed: `VIEW_TYPE_SELF_TEST`, `SelfTestSidebarView`, `SelfTestPlugin`, `SelfTestSettings`, `SelfTestSettingTab`
- LICENSE copyright updated from "Dynalist Inc." to "Agustin Gabrielli 2025-2026"
- package.json `name` field updated to `self-test`
- 137 tests pass, TypeScript compiles clean, production bundle builds successfully

## Task Commits

Each task was committed atomically:

1. **Task 1: Atomic rename across all files + LICENSE update** - `c09cc20` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified

- `manifest.json` - id=self-test, name=Self Test, updated description
- `package.json` - name=self-test, updated description
- `package-lock.json` - synced after package.json name change (npm install)
- `LICENSE` - copyright changed to Agustin Gabrielli 2025-2026
- `styles.css` - all active-recall-* classes renamed to self-test-*
- `src/main.ts` - SelfTestPlugin class, VIEW_TYPE_SELF_TEST, SelfTestSettings, SelfTestSettingTab
- `src/sidebar.ts` - VIEW_TYPE_SELF_TEST constant, SelfTestSidebarView class, all CSS strings
- `src/settings.ts` - SelfTestSettings interface, SelfTestSettingTab class
- `src/generation.ts` - SelfTestSettings type references
- `src/modals.ts` - all active-recall-* CSS string literals renamed
- `src/__tests__/sidebar.test.ts` - SelfTestSidebarView import, self-test-* CSS class strings
- `src/__tests__/generation.test.ts` - SelfTestSettings type references
- `src/__mocks__/obsidian.ts` - comments updated to new class names

## Decisions Made

- Used `replace_all` Edit calls for CSS class strings to ensure no occurrences were missed across large files
- `VIEW_TYPE_SELF_TEST = 'self-test-panel'` - panel ID changes with the rename (consistent with CSS namespace)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plugin identity is fully renamed and ready for README updates and store submission
- All source, test, config, and CSS files are consistent with the "Self Test" brand

## Self-Check: PASSED

- SUMMARY.md exists at expected path
- Commit c09cc20 verified in git log

---
*Phase: 12-v2-release*
*Completed: 2026-03-25*
