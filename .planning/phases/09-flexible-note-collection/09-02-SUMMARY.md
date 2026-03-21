---
phase: 09-flexible-note-collection
plan: 02
subsystem: generation

# Dependency graph
requires:
  - phase: 09-01
    provides: "CollectionSpec type, all collector functions, writeOutputToPath, buildFrontmatter"
provides:
  - "GenerationService.generate(spec: CollectionSpec) - dispatches all four collection modes"
  - "TagPickerModal - grouped tag list with note counts, ready to open from commands"
  - "LinkedNotesPickerModal - search, depth toggle, preview count, generate button"
  - "singleNoteOutputMode setting - same-folder or centralized output for single-note mode"
  - "Mode-aware frontmatter in all generation outputs via buildFrontmatter"
affects: ["09-03", "10-sidebar-redesign"]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "GenerationService dispatches on CollectionSpec.mode with exhaustive switch - all four modes handled"
    - "writeOutputToPath used for tag/links/note modes; writeOutput for folder mode (preserves existing folder behavior)"
    - "LinkedNotesPickerModal uses plain Modal (not SuggestModal) to allow depth checkbox + preview DOM elements"
    - "buildFrontmatter(spec, files) wraps all output with source_mode/source/source_notes traceability"

key-files:
  created:
    - "src/modals.ts"
  modified:
    - "src/generation.ts"
    - "src/settings.ts"
    - "src/__tests__/generation.test.ts"
    - "src/sidebar.ts"
    - "src/main.ts"

key-decisions:
  - "main.ts callers updated alongside sidebar.ts - TS would not compile otherwise (Rule 3 auto-fix)"
  - "writeOutput (folder-path) kept for folder mode to preserve existing _self-test.md naming convention; writeOutputToPath used for all new modes"
  - "displayName uses tag #<tag>, links from <basename>, or <basename> for note - matches user-facing Notice message"

requirements-completed: [COL-01, COL-02, COL-03, COL-04, COL-05, COL-06, COL-07]

# Metrics
duration: 2min
completed: 2026-03-21
---

# Phase 9 Plan 02: GenerationService Refactor and Modals Summary

**GenerationService.generate() refactored to CollectionSpec dispatch with mode-aware frontmatter; TagPickerModal and LinkedNotesPickerModal created and compiling**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-21T23:53:26Z
- **Completed:** 2026-03-21T23:56:20Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Refactored `GenerationService.generate()` from `(folderPath: string)` to `(spec: CollectionSpec)` with a 4-way switch covering folder/tag/links/note modes
- All generation outputs now include mode-aware frontmatter via `buildFrontmatter(spec, files)` with `source_mode`, `source`, and `source_notes` fields
- Added `singleNoteOutputMode` to `ActiveRecallSettings` interface, `DEFAULT_SETTINGS`, and the settings UI
- Created `src/modals.ts` with `TagPickerModal` (SuggestModal subclass with hierarchical tag display) and `LinkedNotesPickerModal` (Modal subclass with search, depth toggle, preview, and generate button)
- All 121 tests pass; zero TypeScript errors

## Task Commits

1. **Task 1: Refactor GenerationService.generate() and extend settings** - `053e48b` (feat)
2. **Task 2: Create TagPickerModal and LinkedNotesPickerModal** - `c56f850` (feat)

## Files Created/Modified

- `src/modals.ts` - TagPickerModal and LinkedNotesPickerModal classes
- `src/generation.ts` - generate() signature changed to CollectionSpec; imports from collectors; mode-aware frontmatter
- `src/settings.ts` - singleNoteOutputMode added to interface, defaults, and display()
- `src/__tests__/generation.test.ts` - all generate() calls updated to { mode: 'folder', folderPath }; singleNoteOutputMode added to settings objects
- `src/sidebar.ts` - generateForFolder passes { mode: 'folder', folderPath }
- `src/main.ts` - both generate(folderPath) callers updated to { mode: 'folder', folderPath }

## Decisions Made

- `main.ts` callers updated as part of this plan rather than deferred to Plan 03 - the TypeScript compiler requires all callers to match the new signature immediately
- `writeOutput` (folder convention) preserved for folder mode; `writeOutputToPath` used for tag/links/note modes to maintain backward compatibility with existing sidebar behavior
- Both modal classes declared without tests in this plan - Plan 03 will exercise them via command wiring; compile-time correctness confirmed via tsc

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Updated main.ts callers alongside test and sidebar files**
- **Found during:** Task 1 (generation.ts refactor), during `npx tsc --noEmit`
- **Issue:** `main.ts` had two `generationService.generate(folderPath)` calls that no longer matched the new `CollectionSpec` signature. Plan mentioned updating main.ts in Plan 03, but TS errors block compilation now.
- **Fix:** Updated both callers in `main.ts` to `generate({ mode: 'folder', folderPath })` - identical pattern to all other folder-mode callers
- **Files modified:** `src/main.ts`
- **Verification:** `npx tsc --noEmit` exits 0; `npx jest` 121/121 pass
- **Committed in:** 053e48b (Task 1 commit)

## Issues Encountered

None beyond the deviation above.

## Known Stubs

None - all implemented code connects to real function calls. Modals are not yet opened from any command (that is Plan 03), but the classes themselves are fully implemented.

## Self-Check: PASSED

All created files found on disk. All task commits verified in git history.

---
*Phase: 09-flexible-note-collection*
*Completed: 2026-03-21*
