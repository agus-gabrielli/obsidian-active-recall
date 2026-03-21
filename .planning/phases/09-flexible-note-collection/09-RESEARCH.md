# Phase 9: Flexible Note Collection - Research

**Researched:** 2026-03-21
**Domain:** Obsidian plugin development - MetadataCache tag/link APIs, SuggestModal, context menu, vault write helpers
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Tag picker modal**
- D-01: Tags displayed grouped by parent - nested tags (`lang/python`, `lang/rust`) appear under their parent (`lang >` expands to children)
- D-02: Single tag selection per generation - no multi-select
- D-03: Hierarchical matching - picking `#lang` also collects notes tagged `#lang/python`, `#lang/rust`, etc.
- D-04: Note count shown next to each tag (e.g. `python (12)`)

**Linked-notes picker modal**
- D-05: Standard Obsidian suggest modal - type to search across all vault notes, no filtering by link presence
- D-06: Depth-2 toggle is a checkbox inside the picker modal ("Include links of links"), not a global setting
- D-07: If the selected root note has no outgoing links, show a notice and abort - no fallback to single-note mode
- D-08: After selecting a root note, show a preview of how many notes will be collected before generating; updates when depth-2 toggled

**Output naming and location**
- D-09: Tag-based outputs go to `_self-tests/tags/` with hierarchy in path - e.g. `_self-tests/tags/lang/python.md`
- D-10: Link-based outputs go to `_self-tests/links/` - e.g. `_self-tests/links/my-moc-note.md`
- D-11: No underscores on subfolders/files inside `_self-tests/` - the top-level folder name is enough
- D-12: `_self-tests/` always at vault root
- D-13: Overwrite silently on regeneration across all modes (consistent with folder mode)
- D-14: Frontmatter tracks provenance - `source_mode`, `source`, and `source_notes` as `[[wikilinks]]`; frontmatter-only to avoid graph/backlink pollution

**Single-note behavior**
- D-15: Default output location is same folder as source note (`my-note_self-test.md`); user can switch to centralized (`_self-tests/notes/`) via a setting
- D-16: Centralized mode preserves source path in filename to avoid collisions - e.g. `physics/mechanics/newton.md` becomes `_self-tests/notes/physics-mechanics-newton.md`
- D-17: Context menu "Generate Self-Test" appears on all `.md` files except self-test files (`_self-test.md` and files inside `_self-tests/`)
- D-18: Command palette command "Generate Self-Test for Current Note" works on the active file
- D-19: Silent overwrite on regeneration

