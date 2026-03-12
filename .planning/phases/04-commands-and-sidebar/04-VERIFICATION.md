---
phase: 04-commands-and-sidebar
verified: 2026-03-12T00:00:00Z
status: human_needed
score: 7/7 automated must-haves verified
re_verification: false
human_verification:
  - test: "Right-click any folder in file explorer - verify 'Generate Self-Test' appears; right-click a file - verify it does NOT appear"
    expected: "Menu item appears exactly for folders, not files"
    why_human: "Obsidian file-menu event cannot be triggered programmatically in tests; CMD-03 wiring verified in code but runtime menu registration requires live Obsidian"
  - test: "Open command palette (Cmd+P), type 'Open Active Recall Panel', run it"
    expected: "Sidebar panel opens in the right sidebar showing folder sections ('Generated' and/or 'Not generated')"
    why_human: "CMD-02 command registration and panel rendering requires live Obsidian workspace"
  - test: "Click the brain-circuit ribbon icon in the left ribbon"
    expected: "Same sidebar panel opens or focuses if already open"
    why_human: "Ribbon icon registration verified in code; runtime click behavior requires live Obsidian"
  - test: "With the sidebar panel open, generate a self-test for a folder (via context menu or command palette CMD-01)"
    expected: "After generation completes, the folder moves from 'Not generated' to 'Generated' section without closing/reopening the panel"
    why_human: "Auto-refresh uses vault create/delete events which only fire in live Obsidian runtime"
  - test: "Disable the plugin in Settings > Community Plugins, then re-enable it, then open the panel"
    expected: "Only ONE 'Active Recall' tab appears in the right sidebar"
    why_human: "detachLeavesOfType in onunload is verified in code; duplicate-pane prevention requires live Obsidian lifecycle"
---

# Phase 4: Commands and Sidebar Verification Report

**Phase Goal:** Implement the Active Recall sidebar panel and all command entry points so users can open the panel, see folder generation status, and trigger generation from multiple surfaces.
**Verified:** 2026-03-12
**Status:** human_needed - all automated checks passed; 5 behavioral items require live Obsidian verification
**Re-verification:** No - initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Right-clicking a folder shows "Generate Self-Test" and triggers generation | ? NEEDS HUMAN | `buildContextMenuHandler` registered via `registerEvent` on `file-menu` in main.ts:40-45; guards on `instanceof TFolder`; tested in unit tests (10/10 pass) |
| 2 | Sidebar panel lists folders with `_self-test.md` (date + Regenerate) and without (Generate button) | ? NEEDS HUMAN | `renderPanel()` implemented in sidebar.ts:140-180 with both sections; `getFolderStatuses()` tested with 5 unit tests; layout verified in unit tests |
| 3 | After generation, sidebar reflects updated state without manual refresh | ? NEEDS HUMAN | Vault `create`/`delete` event listeners in main.ts:66-80 call `refreshSidebarIfOpen`; CMD-01 also calls `refreshSidebarIfOpen` at main.ts:62; `buildContextMenuHandler` calls `view.refresh()` post-generate at sidebar.ts:88-97 |
| 4 | Disabling and re-enabling the plugin does not create duplicate panes | ? NEEDS HUMAN | `detachLeavesOfType(VIEW_TYPE_ACTIVE_RECALL)` in `onunload()` at main.ts:83-85 |
| 5 | CMD-02 "Open Active Recall Panel" opens or focuses the sidebar | ? NEEDS HUMAN | `addCommand` with id `open-active-recall-panel` at main.ts:34-38; calls `buildActivateView(this.app)` which checks existing leaves first |
| 6 | Ribbon icon opens/focuses the Active Recall panel | ? NEEDS HUMAN | `addRibbonIcon('brain-circuit', ...)` at main.ts:47-49 calls `activateView()` |
| 7 | All jest tests pass (TDD contract satisfied) | VERIFIED | `npx jest` - 27/27 pass (17 generation + 10 sidebar); `npx tsc --noEmit` - zero errors |

**Automated score: 7/7** (all automated checks pass; runtime behaviors need human)

---

## Required Artifacts

