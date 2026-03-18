# Phase 6: Refinements and Improvements - Context

**Gathered:** 2026-03-17
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve the existing plugin's prompt quality, UX polish, code organization, and README before the final store submission in Phase 7. All v1 features are complete - this phase refines what exists without adding new capabilities.

</domain>

<decisions>
## Implementation Decisions

### Prompt template refactoring
- Move all LLM prompts from `generation.ts` to a dedicated `src/prompts.ts` file
- Use readable template strings with `{{placeholder}}` syntax for dynamic parts (note blocks, optional sections like concept map, hints, reference answers)
- Add a small `render(template, vars)` function in `generation.ts` for substitution
- `prompts.ts` becomes the single place to read/tweak what gets sent to the LLM
- `generation.ts` stays focused on batching, API calls, and error handling
- Empty lines from disabled optional sections are acceptable (no effect on LLM output)

### Concept map improvements
- Switch from flat bullet list to Mermaid mindmap diagram (Obsidian renders natively)
- Limit to key concepts and important relationships only - no exhaustive lists
- Hierarchical structure: categories with subconcepts
- Logical ordering: general/simple concepts first, then more specific/complex
- Purpose: give user a structural overview of what they'll be tested on

### Question ordering
- Within each category section (Conceptual, Relationships, Application), order questions from general/simple to complex/specific
- Prompt must explicitly instruct this ordering

### Hint quality
- Style: contextual cues that situate the concept without revealing the answer
- E.g., "Think about the training loop - what happens after the forward pass computes the loss?"
- If a useful hint cannot be generated without being too obvious, omit the hint entirely for that question
- Prioritize hints that trigger recall through associations, context, or indirect cues

### Check answer quality
- Provide slightly more detailed explanations that help understanding, not just validation
- Add context or clarifications when relevant to reinforce learning
- Avoid overly short responses unless the question is simple enough to warrant it

### Source traceability in check answers
- Each check answer must include which Obsidian note(s) the answer is based on
- Use Obsidian wiki-link syntax: `Source: [[Note A]], [[Note B]]`
- Placed inline at the end of each check answer (not a separate section)
- Support multiple source notes when the answer draws from more than one

### README improvements
- Add evidence-based foundations section referencing key papers:
  - Roediger & Karpicke (2006) - testing effect
  - Dunlosky et al. (2013) - learning techniques review
  - Karpicke & Blunt (2011) - retrieval vs concept mapping
- Explain why active recall beats passive re-reading/highlighting
- Connect each plugin feature (concept map, ordered questions, hints, check answers) to the underlying science
- Add differentiation paragraph vs "LLM Test Generator" (Competence) by Aldo George:
  - That plugin requires typing full answers into boxes then submits for AI grading/scoring
  - Our plugin generates questions designed to be answered out loud or in your head - zero typing, zero grading, pure retrieval practice
  - Key differences: no test anxiety (no scores), effort goes into recall not writing, concept map for orientation, questions ordered simple to complex, hints that cue without revealing

### Sidebar loading indicator
- During generation, replace the Generate/Regenerate button with a disabled spinner + "Generating..." text
- Prevents accidental double-generation
- Match Obsidian's minimalistic visual style

### Model selection dropdown
- Static curated list of models: gpt-4o, gpt-4o-mini, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano
- "Custom model..." option at the bottom reveals a text input field
- No dynamic API calls to fetch models - simple, always works, no API key dependency
- Easy to update the list in code when new models release

### Claude's Discretion
- Exact Mermaid mindmap prompt instructions (depth limits, syntax guardrails)
- Specific wording of contextual cue hint instructions in the prompt
- How to structure the render() template substitution (regex vs simple replace)
- CSS for sidebar spinner animation
- Curated model list ordering

</decisions>

<canonical_refs>
## Canonical References

No external specs - requirements fully captured in decisions above.

### Project context
- `.planning/PROJECT.md` - Core value proposition, constraints, v2 reserved frontmatter fields
- `.planning/REQUIREMENTS.md` - All v1 requirements (complete), v2 roadmap items

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/generation.ts` - Contains all prompt construction (`buildBatchPrompt`, `buildSynthesisPrompt`, `buildFormattingInstructions`), batching logic, `callLLM`, error handling - prompts will be extracted to `prompts.ts`
- `src/sidebar.ts` - `ActiveRecallSidebarView.renderPanel()` and `onGenerate()` - loading indicator will modify these
- `src/settings.ts` - `ActiveRecallSettingTab.display()` - model dropdown will replace the current text input
- `styles.css` - Existing sidebar styles (`active-recall-btn`, `active-recall-folder-row`) - spinner CSS will extend these

### Established Patterns
- Error feedback: Notice popup + status bar text (Phase 3, locked)
- Settings: `Setting` API with `.addDropdown()`, `.addText()`, `.addToggle()` - all patterns already in use
- Note names passed to LLM as `=== Note: ${n.name} ===` headers - source traceability can use these basenames for wiki-links

### Integration Points
- `src/prompts.ts` (new file) - extracted from `generation.ts`, imported by it
- `generation.ts` `buildBatchPrompt` / `buildSynthesisPrompt` - will be replaced by template rendering calls
- `sidebar.ts` `onGenerate()` - needs pre/post hooks for loading state
- `settings.ts` model setting - swap `.addText()` for `.addDropdown()` + conditional `.addText()`
- `README.md` - add science section after existing "What it does" intro

</code_context>

<specifics>
## Specific Ideas

- Concept map purpose: "for the user to remember the structure of the concepts in the folder, and what they're going to be tested on"
- Differentiation target: "LLM Test Generator" (Competence) plugin by Aldo George - requires typing answers for AI grading vs our pure retrieval practice approach
- Research references: Roediger & Karpicke (2006), Dunlosky et al. (2013), Karpicke & Blunt (2011)
- Hint example the user liked: "Think about the training loop - what happens after the forward pass computes the loss?"

</specifics>

<deferred>
## Deferred Ideas

- Dynamic model list from OpenAI API - rejected for v1 (complexity, requires valid key, returns irrelevant models)
- Per-provider model lists - deferred until more providers are added (v2)
- Mermaid fallback to bullets for simple content - could add later if Mermaid issues arise

</deferred>

---

*Phase: 06-refinements-and-improvements*
*Context gathered: 2026-03-17*
