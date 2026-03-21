---
phase: 08-multi-provider-llm-dispatch
verified: 2026-03-21T00:00:00Z
status: human_needed
score: 6/8 must-haves verified (automated); 2/8 require human confirmation
human_verification:
  - test: "Gemini end-to-end generation"
    expected: "With a valid Google AI Studio key selected, generating self-test for a 2-3 note folder produces a valid _self-test.md with concept map, categorized questions, hints, and reference answers (PROV-04)"
    why_human: "Live API call required - unit tests verify request shape but not actual Gemini response parsing or Obsidian file write end-to-end"
  - test: "Claude end-to-end generation"
    expected: "With a valid Anthropic key selected, generating self-test produces a valid _self-test.md with proper formatting (PROV-05)"
    why_human: "Live API call required - unit tests verify request shape and headers but not actual Anthropic response or Obsidian integration"
  - test: "Error Notice includes provider name - Gemini"
    expected: "With Gemini selected and an invalid API key, the Notice shown contains 'Gemini' (e.g. 'Gemini API key invalid. Check your key in Settings.')"
    why_human: "classifyError tested in unit tests; this confirms the full path from GenerationService through Notice rendering in Obsidian"
  - test: "Error Notice includes provider name - Claude"
    expected: "With Claude (Anthropic) selected and an invalid API key, the Notice shown contains 'Claude (Anthropic)'"
    why_human: "Same as above"
  - test: "OpenAI regression"
    expected: "With OpenAI selected, generation still works as before Phase 8"
    why_human: "Regression test for existing behavior in a live environment"
---

# Phase 8: Multi-Provider LLM Dispatch - Verification Report

**Phase Goal:** The plugin routes generation calls to the correct provider API (OpenAI, Gemini, or Claude) based on the active settings selection, with provider-specific error messages when calls fail.
**Verified:** 2026-03-21
**Status:** human_needed
**Re-verification:** No - initial verification

## Goal Achievement

### Observable Truths

| #  | Truth                                                                          | Status     | Evidence                                                                                   |
|----|--------------------------------------------------------------------------------|------------|--------------------------------------------------------------------------------------------|
| 1  | callLLM dispatches to callGemini when provider is 'gemini'                    | VERIFIED  | `switch(provider)` in callLLM, `case 'gemini': return callGemini(...)` at line 282          |
| 2  | callLLM dispatches to callAnthropic when provider is 'anthropic'              | VERIFIED  | `case 'anthropic': return callAnthropic(...)` at line 283                                   |
| 3  | callLLM still works for OpenAI (existing behavior preserved)                  | VERIFIED  | `case 'openai': default: return callOpenAI(...)` at lines 284-286; `Provider dispatch` test passes |
| 4  | Gemini adapter sends system_instruction separately from contents              | VERIFIED  | `body.system_instruction = { parts: [{ text: systemMsg.content }] }` at line 201; test asserts `body.system_instruction.parts[0].text` |
| 5  | Anthropic adapter sends x-api-key and anthropic-version headers               | VERIFIED  | Headers `'x-api-key': apiKey` at line 253, `'anthropic-version': '2023-06-01'` at line 254; test asserts both |
| 6  | classifyError interpolates provider name into 401 and 500 messages            | VERIFIED  | `${provider} API key invalid` (line 135), `${provider} service error` (line 148); PROV-06 test suite passes |
| 7  | Gemini safety block shows Notice about safety filters                         | VERIFIED  | `new Notice('Gemini blocked this content due to safety filters.')` at line 218; test for empty candidates asserts Notice |
| 8  | Truncation warning is provider-agnostic across all three adapters             | VERIFIED  | Same string 'Warning: response may be truncated due to token limit.' used in callOpenAI (line 175), callGemini (line 224), callAnthropic (line 267) |

**Score (automated):** 8/8 truths verified programmatically

### Required Artifacts

| Artifact                               | Expected                                                                        | Status   | Details                                                                                       |
|----------------------------------------|---------------------------------------------------------------------------------|----------|-----------------------------------------------------------------------------------------------|
| `src/generation.ts`                    | callGemini, callAnthropic private adapters; callLLM dispatcher; classifyError with provider param | VERIFIED | callGemini (line 185), callAnthropic (line 232), callLLM dispatcher (line 275), classifyError with `provider = 'OpenAI'` (line 134) |
| `src/__tests__/generation.test.ts`     | Tests for Gemini adapter, Anthropic adapter, provider dispatch, classifyError with provider | VERIFIED | describe blocks: PROV-04 (line 285, 5 tests), PROV-05 (line 377, 3 tests), PROV-06 (line 262, 5 tests), Provider dispatch (line 438), GenerationService provider error label (line 454) |

### Key Link Verification

