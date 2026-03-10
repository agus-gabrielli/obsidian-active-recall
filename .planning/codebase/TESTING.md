# Testing Patterns

**Analysis Date:** 2026-03-08

## Test Framework

**Runner:** None configured

No test runner (Jest, Vitest, Mocha, etc.) is listed in `package.json` devDependencies. There is no `jest.config.*`, `vitest.config.*`, or similar config file present in the plugin directory.

**Assertion Library:** None

**Run Commands:**
```bash
# No test commands defined in package.json scripts
# Current scripts:
npm run dev      # Watch build (esbuild)
npm run build    # Production build (tsc check + esbuild)
npm run lint     # ESLint
```

## Test File Organization

**Location:** No test files exist in `src/` or any project directory outside `node_modules/`

**Naming:** Not established - no precedent exists in the codebase

## Current Testing Approach

**Manual Testing Only:**
Per `AGENTS.md`, the described testing process is entirely manual:

1. Run `npm run build` to produce `main.js`
2. Copy `main.js`, `manifest.json`, `styles.css` to `<Vault>/.obsidian/plugins/<plugin-id>/`
3. Reload Obsidian
4. Enable plugin in **Settings - Community plugins**
5. Exercise features manually

This project uses a live test vault (`test-vault/`) at the repo root, and the compiled plugin is installed directly into `test-vault/.obsidian/plugins/ai-active-recall/`.

## Test Types

**Unit Tests:** Not present

**Integration Tests:** Not present

**E2E Tests:** Not present

**Manual Tests:** Primary (and only) testing method - install into Obsidian, click through features

## Coverage

**Requirements:** None enforced

**Coverage tooling:** None configured

## Mocking

**Framework:** None

**Obsidian API Mocking Challenge:**
The Obsidian API (`obsidian` package) is not easily unit-testable because it requires a running Obsidian app context. Common approaches used in the Obsidian ecosystem (not yet implemented here):
- Manual mock objects implementing Obsidian interfaces
- `obsidian-mock` npm package
- Partial interface mocks using `Partial<App>` etc.

## Recommended Testing Setup (Not Yet Implemented)

When adding tests, use this pattern with Vitest (recommended for ESM-first projects):

**Install:**
```bash
npm install --save-dev vitest
```

**Config (`vitest.config.ts`):**
```typescript
import { defineConfig } from 'vitest/config';
export default defineConfig({
    test: {
        environment: 'node',
    },
});
```

**Script addition to `package.json`:**
```json
"test": "vitest run",
"test:watch": "vitest"
```

**Test file naming convention (to establish):**
- Co-located: `src/utils/helpers.test.ts`
- Or separate: `src/__tests__/helpers.test.ts`

**Recommended mock pattern for Obsidian API:**
```typescript
import { describe, it, expect, vi } from 'vitest';

const mockApp = {
    workspace: { getActiveViewOfType: vi.fn() },
    vault: { read: vi.fn(), modify: vi.fn() },
} as unknown as App;
```

## What to Test (When Tests Are Added)

**High priority targets:**
- Pure utility functions in `src/utils/` (no Obsidian dependencies)
- Settings validation logic
- Data transformation functions
- Business logic extracted from UI callbacks

**Hard to test (requires Obsidian runtime):**
- Plugin lifecycle (`onload`, `onunload`)
- Modal rendering (`onOpen`, `onClose`)
- Command callbacks that interact with editor/workspace
- Settings tab rendering

**Strategy:** Extract pure logic from Obsidian callbacks into testable utility functions. Keep Obsidian API calls at the boundary (in `main.ts`, commands, UI files) so the core logic can be unit tested.

---

*Testing analysis: 2026-03-08*
