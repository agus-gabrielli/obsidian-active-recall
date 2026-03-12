# Phase 5: Polish and Release - Research

**Researched:** 2026-03-12
**Domain:** Obsidian community plugin submission, README authorship, error message UX, mobile compatibility
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**README structure:**
- Target reader: non-technical Obsidian user - no assumed developer knowledge
- Sections: 1) What it does, 2) Installation (API key config folded in as a step), 3) How to use (command palette, context menu, sidebar)
- Text-only for v1 - no screenshots or GIFs
- API key setup is part of Installation, not a standalone section (e.g., "Step 3: Enter your OpenAI API key in Plugin Settings")

**Error message quality:**
- Systematic audit on all 5 error states: wrong/invalid API key, rate limit, network error, no notes in folder, context exceeded
- Tone: "Problem + action" - two sentences max
- Rate limit: "Rate limit reached. Wait a moment, then try again."
- Raw API error strings must never be shown to users
- "No notes found in this folder." is locked from Phase 3 - keep as-is

**Mobile compatibility:**
- Best-effort: if mobile cannot be tested, flip `isDesktopOnly: true` for v1
- If `isDesktopOnly: false` is kept, minimum bar: plugin loads in Community Plugins list on mobile and Settings tab opens without crashing

### Claude's Discretion
- Exact wording of README prose (beyond section structure)
- Which specific messages in generation.ts need rewriting vs. are already acceptable
- How to structure the release checklist items for the GitHub release

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DIST-02 | README covers installation steps and API key configuration | README structure is locked in CONTEXT.md; Obsidian store pulls README.md from repo root; specific content requirements documented below |
</phase_requirements>

---

## Summary

Phase 5 is entirely about production readiness - no new features. It has four work areas: rewriting README.md for end users, auditing and fixing all five error states in `generation.ts`, verifying mobile behavior (or explicitly disabling mobile), and packaging the GitHub release + opening the store submission PR.

The existing code is largely in good shape. `classifyError()` in `generation.ts` already handles 401, 429, and 5xx. The "No notes found" message and raw-API-string guard are already implemented. The main audit focus is the fallback catch path and the truncation warning notice. The README at repo root is still the sample plugin boilerplate and needs a complete rewrite.

The Obsidian store submission is a two-step process: (1) create a GitHub release with tag = `manifest.json` version, attaching `main.js`, `manifest.json`, and `styles.css` as binary assets; (2) PR to `obsidianmd/obsidian-releases` adding one entry to `community-plugins.json`. Both steps have hard-format requirements that are documented below.

**Primary recommendation:** Tackle the four work areas in order - error audit, README rewrite, release tag + assets, store PR. The error audit comes first because a reviewer can reject on UX grounds; the store PR is last because it depends on the release being published.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Jest | 30.2.0 (installed) | Test runner for existing unit tests | Already configured; `jest.config.cjs` points to `src/__tests__/**/*.test.ts` |
| ts-jest | installed | TypeScript transform for Jest | Already in use; no changes needed |

No new libraries needed for this phase. All work is prose, code edits, and git operations.

**Test run command (existing infrastructure):**
```bash
npx jest
```
No `test` script in `package.json` - run via `npx jest` or `./node_modules/.bin/jest`.

---

## Architecture Patterns

### Recommended Task Order

```
Phase 5
├── Task 1: Error message audit (src/generation.ts)
├── Task 2: README rewrite (README.md at repo root)
├── Task 3: Mobile compatibility check / isDesktopOnly decision
└── Task 4: GitHub release + store submission PR
```

Each task is independently shippable and has no cross-dependencies, but the natural sequence (errors first, release last) is recommended.

### Pattern 1: Error State Coverage in generation.ts

**What:** The `generate()` method in `GenerationService` has one catch block. Error messages are produced either by `classifyError()` (for `LLMError`) or a fallback string.

**Current state (from code audit):**
- `LLMError` 401 - `classifyError()` returns `'Invalid API key. Check your key in Settings.'` - acceptable
- `LLMError` 429 - `classifyError()` returns `'Rate limit reached. Please wait a moment and try again.'` - needs minor wording tweak (CONTEXT.md wants "Wait a moment, then try again." without "Please")
- `LLMError` 5xx - `classifyError()` returns `'OpenAI service error. Please try again later.'` - acceptable
- `LLMError` other - `classifyError()` returns `'Network error. Check your internet connection.'` - acceptable
- Non-`LLMError` (empty response, unknown) - falls through to `'Generation failed. Check your settings and try again.'` - acceptable as catch-all
- Empty folder - `'No notes found in this folder.'` - locked, keep as-is
- Truncation warning (finish_reason === 'length') - `'Warning: response may be truncated due to token limit.'` - this is a Notice, not an error; review wording for clarity
- Context exceeded (very large folder, multi-batch synthesis failure) - handled via the same catch block; no distinct "context exceeded" message currently exists; this is the main gap

