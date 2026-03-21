# Architecture Research

**Domain:** Obsidian Community Plugin (TypeScript) - v2.0 Integration Architecture
**Researched:** 2026-03-21
**Confidence:** HIGH - based on direct codebase inspection, official Obsidian API docs, and verified Gemini/Anthropic API reference

---

## Context: What Already Exists

This is a subsequent-milestone document. The v1.0 plugin is fully built and working. The existing files are:

| File | What it does |
|------|-------------|
| `src/generation.ts` | `GenerationService`, `callLLM` (OpenAI hardcoded), `NoteSource` interface, batching logic, `writeOutput` |
| `src/settings.ts` | `ActiveRecallSettings`, `DEFAULT_SETTINGS`, `ActiveRecallSettingTab` (provider dropdown currently disabled) |
| `src/prompts.ts` | `SYSTEM_MESSAGE`, `batchTemplate`, `synthesisTemplate`, `render()`, conditional instruction builders |
| `src/sidebar.ts` | `ActiveRecallSidebarView`, `getFolderStatuses`, folder-based Generate/Regenerate UI |
| `src/main.ts` | Plugin entry point, wires commands, context menu, sidebar, status bar |

---

## System Overview (v2.0 Target State)

```
┌───────────────────────────────────────────────────────────────────────┐
│                          OBSIDIAN HOST APP                             │
│   Workspace  |  Vault (filesystem)  |  MetadataCache  |  Events        │
└───────────────────────────┬───────────────────────────────────────────┘
                            │ Plugin API (app.*)
┌───────────────────────────▼───────────────────────────────────────────┐
│                      main.ts (unchanged in v2)                         │
│   addCommand | registerView | registerEvent | addRibbonIcon            │
└───────┬───────────────┬────────────────────────────┬──────────────────┘
        │               │                            │
        ▼               ▼                            ▼
┌───────────┐  ┌─────────────────┐       ┌──────────────────────────────┐
│ settings  │  │   sidebar.ts    │       │      generation.ts            │
│ (MODIFIED)│  │   (MODIFIED)    │       │      (MODIFIED)               │
│           │  │                 │       │                               │
│ providers │  │ FolderMode      │       │ NoteSource interface          │
│  per-key  │  │ TagMode     ─ ─ ┤ calls │   (already abstracted)        │
│  per-model│  │ LinkMode        │──────>│                               │
│           │  │ SingleNoteMode  │       │ callLLM()                     │
└───────────┘  └─────────────────┘       │ (REPLACED with provider       │
                                         │  dispatch)                    │
                                         │                               │
                                         │ NEW: GeminiProvider           │
                                         │ NEW: AnthropicProvider        │
                                         │ RENAMED: OpenAIProvider       │
                                         └──────────────────────────────┘

NEW COLLECTORS (implement NoteSource via collection function):
  collectByTag(app, tag) → NoteSource[]
  collectByLinks(app, rootFile, depth) → NoteSource[]
  collectSingleNote(app, file) → NoteSource[]
  collectNoteFiles() → existing folder collector (unchanged)
```

---

## Component Responsibilities

| Component | v2 Status | Responsibility Change |
|-----------|-----------|----------------------|
| `main.ts` | Unchanged | No changes needed - sidebar and generation handle new modes |
| `settings.ts` | Modified | Add `gemini`/`anthropic` to `LLMProvider` type; add per-provider key + model fields; enable provider dropdown |
| `sidebar.ts` | Modified | Add collection mode selector (folder/tag/link/single); drive appropriate collector |
| `generation.ts` | Modified | Replace `callLLM()` with provider dispatch; extract `OpenAIProvider`; add `GeminiProvider` + `AnthropicProvider`; add new collector functions |
| `prompts.ts` | Unchanged | No changes needed - templates are provider-agnostic |

---

## Part 1: Multi-Provider Integration

### 1a. Settings Changes (settings.ts)

