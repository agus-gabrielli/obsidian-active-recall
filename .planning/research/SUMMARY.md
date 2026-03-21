# Project Research Summary

**Project:** Active Recall - Obsidian Community Plugin (v2.0 milestone)
**Domain:** Obsidian TypeScript plugin with multi-provider LLM integration and flexible note collection
**Researched:** 2026-03-21
**Confidence:** HIGH

## Executive Summary

This is a v2.0 milestone for an already-shipped Obsidian community plugin. The v1.0 foundation (OpenAI-only, folder-based generation, sidebar, batch+synthesize pipeline) is fully built. The v2.0 work expands that foundation along two axes: adding Gemini and Claude as alternative LLM providers, and adding three new note collection modes (by tag, by linked notes, single note). Research confirms both axes are well-understood and low-risk - the Obsidian API surface needed for new collection modes (MetadataCache, vault iteration, FuzzySuggestModal) is stable and directly verified from installed type definitions, and all three provider APIs are called via Obsidian's existing `requestUrl()` pattern with zero new npm dependencies.

The recommended approach is a sequential build order driven by the dependency graph: settings schema migration before any provider or UI work, provider dispatch before the Gemini/Claude adapters, collector functions before sidebar UI. The existing `NoteSource { name, content }` interface is already the correct abstraction - all three new collection modes feed into it unchanged, and the batch+synthesize pipeline that consumes it needs no modifications. The most important architectural commitment is a centralized `callLLM(settings, messages)` dispatcher that routes to per-provider adapters rather than scattering provider-specific logic across generation methods. This keeps adding a future fourth provider to a single switch statement and one settings config block.