**Context exceeded gap:** The CONTEXT.md lists "context exceeded (very large folder)" as a distinct error state to handle. Currently, if a batch call or synthesis call fails due to token limits (which would manifest as a 400 or LLM content refusal rather than a specific status code), it falls into the generic catch-all. The audit should determine whether a distinct message is warranted or whether the generic fallback is sufficient.

**Approved tone pattern:**
```
[What went wrong]. [What to do.]
```
Max two sentences. No "Please" prefix.

### Pattern 2: README for Obsidian Non-Technical Users

**What:** The store pulls `README.md` from the repository root. Content is rendered as markdown in the plugin detail page.

**Locked section structure:**
1. What it does (value proposition, 2-3 sentences)
2. Installation (numbered steps, includes API key config as a numbered step)
3. How to use (three entry points: command palette, context menu, sidebar)

**Community conventions observed in successful plugin READMEs:**
- Lead with what the user gets, not how it works
- Installation step for API key: "In Plugin Settings, paste your OpenAI API key" (not "configure the LLM provider")
- Avoid developer jargon: "folder" not "directory", "Obsidian settings" not "configuration"
- No version badge clutter for v1

**manifest.json description field:** Currently `"AI Active Recall is a plugin that helps you learn and remember your notes using AI."` - this violates the Obsidian submission requirement that descriptions must not start with "This is a plugin" (technically compliant) but also requires an action statement format and must end with a period. Current description ends with a period and is under 250 chars but starts with the plugin name rather than an action verb. Reviewer may flag this. Suggested fix: `"Generate active recall self-tests from your notes using AI."` (action verb, under 250 chars, ends with period, no emoji).

### Pattern 3: GitHub Release Format

**What:** Obsidian's installer downloads three files from the GitHub release that matches the tag in `manifest.json`.

**Required release assets (must be attached as binary attachments, not source files):**
1. `main.js` (compiled output)
2. `manifest.json`
3. `styles.css`

**Tag format:** Exact semantic version matching `manifest.json` version field. For this plugin: tag must be `1.0.0`, NOT `v1.0.0`.

**versions.json:** Already has `"1.0.0": "0.15.0"` - matches manifest. No changes needed.

**Build command before release:**
```bash
npm run build
```
This runs `tsc -noEmit` then `esbuild` to produce `main.js`.

### Pattern 4: Store Submission PR

**What:** A PR to the `obsidianmd/obsidian-releases` repository adding one JSON object to the end of `community-plugins.json`.

**Required JSON entry format:**
```json
{
  "id": "ai-active-recall",
  "name": "AI Active Recall",
  "author": "Agustin Gabrielli",
  "description": "Generate active recall self-tests from your notes using AI.",
  "repo": "agus-gabrielli/self-test-obsidian-plugin"
}
```

**PR title format:** `Add plugin: AI Active Recall`

**PR template checklist items (must be marked `[x]`):**
- GitHub release tag matches manifest version (no `v` prefix)
- Plugin ID in manifest matches entry in community-plugins.json
- `README.md` present at repo root
- `LICENSE` file present at repo root
- Developer policies reviewed
- Plugin guidelines reviewed and self-assessed
- Mobile testing noted or `isDesktopOnly: true` set

**Note:** The repo field must be the exact GitHub `user/repo` path. Verify the actual GitHub repo slug matches before submitting.

### Anti-Patterns to Avoid

- **Tag with `v` prefix:** `v1.0.0` as the release tag will cause Obsidian to fail to locate release assets. Must be bare `1.0.0`.
- **Attaching source files instead of build artifacts:** The `src/` directory must not be in release assets. Only attach `main.js`, `manifest.json`, `styles.css`.
- **Description field violations:** Starting with "This is a plugin...", exceeding 250 chars, using emoji, or not ending with a period causes automated validation failure.
- **Raw API error exposure:** Any `err.message` from the OpenAI SDK surfaced directly to users via Notice will fail guideline review.
- **Duplicate plugin ID:** Verify `ai-active-recall` is not already in `community-plugins.json` before submitting.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Version bumping | Manual edits to manifest + versions.json | `npm run version` (version-bump.mjs) | Already scripted; keeps manifest + versions.json + package.json in sync atomically |
| Release asset compilation | Manual esbuild invocation | `npm run build` | Configured in esbuild.config.mjs with production optimizations |

