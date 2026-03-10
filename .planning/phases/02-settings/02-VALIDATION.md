---
phase: 2
slug: settings
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None installed (no jest/vitest config found) |
| **Config file** | none - manual-only for this phase |
| **Quick run command** | n/a - use test-vault hot-reload |
| **Full suite command** | n/a - manual settings tab walkthrough |
| **Estimated runtime** | ~5 minutes (manual) |

---

## Sampling Rate

- **After every task commit:** Reload plugin in test-vault, verify the affected field renders correctly
- **After every plan wave:** Full settings tab walkthrough in test-vault
- **Before `/gsd:verify-work`:** All 4 success criteria verified in live Obsidian

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 2-01-01 | 01 | 1 | SET-01, SET-02, SET-03, SET-04, SET-05, SET-06, SET-07, SET-08 | manual | n/a | n/a | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

None - no automated test framework will be set up for this phase. All verification is manual via test-vault.

*Rationale: Phase 2 is entirely UI/settings rendering and event handling. The Obsidian plugin environment has no headless test runner. Unit tests of `DEFAULT_SETTINGS` constants are feasible but not worth the cost of installing a test framework solely for constant value checks. Test infrastructure will be added in Phase 3 when generation logic (pure functions) makes automation more valuable.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Provider dropdown visible, locked to "OpenAI" | SET-01 | Requires Obsidian DOM | Open Settings > plugin tab, confirm dropdown shows "OpenAI" and is greyed out |
| API key field masked (password dots) with git warning | SET-02 | Requires live DOM + browser event handling | Type in API key field, confirm characters show as dots; read description for git warning text |
| Model field shows `gpt-4o-mini` placeholder | SET-03 | Requires Obsidian rendering | Open settings, confirm model field placeholder and default value |
| Language field empty by default with auto-detect description | SET-04 | Requires Obsidian rendering | Open settings, confirm language field is empty with correct description |
| Hint toggle defaults on, saves immediately | SET-05 | Requires Obsidian event system | Toggle off, close/reopen settings - confirm persists off |
| Reference answer toggle defaults on, saves immediately | SET-06 | Same as SET-05 | Toggle off, close/reopen settings - confirm persists off |
| Concept map toggle defaults on, saves immediately | SET-07 | Same as SET-05 | Toggle off, close/reopen settings - confirm persists off |
| Custom instructions saves on blur (not keystroke) | SET-08 | Requires live event loop | Type in textarea, click elsewhere (blur), close/reopen - confirm text persists |
| All settings survive Obsidian restart | SET-01 to SET-08 | Requires live restart cycle | Set non-default values for all fields, restart Obsidian, confirm all values preserved |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 300s (manual)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