**What to change:**

```typescript
// BEFORE
export type LLMProvider = 'openai';

export interface ActiveRecallSettings {
    provider: LLMProvider;
    apiKey: string;
    model: string;
    // ...
}
```

```typescript
// AFTER
export type LLMProvider = 'openai' | 'gemini' | 'anthropic';

// Per-provider config block
export interface ProviderConfig {
    apiKey: string;
    model: string;
}

export interface ActiveRecallSettings {
    provider: LLMProvider;
    openai: ProviderConfig;
    gemini: ProviderConfig;
    anthropic: ProviderConfig;
    language: string;
    generateHints: boolean;
    generateReferenceAnswers: boolean;
    generateConceptMap: boolean;
    customInstructions: string;
}

export const DEFAULT_SETTINGS: ActiveRecallSettings = {
    provider: 'openai',
    openai: { apiKey: '', model: 'gpt-4.1-mini' },
    gemini: { apiKey: '', model: 'gemini-2.5-flash' },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6' },
    // ...
};
```

**Migration:** `loadSettings()` in main.ts already uses `Object.assign({}, DEFAULT_SETTINGS, ...)` so existing `data.json` with flat `apiKey`/`model` fields will be ignored (not merged into nested structure). The nested structure starts fresh. This is acceptable - users re-enter their key once. If migration is desired, add a one-time migration check in `loadSettings()`.

**Settings UI:** The provider dropdown (currently disabled with `setDisabled(true)`) becomes active. Switching provider shows the relevant API key input and model dropdown for that provider. Other providers' keys are hidden but persist in settings.

### 1b. Provider Dispatch in generation.ts

**What to change:**

The existing `callLLM(apiKey, model, messages)` is OpenAI-specific. Replace with a provider dispatch function that routes to the right implementation.

```typescript
// NEW structure in generation.ts

export interface LLMMessages {
    system: string;
    user: string;
}

// Entry point - dispatches based on provider setting
export async function callLLM(
    settings: ActiveRecallSettings,
    messages: LLMMessages
): Promise<string> {
    const cfg = settings[settings.provider]; // openai | gemini | anthropic config block
    switch (settings.provider) {
        case 'openai':     return callOpenAI(cfg.apiKey, cfg.model, messages);
        case 'gemini':     return callGemini(cfg.apiKey, cfg.model, messages);
        case 'anthropic':  return callAnthropic(cfg.apiKey, cfg.model, messages);
    }
}
```

**Note:** `callLLM` signature changes. All internal callers in `GenerationService.generate()` pass `this.settings` and the message pair. The existing `buildMessages()` helper (returns `Array<{role, content}>`) can be retired or adapted - Gemini and Anthropic have different message schemas.

**Impact on GenerationService:** Update three `callLLM(this.settings.apiKey, this.settings.model, messages)` callsites to `callLLM(this.settings, { system: SYSTEM_MESSAGE, user: userMessage })`.

### 1c. OpenAI Provider (generation.ts - minimal change)

Rename / extract the existing `callLLM` body into `callOpenAI`. The OpenAI format already works. The only structural change is accepting `LLMMessages` instead of the pre-built messages array:

```typescript
async function callOpenAI(apiKey: string, model: string, msgs: LLMMessages): Promise<string> {
    const messages = [
        { role: 'system', content: msgs.system },
        { role: 'user', content: msgs.user },
    ];
    // ... existing requestUrl() call unchanged ...
}
```

### 1d. Gemini Provider