### Claude's Discretion
- GenerationService refactor approach (how to generalize beyond folder mode)
- Tag picker component implementation (extending Obsidian's SuggestModal or FuzzySuggestModal)
- Linked-notes picker component implementation
- BFS traversal implementation details for link collection
- How `writeOutputToPath` helper replaces/extends existing `writeOutput()`
- Test structure and mocking strategy for new collection modes

### Deferred Ideas (OUT OF SCOPE)
- Sidebar redesign to show all four modes - Phase 10
- Multi-tag selection for combined self-tests - possible future enhancement
- Graph view integration (showing self-test connections via body wikilinks) - user preferred frontmatter-only approach for now
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COL-01 | User can generate a self-test from all notes sharing a specific tag via a tag picker modal | Tag picker using SuggestModal; `getAllTags()` + `getFileCache()` per vault file |
| COL-02 | Tag picker modal shows all vault tags with autocomplete/filtering | SuggestModal.getSuggestions() with string matching; fuzzy not needed, prefix/includes works |
| COL-03 | Tag-based output goes to `_self-tests/tags/` folder with hierarchy path | `writeOutputToPath()` helper creates intermediate dirs via `vault.createFolder()` |
| COL-04 | User can generate a self-test from a root/MOC note plus all directly linked notes (depth 1) | `resolvedLinks[rootPath]` gives outgoing links as path record |
| COL-05 | User can optionally include depth-2 links via a toggle in the picker | BFS second pass; toggle is a checkbox DOM element in the linked-notes modal |
| COL-06 | User can generate a self-test for a single note (context menu on files + command palette) | File context menu via existing `file-menu` event; filter on TFile not TFolder |
| COL-07 | Single-note output goes to same folder as source note (`my-note_self-test.md`) | `writeOutputToPath()` at `file.parent.path + '/' + file.basename + '_self-test.md'` |
</phase_requirements>

---

## Summary

Phase 9 adds three new collection modes (tag, linked notes, single note) to the existing folder-based pipeline. All modes produce `NoteSource[]` arrays that feed the existing `splitIntoBatches` / `callLLM` / `postProcessLLMOutput` pipeline without modification. The main work is: (1) building two new modal classes for tag and linked-notes picking, (2) generalizing `GenerationService.generate()` to accept a `CollectionSpec` rather than a raw folder path, (3) adding a `writeOutputToPath()` helper that creates intermediate directories and handles overwrite, and (4) registering three new commands plus a file-level context menu item in `main.ts`.

All Obsidian APIs needed are verified in the installed `obsidian.d.ts` (v1.8.x type file). `app.metadataCache.resolvedLinks` and `getAllTags(cache)` are stable public APIs. `SuggestModal<T>` requires implementing `getSuggestions()`, `renderSuggestion()`, and `onChooseSuggestion()` - all abstract methods. The linked-notes picker must be a plain `Modal` subclass (not SuggestModal) because it needs custom DOM for the depth-2 toggle and note count preview alongside the search field.

**Primary recommendation:** Refactor `GenerationService.generate(folderPath: string)` into `generate(spec: CollectionSpec)` where `CollectionSpec` is a discriminated union (`{ mode: 'folder', folderPath }` | `{ mode: 'tag', tag }` | `{ mode: 'links', rootFile, depth }` | `{ mode: 'note', file }`). This keeps a single generate entry point, preserves testability, and cleanly separates collection logic from the existing batch pipeline.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| obsidian | installed (1.8.x typings) | All APIs: MetadataCache, SuggestModal, Modal, vault CRUD | Only option for plugin development |
| TypeScript | installed | Type safety throughout | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Jest (ts-jest) | 30.2.0 (installed) | Unit tests for pure functions and mocked Obsidian APIs | All new collectors and helpers |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom `SuggestModal` for tag picker | `FuzzySuggestModal<T>` | FuzzySuggest provides built-in fuzzy matching via `getItems()` but hides `renderSuggestion()` making custom grouped display (D-01) harder to control; raw `SuggestModal` gives full render control |
| Plain `Modal` for linked-notes picker | `FuzzySuggestModal<TFile>` | FuzzySuggest would handle searching but cannot embed a checkbox toggle above the suggestion list; `Modal` with a manual search input + filtered TFile list gives full layout control for the depth toggle + preview count (D-06, D-08) |

**Installation:** No new packages required. All APIs are in the installed `obsidian` package.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── generation.ts          # Add: CollectionSpec union, collectByTag(), collectByLinks(), writeOutputToPath()
├── modals.ts              # New: TagPickerModal, LinkedNotesPickerModal
├── main.ts                # Add: 3 new commands + file context menu handler
├── settings.ts            # Add: singleNoteOutputMode setting
├── sidebar.ts             # Minor: expand vault listener to detect _self-tests/ folder
└── __tests__/
    └── collectors.test.ts # New: TDD tests for all collectors and writeOutputToPath
```

### Pattern 1: CollectionSpec Discriminated Union

**What:** Replace `generate(folderPath: string)` with `generate(spec: CollectionSpec)`. Each mode is a typed variant. Collection logic is pure functions tested independently.

**When to use:** Whenever GenerationService needs to handle multiple input shapes through a single entry point.

**Example:**
```typescript
// Source: architectural design based on existing NoteSource interface pattern
export type CollectionSpec =
  | { mode: 'folder'; folderPath: string }
  | { mode: 'tag'; tag: string }
  | { mode: 'links'; rootFile: TFile; depth: 1 | 2 }
  | { mode: 'note'; file: TFile };

export async function generate(spec: CollectionSpec): Promise<void> {
  let files: TFile[];
  let outputPath: string;

  switch (spec.mode) {
    case 'folder':
      files = collectNoteFiles(this.app, spec.folderPath);
      outputPath = `${spec.folderPath}/_self-test.md`;
      break;
    case 'tag':
      files = collectNotesByTag(this.app, spec.tag);
      outputPath = buildTagOutputPath(spec.tag);
      break;
    case 'links':
      files = collectNotesByLinks(this.app, spec.rootFile, spec.depth);
      outputPath = buildLinksOutputPath(spec.rootFile);
      break;
    case 'note':
      files = [spec.file];
      outputPath = buildNoteOutputPath(this.app, spec.file, this.settings.singleNoteOutputMode);
      break;
  }
  // ... rest of pipeline unchanged
}
```

### Pattern 2: Tag Collection via MetadataCache

**What:** Iterate all vault `.md` files, call `app.metadataCache.getFileCache(file)` on each, then `getAllTags(cache)` to retrieve inline + frontmatter tags. Normalize with `tag.replace(/^#/, '')`. Match prefix for hierarchical selection (D-03).

**When to use:** Any time the full tag-to-files mapping is needed.

**Example:**
```typescript
// Source: obsidian.d.ts - getAllTags(cache: CachedMetadata): string[] | null
export function collectNotesByTag(app: App, tag: string): TFile[] {
  const normalizedTarget = tag.replace(/^#/, '').toLowerCase();
  return app.vault.getFiles().filter(file => {
    if (file.extension !== 'md') return false;
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) return false;
    const tags = getAllTags(cache) ?? [];
    return tags.some(t => {
      const normalized = t.replace(/^#/, '').toLowerCase();
      // Prefix match: 'lang' matches 'lang/python', 'lang/rust', and 'lang' itself
      return normalized === normalizedTarget || normalized.startsWith(normalizedTarget + '/');
    });
  });
}
```

### Pattern 3: All-Tag Enumeration for Tag Picker

**What:** Build a deduplicated tag inventory across all vault files, including count of matching notes per tag.

**Example:**
```typescript
// Source: obsidian.d.ts - Vault.getFiles(), MetadataCache.getFileCache()
export function getAllVaultTags(app: App): Map<string, number> {
  const tagCounts = new Map<string, number>();
  for (const file of app.vault.getFiles()) {
    if (file.extension !== 'md') continue;
    const cache = app.metadataCache.getFileCache(file);
    if (!cache) continue;
    const tags = getAllTags(cache) ?? [];
    for (const t of tags) {
      const normalized = t.replace(/^#/, '').toLowerCase();
      tagCounts.set(normalized, (tagCounts.get(normalized) ?? 0) + 1);
    }
  }
  return tagCounts;
}
```

### Pattern 4: Link Traversal via resolvedLinks

**What:** BFS over `app.metadataCache.resolvedLinks` starting from the root file's path. `resolvedLinks[sourcePath]` is a `Record<string, number>` where keys are resolved destination paths.

**When to use:** Collecting linked notes at depth 1 or depth 2.

**Example:**
```typescript
// Source: obsidian.d.ts - MetadataCache.resolvedLinks: Record<string, Record<string, number>>
export function collectNotesByLinks(app: App, rootFile: TFile, depth: 1 | 2): TFile[] {
  const visited = new Set<string>([rootFile.path]);
  const queue: Array<{ path: string; d: number }> = [{ path: rootFile.path, d: 0 }];
  const result: TFile[] = [rootFile];

  while (queue.length > 0) {
    const item = queue.shift()!;
    if (item.d >= depth) continue;
    const links = app.metadataCache.resolvedLinks[item.path] ?? {};
    for (const linkedPath of Object.keys(links)) {
      if (visited.has(linkedPath)) continue;
      const file = app.vault.getFileByPath(linkedPath);
      if (!file || file.extension !== 'md') continue;
      visited.add(linkedPath);
      result.push(file);
      queue.push({ path: linkedPath, d: item.d + 1 });
    }
  }
  return result;
}
```

### Pattern 5: writeOutputToPath Helper

**What:** Creates intermediate directories if needed, then creates or overwrites the target file. Replaces `writeOutput()` which hardcodes `folderPath/_self-test.md`.

**Example:**
```typescript
// Source: obsidian.d.ts - Vault.create(), Vault.modify(), Vault.getFileByPath()
export async function writeOutputToPath(app: App, filePath: string, content: string): Promise<void> {
  // Ensure parent directories exist
  const parts = filePath.split('/');
  for (let i = 1; i < parts.length; i++) {
    const dir = parts.slice(0, i).join('/');
    if (dir && !app.vault.getAbstractFileByPath(dir)) {
      await app.vault.createFolder(dir);
    }
  }
  const existing = app.vault.getFileByPath(filePath);
  if (existing) {
    await app.vault.modify(existing, content);
  } else {
    await app.vault.create(filePath, content);
  }
}
```

### Pattern 6: SuggestModal for Tag Picker

**What:** Extend `SuggestModal<string>` (from obsidian). The tag picker needs custom render to show parent grouping (D-01) and note counts (D-04). `getSuggestions(query)` filters the pre-built tag inventory.

**Example:**
```typescript
// Source: obsidian.d.ts - abstract class SuggestModal<T>
export class TagPickerModal extends SuggestModal<string> {
  private tagCounts: Map<string, number>;
  private onSelect: (tag: string) => void;

  constructor(app: App, tagCounts: Map<string, number>, onSelect: (tag: string) => void) {
    super(app);
    this.tagCounts = tagCounts;
    this.onSelect = onSelect;
    this.setPlaceholder('Search tags...');
  }

  getSuggestions(query: string): string[] {
    const q = query.toLowerCase();
    return Array.from(this.tagCounts.keys())
      .filter(tag => tag.includes(q))
      .sort();
  }

  renderSuggestion(tag: string, el: HTMLElement): void {
    const count = this.tagCounts.get(tag) ?? 0;
    el.createSpan({ text: tag });
    el.createSpan({ text: ` (${count})`, cls: 'active-recall-tag-count' });
  }

  onChooseSuggestion(tag: string): void {
    this.onSelect(tag);
  }
}
```

### Pattern 7: Modal for Linked-Notes Picker (with DOM toggle)

**What:** Extend `Modal` directly (not SuggestModal) to allow embedding a depth-2 checkbox, a FuzzySearch input, and a note count preview. The `FuzzySuggestModal` API does not allow inserting custom DOM before the suggestion list.

**Example structure:**
```typescript
// Source: obsidian.d.ts - abstract class Modal
export class LinkedNotesPickerModal extends Modal {
  private depth: 1 | 2 = 1;
  private selectedFile: TFile | null = null;
  private previewEl: HTMLElement;
  private onGenerate: (file: TFile, depth: 1 | 2) => void;

  onOpen(): void {
    const { contentEl } = this;
    // 1. Search input (filter vault .md files)
    // 2. Checkbox "Include links of links" -> updates this.depth, refreshes preview
    // 3. Preview span: "X notes will be collected"
    // 4. Generate button (disabled until file selected)
    this.previewEl = contentEl.createEl('p', { text: 'Select a note above.' });
  }

  private updatePreview(): void {
    if (!this.selectedFile) return;
    const count = collectNotesByLinks(this.app, this.selectedFile, this.depth).length;
    this.previewEl.setText(`${count} notes will be collected.`);
  }
}
```

### Pattern 8: File Context Menu for Single Note

**What:** The existing `file-menu` event handler in main.ts already fires for both `TFile` and `TFolder`. Currently `buildContextMenuHandler` checks `instanceof TFolder` and returns early for files. A separate handler for `TFile` instances is needed.

**Example:**
```typescript
// Source: existing main.ts - this.app.workspace.on('file-menu', ...)
this.registerEvent(
  this.app.workspace.on('file-menu', (menu, file) => {
    if (!(file instanceof TFile)) return;
    if (file.extension !== 'md') return;
    // Exclude self-test files
    if (file.basename === '_self-test') return;
    if (file.path.startsWith('_self-tests/')) return;

    menu.addItem(item =>
      item
        .setTitle('Generate Self-Test')
        .setIcon('brain-circuit')
        .onClick(() => generationService.generate({ mode: 'note', file }))
    );
  })
);
```

### Pattern 9: Frontmatter with Provenance (D-14)

**What:** All new modes prepend mode-specific frontmatter. `source_notes` is an array of `[[wikilinks]]` that are clickable in reading view but live in frontmatter so they don't pollute graph view or backlinks.

**Example:**
```typescript
// Example output frontmatter for tag mode
function buildFrontmatter(spec: CollectionSpec, collectedFiles: TFile[]): string {
  const sourceNotes = collectedFiles
    .map(f => `"[[${f.basename}]]"`)
    .join(', ');

  let source: string;
  let mode: string;
  switch (spec.mode) {
    case 'tag':   mode = 'tag';   source = spec.tag; break;
    case 'links': mode = 'links'; source = spec.rootFile.basename; break;
    case 'note':  mode = 'note';  source = spec.file.basename; break;
    case 'folder': mode = 'folder'; source = spec.folderPath; break;
  }

  return [
    '---',
    'last_review: null',
    'next_review: null',
    'review_count: 0',
    'review_interval_days: 1',
    `source_mode: ${mode}`,
    `source: "${source}"`,
    `source_notes: [${sourceNotes}]`,
    '---',
    '',
  ].join('\n');
}
```

### Pattern 10: Settings Addition for Single-Note Output Mode

**What:** Add `singleNoteOutputMode: 'same-folder' | 'centralized'` to `ActiveRecallSettings` with default `'same-folder'` (D-15).

**Example:**
```typescript
// In settings.ts - extend ActiveRecallSettings interface
export interface ActiveRecallSettings {
  // ... existing fields ...
  singleNoteOutputMode: 'same-folder' | 'centralized';
}

export const DEFAULT_SETTINGS: ActiveRecallSettings = {
  // ... existing fields ...
  singleNoteOutputMode: 'same-folder',
};
```

### Pattern 11: Sidebar Vault Listener Expansion

**What:** Current listeners in `main.ts` detect `file.basename === '_self-test'`. New collection modes write to `_self-tests/` subdirectories. The listener must also detect files where `file.path.startsWith('_self-tests/')`.

**Example:**
```typescript
// In main.ts - expand existing vault create/delete listeners
this.registerEvent(
  this.app.vault.on('create', (file) => {
    if (!(file instanceof TFile)) return;
    if (file.basename === '_self-test' || file.path.startsWith('_self-tests/')) {
      refreshSidebarIfOpen(this.app);
    }
  })
);
```

### Anti-Patterns to Avoid

- **Calling `app.metadataCache.getFileCache()` at plugin load:** MetadataCache is not ready until `onLayoutReady()`. Always call it from user-triggered actions. All new collection functions are triggered by commands or modals - this is safe.
- **Using `FuzzySuggestModal` for linked-notes picker:** Loses ability to inject custom DOM elements (checkbox, preview count) between search input and suggestion list. Use plain `Modal` instead.
- **Directory creation race:** `writeOutputToPath` must check `getAbstractFileByPath()` before `createFolder()` to avoid "folder already exists" vault errors, especially for nested paths like `_self-tests/tags/lang/`.
- **Modifying `writeOutput()` in place:** Keep the existing `writeOutput(app, folderPath, content)` unchanged to avoid breaking folder-mode tests. Add `writeOutputToPath(app, filePath, content)` as a new export alongside it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fuzzy text search | Custom string matching with edit distance | `SuggestModal` (built-in fuzzy via `getSuggestions`) | Obsidian handles keyboard nav, filtering, focus management |
| Tag extraction from files | Regex parsing of note content for `#tag` patterns | `getAllTags(cache)` from obsidian API | Handles inline tags, frontmatter tags, nested tags uniformly |
| File-to-path resolution for links | String manipulation of wikilink text | `resolvedLinks` (MetadataCache property) | Already resolved to absolute vault paths; handles ambiguous links, aliases |
| Directory creation | Checking if parent dirs exist manually | `vault.createFolder()` + `getAbstractFileByPath()` guard | Vault handles OS-level folder creation; checking existence prevents duplicate folder errors |
| Modal keyboard navigation | Custom keydown handlers for suggestion lists | `SuggestModal` / built-in Modal `scope` | Scope handles Escape to close; SuggestModal handles arrow keys, Enter |

**Key insight:** The MetadataCache (`resolvedLinks`, `getFileCache`, `getAllTags`) is the authoritative source for all link and tag data. Never re-derive it from raw file content.

---

## Common Pitfalls

### Pitfall 1: Tag Normalization Inconsistency

**What goes wrong:** `getAllTags(cache)` returns inline tags WITH the `#` prefix (e.g. `#lang/python`) and frontmatter tags WITHOUT the `#` prefix (e.g. `lang/python`). Comparing them without stripping leads to missed matches.

**Why it happens:** Obsidian's internal tag handling normalizes differently depending on where the tag appears in a note.

**How to avoid:** Always normalize with `tag.replace(/^#/, '').toLowerCase()` before any comparison. Do this in both the collector and the tag picker display.

**Warning signs:** Tag picker shows a tag as having 3 notes but collection finds 0. Test by checking a note with a tag in its frontmatter vs. inline.

### Pitfall 2: resolvedLinks is a Flat Record, Not Nested TFile Objects

**What goes wrong:** Treating `resolvedLinks[path]` values as TFile objects. They are a `Record<string, number>` where keys are destination paths and values are link counts.

**Why it happens:** The type definition `Record<string, Record<string, number>>` is correct but easy to misread.

**How to avoid:** After getting destination paths from `Object.keys(resolvedLinks[rootPath])`, always call `app.vault.getFileByPath(destPath)` to get the actual `TFile` object. Guard against null (the file might have been deleted).

**Warning signs:** TypeScript error "Property 'basename' does not exist on type 'number'" when accessing resolved link values.

### Pitfall 3: createFolder Throws if Folder Already Exists

**What goes wrong:** Calling `app.vault.createFolder('_self-tests/tags')` when `_self-tests/` already exists from a prior tag-mode run throws a vault error.

**Why it happens:** `createFolder` is not idempotent in all Obsidian versions.

**How to avoid:** Always guard with `if (!app.vault.getAbstractFileByPath(dir))` before calling `createFolder`. Build the path incrementally from the root so each segment is checked.

**Warning signs:** "Folder already exists" errors on second generation run. Catching these errors silently is fine if the file creation still proceeds.

### Pitfall 4: Modal DOM Cleanup on Close

**What goes wrong:** Event listeners attached to DOM elements inside a `Modal` leak if `onClose()` does not call `contentEl.empty()`.

**Why it happens:** Obsidian's `Modal` base class does not auto-clear `contentEl`. For `SuggestModal`, it does clean up.

**How to avoid:** Always implement `onClose() { this.contentEl.empty(); }` in custom `Modal` subclasses.

**Warning signs:** Memory leaks in long Obsidian sessions; or stale DOM references causing double-invoke of callbacks.

### Pitfall 5: Self-Test File Exclusion Must Cover _self-tests/ Subtree

**What goes wrong:** The existing exclusion checks `child.basename !== '_self-test'`. New modes write files like `_self-tests/tags/lang/python.md` - their basename is `python`, not `_self-test`. They would be collected as source notes in subsequent operations.

**Why it happens:** The exclusion was written for folder mode only.

**How to avoid:** In all collector functions, also exclude any file whose path starts with `_self-tests/` or whose basename ends with `_self-test`. This is especially important in `collectNotesByTag` and `collectNotesByLinks`.

**Warning signs:** A generated file in `_self-tests/` gets included as source content in a subsequent generation, causing self-referential output.

### Pitfall 6: Depth-2 Collection Can Be Expensive

**What goes wrong:** A well-connected MOC note at depth 2 can collect hundreds of files, hitting the token budget and requiring many batch calls. The user might not expect this.

**Why it happens:** Link graphs in active vaults are densely connected.

**How to avoid:** The preview count (D-08) surfaces this before generation starts. No additional guard is needed - the batch pipeline already handles large sets. Document in the modal that enabling depth-2 is appropriate for smaller link graphs.

**Warning signs:** Very long generation times when depth-2 is enabled on a hub note.

---

## Code Examples

### Tag Output Path Builder (D-09)

```typescript
// Source: CONTEXT.md D-09 decision
// tag 'lang/python' -> '_self-tests/tags/lang/python.md'
export function buildTagOutputPath(tag: string): string {
  const normalized = tag.replace(/^#/, '');
  return `_self-tests/tags/${normalized}.md`;
}
```

### Links Output Path Builder (D-10)

```typescript
// Source: CONTEXT.md D-10 decision
// rootFile.basename 'my-moc-note' -> '_self-tests/links/my-moc-note.md'
export function buildLinksOutputPath(rootFile: TFile): string {
  return `_self-tests/links/${rootFile.basename}.md`;
}
```

### Single-Note Output Path Builder (D-15, D-16)

```typescript
// Source: CONTEXT.md D-15, D-16 decisions
export function buildNoteOutputPath(
  file: TFile,
  mode: 'same-folder' | 'centralized'
): string {
  if (mode === 'same-folder') {
    const folder = file.parent?.path ?? '';
    return folder ? `${folder}/${file.basename}_self-test.md` : `${file.basename}_self-test.md`;
  }
  // Centralized: physics/mechanics/newton.md -> _self-tests/notes/physics-mechanics-newton.md
  const safeName = file.path
    .replace(/\.md$/, '')
    .replace(/\//g, '-');
  return `_self-tests/notes/${safeName}.md`;
}
```

### Obsidian Mock Extensions Needed for Tests

```typescript
// Additions required in src/__mocks__/obsidian.ts
// 1. MetadataCache mock on App
export function createMockApp() {
  return {
    vault: {
      // ... existing ...
      getFiles: jest.fn().mockReturnValue([]),
      getFileByPath: jest.fn().mockReturnValue(null),
      createFolder: jest.fn().mockResolvedValue(undefined),
    },
    workspace: { /* existing */ },
    metadataCache: {
      getFileCache: jest.fn().mockReturnValue(null),
      resolvedLinks: {} as Record<string, Record<string, number>>,
    },
  };
}

// 2. getAllTags export from mock (Obsidian exports this as a top-level function)
export const getAllTags = jest.fn().mockReturnValue([]);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `writeOutput(app, folderPath, content)` hardcodes `folderPath/_self-test.md` | `writeOutputToPath(app, filePath, content)` takes exact output path | Phase 9 | All new modes can write to any path; folder mode still uses old helper unchanged |
| `generate(folderPath: string)` single entry point | `generate(spec: CollectionSpec)` discriminated union | Phase 9 | Clean extension point; existing folder callers wrap to `{ mode: 'folder', folderPath }` |
| Vault listener only on `basename === '_self-test'` | Listener also covers `path.startsWith('_self-tests/')` | Phase 9 | Sidebar refreshes correctly after tag/link/note mode generation |

**Deprecated/outdated:**
- None - no existing APIs are being removed; all additions are additive.

---

## Open Questions

1. **Tag picker grouped display (D-01)**
   - What we know: `SuggestModal.renderSuggestion()` gets one HTML element per suggestion and a tag string. Grouping by parent (e.g. showing `lang` as a header with `lang/python` and `lang/rust` indented) requires either synthetic "header" items in the suggestions array or custom DOM manipulation.
   - What's unclear: Whether inserting non-selectable group headers as items in `getSuggestions()` result causes keyboard nav issues (e.g. user pressing Enter on a parent header).
   - Recommendation: Implement flat sorted list first (alphabetical, all tags visible), then layer grouping as a visual-only CSS indent based on slash depth. If a parent tag itself is selectable (has matching notes), it appears as a regular item. This avoids the non-selectable-header problem entirely.

2. **Linked-notes picker manual search (D-05)**
   - What we know: D-05 says "type to search across all vault notes." This requires a search input, filtering vault `.md` TFiles, and displaying results - essentially reimplementing part of what `FuzzySuggestModal` does.
   - What's unclear: Whether to use a lightweight contains-match or full fuzzy match in the custom Modal.
   - Recommendation: Use a simple `file.basename.toLowerCase().includes(query)` contains match. Fast enough for vault sizes under ~10,000 files; no extra library needed.

3. **createFolder error handling**
   - What we know: The guard `if (!getAbstractFileByPath(dir))` prevents most duplicate-create calls, but vault operations are async and there may be race conditions if two generations run in parallel.
   - What's unclear: Whether `createFolder` throws a typed error or a generic Error when the folder exists.
   - Recommendation: Wrap `createFolder` in a try/catch that silently swallows "folder already exists" errors but re-throws others. Check if the file still exists after the catch to verify the write path is valid.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 with ts-jest |
| Config file | `jest.config.cjs` |
| Quick run command | `npx jest --testPathPattern collectors` |
| Full suite command | `npx jest` |

### Phase Requirements -> Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COL-01 | `collectNotesByTag()` returns files matching a tag | unit | `npx jest --testPathPattern collectors` | Wave 0 |
| COL-02 | `getAllVaultTags()` returns all tags with counts; `TagPickerModal.getSuggestions()` filters by query | unit | `npx jest --testPathPattern collectors` | Wave 0 |
| COL-03 | `buildTagOutputPath()` produces correct `_self-tests/tags/...` path; `writeOutputToPath()` creates dirs | unit | `npx jest --testPathPattern collectors` | Wave 0 |
| COL-04 | `collectNotesByLinks()` at depth 1 returns root + direct links | unit | `npx jest --testPathPattern collectors` | Wave 0 |
| COL-05 | `collectNotesByLinks()` at depth 2 returns root + depth-1 + depth-2 links | unit | `npx jest --testPathPattern collectors` | Wave 0 |
| COL-06 | File context menu appears on `.md` files, not on folders, not on self-test files | unit | `npx jest --testPathPattern collectors` | Wave 0 |
| COL-07 | `buildNoteOutputPath()` produces `same-folder` and `centralized` paths correctly | unit | `npx jest --testPathPattern collectors` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern collectors`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite (91+ tests) green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/__tests__/collectors.test.ts` - covers COL-01 through COL-07 (all new pure functions)
- [ ] `src/__mocks__/obsidian.ts` - add `metadataCache`, `getAllTags`, `vault.getFiles`, `vault.getFileByPath`, `vault.createFolder` to `createMockApp()` and top-level exports

*(Existing `src/__tests__/generation.test.ts` covers the existing batch pipeline - no changes needed there unless `generate()` signature changes break existing tests, in which case folder-mode callers need wrapping.)*

---

## Sources

### Primary (HIGH confidence)
- `node_modules/obsidian/obsidian.d.ts` (installed, v1.8.x) - verified: `SuggestModal<T>`, `FuzzySuggestModal<T>`, `Modal`, `MetadataCache.resolvedLinks`, `MetadataCache.getFileCache()`, `getAllTags()`, `Vault.getFiles()`, `Vault.getFileByPath()`, `Vault.createFolder()`
- `src/generation.ts` - existing `NoteSource`, `collectNoteFiles`, `readNotes`, `writeOutput`, `GenerationService.generate()` signatures verified by direct read
- `src/main.ts` - existing command registrations and vault listener patterns verified by direct read
- `src/__mocks__/obsidian.ts` - existing mock structure verified; gaps for phase 9 APIs identified

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` "Key Architecture Decisions (from research)" - tag normalization, BFS via resolvedLinks, sidebar tabs, writeOutputToPath need - verified against code
- `.planning/phases/09-flexible-note-collection/09-CONTEXT.md` - all decisions D-01 through D-19 form the locked constraints

### Tertiary (LOW confidence)
- None - all claims backed by installed type definitions or existing source code.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all APIs verified in installed `obsidian.d.ts`
- Architecture: HIGH - patterns directly derived from existing code + Obsidian type signatures
- Pitfalls: HIGH - tag normalization pitfall explicitly called out in STATE.md; others derived from API type signatures

**Research date:** 2026-03-21
**Valid until:** 2026-06-21 (Obsidian API is stable; MetadataCache and SuggestModal are long-standing public APIs)
