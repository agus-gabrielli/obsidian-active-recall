# Feature Research

**Domain:** Obsidian community plugin - active recall / self-testing from notes
**Researched:** 2026-03-21 (updated for v2.0 milestone)
**Confidence:** HIGH for API mechanics; MEDIUM for UX patterns (verified against real plugin source and official API docs)

---

## Scope Note (v2.0 Milestone)

v1.0 features (folder-based generation, OpenAI, sidebar, batch+synthesize, prompts.ts templates) are **already built**. This document focuses on what is **new in v2.0**:

1. Multi-provider LLM support (Gemini, Claude)
2. Generation by tag
3. Generation by linked notes (depth-1, optional depth-2)
4. Single-note generation
5. Final community store release

The v1.0 feature landscape (competitor analysis, table stakes that are already shipped) is preserved at the bottom for reference.

---

## V2.0 Feature Landscape

### Table Stakes for This Milestone (Users Expect These)

Features that feel broken or incomplete if absent from the v2.0 release.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Provider selector in settings with live API key + model fields | Any multi-provider AI plugin shows different config fields per provider; a single static API key field feels half-done | MEDIUM | Requires `display()` to re-render conditionally based on provider; existing `settings.ts` pattern already does this for the model dropdown |
| Per-provider model dropdowns with curated lists | Users don't know Gemini/Claude model IDs off-hand; a "gemini-2.5-flash" dropdown is expected | LOW | Static curated arrays per provider, same pattern as existing `CURATED_MODELS` for OpenAI |
| Each provider's API key stored separately | Switching providers must not erase the other key; users test both and compare | MEDIUM | Expand `ActiveRecallSettings` from one `apiKey: string` to `openAIApiKey`, `geminiApiKey`, `claudeApiKey` per-field; matches Obsidian Copilot's proven pattern |
| Tag picker modal when generating by tag | Users expect a fuzzy-search selector (like Obsidian's built-in quick-switcher feel) not a raw text input | MEDIUM | `FuzzySuggestModal` subclass; use `app.vault.getMarkdownFiles()` + `app.metadataCache.getAllTags(cache)` to build tag list |
| Output to `_self-tests/` folder for tag/link modes | Tag and link collections span multiple folders; the output cannot live inside one folder like folder-mode does | LOW | Flat folder `_self-tests/` at vault root or user-configurable path; file named after tag/root note |
| Single-note generation accessible from context menu | Right-clicking a file and not seeing a "Generate Self-Test" option feels missing once you have right-click on folders | LOW | Add `registerEvent` on file context menu alongside existing folder context menu handler |
| Error messages updated for each provider | "Invalid API key" makes sense for OpenAI; Gemini returns 400 with different error shapes | MEDIUM | Per-provider `classifyError` branches; Gemini uses `x-goog-api-key` 400/403; Claude uses `x-api-key` 401 |

### Differentiators for V2.0

Features that set this release apart from competitors that do multi-provider.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Gemini 2.5 Flash as default Gemini model | Flash is the best price/quality for this use case - generous free tier in AI Studio, fast, high context window | LOW | Model ID: `gemini-2.5-flash`; direct REST to `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` with `x-goog-api-key` header; no SDK needed |
| Claude claude-sonnet-4-5 as default Claude model | Sonnet is the correct middle ground for generation tasks; Haiku is too weak, Opus too expensive | LOW | Direct REST to `https://api.anthropic.com/v1/messages` with `x-api-key` + `anthropic-version: 2023-06-01` headers; no SDK |
| Tag-based collection across entire vault | Lets users study a concept that spans multiple folders (e.g., "#biochemistry" pulling notes from 4 folders) | MEDIUM | `app.vault.getMarkdownFiles()` iterate + `app.metadataCache.getAllTags(cache)?.includes('#tag')` filter; output to `_self-tests/tag-{tagname}.md` |
| Linked notes (MOC) collection | Lets users generate a test from a Map of Content note by following its outgoing wikilinks - mirrors how PKM users structure knowledge | MEDIUM | `app.metadataCache.resolvedLinks[file.path]` gives `{ "path/to/note.md": count }`; depth-2 requires one extra iteration; visit each destination path via `app.vault.getAbstractFileByPath` |
| No external SDK dependencies for any provider | Obsidian community review discourages large bundles; `requestUrl` handles all HTTP without adding `@google/genai` or `@anthropic-ai/sdk` to the bundle | LOW | Both Gemini and Claude native APIs are simple enough to call with raw `requestUrl`; proven pattern already used for OpenAI |
| Single-note generation with output beside the note | Covers exam-prep use case: "just test me on this one file I'm reviewing now" | LOW | Output path: `{note-basename}_self-test.md` in same folder as source note |

### Anti-Features for V2.0

Features that seem like natural extensions but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| OpenAI-compatible proxy for Gemini/Claude | "One adapter, all providers" - avoid duplicate HTTP code | Gemini's native API has different request/response shapes (no `choices`, uses `candidates`); forcing OpenAI compatibility loses native error handling and model-specific fields. Gemini DOES offer an OpenAI-compat endpoint but it has compliance issues (per developer forum reports) | Write a thin per-provider `callLLM` variant (or a provider adapter pattern) that normalizes to string output; keeps code readable without proxy coupling |
| Dynamic model discovery (fetch model list from API) | Users want to see new models immediately | Requires an authenticated API call on settings load; adds latency, error surface, and a "Refresh models" button UI; Copilot has this and it's a source of support issues | Maintain curated model arrays in code; update on plugin releases; add "Custom model..." escape hatch (already proven pattern in settings.ts) |
| Depth-3+ link traversal | "Include everything transitively linked" | Vault-wide traversal at depth-3 can pull in hundreds of notes, blowing token budgets silently and including unrelated notes; graph traversal complexity grows fast | Hard cap at depth-2; document the reasoning; let users create a focused MOC note if they need more scope |
| Recursive tag matching (subtags) | "#flashcards/physics" should match "#flashcards" queries | Obsidian tag hierarchy is a UX convention, not an API feature; subtag matching requires string-prefix logic and produces surprising results | Match exact tags only in v2.0; document that `#physics` and `#flashcards/physics` are distinct |
| Store all provider keys in one `apiKey` field with a prefix | Simpler settings schema | Impossible to tell which key belongs to which provider without parsing; error-prone; Obsidian Copilot's per-field pattern is the established convention | Per-provider fields (`openAIApiKey`, `geminiApiKey`, `claudeApiKey`) - simple, readable, easily extensible |

---

## Feature Dependencies (V2.0)

```
[Multi-provider settings schema]
    └──required by──> [Provider selector UI in settings tab]
    └──required by──> [callLLM routing logic]
                          └──calls──> [OpenAI callLLM (existing)]
                          └──calls──> [Gemini callLLM (new)]
                          └──calls──> [Claude callLLM (new)]

[NoteSource interface (existing)]
    └──required by──> [Folder collection (existing)]
    └──required by──> [Tag collection (new)]
                          └──depends on──> [MetadataCache.getAllTags]
                          └──depends on──> [FuzzySuggestModal for tag picker]
    └──required by──> [Linked notes collection (new)]
                          └──depends on──> [MetadataCache.resolvedLinks]
                          └──depends on──> [Root note picker modal]
    └──required by──> [Single note collection (new)]

[Tag collection / Linked notes collection]
    └──produces output──> [_self-tests/ folder]
                              └──conflicts with──> [existing writeOutput() path logic]
                              (writeOutput writes to folder/_self-test.md; new modes need a different path)

[Provider selector]
    └──enhances──> [Per-provider model dropdown]
    └──enhances──> [Per-provider API key field]
    └──triggers──> [settings.display() re-render]

[classifyError]
    └──must branch on──> [provider] to handle Gemini 400/403 and Claude 401 shapes
```

### Dependency Notes

- **Multi-provider settings schema is the first blocker:** Nothing else in v2.0 builds until `ActiveRecallSettings` has `geminiApiKey`, `claudeApiKey`, `geminiModel`, `claudeModel`, and the `LLMProvider` type is expanded to `'openai' | 'gemini' | 'claude'`.
- **`writeOutput()` needs a mode-aware variant:** Current function hardcodes `${folderPath}/_self-test.md`. Tag and link modes have no folder - they need `_self-tests/${tagName}.md` or `_self-tests/${rootNoteName}.md`. Refactor or overload rather than patch.
- **`FuzzySuggestModal` for tag picker is straightforward:** Extend the class, implement `getItems()` (return all unique tags from vault), `getItemText()` (return tag string), `onChooseSuggestion()` (trigger generation). No API surprises.
- **`resolvedLinks` for link collection is stable API:** Shape is `Record<string, Record<string, number>>` where outer key is source path and inner key is destination path. Depth-1 is a direct lookup; depth-2 is one more iteration over the depth-1 set.
- **No SDK dependencies keeps bundle clean:** Gemini and Claude both support raw HTTP. This avoids Obsidian review issues with large or unexpected bundled dependencies.

---

## MVP Definition for V2.0

### Ship With V2.0

The minimum to call this milestone done and release to the store.

- [ ] `LLMProvider` type expanded to `'openai' | 'gemini' | 'claude'`
- [ ] Settings: per-provider API key fields (openAI, Gemini, Claude) visible only when that provider is selected
- [ ] Settings: per-provider model dropdowns with curated lists + "Custom model..." escape hatch
- [ ] Gemini REST caller using `requestUrl` to `generativelanguage.googleapis.com`
- [ ] Claude REST caller using `requestUrl` to `api.anthropic.com/v1/messages`
- [ ] `callLLM` routed by provider (dispatch to correct caller)
- [ ] Error classification updated for Gemini and Claude HTTP error shapes
- [ ] Tag-based collection: `FuzzySuggestModal` tag picker + `getAllTags` vault scan + output to `_self-tests/`
- [ ] Linked notes collection: root note picker modal + `resolvedLinks` depth-1 traversal + optional depth-2 toggle + output to `_self-tests/`
- [ ] Single-note generation: file context menu entry + output to `{basename}_self-test.md` beside source
- [ ] All three new collection modes wired through existing `GenerationService` pipeline (batch+synthesize still applies)
- [ ] Community store release (manifest, README updated, PR opened against obsidianmd/obsidian-releases)

### Defer to V2.x

Features that are valuable but not required to ship.

- [ ] Content-change stale detection in sidebar (show "stale" when notes are newer than `_self-test.md`) - trigger: user feedback
- [ ] Depth-2 link traversal as a settings toggle rather than per-invocation - can ship depth-1 only first and add the toggle after
- [ ] `_self-tests/` output folder path as a user-configurable setting - default is fine for now

### Future (V3+)

- [ ] Spaced repetition scheduling - deferred; YAML frontmatter is pre-reserved
- [ ] Manual multi-note selection (exam-prep ad-hoc sets)
- [ ] Custom LLM endpoint / OpenRouter support

---

## Feature Prioritization Matrix (V2.0)

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Gemini provider support | HIGH | MEDIUM | P1 |
| Claude provider support | HIGH | MEDIUM | P1 |
| Per-provider settings UI | HIGH | MEDIUM | P1 |
| Tag-based collection | HIGH | MEDIUM | P1 |
| Linked notes collection | HIGH | MEDIUM | P1 |
| Single-note generation | MEDIUM | LOW | P1 |
| Updated error classification | HIGH | LOW | P1 (correctness) |
| `_self-tests/` output path refactor | HIGH | LOW | P1 (required by tag+link modes) |
| Depth-2 link traversal toggle | MEDIUM | LOW | P2 |
| Configurable `_self-tests/` folder path | LOW | LOW | P2 |
| Stale content detection in sidebar | MEDIUM | MEDIUM | P2 |

---

## Implementation Notes

### Provider Settings Pattern (Confirmed)

The established Obsidian Copilot pattern for per-provider API keys is a field per provider in the settings interface (`openAIApiKey`, `googleApiKey`, `anthropicApiKey`). This is the right call. The `display()` re-render pattern (already used in settings.ts for the model dropdown) is exactly how to conditionally show per-provider fields.

Concrete shape change needed:

```typescript
// Current (v1):
export type LLMProvider = 'openai';
export interface ActiveRecallSettings {
    provider: LLMProvider;
    apiKey: string;
    model: string;
    // ...
}

// V2.0 target:
export type LLMProvider = 'openai' | 'gemini' | 'claude';
export interface ActiveRecallSettings {
    provider: LLMProvider;
    openAIApiKey: string;
    geminiApiKey: string;
    claudeApiKey: string;
    openAIModel: string;
    geminiModel: string;
    claudeModel: string;
    // ... rest unchanged
}
```

Migration note: existing `apiKey` in saved `data.json` must be migrated to `openAIApiKey` on plugin load (one-time migration in `loadSettings`).

### Gemini REST Call (Confirmed)

Direct REST, no SDK. Endpoint pattern:

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
Header: x-goog-api-key: {key}
Body: { "contents": [{ "role": "user", "parts": [{ "text": "..." }] }],
        "systemInstruction": { "parts": [{ "text": "..." }] } }
Response: { "candidates": [{ "content": { "parts": [{ "text": "..." }] } }] }
```

Gemini does NOT use the same `messages` array shape as OpenAI. System message is a top-level `systemInstruction` field, not a message with `role: "system"`. This is a key difference from the existing `buildMessages()` helper.

Curated models to offer: `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite` (HIGH confidence - verified against Google AI for Developers docs March 2026).

### Claude REST Call (Confirmed)

Direct REST, no SDK. Endpoint:

```
POST https://api.anthropic.com/v1/messages
Headers: x-api-key: {key}, anthropic-version: 2023-06-01, content-type: application/json
Body: { "model": "...", "max_tokens": 8096,
        "system": "...",
        "messages": [{ "role": "user", "content": "..." }] }
Response: { "content": [{ "type": "text", "text": "..." }] }
```

Claude also separates the system message (top-level `system` field, not in `messages` array). `max_tokens` is required, not optional. `anthropic-version` header is required.

Curated models to offer: `claude-sonnet-4-5`, `claude-haiku-4-5`, `claude-opus-4-5` (MEDIUM confidence - verify exact IDs against Anthropic docs at implementation time; model names change frequently).

### Tag Collection API (Confirmed, Medium Confidence on Edge Cases)

```typescript
// Get all unique tags across vault
const allTags = new Set<string>();
for (const file of app.vault.getMarkdownFiles()) {
    const cache = app.metadataCache.getFileCache(file);
    const tags = app.metadataCache.getAllTags(cache);
    tags?.forEach(t => allTags.add(t));
}

// Get files matching a specific tag
const matchingFiles = app.vault.getMarkdownFiles().filter(file => {
    const cache = app.metadataCache.getFileCache(file);
    return app.metadataCache.getAllTags(cache)?.includes(targetTag) ?? false;
});
```

Known issue: there have been past reports of frontmatter tags not always updating the metadata cache immediately. Adding a `await app.metadataCache.resolveLinks()` or relying on the fact that the cache is ready by the time the user opens the picker (not on plugin init) mitigates this.

### Link Collection API (Confirmed)

```typescript
// Depth-1 outgoing links from a root file
const destinations = app.metadataCache.resolvedLinks[rootFile.path] ?? {};
// destinations shape: { "path/to/note.md": 1, "other/note.md": 2 }
const depth1Paths = Object.keys(destinations);

// Depth-2 (optional)
const depth2Paths = new Set<string>();
for (const d1Path of depth1Paths) {
    const d2Links = app.metadataCache.resolvedLinks[d1Path] ?? {};
    Object.keys(d2Links).forEach(p => depth2Paths.add(p));
}
// Union of depth1 and depth2, excluding root
```

`resolvedLinks` only contains forward links (outgoing from source). It is a documented, stable API. Getting backlinks requires iterating all files - not needed here.

---

## V1.0 Feature Landscape (Already Shipped - Reference Only)

### Competitor Landscape

| Plugin | Approach | Status | Gap |
|--------|----------|--------|-----|
| obsidian-spaced-repetition | Manual flashcard syntax + SM2/FSRS scheduling | Active, widely used | Requires manual card authoring; no AI generation |
| Quiz Generator (ECuiDev) | AI multi-type quiz from notes/folders, interactive UI | Stale (~500 days), 44/100 score | Abandoned; multiple choice; output lives in plugin UI, not portable |
| Flashcard Generator (chloedia) | AI Q&A per note, outputs to SR format | Low adoption | Single-note; flashcard format |
| Spaced Repetition AI (SRAI) | AI flashcard generation + FSRS | Active | Flashcard only; no open-ended questions |
| Smart Connections | Semantic search + chat over vault | Active, popular | Discovery tool, not recall tool |

**Gap this plugin fills:** No existing plugin generates open-ended, pedagogically ordered recall questions from a folder of notes as portable markdown. None produce a concept map. None output plain `.md` that survives plugin removal.

### V1.0 Anti-Features (Still Relevant)

| Feature | Why Avoid | What to Do Instead |
|---------|-----------|-------------------|
| Built-in spaced repetition scheduling | Doubles scope; obsidian-spaced-repetition already does this | YAML frontmatter pre-reserved for SR compatibility |
| Interactive quiz UI | 3x implementation cost; breaks portability | Collapsible callouts in plain markdown |
| Auto-regeneration on save | Silent API charges, rate limiting | User-controlled "Generate / Regenerate" button |
| Recursive folder scanning | Unpredictable scope; silent token blowouts | Non-recursive; document intentionally |
| Bundled API key / free tier | Violates Obsidian plugin review guidelines | User-provided API key (standard pattern) |

---

## Sources

- [Obsidian Copilot LLM Integration - DeepWiki](https://deepwiki.com/logancyang/obsidian-copilot/3-llm-integration) - per-provider field pattern, ProviderSettingsKeyMap architecture
- [Obsidian MetadataCache resolvedLinks - DeepWiki](https://deepwiki.com/obsidianmd/obsidian-api/2.4-metadatacache-and-link-resolution) - resolvedLinks shape, tag collection pattern
- [Obsidian Forum - MetadataCache getAllTags efficiency](https://forum.obsidian.md/t/efficiently-get-all-tags-through-the-api/38400) - canonical tag collection approach
- [Obsidian Forum - resolvedLinks backlinks](https://forum.obsidian.md/t/how-to-get-backlinks-for-a-file/45314) - forward vs backward link distinction
- [Obsidian Developer Docs - resolvedLinks](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks) - official API reference
- [Obsidian Developer Docs - Modals / SuggestModal](https://docs.obsidian.md/Plugins/User+interface/Modals) - FuzzySuggestModal pattern
- [Google AI for Developers - Gemini API models](https://ai.google.dev/gemini-api/docs/models) - curated model IDs (March 2026)
- [Google AI for Developers - Gemini REST API](https://ai.google.dev/api) - request/response shapes, systemInstruction field
- [Gemini OpenAI compatibility issue thread](https://discuss.ai.google.dev/t/endpoint-https-generativelanguage-googleapis-com-v1beta-openai-chat-completions-is-not-compliant-with-api-specs/127400) - why to use native Gemini API not the OpenAI compat endpoint
- [Anthropic TypeScript SDK README](https://github.com/anthropics/anthropic-sdk-typescript/blob/main/README.md) - Messages API shape, required headers
- [Simon Willison - Anthropic CORS support](https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access/) - direct browser/client HTTP confirmed
- [Obsidian Plugin Community Review requirements](https://github.com/obsidianmd/obsidian-releases/blob/master/plugin-review.md) - bundle size, dependency, credential policies
- [Obsidian Forum - dependency limits for community plugin submission](https://forum.obsidian.md/t/question-regarding-dependency-limits-and-bundle-size-for-community-plugin-submission/111972) - no-SDK preference context

---

*Feature research for: Obsidian Active Recall / Self-Test Plugin (v2.0 milestone)*
*Researched: 2026-03-21*