**API:** `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
**Auth:** `x-goog-api-key` header
**Request body:**
```json
{
  "systemInstruction": { "parts": [{ "text": "..." }] },
  "contents": [{ "role": "user", "parts": [{ "text": "..." }] }]
}
```
**Response:** `response.json.candidates[0].content.parts[0].text`
**Finish check:** `candidates[0].finishReason === 'MAX_TOKENS'` (vs OpenAI's `finish_reason === 'length'`)

```typescript
async function callGemini(apiKey: string, model: string, msgs: LLMMessages): Promise<string> {
    const response = await requestUrl({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            systemInstruction: { parts: [{ text: msgs.system }] },
            contents: [{ role: 'user', parts: [{ text: msgs.user }] }],
        }),
        throw: false,
    });

    if (response.status !== 200) {
        throw new LLMError(response.status, response.json);
    }

    const text = response.json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error('Empty response from Gemini');

    if (response.json?.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
        new Notice('Warning: response may be truncated due to token limit.');
    }

    return text;
}
```

### 1e. Anthropic Provider

**API:** `POST https://api.anthropic.com/v1/messages`
**Auth:** `x-api-key` header + `anthropic-version: 2023-06-01` header
**Request body:** requires `max_tokens` (use 8192 as a reasonable cap matching model limits)
**Response:** `response.json.content[0].text`
**Finish check:** `stop_reason === 'max_tokens'`

```typescript
async function callAnthropic(apiKey: string, model: string, msgs: LLMMessages): Promise<string> {
    const response = await requestUrl({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            model,
            max_tokens: 8192,
            system: msgs.system,
            messages: [{ role: 'user', content: msgs.user }],
        }),
        throw: false,
    });

    if (response.status !== 200) {
        throw new LLMError(response.status, response.json);
    }

    const text = response.json?.content?.find((b: { type: string }) => b.type === 'text')?.text;
    if (!text) throw new Error('Empty response from Anthropic');

    if (response.json?.stop_reason === 'max_tokens') {
        new Notice('Warning: response may be truncated due to token limit.');
    }

    return text;
}
```

### 1f. Error Classification

`classifyError()` currently has an OpenAI-specific 500 message. Extend it to handle provider-agnostic status codes (401, 429, 400, 5xx) without mentioning OpenAI by name. The existing `LLMError` class is unchanged.

---

## Part 2: Flexible Collection Modes

### 2a. NoteSource Interface (unchanged - already correct)

The existing interface in `generation.ts` is exactly right:

```typescript
export interface NoteSource {
    name: string;    // basename without extension
    content: string; // full text content
}
```

All new collection modes produce `NoteSource[]`. The generation pipeline consumes `NoteSource[]` regardless of how it was collected. No interface changes needed.

### 2b. New Collector Functions (generation.ts additions)

Add three new collection functions alongside the existing `collectNoteFiles()`:

