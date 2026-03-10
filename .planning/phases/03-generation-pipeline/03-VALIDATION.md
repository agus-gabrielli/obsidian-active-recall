---
phase: 3
slug: generation-pipeline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-09
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 29.x + ts-jest |
| **Config file** | `jest.config.cjs` — Wave 0 installs |
| **Quick run command** | `npx jest --testPathPattern=generation --passWithNoTests` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern=generation --passWithNoTests`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 3-W0-01 | 01 | 0 | GEN-01 | unit | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-02 | 01 | 0 | GEN-02 | unit (prompt inspection) | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-03 | 01 | 0 | GEN-03 | unit (prompt inspection) | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-04 | 01 | 0 | GEN-04 | unit (prompt string) | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-05 | 01 | 0 | GEN-05 | unit (prompt string) | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-06 | 01 | 0 | GEN-06 | unit | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-07 | 01 | 0 | GEN-07 | unit (mock) | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-08 | 01 | 0 | CTX-01 | unit | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-09 | 01 | 0 | CTX-02 | unit (mock) | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-10 | 01 | 0 | CTX-03 | unit (mock) | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-11 | 01 | 0 | FB-01 | unit (mock) | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |
| 3-W0-12 | 01 | 0 | FB-02 | unit | `npx jest --testPathPattern=generation` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install --save-dev jest ts-jest @types/jest` — install test framework
- [ ] `jest.config.cjs` — Jest config with ts-jest transformer, moduleNameMapper for `obsidian` mock
- [ ] `src/__mocks__/obsidian.ts` — Mock module for `TFile`, `TFolder`, `Notice`, `requestUrl`, status bar item
- [ ] `src/__tests__/generation.test.ts` — Test file with stubs for all 12 requirements above

---

## Manual-Only Verifications

*All phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
