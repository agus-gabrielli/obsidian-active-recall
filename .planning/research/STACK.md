# Stack Research

**Domain:** Obsidian Community Plugin (TypeScript + LLM integration)
**Researched:** 2026-03-09 (base stack), 2026-03-21 (v2 additions: multi-provider + collection modes)
**Confidence:** HIGH (core stack), MEDIUM (tooling patterns), HIGH (requestUrl/OpenAI pattern)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| TypeScript | ^5.8.3 | Plugin source language | Required by the ecosystem; official sample plugin pins this version. Strict mode catches runtime bugs that would otherwise only surface inside Obsidian. |
| Obsidian API | latest | Plugin host framework | The only first-class API for interacting with the vault, UI, and settings. Provided at runtime by Obsidian - never bundled. |
| esbuild | 0.25.5 | Bundler | Official template pins this version. Produces a single `main.js` in CJS format targeting ES2018 - exactly what Obsidian expects. Dramatically faster than webpack/rollup for watch mode. |
| Node.js | 18+ LTS | Dev runtime | Required for npm toolchain. Obsidian desktop runs on Electron (not bare Node), but the dev environment uses Node for builds. CI should test on 20.x and 22.x. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| tslib | 2.4.0 | TypeScript helper utilities | Always - reduces code duplication when `importHelpers: true` is set in tsconfig. Already in the boilerplate. |
| @types/node | ^16.11.6 | Node.js type definitions | Always - needed for build scripts and any Node builtins referenced in dev tooling. |
| obsidian-typings | 5.1.0 | Type definitions for undocumented Obsidian internals | Only if you need to access internal Obsidian APIs beyond the public surface. NOT needed for this plugin - avoid it unless a specific internal API is required. Using it means relying on reverse-engineered types that can break on any Obsidian update. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| eslint (flat config) | Linting | The boilerplate already uses `typescript-eslint` 8.35.1 with flat config (`eslint.config.mts`). This is the 2025 standard - do not use legacy `.eslintrc`. |
| eslint-plugin-obsidianmd | 0.1.9 | Obsidian-specific lint rules | Already in boilerplate. Catches Obsidian API misuse (e.g., not cleaning up listeners in `onunload()`). |
| pjeby/hot-reload | latest (installed as Obsidian plugin) | Auto-reload plugin in dev vault | Not an npm package - installed as an Obsidian plugin in the test vault. Watches for `main.js` changes and re-enables the plugin automatically. Requires a `.hotreload` file in the plugin directory OR a `.git` directory. This is the standard dev loop. |
| version-bump.mjs | (in repo) | Semantic version management | Already in boilerplate. Bumps version in both `manifest.json` and `versions.json` atomically. Required for community plugin store releases. |

---

## New in v2: No New npm Dependencies

All v2 LLM providers (Gemini, Claude) use the same `requestUrl()` pattern already validated in v1. Zero new npm packages needed. The Obsidian tag/link APIs are part of the existing `obsidian` type package already installed.

**Do not add:**
- `@google/generative-ai` npm SDK - bundles Node internals, breaks mobile, same reasons as OpenAI SDK
- `@anthropic-ai/sdk` npm SDK - same problem
- Any other HTTP client library

---

## OpenAI API via requestUrl() (v1, validated)

This is the most important section. The plugin MUST use `requestUrl()` from the Obsidian API for all HTTP calls - not the OpenAI npm SDK, not `node-fetch`, not native `fetch`.

### Why requestUrl(), not the OpenAI SDK

