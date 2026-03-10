# Phase 2: Settings - Context

**Gathered:** 2026-03-09
**Status:** Ready for planning

<domain>
## Phase Boundary

Full settings tab where users configure LLM provider, API key, model, output language, output toggles (hints, reference answers, concept map), and custom instructions. All values persist across Obsidian restarts via loadData/saveData. No generation logic, no UI panels - settings only.

</domain>

<decisions>
## Implementation Decisions

### Settings interface
- `ActiveRecallSettings` interface gets all fields populated in this phase (currently empty `{}`)
- `DEFAULT_SETTINGS` populated with sensible defaults: OpenAI provider, `gpt-4o-mini` model, empty API key, empty language (auto-detect), all toggles `true`, empty custom instructions
- Smoke test in `onload()` removed as part of this phase

### Tab layout
- Two sections using Obsidian's `Setting` API: **Connection** and **Output**
- **Connection**: Provider (disabled dropdown), API key (password text), Model (text input)
- **Output**: Language (text input), Hint toggle, Reference answer toggle, Concept map toggle, Custom instructions (text area)
- Section headers via `containerEl.createEl('h3', { text: '...' })`

### Provider field
- Show a dropdown locked to "OpenAI" with `setDisabled(true)` - visually signals more providers are coming
- Small description below: "Additional providers (Anthropic, custom endpoint) will be available in a future version."
- Provider stored as a string enum in settings for when v2 adds options

### API key field
- Password input (`.inputEl.type = 'password'`) so the key is masked
- Description text below: "Stored in data.json inside your vault. Do not commit this file to a public git repository."
- No dismissable banner - inline text is sufficient and stays visible as a reminder

### Model field
- Free text input, default `gpt-4o-mini`
- Placeholder shows the default so users know what to expect if they clear the field
- No dropdown - model names change frequently and a text input lets users use any OpenAI-compatible model name

### Language field
- Free text input, default empty string
- Description: "Leave empty to match the language of your notes automatically. Enter a language name (e.g. 'Spanish', 'Japanese') to override."
- No fixed dropdown - users may write notes in any language

### Output toggles
- Three separate toggle settings: Generate hints, Generate reference answers, Generate concept map
- All default `true`
- Each toggle saves immediately via `saveSettings()` in `onChange`

### Custom instructions
- Textarea (multiline text input using `.inputEl.tagName = 'TEXTAREA'` or Obsidian's text component with class override)
- Placeholder: "Optional. Appended to the LLM prompt. Example: 'Focus on practical applications.'"
- Saves on `blur` (not on every keystroke) to avoid excessive `saveData` calls

### Claude's Discretion
- Exact CSS/styling for section headers
- Whether to show a "Save" button or rely on per-field onChange/onBlur saves (Obsidian convention is the latter)
- Order of toggles within the Output section

</decisions>

<specifics>
## Specific Ideas

No specific requirements - open to standard Obsidian settings tab patterns.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/settings.ts`: `ActiveRecallSettings` interface (empty, ready to fill), `DEFAULT_SETTINGS` (empty `{}`), `ActiveRecallSettingTab.display()` stub (empty, ready to implement)
- `src/main.ts`: `loadSettings()` / `saveSettings()` already wired - no changes needed to persistence pattern
- `manifest.json`: Already correct, no changes needed

### Established Patterns
- Persistence: `this.loadData()` / `this.saveData()` - already established in Phase 1
- Obsidian settings API: `new Setting(containerEl).setName().setDesc().addText()` etc.
- All Obsidian packages external in esbuild - import from `'obsidian'` directly

### Integration Points
- `src/main.ts` `onload()`: Remove smoke test block; `addSettingTab()` call already present
- `src/settings.ts`: All changes in this phase live here - interface, defaults, and tab display
- Phase 3 reads `this.plugin.settings` for API key, model, provider, toggles, and custom instructions - field names established here become the contract for Phase 3

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 02-settings*
*Context gathered: 2026-03-09*
