# Architecture Research

**Domain:** Obsidian Community Plugin (TypeScript)
**Researched:** 2026-03-09
**Confidence:** HIGH - based on official Obsidian developer docs, API reference, and verified community plugin patterns

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        OBSIDIAN HOST APP                         │
│   Workspace  |  Vault (filesystem)  |  MetadataCache  |  Events  │
└──────────────────────────┬──────────────────────────────────────┘
                           │ Plugin API (app.*)
┌──────────────────────────▼──────────────────────────────────────┐
│                     main.ts — Plugin class                        │
│  (entry point: onload / onunload — registers everything here)    │
├──────────────┬────────────────┬──────────────┬───────────────────┤
│  Commands    │  Context Menu  │  Settings    │  Sidebar View     │
│ addCommand() │ registerEvent  │  SettingTab  │  registerView()   │
│              │ ("file-menu")  │  loadData /  │  ItemView leaf    │
│              │                │  saveData    │                   │
└──────┬───────┴────────┬───────┴──────┬───────┴──────────┬────────┘
       │                │              │                  │
       └────────────────┴──────────────┘                  │
                        │ triggers                        │ reads
                        ▼                                 ▼
┌────────────────────────────────────┐    ┌───────────────────────┐
│       Generation Pipeline          │    │    Plugin Settings     │
│  NoteCollector (NoteSource iface)  │    │   (data.json on disk) │
│       ↓                            │    └───────────────────────┘
│  ContextBudgetManager              │
│       ↓                            │
│  LLMClient (LLMProvider iface)     │
│       ↓                            │
│  OutputWriter (vault.create/modify)│
└────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| `main.ts` / `Plugin` | Entry point; registers all commands, views, events, settings tab; owns settings object | `class ActiveRecallPlugin extends Plugin` |
| `SidebarView` | Renders the sidebar leaf panel listing folders and Generate/Regenerate buttons | `class SidebarView extends ItemView` |
| `SettingsTab` | Provides settings UI (provider, API key, model, toggles) and persists via `saveData` | `class ActiveRecallSettingsTab extends PluginSettingTab` |
| `NoteCollector` | Reads `.md` files from a folder via `app.vault`; hides file-system details from pipeline | Implements `NoteSource` interface |
| `ContextBudgetManager` | Splits notes into token-budget batches; drives batch+synthesize logic for large folders | Plain TypeScript class |
| `LLMClient` | Calls LLM provider HTTP API; wraps error handling and retries | Implements `LLMProvider` interface; first concrete: `OpenAIProvider` |
| `OutputWriter` | Creates or overwrites `_self-test.md` in the target folder via `app.vault` | Plain TypeScript class |

## Recommended Project Structure

```
src/
├── main.ts                   # Plugin class — onload/onunload only; thin orchestrator
├── views/
│   └── SidebarView.ts        # ItemView for the sidebar leaf panel
├── settings/
│   ├── settings.ts           # PluginSettings interface + DEFAULT_SETTINGS constant
│   └── SettingsTab.ts        # PluginSettingTab subclass
├── pipeline/
│   ├── NoteSource.ts         # NoteSource interface (abstraction for collection modes)
│   ├── NoteCollector.ts      # Concrete: reads top-level .md from a TFolder
│   ├── ContextBudgetManager.ts  # Batch/synthesize logic
│   └── OutputWriter.ts       # Writes _self-test.md to vault
├── llm/
│   ├── LLMProvider.ts        # LLMProvider interface
│   └── OpenAIProvider.ts     # First concrete provider
└── constants.ts              # VIEW_TYPE string, SELF_TEST_FILENAME, token budget consts
```

### Structure Rationale

- **`views/`:** Keeps UI rendering isolated from business logic; view can be replaced without touching pipeline.
- **`settings/`:** Interface + defaults in one file; tab in another. Settings are a pure data object owned by the Plugin instance and passed by reference wherever needed.
- **`pipeline/`:** The generation flow is a linear pipeline. Each step is a separate class with a single responsibility. `NoteSource` interface is the extension point for v2 collection modes.
- **`llm/`:** Provider abstraction lives here. Adding Anthropic means adding `AnthropicProvider.ts` and a settings toggle - nothing else changes.
- **`constants.ts`:** Centralizes the `VIEW_TYPE` string (used in both `main.ts` and `SidebarView.ts`) and other shared literals to prevent typo-driven bugs.

