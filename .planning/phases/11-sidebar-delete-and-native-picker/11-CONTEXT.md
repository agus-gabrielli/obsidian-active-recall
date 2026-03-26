# Phase 11: Sidebar Delete and Native Picker - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can delete self-test files directly from the sidebar via a trash icon (with confirmation), and the linked notes picker is replaced with Obsidian's native FuzzySuggestModal for a smoother selection experience (two-step flow: pick note, then confirm with depth toggle).

</domain>

<decisions>
## Implementation Decisions

### Delete behavior
- **D-01:** Deletion respects the user's vault trash setting (`app.vault.trash()`) - goes to Obsidian `.trash/`, system trash, or permanent delete based on their configuration
- **D-02:** Confirmation via Obsidian modal dialog (centered popup with Cancel/Delete buttons)
- **D-03:** Confirmation dialog mentions the file path so the user knows exactly what's being deleted
- **D-04:** No feedback after deletion beyond the row disappearing from the sidebar

### Trash icon placement
- **D-05:** Trash icon appears to the right of the Regenerate button in each row
- **D-06:** Trash icon is always visible (not hover-reveal)
- **D-07:** Trash icon is hidden while generation is in progress (spinner showing)
- **D-08:** Trash icon does not appear on placeholder rows (items currently generating with no file yet)

### Two-step linked notes flow
- **D-09:** Step 1: FuzzySuggestModal for note selection - shows all markdown files in the vault (no filtering by link presence)
- **D-10:** Step 1 renders each suggestion as basename (primary, searchable) with dimmed path underneath - matches Obsidian Quick Switcher pattern
- **D-11:** Step 2: Confirmation modal opens after selection - shows selected note name, depth-2 toggle, preview count, and Generate button
- **D-12:** If the selected note has zero links (no outgoing or backlinks), show a Notice and loop back to step 1 instead of opening step 2

### Frontmatter cleanup
- **D-13:** Remove spaced repetition fields (`last_review`, `next_review`, `review_count`, `review_interval_days`) from `buildFrontmatter` in collectors.ts - they are always null/0/1, unused, and clutter every generated file. Keep `source_mode`, `source`, and `source_notes`.

### Claude's Discretion
- Trash icon styling (Obsidian icon name, size, color)
- Confirmation modal exact wording
- FuzzySuggestModal placeholder text
- Step 2 modal layout and styling
- How to detect zero-links condition (reuse existing resolvedLinks check from current modal)
- Whether to refactor LinkedNotesPickerModal in place or create new classes

</decisions>

<specifics>
## Specific Ideas

- Step 1 note picker should feel like Obsidian's Quick Switcher - basename prominent, path as secondary context
- The current LinkedNotesPickerModal's depth toggle, preview count, and Generate button move to step 2

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` - Core value, constraints, plugin identity
- `.planning/REQUIREMENTS.md` - Phase 11 requirements (TBD in roadmap, success criteria in ROADMAP.md)

### Prior phase context
- `.planning/phases/10-sidebar-redesign/10-CONTEXT.md` - Sidebar row pattern (D-07, D-08), tab structure, renderSelfTestRow shared renderer

### Existing code to modify
- `src/sidebar.ts` - `renderSelfTestRow()` needs trash icon added; `regenerateForLinks()` and link generation flow affected
- `src/modals.ts` - `LinkedNotesPickerModal` to be replaced with FuzzySuggestModal-based two-step flow
- `styles.css` - May need trash icon and confirmation modal styles

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `renderSelfTestRow()` in sidebar.ts - Shared row renderer across all three tabs; trash icon integrates here
- `app.vault.trash(file, useSystemTrash)` - Obsidian API for deletion respecting user's trash setting
- `collectNotesByLinks(app, file, depth)` from collectors.ts - Reused in step 2 for preview count
- Zero-links check pattern already exists in current `LinkedNotesPickerModal.generateBtn` click handler (resolvedLinks inspection)

### Established Patterns
- `SuggestModal<T>` used by TagPickerModal and FolderPickerModal - FuzzySuggestModal is the same pattern with built-in fuzzy matching
- `Modal` used for current LinkedNotesPickerModal - step 2 confirmation follows same pattern
- `new Notice()` used for error feedback throughout the plugin

### Integration Points
- `renderSelfTestRow()` - Add trash icon parameter/logic; needs `TFile` reference to call `vault.trash()`
- `LinkedNotesPickerModal` in modals.ts - Replace with two new classes (FuzzySuggestModal + confirmation Modal) or refactor
- Sidebar `renderLinksPanel()` and `renderTagsPanel()` and `renderFoldersPanel()` - All call renderSelfTestRow, so trash icon propagates automatically
- `main.ts` - LinkedNotesPickerModal import may change if class is renamed/split

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 11-sidebar-delete-and-native-picker*
*Context gathered: 2026-03-25*