**Tag Collector:**
```typescript
export async function collectByTag(app: App, tag: string): Promise<NoteSource[]> {
    // Normalize tag - ensure leading # for comparison
    const normalizedTag = tag.startsWith('#') ? tag : `#${tag}`;
    const allFiles = app.vault.getMarkdownFiles();
    const matched: NoteSource[] = [];
    for (const file of allFiles) {
        const cache = app.metadataCache.getFileCache(file);
        const fileTags = cache?.tags?.map(t => t.tag) ?? [];
        // Also check frontmatter tags array
        const fmTags: string[] = (cache?.frontmatter?.tags ?? []).map((t: string) =>
            t.startsWith('#') ? t : `#${t}`
        );
        if ([...fileTags, ...fmTags].includes(normalizedTag)) {
            const content = await app.vault.read(file);
            matched.push({ name: file.basename, content });
        }
    }
    return matched;
}
```

**Linked Notes Collector:**
```typescript
export async function collectByLinks(
    app: App,
    rootFile: TFile,
    depth: 1 | 2 = 1
): Promise<NoteSource[]> {
    // BFS over outgoing links
    const collected = new Map<string, NoteSource>();
    const queue: Array<{ file: TFile; level: number }> = [{ file: rootFile, level: 0 }];
    const visited = new Set<string>([rootFile.path]);

    while (queue.length > 0) {
        const { file, level } = queue.shift()!;
        if (file.basename !== '_self-test') {
            const content = await app.vault.read(file);
            collected.set(file.path, { name: file.basename, content });
        }
        if (level < depth) {
            const cache = app.metadataCache.getFileCache(file);
            for (const link of (cache?.links ?? [])) {
                const resolved = app.metadataCache.getFirstLinkpathDest(link.link, file.path);
                if (resolved instanceof TFile && !visited.has(resolved.path)) {
                    visited.add(resolved.path);
                    queue.push({ file: resolved, level: level + 1 });
                }
            }
        }
    }
    return Array.from(collected.values());
}
```

**Single Note Collector:**
```typescript
export async function collectSingleNote(app: App, file: TFile): Promise<NoteSource[]> {
    const content = await app.vault.read(file);
    return [{ name: file.basename, content }];
}
```

### 2c. Output Path Logic

Folder mode writes to `folderPath/_self-test.md` (existing `writeOutput()`). Tag/link/single modes need a different output location. The output should go to a `_self-tests/` folder in the vault root (or user-configurable), with a filename derived from the tag or root note name.

Extend `writeOutput()` or add a new `writeOutputToPath(app, vaultRelPath, content)` that accepts a full relative path:

```typescript
export async function writeOutputToPath(app: App, vaultRelPath: string, content: string): Promise<void> {
    // Ensure parent folder exists
    const parts = vaultRelPath.split('/');
    parts.pop(); // remove filename
    const parentPath = parts.join('/');
    if (parentPath && !app.vault.getAbstractFileByPath(parentPath)) {
        await app.vault.createFolder(parentPath);
    }
    const existing = app.vault.getAbstractFileByPath(vaultRelPath);
    if (existing instanceof TFile) {
        await app.vault.modify(existing, content);
    } else {
        await app.vault.create(vaultRelPath, content);
    }
}
```

Tag mode output: `_self-tests/<tag-name>_self-test.md`
Link mode output: `_self-tests/<rootNote-name>_self-test.md`
Single note output: Same folder as the note, `<note-name>_self-test.md`

### 2d. GenerationService - Collection Mode Dispatch

The existing `generate(folderPath: string)` is the only entry point on `GenerationService`. Add overloaded or additional public methods to handle the new modes while keeping `generate()` unchanged for backward compatibility:

```typescript
export class GenerationService {
    // EXISTING - unchanged
    async generate(folderPath: string): Promise<void> { ... }

    // NEW - tag mode
    async generateForTag(tag: string): Promise<void> {
        const notes = await collectByTag(this.app, tag);
        await this.runPipeline(notes, `_self-tests/${tag.replace('#','')}_self-test.md`, tag);
    }

    // NEW - linked notes mode
    async generateForLinks(rootFile: TFile, depth: 1 | 2 = 1): Promise<void> {
        const notes = await collectByLinks(this.app, rootFile, depth);
        await this.runPipeline(notes, `_self-tests/${rootFile.basename}_self-test.md`, rootFile.basename);
    }

    // NEW - single note mode
    async generateForNote(file: TFile): Promise<void> {
        const notes = await collectSingleNote(this.app, file);
        const outputPath = `${file.parent?.path ?? ''}/${file.basename}_self-test.md`;
        await this.runPipeline(notes, outputPath, file.basename);
    }

