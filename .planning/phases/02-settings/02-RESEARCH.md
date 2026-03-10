# Phase 2: Settings - Research

**Researched:** 2026-03-09
**Domain:** Obsidian Plugin Settings API (`PluginSettingTab`, `Setting`, component classes)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- `ActiveRecallSettings` interface gets all fields populated in this phase (currently empty `{}`)
- `DEFAULT_SETTINGS` populated with sensible defaults: OpenAI provider, `gpt-4o-mini` model, empty API key, empty language (auto-detect), all toggles `true`, empty custom instructions
- Smoke test in `onload()` removed as part of this phase
- Two sections using Obsidian's `Setting` API: **Connection** and **Output**
- **Connection**: Provider (disabled dropdown), API key (password text), Model (text input)
- **Output**: Language (text input), Hint toggle, Reference answer toggle, Concept map toggle, Custom instructions (text area)
- Section headers via `containerEl.createEl('h3', { text: '...' })` (or `Setting.setHeading()` - see Architecture Patterns)
- Provider shown as dropdown locked to "OpenAI" with `setDisabled(true)`
- Provider description: "Additional providers (Anthropic, custom endpoint) will be available in a future version."
- Provider stored as a string enum in settings
- API key: password input (`.inputEl.type = 'password'`)
- API key description: "Stored in data.json inside your vault. Do not commit this file to a public git repository."
- No dismissable banner - inline description text is sufficient
- Model: free text input, default `gpt-4o-mini`, placeholder shows the default
- Language: free text input, default empty string
- Language description: "Leave empty to match the language of your notes automatically. Enter a language name (e.g. 'Spanish', 'Japanese') to override."
- Three separate toggle settings: Generate hints, Generate reference answers, Generate concept map - all default `true`
- Each toggle saves immediately via `saveSettings()` in `onChange`
- Custom instructions: textarea (via `addTextArea`)
- Custom instructions placeholder: "Optional. Appended to the LLM prompt. Example: 'Focus on practical applications.'"
- Custom instructions saves on `blur` (not on every keystroke)

### Claude's Discretion

- Exact CSS/styling for section headers
- Whether to show a "Save" button or rely on per-field onChange/onBlur saves (Obsidian convention is the latter)
- Order of toggles within the Output section

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SET-01 | User can configure LLM provider (OpenAI in v1; interface abstracted for future providers) | Dropdown component with `setDisabled(true)`, string enum type in interface |
| SET-02 | User can enter and save their API key (masked password field) with a visible warning about Git exposure risk | `addText` + `.inputEl.type = 'password'` + `setDesc()` for inline warning |
| SET-03 | User can select the model (text input, defaults to `gpt-4o-mini`) | `addText` with `setValue` + `setPlaceholder` |
| SET-04 | User can select output language (dropdown or text; default: match notes) | `addText` with empty string default and descriptive `setDesc()` |
| SET-05 | User can toggle hint generation on/off (default: on) | `addToggle` with `setValue(true)` + `onChange` calling `saveSettings()` |
| SET-06 | User can toggle reference answer generation on/off (default: on) | Same toggle pattern as SET-05 |
| SET-07 | User can toggle concept map generation on/off (default: on) | Same toggle pattern as SET-05 |
| SET-08 | User can provide custom instructions appended to LLM prompt (text area, optional) | `addTextArea` + `inputEl` `blur` event listener calling `saveSettings()` |
</phase_requirements>

---

## Summary

Phase 2 is a pure UI/settings phase. All work lives in `src/settings.ts`. The Obsidian `Setting` class is the sole building block - it wraps a label, description, and one or more input components into a single row. The persistence layer (`loadData`/`saveData`) is already wired in `main.ts` from Phase 1 and needs no changes.

The critical technical decisions are already locked. The two things that need careful handling are: (1) making the password field work correctly (requires mutating `inputEl.type` after the component is created, not a built-in API option), and (2) making the textarea save on blur rather than on every keystroke (requires a native `addEventListener('blur', ...)` call since `onChange` fires on every keystroke for text areas).

Section headers can use either `containerEl.createEl('h3', ...)` or the newer `Setting.setHeading()` approach (available since Obsidian 0.9.16). The `setHeading()` approach is more idiomatic and produces consistent styling with no manual CSS needed.