### Plan 04-01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/__tests__/sidebar.test.ts` | 10 sidebar unit tests | VERIFIED | 10 tests present covering getFolderStatuses (5), getLastGeneratedDate (1), activateView (2), context menu handler (2) |
| `src/__mocks__/obsidian.ts` | Extended mock with WorkspaceLeaf, Menu, vault.getAllFolders, workspace | VERIFIED | WorkspaceLeaf (line 56), Menu (line 70), MenuItem (line 61), vault.getAllFolders (line 111), workspace mock (lines 113-118), createMockWorkspaceLeaf (line 166) |

### Plan 04-02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/sidebar.ts` | VIEW_TYPE_ACTIVE_RECALL, ActiveRecallSidebarView, getFolderStatuses, getLastGeneratedDate, buildContextMenuHandler, buildActivateView | VERIFIED | All 6 exports present at correct locations; substantive implementation (186 lines, no stubs) |

### Plan 04-03 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/main.ts` | registerView, CMD-02, CMD-03, ribbon, onunload detach | VERIFIED | All 5 wiring points present; substantive (94 lines); no stubs or TODO comments |
| `src/sidebar.ts` (updated) | Unchanged exports from Plan 02; renderPanel layout updated | VERIFIED | renderPanel has header, section labels, folder rows with date spans and buttons |
| `styles.css` | Flex layout for sidebar panel | VERIFIED | 71 lines; `.active-recall-panel`, `.active-recall-folder-row`, `.active-recall-btn` etc. all defined |
| `esbuild.config.mjs` | copyStylesPlugin copies styles.css to test vault on build | VERIFIED | `copyStylesPlugin` on lines 6-13; `onEnd` copies `styles.css` to test vault path |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/main.ts` | `src/sidebar.ts` | `import VIEW_TYPE_ACTIVE_RECALL, ActiveRecallSidebarView, buildActivateView, buildContextMenuHandler` | WIRED | main.ts line 4 - all four symbols imported and used |
| `src/main.ts onunload` | `workspace.detachLeavesOfType` | prevents duplicate panes | WIRED | main.ts line 84 - `this.app.workspace.detachLeavesOfType(VIEW_TYPE_ACTIVE_RECALL)` |
| `context menu onClick` | `sidebarView.refresh()` | post-generate callback via `refreshSidebarIfOpen` pattern | WIRED | sidebar.ts lines 88-97 call `view.refresh()` after `generate()`; main.ts `refreshSidebarIfOpen` used at lines 62, 69, 78 |
| `src/sidebar.ts` | `src/generation.ts` | `GenerationService` import + constructor injection | WIRED | sidebar.ts line 2 imports GenerationService; constructor at line 108 accepts it; `onGenerate` calls `this.generationService.generate()` at line 183 |
| `src/sidebar.ts` | `obsidian` | `ItemView, TFile, TFolder, Menu, TAbstractFile` imports | WIRED | sidebar.ts line 1 - all five symbols imported and used in implementation |
| `src/__tests__/sidebar.test.ts` | `src/__mocks__/obsidian.ts` | Jest moduleNameMapper | WIRED | Tests import `TFile, TFolder, Menu, createMockApp` from `'../__mocks__/obsidian'` directly (line 1); mock resolved via Jest config |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| CMD-01 | Phase 3 (pre-existing) | Command palette: "Generate Self-Test for Current Folder" | SATISFIED | Pre-existing in main.ts; `refreshSidebarIfOpen` added in this phase at line 62 so CMD-01 now triggers sidebar refresh |
| CMD-02 | 04-01, 04-03 | Command palette: "Open Active Recall Panel" | SATISFIED | `addCommand({ id: 'open-active-recall-panel', ... })` at main.ts:34-38; `buildActivateView` handles existing-leaf and new-leaf cases |
| CMD-03 | 04-01, 04-03 | Folder context menu: "Generate Self-Test" | SATISFIED | `registerEvent(app.workspace.on('file-menu', ...))` at main.ts:40-45; `buildContextMenuHandler` guards on `instanceof TFolder` |
| UI-01 | 04-01, 04-02 | Sidebar lists folders with `_self-test.md` (date + Regenerate) | SATISFIED | `getFolderStatuses` returns `{ folder, selfTestFile: TFile\|null }`; `renderPanel` renders "Generated" section with date and Regenerate button when `selfTestFile !== null` |
| UI-02 | 04-01, 04-02 | Sidebar lists folders without `_self-test.md` (Generate button) | SATISFIED | `renderPanel` renders "Not generated" section with Generate button when `selfTestFile === null` |

**All 5 requirement IDs (CMD-01, CMD-02, CMD-03, UI-01, UI-02) verified against actual code.**

Note: CMD-01 was listed in the phase requirements (ROADMAP.md: "Requirements: CMD-01, CMD-02, CMD-03, UI-01, UI-02") but is not assigned to this phase in REQUIREMENTS.md traceability table (CMD-01 is Phase 3). CMD-01 is pre-existing; this phase extends it with sidebar auto-refresh. No orphaned requirements found.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | - | - | - | No anti-patterns detected |

Scan covered: `src/sidebar.ts`, `src/main.ts`, `src/__tests__/sidebar.test.ts`, `src/__mocks__/obsidian.ts`

- Zero TODO/FIXME/PLACEHOLDER comments
- Zero empty return stubs (`return null`, `return {}`, `return []`)
- Zero console.log-only implementations
- All handler functions have substantive logic (not just `e.preventDefault()`)

---

## Human Verification Required

The following 5 items require live Obsidian verification. All underlying code paths are wired and tested, but Obsidian's runtime environment (DOM, workspace, event bus) cannot be exercised in Jest.

### 1. CMD-03 Context Menu (folder right-click)

**Test:** In the file explorer, right-click any folder. Then right-click any file (not a folder).
**Expected:** "Generate Self-Test" appears on folder right-click only; selecting it shows a progress indicator, then generates the file; "Generate Self-Test" does NOT appear on file right-click.
**Why human:** `file-menu` event registration and Obsidian's menu rendering require the live workspace.

### 2. CMD-02 Command Palette

**Test:** Press Cmd+P (or Ctrl+P), type "Open Active Recall Panel", select it.
**Expected:** The "Active Recall" sidebar panel opens in the right sidebar with a header, folder rows, and Generate/Regenerate buttons.
**Why human:** `addCommand` registration and sidebar open behavior require the live Obsidian workspace.

### 3. Ribbon Icon

**Test:** Locate the brain-circuit icon in the left ribbon, click it.
**Expected:** Same "Active Recall" panel opens or is focused if already open.
**Why human:** `addRibbonIcon` and reveal behavior require the live Obsidian workspace.

### 4. Sidebar Auto-Refresh After Generation

**Test:** Open the sidebar panel. With a folder visible under "Not generated", trigger generation from any entry point (context menu, CMD-01, sidebar button). Wait for the generation notice.
**Expected:** The folder moves from "Not generated" to "Generated" with a date, without closing or reopening the panel.
**Why human:** Vault `create` event listeners fire only in the live Obsidian runtime; cannot be triggered via Jest.

### 5. No Duplicate Panes on Disable/Re-Enable

**Test:** Disable the plugin via Settings > Community Plugins > toggle off. Re-enable. Open the panel.
**Expected:** Exactly one "Active Recall" tab appears in the right sidebar.
**Why human:** `onunload` detach behavior requires the live plugin lifecycle.

---

## Notable Deviations from Plan (non-blocking)

`buildActivateView` signature in the plan specified `(app: App, viewType: string)` but the implementation uses `(app: App)` only, with `VIEW_TYPE_ACTIVE_RECALL` captured from the module scope. This is functionally equivalent - the viewType is always `VIEW_TYPE_ACTIVE_RECALL` in this codebase. The plan test spec calls `buildActivateView(app as never)` (no viewType), confirming the final signature was intentional. No impact on correctness.

---

## Summary

All 7 automated must-haves pass:

- `src/sidebar.ts` - 186 lines, all 6 required exports present and substantive
- `src/main.ts` - registerView, CMD-02, CMD-03 context menu, ribbon icon, onunload detach all present and wired
- `src/__tests__/sidebar.test.ts` - 10 tests, all passing
- `src/__mocks__/obsidian.ts` - Extended with all required sidebar APIs
- `styles.css` - Full flex layout (71 lines)
- `esbuild.config.mjs` - CSS copy plugin present
- 27/27 Jest tests pass; TypeScript compiles with zero errors

Phase goal is structurally achieved. The sidebar panel, context menu, command, and ribbon are fully wired and tested. Runtime verification in live Obsidian (5 items above) is the remaining gate.

---

_Verified: 2026-03-12_
_Verifier: Claude (gsd-verifier)_
