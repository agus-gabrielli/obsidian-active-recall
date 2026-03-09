# Feature Research

**Domain:** Obsidian community plugin - active recall / self-testing from notes
**Researched:** 2026-03-09
**Confidence:** MEDIUM-HIGH (ecosystem well-documented; some gaps in qualitative user data)

---

## Competitor Landscape

Before the feature breakdown, here is the competitive context this plugin enters.

| Plugin | Approach | Status | Gap |
|--------|----------|--------|-----|
| obsidian-spaced-repetition | Manual flashcard syntax in notes + SM2/FSRS scheduling | Active, widely used | Requires manual card authoring; no AI generation |
| Quiz Generator (ECuiDev) | AI-generated multi-type quiz from notes/folders, interactive UI | Stale (500 days since last commit), 44/100 score | Abandoned; multiple choice focus; output lives in plugin UI, not portable markdown |
| Flashcard Generator (chloedia) | AI Q&A generation per note, outputs to Spaced Repetition format | Low adoption | Single-note focus; outputs cards, not open-ended study material |
| Spaced Repetition AI (SRAI) | AI flashcard generation + FSRS scheduling embedded in notes | Active | Flashcard format only; no open-ended questions or concept orientation |
| Smart Connections | Semantic search + chat over vault | Active, popular | Discovery tool, not study/recall tool |
| Flashcards (reuseman) | Anki sync from vault | Active | Requires Anki install; manual card creation |
| Easy Test | Converts bold text to interactive quiz fields | Active | Not AI; requires manual formatting of source notes |

