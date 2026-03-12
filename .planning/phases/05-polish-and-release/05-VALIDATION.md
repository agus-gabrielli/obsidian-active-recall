---
phase: 5
slug: polish-and-release
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-12
---

# Phase 5 - Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest 30.2.0 |
| **Config file** | `jest.config.cjs` |
| **Quick run command** | `npx jest` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green + manual README review
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-01-01 | error-audit | 1 | DIST-02 | unit | `npx jest` | ✅ | ⬜ pending |
| 5-01-02 | error-audit | 1 | DIST-02 | unit | `npx jest` | ✅ | ⬜ pending |
| 5-02-01 | readme-rewrite | 1 | DIST-02 | manual | n/a - prose review | ✅ | ⬜ pending |
| 5-03-01 | mobile-compat | 1 | DIST-02 | manual | n/a - device check | ✅ | ⬜ pending |
| 5-04-01 | release-packaging | 1 | DIST-02 | manual | n/a - release steps | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed - this phase is documentation, prose edits, and release packaging.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| README covers installation + API key config | DIST-02 | Prose content - no automated test | Read README.md; verify: What it does, Installation (numbered steps including API key config as a step), How to use (3 entry points). Check a non-technical person could follow it. |
| All 5 error states show plain-language messages | DIST-02 | UI Notice messages - visual check | In Settings, enter invalid key, trigger generation; trigger rate-limit via rapid calls; disable wifi and trigger; point at empty folder; point at very large folder. Each must produce a 2-sentence "Problem + action" Notice with no raw API strings. |
| Plugin loads on mobile without crashing | DIST-02 | Requires physical device | If device available: enable plugin on mobile Obsidian, open Settings tab, verify it renders. If no device: confirm `isDesktopOnly: true` is set in manifest. |
| GitHub release tag matches manifest version | DIST-02 | Git/GitHub UI verification | Confirm release tag is `1.0.0` (not `v1.0.0`); confirm assets `main.js`, `manifest.json`, `styles.css` are attached as binary files. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
