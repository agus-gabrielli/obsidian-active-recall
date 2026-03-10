# Coding Conventions

**Analysis Date:** 2026-03-08

## Naming Patterns

**Files:**
- PascalCase for class-bearing modules: `SampleSettingTab`, `SampleModal`
- camelCase for module files: `settings.ts`, `main.ts`
- kebab-case for command IDs: `open-modal-simple`, `replace-selected`, `open-modal-complex`
- Directories: lowercase, purpose-named (`commands/`, `ui/`, `utils/`)

**Classes:**
- PascalCase: `MyPlugin`, `SampleModal`, `SampleSettingTab`
- Plugin class `extends Plugin` (Obsidian base class)
- Modal class `extends Modal`
- Settings tab class `extends PluginSettingTab`

**Interfaces:**
- PascalCase: `MyPluginSettings`
- Exported from dedicated `settings.ts` module

**Constants:**
- SCREAMING_SNAKE_CASE for exported defaults: `DEFAULT_SETTINGS`
- Exported alongside their interface from `settings.ts`

**Functions:**
- camelCase: `loadSettings`, `saveSettings`, `onload`, `onunload`
- Obsidian lifecycle hooks use lowercase: `onload()`, `onunload()`, `onOpen()`, `onClose()`

**Variables:**
- camelCase: `statusBarItemEl`, `markdownView`, `contentEl`
- Destructuring used for DOM element access: `const {contentEl} = this`
- `let` for reassignable, `const` for stable references

## Code Style

**Formatting:**
- EditorConfig enforced (`.editorconfig` at plugin root)
- Indentation: tabs, width 4
- Line endings: LF
- Charset: UTF-8
- Final newline required on all files

**Linting:**
- Tool: ESLint with `typescript-eslint` and `eslint-plugin-obsidianmd`
- Config: `eslint.config.mts` (flat config format)
- Obsidian-specific rules from `obsidianmd.configs.recommended`
- Browser globals declared (no Node globals assumed)
- TypeScript parser with project service enabled

**TypeScript Strictness:**
- `noImplicitAny: true`
- `noImplicitThis: true`
- `noImplicitReturns: true`
- `strictNullChecks: true`
- `strictBindCallApply: true`
- `noUncheckedIndexedAccess: true`
- `useUnknownInCatchVariables: true`
- `isolatedModules: true`

## Import Organization

**Order:**
1. Obsidian SDK imports (named imports from `'obsidian'`)
2. Local module imports (relative paths with `./`)

**Style:**
- Named imports using curly braces: `import {App, Editor, MarkdownView, Modal, Notice, Plugin} from 'obsidian'`
- Local imports use named + default: `import {DEFAULT_SETTINGS, MyPluginSettings, SampleSettingTab} from "./settings"`
- No path aliases configured; use relative `./` paths from `src/` as base URL

**Path Aliases:**
- `baseUrl` set to `src/` in tsconfig - imports within `src/` can omit the `src/` prefix

## Error Handling

**Patterns:**
- `async/await` preferred over promise chains (per AGENTS.md)
- Settings loading uses safe merge: `Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>)`
- Type cast with `Partial<T>` to safely handle missing or partial persisted data
- No explicit try/catch in current source - error handling delegated to Obsidian's framework

## Logging

**Framework:** `console.log` directly (no logging abstraction)

**Patterns:**
- Interval debug logging pattern: `console.log('setInterval')` in sample
- Production code should avoid console logging unless debugging

## Comments

**When to Comment:**
- Inline comments explaining non-obvious Obsidian API behavior
- Block comments for logical sections in `onload` (e.g., "This creates an icon...")
- Comments document the "why" for Obsidian-specific patterns

**Style:**
- Single-line `//` comments
- No JSDoc observed in source (sample code does not use TSDoc annotations)

## Function Design

**Size:** Keep `onload` focused; delegate feature logic to imported modules per AGENTS.md guidance

**Plugin Lifecycle:**
- `onload()` - async, registers all commands/events/intervals
- `onunload()` - sync, left empty (cleanup handled by `register*` helpers)
- `loadSettings()` - async, merges persisted data with defaults
- `saveSettings()` - async, calls `this.saveData`

**Modal Lifecycle:**
- `onOpen()` - populates `contentEl`
- `onClose()` - empties `contentEl` to avoid memory leaks

**Parameters:** Typed with explicit Obsidian API types (`Editor`, `MarkdownView`, `MouseEvent`)

## Module Design

**Exports:**
- Default export for main plugin class: `export default class MyPlugin`
- Named exports for interfaces, constants, and settings classes from `settings.ts`
- `settings.ts` exports: interface, constant, and class together

**Barrel Files:** Not present yet - planned as project grows

**Recommended Future Structure (from AGENTS.md):**
```
src/
  main.ts           # Plugin lifecycle only
  settings.ts       # Interface, defaults, settings tab
  commands/         # One file per command group
  ui/               # Modals, views, custom components
  utils/            # Helpers, constants
  types.ts          # Shared TypeScript types
```

## Obsidian-Specific Patterns

**Settings Persistence:**
```typescript
async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<MyPluginSettings>);
}
async saveSettings() {
    await this.saveData(this.settings);
}
```

**Safe Listener Registration:**
- Always use `this.registerEvent(...)` for workspace events - not raw `.on()`
- Always use `this.registerDomEvent(...)` for DOM events - not `addEventListener`
- Always use `this.registerInterval(...)` for intervals - not `setInterval` directly
- These helpers auto-cleanup on plugin unload

**Command Registration:**
- `callback` for simple commands
- `editorCallback` for editor-context commands
- `checkCallback` for conditional commands (check `checking` param before executing)
- Command IDs use kebab-case and must remain stable after release

**UI Text:**
- Sentence case for all headings, names, and descriptions
- Action-oriented imperative language
- Short, jargon-free strings

---

*Convention analysis: 2026-03-08*
