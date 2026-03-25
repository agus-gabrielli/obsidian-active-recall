---
phase: 09-flexible-note-collection
verified: 2026-03-25T00:00:00Z
status: passed
score: 13/13 must-haves verified
re_verification: false
---

# Phase 9: Flexible Note Collection - Verification Report

**Phase Goal:** Flexible note collection - tag-based, link-based, and single-note generation modes
**Verified:** 2026-03-25
**Status:** PASSED
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | collectNotesByTag returns all files matching a tag including hierarchical children | VERIFIED | `src/collectors.ts` lines 37-55: normalizes tag, calls `getAllTags`, matches `normalized.startsWith(normalizedTarget + '/')` |
| 2 | collectNotesByLinks returns root + depth-1 linked notes, and optionally depth-2 | VERIFIED | `src/collectors.ts` lines 93-134: BFS with `item.d >= depth` guard, includes backlinks via reverse resolvedLinks lookup |
| 3 | getAllVaultTags returns deduplicated tag counts across all vault files | VERIFIED | `src/collectors.ts` lines 65-81: iterates all vault files, builds Map<string, number> |
| 4 | buildTagOutputPath produces `_self-tests/tags/<hierarchy>.md` | VERIFIED | `src/collectors.ts` lines 144-147: returns `_self-tests/tags/${normalized}.md` |
| 5 | buildLinksOutputPath produces `_self-tests/links/<rootBasename>.md` | VERIFIED | `src/collectors.ts` lines 153-155: returns `_self-tests/links/${rootFile.basename}.md` |
| 6 | buildNoteOutputPath produces same-folder or centralized path | VERIFIED | `src/collectors.ts` lines 162-176: both modes implemented |
| 7 | writeOutputToPath creates intermediate directories and writes file | VERIFIED | `src/collectors.ts` lines 186-206: segments loop with createFolder, then create/modify |
| 8 | GenerationService.generate() accepts CollectionSpec and dispatches to correct collector | VERIFIED | `src/generation.ts` line 321: `async generate(spec: CollectionSpec)`, exhaustive 4-way switch lines 331-352 |
| 9 | TagPickerModal shows all vault tags with note counts and fires callback on selection | VERIFIED | `src/modals.ts` lines 4-46: SuggestModal subclass, getAllVaultTags in constructor, count in renderSuggestion |
| 10 | LinkedNotesPickerModal shows search input, depth-2 toggle, note count preview, and generate button | VERIFIED | `src/modals.ts` lines 48-164: all four UI elements present and wired |
| 11 | Settings interface includes singleNoteOutputMode with default 'centralized' | VERIFIED | `src/settings.ts` line 50: field in interface, line 63: `'centralized'` default (changed from 'same-folder' per user preference in Plan 03) |
| 12 | Command palette has all three new commands | VERIFIED | `src/main.ts` lines 81-118: `generate-self-test-by-tag`, `generate-self-test-from-links`, `generate-self-test-for-note` all registered |
| 13 | File context menu on .md files with isSelfTestFile exclusion | VERIFIED | `src/main.ts` lines 120-136: file-menu handler with `isSelfTestFile(file)` guard at line 124 |

