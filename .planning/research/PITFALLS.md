# Pitfalls Research

**Domain:** Obsidian community plugin with LLM API calls, sidebar view, community store submission
**Researched:** 2026-03-09
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

**Warning signs:**
- Settings tab has an API key field with no security notice
- Plugin tests on a vault that has `.obsidian/` committed to Git
- `console.log(this.settings)` anywhere in the code

**Phase to address:** Settings / Plugin configuration phase

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

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Import openai SDK directly instead of raw `requestUrl()` calls | TypeScript types, less boilerplate | Large bundle, mobile breakage, CORS issues, crypto polyfill debt | Never - use `requestUrl()` from the start |
| Store API key in `data.json` without warning | Zero extra code | User key exposure via Git sync | Only if you add a clear warning in the settings UI |
| Skip `detachLeavesOfType` in `onunload` | Slightly simpler unload code | Duplicate sidebar panes on plugin reload | Never - takes 1 line |
| Hardcode the note-reading as non-abstract (no `NoteSource` interface) | Faster to write | Refactor required when adding tag/graph collection modes in v2 | Never - interface is defined in PROJECT.md as an active requirement |
| Skip mobile testing before submission | Faster to release | Submission rejected or users on iOS/Android file bug reports immediately | Only if `isDesktopOnly: true` is set in manifest |
| Use `vault.read()` instead of `vault.cachedRead()` for display-only reads | Simpler mental model | Unnecessary disk I/O; can cause stale-write if file is mutated between read and write | Use `read()` only when you intend to write back; use `cachedRead()` otherwise |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| OpenAI Chat Completions API | Using the openai npm SDK which brings Node-only dependencies into the bundle | Use `requestUrl()` to POST JSON directly to `https://api.openai.com/v1/chat/completions` |
| OpenAI API key | Storing raw in `data.json` with no user warning | Warn in settings UI; optionally use Obsidian's Secret Storage API (v1.11.0+) |
| Streaming responses | Using `response.body` stream (Node streams / Web Streams not reliably available in all Obsidian environments) | The `requestUrl()` API does not support streaming responses; use non-streaming completions for v1 |
| Vault file reads | `app.vault.read()` on every generation triggers full disk read | Use `app.vault.cachedRead()` when not writing back; use `app.vault.read()` only when overwriting |
| Sidebar view activation | Opening the view before workspace layout is ready | Wrap activation in `app.workspace.onLayoutReady()` |
| Event listeners | Using `app.vault.on(...)` directly and forgetting to unregister | Always use `this.registerEvent(app.vault.on(...))` so Obsidian auto-cleans on unload |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Reading all vault `.md` files in `onload()` | Slow Obsidian startup; reviewers flag it in performance tests | Defer file scanning to `onLayoutReady()` or to the moment the user triggers generation | Any vault with 500+ files |
| `await Promise.all(files.map(f => vault.read(f)))` with no concurrency limit | Spikes disk I/O; degrades on mobile with slow storage | Use sequential reads or limit concurrency (e.g., 5 at a time) for large file sets | Folders with 50+ files on mobile |
| Re-scanning the vault to build the sidebar folder list on every workspace change event | UI jitter; high CPU on large vaults | Debounce the scan; only re-scan on `vault.on('create' / 'delete' / 'rename')` events that affect `.md` files | Vaults with active editing in another pane |
| Sending the full note content to the LLM without truncating very large individual notes | API timeout or error for notes over ~40k chars | Cap individual note input at a configurable char limit (default ~8000 chars); warn the user | Single note > 10,000 words |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| API key stored in `data.json` with no user guidance about Git exposure | Key leaked in public or private repo commit history | Display warning in settings UI; consider using the v1.11.0+ Secret Storage API |
| Logging `this.settings` to console during development and shipping the debug log | API key appears in Obsidian developer console, visible to anyone who opens it | Remove all `console.log(this.settings)` calls before release; use a debug flag that strips key fields |
| Shipping `main.js` with obfuscated or minified-to-unreadability code | Submission rejected by Obsidian review team; users cannot audit the plugin | Minification is acceptable; obfuscation (variable renaming to gibberish, string encoding) is prohibited |
| Calling a remote endpoint that is not the user's chosen LLM provider | Violation of developer policy (no unauthorized data collection) | Only make outbound calls to the user-configured API endpoint; no telemetry, analytics, or crash reporting without explicit opt-in |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Showing no progress feedback during LLM generation (which can take 10-30s) | Users click Generate multiple times thinking it failed; end up with race conditions | Show a spinner or status notice in the sidebar panel while the API call is in progress; disable the Generate button |
| Silently overwriting `_self-test.md` with no confirmation or undo | User loses a carefully annotated self-test by clicking Regenerate accidentally | Show a modal "Regenerate will overwrite your existing self-test. Continue?" before overwriting an existing file |
| Surfacing raw OpenAI API error messages to the user | Error like "insufficient_quota" or "context_length_exceeded" is confusing | Map known error codes to user-friendly messages: "Your API key has exceeded its quota", "Folder too large - try splitting it" |
| API key field in settings showing the key in plain text | Key visible to anyone looking at the screen | Use an `<input type="password">` equivalent in the settings UI (standard pattern in other Obsidian AI plugins) |
| Setting `isDesktopOnly: false` without testing on mobile | Mobile users install the plugin and get crashes or blank panels | Either test on mobile before setting `isDesktopOnly: false`, or default to `true` for v1 and document it |

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