- The OpenAI npm SDK pulls in Node.js-specific modules (`node:stream`, `node:http`, etc.) that Obsidian's Electron environment does not expose in the renderer process. Bundling it causes runtime failures on desktop and guaranteed failures on mobile.
- `requestUrl()` bypasses CORS - critical for calling `api.openai.com` from within Obsidian (the browser-like renderer enforces CORS; `requestUrl()` routes through Electron's main process, which does not).
- Mobile (iOS/Android) has no access to Node modules at all. `requestUrl()` is the only cross-platform HTTP option.
- The OpenAI REST API is stable and simple enough that a thin wrapper around `requestUrl()` is 30 lines of code vs. pulling in a 500kb SDK.

### requestUrl() Signature (HIGH confidence - verified from official API and real plugin source)

```typescript
import { requestUrl, RequestUrlParam, RequestUrlResponse } from 'obsidian';

const response: RequestUrlResponse = await requestUrl({
  url: 'https://api.openai.com/v1/chat/completions',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    temperature: 0.7,
    max_tokens: 4096,
  }),
});

// response.json is auto-parsed if Content-Type is application/json
const data = response.json;
const content = data.choices[0].message.content;
```

**Key `RequestUrlParam` fields:**
- `url` (string, required)
- `method` (string, default `'GET'`)
- `headers` (Record<string, string>)
- `body` (string | ArrayBuffer, optional) - always `JSON.stringify()` for JSON payloads
- `throw` (boolean, default `true`) - if `false`, 4xx/5xx won't throw; check `response.status` manually

**Key `RequestUrlResponse` fields:**
- `status` (number) - HTTP status code
- `json` (any) - parsed JSON body (auto-parsed when Content-Type is application/json)
- `text` (string) - raw response body
- `headers` (Record<string, string>)

### Streaming Limitation (MEDIUM confidence - forum discussions, no official resolution)

`requestUrl()` does NOT support streaming (SSE / `ReadableStream`). As of March 2026, this remains an open feature request with no official implementation timeline from the Obsidian team.

**For this plugin:** This is acceptable. Non-streaming (`stream: false`) completions are sufficient for generating a full `_self-test.md` in one shot. The response will appear all at once after the API call resolves. Do not attempt to add streaming - it would require falling back to native `fetch` which breaks mobile.

### Error Handling Pattern

```typescript
try {
  const response = await requestUrl({
    url: 'https://api.openai.com/v1/chat/completions',
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    throw: false, // handle errors manually
  });

  if (response.status !== 200) {
    const err = response.json?.error?.message ?? `HTTP ${response.status}`;
    throw new Error(`OpenAI API error: ${err}`);
  }

  return response.json.choices[0].message.content;
} catch (e) {
  // Network failure - no response
  throw new Error(`Network error calling OpenAI: ${e.message}`);
}
```

---

## New in v2: Anthropic Claude API via requestUrl()

**Confidence: HIGH - verified from official Anthropic docs (platform.claude.com/docs/en/api/messages) and model list (platform.claude.com/docs/en/about-claude/models/overview), March 2026.**

### Endpoint and Auth

```
POST https://api.anthropic.com/v1/messages
```

Authentication uses a dedicated header (not `Authorization: Bearer`):

```
x-api-key: {apiKey}
anthropic-version: 2023-06-01
content-type: application/json
```

The `anthropic-version` header is required on every request. `2023-06-01` is the current stable value as of March 2026.

### Request Body

The Anthropic API uses a different message structure than OpenAI. The system prompt is a top-level field, not a message in the array. `max_tokens` is required (no default).

```typescript
const response = await requestUrl({
  url: 'https://api.anthropic.com/v1/messages',
  method: 'POST',
  headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,           // top-level, not in messages array
    messages: [
      { role: 'user', content: userPrompt },
    ],
  }),
  throw: false,
});
```

### Response Structure

```typescript
// Successful response (status 200)
const text = response.json.content[0].text;

// Truncation detection - equivalent of OpenAI's finish_reason === 'length'
if (response.json.stop_reason === 'max_tokens') {
  new Notice('Warning: response may be truncated due to token limit.');
}
```

Full response shape:
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [{ "type": "text", "text": "..." }],
  "model": "claude-sonnet-4-6",
  "stop_reason": "end_turn",
  "usage": { "input_tokens": 10, "output_tokens": 20 }
}
```

`stop_reason` values: `"end_turn"` (normal), `"max_tokens"` (truncated), `"stop_sequence"`.

### Error Response Structure

```json
{ "type": "error", "error": { "type": "authentication_error", "message": "..." } }
```

Status codes: 401 = invalid API key, 429 = rate limit, 400 = bad request, 5xx = server error.

### Current Claude Models (March 2026 - HIGH confidence, verified from official docs)

| API Identifier | Alias | Context Window | Best For |
|---|---|---|---|
| `claude-opus-4-6` | `claude-opus-4-6` | 1M tokens | Most capable, complex tasks |
| `claude-sonnet-4-6` | `claude-sonnet-4-6` | 1M tokens | Best balance - recommended default |
| `claude-haiku-4-5-20251001` | `claude-haiku-4-5` | 200k tokens | Fast, cost-efficient |

**Recommendation:** Default to `claude-sonnet-4-6`. It is the best cost/capability balance and has a 1M context window that far exceeds the plugin's ~122k-char input budget.

**Note:** `claude-3-haiku-20240307` is deprecated and retiring April 19, 2026. Do not include it in the curated model list.

---

## New in v2: Google Gemini API via requestUrl()

**Confidence: HIGH - verified from official Google AI developer docs (ai.google.dev/api/generate-content and ai.google.dev/gemini-api/docs/models), March 2026.**

### Endpoint and Auth

```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
```

Replace `{model}` with the model identifier, e.g., `gemini-2.5-flash`.

Authentication uses a dedicated header (NOT a query parameter - query params expose the key in logs):

```
x-goog-api-key: {apiKey}
Content-Type: application/json
```

Google docs recommend the `x-goog-api-key` header over the `?key=` query parameter because query params appear in server logs, browser history, and error messages. Use the header.

### Request Body

The Gemini API uses a different structure. The system prompt goes in `system_instruction`, and the user messages go in `contents` as nested `parts` arrays. There is no `role` on the single-turn user content (it defaults to "user").

```typescript
const response = await requestUrl({
  url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
  method: 'POST',
  headers: {
    'x-goog-api-key': apiKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        parts: [{ text: userPrompt }],
      },
    ],
    generationConfig: {
      maxOutputTokens: 8192,
    },
  }),
  throw: false,
});
```

### Response Structure

```typescript
// Successful response (status 200)
const text = response.json.candidates[0].content.parts[0].text;

