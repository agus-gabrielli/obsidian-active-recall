# Phase 9: Flexible Note Collection - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can generate self-tests from notes gathered by tag, by following links from a root note, or from a single note - in addition to the existing folder mode. All new collection modes feed into the existing batch+synthesize pipeline unchanged. Sidebar redesign is Phase 10 - this phase only adds the collection modes, commands, and modals.

</domain>

<decisions>
## Implementation Decisions

### Tag picker modal
- **D-01:** Tags displayed grouped by parent - nested tags (`lang/python`, `lang/rust`) appear under their parent (`lang >` expands to children)
- **D-02:** Single tag selection per generation - no multi-select
- **D-03:** Hierarchical matching - picking `#lang` also collects notes tagged `#lang/python`, `#lang/rust`, etc.
- **D-04:** Note count shown next to each tag (e.g. `python (12)`)

### Linked-notes picker modal
- **D-05:** Standard Obsidian suggest modal - type to search across all vault notes, no filtering by link presence
- **D-06:** Depth-2 toggle is a checkbox inside the picker modal ("Include links of links"), not a global setting
- **D-07:** If the selected root note has no outgoing links, show a notice and abort - no fallback to single-note mode
- **D-08:** After selecting a root note, show a preview of how many notes will be collected before generating; updates when depth-2 toggled

### Output naming and location
- **D-09:** Tag-based outputs go to `_self-tests/tags/` with hierarchy in path - e.g. `_self-tests/tags/lang/python.md`
- **D-10:** Link-based outputs go to `_self-tests/links/` - e.g. `_self-tests/links/my-moc-note.md`
- **D-11:** No underscores on subfolders/files inside `_self-tests/` - the top-level folder name is enough to signal plugin-managed content
- **D-12:** `_self-tests/` always at vault root
- **D-13:** Overwrite silently on regeneration across all modes (consistent with folder mode)
- **D-14:** Frontmatter tracks provenance - `source_mode` (tag/links/note/folder), `source` (the tag or root note), and `source_notes` as `[[wikilinks]]` listing collected notes. Clickable in reading view but no graph/backlink pollution since it's frontmatter only.

### Single-note behavior
- **D-15:** Default output location is same folder as source note (`my-note_self-test.md`); user can switch to centralized (`_self-tests/notes/`) via a setting
- **D-16:** Centralized mode preserves source path in filename to avoid collisions - e.g. `physics/mechanics/newton.md` becomes `_self-tests/notes/physics-mechanics-newton.md`
- **D-17:** Context menu "Generate Self-Test" appears on all `.md` files except self-test files (`_self-test.md` and files inside `_self-tests/`)
- **D-18:** Command palette command "Generate Self-Test for Current Note" works on the active file
- **D-19:** Silent overwrite on regeneration

### Claude's Discretion
- GenerationService refactor approach (how to generalize beyond folder mode)
- Tag picker component implementation (extending Obsidian's SuggestModal or FuzzySuggestModal)
- Linked-notes picker component implementation
- BFS traversal implementation details for link collection
- How `writeOutputToPath` helper replaces/extends existing `writeOutput()`
- Test structure and mocking strategy for new collection modes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` - Core value, constraints, NoteSource interface contract
- `.planning/REQUIREMENTS.md` - COL-01 through COL-07 are this phase's requirements

### Prior phase context
- `.planning/phases/08-multi-provider-llm-dispatch/08-CONTEXT.md` - LLM dispatch decisions, callLLM interface
- `.planning/phases/07-final-release-recreate-the-1-0-0-github-release-with-updated-assets-then-open-the-store-submission-pr-essentially-absorbs-05-03-task-3-a-fresh-build/07-CONTEXT.md` - Settings shape, provider config

### Architecture decisions from research
- `.planning/STATE.md` "Key Architecture Decisions (from research)" section - NoteSource interface, tag normalization, link traversal via resolvedLinks, writeOutputToPath need, sidebar mode tabs

### Existing code to modify
- `src/generation.ts` - `NoteSource` interface, `collectNoteFiles()`, `readNotes()`, `writeOutput()`, `GenerationService.generate()`
- `src/main.ts` - Command registrations, context menu handler, sidebar refresh listeners
- `src/settings.ts` - Will need new setting for single-note output location

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `NoteSource { name, content }` interface - All new collection modes produce this same shape, pipeline is fully reusable
- `splitIntoBatches()`, `buildBatchPrompt()`, `buildSynthesisPrompt()` - Batch+synthesize pipeline works on any `NoteSource[]`
- `callLLM()` dispatcher - Provider-agnostic, ready to use from any collection mode
- `postProcessLLMOutput()` - Applies to all output regardless of collection mode
- `buildContextMenuHandler()` factory in sidebar.ts - Pattern for registering context menu items on files

### Established Patterns
- `collectNoteFiles()` + `readNotes()` separation - Collection decoupled from reading; new modes need new collectors but reuse `readNotes()` or equivalent
- `requestUrl()` + `throw: false` + manual status check - HTTP pattern locked in
- `app.vault.getAbstractFileByPath()` / `app.vault.read()` - File access pattern
- TDD flow: stub tests first, then implement

### Integration Points
- `GenerationService.generate(folderPath)` - Needs generalization to accept different collection modes (currently hardcoded to folder)
- `writeOutput(app, folderPath, content)` - Hardcodes `folderPath/_self-test.md`; needs `writeOutputToPath` for flexible output locations
- `main.ts` command registrations - New commands needed for tag, link, and single-note modes
- `main.ts` context menu handler - Currently only handles folders; needs file-level handler for single notes
- Sidebar vault listeners (`create`/`delete` on `_self-test` basename) - Need expansion to detect files inside `_self-tests/` directory
- Frontmatter generation in `GenerationService.generate()` - Currently hardcodes folder-style frontmatter; needs mode-aware frontmatter with source tracking

</code_context>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Sidebar redesign to show all four modes - Phase 10
- Multi-tag selection for combined self-tests - possible future enhancement
- Graph view integration (showing self-test connections via body wikilinks) - user preferred frontmatter-only approach for now

</deferred>

---

*Phase: 09-flexible-note-collection*
*Context gathered: 2026-03-21*