    // EXTRACTED - shared pipeline (batch/synthesize/write)
    private async runPipeline(notes: NoteSource[], outputPath: string, label: string): Promise<void> {
        // Same logic as existing generate() body, but uses writeOutputToPath
    }
}
```

The existing `generate()` body becomes a call to `collectNoteFiles()` + `runPipeline()`.

### 2e. Sidebar UI Changes (sidebar.ts)

The sidebar currently shows folders only. For v2, it needs a mode selector and mode-specific UI.

**Approach:** Add a `collectionMode` state to the sidebar view. Render a tab row or segmented control at the top. Each mode renders a different list or input below.

```
┌────────────────────────────────┐
│ Active Recall                  │
│ [Folder] [Tag] [Links] [Note]  │  <- mode tabs
├────────────────────────────────┤
│ (mode-specific content area)   │
│                                │
│ Folder mode: existing list     │
│ Tag mode: tag input + Generate │
│ Link mode: note picker + depth │
│ Note mode: current note button │
└────────────────────────────────┘
```

The `renderPanel()` method splits into `renderFolderPanel()`, `renderTagPanel()`, `renderLinkPanel()`, `renderNotePanel()`. The mode is stored as an instance variable and persists until the view is closed.

The `generateForFolder()` method remains. Add `generateForTag()`, `generateForLinks()`, `generateForNote()` that delegate to `GenerationService` equivalents.

---

## Data Flow

### Folder Mode (unchanged)

```
Sidebar button / command / context menu
    -> GenerationService.generate(folderPath)
    -> collectNoteFiles(app, folderPath) -> TFile[]
    -> readNotes(app, files) -> NoteSource[]
    -> splitIntoBatches(notes) -> NoteSource[][]
    -> callLLM(settings, messages) [dispatches to provider]
    -> writeOutput(app, folderPath, content)
    -> sidebar.refresh()
```

### Tag Mode (new)

```
Sidebar tag input + Generate button
    -> GenerationService.generateForTag(tag)
    -> collectByTag(app, tag) -> NoteSource[]
    -> splitIntoBatches(notes) -> NoteSource[][]
    -> callLLM(settings, messages)
    -> writeOutputToPath(app, '_self-tests/{tag}_self-test.md', content)
```

### Linked Notes Mode (new)

```
Sidebar root note picker + depth selector + Generate button
    -> GenerationService.generateForLinks(rootFile, depth)
    -> collectByLinks(app, rootFile, depth) -> NoteSource[]
    -> splitIntoBatches(notes)
    -> callLLM(settings, messages)
    -> writeOutputToPath(app, '_self-tests/{rootNote}_self-test.md', content)
```

### Single Note Mode (new)

```
Sidebar "Generate for current note" button OR command palette
    -> GenerationService.generateForNote(activeFile)
    -> collectSingleNote(app, file) -> NoteSource[]
    -> callLLM(settings, messages) (single batch, no synthesis needed)
    -> writeOutputToPath(app, '{folder}/{note}_self-test.md', content)
```

### Provider Dispatch (new - inside callLLM)

```
callLLM(settings, { system, user })
    -> switch(settings.provider)
        'openai'     -> callOpenAI(cfg.apiKey, cfg.model, msgs)   -> requestUrl to api.openai.com
        'gemini'     -> callGemini(cfg.apiKey, cfg.model, msgs)   -> requestUrl to generativelanguage.googleapis.com
        'anthropic'  -> callAnthropic(cfg.apiKey, cfg.model, msgs) -> requestUrl to api.anthropic.com
