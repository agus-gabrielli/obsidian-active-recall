# Obsidian Active Recall Plugin

## What This Is

An Obsidian community plugin that helps users learn from their own notes through active recall. It reads markdown notes from a selected folder, sends the content to an LLM, and generates a `_self-test.md` file with open-ended questions, hints, reference answers, and a concept map — all in standard Obsidian markdown. The plugin targets publication to the Obsidian community plugin store.

## Core Value

Users can generate a structured self-test from any folder of notes in one click, turning passive note review into active recall practice.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can generate a `_self-test.md` by selecting a folder from the sidebar or command palette
- [ ] Plugin reads all top-level `.md` files in the selected folder (non-recursive, excludes `_self-test.md` itself)
- [ ] LLM generates open-ended recall questions ordered from foundational to advanced
- [ ] Questions are categorized into Conceptual, Relationships, and Application when content supports it
- [ ] Each question includes a hidden hint using Obsidian collapsible callout syntax
- [ ] Each question includes a hidden reference answer using Obsidian collapsible callout syntax
- [ ] LLM generates a brief concept map before the questions when content supports it
- [ ] Context window management: batch + synthesize for folders exceeding token budget
- [ ] Plugin settings tab: provider, API key, model, language, hint/answer/map toggles, custom instructions
- [ ] Sidebar panel (leaf view): lists folders with/without self-tests, with Generate/Regenerate buttons
- [ ] Regeneration overwrites `_self-test.md` without backup
- [ ] Command: "Generate Self-Test for Current Folder"
- [ ] Command: "Open Active Recall Panel"
- [ ] Context menu on folders: "Generate Self-Test"
- [ ] Note collection abstracted behind `NoteSource` interface for future collection modes
- [ ] OpenAI is the first wired LLM provider; provider interface abstracted for future additions
- [ ] Output is standard `.md` — no plugin-specific formats, no database

### Out of Scope

- Spaced repetition scheduling — deferred to v2 (adds significant complexity, not core to v1 value)
- Single-note generation (`my-note_self-test.md`) — deferred to v2
- Alternative collection modes (by tag, link graph, manual selection) — v2 architecture-ready but not wired
- Content change detection in sidebar — v2
- Anthropic and custom endpoint providers — v2 (abstraction in place, only OpenAI wired)
- Automatic backup of previous self-tests — too complex for v1; user renames manually if needed
- Real-time sync or collaboration — out of scope entirely

## Context

- Target: Obsidian community plugin store — requires `manifest.json`, README, semantic versioning, and adherence to Obsidian plugin guidelines
- LLM integration: user-provided API key, no bundled access; keeps plugin free and privacy-respecting
- Output format: all generated content is standard Obsidian-flavored markdown, fully portable if plugin is removed
- The testing effect (cognitive science): retrieval practice strengthens long-term retention more than passive review — this is the research motivation behind the plugin
- V2 spaced repetition metadata will live in `_self-test.md` YAML frontmatter (`last_review`, `next_review`, `review_count`, `review_interval_days`) — architecture should not conflict with this

## Constraints

- **Tech Stack**: TypeScript + Obsidian Plugin API — standard for all community plugins
- **Compatibility**: Must support Obsidian v1.0+ and both desktop and mobile (mobile caveat: API key input is less ergonomic on mobile but should still work)
- **Distribution**: Must pass Obsidian community plugin review process (no remote code execution, no external tracking, no bundled credentials)
- **Context Window**: Token budget heuristic is `chars / 4`; reserve ~20k tokens for prompt + output; remainder available for notes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| OpenAI first, provider-abstracted | Largest community user base; abstraction allows Anthropic/custom later without refactoring | — Pending |
| Non-recursive folder reading | Keeps scope predictable; user controls depth by folder structure | — Pending |
| Overwrite on regeneration (no backup) | Simplest and most predictable; users can rename manually | — Pending |
| Batch + synthesize for large folders | Handles any folder size gracefully without hard limits | — Pending |
| `NoteSource` interface abstraction | Decouples collection mode from generation pipeline; v2 modes drop in | — Pending |
| Standard `.md` output only | Full portability; no lock-in to plugin-specific rendering | — Pending |

---
*Last updated: 2026-03-09 after initialization*