**Primary recommendation:** Use `Setting.setHeading()` for section headers (more idiomatic than raw `createEl`). Use `addTextArea` with a native `blur` listener for custom instructions. Use `addText` with `.inputEl.type = 'password'` for the API key.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| obsidian | latest (in package.json) | `Setting`, `PluginSettingTab`, all component classes | The only available API for Obsidian plugin UI; no alternatives exist |

No additional npm packages are needed for this phase. All UI building blocks are in the `obsidian` package.

**Import pattern:**
```typescript
import { App, PluginSettingTab, Setting } from 'obsidian';
```

---

## Architecture Patterns

### Recommended File Structure

All changes in this phase are in one file:

```
src/
├── main.ts          # Remove smoke test block only
└── settings.ts      # ALL changes: interface, defaults, display() implementation
```

### Pattern 1: Section Headers with setHeading()

**What:** Use `new Setting(containerEl).setName('Section Name').setHeading()` instead of `containerEl.createEl('h3', ...)`.

**When to use:** Every time a new section starts. `setHeading()` produces the standard Obsidian section divider with consistent styling.

**Source:** `obsidian.d.ts` line 5331 - `setHeading(): this` available since 0.9.16.

```typescript
// Source: obsidian.d.ts - Setting.setHeading()
new Setting(containerEl).setName('Connection').setHeading();
new Setting(containerEl).setName('Output').setHeading();
```

Note: The CONTEXT.md mentions `containerEl.createEl('h3', ...)` as a possible approach. Both work. `setHeading()` is more idiomatic for modern Obsidian plugins and requires no manual CSS.

### Pattern 2: Text Input with onChange Save

**What:** Capture value on every change, write to settings object, call `saveSettings()`.

**When to use:** Model field, Language field - any text field where per-keystroke save is acceptable overhead (these are short strings).

```typescript
// Source: obsidian.d.ts - AbstractTextComponent.onChange + setValue + setPlaceholder
new Setting(containerEl)
    .setName('Model')
    .setDesc('OpenAI model name to use for generation.')
    .addText(text => text
        .setPlaceholder('gpt-4o-mini')
        .setValue(this.plugin.settings.model)
        .onChange(async (value) => {
            this.plugin.settings.model = value;
            await this.plugin.saveSettings();
        })
    );
```

### Pattern 3: Password Input for API Key

**What:** Create a text component, then mutate `inputEl.type` to `'password'` inside the `addText` callback. This is NOT a built-in API option - it requires direct DOM mutation.

**When to use:** Any secret/sensitive field.

```typescript
// Source: forum.obsidian.md + obsidian.d.ts AbstractTextComponent.inputEl
new Setting(containerEl)
    .setName('API Key')
    .setDesc('Stored in data.json inside your vault. Do not commit this file to a public git repository.')
    .addText(text => {
        text.inputEl.type = 'password';
        text
            .setPlaceholder('sk-...')
            .setValue(this.plugin.settings.apiKey)
            .onChange(async (value) => {
                this.plugin.settings.apiKey = value;
                await this.plugin.saveSettings();
            });
    });
```

### Pattern 4: Disabled Dropdown for Provider

**What:** Add a dropdown with one option, then call `setDisabled(true)` on it. The `Setting.setDisabled()` disables all child components at once.

**When to use:** Features planned for a future version that need to be visible but not interactive.

```typescript
// Source: obsidian.d.ts - DropdownComponent.addOption + Setting.setDisabled
new Setting(containerEl)
    .setName('Provider')
    .setDesc('Additional providers (Anthropic, custom endpoint) will be available in a future version.')
    .addDropdown(drop => drop
        .addOption('openai', 'OpenAI')
        .setValue(this.plugin.settings.provider)
    )
    .setDisabled(true);
```

### Pattern 5: Toggle with Immediate Save

**What:** `addToggle` with `onChange` that immediately writes to settings and saves.

**When to use:** Boolean toggles where feedback should be instant (user can see state change immediately).

```typescript
// Source: obsidian.d.ts - ToggleComponent.setValue + onChange
new Setting(containerEl)
    .setName('Generate hints')
    .setDesc('Include collapsible hints for each question.')
    .addToggle(toggle => toggle
        .setValue(this.plugin.settings.generateHints)
        .onChange(async (value) => {
            this.plugin.settings.generateHints = value;
            await this.plugin.saveSettings();
        })
    );
```

