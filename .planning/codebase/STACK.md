# Technology Stack

**Analysis Date:** 2026-03-08

## Languages

**Primary:**
- TypeScript 5.8.3 - All plugin source code in `src/`

**Secondary:**
- JavaScript (ESM) - Build config scripts (`esbuild.config.mjs`, `version-bump.mjs`)
- CSS - Plugin styles (`styles.css`)

## Runtime

**Environment:**
- Node.js 18+ (LTS recommended; CI tests on 20.x and 22.x)
- Target runtime: Obsidian desktop app (Electron) and mobile (iOS/Android)

**Package Manager:**
- npm (required; `package.json` defines all scripts)
- Lockfile: `package-lock.json` present (lockfileVersion 3)

## Frameworks

**Core:**
- Obsidian API (`obsidian` latest) - Plugin host framework; provides `Plugin`, `App`, `Editor`, `MarkdownView`, `Modal`, `Notice`, `PluginSettingTab`, `Setting` classes

**Testing:**
- Not configured - no test framework detected

**Build/Dev:**
- esbuild 0.25.5 - Bundles TypeScript source into single `main.js` output
- TypeScript 5.8.3 - Type checking via `tsc -noEmit`

## Key Dependencies

**Critical:**
- `obsidian` (latest) - Host API; peer dependency provided at runtime by Obsidian app itself; not bundled

**Infrastructure:**
- `esbuild` 0.25.5 - Bundler; entry point `src/main.ts` → `main.js` at plugin root
- `tslib` 2.4.0 - TypeScript helper utilities

## Configuration

**Build:**
- `esbuild.config.mjs` - Bundle config; entry `src/main.ts`, output `main.js`, format CJS, target ES2018
- `tsconfig.json` - Compiler options; baseUrl `src`, target ES6, module ESNext, strict null checks, `DOM` + `ES5/6/7` libs
- `manifest.json` - Obsidian plugin manifest; plugin ID `ai-active-recall`, minAppVersion `0.15.0`
- `versions.json` - Maps plugin version strings to minimum Obsidian app versions

**Linting:**
- `eslint.config.mts` - ESLint flat config using `typescript-eslint` 8.35.1 and `eslint-plugin-obsidianmd` 0.1.9
- `.npmrc` - Sets `tag-version-prefix=""` (bare version tags, no `v` prefix)

**Environment:**
- No `.env` files detected
- No runtime environment variables required (plugin runs inside Obsidian, settings stored via `loadData`/`saveData`)

## Platform Requirements

**Development:**
- Node.js 18+
- npm
- Obsidian desktop app with test vault at `test-vault/`
- Plugin installed to `test-vault/.obsidian/plugins/ai-active-recall/`

**Production:**
- Obsidian desktop or mobile (minAppVersion 0.15.0)
- Release artifacts: `main.js`, `manifest.json`, `styles.css` uploaded as GitHub release assets
- Plugin folder must match `manifest.json` `id` field: `ai-active-recall`

## Dev Scripts

```bash
npm install       # Install dependencies
npm run dev       # Watch mode build (inline sourcemaps, no minification)
npm run build     # Production build (tsc check + esbuild, minified, no sourcemaps)
npm run lint      # Run eslint on source
npm run version   # Bump version in manifest.json and versions.json
```

---

*Stack analysis: 2026-03-08*
