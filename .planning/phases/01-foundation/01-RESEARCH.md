# Phase 1: Foundation - Research

**Researched:** 2026-03-09
**Domain:** Obsidian plugin scaffold, esbuild build config, manifest compliance, requestUrl HTTP
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Plugin class renamed to `ActiveRecallPlugin` (default export from main.ts)
- `main.ts` reduced to minimal shell: `onload()`, `onunload()`, `loadSettings()`, `saveSettings()` only - no commands, no ribbon icon, no DOM event listeners, no setInterval
- `settings.ts` renamed to use `ActiveRecallSettings` interface (empty fields for now) and `ActiveRecallSettingTab` class stub - Phase 2 fills in all fields
- `DEFAULT_SETTINGS` stays as empty object `{}` until Phase 2

### Claude's Discretion
- requestUrl() smoke test implementation (how it's wired - dev command, console log, or notice)
- Whether manifest.json description needs updating
- minAppVersion stays at 0.15.0 (widest compatibility)
- test-vault plugin directory setup and any required files (manifest copy, data.json placeholder)

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIST-01 | `manifest.json` meets Obsidian community store requirements: plugin ID `ai-active-recall` (no `obsidian-` prefix), `minAppVersion` set appropriately, `isDesktopOnly` accurate | Current manifest already compliant; research confirms field rules and forbidden patterns |
</phase_requirements>

---

## Summary

This phase is a cleanup + verification pass on an already-started plugin scaffold. The codebase was generated from the official Obsidian sample plugin template and has a mostly correct build config. The primary work is renaming sample-plugin symbols to project names, stripping the sample boilerplate from `main.ts` and `settings.ts`, and establishing the `requestUrl()` call pattern that all future HTTP work will use.

The build infrastructure (esbuild, TypeScript, watch mode, test-vault output path) is already correct and does not need changes. The manifest is already DIST-01 compliant. The two actionable gaps are: (1) `node_modules` is not installed - `npm install` must run before any build; and (2) the `ai-active-recall` plugin directory in `test-vault` lacks a `.hotreload` marker file, which means the hot-reload plugin installed there will not auto-reload it on file save.

**Primary recommendation:** Install dependencies, rename sample symbols, strip boilerplate, add `.hotreload` marker, verify build loads cleanly, then add a one-shot `requestUrl()` call in `onload()` to confirm the HTTP path works.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| obsidian | latest (in package.json) | Plugin API types + runtime (Plugin, requestUrl, Notice, etc.) | The only Obsidian plugin API - must be installed |
| esbuild | 0.25.5 | TypeScript bundler, watch mode, CJS output | Already configured; official Obsidian sample uses esbuild |
| typescript | ^5.8.3 | Type checking (`tsc -noEmit`) | Already configured |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| eslint-plugin-obsidianmd | 0.1.9 | Obsidian-specific lint rules (e.g., no direct fetch()) | Already installed; run before committing |
| @types/node | ^16.11.6 | Node types for build scripts | Already installed as devDependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| esbuild watch | webpack/rollup | No reason to change - esbuild already configured correctly |
| requestUrl | fetch() | fetch() fails on mobile due to CORS; requestUrl bypasses CORS on both platforms |
| requestUrl | OpenAI SDK | SDK uses fetch() internally - violates the locked HTTP pattern |

**Installation:**
```bash
npm install
```
(`node_modules` is currently missing from the project directory.)

---

## Architecture Patterns

### Recommended Project Structure

This phase only touches existing files - no new directories needed:

```
src/
├── main.ts          # ActiveRecallPlugin class (onload, onunload, loadSettings, saveSettings)
└── settings.ts      # ActiveRecallSettings interface, DEFAULT_SETTINGS, ActiveRecallSettingTab stub
test-vault/
└── .obsidian/plugins/ai-active-recall/
    ├── main.js      # esbuild output (auto-generated, do not edit)
    ├── manifest.json
    └── .hotreload   # marker file - enables hot-reload plugin to watch this directory
```

### Pattern 1: Minimal Plugin Shell

**What:** A stripped Plugin subclass with only lifecycle and settings plumbing - no commands, no UI, no timers.
**When to use:** Foundation phase only; adds nothing until needed.

```typescript
// src/main.ts
import { Plugin } from 'obsidian';
import { ActiveRecallSettings, DEFAULT_SETTINGS, ActiveRecallSettingTab } from './settings';

export default class ActiveRecallPlugin extends Plugin {
    settings: ActiveRecallSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new ActiveRecallSettingTab(this.app, this));
    }

    onunload() {}

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ActiveRecallSettings>);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
```

### Pattern 2: requestUrl() for HTTP

**What:** Use `requestUrl` from the `obsidian` package for ALL outbound HTTP calls. Never use `fetch()`, `XMLHttpRequest`, or any SDK that wraps them.
**When to use:** Every HTTP call in the plugin, starting with the smoke test in this phase.

```typescript
// Source: https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts
import { requestUrl, RequestUrlParam } from 'obsidian';

const params: RequestUrlParam = {
    url: 'https://httpbin.org/get',
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    throw: false,   // false = don't throw on non-2xx; check response.status manually
};

const response = await requestUrl(params);
// response.status: number
// response.text: string
// response.json: any (parsed if content-type is application/json)
// response.headers: Record<string, string>
// response.arrayBuffer: ArrayBuffer
```

**Why `throw: false` matters:** By default `throw` is `true` and a non-2xx response throws. For the smoke test, `throw: false` is safer - log `response.status` and proceed.

### Pattern 3: Settings Stub

```typescript
// src/settings.ts
import { App, PluginSettingTab } from 'obsidian';
import type ActiveRecallPlugin from './main';

export interface ActiveRecallSettings {
    // Phase 2 fills this in
}

export const DEFAULT_SETTINGS: ActiveRecallSettings = {};

export class ActiveRecallSettingTab extends PluginSettingTab {
    plugin: ActiveRecallPlugin;

    constructor(app: App, plugin: ActiveRecallPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();
        // Phase 2 fills this in
    }
}
```

### Anti-Patterns to Avoid

- **Using `fetch()` directly:** CORS will block it on mobile. The `eslint-plugin-obsidianmd` will flag this. Use `requestUrl` instead.
- **Leaving `SampleModal`, `SampleSettingTab`, `MyPlugin` names:** TypeScript will compile but the code won't match the project conventions or future imports.
- **Leaving sample commands and ribbon icon in `onload()`:** Wastes load time and creates noise; the locked decision requires a minimal shell.
- **Missing `onunload()` cleanup:** Any registered intervals or DOM events not registered via Obsidian's `registerDomEvent`/`registerInterval` will leak. The shell has no registrations, so `onunload()` stays empty.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP requests without CORS issues | Custom fetch wrapper | `requestUrl` from obsidian | Already handles CORS bypass on desktop + mobile; battle-tested |
| Plugin settings persistence | Custom file I/O | `this.loadData()` / `this.saveData()` | Obsidian Plugin base class provides this via `data.json` in the plugin directory |
| TypeScript bundling | Custom webpack config | esbuild (already configured) | Already correct; esbuild produces the CJS output Obsidian requires |
| Manifest validation | Manual field checking | Official submission checker at obsidian.md | Automated; catches format errors the eye misses |

**Key insight:** The obsidian package provides the full plugin runtime - persistence, HTTP, UI registration, event cleanup - as first-class APIs. Don't duplicate any of it.

---

## Common Pitfalls

### Pitfall 1: `node_modules` Missing - Build Fails on First Run
**What goes wrong:** Running `npm run dev` without first running `npm install` fails immediately. The project currently has no `node_modules`.
**Why it happens:** `node_modules` is gitignored. First checkout always requires install.
**How to avoid:** Run `npm install` as the first step before any build command.
**Warning signs:** `Cannot find module 'esbuild'` or similar module-not-found errors on `npm run dev`.

### Pitfall 2: Hot-Reload Not Firing
**What goes wrong:** Editing `src/main.ts`, saving, and observing no plugin reload in Obsidian even though `npm run dev` is running.
**Why it happens:** The `hot-reload` plugin (already installed in test-vault) only watches plugin directories that have a `.git` subdirectory or a `.hotreload` marker file. The `ai-active-recall` plugin directory has neither.
**How to avoid:** Create an empty `.hotreload` file at `test-vault/.obsidian/plugins/ai-active-recall/.hotreload`.
**Warning signs:** After a file save, esbuild reports a rebuild in the terminal but Obsidian does not reload the plugin.

### Pitfall 3: `sample-plugin` Listed in community-plugins.json
**What goes wrong:** The test-vault's `community-plugins.json` contains `"sample-plugin"` in the enabled list but there is no corresponding plugin directory. Obsidian may log a warning about a missing plugin on load.
**Why it happens:** Leftover from original template setup - never cleaned up.
**How to avoid:** Remove `"sample-plugin"` from `test-vault/.obsidian/community-plugins.json`.
**Warning signs:** Obsidian console shows "Failed to load plugin sample-plugin" on vault open.

### Pitfall 4: requestUrl() JSON Auto-Parse Behavior
**What goes wrong:** Calling `response.json` on a response where the server does not set `Content-Type: application/json` may throw or return undefined.
**Why it happens:** `requestUrl` attempts JSON parsing based on content-type. If content-type is not set, behavior is inconsistent across Obsidian versions.
**How to avoid:** For the smoke test, use `response.text` or `response.status` rather than `response.json`. For production LLM calls (Phase 3), always check status first, then parse.
**Warning signs:** Smoke test throws an unexpected error despite a 200 status.

### Pitfall 5: Stale main.js in test-vault After Class Rename
**What goes wrong:** After renaming `MyPlugin` to `ActiveRecallPlugin`, if esbuild has not rebuilt, the test-vault's `main.js` still contains the old class name and Obsidian loads stale code.
**Why it happens:** The compiled output is separate from source - Obsidian reads `main.js`, not `src/main.ts`.
**How to avoid:** Ensure `npm run dev` is running when making source changes, or run `npm run build` for a one-shot compile.
**Warning signs:** Settings > Community Plugins still shows behavior from before the rename.

---

## Code Examples

Verified patterns from the obsidian-api source and existing esbuild config:

### requestUrl() Smoke Test (Minimal)
```typescript
// In onload() - remove after smoke test confirmed
import { requestUrl, Notice } from 'obsidian';

async onload() {
    await this.loadSettings();
    this.addSettingTab(new ActiveRecallSettingTab(this.app, this));

    // Smoke test - remove before Phase 2
    try {
        const resp = await requestUrl({ url: 'https://httpbin.org/get', throw: false });
        console.log('[ActiveRecall] requestUrl smoke test status:', resp.status);
        new Notice(`requestUrl smoke test: ${resp.status}`);
    } catch (e) {
        console.error('[ActiveRecall] requestUrl smoke test failed:', e);
        new Notice('requestUrl smoke test FAILED - see console');
    }
}
```

**Why `httpbin.org/get`:** Returns a simple JSON response with no auth required, available on both desktop and mobile networks, and confirms CORS bypass is working.

### Build Commands
```bash
# Install dependencies (required first)
npm install

# Dev mode - watch + rebuild on save
npm run dev

# Type-check only (no output)
npx tsc --noEmit --skipLibCheck

# Production build
npm run build

# Lint
npm run lint
```

### manifest.json - Current State (Already Compliant)
```json
{
    "id": "ai-active-recall",
    "name": "AI Active Recall",
    "version": "1.0.0",
    "minAppVersion": "0.15.0",
    "description": "AI Active Recall is a plugin that helps you learn and remember your notes using AI.",
    "author": "Agustin Gabrielli",
    "authorUrl": "https://github.com/agus-gabrielli",
    "fundingUrl": "",
    "isDesktopOnly": false
}
```

DIST-01 compliance notes (all passing):
- `id` is `ai-active-recall` - no `obsidian-` prefix (forbidden by store rules)
- `minAppVersion` is `"0.15.0"` - a real version string
- `isDesktopOnly` is `false` - accurate (requestUrl works on mobile)
- `version` follows semver `x.y.z`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| fetch() for HTTP | requestUrl() from obsidian | Introduced ~0.13.x | Bypasses CORS; required for mobile-compatible plugins |
| Webpack bundling | esbuild | Obsidian sample plugin switched ~2022 | Faster builds; already configured in this project |
| Manual hot-reload (disable/enable) | hot-reload plugin | Community tool, stable since 2021 | Auto-reloads on file change without manual intervention |

**Deprecated/outdated:**
- `request()` (the older string-only API): Superseded by `requestUrl()` which accepts `RequestUrlParam` and returns structured `RequestUrlResponse`. Use `requestUrl` only.
- Direct `fetch()`: Still present in Obsidian's environment but CORS-blocked for external calls; flagged by `eslint-plugin-obsidianmd`.

---

## Open Questions

1. **Smoke test endpoint - `httpbin.org` reliability**
   - What we know: `httpbin.org` is a widely-used HTTP testing service; no auth required
   - What's unclear: Whether it is consistently reachable from mobile/desktop in all network conditions
   - Recommendation: Use it for the smoke test. If it fails, the pattern is proven by checking `resp.status === 200`; any public HTTPS endpoint works. A fallback is `https://api.github.com`.

2. **`community-plugins.json` contains `"sample-plugin"` entry**
   - What we know: There is no `sample-plugin` directory in `test-vault/.obsidian/plugins/`
   - What's unclear: Whether Obsidian silently ignores missing plugin IDs in the list or shows an error
   - Recommendation: Remove it during phase cleanup to avoid log noise.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected - no test config files (jest.config, vitest.config, etc.) found in project |
| Config file | None - Wave 0 must establish this if automated tests are required |
| Quick run command | `npx tsc --noEmit --skipLibCheck` (type-check as proxy for build correctness) |
| Full suite command | `npm run build` (type-check + esbuild production bundle) |

### Phase Requirements - Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIST-01 | manifest.json fields are compliant (id, minAppVersion, isDesktopOnly) | smoke/manual | Manual: inspect manifest.json fields | N/A - manifest already exists |
| DIST-01 (build) | Plugin loads in Obsidian without errors | smoke/manual | `npm run build` then open test-vault in Obsidian | N/A - manual verification |
| DIST-01 (HTTP) | requestUrl() call completes without CORS error | smoke/manual | Manual: observe Notice/console output after onload() | N/A - manual on device |

**Note:** Phase 1 success criteria are inherently manual/observational:
- Plugin load verification requires opening Obsidian with the test-vault
- requestUrl() CORS bypass on mobile requires a physical device or simulator
- esbuild hot-reload speed (< 2 seconds) is measured by watching the terminal

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit --skipLibCheck` (confirms no TypeScript errors)
- **Per wave merge:** `npm run build` (confirms production bundle compiles cleanly)
- **Phase gate:** Manual load check in Obsidian (Settings > Community Plugins shows `AI Active Recall` enabled, no errors in console)

### Wave 0 Gaps
- [ ] `node_modules/` - install with `npm install` before any build
- [ ] `test-vault/.obsidian/plugins/ai-active-recall/.hotreload` - create empty file to enable hot-reload
- No automated test framework needed for this phase - success criteria are build-time and runtime manual checks

*(No test files needed for Phase 1; all verification is build + runtime.)*

---

## Sources

### Primary (HIGH confidence)
- [obsidianmd/obsidian-api obsidian.d.ts](https://github.com/obsidianmd/obsidian-api/blob/master/obsidian.d.ts) - RequestUrlParam, RequestUrlResponse, requestUrl function signature
- Project files (manifest.json, esbuild.config.mjs, package.json) - current build state verified by direct inspection
- [pjeby/hot-reload README](https://github.com/pjeby/hot-reload) - `.hotreload` marker file requirement confirmed

### Secondary (MEDIUM confidence)
- [Obsidian Submission Requirements](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) - DIST-01 field rules; `obsidian-` prefix forbidden; semver format required
- [DeepWiki: Plugin Submission Guide](https://deepwiki.com/obsidianmd/obsidian-releases/6.1-plugin-submission-guide) - manifest field list cross-referenced with primary

### Tertiary (LOW confidence)
- [Obsidian Forum: requestUrl mobile performance issue](https://forum.obsidian.md/t/bug-mobile-requesturl-has-performance-issue/84177) - mobile behavior note; not verified against current Obsidian release

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries are in package.json; versions confirmed by direct file read
- Architecture: HIGH - patterns derived from current codebase + official Obsidian API types
- Pitfalls: HIGH (build/hot-reload gaps confirmed by file inspection); MEDIUM (requestUrl JSON parsing behavior - forum-sourced)

**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (stable Obsidian API; esbuild config unlikely to change)
