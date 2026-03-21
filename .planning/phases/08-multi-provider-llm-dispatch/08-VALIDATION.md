---
phase: 8
slug: multi-provider-llm-dispatch
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-21
---

# Phase 8 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x |
| **Config file** | jest.config.js |
| **Quick run command** | `npx jest --testPathPattern generation` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern generation`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | PROV-04 | unit | `npx jest --testPathPattern generation` | ✅ `src/__tests__/generation.test.ts` | ⬜ pending |
| 08-01-02 | 01 | 1 | PROV-05 | unit | `npx jest --testPathPattern generation` | ✅ `src/__tests__/generation.test.ts` | ⬜ pending |
| 08-01-03 | 01 | 1 | PROV-06 | unit | `npx jest --testPathPattern generation` | ✅ `src/__tests__/generation.test.ts` | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. New tests extend `src/__tests__/generation.test.ts`; no new files needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gemini generation produces valid _self-test.md | PROV-04 | Requires real API key and Obsidian vault | Select Gemini in settings, enter valid key, run generation on a folder |
| Claude generation produces valid _self-test.md | PROV-05 | Requires real API key and Obsidian vault | Select Claude in settings, enter valid key, run generation on a folder |
| Provider-specific error Notice shows correct name | PROV-06 | UI Notice requires Obsidian runtime | Enter invalid key, trigger generation, verify Notice text includes provider name |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references - existing file covers all
- [x] No watch-mode flags
- [x] Feedback latency < 5s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-03-21