```

---

## Suggested Build Order

The order is driven by three dependency chains that must be resolved before the UI or pipelines can work:

| Step | What to Build | Why This Order |
|------|--------------|----------------|
| 1 | **Settings schema migration** - update `ActiveRecallSettings` to per-provider config; update `DEFAULT_SETTINGS`; update settings UI to activate provider dropdown and show per-provider key/model | Everything else reads provider config from settings; do this first so callers have the right shape |
| 2 | **Provider dispatch in generation.ts** - change `callLLM` signature; extract `callOpenAI`; wire the switch statement | Unblocks Gemini and Anthropic without breaking existing tests; existing tests mock `callLLM` so update mocks here |
| 3 | **Gemini provider** - implement `callGemini`; add curated Gemini model list to settings UI; test with real API key | Independent from Anthropic; can validate end-to-end with one new provider before adding second |
| 4 | **Anthropic provider** - implement `callAnthropic`; add curated Claude model list; test | Follows same pattern as Gemini; straightforward once step 3 is verified |
| 5 | **Tag collector** - implement `collectByTag`; wire `generateForTag` on `GenerationService` | New collector, no dependencies on provider work; can be built in parallel with step 3-4 but must come before sidebar |
| 6 | **Link collector** - implement `collectByLinks`; wire `generateForLinks` | Depends on `MetadataCache` patterns; independent from tag collector |
| 7 | **Single note collector** - implement `collectSingleNote`; wire `generateForNote` | Trivial; do it alongside step 6 |
| 8 | **writeOutputToPath** - add output path helper; integrate into new `GenerationService` methods | Needed before any of the new modes can write output |
| 9 | **Sidebar UI** - add mode tabs; render mode-specific panels; wire to new `GenerationService` methods | Must come last; depends on all new `GenerationService` entry points existing |
| 10 | **Error message updates** - extend `classifyError` for Gemini/Anthropic error shapes; update provider-specific error text | Polish; done after all providers work |

**Parallel opportunities:**
- Steps 3 and 5 are independent (provider work vs. collector work) - can be done in either order or in parallel if working in separate branches.
- Steps 6 and 7 are independent of each other.
- Step 8 can be done before step 9 alongside any of steps 5-7.

---

## Integration Points

### Modified Files

| File | What Changes | What Stays the Same |
|------|-------------|---------------------|
| `settings.ts` | `LLMProvider` type, `ActiveRecallSettings` shape (nested provider configs), settings UI (active provider dropdown, per-provider key/model) | Output toggles, language, custom instructions, all non-provider settings |
| `generation.ts` | `callLLM` signature and implementation (provider dispatch), new collectors, `runPipeline` extraction, `writeOutputToPath` addition, new `GenerationService` public methods | `NoteSource` interface, `splitIntoBatches`, `buildBatchPrompt`, `buildSynthesisPrompt`, `buildMessages`, `LLMError`, `writeOutput`, `estimateTokens` |
| `sidebar.ts` | `renderPanel()` split into mode panels, mode state variable, new `generate*` delegating methods | `getFolderStatuses`, `getLastGeneratedDate`, `buildActivateView`, `buildContextMenuHandler`, `generatingFolders` Set pattern |

### Unchanged Files

| File | Reason |
|------|--------|
| `main.ts` | All wiring already in place; new modes are triggered from sidebar, not new commands |
| `prompts.ts` | Templates are provider-agnostic; system message and batch/synthesis templates work for all three providers |

### External API Integration

| Provider | Endpoint | Auth Header | Body Shape | Text Extraction |
|----------|----------|-------------|------------|-----------------|
| OpenAI | `https://api.openai.com/v1/chat/completions` | `Authorization: Bearer {key}` | `{ model, messages: [{role, content}] }` | `json.choices[0].message.content` |
| Gemini | `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent` | `x-goog-api-key: {key}` | `{ systemInstruction: {parts}, contents: [{role, parts}] }` | `json.candidates[0].content.parts[0].text` |
| Anthropic | `https://api.anthropic.com/v1/messages` | `x-api-key: {key}` + `anthropic-version: 2023-06-01` | `{ model, max_tokens, system, messages: [{role, content}] }` | `json.content.find(b => b.type==='text').text` |

All three use `requestUrl` from the Obsidian API (not native `fetch`) for CORS compliance on desktop and mobile.

### Internal Boundaries

| Boundary | Communication | v2 Change |
|----------|---------------|-----------|
| `GenerationService` -> `callLLM` | Function call | Signature changes: `(apiKey, model, messages[])` -> `(settings, {system, user})` |
| `sidebar.ts` -> `GenerationService` | Direct method call | Three new methods added; existing `generate()` unchanged |
| `settings.ts` -> all consumers | Reference to `plugin.settings` | Shape changes; all consumers updated to read `settings[settings.provider].apiKey` etc. |
| `generation.ts` -> `app.metadataCache` | New dependency | Tag and link collectors read `getFileCache()` and `getFirstLinkpathDest()` |

