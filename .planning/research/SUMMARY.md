# Project Research Summary

**Project:** Active Recall - Obsidian Self-Test Plugin
**Domain:** Obsidian Community Plugin (TypeScript + LLM integration)
**Researched:** 2026-03-09
**Confidence:** HIGH

## Executive Summary

This is an Obsidian community plugin that uses an LLM to generate open-ended active recall questions from a folder of notes, writing the result as a portable `_self-test.md` file. The ecosystem is well-documented and has a clear, established build pattern: TypeScript 5.x + esbuild (CJS output) + the official sample plugin as boilerplate. The single most important non-obvious constraint is HTTP transport: all LLM API calls must go through Obsidian's `requestUrl()` rather than the OpenAI npm SDK, native `fetch`, or any Node.js HTTP client. This is not a preference - it is a hard requirement for CORS compliance on desktop and functional correctness on mobile. The plugin targets both platforms.

The competitive landscape is favorable. No existing Obsidian plugin generates open-ended, pedagogically ordered questions as a portable markdown file. The closest competitors (Quiz Generator, Flashcard Generator) are either stale, output to non-portable plugin UI, or focus on flashcard formats. The differentiation - plain `.md` output with collapsible hints, reference answers, and a concept map - is achievable with prompt engineering and native Obsidian callout syntax. The full v1 feature set is tractable: the hard architectural decisions (LLMProvider interface, NoteSource abstraction, batch+synthesize pipeline) are well-understood from the research and have clear implementation paths.

The key risks are: (1) CORS/mobile breakage if HTTP transport is wrong - mitigated by using `requestUrl()` from the start; (2) token budget enforcement being bypassed for small test cases but failing on real vaults - mitigated by testing with large folders before release; (3) community store submission failures due to manifest and policy details - mitigated by addressing these in the foundation phase, not as an afterthought. None of these risks are novel; all have known solutions.

---

## Key Findings

### Recommended Stack

The stack is fully determined by the Obsidian ecosystem. Use the official sample plugin boilerplate as the starting point - it ships with the correct versions of TypeScript (^5.8.3), esbuild (0.25.5), tslib, and eslint flat config. Do not deviate from the boilerplate's esbuild configuration (`platform: "browser"`, `format: "cjs"`, `target: "es2018"`). The OpenAI npm SDK must not be used - replace it with a thin wrapper around `requestUrl()` from the `obsidian` package, which is ~30 lines of code and avoids all CORS, mobile, and bundle-size problems.

For development workflow: symlink the repo into the test vault's plugin directory, use esbuild watch mode, and install pjeby/hot-reload in the test vault for instant feedback. The full dev loop (save TypeScript -> rebuild -> plugin reloads in Obsidian) takes about 1 second.

**Core technologies:**
- TypeScript ^5.8.3: plugin source language - required by ecosystem, strict mode options enabled individually (not `strict: true` due to Obsidian class patterns)
- Obsidian API (latest): plugin host framework - provided at runtime, never bundled
- esbuild 0.25.5: bundler - produces CJS `main.js` targeting ES2018, 10-100x faster than webpack for watch mode
- `requestUrl()` from `obsidian`: all HTTP - bypasses CORS, works on mobile, replaces OpenAI SDK entirely
- pjeby/hot-reload: dev workflow - auto-reloads plugin on `main.js` change, standard dev loop

**What NOT to use:**
- OpenAI npm SDK (bundles Node internals that crash in Obsidian renderer and on mobile)
- Native `fetch()` or `node-fetch` (blocked by CORS, unavailable on mobile)
- `"strict": true` in tsconfig (conflicts with Obsidian plugin class initialization patterns)

See `.planning/research/STACK.md` for full details including `requestUrl()` code patterns and error handling.

### Expected Features

The feature set is well-defined. The competitive landscape confirms that the open-ended markdown-first approach is a genuine gap. All differentiating features are achievable without complex infrastructure - the concept map and question ordering are prompt engineering work, and collapsible hints/answers use native Obsidian callout syntax.

**Must have (table stakes):**
- LLM question generation from folder content - the core purpose
- Settings tab with API key, provider, model selection - every AI plugin requires this
- Command palette entry ("Generate Self-Test for Current Folder") - Obsidian power users expect it
- Plain `.md` output to `_self-test.md` - the portability contract
- Progress feedback and error messaging - silent 10-30s waits feel broken
- Mobile compatibility - must not crash, even if keyboard UX is imperfect
- Regeneration on re-run (overwrite) - users will iterate on notes

