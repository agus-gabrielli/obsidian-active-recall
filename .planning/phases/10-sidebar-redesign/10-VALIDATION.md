---
phase: 10
slug: sidebar-redesign
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 10 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + ts-jest (existing) |
| **Config file** | `jest.config.cjs` |
| **Quick run command** | `npx jest src/__tests__/sidebar.test.ts` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest src/__tests__/sidebar.test.ts`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 | 1 | UI-03 | unit | `npx jest src/__tests__/sidebar.test.ts` | Partial | ⬜ pending |
| 10-01-02 | 01 | 1 | UI-03 | unit | `npx jest src/__tests__/sidebar.test.ts` | Partial | ⬜ pending |
| 10-01-03 | 01 | 1 | UI-03 | unit | `npx jest src/__tests__/sidebar.test.ts` | Partial | ⬜ pending |
| 10-01-04 | 01 | 1 | UI-04 | unit | `npx jest src/__tests__/sidebar.test.ts` | Partial | ⬜ pending |
| 10-01-05 | 01 | 1 | UI-04 | unit | `npx jest src/__tests__/sidebar.test.ts` | Partial | ⬜ pending |
| 10-01-06 | 01 | 1 | UI-03/04 | unit | `npx jest src/__tests__/sidebar.test.ts` | Partial | ⬜ pending |
| 10-01-07 | 01 | 1 | UI-03/04 | unit | `npx jest src/__tests__/sidebar.test.ts` | Partial | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/sidebar.test.ts` - 7+ new test cases for tab bar, Tags panel, Links panel, generating state spinners
- [ ] `src/__mocks__/obsidian.ts` - verify `makeMockEl` supports `addClass`, `querySelector`, `querySelectorAll` for clickable row tests

*Existing infrastructure covers framework and config. Only new test stubs needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tabs render correctly in Obsidian with proper styling | UI-03 | Visual/CSS verification | Open sidebar, verify 3 tabs visible, click each, verify panel switches |
| Clickable entries open self-test files | UI-03/04 | Requires real Obsidian workspace | Click a generated entry in each tab, verify file opens in editor |
| Tab state persists across plugin reload | UI-03 | Requires Obsidian restart | Switch to Tags tab, reload plugin, verify Tags tab is active |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