// Truncation detection - Gemini uses finishReason === 'MAX_TOKENS'
if (response.json.candidates[0].finishReason === 'MAX_TOKENS') {
  new Notice('Warning: response may be truncated due to token limit.');
}
```

Full response shape:
```json
{
  "candidates": [
    {
      "content": {
        "parts": [{ "text": "..." }],
        "role": "model"
      },
      "finishReason": "STOP",
      "safetyRatings": [...]
    }
  ],
  "usageMetadata": {
    "promptTokenCount": 10,
    "candidatesTokenCount": 20,
    "totalTokenCount": 30
  }
}
```

`finishReason` values: `"STOP"` (normal), `"MAX_TOKENS"` (truncated), `"SAFETY"`, `"RECITATION"`, `"OTHER"`.

### Error Response Structure

Gemini errors return a JSON body with `error.code`, `error.message`, and `error.status`:

```json
{ "error": { "code": 429, "message": "...", "status": "RESOURCE_EXHAUSTED" } }
```

Status codes: 400 = bad request (`INVALID_ARGUMENT`), 401/403 = invalid API key, 429 = rate limit (`RESOURCE_EXHAUSTED`), 5xx = server error.

Note: Gemini returns 403 (not 401) for invalid API keys in some cases. Check for both.

### Current Gemini Models (March 2026 - HIGH confidence, verified from official docs)

| API Identifier | Best For |
|---|---|
| `gemini-2.5-flash` | Best price/performance - recommended default |
| `gemini-2.5-pro` | Most capable, complex reasoning |
| `gemini-2.5-flash-lite` | Fastest, cheapest |

**Recommendation:** Default to `gemini-2.5-flash`. It is the official price-performance recommendation and sufficient for self-test generation.

**Curated model list for settings dropdown:** `gemini-2.5-flash`, `gemini-2.5-pro`, `gemini-2.5-flash-lite` plus "Custom model..." option. Do not include Gemini 3 previews - they are not stable production models as of March 2026.

---

## New in v2: Provider Abstraction Pattern

The `callLLM()` function in `generation.ts` is currently OpenAI-specific. The correct v2 pattern is a provider interface, not a monolithic function with conditionals:

```typescript
// Provider interface - each provider implements this
interface LLMProvider {
  call(apiKey: string, model: string, systemPrompt: string, userPrompt: string): Promise<string>;
}

