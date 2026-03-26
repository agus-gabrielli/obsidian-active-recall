---
phase: 12-v2-release
plan: 03
subsystem: release
tags: [obsidian, release, community-store, github]

# Dependency graph
requires:
  - phase: 12-v2-release
    provides: Renamed plugin (12-01) and rewritten README (12-02)
provides:
  - Production build with renamed identifiers
  - GitHub release 1.0.0 with updated assets
  - PR open against obsidianmd/obsidian-releases for community store submission
affects: [store-listing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "esbuild output copies main.js to repo root for release uploads"

key-files:
  created: []
  modified:
    - esbuild.config.mjs
    - main.js
    - manifest.json
    - styles.css
    - LICENSE
    - README.md
    - src/modals.ts
    - src/main.ts
    - src/settings.ts
    - src/sidebar.ts
    - src/generation.ts

key-decisions:
  - "esbuild output path changed from ai-active-recall to self-test plugin directory"
  - "License changed from ISC to GPL-3.0"
  - "GitHub repo renamed to obsidian-self-test"
  - "UI text converted to sentence case per Obsidian plugin guidelines"
  - "Self-test output notes filtered from linked notes picker"

patterns-established: []

requirements-completed: [DIST-04]

# Metrics
duration: 90min
completed: 2026-03-26
---

# Phase 12 Plan 03: Release & Store Submission Summary

**Production build, GitHub release update, human-verified plugin rename in Obsidian, Obsidian community store PR submitted, plus polish fixes (sentence case, note picker filter, generation notice, license, screenshots)**

## Performance

- **Duration:** ~90 min (including human verification and polish)
- **Completed:** 2026-03-26
- **Tasks:** 3 (plus inline polish fixes)

## Accomplishments

- Production build clean: 33,921 bytes, zero references to "active-recall" in compiled output
- esbuild.config.mjs updated: output goes to self-test plugin directory, copies main.js to repo root
- GitHub release 1.0.0 updated with fresh assets (main.js, manifest.json, styles.css)
- Git tag 1.0.0 moved to latest commit so source archives are current
- Human verified: plugin loads as "Self Test" in Obsidian, all modes work
- PR opened against obsidianmd/obsidian-releases for community store submission
- License changed from ISC to GPL-3.0
- GitHub repo renamed from obsidian-active-recall to obsidian-self-test

### Polish fixes applied during verification
- Self-test output notes filtered from linked notes picker (NotePickerModal)
- All UI text converted to sentence case per Obsidian plugin guidelines
- "Generating self-test..." Notice added at generation start for all modes
- README: fixed inaccurate output paths, added demo GIFs and screenshots
- Release description updated to "Self Test"

## Task Commits

1. **Task 1: Production build and GitHub release** - `747497e`
2. **Task 2: Human verification** - approved
3. **Task 3: Community store submission** - PR opened against obsidianmd/obsidian-releases

Additional commits during polish:
- `fcbafe0` - fix: filter self-test output notes from linked notes picker
- `41577c2` - docs: fix README accuracy and add mode demo GIFs
- `cdea01f` - docs: switch license to GPL-3.0
- `779ccfb` - fix: use sentence case in UI per Obsidian guidelines, add generation notice

## Deviations from Plan

- License change (ISC to GPL-3.0) not in original plan - user decision during execution
- Repo rename (obsidian-active-recall to obsidian-self-test) not in original plan - user decision
- Several polish fixes applied inline during human verification checkpoint

## Issues Encountered

- gh auth not available in Claude session - user ran release asset uploads manually

## Self-Check: PASSED

- Production build succeeds
- GitHub release 1.0.0 has 3 updated assets
- Plugin loads in Obsidian as "Self Test" (human verified)
- PR is open against obsidianmd/obsidian-releases
- 137 tests pass

---
*Phase: 12-v2-release*
*Completed: 2026-03-26*
