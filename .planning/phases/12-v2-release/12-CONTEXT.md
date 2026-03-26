# Phase 12: v2.0 Release - Context

**Gathered:** 2026-03-25
**Status:** Ready for planning

<domain>
## Phase Boundary

Plugin renamed from "AI Active Recall" to "Self Test" across all code and user-facing surfaces. README rewritten to document multi-provider setup and all four generation modes. Plugin packaged at version 1.0.0 (first public release), passing Obsidian community store requirements, with submission PR open against obsidianmd/obsidian-releases.

</domain>

<decisions>
## Implementation Decisions

### Plugin rename
- **D-01:** Plugin ID changes from `ai-active-recall` to `self-test` in manifest.json
- **D-02:** Full internal rename - TypeScript class names (`ActiveRecallPlugin` -> `SelfTestPlugin`, `ActiveRecallSidebarView` -> `SelfTestSidebarView`, `ActiveRecallSettings` -> `SelfTestSettings`, etc.)
- **D-03:** All CSS class prefixes change from `active-recall-*` to `self-test-*` (styles.css + all references in .ts files and tests)
- **D-04:** User-facing strings updated: sidebar title, command names ("Open Active Recall Panel" -> "Open Self Test Panel"), ribbon tooltip
- **D-05:** package.json name updated from `obsidian-sample-plugin` to `self-test`
- **D-06:** No migration needed - plugin has never been publicly released, so no existing installs to preserve

### README structure
- **D-07:** Intro paragraph stays high-level - mentions what the plugin does without listing all modes
- **D-08:** Installation uses pick-one approach for provider setup: "Choose your provider in settings (OpenAI, Google Gemini, or Claude), then enter your API key" with links to all three key pages
- **D-09:** How to use section organized by mode (Folder, Tag, Linked Notes, Single Note) - each subsection explains what it does and how to trigger it
- **D-10:** Science section and differentiation section can be improved at Claude's discretion
- **D-11:** README targets non-technical Obsidian users (carried from Phase 5)
- **D-12:** Text-only - no screenshots or GIFs (carried from Phase 5)

### Version and release
- **D-13:** Version is 1.0.0 (first public release - internal v1/v2 milestone distinction is not exposed)
- **D-14:** `isDesktopOnly: true` - no mobile testing done, safe default for first release
- **D-15:** GitHub release tag must match manifest version exactly (no `v` prefix)
- **D-16:** Release assets: main.js, styles.css, manifest.json attached to GitHub release
- **D-17:** PR opened against obsidianmd/obsidian-releases with plugin entry

### Claude's Discretion
- Exact README prose and section ordering
- Science section improvements
- Differentiation section improvements
- Ribbon icon choice (currently `brain-circuit` - may want to reconsider for "Self Test" branding)
- Store submission PR description and format
- versions.json content (1.0.0 mapping)

</decisions>

<specifics>
## Specific Ideas

- Plugin name "Self Test" chosen because: "AI" prefix is noise in plugin stores, "Active Recall" is niche terminology, "Self Test" is universally understood and matches the `_self-test.md` file naming convention
- README provider setup should link to where users get API keys: platform.openai.com, aistudio.google.com, console.anthropic.com

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Store submission
- Obsidian community plugin submission requirements at obsidianmd/obsidian-releases (agent must check current requirements before opening PR)

### Prior release context
- `.planning/phases/05-polish-and-release/05-CONTEXT.md` - v1 README decisions (non-technical audience, text-only, API key in Installation)

### Rename scope
- `manifest.json` - Plugin ID, name, version, isDesktopOnly
- `package.json` - Package name
- `styles.css` - All CSS class definitions (~40 classes with `active-recall-*` prefix)
- `src/sidebar.ts` - VIEW_TYPE constant, class name, user-facing strings, CSS class references
- `src/main.ts` - Plugin class name, command IDs, command names, ribbon tooltip
- `src/settings.ts` - Settings interface and class names
- `src/modals.ts` - CSS class references
- `src/__tests__/sidebar.test.ts` - CSS class references in test assertions

</canonical_refs>

<code_context>
## Existing Code Insights

### Rename targets (exhaustive)
- `manifest.json`: id `ai-active-recall`, name `AI Active Recall`
- `package.json`: name `obsidian-sample-plugin`
- `versions.json`: `1.0.0` entry (keep version, already correct)
- `styles.css`: ~40 classes with `active-recall-*` prefix, 1 keyframe `active-recall-spin`
- `src/sidebar.ts`: `VIEW_TYPE_ACTIVE_RECALL` constant, `ActiveRecallSidebarView` class, `getDisplayText()` returns "Active Recall", CSS class string literals
- `src/main.ts`: `ActiveRecallPlugin` class, command id `open-active-recall-panel`, command name "Open Active Recall Panel", ribbon tooltip "Open Active Recall Panel", imports
- `src/settings.ts`: `ActiveRecallSettings` interface, `ActiveRecallSettingTab` class (need to verify)
- `src/modals.ts`: CSS class references (`active-recall-tag-suggestion`, `active-recall-note-suggestion`, etc.)
- `src/__tests__/sidebar.test.ts`: CSS class string assertions
- `README.md`: Title, all mentions of "AI Active Recall" and "Active Recall"

### Established Patterns
- esbuild config copies styles.css to test vault on build
- `versions.json` maps version to minAppVersion
- Store submission: PR to obsidianmd/obsidian-releases with community-plugins.json entry

### Integration Points
- GitHub release: create release with tag matching manifest version, attach 3 assets
- Store PR: fork obsidianmd/obsidian-releases, add entry to community-plugins.json

</code_context>

<deferred>
## Deferred Ideas

- Flip `isDesktopOnly: false` after manual mobile testing - future update
- Screenshots and GIFs in README - post-release improvement
- Custom OpenAI-compatible endpoint support - future scope

</deferred>

---

*Phase: 12-v2-release*
*Context gathered: 2026-03-25*
