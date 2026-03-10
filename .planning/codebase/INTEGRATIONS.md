# External Integrations

**Analysis Date:** 2026-03-08

## APIs & External Services

**None currently integrated.**

The plugin is a scaffold (sample plugin template) and does not yet contain feature implementation. No external API calls, SDKs, or third-party services are present in `src/main.ts` or `src/settings.ts`.

The `AGENTS.md` guidance notes that future AI features (implied by the plugin name "AI Active Recall") must:
- Default to local/offline operation
- Require explicit user opt-in for any external service calls
- Disclose all external services in `README.md` and settings UI
- Never send vault contents without consent

## Data Storage

**Databases:**
- None - No database client detected

**Plugin Settings:**
- Obsidian's built-in `loadData`/`saveData` API
- Persisted to `data.json` (gitignored) inside the plugin folder at runtime
- Settings interface defined in `src/settings.ts`

**File Storage:**
- Obsidian vault filesystem (accessed via Obsidian API) - No direct filesystem calls outside vault

**Caching:**
- None

## Authentication & Identity

**Auth Provider:**
- None currently
- Future AI integration would require storing an API key; `src/settings.ts` shows the pattern for a user-configurable string field

## Monitoring & Observability

**Error Tracking:**
- None

**Logs:**
- `console.log` used directly (example interval in `src/main.ts` line 69)
- No structured logging library

## CI/CD & Deployment

**Hosting:**
- GitHub Releases - Release artifacts (`main.js`, `manifest.json`, `styles.css`) attached as individual assets
- Obsidian Community Plugin catalog (future submission)

**CI Pipeline:**
- GitHub Actions - `.github/workflows/lint.yml`
  - Trigger: push and pull_request on all branches
  - Matrix: Node.js 20.x and 22.x
  - Steps: `npm ci` → `npm run build` → `npm run lint`

## Environment Configuration

**Required env vars:**
- None - plugin runs entirely within Obsidian's runtime; no server-side process

**Secrets location:**
- No secrets currently; future API keys would be stored in Obsidian's `data.json` via `saveData`, entered by the user in the plugin settings tab

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Obsidian Platform APIs Used

These are not external integrations but are host platform APIs consumed by the plugin:

- `Plugin.addRibbonIcon` - Adds left sidebar icon
- `Plugin.addStatusBarItem` - Adds bottom status bar text
- `Plugin.addCommand` - Registers command palette entries
- `Plugin.addSettingTab` - Registers settings UI tab
- `Plugin.registerDomEvent` - Attaches DOM event listeners with auto-cleanup
- `Plugin.registerInterval` - Registers intervals with auto-cleanup
- `Plugin.loadData` / `Plugin.saveData` - Persists plugin settings to `data.json`
- `App.workspace.getActiveViewOfType` - Queries active editor view

---

*Integration audit: 2026-03-08*