**Key gap this plugin fills:** No existing plugin generates open-ended, pedagogically ordered recall questions from a folder of notes as a portable markdown file. Existing AI tools either produce closed-format questions (multiple choice, flashcards) or require an interactive plugin UI to review. None produce a concept map alongside questions. None output plain `.md` that survives plugin removal.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Generate questions from note content | Core purpose of the plugin | LOW | Already designed; the LLM prompt does the work |
| Settings tab with API key input | Every AI plugin in Obsidian has this | LOW | Provider, model, API key at minimum |
| Command palette entry | Obsidian power users navigate by command; a plugin with no command feels unfinished | LOW | "Generate Self-Test for Current Folder" is sufficient |
| Works on the current folder | Folder is the natural unit of a topic in Obsidian | LOW | Already scoped to folder-level generation |
| Output written to a markdown file | Users expect to be able to read, edit, and share the result like any other note | LOW | `_self-test.md` pattern is clean |
| Regeneration / update | Users will change notes and want a fresh test | LOW | Overwrite on re-run is acceptable for v1 |
| Feedback when generation is in progress | LLM calls take seconds to minutes; silent waiting feels broken | LOW | Status bar message or modal spinner |
| Error messaging when API call fails | Wrong key, network error, rate limit - all common; silent failure is unacceptable | LOW | Show actionable error in Notice or modal |
| Mobile compatibility | Obsidian mobile is widely used; plugin should not crash on mobile | MEDIUM | API key input is awkward on mobile but must not break |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Open-ended questions ordered foundational to advanced | Matches how humans actually learn - concepts before applications. No existing plugin does this ordering. | MEDIUM | Requires prompt engineering; LLM does the heavy lifting |
| Question categories (Conceptual / Relationships / Application) | Makes the study session structured, not random. Helps users know what kind of thinking is expected. | LOW | Prompt-side; just instruct the LLM to categorize |
| Collapsible hints per question | Reduces friction vs. just scrolling to the answer. Stays in native Obsidian syntax - no custom rendering needed. | LOW | `> [!hint]-` callout with `+`/`-` suffix is standard Obsidian |
| Collapsible reference answers per question | Enables self-grading without spoiling the answer immediately. Other plugins show answers in a modal/UI; this stays in your notes. | LOW | Same callout pattern as hints |
| Concept map before questions | Orients the learner before diving into recall. No existing Obsidian recall plugin does this. | MEDIUM | Text-based concept map in markdown; prompt-engineering challenge |
| Plain `.md` output - no plugin lock-in | Output is readable, searchable, and editable without the plugin installed. Users deeply value Obsidian's portability ethos. | LOW | Architectural decision already made; keep it |
| Folder-level generation from sidebar panel | One-click from a visual panel vs. navigating menus. Lists folders with/without tests, shows which are stale. | MEDIUM | Leaf view / sidebar panel; requires Obsidian ItemView API |
| Context menu on folders | Zero-friction entry point; right-click a folder = generate. Feels native. | LOW | WorkspaceLeaf contextmenu event on folder items |
| Batch + synthesize for large folders | Graceful handling of any folder size. Quiz Generator has a hard limit (10 questions cap); this plugin has none. | HIGH | Most complex piece; requires chunked LLM calls + synthesis pass |
| User-configurable toggles (hints / answers / map) | Different learners want different formats. Some want hints-only, some want no concept map. | LOW | Settings checkboxes; condition prompt accordingly |
| Custom instructions field | Power users want to tune the LLM prompt (e.g. "focus on clinical applications", "use Socratic style"). | LOW | Append to system prompt; minimal implementation work |
| Language selection | Non-English Obsidian users are a significant part of the community. Forcing English output is an unnecessary limitation. | LOW | Single setting; instruct LLM to respond in target language |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Built-in spaced repetition scheduling | Users want to be told when to review | Adds significant state management (YAML frontmatter, due-date tracking, review queues); v1 scope doubles overnight. obsidian-spaced-repetition already does this well. | Design `_self-test.md` YAML frontmatter to be compatible with SR plugins in v2. Let existing tools handle scheduling. |
| Interactive quiz UI inside Obsidian | Quiz Generator has this; users expect it | Requires a custom rendered view, React or canvas API, event handling, scoring state - multiply implementation cost by 3x. Output becomes non-portable. | Collapsible callouts in plain markdown achieve 80% of the value with 5% of the complexity. Users grade themselves. |
| Automatic backup of previous self-tests | Users fear losing old versions | Adds file management complexity, backup naming conventions, cleanup logic. Obsidian's own history or git handles this better. | Document in README: rename `_self-test.md` before regenerating if you want to preserve it. |
| Real-time / auto-regeneration on note save | "Keep tests fresh automatically" | Silent LLM calls on every save = surprise API charges, rate limiting, and latency spikes. | Provide a "Regenerate" button. Let the user control when to spend tokens. |
| Cloud sync of test results / progress | Shared review progress across devices | Requires backend infrastructure, auth, privacy policy. Violates Obsidian's local-first model. | YAML frontmatter in `_self-test.md` for last-reviewed date is sufficient; Obsidian Sync handles the file itself. |
| Bundled API key / free tier | Lower friction for new users | Violates Obsidian plugin review guidelines (no bundled credentials). Creates cost liability for the developer. | User-provided API key is the standard for every AI plugin in the ecosystem. |
| Recursive folder scanning | "Just scan everything" | Unpredictable scope; large vaults could produce 50-note contexts blowing past token budgets silently. Users lose control of what's included. | Non-recursive is intentional. Users manage depth by folder structure. Document this clearly. |

---

## Feature Dependencies

```
[Settings Tab - API key, provider, model]
    └──required by──> [LLM Generation Pipeline]
                          └──required by──> [Question Generation]
                          └──required by──> [Concept Map Generation]
                          └──required by──> [Batch + Synthesize]

[Note Collection - NoteSource interface]
    └──required by──> [LLM Generation Pipeline]

[LLM Generation Pipeline]
    └──required by──> [_self-test.md file output]
                          └──enhances──> [Sidebar Panel - stale/fresh status]

[Sidebar Panel (ItemView)]
    └──enhances──> [Folder-level Generate / Regenerate workflow]

[Settings toggles - hints / answers / map on/off]
    └──configures──> [LLM Generation Pipeline - prompt construction]

[Batch + Synthesize]
    └──required when──> [folder exceeds token budget]
    └──depends on──> [LLM Generation Pipeline]

[Spaced repetition scheduling (v2)]
    └──depends on──> [_self-test.md YAML frontmatter - last_review, next_review]
    └──conflicts with──> [built-in review UI] (don't build both; delegate to SR plugins)
```