**Score:** 13/13 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/collectors.ts` | CollectionSpec type and 9 exported functions | VERIFIED | 260 lines; exports CollectionSpec, collectNotesByTag, collectNotesByLinks, getAllVaultTags, buildTagOutputPath, buildLinksOutputPath, buildNoteOutputPath, writeOutputToPath, buildFrontmatter, isSelfTestFile |
| `src/__tests__/collectors.test.ts` | 25+ unit tests (min 150 lines) | VERIFIED | 548 lines, 34 tests all passing |
| `src/__mocks__/obsidian.ts` | Extended with metadataCache, getAllTags, vault.getFiles/getFileByPath/createFolder, TFile.parent, SuggestModal, Modal | VERIFIED | All 8 extensions confirmed present |
| `src/modals.ts` | TagPickerModal and LinkedNotesPickerModal (min 80 lines) | VERIFIED | 165 lines; both classes exported |
| `src/generation.ts` | generate(spec: CollectionSpec) with 4-way switch | VERIFIED | Line 321 signature, lines 331-352 switch |
| `src/settings.ts` | singleNoteOutputMode field | VERIFIED | Interface line 50, default line 63, UI lines 242-253 |
| `src/main.ts` | 3 new commands + file context menu | VERIFIED | Lines 80-136 |
| `src/sidebar.ts` | _self-tests/ folder exclusion + generateForFolder uses CollectionSpec | VERIFIED | Line 21: folder skip, line 200: `generate({ mode: 'folder', folderPath })` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/collectors.ts` | `obsidian` | `getAllTags` import | VERIFIED | Line 1: `import { App, TFile, getAllTags } from 'obsidian'` |
| `src/__tests__/collectors.test.ts` | `src/collectors.ts` | import | VERIFIED | Line 3: `import { ... } from '../collectors'` |
| `src/generation.ts` | `src/collectors.ts` | import collectors | VERIFIED | Lines 3-13: full import block |
| `src/generation.ts` | `src/collectors.ts` | writeOutputToPath call | VERIFIED | Line 392: `await writeOutputToPath(this.app, outputPath, output)` |
| `src/modals.ts` | `src/collectors.ts` | import getAllVaultTags, collectNotesByLinks | VERIFIED | Line 2: `import { getAllVaultTags, collectNotesByLinks } from './collectors'` |
| `src/main.ts` | `src/modals.ts` | import TagPickerModal, LinkedNotesPickerModal | VERIFIED | Line 5: `import { TagPickerModal, LinkedNotesPickerModal } from './modals'` |
| `src/main.ts` | `src/collectors.ts` | import isSelfTestFile | VERIFIED | Line 6: `import { isSelfTestFile } from './collectors'` |
| `src/main.ts` | `src/generation.ts` | generationService.generate(spec) | VERIFIED | Lines 85, 96, 115, 131: all use CollectionSpec syntax |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| COL-01 | 09-01, 09-02, 09-03 | Tag picker modal for tag-based generation | SATISFIED | `collectNotesByTag` + `TagPickerModal` + `generate-self-test-by-tag` command |
| COL-02 | 09-01, 09-02, 09-03 | Tag picker shows all vault tags with autocomplete | SATISFIED | `getAllVaultTags` feeds `TagPickerModal.getSuggestions` |
| COL-03 | 09-01, 09-02 | Tag output to `_self-tests/` folder | SATISFIED | `buildTagOutputPath` returns `_self-tests/tags/<tag>.md`; REQUIREMENTS.md example path differs from implementation but the `_self-tests/` destination is correct |
| COL-04 | 09-01, 09-02, 09-03 | Root/MOC note + directly linked notes (depth 1) | SATISFIED | `collectNotesByLinks` BFS with depth 1 default |
| COL-05 | 09-01, 09-02, 09-03 | Depth-2 links toggle | SATISFIED | `LinkedNotesPickerModal` depth-2 checkbox wired to `collectNotesByLinks(..., depth)` |
| COL-06 | 09-02, 09-03 | Single-note via context menu + command palette | SATISFIED | `generate-self-test-for-note` command + file-menu handler in `main.ts` |
| COL-07 | 09-01, 09-02, 09-03 | Single-note output location (same-folder or centralized) | SATISFIED | `buildNoteOutputPath` with both modes; `singleNoteOutputMode` setting controls which |

All 7 required COL requirements satisfied. No orphaned requirements found - all COL-01 through COL-07 are mapped to Phase 9 in REQUIREMENTS.md and implemented.

---

## Anti-Patterns Found

None detected. Scan of modified files:

- `src/collectors.ts` - all functions return real computed values, no stubs
- `src/generation.ts` - 4-way switch has real dispatch, not placeholder cases
- `src/modals.ts` - both modal classes have real DOM construction and event wiring
- `src/settings.ts` - real interface field with working UI dropdown
- `src/main.ts` - real command registrations with callbacks that call generationService

Notable: the `LinkedNotesPickerModal` empty-links guard was updated in Plan 03 from the plan-specified message ("This note has no outgoing links...") to a broader check covering backlinks as well ("This note has no linked notes..."). This is correct behavior, not a stub.

---

## Human Verification Required

Plan 03, Task 2 was a `checkpoint:human-verify` gate. Per the 09-03-SUMMARY.md, the user approved all 9 checks. The SUMMARY documents 5 checkpoint-driven fixes applied after human testing. Automated checks (tests, tsc, build) all pass confirming the final state is correct.

Items that cannot be re-verified programmatically:

### 1. Tag picker visual appearance

**Test:** Open command palette, run "Generate Self-Test by Tag"
**Expected:** Modal shows tags with counts, hierarchical tags indented, filtering works
**Why human:** DOM rendering and visual layout cannot be verified by grep or tsc

### 2. Linked notes modal - depth-2 preview update

**Test:** Open LinkedNotesPickerModal, select a note, toggle depth-2 checkbox
**Expected:** Preview count updates immediately without page reload
**Why human:** Event-driven DOM update requires runtime execution

### 3. Sidebar refresh after non-folder generation

**Test:** With sidebar open, generate a tag-based or linked-notes self-test
**Expected:** Sidebar refreshes automatically, showing new self-test
**Why human:** Requires runtime execution to verify vault listener fires and sidebar renders

---

## Build and Test Results

- `npx jest` - 127/127 tests passing (5 test suites)
- `npx tsc --noEmit` - 0 errors
- `npm run build` - production build successful

Collector tests specifically: 34/34 passing (expanded from 30 in Plan 01 due to backlinks tests added in Plan 03).

---

## Plan 03 Additions vs. Original Plan Scope

Plan 03 introduced several scope expansions via checkpoint feedback that are present in the codebase but not in the original plan must_haves:

- **Backlinks in link collection** - `collectNotesByLinks` now includes reverse resolvedLinks traversal (bidirectional BFS)
- **Full-path wikilinks** - `buildFrontmatter` emits `[[full/path|display]]` instead of `[[basename]]`
- **Sidebar _self-tests/ exclusion** - `getFolderStatuses` skips `_self-tests/` folders
- **Folder mode self-test exclusion** - `collectNoteFiles` uses `isSelfTestFile` instead of basename check
- **Shared generatingFolders state** - moved to `GenerationService.generatingFolders` for sidebar spinner timing

All additions verified present in code and tested.

---

_Verified: 2026-03-25_
_Verifier: Claude (gsd-verifier)_
