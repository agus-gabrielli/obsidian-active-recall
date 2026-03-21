# Phase 7: Provider Settings and Migration - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can select and configure any of three LLM providers (OpenAI, Gemini, Claude) in settings with per-provider API key fields and model dropdowns; existing v1.0 users' OpenAI keys are preserved automatically on first load. This phase is settings/config only - actual API calls to Gemini and Claude happen in Phase 8.

</domain>

<decisions>
## Implementation Decisions

### Settings UI layout
- Provider dropdown at top of Connection section; below it, show only the active provider's API key field and model dropdown
- Switching providers calls `this.display()` to instantly re-render with the new provider's fields (same pattern as custom model toggle in Phase 6)
- API key placeholder is provider-specific: `sk-...` for OpenAI, `AIza...` for Gemini, `sk-ant-...` for Claude
- Model dropdown description updates per provider (e.g., "OpenAI model to use" / "Gemini model to use" / "Claude model to use")
- Provider dropdown labels: "OpenAI", "Gemini", "Claude (Anthropic)"

### Curated model lists
- OpenAI: keep existing list (gpt-5.4, gpt-5.4-mini, gpt-5.4-nano, gpt-4.1, gpt-4.1-mini, gpt-4.1-nano, gpt-4o, gpt-4o-mini)
- Gemini: gemini-2.5-pro, gemini-2.5-flash, gemini-2.0-flash, gemini-2.0-flash-lite
- Claude: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5
- All three providers get the "Custom model..." option at the bottom (same Phase 6 pattern)
- Default models for new selections: OpenAI = gpt-5.4-mini (existing), Gemini = gemini-2.5-flash, Claude = claude-sonnet-4-6

### Migration experience
- Silent migration - no notice or notification shown to the user
- Migration logic: if flat `apiKey` exists and `openai.apiKey` does not, copy flat `apiKey` and `model` to `openai.apiKey` and `openai.model`
- Custom model strings are preserved exactly as-is (no mapping to curated list)
- Old flat fields (`apiKey`, `model`) are cleaned up from data.json on next save
- Migration must be the first code change applied during settings load

### Settings data shape
- `LLMProvider = 'openai' | 'gemini' | 'anthropic'` (internal key is `'anthropic'`, not `'claude'`)
- Nested `ProviderConfig { apiKey: string; model: string }` per provider
- No custom endpoint/baseUrl field - out of scope for v2.0
- Settings interface shape:
  ```typescript
  interface ActiveRecallSettings {
    provider: LLMProvider;
    openai:    { apiKey: string; model: string };
    gemini:    { apiKey: string; model: string };
    anthropic: { apiKey: string; model: string };
    language: string;
    generateHints: boolean;
    generateReferenceAnswers: boolean;
    generateConceptMap: boolean;
    customInstructions: string;
  }
  ```

### Claude's Discretion
- Exact migration timing within loadSettings() flow
- Whether to use a shared `ProviderConfig` interface or inline the shape
- How to structure the per-provider curated model lists (const arrays vs config object)
- CSS adjustments for provider-specific field rendering (if any needed)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` - Core value proposition, constraints, key decisions including NoteSource abstraction
- `.planning/REQUIREMENTS.md` - PROV-01, PROV-02, PROV-03, PROV-07 are this phase's requirements

### Prior phase context
- `.planning/phases/06-refinements-and-improvements/06-CONTEXT.md` - Phase 6 established model dropdown pattern with curated list + custom model option

### Architecture decisions from research
- `.planning/STATE.md` "Key Architecture Decisions" and "Critical Pitfalls for v2.0" sections - nested ProviderConfig schema, migration check priority, Anthropic header requirements, Gemini response shape

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/settings.ts` - `ActiveRecallSettingTab.display()` with existing dropdown, text, toggle patterns; `CURATED_MODELS` array and `CUSTOM_MODEL_VALUE` constant to replicate per provider
- `src/settings.ts` - `LLMProvider` type already exists (currently `'openai'` only) - expand to union
- `src/generation.ts` - `callLLM()` function currently hardcoded to OpenAI - Phase 8 will refactor this, Phase 7 just changes settings

### Established Patterns
- Settings re-render: `this.display()` called on dropdown change (used by model dropdown custom toggle in Phase 6)
- Password field: `text.inputEl.type = 'password'` for API key masking
- Settings persistence: `this.plugin.saveSettings()` called in every `onChange` handler
- Obsidian `Setting` API: `.addDropdown()`, `.addText()`, `.addToggle()`, `.addTextArea()` all in use

### Integration Points
- `src/settings.ts` - Main file to modify: expand interface, add per-provider config, update display()
- `src/generation.ts` - Reads `settings.apiKey` and `settings.model` - must update to read from `settings[settings.provider].apiKey` and `settings[settings.provider].model`
- `src/main.ts` - `loadSettings()` where migration logic must run before any other settings access
- `src/sidebar.ts` - References `settings.apiKey` for validation checks (if any)

</code_context>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

- Custom endpoint/baseUrl per provider - out of scope for v2.0 (per REQUIREMENTS.md)
- Dynamic model list from API calls - rejected in Phase 6, remains deferred
- Older Claude models (3.5 Sonnet, 3.5 Haiku) in curated list - can add if users request

</deferred>

---

*Phase: 07-provider-settings-and-migration*
*Context gathered: 2026-03-21*
