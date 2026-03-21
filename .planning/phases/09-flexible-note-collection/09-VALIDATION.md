---
phase: 09
slug: flexible-note-collection
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-21
---

# Phase 09 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 with ts-jest |
| **Config file** | `jest.config.cjs` |
| **Quick run command** | `npx jest --testPathPattern collectors` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --testPathPattern collectors`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | COL-01 | unit | `npx jest --testPathPattern collectors` | Wave 0 | pending |
| 09-01-02 | 01 | 1 | COL-02 | unit | `npx jest --testPathPattern collectors` | Wave 0 | pending |
| 09-01-03 | 01 | 1 | COL-03 | unit | `npx jest --testPathPattern collectors` | Wave 0 | pending |
| 09-01-04 | 01 | 1 | COL-04 | unit | `npx jest --testPathPattern collectors` | Wave 0 | pending |
| 09-01-05 | 01 | 1 | COL-05 | unit | `npx jest --testPathPattern collectors` | Wave 0 | pending |
| 09-01-06 | 01 | 1 | COL-06 | unit | `npx jest --testPathPattern collectors` | Wave 0 | pending |
| 09-01-07 | 01 | 1 | COL-07 | unit | `npx jest --testPathPattern collectors` | Wave 0 | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/collectors.test.ts` - stubs for COL-01 through COL-07 (all new pure functions)
- [ ] `src/__mocks__/obsidian.ts` - add `metadataCache`, `getAllTags`, `vault.getFiles`, `vault.getFileByPath`, `vault.createFolder` to `createMockApp()` and top-level exports

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tag picker modal displays grouped tags with counts | COL-02 | UI rendering requires Obsidian runtime | Open command palette > "Generate Self-Test by Tag" > verify grouped display |
| Linked-notes picker shows note count preview and depth-2 toggle | COL-04, COL-05 | UI rendering requires Obsidian runtime | Open command palette > "Generate Self-Test from Links" > verify preview and toggle |
| File context menu shows "Generate Self-Test" on .md files | COL-06 | Context menu requires Obsidian runtime | Right-click a .md file > verify menu item present; right-click _self-test.md > verify absent |
| Output files written to correct paths | COL-03, COL-07 | File system interaction in vault | Generate by tag > verify `_self-tests/tags/` path; generate single note > verify output location |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
