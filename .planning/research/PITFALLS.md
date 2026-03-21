# Pitfalls Research

**Domain:** Obsidian community plugin with LLM API calls, sidebar view, community store submission
**Researched:** 2026-03-21 (v2.0 update - added multi-provider and flexible collection pitfalls)
**Confidence:** HIGH (most findings verified via official docs or multiple community sources)

---

## Critical Pitfalls

### Pitfall 1: Using `fetch()` or the OpenAI SDK's default HTTP client directly

**What goes wrong:**
Native `fetch()` calls are blocked by CORS on both desktop and mobile Obsidian (`app://obsidian.md` origin has no CORS exception). The openai npm SDK defaults to an Axios `xhr` adapter when it detects `XMLHttpRequest` in the environment (Electron/Chromium), which then fails to correctly serialize multipart or streaming request bodies. Plugins that rely on the SDK's default transport silently send malformed requests or crash on mobile.

**Why it happens:**
Developers familiar with Node.js assume `fetch` or the OpenAI SDK "just works" in Electron. Obsidian's runtime is a hybrid - it exposes browser globals like `XMLHttpRequest`, which fools the SDK into thinking it's in a pure browser context, but it lacks proper CORS exception handling.

**How to avoid:**
- Use Obsidian's `requestUrl()` API (imported from `obsidian`) for all HTTP calls. It bypasses CORS restrictions and works on both desktop and mobile.
- Do NOT import and instantiate `new OpenAI({ apiKey })` and call it directly. Instead, use `requestUrl()` to make raw POST calls to `https://api.openai.com/v1/chat/completions` with the API key in the `Authorization` header.
- This also avoids the entire OpenAI SDK bundling problem (crypto polyfills, Node-only modules, bundle size).

**Warning signs:**
- "Access to fetch at ... has been blocked by CORS policy" in the developer console
- SDK calls succeed on desktop but fail silently on mobile
- Bundle size unexpectedly large (the openai SDK + dependencies add hundreds of KB)
- esbuild warnings about `crypto`, `stream`, or `node:*` modules during build

**Phase to address:** Foundation / Core infrastructure phase (before any LLM integration work)

---

### Pitfall 2: Bundling the full openai npm SDK with esbuild platform="node"

**What goes wrong:**
Setting `platform: "node"` in esbuild (required for the openai SDK to resolve its Node-only dependencies like `crypto`) produces a bundle that works on desktop but **crashes on mobile** with `ReferenceError: require is not defined`. Node.js APIs and the Electron API are entirely absent from Obsidian mobile (iOS/Android), and any call into them causes the plugin to stop working.

**Why it happens:**
The sample plugin template ships with `platform: "browser"` by default. When developers add the openai SDK and see build errors about missing modules (`crypto`, `node:stream`), the natural fix is switching to `platform: "node"` - which fixes the build but breaks mobile.

**How to avoid:**
- Avoid importing the openai npm SDK altogether. Use `requestUrl()` to call the OpenAI REST API directly. The API is straightforward JSON over HTTPS - no SDK needed for chat completions.
- If you do need the SDK (e.g., for typed response objects), use the browser-compatible openai SDK build and configure esbuild with specific `external` entries for Node-only modules, understanding that those code paths cannot be used.
- Keep esbuild `platform: "browser"` (the default from the sample template). Do not switch to `platform: "node"`.

**Warning signs:**
- `npm run build` prints warnings about `crypto`, `node:stream`, or `node:buffer` not being resolvable
- You added `platform: "node"` to `esbuild.config.mjs` to suppress those warnings
- Plugin works on your Mac but crashes on a phone with a cryptic JS error

**Phase to address:** Foundation phase, during build system setup and first LLM integration

---

### Pitfall 3: Storing the API key in `data.json` without warning users about sync exposure

**What goes wrong:**
Obsidian settings are saved to `.obsidian/plugins/<plugin-id>/data.json` as plain-text JSON. Many users sync their vault via Git (obsidian-git plugin) or cloud sync. If a user commits `.obsidian/plugins/` to a public - or even private - GitHub repo, the API key is in the commit history permanently, even after deletion.

**Why it happens:**
`data.json` is the standard plugin settings store. There is no built-in mechanism to exclude specific fields from it, and most developers don't think to warn users about this. Obsidian v1.11.0 introduced a native Secret Storage API (OS Keychain), but it is new and not yet universally used by plugins.

**How to avoid:**
- Add a visible warning in the plugin settings tab: "Your API key is stored in `.obsidian/plugins/active-recall/data.json`. If you sync your vault with Git, add this file to `.gitignore`."
- Consider using `this.app.saveSecretStorage()` (Obsidian v1.11.0+ Secret Storage API) as the storage backend for the API key, falling back to `data.json` on older versions. This uses the OS keychain (macOS Keychain, Windows Credential Manager).
- Never log the API key to the console, even in dev/debug mode.
- With v2.0 multi-provider support, there are now multiple API keys (one per provider). Each must be treated with the same care.