### Dependency Notes

- **Settings Tab is required by everything:** No API key = no generation. Settings must be the first thing a user configures. Onboarding should surface this immediately (modal or notice on first run if key is absent).
- **NoteSource abstraction required by pipeline:** The v1 folder reader is one implementation. v2 tag-based and graph-based collection modes slot in here without changing the generation pipeline.
- **Batch + Synthesize depends on the base pipeline:** It is not a separate path - it reuses the generation pipeline and adds a synthesis pass. Build the single-batch case first, then layer batching on top.
- **YAML frontmatter must not conflict with v2 SR:** `last_review`, `next_review`, `review_count`, `review_interval_days` keys should be reserved even if unpopulated in v1. Avoids a breaking migration later.
- **Interactive quiz UI conflicts with portable markdown output:** Choosing one precludes the other as a primary UX. This plugin's identity is the markdown-first approach.

---

## MVP Definition

### Launch With (v1)

Minimum viable product - what's needed to validate the concept.

- [ ] Settings tab - API key, provider (OpenAI), model selection - required before any generation works
- [ ] Folder-level note collection (non-recursive, excludes `_self-test.md`) - the input
- [ ] LLM generation: open-ended questions ordered foundational to advanced, categorized - the core output
- [ ] Collapsible hint + reference answer per question using native Obsidian callout syntax - the key UX differentiator
- [ ] Concept map section before questions (when content supports it) - the orientation feature
- [ ] Write output to `_self-test.md` in the selected folder - the portability contract
- [ ] Command palette: "Generate Self-Test for Current Folder" - minimum viable entry point
- [ ] Context menu on folders: "Generate Self-Test" - natural discovery path
- [ ] Sidebar panel (leaf view): folder list with Generate / Regenerate buttons - primary workflow surface
- [ ] Batch + synthesize for folders exceeding token budget - required for correctness on real-world vaults
- [ ] Progress feedback (status bar or modal) + error messaging - required for production quality
- [ ] Settings toggles: hints on/off, answers on/off, concept map on/off - low cost, high user value
- [ ] Language selection setting - low friction for non-English users

### Add After Validation (v1.x)

Features to add once core generation is working and users are giving feedback.

