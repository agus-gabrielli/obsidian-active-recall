---
phase: 08-multi-provider-llm-dispatch
plan: 02
status: complete
started: 2026-03-21
completed: 2026-03-21
---

## Summary

Built and human-verified the plugin with all three LLM providers in Obsidian. During live testing, discovered and fixed three issues: classifyError missing coverage for 400 billing errors and 403 permission errors (both fell through to a misleading "Network error" catch-all), indented callout lines from Gemini output not rendering in Obsidian, and `&` in Mermaid node labels displaying as `&amp;` due to Obsidian's renderer.

## Key Decisions

- D-01: Post-process LLM output rather than relying on prompt compliance for callout indentation - works across all providers
- D-02: Replace `&` with "and" in Mermaid blocks rather than trying to escape it - Obsidian's Mermaid renderer has no way to render a literal ampersand
- D-03: Improved catch-all error message to show provider name and status code instead of "Network error"

## Self-Check: PASSED

- [x] Gemini generation produces valid _self-test.md (PROV-04)
- [x] Claude generation produces valid _self-test.md (PROV-05)
- [x] Error Notices include provider name (PROV-06)
- [x] OpenAI still works (no regression)
- [x] All 91 tests pass
- [x] Production build clean

## Deviations

- Added `postProcessLLMOutput()` function (not in original plan) to fix rendering issues found during live testing
- Added billing/credit error handling for 400 status with credit balance messages
- Added 403 status handling
- Changed catch-all from "Network error" to "{Provider} API error ({status})"

## Key Files

### Created
- (none)

### Modified
- src/generation.ts - postProcessLLMOutput, classifyError improvements, console.error logging
- src/__tests__/generation.test.ts - tests for post-processing and new error cases
