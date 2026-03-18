---
phase: 06-refinements-and-improvements
plan: 03
subsystem: ui
tags: [readme, documentation, active-recall, learning-science]

# Dependency graph
requires:
  - phase: 05-polish-and-release
    provides: README.md with Installation and How to use sections (preserved unchanged)
provides:
  - README.md with science foundations section citing Roediger & Karpicke (2006), Dunlosky et al. (2013), Karpicke & Blunt (2011)
  - README.md with differentiation section for LLM Test Generator (Competence)
affects: [07-final-release]

# Tech tracking
tech-stack:
  added: []
  patterns: []

key-files:
  created: []
  modified:
    - README.md

key-decisions:
  - "Science section uses inline citations (Author, Year) in prose rather than a separate bibliography - keeps it readable for Obsidian users"
  - "Differentiation section closes with a neutral summary line acknowledging both plugins serve different approaches"

patterns-established: []

requirements-completed: [REFINE-README]

# Metrics
duration: 5min
completed: 2026-03-18
---

# Phase 06 Plan 03: README Science and Differentiation Summary

**README expanded with evidence-based active recall foundations citing three papers and a factual differentiation from LLM Test Generator (Competence)**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-03-18T12:40:31Z
- **Completed:** 2026-03-18T12:41:24Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added "Why active recall works" section explaining the testing effect with three inline paper references (Roediger & Karpicke 2006, Dunlosky et al. 2013, Karpicke & Blunt 2011)
- Connected each plugin feature (concept map, ordered questions, hints, reference answers) to the underlying research
- Added "How is this different from LLM Test Generator?" section distinguishing the plugin from Competence in a factual, non-competitive tone
- Preserved all existing README sections unchanged (opening paragraph, Installation, How to use)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add science foundations and differentiation sections to README** - `8164e4e` (feat)

**Plan metadata:** (see final commit)

## Files Created/Modified

- `README.md` - Added two new sections after "How to use": science foundations with paper citations and feature-to-research mapping, plus differentiation from LLM Test Generator (Competence)

## Decisions Made

- Used inline citations in prose rather than a footnote bibliography - more readable for non-academic Obsidian users
- Closed the differentiation section with a neutral bridging sentence ("Both plugins use a notes-to-questions approach. The difference is in what you do with those questions.") to avoid a competitive tone

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- README science section ready for store submission in Phase 7
- No blockers

---
*Phase: 06-refinements-and-improvements*
*Completed: 2026-03-18*
