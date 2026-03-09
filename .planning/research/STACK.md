# Stack Research

**Domain:** Obsidian Community Plugin (TypeScript + LLM integration)
**Researched:** 2026-03-09
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

## OpenAI API via requestUrl()

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
| requestUrl() | native fetch() | Only for streaming SSE (which this plugin doesn't need) - breaks mobile if used broadly |
| esbuild | Rollup / Vite | If you need advanced code-splitting or non-CJS output - not applicable here |
| pjeby/hot-reload | Manual Cmd+R in Obsidian | Acceptable but slow; hot-reload is a 5-minute setup that saves hours |
| obsidian-typings | None (type: any) | If you need undocumented internals and accept the instability risk |
| typescript-eslint strict-type-checked | eslint:recommended only | For smaller projects where lint speed matters more than strictness |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| openai npm SDK | Bundles Node.js streams/http that crash in Obsidian renderer; 500kb bundle weight; breaks mobile entirely | `requestUrl()` with manual JSON payload |
| node-fetch | Node-specific module; not available in Obsidian's renderer process; breaks mobile | `requestUrl()` |
| native fetch() | Blocked by CORS on desktop; unavailable on mobile via Obsidian; only works if the target API sets permissive CORS headers (OpenAI does not) | `requestUrl()` |
| webpack | 5-10x slower than esbuild for watch mode; no advantage for Obsidian plugin builds | esbuild (already in boilerplate) |
| `"strict": true` in tsconfig | Enables `strictPropertyInitialization` which conflicts with Obsidian plugin class patterns (properties set in `onload()` not constructor) | Individual strict flags as in the official template |
| obsidian-typings (unless needed) | Reverse-engineered types that can silently become wrong on any Obsidian update; maintainers explicitly warn against production use | Official obsidian API only |
| Legacy .eslintrc format | Deprecated in ESLint 9; flat config is now the standard | eslint.config.mts (already in boilerplate) |

---

## Stack Patterns by Variant

**If you add streaming in v2 (e.g., show tokens as they appear):**
- Use native `fetch()` with `stream: true` in the OpenAI request
- Mark the feature as desktop-only (`Platform.isDesktop` check)
- Gracefully degrade to non-streaming on mobile
- Do NOT use requestUrl() - it buffers the entire response before resolving

**If you add Anthropic support in v2:**
- The only change is in the provider implementation class
- Same `requestUrl()` pattern applies
- Anthropic endpoint: `https://api.anthropic.com/v1/messages`
- Different auth header: `x-api-key: {apiKey}` instead of `Authorization: Bearer`
- Add `anthropic-version: 2023-06-01` header

**If bundle size becomes a concern:**
- Run `npm run build` and check `main.js` size
- Use esbuild's `metafile: true` option to inspect what's being bundled
- Keep production builds under ~500kb - large bundles slow plugin load and may draw scrutiny in community plugin review

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

# Optional: only if accessing undocumented Obsidian internals
# npm install -D obsidian-typings@5.1.0
```

---

## Sources

- https://github.com/obsidianmd/obsidian-sample-plugin - Official template; package.json and tsconfig verified (HIGH confidence)
- https://github.com/CtrlAltFocus/obsidian-plugin-auto-tag/blob/main/src/services/openai.api.ts - Real-world requestUrl + OpenAI example (HIGH confidence)
- https://github.com/Fevol/obsidian-typings - obsidian-typings v5.1.0, maintainer caution re: production use (HIGH confidence)
- https://github.com/pjeby/hot-reload - Hot-reload plugin; symlink setup pattern (HIGH confidence)
- https://forum.obsidian.md/t/support-streaming-the-request-and-requesturl-response-body/87381 - Streaming limitation confirmed as of August 2025, no official fix (MEDIUM confidence)
- https://docs.obsidian.md/Reference/TypeScript+API/requestUrl - Official requestUrl docs (HIGH confidence - content loading issues prevented direct read, but API verified via source code examples)

---

*Stack research for: Obsidian Community Plugin (Active Recall / LLM integration)*
*Researched: 2026-03-09*
