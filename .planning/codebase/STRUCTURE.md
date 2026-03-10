# Codebase Structure

**Analysis Date:** 2026-03-08

## Repository Layout

The repository root is a test vault that hosts the plugin under development. The plugin source lives in `test-vault/.obsidian/plugins/ai-active-recall/`.

```
self-test-obsidian-plugin/          # Repo root
├── .planning/                      # GSD planning docs (not shipped)
│   └── codebase/                   # Codebase analysis documents
├── test-vault/                     # Obsidian vault used for local dev/testing
│   ├── .obsidian/
│   │   └── plugins/
│   │       ├── ai-active-recall/   # The plugin being developed (main source)
│   │       └── hot-reload/         # Dev utility plugin (not authored here)
│   └── AI General/                 # Sample vault notes
```

## Plugin Directory Layout

```
ai-active-recall/                   # Plugin root (must match manifest "id")
├── src/                            # TypeScript source (the only place to write code)
│   ├── main.ts                     # Plugin entry point and lifecycle
│   └── settings.ts                 # Settings types, defaults, and settings tab UI
├── .github/
│   └── workflows/
│       └── lint.yml                # CI: build + lint on push/PR (Node 20.x, 22.x)
├── AGENTS.md                       # Agent/developer instructions and conventions
├── esbuild.config.mjs              # Build/watch configuration
├── eslint.config.mts               # ESLint config (typescript-eslint + obsidianmd plugin)
├── manifest.json                   # Obsidian plugin metadata (id, version, minAppVersion)
├── package.json                    # npm scripts and dependencies
├── package-lock.json               # Lockfile
├── styles.css                      # Plugin CSS (currently empty placeholder)
├── tsconfig.json                   # TypeScript compiler config (baseUrl: "src")
├── version-bump.mjs                # Version bumping utility script
└── versions.json                   # Maps plugin version -> minimum Obsidian app version
```

**Generated (not committed):**
- `main.js` - Bundled output loaded by Obsidian; produced by `npm run build` or `npm run dev`
- `data.json` - Persisted settings written by Obsidian at runtime (gitignored)

## Directory Purposes

**`src/`:**
- Purpose: All TypeScript source files. The only directory that should contain authored code.
- Contains: Plugin class, settings, and all future feature modules
- Key files: `src/main.ts`, `src/settings.ts`

**`.github/workflows/`:**
- Purpose: CI pipeline definitions
- Contains: `lint.yml` - runs `npm run build` and `npm run lint` on all branches

**`test-vault/`:**
- Purpose: A real Obsidian vault for manual testing during development
- Contains: The compiled plugin output under `.obsidian/plugins/ai-active-recall/`
- Not part of the plugin's npm package; used only for local dev

## Key File Locations

**Entry Points:**
- `src/main.ts`: Plugin lifecycle - the default export `MyPlugin` class is what Obsidian loads

**Configuration:**
- `manifest.json`: Plugin metadata required by Obsidian (id, name, version, minAppVersion)
- `tsconfig.json`: TypeScript config; `baseUrl` is set to `src/`, enabling bare imports within `src/`
- `esbuild.config.mjs`: Build config; entry is `src/main.ts`, output is `main.js` at plugin root
- `eslint.config.mts`: Linting rules using `typescript-eslint` and `eslint-plugin-obsidianmd`

**Core Logic:**
- `src/main.ts`: Plugin class, command registrations, modal class
- `src/settings.ts`: Settings interface, defaults, settings tab UI

**Testing:**
- No automated tests present. Testing is manual: copy build artifacts to the vault and enable the plugin in Obsidian.

## Naming Conventions

**Files:**
- `kebab-case` for multi-word filenames: `esbuild.config.mjs`, `version-bump.mjs`
- Single-word files use no separator: `settings.ts`, `main.ts`
- AGENTS.md convention: project instructions in UPPERCASE filename

**Directories:**
- Lowercase with no separator for feature groupings: `commands/`, `ui/`, `utils/` (prescribed in AGENTS.md; not yet created)

**Classes:**
- PascalCase: `MyPlugin`, `SampleModal`, `SampleSettingTab`

**Interfaces and types:**
- PascalCase: `MyPluginSettings`

**Constants:**
- SCREAMING_SNAKE_CASE: `DEFAULT_SETTINGS`

**Functions and methods:**
- camelCase: `onload`, `loadSettings`, `saveSettings`

## Where to Add New Code

**New command:**
- Implementation: create `src/commands/<command-name>.ts`
- Registration: import and call from `src/main.ts` in `onload()` via a `registerCommands(this)` helper pattern
- See AGENTS.md "Organize code across multiple files" for the canonical pattern

**New modal or view:**
- Implementation: `src/ui/<modal-name>.ts` or `src/ui/<view-name>.ts`
- Import into `src/main.ts` where the command that opens it is registered

**New settings field:**
- Type: add property to `MyPluginSettings` interface in `src/settings.ts`
- Default: add property to `DEFAULT_SETTINGS` in `src/settings.ts`
- UI: add a `new Setting(containerEl)` block in `SampleSettingTab.display()` in `src/settings.ts`

**Shared utilities:**
- `src/utils/helpers.ts` or `src/utils/constants.ts` (directories must be created)

**TypeScript types shared across modules:**
- `src/types.ts`

## Special Directories

**`node_modules/`:**
- Purpose: npm dependency installation
- Generated: Yes
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: GSD planning and codebase analysis documents
- Generated: No (human/agent authored)
- Committed: Yes

**`test-vault/`:**
- Purpose: Local Obsidian vault for manual plugin testing
- Generated: No
- Committed: Yes (the vault structure is part of the dev setup)

---

*Structure analysis: 2026-03-08*