---

## Anti-Patterns to Avoid in v2

### Anti-Pattern 1: Per-Provider callLLM Functions Called Directly by GenerationService

**What people do:** Have `GenerationService` call `callOpenAI`, `callGemini`, `callAnthropic` directly with a switch statement inside `generate()`.

**Why it's wrong:** Duplicates the dispatch logic across `generate()`, `generateForTag()`, `generateForLinks()`, etc. Any new provider requires changes in multiple places.

**Do this instead:** One `callLLM(settings, messages)` dispatcher. All `GenerationService` methods call it. Adding a fourth provider means touching one switch statement and one provider config block in settings.

### Anti-Pattern 2: Storing API Keys in Per-Mode State

**What people do:** Each collection mode UI holds its own copy of the API key or provider selection.

**Why it's wrong:** Keys are already in settings. Reading from two places causes stale-state bugs.

**Do this instead:** All generation methods read provider config exclusively from `this.settings`. The sidebar never holds API key references.

### Anti-Pattern 3: Blocking Tag/Link Collection on MetadataCache Not Ready

**What people do:** Call `getFileCache()` immediately in `onload()` or trigger collection before the vault is indexed.

**Why it's wrong:** MetadataCache may not be populated immediately at startup. Collection triggered by user action (button click) is always safe because the vault is indexed by the time users can interact with the sidebar.

**Do this instead:** Trigger all collection from user-initiated actions only. If edge cases arise (e.g., freshly imported vault), check for null returns from `getFileCache()` and surface a user-facing message.

### Anti-Pattern 4: Changing the NoteSource Interface

**What people do:** Add mode-specific fields to `NoteSource` (e.g., `tag: string`, `sourceFile: TFile`).

**Why it's wrong:** The interface's value is its simplicity. The pipeline only cares about name and content. Mixing collection metadata into the pipeline object creates coupling.

**Do this instead:** Keep `NoteSource` as `{ name: string; content: string }`. Any mode-specific metadata (like which tag was queried) belongs in the `GenerationService` method's local scope for the output path/label computation only.

### Anti-Pattern 5: Rebuilding the Settings Shape Without a Migration Path

**What people do:** Change `ActiveRecallSettings` from flat to nested without handling `loadSettings()` for existing users.

**Why it's wrong:** Existing users have `{ apiKey: "sk-...", model: "gpt-4.1" }` in `data.json`. After migration, the nested `openai: { apiKey: '', model: '' }` defaults overwrite their stored values.

**Do this instead:** In `loadSettings()`, after `Object.assign`, check if the old flat `apiKey` field exists and copy it into `settings.openai.apiKey` if `settings.openai.apiKey` is empty. One-time migration, then drop the legacy field.

---

## Sources

- Direct inspection of `src/generation.ts`, `src/settings.ts`, `src/sidebar.ts`, `src/main.ts`, `src/prompts.ts` - HIGH confidence
- [Gemini API generateContent reference - Google AI for Developers](https://ai.google.dev/api/generate-content) - HIGH confidence
- [Anthropic Messages API reference](https://platform.claude.com/docs/en/api/messages) - HIGH confidence
- [MetadataCache and Link Resolution - DeepWiki obsidianmd/obsidian-api](https://deepwiki.com/obsidianmd/obsidian-api/2.4-metadatacache-and-link-resolution) - MEDIUM confidence (secondary source, consistent with official API)
- [MetadataCache resolvedLinks - Obsidian Developer Docs](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks) - HIGH confidence
- [How to get backlinks for a file - Obsidian Forum](https://forum.obsidian.md/t/how-to-get-backlinks-for-a-file/45314) - MEDIUM confidence (community source)

---
*Architecture research for: Obsidian Active Recall Plugin v2.0 - Multi-Provider & Flexible Collection*
*Researched: 2026-03-21*