### Pattern 6: Textarea with Blur Save

**What:** `addTextArea` for multiline input. Register a native `blur` event listener on `inputEl` instead of using `onChange` to avoid saving on every keystroke.

**When to use:** Long-form text where the content may be large (custom instructions, prompts) and per-keystroke saves would be excessive.

```typescript
// Source: obsidian.d.ts - TextAreaComponent.inputEl + AbstractTextComponent.onChange
new Setting(containerEl)
    .setName('Custom instructions')
    .setDesc('Optional. Appended to the LLM prompt.')
    .addTextArea(text => {
        text
            .setPlaceholder("Optional. Appended to the LLM prompt. Example: 'Focus on practical applications.'")
            .setValue(this.plugin.settings.customInstructions);
        text.inputEl.addEventListener('blur', async () => {
            this.plugin.settings.customInstructions = text.getValue();
            await this.plugin.saveSettings();
        });
    });
```

### Anti-Patterns to Avoid

- **Using `createEl('h3', ...)` for headers:** Works but bypasses Obsidian's standard heading style. Use `Setting.setHeading()` instead.
- **Using `onChange` for textarea:** Fires on every keystroke; for long-form text this causes excessive `saveData` calls. Use `blur` listener.
- **Forgetting `containerEl.empty()` at top of `display()`:** Already present in the stub; do not remove it. Without it, settings UI duplicates on every re-open.
- **Importing `Setting` from somewhere other than `'obsidian'`:** All Obsidian packages are external in esbuild config. Import directly from `'obsidian'`.
- **Checking `this.plugin.settings` type safety:** The `Object.assign({}, DEFAULT_SETTINGS, ...)` pattern in `loadSettings()` means any field missing from saved `data.json` gets filled from defaults. This is already implemented correctly in Phase 1 - do not change it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Settings persistence | Custom JSON file read/write | `this.loadData()` / `this.saveData()` | Already wired in `main.ts`; Obsidian handles file path, encoding, atomic writes |
| Input masking | CSS tricks, character replacement | `inputEl.type = 'password'` | Native browser behavior; handles clipboard, screen readers, autofill correctly |
| Section dividers | CSS borders, `<hr>` elements | `Setting.setHeading()` | Matches Obsidian's design system; respects dark/light theme |
| Save button | Manual form submission pattern | Per-field `onChange`/`blur` | Obsidian convention; users expect immediate feedback |

---

## Common Pitfalls

### Pitfall 1: TypeScript Rejects Empty Interface Body

**What goes wrong:** `ActiveRecallSettings` is currently `{}`. Adding fields with no type annotation causes TS errors when assigning `Object.assign({}, DEFAULT_SETTINGS, ...)` because `Partial<ActiveRecallSettings>` won't match.

**Why it happens:** TypeScript strict mode in the project. The `loadSettings` cast `as Partial<ActiveRecallSettings>` works correctly once the interface has fields; the cast allows unknown/missing keys from stored JSON.

**How to avoid:** Define all interface fields before adding them to `DEFAULT_SETTINGS`. Never add a field to `DEFAULT_SETTINGS` without adding it to the interface first.

**Warning signs:** TS error on the `Object.assign` line in `loadSettings()`.

### Pitfall 2: Password Field Loses Its Type on Display Re-render

**What goes wrong:** Every time the settings tab is opened, `display()` is called and `containerEl.empty()` runs. This recreates all DOM elements. If `inputEl.type` is set inside the `addText` callback, it is re-applied each time - this is correct behavior. But if the mutation is done outside the callback (e.g., after the fact), it may be missed.

**Why it happens:** `display()` fully re-renders. All DOM mutations must be inside the component callback.

**How to avoid:** Always set `text.inputEl.type = 'password'` inside the `addText(text => { ... })` callback.

### Pitfall 3: Blur Save Race with Tab Close

**What goes wrong:** User types in the textarea, immediately closes the settings tab without clicking elsewhere. The `blur` event fires when focus leaves the element, but if the tab closes before the async `saveSettings()` completes, the value might not persist.

**Why it happens:** Obsidian calls `hide()` on the tab, which unmounts components. The `blur` event does fire before unmount in practice, but `saveData` is async.

**How to avoid:** This is an acceptable tradeoff - Obsidian's own plugins use the same pattern. The `blur` event fires reliably when the settings panel closes. This is not worth adding a "Save" button to address.

