# Phase 4: Commands and Sidebar - Context

**Gathered:** 2026-03-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Add the three remaining entry points (folder context menu, sidebar leaf panel, and "Open Active Recall Panel" command) that call the existing `GenerationService`. The generation logic is complete - this phase is about surfaces and UI. Also adds a ribbon icon for quick panel access.

</domain>

<decisions>
## Implementation Decisions

### Sidebar folder scope
- Show only folders that contain at least one `.md` file - auto-filters .obsidian, Attachments, media folders without a hardcoded exclusion list
- Each folder listed independently: `StudyNotes/` and `StudyNotes/Week1/` both appear as separate rows if they each have .md files
- Vault root excluded (files directly under the vault root, no parent folder)

### Panel layout
- Two sections: **"Self-tests"** (folders that have `_self-test.md`) at top, **"No self-test"** (folders without) below
- Full path shown for each folder (e.g., "StudyNotes/Week1") to avoid ambiguity when subfolder names repeat
- Empty sections are hidden entirely - no section header shown if nothing belongs in it (common on first use when no self-tests exist yet)
- Folders with a self-test show: full path, last-generated date, and a Regenerate button
- Folders without a self-test show: full path and a Generate button

### Ribbon icon
- Add a ribbon icon to open/focus the Active Recall panel
- Users can right-click and hide it in Obsidian if they don't want it

### Context menu
- "Generate Self-Test" appears on all folders in the file explorer - no filtering (not worth maintaining an exclusion list)
- Uses the right-clicked folder path directly - no confirmation step before generating
- Feedback pattern unchanged from Phase 3: status bar + Notice popup on completion/error

### Claude's Discretion
- Which Lucide icon to use for the ribbon
- Exact section header text ("Self-tests" vs "Generated" etc.)
- How to detect/read the last-generated date from `_self-test.md` frontmatter (parse YAML or use file mtime)
- How auto-refresh is implemented after generation (event emitter, callback, or polling)
- ItemView implementation details (leaf type, icon, display text)

</decisions>

<specifics>
## Specific Ideas

No specific references - open to standard Obsidian leaf view patterns for the sidebar panel.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GenerationService.generate(folderPath: string)` - callable API, returns Promise, handles status bar + Notice feedback internally
- `this.addStatusBarItem()` - already instantiated in `main.ts` and passed to GenerationService
- `ActiveRecallSettings` - passed to GenerationService constructor; available on `this.settings`
- Obsidian `ItemView` - the base class for sidebar panels (leaf views)
- Obsidian `addRibbonIcon(icon, title, callback)` - for ribbon icon registration
- Obsidian `registerEvent(app.workspace.on('file-menu', ...))` - for folder context menu items

### Established Patterns
- Commands registered via `this.addCommand({ id, name, callback })` in `onload()` - CMD-01 already in main.ts as reference
- Status bar + Notice for feedback - locked in Phase 3, carry through unchanged
- `requestUrl()` with `throw: false` - not directly used in this phase but established pattern

### Integration Points
- `src/main.ts` `onload()`: Register CMD-02, CMD-03 (context menu), ribbon icon, and the ItemView
- New file: `src/sidebar.ts` (or similar) for the ItemView subclass
- GenerationService called from three new surfaces; all call `generationService.generate(folderPath)` the same way
- After generation, sidebar panel must re-render - needs a refresh hook from GenerationService or a workspace event listener

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 04-commands-and-sidebar*
*Context gathered: 2026-03-11*