**Warning signs:**
- Settings tab has an API key field with no security notice
- Plugin tests on a vault that has `.obsidian/` committed to Git
- `console.log(this.settings)` anywhere in the code

**Phase to address:** Settings / Plugin configuration phase (also: multi-provider settings phase for v2.0)

---

### Pitfall 4: Not cleaning up the sidebar view on plugin unload (duplicate leaf / ghost pane)

**What goes wrong:**
If the plugin registers an `ItemView` but doesn't detach it on `onunload()`, disabling and re-enabling the plugin leaves orphaned pane instances. After reload, calling the "Open Active Recall Panel" command opens a second pane. Users end up with duplicate sidebar panels that can't be closed normally.

**Why it happens:**
The official docs show `onClose()` with "Nothing to clean up" in the example comment, which suggests cleanup is optional. In reality, the view registration persists across plugin reload, but the leaf does not get removed automatically.

**How to avoid:**
- In `onunload()`, explicitly detach all leaves of the plugin's view type:
  ```typescript
  this.app.workspace.detachLeavesOfType(VIEW_TYPE_ACTIVE_RECALL);
  ```
- In the command that opens the view, check for an existing leaf before creating a new one:
  ```typescript
  const existing = this.app.workspace.getLeavesOfType(VIEW_TYPE_ACTIVE_RECALL);
  if (existing.length > 0) {
    this.app.workspace.revealLeaf(existing[0]);
    return;
  }
  ```
- Open the view only after `app.workspace.onLayoutReady()` to avoid race conditions on startup.

**Warning signs:**
- Disabling then re-enabling the plugin creates a second sidebar pane
- The sidebar pane appears before the workspace is fully loaded (flicker or blank state)
- `getLeavesOfType` returns more than one result at runtime

**Phase to address:** Sidebar view / UI phase

---

### Pitfall 5: Community store submission rejected for policy violations

**What goes wrong:**
The Obsidian review team will reject or stall a PR for policy violations that are not obvious from the sample plugin template. Common rejection triggers include: plugin ID starting with "obsidian-", obfuscated `main.js`, downloading external code at runtime, hardcoded credentials, no README, missing `isDesktopOnly: true` when mobile is not tested, or `manifest.json` version not exactly matching the release tag (e.g., tag `v1.0.0` vs manifest `1.0.0` - the `v` prefix causes a mismatch).

**Why it happens:**
Developers focus on functionality and miss the policy details. The full developer policy list is at `docs.obsidian.md/Developer+policies` and is not summarized in the sample plugin template.

**How to avoid:**
- Plugin ID: use `active-recall` not `obsidian-active-recall`. IDs cannot contain the word "obsidian".
- Release tag: use `1.0.0`, not `v1.0.0`. The tag must match `manifest.json` version exactly.
- `main.js` must be human-readable source (minification is OK, obfuscation is not).
- Set `isDesktopOnly: false` only if you have actually tested on mobile. If untested, set to `true` initially.
- README must describe purpose, installation, and how to obtain/use an API key.
- Do not bundle any API keys. The plugin must require users to supply their own.
- Do not fetch or execute remote code after installation.
- Attribution: if you borrowed any code from other plugins, the LICENSE and README must credit it.

**Warning signs:**
- Plugin ID in `manifest.json` begins with "obsidian-"
- GitHub release tag starts with "v" (e.g., `v1.0.0`)
- No README.md in the repository root
- `isDesktopOnly` not explicitly set in `manifest.json`
- PR is stale for 45 days (auto-closed by bot)

**Phase to address:** Pre-submission / release phase; also set up manifest.json correctly in the foundation phase to avoid renaming later

---

### Pitfall 6: Concatenating all note content into a single prompt without token budget enforcement

**What goes wrong:**
For small folders (3-5 short notes) the plugin works fine. For larger folders or notes with verbose content, the combined text exceeds the model's context window. The API returns an error (or silently truncates depending on the model), and the generated self-test is incomplete or the call fails entirely. This is especially bad for the "batch + synthesize" path - if batching logic isn't actually triggered, a folder with 50 notes hits the API with 80,000+ tokens.

**Why it happens:**
Developers test with their own small set of notes. The token budget check is implemented but the heuristic (`chars / 4`) is applied incorrectly - e.g., applied after building the full prompt string instead of before, or the system prompt + few-shot examples are not counted against the budget.

**How to avoid:**
- Count tokens (using the `chars / 4` heuristic) before building the prompt, not after.
- Reserve budget for: system prompt + instructions (~500-1000 tokens) + desired output (~2000-4000 tokens) + safety margin. Only use the remainder for note content.
- The batch threshold should be computed before any API call. Log a notice to the Obsidian console when batching is triggered so it's testable.
- Test with a folder of 30+ dense notes before releasing.
- Cap individual note content if a single note is itself very large (e.g., >10,000 chars), and surface a warning to the user.

**Warning signs:**
- Plugin only tested with 1-3 short notes
- Token counting happens after concatenation
- No unit test or manual test for the "large folder" path
- API error messages about `context_length_exceeded` appearing in the console