### Pitfall 4: Setting Not Visible in Provider Dropdown Due to Wrong Initial Value

**What goes wrong:** If `DEFAULT_SETTINGS.provider` is set to a string not registered as a `dropdown.addOption()` value, the dropdown appears blank.

**Why it happens:** `DropdownComponent.setValue()` sets the `selectEl.value` to the string; if that string doesn't match any `<option value="...">`, browsers show a blank or the first option unexpectedly.

**How to avoid:** The `provider` enum value in `DEFAULT_SETTINGS` must exactly match the first argument of `addOption(value, display)`. Use `'openai'` (lowercase) as the stored value and verify it matches the `addOption('openai', 'OpenAI')` call.

### Pitfall 5: data.json Exposure

**What goes wrong:** Users may commit `data.json` to a public git repository, exposing their API key.

**Why it happens:** Obsidian stores plugin data at `.obsidian/plugins/ai-active-recall/data.json` inside the vault. If the vault is a git repo and `.obsidian` is not in `.gitignore`, the key leaks.

**How to avoid:** The warning in the API key field description is the correct mitigation. No additional action is needed in code. This is documented behavior.

---

## Code Examples

### Complete settings.ts Structure

```typescript
// src/settings.ts - complete structure for Phase 2
import { App, PluginSettingTab, Setting } from 'obsidian';
import type ActiveRecallPlugin from './main';

export type LLMProvider = 'openai';

export interface ActiveRecallSettings {
    provider: LLMProvider;
    apiKey: string;
    model: string;
    language: string;
    generateHints: boolean;
    generateReferenceAnswers: boolean;
    generateConceptMap: boolean;
    customInstructions: string;
}

export const DEFAULT_SETTINGS: ActiveRecallSettings = {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    language: '',
    generateHints: true,
    generateReferenceAnswers: true,
    generateConceptMap: true,
    customInstructions: '',
};

export class ActiveRecallSettingTab extends PluginSettingTab {
    plugin: ActiveRecallPlugin;

    constructor(app: App, plugin: ActiveRecallPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl).setName('Connection').setHeading();

        // Provider (disabled)
        // API key (password)
        // Model (text)

        new Setting(containerEl).setName('Output').setHeading();

        // Language (text)
        // Generate hints (toggle)
        // Generate reference answers (toggle)
        // Generate concept map (toggle)
        // Custom instructions (textarea)
    }
}
```

### Settings Field Names (Phase 3 Contract)

Phase 3 reads these exact field names from `this.plugin.settings`:

| Field | Type | Default | Phase 3 Usage |
|-------|------|---------|--------------|
| `provider` | `'openai'` | `'openai'` | Selects HTTP endpoint |
| `apiKey` | `string` | `''` | Authorization header |
| `model` | `string` | `'gpt-4o-mini'` | `model` param in API call |
| `language` | `string` | `''` | Appended to prompt if non-empty |
| `generateHints` | `boolean` | `true` | Conditionally include hints in prompt |
| `generateReferenceAnswers` | `boolean` | `true` | Conditionally include answers in prompt |
| `generateConceptMap` | `boolean` | `true` | Conditionally include concept map in prompt |
| `customInstructions` | `string` | `''` | Appended to prompt if non-empty |

These names are the contract between Phase 2 and Phase 3. Do not rename them.

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `containerEl.createEl('h3', ...)` for headers | `Setting.setHeading()` (since 0.9.16) | No manual CSS; respects theme |
| No native password masking API | `inputEl.type = 'password'` DOM mutation | Simple, works, widely used in Obsidian plugins |
| `onChange` for all text saves | `onChange` for short text, `blur` for textarea | Fewer unnecessary `saveData` calls |

**Deprecated/outdated:**
- Rolling your own toggle with `createEl('input', { type: 'checkbox' })`: Use `addToggle()` instead - handles accessibility, theme, animation.

---

## Validation Architecture