// generation.ts uses the interface, not a concrete provider
// Provider is selected at call site based on settings.provider
```

This allows `classifyError()` to also become provider-specific without a cascade of if-provider checks.

---

## New in v2: Obsidian APIs for Note Collection Modes

**Confidence: HIGH - verified directly from the installed `obsidian` package type definitions at `node_modules/obsidian/obsidian.d.ts`.**

All APIs below are part of the public, stable Obsidian API surface (available in v1.0+). No external packages needed.

### app.vault.getMarkdownFiles()

Returns all markdown files in the vault as a flat array. Use this as the starting point for tag-based and single-note collection.

```typescript
// Signature (verified from obsidian.d.ts line 6344)
app.vault.getMarkdownFiles(): TFile[]

// Pattern for tag collection
const allFiles = app.vault.getMarkdownFiles();
const tagged = allFiles.filter(file => {
  const cache = app.metadataCache.getFileCache(file);
  if (!cache) return false;
  const tags = getAllTags(cache); // returns string[] | null
  return tags?.includes('#your-tag') ?? false;
});
```

### getAllTags(cache)

Top-level function exported from `obsidian`. Combines frontmatter tags and inline `#tag` occurrences into a single array. This is the correct way to get all tags for a file - do NOT manually parse `cache.tags` and `cache.frontmatter.tags` separately.

```typescript
// Signature (verified from obsidian.d.ts line 2951)
// "Combines all tags from frontmatter and note content into a single array."
import { getAllTags } from 'obsidian';
getAllTags(cache: CachedMetadata): string[] | null

// Tags are returned WITH the # prefix: ['#topic', '#subtopic']
// Returns null if no tags found (not empty array)
```

**Important:** Tag matching must account for the `#` prefix. A user-typed tag `topic` should be matched against `#topic` in the returned array.

### app.metadataCache.getFileCache(file)

Returns the parsed metadata for a single file. This is the correct API - do not use `getCache(path)` unless you only have a path string (getFileCache accepts TFile directly, which is more type-safe).

```typescript
// Signature (verified from obsidian.d.ts line 4046)
// "@since 0.9.21"
app.metadataCache.getFileCache(file: TFile): CachedMetadata | null

// CachedMetadata shape (relevant fields):
interface CachedMetadata {
  links?: LinkCache[];          // [[wikilinks]] in note body
  frontmatterLinks?: FrontmatterLinkCache[];  // links in frontmatter values (since 1.4.0)
  tags?: TagCache[];            // inline #tags (NOT frontmatter tags - use getAllTags() for both)
  frontmatter?: FrontMatterCache;  // parsed YAML frontmatter key/values
}
```

### app.metadataCache.resolvedLinks

A pre-built index of all resolved wikilinks across the vault. This is the most efficient way to find which files a given note links to - no need to call `getFileCache()` on every file.

```typescript
// Signature (verified from obsidian.d.ts line 4067)
// "Contains all resolved links. Maps each source file's path to an object of destination paths with count."
// Source and destination paths are vault-absolute TFile.path values.
app.metadataCache.resolvedLinks: Record<string, Record<string, number>>

// Pattern for depth-1 link collection from a root note:
const rootFile = app.vault.getAbstractFileByPath('Notes/MOC.md');
if (!(rootFile instanceof TFile)) return;

const linkedPaths = Object.keys(app.metadataCache.resolvedLinks[rootFile.path] ?? {});
const linkedFiles = linkedPaths
  .map(p => app.vault.getAbstractFileByPath(p))
  .filter((f): f is TFile => f instanceof TFile && f.extension === 'md');

// Pattern for depth-2: iterate linkedFiles and do the same lookup for each
```