The top risks are: settings migration silently wiping existing users' OpenAI keys on first v2.0 load (due to `Object.assign` shallow-merge behavior when settings schema goes from flat to nested); provider-specific API shape differences that don't surface until integration test time (Anthropic requires `x-api-key` header and mandatory `max_tokens`; Gemini's response is at `candidates[0].content.parts[0].text` not `choices[0].message.content`); and tag normalization inconsistency between frontmatter and inline tags. All three are well-understood and preventable with a one-time migration check in `loadSettings()`, per-provider adapter isolation, and `replace(/^#/, '')` normalization respectively.

---

## Key Findings

### Recommended Stack

The plugin is already on the correct stack. No new npm packages are needed for v2.0. All three LLM providers use `requestUrl()` from the Obsidian API - the same pattern validated in v1.0. The Obsidian tag and link APIs needed for new collection modes are part of the existing `obsidian` type package already installed and verified directly from `node_modules/obsidian/obsidian.d.ts`.

**Core technologies:**
- **TypeScript ^5.8.3** - plugin language; strict mode options enabled individually per official template (not `strict: true` due to Obsidian class patterns)
- **Obsidian API (latest)** - runtime host; `requestUrl()` for all HTTP; `getAllTags(cache)` for tag collection; `resolvedLinks` for link traversal
- **esbuild 0.25.5** - bundler; `platform: "browser"` is non-negotiable; CJS output, ES2018 target
- **`getAllTags(cache)`** - Obsidian utility; normalizes both frontmatter and inline tags; returns `string[] | null`; use this not manual cache parsing
- **`app.metadataCache.resolvedLinks`** - pre-built link adjacency index; most efficient for link traversal; reliable only after `onLayoutReady()`

**Explicitly do NOT add for v2:**
- `@google/generative-ai`, `@anthropic-ai/sdk`, or any other HTTP client library - same CORS/mobile breakage reasons as the OpenAI SDK

See `.planning/research/STACK.md` for full `requestUrl()` code patterns, all three provider request/response shapes, and verified API type signatures.

### Expected Features

The v2.0 scope is clearly bounded. All P1 features are required to call v2.0 done. P2 features are explicitly deferred.

**Must have (table stakes for v2.0):**
- Provider selector (OpenAI / Gemini / Claude) with per-provider API key fields and model dropdowns
- Gemini REST caller via `requestUrl()` to `generativelanguage.googleapis.com`
- Claude REST caller via `requestUrl()` to `api.anthropic.com/v1/messages`
- Centralized `callLLM` dispatching to correct provider adapter
- Tag-based collection with `FuzzySuggestModal` tag picker
- Linked notes collection with root note picker and depth-1 traversal
- Single-note generation from file context menu
- `_self-tests/` output folder for tag/link modes (required by new modes - existing `writeOutput()` hardcodes folder path)
- Error classification updated for Gemini and Claude HTTP error shapes
- Community store release (manifest, README updated, PR opened)

**Should have (differentiators):**
- Depth-2 link traversal toggle (can ship depth-1 only and add toggle after)
- Configurable `_self-tests/` output folder path

**Defer to v2.x:**
- Stale content detection in sidebar
- Spaced repetition scheduling
- Manual multi-note selection
- Custom LLM endpoint / OpenRouter support

**Established anti-features (do not build):**
- OpenAI-compatible proxy for Gemini/Claude - forces wrong response shapes; known compliance issues with Gemini's compat endpoint
- Dynamic model discovery from API - adds latency and error surface; curated list + "Custom model..." is the proven Obsidian Copilot pattern
- Depth-3+ link traversal - unbounded token blowout, graph complexity grows fast
- Recursive tag subtag matching - counter-intuitive results, not worth the complexity

See `.planning/research/FEATURES.md` for full prioritization matrix, feature dependencies, and MVP definition.

### Architecture Approach

The v2.0 architecture is an additive layer on the existing v1.0 structure. `main.ts` and `prompts.ts` are completely unchanged. Three files are modified: `settings.ts` (expanded provider types and per-provider config), `generation.ts` (provider dispatch plus three new collectors), and `sidebar.ts` (mode tabs plus mode-specific panels). The key insight is that `NoteSource { name, content }` stays unchanged - all four collection modes (folder, tag, links, single) produce the same shape that feeds into the unchanged batch+synthesize pipeline.

**Major components:**
1. **settings.ts** - Expands `LLMProvider` to `'openai' | 'gemini' | 'anthropic'`; adds `ProviderConfig { apiKey, model }` nested per provider; activates provider dropdown; shows conditional per-provider fields via `display()` re-render
2. **generation.ts** - Central `callLLM(settings, messages)` dispatcher routes to `callOpenAI` / `callGemini` / `callAnthropic`; new collectors (`collectByTag`, `collectByLinks`, `collectSingleNote`); new `GenerationService` methods (`generateForTag`, `generateForLinks`, `generateForNote`); shared `runPipeline` extracted from existing `generate()`; new `writeOutputToPath` helper
3. **sidebar.ts** - Mode selector tabs at top (Folder / Tag / Links / Note); per-mode panel rendering (`renderFolderPanel`, `renderTagPanel`, `renderLinkPanel`, `renderNotePanel`); delegates to new `GenerationService` entry points
4. **Provider adapters** - Each handles its own request shape, auth headers, response extraction, truncation detection, and error classification
5. **Collector functions** - Tag: `getAllTags(cache)` with `#` normalization; Links: BFS over `resolvedLinks` with visited-set deduplication; Single note: trivial one-file wrapper

**Build order (dependency-driven):**
Settings schema migration -> provider dispatch + OpenAI extraction -> Gemini adapter -> Anthropic adapter -> tag collector -> link collector -> single note collector -> `writeOutputToPath` -> sidebar UI -> error message polish

See `.planning/research/ARCHITECTURE.md` for complete data flow diagrams, full code patterns for each adapter, and all anti-patterns to avoid.

### Critical Pitfalls

1. **Settings migration wipes existing OpenAI keys** - `Object.assign` shallow-merges: when `DEFAULT_SETTINGS` has `openai: { apiKey: '', model: '' }` and saved `data.json` has flat `apiKey: "sk-..."`, the nested `openai` object from defaults replaces nothing useful. The user's key disappears silently. Fix: after loading, check `if (savedData.apiKey && !savedData.openai?.apiKey)` and copy the flat key to `settings.openai.apiKey`. This must be the first code change in the migration phase.

2. **Anthropic auth header and mandatory max_tokens** - Anthropic uses `x-api-key` header (not `Authorization: Bearer`), requires `anthropic-version: 2023-06-01` on every request, and `max_tokens` is a required field with no default. System prompt is a top-level `system` field, not a message in the `messages` array. Copy-pasting from the OpenAI adapter fails in three separate places.

3. **Gemini response shape is completely different from OpenAI** - Text is at `candidates[0].content.parts[0].text`, not `choices[0].message.content`. Truncation check is `candidates[0].finishReason === 'MAX_TOKENS'` (not `finish_reason === 'length'`). Known Gemini 2.5 bug: `MAX_TOKENS` can accompany an empty text candidate - guard explicitly. Empty `candidates` array means SAFETY block - throw a descriptive error rather than propagating `undefined`.

4. **Tag normalization inconsistency** - `getAllTags(cache)` returns inline tags with `#` prefix and frontmatter tags without. Code that compares raw tag strings silently misses half the vault's tagged notes. Canonical fix: strip `#` with `tag.replace(/^#/, '')` from both the returned values and user input before any comparison.

5. **MetadataCache is not ready at plugin load** - Both `getAllTags` and `resolvedLinks` are only reliable after `app.workspace.onLayoutReady()`. Collection triggered by user action (sidebar button click) is always safe. Never call MetadataCache APIs in `onload()`.

6. **Community store submission rejections** - Plugin ID cannot start with "obsidian-"; GitHub release tag must match `manifest.json` exactly with no `v` prefix; `main.js` must be minified (OK) but not obfuscated; README must exist with API key setup instructions. These are non-negotiable and have caused real submission stalls.

See `.planning/research/PITFALLS.md` for full pitfall list, "Looks Done But Isn't" checklist, and recovery strategies.

---

## Implications for Roadmap

Based on research, the build is well-understood with a clear dependency graph. Six phases are suggested.

### Phase 1: Settings Schema Migration and Provider Foundation

**Rationale:** Everything in v2.0 reads from `settings.provider` and per-provider config blocks. The settings schema must exist before any provider, collector, or UI work can be tested. The migration check (preserving the existing OpenAI key) has the highest recovery cost of any pitfall - ship it as the first commit in this phase.
**Delivers:** `LLMProvider = 'openai' | 'gemini' | 'anthropic'`; per-provider `ProviderConfig` shape in `ActiveRecallSettings`; updated `DEFAULT_SETTINGS`; settings UI with active provider dropdown showing conditional per-provider key and model fields; one-time migration from flat `apiKey` to `openai.apiKey`
**Addresses:** Provider selector table stakes, per-provider API key storage, per-provider model dropdowns
**Avoids:** Settings migration data loss pitfall (shallow-merge wipes existing user keys)

### Phase 2: Multi-Provider LLM Dispatch

**Rationale:** Provider adapters are independent of collection mode work and can be built in parallel with Phase 3 if working in separate branches. But `callLLM` signature must change before any generation method can be end-to-end tested. Extract OpenAI into its own adapter first to validate the interface shape, then add Gemini, then Anthropic.
**Delivers:** Centralized `callLLM(settings, { system, user })` dispatcher; `callOpenAI` extracted from v1.0 code; `callGemini` new; `callAnthropic` new; per-provider error classification updated for Gemini 400/403 and Claude 401 shapes
**Uses:** `requestUrl()` throughout; Gemini `x-goog-api-key` header; Anthropic `x-api-key` + `anthropic-version` + mandatory `max_tokens`; curated model arrays for all three providers
**Avoids:** Anthropic auth/max_tokens pitfall, Gemini response shape pitfall, per-provider dispatch scattered across multiple `GenerationService` methods

### Phase 3: Flexible Note Collection

**Rationale:** Tag, link, and single-note collectors are independent of provider work and independent of each other. All three produce `NoteSource[]` and plug into the existing unchanged pipeline. `writeOutputToPath` must be built here since all new modes use it - the existing `writeOutput()` hardcodes a folder path that doesn't apply to tag or link modes.
**Delivers:** `collectByTag` with `FuzzySuggestModal` tag picker; `collectByLinks` with BFS traversal and visited-set deduplication; `collectSingleNote`; `writeOutputToPath` output path helper; new `GenerationService` entry points (`generateForTag`, `generateForLinks`, `generateForNote`); single-note file context menu entry
**Implements:** Tag collector (getAllTags + normalization), link collector (resolvedLinks BFS), output path logic
**Avoids:** Tag normalization pitfall, MetadataCache timing pitfall, link traversal cycle/duplicate pitfall, tag output filename collision on case-insensitive filesystems (sanitize `#project/python` -> safe filename)

### Phase 4: Sidebar UI Redesign

**Rationale:** The sidebar must come after all `GenerationService` entry points exist because it delegates to them. The mode-switching structure (tabs) must be decided before implementation to avoid the sidebar complexity pitfall - bolting new sections onto the existing flat folder list creates an unmaintainable panel.
**Delivers:** Mode selector tabs (Folder / Tag / Links / Note); per-mode panel rendering with separate DOM subtrees; tag input, link root note picker, and single-note button wired to `GenerationService`; all new modes functional end-to-end
**Implements:** Sidebar mode architecture, per-mode render methods, mode state stored as instance variable
**Avoids:** Sidebar complexity pitfall, `renderPanel()` full-rebuild losing transient state (tag input text resets on vault events)

### Phase 5: Polish, UX, and Error Messages

**Rationale:** Error message polish, UX hardening, and security warnings should come after all functionality works - polish targets real behavior, not assumptions. These are additive layers that don't block functionality.
**Delivers:** Provider-aware user-friendly error messages for all three providers; generation progress indicator in sidebar during API call; overwrite confirmation modal; API key masking in settings (password input type); API key security warning (Git exposure notice); "Looks Done But Isn't" checklist verification
**Avoids:** Raw API errors surfaced to users, users clicking Generate multiple times during a slow API call

### Phase 6: Community Store Release

**Rationale:** Final compliance verification then open the PR. Doing this as a dedicated phase rather than tacking onto Phase 5 prevents rushing the checklist.
**Delivers:** Verified `manifest.json` (ID has no "obsidian-" prefix, no "v" in release tag, `isDesktopOnly` decision documented); updated README with multi-provider setup instructions; verified `main.js` is not obfuscated; PR opened against obsidianmd/obsidian-releases
**Avoids:** All store submission rejection causes from Pitfall 5

### Phase Ordering Rationale

- Settings schema must precede all other v2.0 work because every consumer reads from it
- Provider adapters (Phase 2) and collectors (Phase 3) are independent of each other - if working across branches these can proceed simultaneously after Phase 1 is merged
- Sidebar UI must come last because it depends on all `GenerationService` entry points existing
- Migration check must be the first concrete code change to minimize the window of data-loss risk
- `writeOutputToPath` is built in Phase 3 alongside the collectors that require it, not as a separate prep step
- Error polish is deferred to Phase 5 deliberately - the adapters throw structured `LLMError` objects from the start; user-facing message mapping is additive

### Research Flags

Phases with well-documented patterns (skip `/gsd:research-phase`):
- **Phase 1 (Settings migration):** `Object.assign` shallow-merge behavior is well-documented; Copilot's per-provider field pattern is the confirmed approach
- **Phase 3 (Collectors):** All APIs verified directly from `obsidian.d.ts`; BFS is standard; edge cases documented in PITFALLS.md
- **Phase 4 (Sidebar):** Official Views docs cover the pattern; design decision (tabs) is already made in ARCHITECTURE.md
- **Phase 5 (Polish):** Checklist-driven, not research-driven
- **Phase 6 (Release):** Checklist-driven; re-read current obsidianmd/obsidian-releases submission requirements immediately before opening the PR

Phases that benefit from a quick API verification at implementation time:
- **Phase 2 (Providers):** Verify Anthropic model IDs before hardcoding the curated list - Claude model naming changes frequently; the IDs in STACK.md are verified as of March 2026 but may have been updated. Re-check `platform.claude.com/docs/en/about-claude/models/overview` at implementation start.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core patterns (requestUrl, esbuild, TypeScript config) verified against official template and real plugin source. API signatures verified directly from installed `obsidian.d.ts`. No new packages needed. |
| Features | HIGH | v2.0 scope is clearly bounded. All three provider API mechanics verified against official docs March 2026. UX patterns verified against Obsidian Copilot's proven approach. |
| Architecture | HIGH | Based on direct codebase inspection of existing v1.0 source files plus official API docs. Build order is dependency-driven with no ambiguous sequencing. |
| Pitfalls | HIGH | Most findings verified via official docs or multiple community sources. Gemini MAX_TOKENS empty-body bug is MEDIUM (tracked GitHub issue, corroborated by developer forum). |

**Overall confidence:** HIGH

### Gaps to Address

- **Anthropic Claude model IDs at implementation time:** Model IDs in STACK.md (`claude-sonnet-4-6`, `claude-opus-4-6`, `claude-haiku-4-5-20251001`) are HIGH confidence as of March 2026 but Anthropic updates model names frequently. Verify against `platform.claude.com/docs/en/about-claude/models/overview` before hardcoding the curated list in Phase 2.
- **Settings migration scope for partial saves:** The migration check handles the common case (flat `apiKey` exists, nested `openai.apiKey` is empty). Confirm behavior when a user has a partial v2 settings file (e.g., they ran a dev build, partially configured, reverted) - the migration logic should handle this without overwriting a partially-entered key.
- **Sidebar transient state strategy:** PITFALLS.md flags that `renderPanel()` full-rebuild loses typed-but-unsubmitted tag input when a vault event triggers refresh. The decision to store mode-specific state as instance variables (rather than reading from DOM) should be confirmed explicitly before writing `renderTagPanel` in Phase 4.
- **`isDesktopOnly` decision for release:** The current manifest has `isDesktopOnly: true`. Phase 6 must include a concrete decision on whether to flip this to `false` (requires mobile testing) or keep `true` for the initial release and document it.

---

## Sources

### Primary (HIGH confidence)
- `/node_modules/obsidian/obsidian.d.ts` (installed) - getAllTags (line 2951), getFileCache (line 4046), resolvedLinks (line 4067), getFirstLinkpathDest (line 4040), getMarkdownFiles (line 6344)
- `https://github.com/obsidianmd/obsidian-sample-plugin` - official template; TypeScript, esbuild, eslint config
- `https://platform.claude.com/docs/en/api/messages` - Anthropic Messages API endpoint, headers, request/response structure
- `https://platform.claude.com/docs/en/about-claude/models/overview` - Claude model identifiers and context windows
- `https://ai.google.dev/api/generate-content` - Gemini generateContent endpoint, systemInstruction structure
- `https://ai.google.dev/gemini-api/docs/models` - Gemini model identifiers (March 2026)
- `https://docs.obsidian.md/Developer+policies` - submission requirements
- `https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins` - submission checklist
- `https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks` - official resolvedLinks reference
- `https://docs.obsidian.md/Reference/TypeScript+API/getAllTags` - official getAllTags reference
- Direct inspection of `src/generation.ts`, `src/settings.ts`, `src/sidebar.ts`, `src/main.ts`, `src/prompts.ts`

### Secondary (MEDIUM confidence)
- `https://deepwiki.com/logancyang/obsidian-copilot/3-llm-integration` - per-provider field pattern, ProviderSettingsKeyMap architecture
- `https://deepwiki.com/obsidianmd/obsidian-api/2.4-metadatacache-and-link-resolution` - resolvedLinks shape, tag collection patterns
- `https://forum.obsidian.md/t/efficiently-get-all-tags-through-the-api/38400` - canonical tag collection approach
- `https://github.com/google-gemini/gemini-cli/issues/2104` - Gemini MAX_TOKENS empty response bug
- `https://discuss.ai.google.dev/t/proposed-better-handling-of-max-tokens-finishreason/2772` - Gemini finishReason behavior
- `https://forum.obsidian.md/t/support-streaming-the-request-and-requesturl-response-body/87381` - streaming limitation confirmed March 2026
- `https://github.com/CtrlAltFocus/obsidian-plugin-auto-tag/blob/main/src/services/openai.api.ts` - real-world requestUrl + OpenAI pattern

### Tertiary (LOW confidence)
- `https://dev.to/ash_dubai/multi-provider-llm-orchestration-in-production-a-2026-guide-1g10` - general multi-provider pattern recommendations

---
*Research completed: 2026-03-21*
*Ready for roadmap: yes*
