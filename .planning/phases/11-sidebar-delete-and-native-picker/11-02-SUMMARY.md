---
phase: 11-sidebar-delete-and-native-picker
plan: "02"
subsystem: ui
tags: [obsidian, modal, FuzzySuggestModal, note-picker, linked-notes]

requires:
  - phase: 11-01
    provides: FuzzySuggestModal mock in obsidian.ts, DeleteConfirmModal in modals.ts, trash icon in renderSelfTestRow

provides:
  - NotePickerModal (FuzzySuggestModal<TFile>) for step 1 note selection with basename + dimmed path
  - LinkConfirmModal (Modal) for step 2 with depth toggle, preview count, Generate button
  - openLinkedNotesPicker helper that wires two-step flow with zero-links reopen loop
  - LinkedNotesPickerModal fully removed from codebase
  - All three call sites updated (sidebar renderLinksPanel, sidebar regenerateForLinks, main.ts command)

affects:
  - 11-03

tech-stack:
  added: []
  patterns:
    - "Two-step modal flow: FuzzySuggestModal for selection -> Modal for confirmation"
    - "openLinkedNotesPicker helper encapsulates the full flow including recursive reopen"
    - "Zero-links guard in LinkConfirmModal.onOpen() closes self and calls onReopen() before showing UI"

key-files:
  created: []
  modified:
    - src/modals.ts
    - src/sidebar.ts
    - src/main.ts
    - styles.css

key-decisions:
  - "NotePickerModal uses FuzzySuggestModal<TFile> with getItemText returning basename so fuzzy search works on note names"
  - "LinkConfirmModal checks zero-links in onOpen() before rendering UI - shows Notice + closes + calls onReopen() for clean loop-back"
  - "openLinkedNotesPicker helper (not a class) used at call sites - cleaner than instantiating two classes manually"
  - "renderSuggestion creates active-recall-note-name (basename) and active-recall-note-path (parent dir) matching Quick Switcher pattern per D-10"

patterns-established:
  - "Multi-step picker: step 1 opens step 2 via onSelect callback; step 2 reopens step 1 via onReopen callback for guard cases"

requirements-completed:
  - PICK-01

duration: 15min
completed: 2026-03-26
---

# Phase 11 Plan 02: Native Picker Flow Summary

**LinkedNotesPickerModal replaced with NotePickerModal (FuzzySuggestModal) + LinkConfirmModal two-step flow, with zero-links guard reopening step 1**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-26T00:31:00Z
- **Completed:** 2026-03-26T00:46:51Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments

- NotePickerModal (FuzzySuggestModal) shows all vault .md files with basename primary + dimmed parent path per D-10
- LinkConfirmModal shows selected note, depth-2 toggle, live preview count via collectNotesByLinks, and Generate button per D-11
- Zero-links guard in LinkConfirmModal.onOpen() shows Notice and loops back to step 1 per D-12
- openLinkedNotesPicker helper encapsulates the two-step flow at all three call sites (sidebar button, sidebar regenerate fallback, main.ts command)
- LinkedNotesPickerModal fully removed - no references remain

## Task Commits

1. **Task 1: Create NotePickerModal and LinkConfirmModal, replace LinkedNotesPickerModal** - `27780c8` (feat)

## Files Created/Modified

- `src/modals.ts` - Replaced LinkedNotesPickerModal with NotePickerModal, LinkConfirmModal, and openLinkedNotesPicker helper
- `src/sidebar.ts` - Updated import and both call sites (renderLinksPanel button, regenerateForLinks fallback)
- `src/main.ts` - Updated import and generate-self-test-from-links command
- `styles.css` - Added active-recall-note-suggestion/name/path CSS for Quick Switcher-style rendering

## Decisions Made

- NotePickerModal.getItemText returns `file.basename` so FuzzySuggestModal's built-in fuzzy matching operates on note names
- LinkConfirmModal checks zero-links at the top of onOpen() before rendering any UI, then calls close() followed by onReopen() to loop back cleanly
- Used `openLinkedNotesPicker` as a standalone exported function (not a class method) - call sites are simpler with a single function call
- CSS classes follow the `active-recall-` prefix convention established across the plugin

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Next Phase Readiness

- Two-step native picker is complete and all call sites updated
- TypeScript compiles clean (0 errors), all 137 tests pass
- Ready for Plan 11-03

---
*Phase: 11-sidebar-delete-and-native-picker*
*Completed: 2026-03-26*
