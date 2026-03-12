# Phase 5: Polish and Release - Context

**Gathered:** 2026-03-12
**Status:** Ready for planning

<domain>
## Phase Boundary

Production readiness for Obsidian community store submission. Covers README authorship, error message quality review, mobile compatibility verification, and release packaging. All feature work is complete - this phase is about polish and shipping.

</domain>

<decisions>
## Implementation Decisions

### README structure
- Target reader: non-technical Obsidian user - no assumed developer knowledge
- Sections to include:
  1. What it does (brief description of value)
  2. Installation steps - including API key configuration folded in as a step (not a separate section)
  3. How to use - covers the three entry points (command palette, context menu, sidebar)
- Text-only for v1 - no screenshots or GIFs; can be added post-submission
- API key setup is part of Installation, not a standalone section (e.g., "Step 3: Enter your OpenAI API key in Plugin Settings")

### Error message quality
- Systematic audit pass on all 5 error states before submission:
  1. Wrong/invalid API key
  2. Rate limit hit
  3. Network error
  4. No notes in folder
  5. Context exceeded (very large folder)
- Tone: "Problem + action" - two sentences max. State what went wrong, then what the user can do.
  - Example: "API key is invalid. Check your key in Plugin Settings."
- Rate limit specifically: "Rate limit reached. Wait a moment, then try again."
- Raw API error strings must never be shown to users (locked Phase 3 - carry through)
- "No notes found in this folder." is locked from Phase 3 - keep as-is

### Mobile compatibility
- Best-effort: if mobile cannot be tested before submission, flip `isDesktopOnly: true` for v1
- If `isDesktopOnly: false` is kept, minimum acceptance bar: plugin loads in Community Plugins list on mobile and Settings tab opens without crashing
- Full generation flow on mobile is not required for v1 acceptance

### Claude's Discretion
- Exact wording of README prose (beyond section structure)
- Which specific messages in generation.ts need rewriting vs. are already acceptable
- How to structure the release checklist items for the GitHub release

</decisions>

<specifics>
## Specific Ideas

No specific references - open to standard Obsidian community plugin README conventions.

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/generation.ts` - contains all error-handling Notice calls; these are the primary targets for the error message audit
- `manifest.json` - `isDesktopOnly: false`, `version: "1.0.0"`, `minAppVersion: "0.15.0"` - already store-compliant for DIST-01; version tag for release must match exactly (no `v` prefix)
- `versions.json` - already has `"1.0.0": "0.15.0"` entry; must be kept in sync with manifest

### Established Patterns
- Error feedback: Notice popup (no raw API strings) + status bar cleared - locked Phase 3
- Status bar text set/cleared around generation lifecycle - already implemented

### Integration Points
- README lives at repo root (already exists as sample plugin boilerplate - full rewrite needed)
- GitHub release: tag = manifest version, attach `main.js`, `styles.css`, `manifest.json` as binary assets
- Store submission: PR to obsidianmd/obsidian-releases with plugin entry

</code_context>

<deferred>
## Deferred Ideas

None - discussion stayed within phase scope.

</deferred>

---

*Phase: 05-polish-and-release*
*Context gathered: 2026-03-12*