### app.metadataCache.getFirstLinkpathDest(linkpath, sourcePath)

Resolves a wikilink string (e.g., `"Note Name"` or `"folder/Note Name"`) to a TFile. Use this when you have a link text and need the actual file - for example, when parsing `cache.links` manually.

```typescript
// Signature (verified from obsidian.d.ts line 4040)
// "@since 0.12.5"
app.metadataCache.getFirstLinkpathDest(linkpath: string, sourcePath: string): TFile | null

// sourcePath is the vault-absolute path of the file containing the link.
// It's used for disambiguation when multiple notes share the same basename.
```

**For link-based collection, prefer `resolvedLinks` over manually calling `getFirstLinkpathDest` for each link** - resolvedLinks is pre-computed at startup and updated incrementally; getFirstLinkpathDest does a lookup on each call.

### TagCache Interface

```typescript
// Verified from obsidian.d.ts line 5736
// "@since 0.9.7"
interface TagCache extends CacheItem {
  tag: string;  // the tag including # prefix, e.g. "#topic"
}
```

This is what `cache.tags` contains - but again, use `getAllTags(cache)` rather than accessing `cache.tags` directly, because `getAllTags` also picks up frontmatter tags.

---

## TypeScript Configuration

The official sample plugin tsconfig is the right baseline. No changes needed except potentially tightening a few options.

### Key Compiler Options (verified from official template)

```json
{
  "compilerOptions": {
    "baseUrl": "src",
    "target": "ES6",
    "module": "ESNext",
    "moduleResolution": "node",
    "lib": ["DOM", "ES5", "ES6", "ES7"],
    "strict": false,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noImplicitReturns": true,
    "strictNullChecks": true,
    "strictBindCallApply": true,
    "noUncheckedIndexedAccess": true,
    "useUnknownInCatchVariables": true,
    "isolatedModules": true,
    "importHelpers": true,
    "allowJs": true,
    "allowSyntheticDefaultImports": true,
    "inlineSourceMap": true,
    "inlineSources": true
  },
  "include": ["src/**/*.ts"]
}
```

**Why NOT `"strict": true`:** The official template enables strict family options individually rather than using the `strict` flag. This is intentional - it avoids enabling `strictFunctionTypes` and `strictPropertyInitialization` which conflict with how Obsidian plugin classes are structured (deferred property initialization in `onload()`).

**`noUncheckedIndexedAccess`:** Enabled in the template - this is stricter than `strict: true`. It forces you to handle `undefined` when indexing arrays/objects. Keep it on.

**`isolatedModules: true`:** Required for esbuild compatibility. esbuild transpiles each file independently without full type information, so this flag catches patterns that would silently fail.

---

## esbuild Configuration

The official config is correct and complete. Key decisions explained:

```javascript
// Format: CJS is required - Obsidian loads plugins as CommonJS modules
format: 'cjs',

// Target: ES2018 matches Obsidian's Electron version floor
target: 'es2018',

// External: These are provided by Obsidian at runtime - never bundle them
external: [
  'obsidian',
  'electron',
  '@codemirror/*',  // provided by Obsidian
  '@lezer/*',       // provided by Obsidian
  ...builtinModules, // Node built-ins (fs, path, etc.)
],

// Dev: inline sourcemaps for debugging in Obsidian DevTools
// Prod: minified, no sourcemaps (smaller main.js for release)
```

**Why no Vite/webpack:** esbuild is 10-100x faster for watch mode rebuilds than webpack. Vite adds SSR/HMR complexity irrelevant to plugin builds. Every major Obsidian plugin uses esbuild. Don't deviate.

---

## manifest.json Structure

Required fields for community plugin store:

```json
{
  "id": "ai-active-recall",
  "name": "Active Recall",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "Generate active recall self-tests from your notes using AI.",
  "author": "Your Name",
  "authorUrl": "https://github.com/yourname",
  "isDesktopOnly": false
}
```

**`minAppVersion: "0.15.0"`** - This is what the boilerplate sets. It covers the modern plugin API surface (leaf views, settings tab, etc.) and represents the vast majority of active Obsidian users. Do not set it lower.