## Architectural Patterns

### Pattern 1: Plugin Class as Thin Orchestrator

**What:** `main.ts` / the `Plugin` subclass contains only registration calls in `onload()` - no business logic. Commands call into pipeline classes; the plugin itself does not compute anything.

**When to use:** Always. This is the standard Obsidian plugin pattern.

**Trade-offs:** Keeps `main.ts` readable and testable at a glance. Business logic is testable in isolation without mocking the full Obsidian API.

**Example:**
```typescript
async onload() {
  await this.loadSettings();
  this.addSettingTab(new ActiveRecallSettingsTab(this.app, this));
  this.registerView(SIDEBAR_VIEW_TYPE, (leaf) => new SidebarView(leaf, this));
  this.addCommand({ id: "generate-self-test", name: "Generate Self-Test for Current Folder",
    callback: () => this.runGeneration(this.getCurrentFolder()) });
  this.registerEvent(
    this.app.workspace.on("file-menu", (menu, file) => {
      if (file instanceof TFolder) {
        menu.addItem((item) => item.setTitle("Generate Self-Test")
          .setIcon("brain").onClick(() => this.runGeneration(file)));
      }
    })
  );
}
```

### Pattern 2: Never Store View References - Use getLeavesOfType

**What:** Obsidian may call the view factory multiple times (after layout restores, workspace splits, etc.). Never keep `private view: SidebarView` on the plugin. Always retrieve via `getLeavesOfType()`.

**When to use:** Any time you need to update the view from outside (e.g., after generation completes, refresh the folder list).

**Trade-offs:** Slightly more verbose than a stored reference, but avoids stale-pointer bugs and double-render issues.

**Example:**
```typescript
// To trigger a view refresh after generation:
this.app.workspace.getLeavesOfType(SIDEBAR_VIEW_TYPE).forEach((leaf) => {
  if (leaf.view instanceof SidebarView) {
    leaf.view.refresh();
  }
});

// In onunload():
this.app.workspace.detachLeavesOfType(SIDEBAR_VIEW_TYPE);
```

### Pattern 3: Settings Object Passed by Reference

**What:** The `Plugin` instance owns one `settings: PluginSettings` object. It is passed into `SettingsTab`, `SidebarView`, and pipeline classes at construction time. No global singleton, no pub/sub for settings.

**When to use:** This is the standard Obsidian plugin idiom. Works because settings changes always go through `saveSettings()` on the plugin which writes the same object back to disk.

**Trade-offs:** Simple. The one gotcha is that the view or pipeline holds a stale snapshot if settings change mid-operation - in practice not an issue since LLM calls are user-initiated.

**Example:**
```typescript
// In SettingsTab onChange handler:
this.plugin.settings.apiKey = value;
await this.plugin.saveSettings();
```

### Pattern 4: LLMProvider Interface for Provider Abstraction

**What:** Define a minimal `LLMProvider` interface and inject a concrete implementation at construction time. The pipeline only calls the interface.

**When to use:** Required here because the PROJECT.md explicitly calls for provider abstraction.

**Trade-offs:** Tiny overhead for a single v1 provider, but the abstraction pays off immediately when Anthropic is wired in v2. Don't over-engineer the interface - a single `complete(prompt: string, options: CompletionOptions): Promise<string>` method covers the use case.

**Example:**
```typescript
interface LLMProvider {
  complete(prompt: string, options: CompletionOptions): Promise<string>;
}

class OpenAIProvider implements LLMProvider {
  constructor(private apiKey: string, private model: string) {}
  async complete(prompt: string, options: CompletionOptions): Promise<string> {
    // fetch('/v1/chat/completions', ...)
  }
}
```

## Data Flow

### Generation Request Flow (Command or Context Menu)

```
User action (command / context menu / sidebar button)
    │
    ▼
Plugin.runGeneration(folder: TFolder)
    │
    ▼
NoteCollector.collect(folder)   ← app.vault.read(tfile) per .md file
    │ returns: Note[]
    ▼
ContextBudgetManager.plan(notes, tokenBudget)
    │ returns: Batch[] (single batch if fits, multi-batch if oversized)
    ▼
LLMClient.generate(batch, settings)   ← HTTP POST to provider
    │  (if multi-batch: call per batch, then synthesize call)
    │ returns: string (markdown content)
    ▼
OutputWriter.write(folder, content)   ← app.vault.create or vault.modify
    │
    ▼
SidebarView.refresh()   ← getLeavesOfType pattern
```