| From               | To                                     | Via                               | Status   | Details                                                                               |
|--------------------|----------------------------------------|-----------------------------------|----------|---------------------------------------------------------------------------------------|
| `src/generation.ts`| `generativelanguage.googleapis.com`    | callGemini requestUrl call        | VERIFIED | Line 205: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}` |
| `src/generation.ts`| `api.anthropic.com`                    | callAnthropic requestUrl call     | VERIFIED | Line 250: `'https://api.anthropic.com/v1/messages'`                                  |
| `src/generation.ts`| `src/settings.ts`                      | PROVIDER_CONFIG import for error label | VERIFIED | Line 2: `import { ActiveRecallSettings, LLMProvider, PROVIDER_CONFIG } from './settings'`; used at line 356 |
| `src/generation.ts`| callLLM dispatcher                    | settings.provider passed through GenerationService | VERIFIED | Lines 327, 335, 340: all three call sites pass `this.settings.provider` as first arg |

### Requirements Coverage

| Requirement | Source Plan     | Description                                                                   | Status       | Evidence                                                                           |
|-------------|----------------|--------------------------------------------------------------------------------|--------------|------------------------------------------------------------------------------------|
| PROV-04     | 08-01, 08-02   | Plugin calls Gemini via Google AI Studio API using requestUrl()                | VERIFIED*    | callGemini implemented and tested; end-to-end human verification completed per 08-02-SUMMARY |
| PROV-05     | 08-01, 08-02   | Plugin calls Claude via native Anthropic Messages API using requestUrl()       | VERIFIED*    | callAnthropic implemented and tested; end-to-end human verification completed per 08-02-SUMMARY |
| PROV-06     | 08-01, 08-02   | Error messages reference the active provider by name                           | VERIFIED     | classifyError with provider param; GenerationService passes PROVIDER_CONFIG label; 5 unit tests pass |

*Automated checks pass. Human confirmation documented in 08-02-SUMMARY (self-check PASSED) but requires human tester confirmation to mark as fully closed - see Human Verification section.

**Orphaned requirements from REQUIREMENTS.md mapped to Phase 8:** None. PROV-04, PROV-05, PROV-06 all appear in 08-01-PLAN.md requirements frontmatter.

### Anti-Patterns Found

| File                                  | Line | Pattern                              | Severity | Impact  |
|---------------------------------------|------|--------------------------------------|----------|---------|
| `src/__tests__/generation.test.ts`    | 369  | Duplicate requestUrl mock missing in LLMError re-assertion block | INFO | Dead code in test - the `try/catch` at line 369 never gets a second mock so `callLLM` won't throw, but the assertion is inside a catch block that never runs. Does not affect test count or correctness of the actual assertion at line 366-368. |

No blockers or stub indicators found. All adapters use real requestUrl calls with fully implemented extraction paths. No `return null`, `return []`, or placeholder comments present in implementation code.

### Human Verification Required

#### 1. Gemini end-to-end generation (PROV-04)

**Test:** In Obsidian, select Gemini as provider, enter a valid Google AI Studio key, navigate to a folder with 2-3 short notes, right-click and select "Generate Self-Test"
**Expected:** A `_self-test.md` is created with concept map, categorized questions, hints, and reference answers; content is coherent and not garbled
**Why human:** Unit tests verify the request shape sent to the Gemini API but cannot verify that the real API returns valid content or that the Obsidian file write produces a well-formed document.

#### 2. Claude end-to-end generation (PROV-05)

**Test:** Switch to Claude (Anthropic) in settings, enter a valid Anthropic key, select a model (e.g. claude-sonnet-4-6), generate a self-test
**Expected:** A `_self-test.md` is created with proper formatting and reasonable content quality
**Why human:** Same as above for Anthropic.

#### 3. Provider-named error - Gemini (PROV-06)

**Test:** With Gemini selected, enter an invalid API key (e.g. "bad-key"), attempt generation
**Expected:** A Notice appears containing "Gemini" in the error message (e.g. "Gemini API key invalid. Check your key in Settings.")
**Why human:** classifyError is unit-tested and the path from GenerationService to classifyError is unit-tested, but the Notice rendering in actual Obsidian is not covered by tests.

#### 4. Provider-named error - Claude (PROV-06)

**Test:** With Claude (Anthropic) selected, enter an invalid API key, attempt generation
**Expected:** A Notice appears containing "Claude (Anthropic)" in the message
**Why human:** Same rationale as Gemini error test.

#### 5. OpenAI regression

**Test:** Switch back to OpenAI, enter a valid OpenAI key, generate a self-test
**Expected:** Generation succeeds as before Phase 8; no regressions in behavior
**Why human:** Regression verification in live environment.

**Note:** 08-02-SUMMARY.md records a human self-check with all items marked PASSED (91 tests, production build clean, all three providers verified). If the human who ran Plan 02 is the same human reviewing this verification, the items above may be treated as confirmed. The verifier cannot independently confirm this.

### Gaps Summary

No automated gaps found. All 8 truths verified. All artifacts exist and are substantive (not stubs). All key links confirmed wired. Requirements PROV-04, PROV-05, PROV-06 are fully accounted for with no orphans.

The `human_needed` status reflects that PROV-04 and PROV-05 success criteria in ROADMAP.md ("generation produces a valid _self-test.md") require live API calls that cannot be verified programmatically. The 08-02-SUMMARY.md self-check indicates these were verified during Plan 02 execution, but the verification system requires explicit human confirmation to close this out.

---

*Verified: 2026-03-21*
*Verifier: Claude (gsd-verifier)*