**`isDesktopOnly: false`** - The plugin targets both desktop and mobile. Keep false. This affects the store listing.

**Release artifacts** - The community store review only inspects `main.js`, `manifest.json`, and `styles.css`. These three files must be attached to every GitHub release.

---

## Development Workflow

### Standard Dev Loop

```bash
# Terminal 1: watch build
npm run dev
# This runs esbuild in watch mode - any .ts change triggers a rebuild of main.js

# The plugin directory (e.g., test-vault/.obsidian/plugins/ai-active-recall/)
# should contain a .hotreload file so pjeby/hot-reload reloads on main.js change
```

### Symlink Setup (recommended over copying)

```bash
# Link the repo root as the plugin directory in your test vault
ln -s /path/to/repo /path/to/test-vault/.obsidian/plugins/ai-active-recall
```

This means esbuild writes `main.js` directly into the vault's plugin folder. Combined with pjeby/hot-reload, you get an instant feedback loop: save TypeScript -> esbuild rebuilds -> hot-reload reloads the plugin in Obsidian (~1 second total).

### hot-reload Setup

1. Clone `pjeby/hot-reload` into `test-vault/.obsidian/plugins/hot-reload/`
2. Enable it in Obsidian Settings > Community Plugins
3. Add a `.hotreload` file to the plugin directory (or the symlink target)
4. That's it - the plugin auto-reloads whenever `main.js` changes

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| requestUrl() | OpenAI npm SDK | Never - SDK bundles Node internals that break in Obsidian's renderer and on mobile |
| requestUrl() | @anthropic-ai/sdk | Never - same reason as OpenAI SDK |
| requestUrl() | @google/generative-ai | Never - same reason; also the SDK is significantly larger than needed |
| requestUrl() | native fetch() | Only for streaming SSE (which this plugin doesn't need) - breaks mobile if used broadly |
| esbuild | Rollup / Vite | If you need advanced code-splitting or non-CJS output - not applicable here |
| pjeby/hot-reload | Manual Cmd+R in Obsidian | Acceptable but slow; hot-reload is a 5-minute setup that saves hours |
| getAllTags(cache) | manual cache.tags + cache.frontmatter.tags parsing | If you specifically need to distinguish inline vs frontmatter tags for some feature |
| resolvedLinks index | looping getFirstLinkpathDest per link | If resolvedLinks hasn't populated yet (e.g., called before MetadataCache is ready on startup) |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| openai npm SDK | Bundles Node.js streams/http that crash in Obsidian renderer; 500kb bundle weight; breaks mobile entirely | `requestUrl()` with manual JSON payload |
| @anthropic-ai/sdk | Same as OpenAI SDK - Node-specific internals + bundle weight | `requestUrl()` against `api.anthropic.com/v1/messages` |
| @google/generative-ai | Same as above; also harder to control request shape | `requestUrl()` against `generativelanguage.googleapis.com` |
| node-fetch | Node-specific module; not available in Obsidian's renderer process; breaks mobile | `requestUrl()` |
| native fetch() | Blocked by CORS on desktop; unavailable on mobile via Obsidian | `requestUrl()` |
| webpack | 5-10x slower than esbuild for watch mode; no advantage for Obsidian plugin builds | esbuild (already in boilerplate) |
| `"strict": true` in tsconfig | Enables `strictPropertyInitialization` which conflicts with Obsidian plugin class patterns | Individual strict flags as in the official template |
| Gemini `?key=` query param auth | API key appears in server logs, browser history, and error messages | `x-goog-api-key` header |
| `cache.tags` directly for tag collection | Misses frontmatter tags; must combine with `cache.frontmatter.tags` manually | `getAllTags(cache)` which handles both |
| legacy .eslintrc format | Deprecated in ESLint 9; flat config is now the standard | `eslint.config.mts` (already in boilerplate) |

---

## Stack Patterns by Variant

**If adding a new LLM provider in v3+:**
- Implement the `LLMProvider` interface (call/system-prompt/user-prompt -> string)
- Add a `callXxx()` function following the same `requestUrl()` + `throw: false` pattern
- Add model constants and error classifiers for the new provider
- The generation pipeline (`GenerationService`) calls the interface, so zero changes there

**If you add streaming in a future version (e.g., show tokens as they appear):**
- Use native `fetch()` with `stream: true` in the request
- Mark the feature as desktop-only (`Platform.isDesktop` check)
- Gracefully degrade to non-streaming on mobile
- Do NOT use `requestUrl()` - it buffers the entire response before resolving

**If bundle size becomes a concern:**
- Run `npm run build` and check `main.js` size
- Use esbuild's `metafile: true` option to inspect what's being bundled
- Keep production builds under ~500kb - large bundles slow plugin load and may draw scrutiny in community plugin review

**If MetadataCache is not ready at startup (edge case):**
- Wrap collection calls in `app.workspace.onLayoutReady()` callback
- The `resolvedLinks` index is populated asynchronously on vault load
- For on-demand generation (user button press), the cache will always be ready - this only matters for code that runs at plugin load time

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| typescript ^5.8.3 | esbuild 0.25.5 | Both aligned; no known issues |
| typescript-eslint 8.35.1 | typescript ^5.8.3 | Supports TS 5.x fully |
| obsidian latest | minAppVersion 0.15.0 | The `obsidian` package is a dev-only type stub; actual runtime is whatever Obsidian version the user runs |
| @types/node ^16.11.6 | Node.js 18+ | The types are conservative; actual Node runtime is 18+, but 16.x types are sufficient for build scripts |

---

## Installation

```bash
# The boilerplate already has this wired. Reference only.

# Core (runtime stub - not bundled, just for types)
npm install obsidian

# Dev dependencies
npm install -D typescript@^5.8.3 esbuild@0.25.5 tslib@2.4.0 @types/node@^16.11.6
npm install -D typescript-eslint@8.35.1 eslint-plugin-obsidianmd@0.1.9 @eslint/js@9.30.1
npm install -D globals@14.0.0 jiti@2.6.1

# v2 additions: NONE - no new packages needed
# Gemini and Claude use requestUrl() just like OpenAI
# Obsidian tag/link APIs are part of the existing obsidian package
```

---

## Sources

- https://github.com/obsidianmd/obsidian-sample-plugin - Official template; package.json and tsconfig verified (HIGH confidence)
- https://github.com/CtrlAltFocus/obsidian-plugin-auto-tag/blob/main/src/services/openai.api.ts - Real-world requestUrl + OpenAI example (HIGH confidence)
- `/node_modules/obsidian/obsidian.d.ts` (installed, version in package.json) - getAllTags signature (line 2951), getFileCache (line 4046), resolvedLinks (line 4067), getFirstLinkpathDest (line 4040), CachedMetadata interface (line 1101), TagCache (line 5736), getMarkdownFiles (line 6344) - all HIGH confidence, read directly
- https://platform.claude.com/docs/en/api/messages - Anthropic Messages API endpoint, headers, request/response structure (HIGH confidence, fetched March 2026)
- https://platform.claude.com/docs/en/about-claude/models/overview - Current Claude model identifiers, context windows, pricing (HIGH confidence, fetched March 2026)
- https://ai.google.dev/api/generate-content - Gemini generateContent endpoint, system_instruction structure, request/response format (HIGH confidence, fetched March 2026)
- https://ai.google.dev/gemini-api/docs/models - Current stable Gemini model identifiers (HIGH confidence, fetched March 2026)
- https://ai.google.dev/gemini-api/docs/api-key - x-goog-api-key header vs ?key= query param recommendation (HIGH confidence)
- https://forum.obsidian.md/t/support-streaming-the-request-and-requesturl-response-body/87381 - Streaming limitation confirmed as of March 2026 (MEDIUM confidence)

---

*Stack research for: Obsidian Community Plugin (Active Recall / LLM integration)*
*Researched: 2026-03-09 (base), 2026-03-21 (v2 multi-provider + collection modes)*