---

## Sources

- [Obsidian Developer Policies - docs.obsidian.md](https://docs.obsidian.md/Developer+policies) - HIGH confidence (official)
- [Plugin Submission Requirements - docs.obsidian.md](https://docs.obsidian.md/Plugins/Releasing/Submission+requirements+for+plugins) - HIGH confidence (official)
- [Mobile Development - docs.obsidian.md](https://docs.obsidian.md/Plugins/Getting+started/Mobile+development) - HIGH confidence (official)
- [Views - docs.obsidian.md](https://docs.obsidian.md/Plugins/User+interface/Views) - HIGH confidence (official)
- [Events - docs.obsidian.md](https://docs.obsidian.md/Plugins/Events) - HIGH confidence (official)
- [Plugin Submission Guide - deepwiki.com/obsidianmd/obsidian-releases](https://deepwiki.com/obsidianmd/obsidian-releases/6.1-plugin-submission-guide) - MEDIUM confidence (community analysis of official repo)
- [Using OpenAI npm under Obsidian.md - OpenAI Community Forum](https://community.openai.com/t/fyi-using-openai-npm-under-obsidian-md/64273) - MEDIUM confidence (practitioner report)
- [esBuild Platform Node vs Browser - Obsidian Forum](https://forum.obsidian.md/t/plugin-esbuild-platform-node-vs-browser/72267) - MEDIUM confidence (community, corroborated by official mobile docs)
- [Make HTTP requests from plugins - Obsidian Forum](https://forum.obsidian.md/t/make-http-requests-from-plugins/15461) - HIGH confidence (corroborated by official `requestUrl` docs)
- [Cross-platform secure storage for secrets - Obsidian Forum](https://forum.obsidian.md/t/cross-platform-secure-storage-for-secrets-and-tokens-that-can-be-syncd/100716) - MEDIUM confidence (community discussion)
- [Mind Your Obsidian Plugin Secrets - Medium](https://blog-ssh3ll.medium.com/mind-your-obsidian-plugin-secrets-fc141f34b936) - MEDIUM confidence (practitioner article, Nov 2025)
- [How to correctly open an ItemView - Obsidian Forum](https://forum.obsidian.md/t/how-to-correctly-open-an-itemview/60871) - MEDIUM confidence (community, corroborated by official Views docs)
- [Call for plugin performance optimization - Obsidian Forum](https://forum.obsidian.md/t/call-for-plugin-performance-optimization-especially-for-plugin-startup/32321) - MEDIUM confidence (community consensus)

---
*Pitfalls research for: Obsidian Active Recall Plugin (community plugin with LLM integration)*
*Researched: 2026-03-09*
