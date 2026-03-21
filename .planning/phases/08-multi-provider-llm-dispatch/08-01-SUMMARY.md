---
phase: 08-multi-provider-llm-dispatch
plan: 01
subsystem: generation
tags: [tdd, multi-provider, gemini, anthropic, api-adapters]
dependency_graph:
  requires: [src/settings.ts (LLMProvider, PROVIDER_CONFIG types)]
  provides: [callGemini, callAnthropic, callLLM dispatcher, provider-aware classifyError]
  affects: [GenerationService.generate()]
tech_stack:
  added: []
  patterns: [adapter pattern per provider, switch-based dispatcher, provider-param default]
key_files:
  created: []
  modified:
    - src/generation.ts
    - src/__tests__/generation.test.ts
    - src/__mocks__/obsidian.ts
decisions:
  - callGemini and callAnthropic are private module functions - tests use them through callLLM dispatcher
  - classifyError default provider is 'OpenAI' to preserve backwards-compatible message format
  - Notice mock changed to jest.fn() to enable call tracking in tests
  - Gemini safety block detected by empty candidates array (not finishReason SAFETY)
metrics:
  duration: "~10 minutes"
  completed: "2026-03-21"
  tasks_completed: 2
  files_modified: 3
---

# Phase 08 Plan 01: Multi-Provider LLM Adapters Summary

Gemini and Anthropic API adapters added to generation.ts via TDD, callLLM refactored into a multi-provider dispatcher routing by provider string, and classifyError made provider-aware with interpolated 401 and 500 messages.

## Tasks Completed

| Task | Type | Commit | Description |
|------|------|--------|-------------|
| 1 | RED | 631a142 | Failing tests for PROV-04, PROV-05, PROV-06, provider dispatch, and error label |
| 2 | GREEN | 5962e97 | callGemini, callAnthropic adapters, callLLM dispatcher, classifyError provider param |

## What Was Built

**callGemini** (private) - sends to `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`, separates system message as `system_instruction.parts[0].text`, maps user messages to `{ role: 'user', parts: [{ text }] }`, handles empty candidates as safety block, handles `MAX_TOKENS` with content (truncation warning), handles `MAX_TOKENS` without content (Gemini 2.5 bug - throws Empty response).

**callAnthropic** (private) - sends to `https://api.anthropic.com/v1/messages` with `x-api-key` and `anthropic-version: 2023-06-01` headers, sends system message as top-level `system` field, includes `max_tokens: 8192`, handles `stop_reason: max_tokens` truncation warning.

**callLLM** (public) - dispatcher with `provider: LLMProvider` as first param, switch routes to callGemini/callAnthropic/callOpenAI.

**classifyError** - `provider = 'OpenAI'` default, 401 returns `${provider} API key invalid. Check your key in Settings.`, 500+ returns `${provider} service error. Please try again later.`.

**GenerationService** - all 3 callLLM call sites updated to pass `this.settings.provider` first, catch block reads `PROVIDER_CONFIG[this.settings.provider].label` for classifyError.

## Test Coverage

- 35 generation tests passing (up from 25)
- 84 total tests across all suites, 0 failures
- 0 TypeScript errors

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript error in test file - array access possibly undefined**
- **Found during:** Task 2 GREEN verification (npx tsc --noEmit)
- **Issue:** `body.contents[0].role` flagged as `Object is possibly 'undefined'` since array element access returns `T | undefined` in strict mode
- **Fix:** Added `!` non-null assertion: `body.contents[0]!.role`
- **Files modified:** src/__tests__/generation.test.ts
- **Commit:** 5962e97

## Known Stubs

None - all adapters make real HTTP calls via requestUrl, extraction paths are fully implemented.

## Self-Check: PASSED

- `src/generation.ts` exists and contains callGemini, callAnthropic, callOpenAI, callLLM dispatcher
- `src/__tests__/generation.test.ts` contains all required describe blocks
- Commits 631a142 and 5962e97 exist in git log
- 84 tests pass, 0 TS errors