- [ ] Single-note generation (`my-note_self-test.md`) - trigger: user feedback that folder scope is too coarse
- [ ] Anthropic provider support - trigger: user requests; abstraction already in place
- [ ] Custom LLM endpoint support - trigger: self-hosting / privacy-focused user requests
- [ ] Content change detection in sidebar (show "stale" indicator when notes are newer than `_self-test.md`) - trigger: users regenerating too frequently or not knowing when to regenerate

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Spaced repetition scheduling - YAML frontmatter + review queue + due-date tracking. High complexity. Existing plugins (obsidian-spaced-repetition, SRAI) already do this well; integrate rather than replicate.
- [ ] Tag-based collection mode - gather notes by tag across folders. Architecture-ready (NoteSource interface), but the UX for selecting tags needs design work.
- [ ] Link graph collection mode - gather notes by Obsidian backlink graph depth. Novel, potentially powerful, requires graph traversal.
- [ ] Manual note selection - multi-select from file browser to create ad-hoc study sets. Useful for exam prep scenarios.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| LLM question generation (folder) | HIGH | MEDIUM | P1 |
| Settings tab + API key | HIGH | LOW | P1 |
| Collapsible hints + answers | HIGH | LOW | P1 |
| Plain `.md` output | HIGH | LOW | P1 |
| Command palette entry | HIGH | LOW | P1 |
| Concept map section | HIGH | MEDIUM | P1 |
| Progress + error feedback | HIGH | LOW | P1 |
| Context menu on folders | MEDIUM | LOW | P1 |
| Sidebar panel | MEDIUM | MEDIUM | P1 |
| Batch + synthesize | HIGH | HIGH | P1 (correctness) |
| Settings toggles (hints/answers/map) | MEDIUM | LOW | P1 |
| Language selection | MEDIUM | LOW | P1 |
| Single-note generation | MEDIUM | LOW | P2 |
| Stale content detection | MEDIUM | MEDIUM | P2 |
| Additional LLM providers | MEDIUM | LOW | P2 |
| Tag-based collection | MEDIUM | MEDIUM | P3 |
| Spaced repetition scheduling | HIGH | HIGH | P3 |
| Interactive quiz UI | LOW | HIGH | P3 (anti-feature for v1) |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | obsidian-spaced-repetition | Quiz Generator (ECuiDev) | Flashcard Generator (chloedia) | This Plugin |
|---------|---------------------------|--------------------------|-------------------------------|-------------|
| AI question generation | No | Yes (multi-type) | Yes (Q&A only) | Yes (open-ended, ordered) |
| Output format | Inline syntax in source notes | Plugin UI (non-portable) | Flashcard syntax for SR plugin | Plain `.md` file |
| Question types | Flashcard / cloze | MC, T/F, matching, SA, LA | Q&A pairs | Open-ended recall (conceptual, relational, application) |
| Concept map | No | No | No | Yes (text-based, conditional) |
| Hints | No | No | No | Yes (collapsible callout) |
| Folder-level generation | No (note-level) | Yes | No (note-level) | Yes |
| Spaced repetition scheduling | Yes (SM2/FSRS) | No | No (delegates to SR plugin) | No (v2) |
| Works without plugin installed | No | No | No | Yes (plain `.md`) |
| Active maintenance | Yes | No (500 days stale) | Low | New |
| Multiple LLM providers | No | Yes (7 providers) | Yes (OpenAI + Ollama) | OpenAI v1; abstracted for more |
| Mobile support | Partial | Unknown | Unknown | Yes (must not break) |

---

## Sources

- [obsidian-spaced-repetition GitHub](https://github.com/st3v3nmw/obsidian-spaced-repetition) - Feature list and algorithm details
- [Quiz Generator GitHub (ECuiDev)](https://github.com/ECuiDev/obsidian-quiz-generator) - Question types, provider support, UI design
- [Quiz Generator stats (obsidianstats.com)](https://www.obsidianstats.com/plugins/quiz-generator) - Maintenance status, user score
- [Flashcard Generator GitHub (chloedia)](https://github.com/chloedia/Obsidian_Quiz_Generator) - Output format, limitations
- [Spaced Repetition AI stats](https://www.obsidianstats.com/plugins/spaced-repetition-ai) - FSRS algorithm, AI generation approach
- [Best Plugins for Spaced Repetition - obsidianstats.com (2025-05-01)](https://www.obsidianstats.com/posts/2025-05-01-spaced-repetition-plugins) - Ecosystem overview, 26-plugin landscape
- [Obsidian Forum - Flashcard setup friction](https://forum.obsidian.md/t/flashcards-spaced-repetition-how-to-setup-after-install/105624) - User pain points with SR plugins
- [Obsidian Callouts - Official Help](https://help.obsidian.md/Editing+and+formatting/Callouts) - Collapsible callout syntax (`+`/`-`)
- [Obsidian Plugin Guidelines](https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines) - Store requirements
- [Smart Connections GitHub](https://github.com/brianpetro/obsidian-smart-connections) - Scope boundaries (discovery, not recall)

---

*Feature research for: Obsidian Active Recall / Self-Test Plugin*
*Researched: 2026-03-09*