### Settings Flow

```
User opens Settings → SettingsTab.display() renders current plugin.settings
    │
    ▼
User changes a field → onChange callback → plugin.settings[key] = value
    │
    ▼
plugin.saveSettings() → this.saveData(this.settings) → data.json on disk
```

### Sidebar View State

```
SidebarView.onOpen()
    │
    ├── app.vault.getAllFolders()        ← enumerate folders
    ├── check each folder for _self-test.md  ← app.vault.getAbstractFileByPath()
    └── render list with Generate / Regenerate buttons
         │
         └── button click → Plugin.runGeneration(folder)
```

### Key Data Flows

1. **Vault reads (note collection):** `app.vault.read(tfile)` - use `read()` not `cachedRead()` because content is being sent to LLM for transformation (authoritative copy required).
2. **Vault writes (output):** `app.vault.create(path, content)` for first generation; `app.vault.modify(tfile, content)` for regeneration (overwrite).
3. **Settings persistence:** `plugin.loadData()` / `plugin.saveData()` read/write `data.json` inside the plugin folder (`.obsidian/plugins/<plugin-id>/data.json`). Never access this file directly.
4. **Event propagation:** Context menu items and workspace events are registered via `this.registerEvent()` so they auto-detach on plugin unload - no manual cleanup needed.

## Build Order

This is the recommended sequence. Each step unblocks the next.

| Step | What to Build | Why First |
|------|--------------|-----------|
| 1 | Scaffold: `manifest.json`, `package.json`, `tsconfig.json`, esbuild config, `main.ts` with empty `onload/onunload` | Nothing compiles or loads without this; validate hot-reload works before writing any logic |
| 2 | Settings: `PluginSettings` interface, `DEFAULT_SETTINGS`, `SettingsTab`, `loadSettings`/`saveSettings` | Every subsequent component reads from settings; must exist before LLM client or view is wired |
| 3 | LLM layer: `LLMProvider` interface + `OpenAIProvider` | Can be developed and tested in isolation with a hardcoded prompt; validates API key + model config works |
| 4 | Note collection: `NoteSource` interface + `NoteCollector` | Depends on settings (none directly) but needed before pipeline can run end-to-end |
| 5 | Context budget + pipeline orchestration: `ContextBudgetManager`, `OutputWriter`, `Plugin.runGeneration()` | Wires steps 3+4 together; first point where full generation can be tested via command |
| 6 | Command registration + context menu | Trivial to add once `runGeneration()` exists; quick validation of the end-to-end flow |
| 7 | Sidebar `ItemView` | Can be built independently after step 5; depends on `runGeneration()` existing to wire buttons |
| 8 | Polish: error handling, loading state in sidebar, mobile keyboard quirks for settings | Last because it wraps all other components |

## Anti-Patterns

### Anti-Pattern 1: Storing a Direct View Reference on the Plugin

**What people do:** `private sidebarView: SidebarView` on the plugin, assigned in the `registerView` factory.

**Why it's wrong:** Obsidian can call the factory multiple times when tabs are restored or the workspace is restructured. The stored reference becomes stale. Updating it calls methods on a detached view.

**Do this instead:** Always use `getLeavesOfType(SIDEBAR_VIEW_TYPE)` to get the live instance when you need to call a method on it.

### Anti-Pattern 2: Accessing `containerEl.children[1]` in ItemView

**What people do:** Older tutorials and Stack Overflow answers use `this.containerEl.children[1]` to get the content area in `onOpen()`.

**Why it's wrong:** Obsidian's internal DOM structure is not stable across versions. This access pattern breaks silently.

**Do this instead:** Use `this.contentEl` which is the stable, API-documented content container for `ItemView`.

### Anti-Pattern 3: Calling `vault.read` on Every File at Plugin Load

**What people do:** Eagerly read all markdown files in `onload()` to build a cache.

**Why it's wrong:** Expensive on large vaults; blocks Obsidian startup; not needed since reads only happen at generation time.

**Do this instead:** Read files lazily inside `NoteCollector.collect()` at the moment the user triggers generation.

### Anti-Pattern 4: Hardcoding the Provider in the Pipeline

**What people do:** `fetch('https://api.openai.com/v1/chat/completions', ...)` directly inside the generation orchestration code.

