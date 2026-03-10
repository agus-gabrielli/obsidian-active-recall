# Phase 1: Foundation - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Working Obsidian plugin scaffold that loads cleanly, has a store-compliant manifest, and establishes the requestUrl() HTTP pattern before any feature work begins. Rename from sample plugin template. No features, commands, or UI beyond what's needed to verify the plugin loads.

</domain>

<decisions>
## Implementation Decisions

### Scaffold cleanup
- Plugin class renamed to `ActiveRecallPlugin` (default export from main.ts)
- `main.ts` reduced to minimal shell: `onload()`, `onunload()`, `loadSettings()`, `saveSettings()` only - no commands, no ribbon icon, no DOM event listeners, no setInterval
- `settings.ts` renamed to use `ActiveRecallSettings` interface (empty fields for now) and `ActiveRecallSettingTab` class stub - Phase 2 fills in all fields
- `DEFAULT_SETTINGS` stays as empty object `{}` until Phase 2

### Claude's Discretion
- requestUrl() smoke test implementation (how it's wired - dev command, console log, or notice)
- Whether manifest.json description needs updating
- minAppVersion stays at 0.15.0 (widest compatibility)
- test-vault plugin directory setup and any required files (manifest copy, data.json placeholder)

</decisions>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches for the requestUrl() smoke test and build verification.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `esbuild.config.mjs`: Already correctly configured - watch mode, outputs to `test-vault/.obsidian/plugins/ai-active-recall/main.js`, targets es2018, CJS format, all Obsidian packages external
- `manifest.json`: Already has correct plugin ID `ai-active-recall`, `isDesktopOnly: false`, `minAppVersion: "0.15.0"` - no changes needed
- `test-vault/`: Exists - dev testing environment is in place
- `src/main.ts` + `src/settings.ts`: Starting point - rename classes and strip sample code

### Established Patterns
- TypeScript + esbuild (no webpack, no rollup)
- `tsc -noEmit -skipLibCheck` for type checking, esbuild for bundling
- All Obsidian packages marked external in esbuild

### Integration Points
- Build output: `test-vault/.obsidian/plugins/ai-active-recall/main.js`
- Plugin entry point: `src/main.ts` default export must extend `Plugin`
- Settings persisted via `this.loadData()` / `this.saveData()`

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-09*