**Phase to address:** LLM integration / generation pipeline phase

---

### Pitfall 7: Anthropic API requires a different authentication header and a mandatory max_tokens parameter

**What goes wrong:**
The existing `callLLM()` function authenticates with `Authorization: Bearer <key>`. Anthropic's native API requires `x-api-key: <key>` instead. Sending a Bearer token to `api.anthropic.com` returns a 401. Additionally, Anthropic's Messages API requires `max_tokens` as a mandatory request parameter - omitting it causes a 400 error. OpenAI defaults to its model's maximum if the field is absent, so code ported from the OpenAI path silently drops this field and breaks against Claude.

A second difference: the Anthropic API takes `system` as a separate top-level string field, not as a message in the `messages` array. Code that passes `{ role: "system", content: "..." }` inside the messages array will have the system prompt stripped or mis-routed.

**Why it happens:**
The existing provider abstraction (`callLLM`) was written to match OpenAI's format exactly. A naive port that only changes the URL and key will fail in at least three spots: the auth header name, the absent `max_tokens`, and the system message placement.

**How to avoid:**
- Implement a per-provider adapter: each adapter is responsible for constructing the correct request body shape and headers for its API.
- OpenAI adapter: `Authorization: Bearer`, system message as first element in `messages` array, `max_tokens` optional.
- Anthropic adapter: `x-api-key`, `anthropic-version: 2023-06-01` header required, `system` as a separate top-level field, `max_tokens` required (set a sensible default, e.g., 4096).
- Define a shared `ProviderAdapter` interface so the generation pipeline calls `adapter.complete(messages, settings)` and never touches provider-specific format.

**Warning signs:**
- 401 errors when calling `api.anthropic.com` despite a valid API key
- 400 errors from Anthropic with "max_tokens is required"
- Claude responses that ignore system instructions (system prompt accidentally passed in messages array)
- A single `callLLM` function with provider-specific `if/else` blocks growing unboundedly

**Phase to address:** Multi-provider LLM abstraction phase

---

### Pitfall 8: Gemini's finish reason and response extraction differ from OpenAI's shape

**What goes wrong:**
The current `callLLM()` extracts the response text as `response.json?.choices?.[0]?.message?.content` and checks `finish_reason === 'length'` for truncation. The Gemini native API (`generativelanguage.googleapis.com`) uses a completely different response shape: `candidates[0].content.parts[0].text` for the text, and `candidates[0].finishReason` (values: `"STOP"`, `"MAX_TOKENS"`, `"SAFETY"`, etc.) for truncation. Parsing the OpenAI path blindly against Gemini's response always yields `undefined`.

Additionally, Gemini 2.5+ thinking models have a confirmed bug where a `MAX_TOKENS` finish reason can accompany an empty response body - the text candidate is missing. The plugin must guard against this.

**Why it happens:**
OpenAI's format has become a de-facto standard, and developers assume parity. Gemini does offer an OpenAI-compatible endpoint (`/v1beta/openai/`), but using the native `generativelanguage.googleapis.com` endpoint (which is what the PROJECT.md specifies) means the response shape is Gemini's own.

**How to avoid:**
- Each provider adapter handles its own response parsing. The shared interface returns a plain `string` (the generated text). The adapter absorbs all provider-specific response shape differences internally.
- For Gemini: extract from `candidates[0].content.parts[0].text`. Check `candidates[0].finishReason === 'MAX_TOKENS'` and surface the same truncation notice as for OpenAI.
- Guard against empty `candidates` array (SAFETY block) and empty `parts` (MAX_TOKENS bug) - throw a descriptive `LLMError` rather than propagating `undefined`.
- System instructions in Gemini's native API are passed in `systemInstruction: { parts: [{ text: "..." }] }`, not in the `contents` array.

**Warning signs:**
- Generation succeeds (200 response) but the output file is empty or `undefined` appears in the markdown
- No truncation warning shown even when Gemini hits token limit
- Gemini SAFETY blocks silently produce no output (user sees empty file, no notice)
- System instructions being ignored (wrong field name)

**Phase to address:** Multi-provider LLM abstraction phase

---

### Pitfall 9: Settings migration breaks existing users when adding per-provider config

**What goes wrong:**
The current settings shape has a single flat `apiKey: string` and `model: string`. V2.0 needs per-provider API keys and model selections. The naive approach - restructuring to `providers: { openai: { apiKey, model }, gemini: { apiKey, model }, ... }` - silently loses existing users' `apiKey` and `model` values on first load after update, because `Object.assign({}, DEFAULT_SETTINGS, await this.loadData())` performs a **shallow merge**. Nested objects in `DEFAULT_SETTINGS` are replaced wholesale, not merged field-by-field.

Existing users who have already configured their OpenAI key will find the field blank after updating to v2.0. This is a silent data loss that triggers support reports.

