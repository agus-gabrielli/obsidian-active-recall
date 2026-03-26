# Phase 8: Multi-Provider LLM Dispatch - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Plugin routes generation calls to the correct provider API (OpenAI, Gemini, or Claude) based on the active settings selection, with provider-specific error messages when calls fail. Settings UI and provider config are already complete (Phase 7). This phase wires up the actual API calls.

</domain>

<decisions>
## Implementation Decisions

### Error messages
- **D-01:** Swap the provider name into existing error templates - no help links, no provider-specific guidance. "Gemini API key invalid", "Claude service error", etc.
- **D-02:** `classifyError()` takes the provider name as a parameter and interpolates it into messages that currently say "OpenAI"

### Gemini safety blocks
- **D-03:** When Gemini returns empty candidates due to safety filters, show a plain Notice telling the user their content was blocked by Gemini's safety filters
- **D-04:** No retry, no workaround suggestion - just inform the user what happened

### Truncation warnings
- **D-05:** Same truncation Notice across all three providers - "Warning: response may be truncated due to token limit."
- **D-06:** No provider name in the truncation warning (it's the same situation regardless of provider)

### Claude's Discretion
- Provider adapter structure (separate functions, switch statement, etc.)
- `callLLM()` signature refactor (how provider routing is passed in)
- Anthropic `max_tokens` value selection
- Gemini request body shape and `generationConfig` parameters
- Test structure for the new provider adapters

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project context
- `.planning/PROJECT.md` - Core value, constraints, requestUrl() requirement
- `.planning/REQUIREMENTS.md` - PROV-04, PROV-05, PROV-06 are this phase's requirements

### Prior phase context
- `.planning/phases/07-final-release-recreate-the-1-0-0-github-release-with-updated-assets-then-open-the-store-submission-pr-essentially-absorbs-05-03-task-3-a-fresh-build/07-CONTEXT.md` - Settings shape, provider config, PROVIDER_CONFIG structure

### Architecture decisions from research
- `.planning/STATE.md` "Critical Pitfalls for v2.0" section - Anthropic header requirements (`x-api-key`, `anthropic-version`), Gemini response shape (`candidates[0].content.parts[0].text`), Gemini 2.5 `MAX_TOKENS` bug, safety block detection

### Existing code to modify
- `src/generation.ts` - `callLLM()` (lines 130-161), `classifyError()` (lines 117-128), `GenerationService.generate()` (lines 180-231)
- `src/settings.ts` - `PROVIDER_CONFIG`, `LLMProvider` type, `ActiveRecallSettings` interface (read-only for this phase)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `callLLM(apiKey, model, messages)` - Current OpenAI implementation to use as the baseline adapter pattern
- `classifyError(status, apiError?)` - Error classification to extend with provider parameter
- `LLMError` class - Reuse for all providers (status + apiError shape)
- `PROVIDER_CONFIG` in settings.ts - Provider metadata (label, models) available for error message interpolation
- `requestUrl()` from Obsidian API - Already used for OpenAI, same for Gemini and Claude

### Established Patterns
- `requestUrl({ url, method, headers, body, throw: false })` with manual status check - same pattern for all providers
- `new Notice(msg)` for user-facing errors and warnings
- `response.json` for parsing API responses
- TDD flow: stub tests first, then implement (Phases 3-4 pattern)

### Integration Points
- `GenerationService.generate()` calls `callLLM()` - the dispatch point where provider routing happens
- `settings[settings.provider]` already provides `apiKey` and `model` - Phase 7 wired this
- `buildMessages()` produces `{role, content}[]` - OpenAI/Claude use similar message formats; Gemini uses `contents` array with `parts`

</code_context>

<specifics>
## Specific Ideas

No specific requirements - open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope

</deferred>

---

*Phase: 08-multi-provider-llm-dispatch*
*Context gathered: 2026-03-21*
