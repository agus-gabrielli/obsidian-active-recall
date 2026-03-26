---
phase: 12
slug: v2-release
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-25
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | jest 30.x |
| **Config file** | jest.config.cjs |
| **Quick run command** | `npx jest --bail` |
| **Full suite command** | `npx jest` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx jest --bail`
- **After every plan wave:** Run `npx jest`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | DIST-03 | build+test | `npx jest --bail && npm run build` | ✅ | ⬜ pending |
| 12-01-02 | 01 | 1 | DIST-03 | grep | `grep -r 'self-test' src/ manifest.json styles.css` | ✅ | ⬜ pending |
| 12-02-01 | 02 | 1 | DIST-03 | grep | `grep '## Installation' README.md` | ✅ | ⬜ pending |
| 12-03-01 | 03 | 2 | DIST-04 | build | `npm run build` | ✅ | ⬜ pending |
| 12-03-02 | 03 | 2 | DIST-04 | manual | Human-verify in Obsidian | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Plugin loads with new name in Obsidian | DIST-04 | Requires Obsidian runtime | Load plugin, verify "Self Test" appears in Community Plugins |
| Store submission PR format | DIST-04 | Requires GitHub interaction | Verify PR is accepted by obsidianmd/obsidian-releases bot |
| README readability | DIST-03 | Subjective quality | Read README as a new user, verify instructions are clear |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
