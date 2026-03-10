# Codebase Concerns

**Analysis Date:** 2026-03-08

## Tech Debt

**Everything is boilerplate - no actual feature implementation:**
- Issue: The entire plugin is the unmodified Obsidian sample plugin. The plugin is named "AI Active Recall" in `manifest.json` but contains zero AI, recall, or note-related logic.
- Files: `src/main.ts`, `src/settings.ts`
- Impact: There is no working product. All registered commands (`open-modal-simple`, `replace-selected`, `open-modal-complex`) are sample placeholders. The single setting (`mySetting`) is a stub with no purpose.
- Fix approach: Implement actual AI recall features. Start by deleting sample commands and the `SampleModal` class, then build real feature modules under `src/commands/`, `src/ui/`, `src/utils/` as recommended in `AGENTS.md`.

**Plugin class and identifiers are not renamed from the sample:**
- Issue: The main plugin class is still named `MyPlugin` and the settings class is `SampleSettingTab`. The settings tab displays "Settings #1" with description "It's a secret" - leftover sample copy.
- Files: `src/main.ts` (line 6), `src/settings.ts` (lines 12, 26-27)
- Impact: Confusing codebase. Any future developer reading the code gets no signal about purpose from class names.
- Fix approach: Rename `MyPlugin` to `AiActiveRecallPlugin`, `SampleSettingTab` to `AiActiveRecallSettingTab`, and `MyPluginSettings` to `AiActiveRecallSettings`.

**Comment in source explicitly flags renaming as incomplete:**
- Issue: Line 4 of `src/main.ts` reads `// Remember to rename these classes and interfaces!` - a to-do left from the sample template.
- Files: `src/main.ts` (line 4)
- Impact: Low on its own, but signals the codebase has not been meaningfully started yet.
- Fix approach: Remove the comment when renaming classes.

**All code lives in `main.ts` against stated conventions:**
- Issue: `AGENTS.md` explicitly states "Keep `main.ts` minimal" and prescribes a module structure (`src/commands/`, `src/ui/`, `src/utils/`). Currently `main.ts` contains the plugin lifecycle, all commands, and the modal UI in a single file.
- Files: `src/main.ts`
- Impact: Will become unmanageable quickly as features are added. Violates the project's own documented conventions before any real code is written.
- Fix approach: As features are implemented, route them into the module layout described in `AGENTS.md`.

**`obsidian` dependency pinned to `latest`:**
- Issue: `package.json` declares `"obsidian": "latest"` with no version pin.
- Files: `package.json` (line 27)
- Impact: Builds are not reproducible. A future `npm install` after an Obsidian API breaking change could silently break the build or introduce type errors.
- Fix approach: Pin to a specific version (e.g., `"obsidian": "1.7.7"`) and update deliberately.

**`@types/node` pinned to an old range:**
- Issue: `@types/node` is `^16.11.6` in devDependencies while Node 18+ is recommended by `AGENTS.md`.
- Files: `package.json` (line 16)
- Impact: Type definitions may be out of sync with the actual Node.js runtime used, potentially missing newer built-in types.
- Fix approach: Bump to `@types/node` to match the target Node version (e.g., `^18.0.0`).

## Known Bugs

**Global click listener fires a Notice on every click in the entire app:**
- Symptoms: Every mouse click anywhere in Obsidian triggers a `new Notice("Click")` notification.
- Files: `src/main.ts` (lines 64-66)
- Trigger: Plugin loaded; any mouse click.
- Workaround: Disable the plugin. This is a leftover debug/demo listener from the sample and must be removed before the plugin is usable.

**`setInterval` logs to console every 5 minutes with no purpose:**
- Symptoms: `console.log('setInterval')` fires on a 5-minute interval while the plugin is active.
- Files: `src/main.ts` (line 69)
- Trigger: Plugin loaded; fires every 300 seconds indefinitely.
- Workaround: Disable the plugin. This is a sample placeholder and must be removed.

**Status bar always shows static placeholder text:**
- Symptoms: Status bar permanently displays "Status bar text" regardless of plugin state.
- Files: `src/main.ts` (lines 19-20)
- Trigger: Plugin load.
- Workaround: None while plugin is enabled. Remove or replace with meaningful content.

**Ribbon icon is a "dice" with label "Sample":**
- Symptoms: A dice icon labeled "Sample" appears in the ribbon. Clicking it shows "This is a notice!" which gives no information.
- Files: `src/main.ts` (lines 13-16)
- Trigger: Plugin load.
- Workaround: None while plugin is enabled.

## Security Considerations

**No AI integration exists yet - future network calls need explicit disclosure:**
- Risk: The plugin is named "AI Active Recall" and will presumably make external API calls (to an LLM). `AGENTS.md` requires explicit opt-in and documentation for any network requests.
- Files: `src/main.ts` (currently no network calls)
- Current mitigation: No network calls exist yet - this is not currently a risk, but must be enforced when AI features are built.
- Recommendations: When adding AI calls, require the user to supply their own API key stored locally, add an explicit settings toggle to enable network requests, and document the external service clearly in the README and settings tab.

