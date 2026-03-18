---
phase: 06-refinements-and-improvements
plan: 01
subsystem: prompts
tags: [llm, prompts, mermaid, templates, generation, testing]

# Dependency graph
requires:
  - phase: 05-polish-and-release
    provides: "Completed generation.ts with buildBatchPrompt, buildSynthesisPrompt, buildFormattingInstructions"
provides:
  - src/prompts.ts with render(), SYSTEM_MESSAGE, batchTemplate, synthesisTemplate, and builder helpers
  - Mermaid mindmap concept map instruction replacing flat bullet list
  - Contextual hint instruction requiring cues without revealing answers
  - Check answer instruction requiring explanations and Source: [[Note]] wiki-links
  - Question ordering instruction (general/simple to complex/specific within categories)
  - 29-test suite validating the prompts module
affects:
  - 06-02 (sidebar loading indicator - no dependency but same phase)
  - 06-03 (README science section - references prompt quality improvements)
  - 07-final-release (will use updated prompts)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Template string with {{placeholder}} substitution via render() - all LLM prompts live in prompts.ts only"
    - "Conditional instruction builders return empty string when feature disabled - no conditionals in templates"

key-files:
  created:
    - src/prompts.ts
    - src/__tests__/prompts.test.ts
  modified:
    - src/generation.ts
    - src/__tests__/generation.test.ts

key-decisions:
  - "render() uses split().join() per key (not regex) for simple, predictable substitution"
  - "Unmatched placeholders are removed via regex after var substitution to keep output clean"
  - "buildFormattingInstructions() deleted - replaced by five individual exported builder functions"
  - "generation.test.ts ordering test updated from 'foundational to advanced' to 'general and simple to complex and specific' to match improved prompt wording"

patterns-established:
  - "prompts.ts: single source of truth for all LLM prompt text"
  - "generation.ts: orchestration only - no prompt strings, delegates to render()"
  - "Builder functions follow enabled: boolean -> empty string | instruction string pattern"

requirements-completed: [REFINE-PROMPTS]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 6 Plan 1: Prompt Extraction and Quality Improvements Summary

**Moved all LLM prompt text from generation.ts to a dedicated src/prompts.ts module with Mermaid mindmap concept maps, contextual hints, and Source: [[Note]] source traceability in check answers.**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T12:40:30Z
- **Completed:** 2026-03-18T12:43:08Z
- **Tasks:** 2
- **Files modified:** 4 (created 2, modified 2)

## Accomplishments

- Created src/prompts.ts with render(), SYSTEM_MESSAGE, batchTemplate, synthesisTemplate, and five conditional builder helpers
- Switched concept map from flat bullet list to Mermaid mindmap diagram with depth/ordering rules
- Enhanced hint instruction to require contextual cues without revealing answers, with explicit example and omission allowance
- Enhanced check answer instruction to require explanatory answers with Source: [[Note A]], [[Note B]] wiki-link attribution
- Added explicit question ordering instruction within categories (general/simple to complex/specific)
- Refactored generation.ts to delegate all prompt construction to render() calls; deleted buildFormattingInstructions
- Added 29-test suite in prompts.test.ts covering render(), all builders, and template rendering with all options

## Task Commits

1. **Task 1: Create src/prompts.ts with templates and render function** - `12a3b41` (feat)
2. **Task 2: Add tests for prompts.ts render function and template outputs** - `d3bfb61` (test)

## Files Created/Modified

- `src/prompts.ts` - New module: render(), SYSTEM_MESSAGE, batchTemplate, synthesisTemplate, five builder helpers
- `src/__tests__/prompts.test.ts` - 29-test suite for the prompts module
- `src/generation.ts` - Refactored to import from ./prompts and delegate prompt construction
- `src/__tests__/generation.test.ts` - Updated one test: ordering wording updated to match new prompt text

## Decisions Made

- render() uses split().join() loop rather than regex replace for straightforward, side-effect-free substitution
- Unmatched placeholders cleaned up with a final regex pass to keep output clean when optional sections are empty
- buildFormattingInstructions() removed entirely - its four concerns split into five individual exported builders
- generation.test.ts ordering test wording updated from "foundational to advanced" to "general and simple to complex and specific" to match the improved prompt (Rule 1 auto-fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated generation.test.ts prompt ordering test wording**
- **Found during:** Task 1 verification (test run)
- **Issue:** Existing test expected old wording "foundational to advanced" which changed to the improved "general and simple to complex and specific"
- **Fix:** Updated test description and assertion to match new prompt instruction text
- **Files modified:** src/__tests__/generation.test.ts
- **Verification:** All 30 existing tests pass after update
- **Committed in:** 12a3b41 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - test wording sync)
**Impact on plan:** Necessary to keep tests aligned with intentional prompt wording change. No scope creep.

## Issues Encountered

None - plan executed cleanly.

## Next Phase Readiness

- prompts.ts is the single source of truth for all LLM prompts - ready for iteration
- Mermaid mindmap, hint quality, and source traceability improvements will appear on next self-test generation
- 59 total tests passing across generation, sidebar, and prompts suites

---
*Phase: 06-refinements-and-improvements*
*Completed: 2026-03-18*