**Why it's wrong:** Binds the pipeline to a single provider; any refactor to add Anthropic touches multiple files.

**Do this instead:** The pipeline calls `this.llmProvider.complete(prompt, opts)`. The concrete `OpenAIProvider` handles the HTTP call. Switching providers means swapping the injected implementation.

### Anti-Pattern 5: Async onload() Without Awaiting loadSettings()

**What people do:** Fire-and-forget settings load, register commands synchronously before settings are available.

**Why it's wrong:** Commands that reference `this.settings` may run before settings are loaded from disk, causing null/undefined reads.

**Do this instead:** `async onload() { await this.loadSettings(); /* then register everything else */ }` - the `Plugin.onload()` override can be async; Obsidian awaits it.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| OpenAI API | `fetch` from within `OpenAIProvider`; user-supplied API key from settings; model from settings | Use `requestUrl` from `obsidian` package on mobile for CORS compliance; do not use raw `fetch` |
| Anthropic (v2) | Same interface, new concrete class | No code changes outside `llm/` folder |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `main.ts` → `SidebarView` | `getLeavesOfType()` call + method call on view instance | Never direct reference storage |
| `main.ts` → `SettingsTab` | Constructor injection of `this` (plugin instance) | Tab reads/writes `plugin.settings` directly |
| `main.ts` → Pipeline | Direct method call on `NoteCollector`, `LLMClient`, `OutputWriter` inside `runGeneration()` | All pipeline classes are plain TypeScript - no Obsidian API coupling except `NoteCollector` (vault) and `OutputWriter` (vault) |
| `LLMClient` → `LLMProvider` | Interface method call | Concrete provider injected at construction |
| `SidebarView` → `Plugin` | Reference to plugin passed in constructor; calls `plugin.runGeneration(folder)` | Standard pattern for views that need to trigger plugin actions |

## Scaling Considerations

This is a local plugin - "scale" means vault size and folder size, not users.

| Concern | Small vault (< 50 notes/folder) | Medium folder (50-200 notes) | Large folder (200+ notes) |
|---------|--------------------------------|------------------------------|---------------------------|
| Token budget | Single LLM call | Single call likely fine | Batch + synthesize required |
| Sidebar render | Instant | Instant | `getAllFolders()` is synchronous and fast; no pagination needed |
| File reads | All in memory for generation duration only | Same | Same - Node/Electron heap handles this; no streaming needed |

The `ContextBudgetManager` handles the main scaling concern. Token budget heuristic from PROJECT.md: `chars / 4`; reserve ~20k tokens for prompt + output; remainder available for notes.

## Sources

- [Obsidian Developer Docs - Anatomy of a plugin](https://docs.obsidian.md/Plugins/Getting+started/Anatomy+of+a+plugin) - HIGH confidence
- [Obsidian Developer Docs - Views](https://docs.obsidian.md/Plugins/User+interface/Views) - HIGH confidence
- [Obsidian Developer Docs - Context menus](https://docs.obsidian.md/Plugins/User+interface/Context+menus) - HIGH confidence
- [Obsidian Developer Docs - Plugin API reference](https://docs.obsidian.md/Reference/TypeScript+API/Plugin) - HIGH confidence
- [Obsidian Developer Docs - Vault](https://docs.obsidian.md/Plugins/Vault) - HIGH confidence
- [Marcus Olsson plugin docs - Settings](https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/settings) - HIGH confidence (verified against official API)
- [Marcus Olsson plugin docs - Views](https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/views) - HIGH confidence
- [Marcus Olsson plugin docs - Context menus](https://marcusolsson.github.io/obsidian-plugin-docs/user-interface/context-menus) - HIGH confidence
- [DeepWiki - Obsidian API Plugin Development](https://deepwiki.com/obsidianmd/obsidian-api/3-plugin-development) - MEDIUM confidence (secondary source, consistent with official docs)
- [upskil.dev - Making a Custom View in Obsidian](https://upskil.dev/blog/obsidian_plugin_custom_view) - MEDIUM confidence (community tutorial, verified against official API)
- [obsidian-sample-plugin GitHub](https://github.com/obsidianmd/obsidian-sample-plugin) - HIGH confidence (official reference template)

---
*Architecture research for: Obsidian Active Recall Plugin*
*Researched: 2026-03-09*