**Should have (competitive):**
- Open-ended questions ordered foundational to advanced - no existing plugin does this
- Question categories (Conceptual / Relationships / Application) - low cost, high structure value
- Collapsible hints and reference answers (native callout syntax) - key differentiator vs. modal-based competitors
- Concept map section before questions - orients the learner, no competitor has this
- Sidebar panel (ItemView) - primary workflow surface, one-click generation per folder
- Context menu on folders - zero-friction discovery
- Batch + synthesize for large folders - required for correctness, not a v2 feature
- Settings toggles (hints on/off, answers on/off, concept map on/off) - low cost, high value
- Language selection - low friction for non-English users
- Custom instructions field - power user tuning

**Defer (v2+):**
- Spaced repetition scheduling (YAML frontmatter for SR plugin compatibility should be reserved in v1, but scheduling logic deferred)
- Single-note generation mode - add after user feedback on folder scope
- Anthropic / additional LLM providers - abstraction is in place; add on demand
- Tag-based and graph-based note collection modes
- Stale content detection in sidebar

**Anti-features to avoid entirely:**
- Interactive quiz UI (non-portable, 3x implementation cost, conflicts with markdown-first identity)
- Auto-regeneration on save (surprise API charges)
- Recursive folder scanning (unpredictable token scope)
- Built-in cloud sync of progress (violates local-first ethos, requires backend)

See `.planning/research/FEATURES.md` for competitor analysis and full prioritization matrix.

### Architecture Approach

The architecture follows the standard Obsidian plugin pattern: a thin `Plugin` class in `main.ts` that registers everything in `onload()` and delegates all logic to separate classes. The generation flow is a linear pipeline: `NoteCollector` -> `ContextBudgetManager` -> `LLMClient` (via `LLMProvider` interface) -> `OutputWriter`. The `SidebarView` is an `ItemView` that triggers generation and refreshes via `getLeavesOfType()` (never a stored reference). Settings are a single object on the plugin instance, passed by reference to all components.

The two key abstractions are: `LLMProvider` interface (OpenAI in v1, Anthropic slots in later) and `NoteSource` interface (folder-based in v1, tag/graph modes slot in later). Both are required by the project design and cost almost nothing to establish upfront.

**Major components:**
1. `main.ts` / `Plugin` - thin orchestrator, registers commands, views, events, settings tab
2. `SidebarView` (ItemView) - sidebar leaf panel with folder list, Generate/Regenerate buttons
3. `SettingsTab` (PluginSettingTab) - provider, API key, model, toggles; persists via `saveData`
4. `NoteCollector` (implements `NoteSource`) - reads `.md` files from a vault folder
5. `ContextBudgetManager` - token budget enforcement, batch splitting for large folders
6. `LLMClient` + `OpenAIProvider` (implements `LLMProvider`) - HTTP calls via `requestUrl()`, error handling
7. `OutputWriter` - creates or overwrites `_self-test.md` via `app.vault`

See `.planning/research/ARCHITECTURE.md` for full data flow diagrams, build order, and anti-patterns.

### Critical Pitfalls

1. **Using `fetch()`, OpenAI SDK, or `node-fetch` for HTTP calls** - all fail due to CORS on desktop or missing Node APIs on mobile. Use `requestUrl()` from the `obsidian` package. This must be decided in the foundation phase before any LLM integration work begins.

2. **Token budget not enforced before API call** - testing with 2-3 short notes hides this. With 30+ dense notes, the combined prompt exceeds the context window and the API returns an error. Count tokens using the `chars / 4` heuristic before building the prompt, not after. Reserve budget for system prompt + output + safety margin first. Test with 20+ notes before any release.

3. **Missing `detachLeavesOfType` in `onunload()`** - one missing line causes duplicate sidebar panes when the plugin is disabled and re-enabled. Fix: `this.app.workspace.detachLeavesOfType(VIEW_TYPE)` in `onunload()`, and check for an existing leaf before opening a new one.

4. **API key stored in `data.json` without warning about Git exposure** - `data.json` ends up in commits for users syncing with obsidian-git. Add a visible warning in the settings UI. Consider using Obsidian's Secret Storage API (v1.11.0+) as the storage backend.

5. **Community store submission failures** - the plugin ID must not start with "obsidian-", the GitHub release tag must match `manifest.json` version exactly with no `v` prefix (use `1.0.0` not `v1.0.0`), and a README must exist before submission. Address these in the foundation phase.

---

## Implications for Roadmap

Based on research, the phase structure follows naturally from the dependency graph: settings must exist before generation, the HTTP layer must be correct before the LLM is wired, and the sidebar is independent until `runGeneration()` exists.

### Phase 1: Foundation and Dev Environment