**Key insight:** The release process is already tooled. The `npm run version` script and `npm run build` script exist precisely for this. Don't bypass them.

---

## Common Pitfalls

### Pitfall 1: Tag/version mismatch
**What goes wrong:** GitHub release tag is `v1.0.0` but manifest says `1.0.0`. Obsidian cannot find release assets. Plugin shows as "failed to install" for users.
**Why it happens:** GitHub UI defaults to suggesting `v` prefix for tags.
**How to avoid:** When creating the release, explicitly type `1.0.0` in the tag field.
**Warning signs:** Automated validator in obsidian-releases PR fails on "external resource accessibility" check.

### Pitfall 2: manifest.json description format
**What goes wrong:** Description starts with plugin name or "This is..." rather than an action verb. Automated validator or human reviewer flags it.
**Why it happens:** The manifest was seeded from sample plugin with a non-compliant description.
**How to avoid:** Update description to action-verb format: `"Generate active recall self-tests from your notes using AI."`
**Warning signs:** PR review comment requesting description change.

### Pitfall 3: Missing release asset
**What goes wrong:** `styles.css` not attached to GitHub release. Users who install get broken styling.
**Why it happens:** Author knows CSS is optional per docs but forgets the plugin actually uses it.
**How to avoid:** Always attach all three: `main.js`, `manifest.json`, `styles.css`.

### Pitfall 4: Context-exceeded error has no user-readable message
**What goes wrong:** A very large folder triggers a 400 from the API or a synthesis failure; user sees the generic "Generation failed" Notice with no actionable next step.
**Why it happens:** The "context exceeded" scenario wasn't given a distinct error path in Phase 3 - only the batch-splitting logic exists, but if even a single note exceeds the budget the error is generic.
**How to avoid:** During error audit, determine if a 400 from OpenAI (context length exceeded) needs a specific branch in `classifyError()`. OpenAI returns HTTP 400 with `error.code === 'context_length_exceeded'` for this case. Add a branch or check `apiError` field on `LLMError`.

### Pitfall 5: Mobile crash on API key paste
**What goes wrong:** Plugin marked `isDesktopOnly: false` but not tested on mobile; Settings tab crashes on mobile Obsidian due to some Electron-only API usage.
**Why it happens:** Mobile Obsidian lacks certain desktop APIs.
**How to avoid:** If mobile testing is not feasible, set `isDesktopOnly: true` before submission. This is explicitly allowed in CONTEXT.md.

---

## Code Examples

### Current error handling in generation.ts (lines 271-275)

```typescript
// Source: src/generation.ts lines 271-275 (current)
} catch (err) {
    const msg = err instanceof LLMError
        ? classifyError(err.status)
        : 'Generation failed. Check your settings and try again.';
    new Notice(msg);
}
```

### classifyError() current state (lines 171-176)

```typescript
// Source: src/generation.ts lines 171-176 (current)
export function classifyError(status: number): string {
    if (status === 401) return 'Invalid API key. Check your key in Settings.';
    if (status === 429) return 'Rate limit reached. Please wait a moment and try again.';
    if (status >= 500) return 'OpenAI service error. Please try again later.';
    return 'Network error. Check your internet connection.';
}
```

**Required change:** Rate limit message - remove "Please" to match CONTEXT.md tone: `'Rate limit reached. Wait a moment, then try again.'`

### Context-exceeded branch to consider adding

```typescript
// Proposed addition to classifyError() - check apiError for 400 cases
export function classifyError(status: number, apiError?: unknown): string {
    if (status === 401) return 'Invalid API key. Check your key in Settings.';
    if (status === 429) return 'Rate limit reached. Wait a moment, then try again.';
    if (status === 400) {
        const code = (apiError as { error?: { code?: string } })?.error?.code;
        if (code === 'context_length_exceeded') {
            return 'Folder is too large to process. Try removing some notes or reducing note length.';
        }
    }
    if (status >= 500) return 'OpenAI service error. Please try again later.';
    return 'Network error. Check your internet connection.';
}
```