`nyquist_validation` is enabled in `.planning/config.json`.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed - no jest, vitest, or pytest config found |
| Config file | None (Wave 0 must create) |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Notes |
|--------|----------|-----------|-------|
| SET-01 | Provider stored as `'openai'` string enum in settings | unit | Can unit-test interface shape and DEFAULT_SETTINGS values |
| SET-02 | API key field is masked + description contains git warning text | manual-only | Requires Obsidian DOM - no headless test runner available without mocking |
| SET-03 | Model defaults to `gpt-4o-mini`, persists across reload | unit (defaults) + manual (persistence) | Default value testable in isolation; persistence requires Obsidian |
| SET-04 | Language defaults to empty string | unit | Testable via DEFAULT_SETTINGS inspection |
| SET-05 | Hint toggle defaults true, saves on change | unit (default) + manual (save) | Toggle behavior requires Obsidian event system |
| SET-06 | Reference answer toggle defaults true, saves on change | same as SET-05 | Same pattern |
| SET-07 | Concept map toggle defaults true, saves on change | same as SET-05 | Same pattern |
| SET-08 | Custom instructions saved on blur, not keystroke | manual-only | Requires live Obsidian event loop |

**Key finding:** The Obsidian plugin environment has no headless test runner in this project. Settings UI behavior (DOM rendering, event handling, persistence) requires a live Obsidian instance. The practical validation strategy is:
- Unit-testable: `DEFAULT_SETTINGS` values and `ActiveRecallSettings` interface shape (these are plain JS objects/types with no Obsidian dependency)
- Manual-verify: All UI behavior, using the existing test-vault with hot-reload

### Sampling Rate

- **Per task commit:** Manual reload in test-vault, verify field displays correctly
- **Per wave merge:** Full settings tab walkthrough in test-vault
- **Phase gate:** All 4 success criteria verified in Obsidian before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] No automated test infrastructure exists. For this phase, unit tests of `DEFAULT_SETTINGS` and interface shape are feasible but require a test framework to be installed (e.g., jest + ts-jest). Given the Phase 2 scope is entirely UI-based and the project has no existing test setup, the cost/benefit of adding a test framework solely for constant value checks is low. **Recommend manual-only verification for Phase 2**, with test infrastructure deferred to a phase with more testable logic (Phase 3 - generation logic).

---

## Open Questions

1. **`setHeading()` vs `createEl('h3', ...)`**
   - What we know: Both work. `setHeading()` is the modern idiomatic approach, verified in `obsidian.d.ts`. CONTEXT.md mentions `createEl('h3', ...)`.
   - What's unclear: Whether visual output differs meaningfully between the two in current Obsidian versions.
   - Recommendation: Use `setHeading()` - it is part of the official API and matches how Obsidian's own settings tabs are built.

2. **Field names as Phase 3 contract**
   - What we know: Phase 3 reads `this.plugin.settings.*` for all generation logic.
   - What's unclear: Whether Phase 3 needs additional settings fields not defined here.
   - Recommendation: The locked field list in CONTEXT.md is complete for v1. No action needed now.

---

## Sources

### Primary (HIGH confidence)

- `node_modules/obsidian/obsidian.d.ts` (local) - `Setting` class (lines 5273-5405), `AbstractTextComponent` (lines 344-385), `DropdownComponent` (lines 1826-1867), `ToggleComponent` (lines 5948-5991), `TextAreaComponent` (line 5790), `PluginSettingTab` (lines 4772-4778)
- `src/settings.ts` (local) - existing stub with `ActiveRecallSettings`, `DEFAULT_SETTINGS`, `ActiveRecallSettingTab`
- `src/main.ts` (local) - `loadSettings()`/`saveSettings()` wiring already in place

### Secondary (MEDIUM confidence)

- [Hide secrets in plugin settings - Obsidian Forum](https://forum.obsidian.md/t/hide-secrets-in-plugin-settings/104420) - confirms `inputEl.type = 'password'` community pattern
- [Working with TextAreaComponent - Obsidian Forum](https://forum.obsidian.md/t/working-with-textareacomponent/72072) - confirms `addTextArea` + `inputEl.style` patterns; `blur` vs `onChange` distinction

### Tertiary (LOW confidence)

- None required - all critical API surface verified directly from type definitions in `node_modules`.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - verified from local `obsidian.d.ts`
- Architecture: HIGH - all patterns verified from type definitions and community confirmation
- Pitfalls: MEDIUM - DOM mutation behavior and blur timing are runtime characteristics not fully verifiable from types alone

**Research date:** 2026-03-09
**Valid until:** 2026-06-09 (Obsidian Settings API is stable; 90-day window reasonable)
