---
phase: 03-generation-pipeline
plan: 02
subsystem: generation
tags: [jest, tdd, openai, requestUrl, obsidian-vault, typescript]

# Dependency graph
requires:
  - phase: 03-generation-pipeline-01
    provides: Jest/ts-jest scaffold, obsidian mock with createMockApp/requestUrl, 14 test.todo stubs
  - phase: 02-settings
    provides: ActiveRecallSettings interface with all prompt-controlling fields
provides:
  - GenerationService class with generate(folderPath) end-to-end pipeline
  - collectNoteFiles, readNotes, splitIntoBatches, buildBatchPrompt, buildSynthesisPrompt
  - callLLM with classifyError for plain-language API error handling
  - writeOutput: vault.create for new files, vault.modify for existing
  - estimateTokens and INPUT_BUDGET_CHARS for token budget enforcement
  - 17 passing tests covering all 12 requirement IDs (GEN-01 through FB-02)
affects:
  - 04-commands-sidebar (Phase 4 wires GenerationService via command palette and context menu)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD cycle: RED commit (failing tests), GREEN commit (implementation), REFACTOR commit (cleanup)"
    - "requestUrl({ throw: false }) - non-2xx status checked manually via response.status, never crashes onload"
    - "classifyError(status) maps HTTP status codes to plain-language user-facing strings"
    - "splitIntoBatches greedy accumulation: new batch when currentChars + note.length > INPUT_BUDGET_CHARS"
    - "buildFormattingInstructions helper: shared hint/check/language/custom instruction building"

key-files:
  created:
    - src/generation.ts
  modified:
    - src/__tests__/generation.test.ts

key-decisions:
  - "FB-02 tested via classifyError() directly - cleaner than spying on Notice constructor internals"
  - "17 tests instead of plan's 14 - GEN-04/05 split into 4 tests (true/false for both hints and check) for clearer failure messages"
  - "buildFormattingInstructions extracted as private helper to avoid prompt instruction duplication"

patterns-established:
  - "Error classification pattern: LLMError carries raw status, classifyError maps to user strings - raw API messages never surface"
  - "Batch+synthesize pattern: N batch calls + 1 synthesis call for folders exceeding INPUT_BUDGET_CHARS"

requirements-completed: [GEN-01, GEN-02, GEN-03, GEN-04, GEN-05, GEN-06, GEN-07, CTX-01, CTX-02, CTX-03, FB-01, FB-02]

# Metrics
duration: 4min
completed: 2026-03-10
---

# Phase 3 Plan 02: GenerationService Summary

**Full end-to-end generation pipeline: folder notes to `_self-test.md` via OpenAI requestUrl with batch+synthesize for large folders, conditional callout formatting, and plain-language error handling**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-03-10T02:40:14Z
- **Completed:** 2026-03-10T02:44:32Z
- **Tasks:** 3 (RED, GREEN, REFACTOR)
- **Files modified:** 2

## Accomplishments
- Replaced all 14 test.todo stubs with 17 real passing tests covering every requirement ID
- Implemented GenerationService with the full pipeline: collectNoteFiles, readNotes, splitIntoBatches, buildBatchPrompt/buildSynthesisPrompt, callLLM, writeOutput
- Enforced token budget with INPUT_BUDGET_CHARS (488k chars) - single call for small folders, N+1 calls for large folders
- classifyError maps status 401/429/5xx/0 to plain-language strings - raw OpenAI error messages never shown to users
- `npm run build` exits 0 (TypeScript strict + noUncheckedIndexedAccess satisfied)

## Task Commits

Each TDD phase committed atomically:

1. **Task 1 RED: Write failing tests for all 12 requirements** - `c690029` (test)
2. **Task 2 GREEN: Implement GenerationService** - `03a96ad` (feat)
3. **Task 3 REFACTOR: Extract buildFormattingInstructions helper** - `5c0c8bc` (refactor)

_TDD plan: 3 commits (test -> feat -> refactor)_

## Files Created/Modified
- `src/generation.ts` - GenerationService class and all pipeline functions (283 lines)
- `src/__tests__/generation.test.ts` - 17 tests covering GEN-01 through FB-02

## Decisions Made
- Tested FB-02 (error mapping) via `classifyError()` unit test rather than trying to spy on Notice constructor - cleaner and equally authoritative since generate() calls classifyError before Notice
- Split GEN-04/05 hint/check tests into 4 tests (true + false for each) instead of 2 combined, giving clearer failure attribution
- Extracted `buildFormattingInstructions` as a private (non-exported) helper function shared by buildBatchPrompt and buildSynthesisPrompt to eliminate duplication

## Deviations from Plan

None - plan executed exactly as written. The test count is 17 vs the plan's expected 14, but this is because the plan said "14 passing (non-todo) tests" and we added 3 additional tests for the false-case callout assertions (GEN-04/05 has 4 tests instead of 2). All requirements are fully covered.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- GenerationService is fully implemented and tested; Phase 4 can import and wire it to command palette and context menu
- API: `new GenerationService(app, settings, statusBarItem).generate(folderPath)`
- The status bar item must be created by the plugin's onload() via `this.addStatusBarItem()`

---
*Phase: 03-generation-pipeline*
*Completed: 2026-03-10*