**Rationale:** Nothing compiles, loads, or is testable without this. The CORS/mobile HTTP constraint and manifest policy issues must be locked in before any feature work begins - retrofitting the HTTP layer is costly, renaming the plugin ID after store submission is worse.
**Delivers:** Working plugin scaffold that loads in Obsidian, hot-reload dev loop, correct esbuild config, manifest with correct ID, verified `requestUrl()` HTTP pattern.
**Addresses:** Settings tab (API key input, provider), `manifest.json` structure
**Avoids:** OpenAI SDK / CORS / mobile crash pitfall (Pitfall 1, 2); store submission manifest failures (Pitfall 5)
**Research flag:** Standard - well-documented patterns, no deeper research needed.

### Phase 2: Settings and Configuration

**Rationale:** Every subsequent component - the LLM client, the pipeline, the sidebar - reads from settings. Must exist before any integration work.
**Delivers:** `PluginSettings` interface, `DEFAULT_SETTINGS`, `SettingsTab` with provider/API key/model/toggles/language, `loadSettings`/`saveSettings`, API key security warning.
**Addresses:** Settings tab (table stakes), user-configurable toggles, language selection, API key security warning (Pitfall 3)
**Implements:** `settings/` module, `loadData`/`saveData` pattern
**Research flag:** Standard - official docs and sample plugin cover this completely.

### Phase 3: LLM Integration and Generation Pipeline

**Rationale:** The core value of the plugin. Builds the full pipeline from note reading through LLM call to file output. The `LLMProvider` interface and `NoteSource` abstraction are established here, not deferred, because they are cheaper to do correctly the first time.
**Delivers:** `NoteCollector`, `ContextBudgetManager` (with token budget enforcement and batch+synthesize), `LLMProvider` interface, `OpenAIProvider` (via `requestUrl()`), `OutputWriter`, `Plugin.runGeneration()`. End-to-end generation testable via command palette.
**Addresses:** LLM question generation, concept map, collapsible hints/answers, plain `.md` output, batch+synthesize for large folders, progress feedback, error messaging
**Avoids:** Token budget pitfall (Pitfall 6); CORS/HTTP pitfall reinforced in `OpenAIProvider`
**Research flag:** Needs research-phase attention during planning. Token budget heuristics, prompt engineering for ordered questions + concept map, and batch synthesis prompt design all benefit from pre-implementation research. This is the most complex phase.

### Phase 4: UI - Commands, Context Menu, Sidebar

**Rationale:** All entry points into `runGeneration()` are wired here. The sidebar (`ItemView`) is the primary workflow surface but depends on the generation pipeline existing. Commands and context menu are trivial once `runGeneration()` exists.
**Delivers:** Command palette entry, folder context menu, `SidebarView` (ItemView) with folder list and Generate/Regenerate buttons, sidebar refresh via `getLeavesOfType()`, loading state during generation, view cleanup in `onunload()`.
**Addresses:** Command palette entry (table stakes), sidebar panel (differentiator), context menu (differentiator), folder-level workflow
**Avoids:** Stale view reference anti-pattern; `containerEl.children[1]` anti-pattern; duplicate pane on plugin reload pitfall (Pitfall 4)
**Research flag:** Standard - official Views docs and community patterns are well-documented.

### Phase 5: Polish and Release Preparation

**Rationale:** Wraps all components with production-quality error handling, UX details, and submission compliance. Doing this last means the polish targets real behavior, not assumptions.
**Delivers:** User-friendly error message mapping, overwrite confirmation modal, mobile keyboard UX fixes, API key masking in settings, "Looks Done But Isn't" checklist verification, README with API key setup instructions, GitHub release with correct tag format.
**Addresses:** Error messaging (table stakes), mobile compatibility, overwrite flow UX
**Avoids:** Community store submission failures (Pitfall 5); UX pitfalls (overwrite without warning, raw API errors shown to user)
**Research flag:** Standard - pitfalls are well-documented and specific. No research needed, just discipline.

### Phase Ordering Rationale

- Settings must precede LLM integration because the LLM client reads API key and model from settings at construction time.
- The HTTP layer decision (`requestUrl()` vs SDK) must be locked in the foundation phase because it affects every subsequent LLM-related component. Changing it retroactively requires touching `OpenAIProvider`, the build config, and any test harness.
- Batch + synthesize is in the same phase as basic generation (Phase 3), not a later phase. Research confirms that real vaults commonly exceed single-call token budgets; shipping without batching means the plugin silently fails or errors on typical use.
- The sidebar (Phase 4) is deliberately after the pipeline (Phase 3) so the "Generate" button has something real to call. This avoids building the UI against a stub.
- The `NoteSource` and `LLMProvider` interfaces are established in Phase 3 even though only one concrete implementation each is built. The cost is negligible and avoids a refactor when Anthropic or tag-based collection is added.

### Research Flags

