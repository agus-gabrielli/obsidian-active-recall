---
phase: 4
slug: commands-and-sidebar
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-11
---

# Phase 4 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 with ts-jest |
| **Config file** | `jest.config.cjs` (project root) |
| **Quick run command** | `npx jest` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 4-01-01 | 01 | 0 | CMD-02, CMD-03, UI-01, UI-02 | unit | `npx jest --testPathPatterns sidebar` | ❌ W0 | ⬜ pending |
| 4-01-02 | 01 | 0 | UI-01, UI-02 | unit | `npx jest --testPathPatterns sidebar` | ❌ W0 | ⬜ pending |
| 4-02-01 | 02 | 1 | CMD-03 | unit | `npx jest --testPathPatterns sidebar` | ❌ W0 | ⬜ pending |
| 4-02-02 | 02 | 1 | UI-01, UI-02 | unit | `npx jest --testPathPatterns sidebar` | ❌ W0 | ⬜ pending |
| 4-03-01 | 03 | 1 | CMD-02 | unit | `npx jest --testPathPatterns sidebar` | ❌ W0 | ⬜ pending |
| 4-03-02 | 03 | 1 | UI-01, UI-02 | unit | `npx jest --testPathPatterns sidebar` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `src/__tests__/sidebar.test.ts` - unit tests for CMD-02, CMD-03, UI-01, UI-02 logic (getFolderStatuses, eligibility filter, date derivation, activateView workspace interaction)
- [ ] Extend `src/__mocks__/obsidian.ts` to add `TFolder` children with `TFile` instances, `WorkspaceLeaf` mock, `Menu` mock with `addItem`, and `vault.getAllFolders` mock

*Existing Jest + ts-jest infrastructure covers all phase requirements - no new framework installation needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Ribbon icon appears in Obsidian sidebar | CMD-01 (ribbon) | Requires Obsidian runtime DOM | Open Obsidian, verify ribbon icon visible, click it, confirm panel opens |
| Context menu item "Generate Self-Test" appears on folder right-click | CMD-03 | Requires Obsidian file-explorer DOM | Right-click folder in file explorer, verify menu item present |
| Sidebar panel renders two sections with correct folders | UI-01, UI-02 | Requires Obsidian runtime ItemView | Open panel, verify "Self-tests" and "No self-test" sections; verify full paths shown |
| Auto-refresh: sidebar updates after generation from any entry point | UI-01, UI-02 | Requires runtime integration | Generate from context menu, verify panel updates without manual close/reopen |
| No duplicate panes after disable/re-enable | UI-01, UI-02 | Requires Obsidian runtime lifecycle | Disable plugin, re-enable, verify only one panel tab exists |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