**Settings field labeled "It's a secret" with placeholder "Enter your secret":**
- Risk: This is sample copy but signals poor UX around sensitive data. If an API key ends up in this field without being marked as a password field (type="password"), it will be visible in plaintext in the UI.
- Files: `src/settings.ts` (lines 26-29)
- Current mitigation: No actual secret is stored yet.
- Recommendations: When storing API keys or tokens, use `addText` with `.inputEl.type = 'password'` or Obsidian's masked input approach.

## Performance Bottlenecks

**Global DOM click listener on `document`:**
- Problem: The registered click handler fires on every single click event bubbling up to `document`.
- Files: `src/main.ts` (lines 64-66)
- Cause: `this.registerDomEvent(document, 'click', ...)` with no filtering or scoping.
- Improvement path: Remove the listener entirely (it is a debug placeholder). If a click handler is ever needed, scope it to the plugin's own UI elements.

## Fragile Areas

**Single-file architecture before any features exist:**
- Files: `src/main.ts`
- Why fragile: Adding AI feature logic directly to `main.ts` will create a sprawling, hard-to-test file. The AGENTS.md documentation already anticipates this and prescribes a module split.
- Safe modification: Follow the module layout in `AGENTS.md` from the first real feature. Never add business logic directly to `main.ts`.
- Test coverage: Zero - no test framework is configured.

**`tsconfig.json` lib targets only ES5/ES6/ES7:**
- Files: `tsconfig.json` (lines 20-25)
- Why fragile: The build target in esbuild is `es2018` but the tsconfig `lib` only includes ES5, ES6, ES7. Newer ES built-ins (e.g., `Promise.allSettled`, optional chaining, `Array.flat`) may not have type definitions available, causing silent type gaps.
- Safe modification: Add `"ES2018"` or later to the `lib` array to match the esbuild target.
- Test coverage: `tsc -noEmit` runs as part of `npm run build` which would catch most mismatches, but the discrepancy is a latent issue.

## Scaling Limits

**No data persistence design beyond a single string setting:**
- Current capacity: One `string` field in `data.json` via `loadData`/`saveData`.
- Limit: As soon as the plugin needs to store quiz history, note metadata, scheduling data, or user progress, the current flat settings object will be insufficient.
- Scaling path: Design a versioned data schema early. Use a separate `data.json` structure with top-level keys for settings vs. user data, and add a migration path when the schema changes.

## Dependencies at Risk

**`obsidian: latest` - no lockfile guarantee for Obsidian API version:**
- Risk: The Obsidian npm package is an unofficial type/stub package. Pinning to `latest` means any future type breaking change is pulled in on the next install.
- Impact: TypeScript compilation errors or silent behavioral changes in the plugin.
- Migration plan: Pin to a specific version. Check Obsidian release notes before upgrading.

## Missing Critical Features

**No AI integration:**
- Problem: The stated purpose of the plugin (AI-assisted active recall) is entirely absent. No LLM client, no note parsing, no question generation, no scheduling algorithm (e.g., spaced repetition), no review UI.
- Blocks: The plugin cannot be used for its intended purpose at all.

**No test infrastructure:**
- Problem: No test framework (Jest, Vitest, etc.) is configured. No test files exist in the project (only node_modules test files from dependencies).
- Blocks: Cannot verify correctness of recall logic, spaced repetition scheduling, or AI response parsing without manual testing in Obsidian.

**`onunload` is empty:**
- Problem: `MyPlugin.onunload()` has no body. While Obsidian auto-cleans registered listeners and intervals, any future manual resource acquisition (e.g., persistent connections, background workers) will leak on plugin disable if `onunload` is not populated.
- Files: `src/main.ts` (lines 73-74)
- Blocks: Safe plugin disable/reload lifecycle for future features.

## Test Coverage Gaps

**No tests exist:**
- What's not tested: Everything - plugin lifecycle, settings load/save, any future command logic, AI response parsing, spaced repetition scheduling.
- Files: Entire `src/` directory.
- Risk: Any logic added will be unverified. Regressions will only surface through manual Obsidian testing.
- Priority: High - establish a test framework (e.g., Vitest with mocked Obsidian API) before implementing core recall/AI logic.

**Build artifacts committed to the repository:**
- What's not tested: The `.gitignore` correctly excludes `main.js`, but the compiled `main.js` currently exists in the plugin folder under the test-vault (`test-vault/.obsidian/plugins/ai-active-recall/main.js`). This is the dev workflow artifact for manual Obsidian testing, but it introduces the risk of stale build artifacts being confused for current source.
- Files: `test-vault/.obsidian/plugins/ai-active-recall/main.js`
- Risk: Developer works against outdated compiled code without realizing the source has changed.
- Priority: Medium - document the required manual rebuild step clearly, or automate rebuilding into the dev workflow.

---

*Concerns audit: 2026-03-08*