Phases likely needing `/gsd:research-phase` during planning:
- **Phase 3 (LLM Pipeline):** Prompt engineering for ordered questions, concept map generation, and multi-batch synthesis are the highest-uncertainty work. The token budget heuristic and batch size strategy benefit from pre-implementation research before writing ContextBudgetManager. Also: OpenAI model selection (gpt-4o vs gpt-4o-mini for cost/quality tradeoff) needs a decision.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Foundation):** Official sample plugin is the template. esbuild config is verified. No research needed.
- **Phase 2 (Settings):** Standard Obsidian plugin settings pattern. Well-documented.
- **Phase 4 (UI/Commands):** Views, context menus, and commands are all covered in official docs with examples.
- **Phase 5 (Polish/Release):** Pitfalls are enumerated and specific. Checklist-driven, not research-driven.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Official template verified; `requestUrl()` pattern confirmed via real-world plugin source; esbuild config from official repo |
| Features | MEDIUM-HIGH | Competitor landscape well-documented; feature priorities based on ecosystem patterns and user forum data; some qualitative user data gaps |
| Architecture | HIGH | Based on official Obsidian developer docs throughout; all patterns verified against official API reference |
| Pitfalls | HIGH | Most pitfalls confirmed via official docs (developer policies, mobile docs, Views docs); CORS/SDK pitfall additionally verified via OpenAI community forum practitioner report |

**Overall confidence:** HIGH

### Gaps to Address

- **Prompt engineering quality:** Research confirms the structure (ordered questions, categories, concept map, callout format) but the actual prompt that reliably produces well-ordered output at a consistent quality level needs iteration during Phase 3. Budget time for prompt testing before wiring it to the full pipeline.
- **Token budget calibration:** The `chars / 4` heuristic is standard, but the exact thresholds for triggering batch mode and the synthesis prompt design are not validated. Test with diverse real-world note sets early in Phase 3 rather than at the end.
- **Model selection for cost/quality:** gpt-4o vs gpt-4o-mini tradeoff for this use case (long-form note comprehension + structured output) is not resolved by research. Recommendation: default to gpt-4o-mini in settings with gpt-4o as an option; let users decide.
- **Obsidian Secret Storage API adoption:** The v1.11.0+ Secret Storage API is new. Whether to implement it in v1 or just add the `data.json` warning needs a decision. Recommendation: implement the warning in v1, add Secret Storage in v1.x if users report key exposure incidents.
- **Streaming:** `requestUrl()` does not support streaming. Non-streaming is confirmed acceptable for v1 (full response appears after the API call resolves). If users strongly request streaming, that becomes a desktop-only v2 feature using native `fetch()` with a `Platform.isDesktop` guard.

---

## Sources

### Primary (HIGH confidence)
- https://github.com/obsidianmd/obsidian-sample-plugin - Official template; package.json, tsconfig, esbuild config
- https://docs.obsidian.md/Plugins/Getting+started/Anatomy+of+a+plugin - Plugin lifecycle and registration patterns
- https://docs.obsidian.md/Plugins/User+interface/Views - ItemView API, getLeavesOfType pattern
- https://docs.obsidian.md/Plugins/User+interface/Context+menus - Context menu registration
- https://docs.obsidian.md/Reference/TypeScript+API/Plugin - Plugin base class API
- https://docs.obsidian.md/Plugins/Vault - Vault read/write API
- https://docs.obsidian.md/Developer+policies - Community store submission requirements
- https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins - Release checklist
- https://docs.obsidian.md/Plugins/Getting+started/Mobile+development - Mobile constraints
- https://github.com/CtrlAltFocus/obsidian-plugin-auto-tag/blob/main/src/services/openai.api.ts - Real-world requestUrl + OpenAI pattern
- https://github.com/pjeby/hot-reload - Hot-reload dev workflow

### Secondary (MEDIUM confidence)
- https://www.obsidianstats.com/plugins/quiz-generator - Competitor status (Quiz Generator stale)
- https://www.obsidianstats.com/posts/2025-05-01-spaced-repetition-plugins - Ecosystem overview
- https://forum.obsidian.md/t/support-streaming-the-request-and-requesturl-response-body/87381 - Streaming limitation status
- https://forum.obsidian.md/t/plugin-esbuild-platform-node-vs-browser/72267 - Platform node vs browser consequences
- https://community.openai.com/t/fyi-using-openai-npm-under-obsidian-md/64273 - OpenAI SDK failure modes in Obsidian
- https://blog-ssh3ll.medium.com/mind-your-obsidian-plugin-secrets-fc141f34b936 - API key security patterns (Nov 2025)
- https://forum.obsidian.md/t/how-to-correctly-open-an-itemview/60871 - ItemView open/dedup pattern

---
*Research completed: 2026-03-09*
*Ready for roadmap: yes*