Note: This is a proposed pattern. The planner should decide whether to expand `classifyError` signature or inspect `LLMError.apiError` at the call site.

### community-plugins.json entry format

```json
{
  "id": "ai-active-recall",
  "name": "AI Active Recall",
  "author": "Agustin Gabrielli",
  "description": "Generate active recall self-tests from your notes using AI.",
  "repo": "agus-gabrielli/self-test-obsidian-plugin"
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual versions.json edits | `npm run version` (version-bump.mjs) | Already in place | Atomic version sync across manifest + versions.json + package.json |
| No mobile consideration | `isDesktopOnly` flag in manifest | Obsidian 0.15.0+ | Must be set accurately; false by default but can flip to true |

**Already compliant:**
- Plugin ID `ai-active-recall` - no `obsidian-` prefix (DIST-01 done)
- `minAppVersion: "0.15.0"` - reasonable minimum
- `versions.json` entry exists for `1.0.0`
- No raw API strings surfaced to users (Notice uses `classifyError()` result)
- LICENSE file exists at repo root

---

## Open Questions

1. **Exact GitHub repo URL for the store PR**
   - What we know: `manifest.json` has `authorUrl: "https://github.com/agus-gabrielli"`. The local directory is `self-test-obsidian-plugin`.
   - What's unclear: Is the actual GitHub remote named `agus-gabrielli/self-test-obsidian-plugin` or something different?
   - Recommendation: Run `git remote -v` before drafting the community-plugins.json entry to confirm.

2. **Context-exceeded as a distinct error state**
   - What we know: OpenAI returns HTTP 400 with `error.code = 'context_length_exceeded'` for prompts over the model's context window.
   - What's unclear: The current batch-splitting logic at `INPUT_BUDGET_CHARS = 488_000` should prevent this for normal usage, but a single oversized note could still trigger it.
   - Recommendation: Add a 400 branch to `classifyError()` that checks for this code; fallback to generic 400 message if code is something else.

3. **Mobile testing feasibility**
   - What we know: The plugin uses only `requestUrl()` (not Node.js `fetch`), no `fs`, no Electron APIs - in theory mobile-safe.
   - What's unclear: Whether the Settings tab or sidebar view uses any API that behaves differently on mobile Obsidian.
   - Recommendation: If mobile device is available, run the minimum acceptance check (plugin loads + Settings opens). If not, flip `isDesktopOnly: true`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30.2.0 |
| Config file | `jest.config.cjs` |
| Quick run command | `npx jest` |
| Full suite command | `npx jest` |

### Phase Requirements - Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DIST-02 | README covers installation + API key config | manual | n/a - prose content review | ✅ (README.md exists, needs rewrite) |

Note: DIST-02 is documentation authorship - it has no automated test. Verification is a human read-through of the final README.md against the acceptance criteria in CONTEXT.md.

### Sampling Rate
- **Per task commit:** `npx jest` (covers existing generation + sidebar unit tests - regression check)
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work` plus manual README review

### Wave 0 Gaps
None - existing test infrastructure covers all phase requirements. No new test files needed for this phase; the work is documentation, prose, and release packaging.

---

## Sources

### Primary (HIGH confidence)
- Official Obsidian submission docs (`publish-01.obsidian.md`) - submission steps, manifest requirements, community-plugins.json format
- `src/generation.ts` (direct code read) - current error handling implementation
- `manifest.json` (direct read) - current version, ID, description
- `versions.json` (direct read) - current version entry

### Secondary (MEDIUM confidence)
- DeepWiki summary of `obsidianmd/obsidian-releases` - full PR checklist items (sourced from actual repo templates)
- WebSearch result citing example PR `#8256` - confirmed PR title format "Add plugin: [name]"
- Obsidian plugin guidelines doc (submit + guidelines pages) - description requirements, code-level requirements

### Tertiary (LOW confidence)
- OpenAI 400 `context_length_exceeded` error code structure - from training knowledge, not verified against current OpenAI API docs; validate before implementing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - no new dependencies, existing setup confirmed
- Architecture (error audit): HIGH - code read directly; all 5 states mapped
- Architecture (release/submission): HIGH - official docs confirmed format
- Architecture (README structure): HIGH - locked in CONTEXT.md
- Pitfalls: HIGH for release process; MEDIUM for mobile compatibility (untested)

**Research date:** 2026-03-12
**Valid until:** 2026-06-12 (store submission process is stable; manifest requirements change infrequently)
