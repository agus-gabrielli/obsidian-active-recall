# Phase 3: Generation Pipeline - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

End-to-end self-test generation: collect all top-level .md files from a folder, call the LLM, and write `_self-test.md` with a concept map, categorized questions, hints, and reference answers. Includes token budget enforcement, batch+synthesize for large folders, and progress/error feedback. Commands and sidebar UI are Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Concept map format
- Bullet hierarchy, 2 levels max (top concept + one sub-level)
- Horizontal rule (`---`) separator after the concept map, before the questions section
- Omit the section entirely when "Generate concept map" toggle is off - no placeholder comment

### Output structure
- YAML frontmatter with reserved v2 spaced-repetition fields: `last_review: null`, `next_review: null`, `review_count: 0`, `review_interval_days: 1`
- Document title: `# Self-Test: [Folder Name]`
- `## Concept Map` heading (H2), then bullet hierarchy, then `---`, then question categories
- Category headings are H2: `## Conceptual`, `## Relationships`, `## Application`
- Categories are omitted when content is too simple or narrow (per GEN-03)
- Questions are numbered (1. 2. 3.) within each category
- Hints: `> [!hint]-` collapsible callout below each question
- Reference answers: `> [!check]-` collapsible callout below each hint
- Hint and reference answer sections omit entirely when respective toggles are off

### Progress feedback
- Status bar shows "Generating self-test..." while running; cleared on completion or error
- When batching: status bar updates to "Generating self-test... (batch 2/4)" for each batch
- On completion: a Notice popup confirms (e.g., "Self-test written to FolderName/")
- Errors (wrong API key, network failure, rate limit): Notice popup with plain-language message - no raw API error strings shown to users
- Empty folder (no .md files, or only `_self-test.md`): Notice error "No notes found in this folder." Abort without writing or overwriting any file

### Prompt strategy
- System message sets educator persona: "You are an expert educator creating active recall study materials."
- User message contains note content + specific formatting instructions
- LLM outputs raw markdown directly - no code block wrapper, plugin writes as-is
- Question count left entirely to the LLM ("as many questions as the content warrants")
- Synthesis pass (for batched folders): LLM rewrites and reorganizes all partial question sets into a unified, coherent self-test - reordering foundational to advanced, deduplicating, improving coherence

### Claude's Discretion
- Exact system message wording and persona phrasing
- Exact formatting instructions in the user message (how to describe callout syntax, category rules, etc.)
- How to split notes into batches (by note count, by char count, or by token estimate)
- Token budget thresholds and reserve amounts
- NoteSource interface shape and GenerationService class structure
- Where the command is registered (Phase 4 wires the entry points; Phase 3 exposes the generation API)

</decisions>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches for prompt construction and module organization.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/settings.ts`: `ActiveRecallSettings` interface - `apiKey`, `model`, `provider`, `language`, `generateHints`, `generateReferenceAnswers`, `generateConceptMap`, `customInstructions` are the contract for Phase 3
- `src/main.ts`: `this.settings` available on the plugin instance; `saveSettings()` / `loadSettings()` pattern established
- Obsidian `requestUrl()` - the only HTTP client (locked Phase 1, not fetch, not OpenAI SDK)
- Obsidian `Notice` class - for completion and error feedback
- Obsidian `this.addStatusBarItem()` - for progress indicator during generation

### Established Patterns
- `requestUrl({ url, method, headers, body, throw: false })` from `'obsidian'` - non-2xx does not crash onload
- TypeScript + esbuild, all Obsidian packages external
- `this.loadData()` / `this.saveData()` for persistence (not used in Phase 3, but pattern is set)
- Token budget heuristic: `chars / 4`; reserve ~20k tokens for prompt + output

### Integration Points
- Phase 3 introduces at minimum: `NoteSource` interface, a generation service/function, and a command registration in `main.ts`
- Phase 4 (Commands and Sidebar) will call the generation pipeline from context menu, command palette, and sidebar panel - Phase 3 should expose a clean callable API
- Output file: `vault.adapter.write(folderPath + '/_self-test.md', content)` or equivalent Obsidian file API

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 03-generation-pipeline*
*Context gathered: 2026-03-09*