**Why it happens:**
The standard Obsidian pattern `Object.assign({}, DEFAULT_SETTINGS, savedData)` works correctly for flat settings objects. The moment any setting becomes a nested object (e.g., `providers.openai`), the saved data replaces the default sub-object entirely - new nested fields in `DEFAULT_SETTINGS` won't be populated if the saved data has the parent key at all.

**How to avoid:**
- Keep v1.0 fields (`apiKey`, `model`) in the flat settings shape but mark them as the OpenAI key/model. Add new parallel flat fields: `geminiApiKey`, `claudeApiKey`, `geminiModel`, `claudeModel`. No nesting required - flat settings always shallow-merge safely.
- Alternatively, perform an explicit migration in `loadSettings()`: after loading, check if `savedData.apiKey` exists and `savedData.providers` does not, then copy the value across.
- Add a `settingsVersion` integer to `DEFAULT_SETTINGS`. Increment it each time the shape changes. In `loadSettings()`, detect version mismatches and run the appropriate migration.

**Warning signs:**
- Settings shape changed from flat to nested between versions
- `Object.assign` is the only merge strategy in `loadSettings()`
- No `settingsVersion` field in `DEFAULT_SETTINGS`
- Manual testing only done against a fresh install (not an upgrade from a previous version's `data.json`)

**Phase to address:** Multi-provider settings phase (must be solved before any settings UI work begins)

---

### Pitfall 10: Obsidian tag normalization inconsistency between frontmatter and inline tags

**What goes wrong:**
Users write tags in two forms: `#tag` inline in note body, or as `tags: [tag, tag2]` in YAML frontmatter (without the `#`). Obsidian's `getAllTags(cache)` utility function from the `obsidian` package normalizes both forms - it returns inline tags with the `#` prefix (`#tag`) but frontmatter tags without the `#` (just `tag`). Code that checks `tag === userInput` against a value the user typed (with or without `#`) will miss matches.

Additionally, `getAllTags()` can return `null` if the file has not been indexed by MetadataCache yet. Calling it on a freshly-created or modified file without waiting for the `metadataCache.on('changed')` event yields null or stale results.

**Why it happens:**
The inconsistency is a known quirk of Obsidian's tag handling. The `getAllTags()` API signature advertises `string[] | null`, but developers assume it always returns an array. Tag collection logic written without normalizing the `#` prefix produces silent misses when users mix frontmatter and inline tag styles.

**How to avoid:**
- Normalize all tags to a canonical form before comparison. Strip the leading `#` from any tag value before matching: `tag.replace(/^#/, '')`.
- User input for tag-based collection should also be normalized the same way (strip `#` if present).
- Never call `getAllTags()` or `app.metadataCache.getFileCache()` inside `onload()` directly. Wait for `app.workspace.onLayoutReady()` before doing any tag or link lookups - the MetadataCache may not have finished indexing the vault at plugin load time.
- Guard against the `null` return: `const tags = getAllTags(cache) ?? []`.

**Warning signs:**
- Tag-based collection silently returns zero notes despite matching notes existing
- Works correctly for notes with inline tags, fails for notes using frontmatter tags (or vice versa)
- Tag collection called in `onload()` before `onLayoutReady()`
- No null check on `getAllTags()` return value

**Phase to address:** Flexible note collection phase

---

### Pitfall 11: Link-based collection uses resolvedLinks but ignores MetadataCache timing and alias links

**What goes wrong:**
`app.metadataCache.resolvedLinks` maps source file paths to their outgoing resolved link targets. Using it to collect "all notes linked from a root note" is straightforward but has two failure modes: (1) the cache is not populated until after `onLayoutReady()`, so running collection logic too early gives an empty map; (2) Obsidian aliases (`[[Note|Alias]]`) are tracked in `unresolvedLinks` first and may not appear in `resolvedLinks` until the cache resolves them. Notes linked via `[[Alias]]` where the alias is defined in a different note's frontmatter are silently skipped.

A third failure mode: the depth-2 traversal (follow links from all depth-1 notes) can cycle back to the root note or previously-visited notes, producing duplicate note content sent to the LLM.

**Why it happens:**
`resolvedLinks` looks like a complete adjacency map, and for most notes it is. The alias edge case is non-obvious. Cycle detection is skipped because small test vaults rarely have cycles.

**How to avoid:**
- Always gate link collection behind `app.workspace.onLayoutReady()` or the `metadataCache.on('resolved')` event.
- Use a `Set<string>` of visited file paths during traversal to prevent cycles and duplicates.
- For alias resolution, use `app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath)` rather than reading `resolvedLinks` keys directly - this correctly handles aliases and case-insensitive matching.
- Log a `Notice` if the root note has zero resolved links, since this is the most common "why isn't it working" scenario.

**Warning signs:**
- Collection works when triggered from command palette (after vault is loaded) but returns no notes when triggered from `onload()` or a startup event
- Notes linked via aliases are not included in results
- Depth-2 traversal produces duplicate notes in the LLM context
- Root note is included in its own link collection output

**Phase to address:** Flexible note collection phase

---

### Pitfall 12: Sidebar grows unmanageable as collection modes multiply without structural redesign

**What goes wrong:**
The current sidebar shows a flat list of folders. Adding three new collection modes (tag, linked notes, single note) without redesigning the sidebar structure produces a panel where the folder list, tag input fields, link collection pickers, and single-note context all coexist in a single scrollable column. Each mode needs different controls (folder picker vs. tag input vs. note selector), and rendering them all together creates a cluttered, confusing UI that is hard to maintain.

A related failure: the sidebar's `renderPanel()` method rebuilds the entire DOM on every `refresh()` call. As more collection modes are added, this full-rebuild approach causes flicker and loses any transient UI state (partially-typed tag input, expanded sections, etc.).

**Why it happens:**
The v1.0 sidebar was designed around a single concept: folders. Extending it by bolting on new sections for each collection mode without defining a clear structure leads to an accordion of special cases.

**How to avoid:**
- Add a mode selector to the sidebar top (e.g., tabs or a dropdown: "By Folder", "By Tag", "By Links", "Single Note"). Only render the controls and list relevant to the active mode.
- Separate the sidebar rendering into per-mode components. Each mode owns its own DOM subtree.
- For the `renderPanel()` rebuild problem: if transient state needs to persist across refreshes, store it in the view class rather than inferring it from DOM inspection.
- Decide early whether the sidebar shows all modes simultaneously (tabs) or one at a time (dropdown/toggle). Commit to this before building any new mode's UI.

**Warning signs:**
- `renderPanel()` contains provider-or-mode-specific `if/else` blocks rather than calling per-mode render methods
- A "Folders" section, a "Tags" section, and a "Linked Notes" section all appear simultaneously in the panel
- Typing a tag name into the filter resets when a vault event triggers `refresh()`

**Phase to address:** Flexible note collection phase (UI design decisions must precede implementation)

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Import openai SDK directly instead of raw `requestUrl()` calls | TypeScript types, less boilerplate | Large bundle, mobile breakage, CORS issues, crypto polyfill debt | Never - use `requestUrl()` from the start |
| Store API key in `data.json` without warning | Zero extra code | User key exposure via Git sync | Only if you add a clear warning in the settings UI |
| Skip `detachLeavesOfType` in `onunload` | Slightly simpler unload code | Duplicate sidebar panes on plugin reload | Never - takes 1 line |
| Hardcode the note-reading as non-abstract (no `NoteSource` interface) | Faster to write | Refactor required when adding tag/graph collection modes in v2 | Never - interface is defined in PROJECT.md as an active requirement |
| Skip mobile testing before submission | Faster to release | Submission rejected or users on iOS/Android file bug reports immediately | Only if `isDesktopOnly: true` is set in manifest |
| Use `vault.read()` instead of `vault.cachedRead()` for display-only reads | Simpler mental model | Unnecessary disk I/O; can cause stale-write if file is mutated between read and write | Use `read()` only when you intend to write back; use `cachedRead()` otherwise |
| Single `callLLM()` function with if/else branches per provider | Fast to prototype | Grows to 200+ lines; error classification, header construction, response parsing all entangled per-provider; impossible to test in isolation | Never for more than one provider |
| Flat settings with all provider API keys at top level | Avoids shallow merge pitfall | Settings interface gets long with 3+ providers; harder to add a 4th | Acceptable for 2-3 providers; restructure if adding more |
| Emit output to `_self-tests/` folder by tag name without collision checks | Simple path construction | Two tags that differ only in case (`#Python` vs `#python`) produce the same output path on case-insensitive filesystems (macOS) | Never - normalize tag to a safe filename first |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI Chat Completions API | Using the openai npm SDK which brings Node-only dependencies into the bundle | Use `requestUrl()` to POST JSON directly to `https://api.openai.com/v1/chat/completions` |
| OpenAI API key | Storing raw in `data.json` with no user warning | Warn in settings UI; optionally use Obsidian's Secret Storage API (v1.11.0+) |
| Anthropic Messages API | Sending `Authorization: Bearer` instead of `x-api-key`; omitting `max_tokens`; putting system prompt in messages array | Use `x-api-key` header; always include `max_tokens`; use top-level `system` field |
| Anthropic Messages API | Missing `anthropic-version` header | Include `anthropic-version: 2023-06-01` header in every request |
| Gemini native API | Reading `choices[0].message.content` (OpenAI shape) | Read `candidates[0].content.parts[0].text`; check for empty candidates (SAFETY block) |
| Gemini native API | Using `finish_reason === 'length'` to detect truncation | Check `candidates[0].finishReason === 'MAX_TOKENS'`; guard against empty text on MAX_TOKENS (known Gemini bug) |
| Gemini native API | Placing system prompt in contents array | Use `systemInstruction: { parts: [{ text: "..." }] }` as separate top-level field |
| Streaming responses | Using `response.body` stream | The `requestUrl()` API does not support streaming responses; use non-streaming completions |
| Vault file reads | `app.vault.read()` on every generation triggers full disk read | Use `app.vault.cachedRead()` when not writing back; use `app.vault.read()` only when overwriting |
| Sidebar view activation | Opening the view before workspace layout is ready | Wrap activation in `app.workspace.onLayoutReady()` |
| Event listeners | Using `app.vault.on(...)` directly and forgetting to unregister | Always use `this.registerEvent(app.vault.on(...))` so Obsidian auto-cleans on unload |
| MetadataCache tag/link queries | Calling `getAllTags()` or reading `resolvedLinks` in `onload()` | Wait for `app.workspace.onLayoutReady()`; always null-check `getAllTags()` return |
| Tag normalization | Comparing raw tag strings without stripping `#` | Normalize all tags with `tag.replace(/^#/, '')` before any comparison |
| Link resolution | Using `resolvedLinks` keys directly for alias links | Use `app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath)` to handle aliases correctly |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading all vault `.md` files in `onload()` | Slow Obsidian startup; reviewers flag it in performance tests | Defer file scanning to `onLayoutReady()` or to the moment the user triggers generation | Any vault with 500+ files |
| `await Promise.all(files.map(f => vault.read(f)))` with no concurrency limit | Spikes disk I/O; degrades on mobile with slow storage | Use sequential reads or limit concurrency (e.g., 5 at a time) for large file sets | Folders with 50+ files on mobile |
| Re-scanning the vault to build the sidebar folder list on every workspace change event | UI jitter; high CPU on large vaults | Debounce the scan; only re-scan on `vault.on('create' / 'delete' / 'rename')` events that affect `.md` files | Vaults with active editing in another pane |
| Sending the full note content to the LLM without truncating very large individual notes | API timeout or error for notes over ~40k chars | Cap individual note input at a configurable char limit (default ~8000 chars); warn the user | Single note > 10,000 words |
| Depth-2 link traversal with no visited-set deduplication | Exponential blowup in highly-connected vaults (MOCs linking to MOCs); LLM context filled with duplicate notes | Collect links into a `Set<string>`; process each file path at most once regardless of depth | Vaults with >20 interlinked notes at depth 2 |
| Tag-based collection on a vault-wide tag that appears in hundreds of notes | Generation takes minutes; context window exceeded; user gets no feedback during wait | Compute total estimated token count before calling the LLM; show count to user with a confirmation if it exceeds a threshold (e.g., 50 notes) | Tag shared by 30+ notes in a large vault |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key stored in `data.json` with no user guidance about Git exposure | Key leaked in public or private repo commit history | Display warning in settings UI; consider using the v1.11.0+ Secret Storage API |
| Logging `this.settings` to console during development and shipping the debug log | API key appears in Obsidian developer console, visible to anyone who opens it | Remove all `console.log(this.settings)` calls before release; use a debug flag that strips key fields |
| Shipping `main.js` with obfuscated or minified-to-unreadability code | Submission rejected by Obsidian review team; users cannot audit the plugin | Minification is acceptable; obfuscation (variable renaming to gibberish, string encoding) is prohibited |
| Calling a remote endpoint that is not the user's chosen LLM provider | Violation of developer policy (no unauthorized data collection) | Only make outbound calls to the user-configured API endpoint; no telemetry, analytics, or crash reporting without explicit opt-in |
| Multiple provider API keys all stored in same flat `data.json` field without per-field warnings | Same Git exposure risk, now multiplied by number of providers | Treat each provider key field with the same warning; consider Secret Storage API for all key fields |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing no progress feedback during LLM generation (which can take 10-30s) | Users click Generate multiple times thinking it failed; end up with race conditions | Show a spinner or status notice in the sidebar panel while the API call is in progress; disable the Generate button |
| Silently overwriting `_self-test.md` with no confirmation or undo | User loses a carefully annotated self-test by clicking Regenerate accidentally | Show a modal "Regenerate will overwrite your existing self-test. Continue?" before overwriting an existing file |
| Surfacing raw API error messages to the user | Error like "insufficient_quota" or "context_length_exceeded" is confusing; Anthropic and Gemini error shapes differ from OpenAI's | Map known error codes per provider to user-friendly messages; the `classifyError` function must be provider-aware |
| API key field in settings showing the key in plain text | Key visible to anyone looking at the screen | Use an `<input type="password">` equivalent in the settings UI (standard pattern in other Obsidian AI plugins) |
| Setting `isDesktopOnly: false` without testing on mobile | Mobile users install the plugin and get crashes or blank panels | Either test on mobile before setting `isDesktopOnly: false`, or default to `true` for v1 and document it |
| Provider selector appearing greyed out / disabled when it shouldn't be | Users who want to switch providers can't tell if the feature is available; the v1.0 settings tab deliberately disables the provider dropdown as a placeholder | Remove the disabled placeholder once v2.0 providers are implemented; do not ship a functional settings tab with permanently-disabled controls |
| Tag collection output path (`_self-tests/<tag>.md`) using raw tag string | Tags with slashes (`#project/python`) create unexpected subdirectories; special characters create invalid filenames on Windows | Sanitize tag string to a safe filename: replace `/` with `-`, strip characters not valid in filenames |

---

## "Looks Done But Isn't" Checklist

- [ ] **Sidebar view:** Check that disabling and re-enabling the plugin does not create a duplicate pane - verify `detachLeavesOfType` is called in `onunload()`
- [ ] **LLM integration:** Test with a folder of 20+ dense notes (not just 2-3 short ones) - verify token budget logic actually batches
- [ ] **Mobile compatibility:** Load the plugin on iOS or Android (or use `Platform.isMobileApp` check in tests) - verify no `require is not defined` errors
- [ ] **API key security:** Open the plugin's `data.json` file directly - verify the key is stored and a warning is visible in settings UI
- [ ] **Community submission:** Confirm GitHub release tag matches `manifest.json` version exactly (no `v` prefix), plugin ID does not start with "obsidian-", and README exists
- [ ] **Regeneration flow:** Manually test clicking "Regenerate" on a folder that already has `_self-test.md` - verify the file is overwritten and no orphaned content remains
- [ ] **Event cleanup:** Run `app.workspace.trigger('css-change')` after disabling the plugin - verify no console errors about calling methods on unregistered components
- [ ] **Error states:** Deliberately use an invalid API key - verify the error is caught and a readable message is shown (not a raw exception)
- [ ] **Anthropic adapter:** Test with a valid Anthropic key - verify 200 response and correct text extraction from `content[0].text`
- [ ] **Gemini adapter:** Test with a valid Gemini key - verify 200 response and correct text extraction from `candidates[0].content.parts[0].text`
- [ ] **Error header:** Test Anthropic with a Bearer token instead of the raw key - verify a user-friendly 401 message (not `undefined`)
- [ ] **Settings migration:** Create a `data.json` file with the v1.0 shape (flat `apiKey` + `model`), install the v2.0 build, and confirm the OpenAI key is preserved
- [ ] **Tag collection:** Test against a note with only frontmatter tags (no `#` inline), and a note with only inline `#tags` - confirm both are matched
- [ ] **Tag collection - empty result:** Test with a tag that no notes have - confirm a user-friendly notice is shown (not silent empty output)
- [ ] **Link collection - alias:** Test with a root note that links to a note via its alias - confirm the target note is collected
- [ ] **Link collection - cycle:** Create a vault where note A links to B and B links back to A - confirm depth-2 collection does not produce duplicates
- [ ] **Tag filename safety:** Use a hierarchical tag (`#project/python`) for tag-based generation - confirm the output path doesn't create an unintended subdirectory

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Shipped with openai SDK breaking mobile | HIGH | Replace SDK calls with raw `requestUrl()` calls; rebuild and re-release; announce breaking change in README |
| API key stored without warning and a user exposes theirs | LOW (for developer) | Add warning notice in next release; rotate nothing (user must rotate their own key) |
| Community submission rejected for plugin ID starting with "obsidian-" | MEDIUM | Rename plugin ID in `manifest.json`, `community-plugins.json` PR, and all internal references; re-submit |
| Duplicate sidebar panes due to missing `detachLeavesOfType` | LOW | Add one line to `onunload()`; patch release |
| Token budget not enforced, causing API errors on large folders | MEDIUM | Implement batching gate before API call; add user-facing notice; patch release |
| Release tag mismatch (`v1.0.0` vs `1.0.0` in manifest) | LOW | Delete and re-create the GitHub release with the correct tag; update PR |
| Settings migration wipes existing OpenAI key after v2.0 update | HIGH | Ship a hotfix that reads the old flat key and copies it to the new field; publish immediately; acknowledge in release notes |
| Anthropic/Gemini provider uses wrong auth header and silently returns 401 | LOW | Fix auth header in adapter; patch release; add integration test that checks header shape |
| Tag collection misses all frontmatter tags due to `#` normalization bug | MEDIUM | Fix normalization with `replace(/^#/, '')`; add regression test; patch release |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| `fetch()` / OpenAI SDK CORS + mobile crash | Foundation - build system and HTTP layer setup | Build succeeds with `platform: "browser"`; make a test API call from mobile |
| openai SDK bundling with `platform: "node"` | Foundation - esbuild configuration | Inspect `main.js` for `require(` calls; test on Android/iOS |
| API key in `data.json` without security warning | Settings / configuration phase | Open `data.json` after entering a key; confirm warning text in settings UI |
| Missing view cleanup in `onunload` | Sidebar view / UI phase | Disable and re-enable plugin; confirm no duplicate panes |
| Community store submission rejections | Pre-release / distribution phase | Run through the official submission checklist before opening the PR |
| Token budget not enforced | LLM integration / generation pipeline phase | Test with 20+ dense notes; confirm batching activates |
| No progress feedback during generation | UI / UX polish phase | Time a real API call; confirm UI is not frozen |
| Startup performance from vault scanning | Foundation - plugin lifecycle phase | Enable Obsidian plugin startup timing; confirm `onload` is fast |
| Anthropic auth header + max_tokens + system field | Multi-provider LLM abstraction phase | Integration test: valid key returns 200 with correct text; invalid key returns user-friendly message |
| Gemini response shape + finishReason + system instruction | Multi-provider LLM abstraction phase | Integration test: valid key returns 200; MAX_TOKENS case surfaces truncation notice |
| Settings migration breaking existing users | Multi-provider settings phase (first task) | Upgrade test: copy v1.0 `data.json`, install v2.0, confirm OpenAI key preserved |
| Tag normalization inconsistency | Flexible note collection phase | Unit test: collection with frontmatter-only tags matches same as inline tags |
| MetadataCache timing for tag/link queries | Flexible note collection phase | Test collection trigger immediately on plugin load; confirm no empty results due to cache not ready |
| Link traversal cycles and alias resolution | Flexible note collection phase | Test vault with cycles and alias links; confirm deduplication and alias inclusion |
| Sidebar complexity growth | Flexible note collection phase (UI design step) | Design review before implementation: confirm mode-switching pattern agreed on |
| Tag output filename collisions | Flexible note collection phase | Test with `#project/python` tag; confirm safe output path |

---

## Sources

- [Obsidian Developer Policies - docs.obsidian.md](https://docs.obsidian.md/Developer+policies) - HIGH confidence (official)
- [Plugin Submission Requirements - docs.obsidian.md](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) - HIGH confidence (official)
- [Mobile Development - docs.obsidian.md](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development) - HIGH confidence (official)
- [Views - docs.obsidian.md](https://docs.obsidian.md/Plugins/User+interface/Views) - HIGH confidence (official)
- [Events - docs.obsidian.md](https://docs.obsidian.md/Plugins/Events) - HIGH confidence (official)
- [MetadataCache - docs.obsidian.md](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache) - HIGH confidence (official)
- [resolvedLinks - docs.obsidian.md](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/resolvedLinks) - HIGH confidence (official)
- [unresolvedLinks - docs.obsidian.md](https://docs.obsidian.md/Reference/TypeScript+API/MetadataCache/unresolvedLinks) - HIGH confidence (official)
- [getAllTags - docs.obsidian.md](https://docs.obsidian.md/Reference/TypeScript+API/getAllTags) - HIGH confidence (official)
- [Anthropic Messages API - docs.anthropic.com](https://docs.anthropic.com/en/api/messages) - HIGH confidence (official)
- [Anthropic API Errors - docs.anthropic.com](https://docs.anthropic.com/en/api/errors) - HIGH confidence (official)
- [OpenAI SDK compatibility for Claude - docs.claude.com](https://docs.claude.com/en/api/openai-sdk) - HIGH confidence (official, notes system message and max_tokens differences)
- [Gemini OpenAI compatibility - ai.google.dev](https://ai.google.dev/gemini-api/docs/openai) - HIGH confidence (official, confirms native API differs from OpenAI compat layer)
- [Gemini MAX_TOKENS empty response bug - google-gemini/gemini-cli #2104](https://github.com/google-gemini/gemini-cli/issues/2104) - MEDIUM confidence (tracked bug report)
- [Gemini finishReason MAX_TOKENS discussion - Google AI Developers Forum](https://discuss.ai.google.dev/t/proposed-better-handling-of-max-tokens-finishreason/2772) - MEDIUM confidence (community, corroborated by issue tracker)
- [MetadataCache and Link Resolution - deepwiki.com/obsidianmd](https://deepwiki.com/obsidianmd/obsidian-api/2.4-metadatacache-and-link-resolution) - MEDIUM confidence (community analysis of official API)
- [getAllTags empty array issue - Obsidian Forum](https://forum.obsidian.md/t/why-does-getalltags-return-an-empty-array/35886) - MEDIUM confidence (community, corroborated by official null signature)
- [Tags format in frontmatter - Obsidian Forum](https://forum.obsidian.md/t/tags-format-in-frontmatter/84432) - MEDIUM confidence (community, illustrates frontmatter vs inline tag differences)
- [Make HTTP requests from plugins - Obsidian Forum](https://forum.obsidian.md/t/make-http-requests-from-plugins/15461) - HIGH confidence (corroborated by official `requestUrl` docs)
- [Plugin Submission Guide - deepwiki.com/obsidianmd/obsidian-releases](https://deepwiki.com/obsidianmd/obsidian-releases/6.1-plugin-submission-guide) - MEDIUM confidence (community analysis of official repo)
- [Multi-provider LLM orchestration guide - DEV Community 2026](https://dev.to/ash_dubai/multi-provider-llm-orchestration-in-production-a-2026-guide-1g10) - LOW confidence (community article, pattern recommendations only)

---
*Pitfalls research for: Obsidian Active Recall Plugin - v2.0 multi-provider LLM and flexible note collection*
*Researched: 2026-03-21*
