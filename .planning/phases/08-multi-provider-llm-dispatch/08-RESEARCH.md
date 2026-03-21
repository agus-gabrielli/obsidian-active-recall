# Phase 8: Multi-Provider LLM Dispatch - Research

**Researched:** 2026-03-21
**Domain:** Gemini API, Anthropic Messages API, provider dispatch architecture
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Swap the provider name into existing error templates - no help links, no provider-specific guidance. "Gemini API key invalid", "Claude service error", etc.
- **D-02:** `classifyError()` takes the provider name as a parameter and interpolates it into messages that currently say "OpenAI"
- **D-03:** When Gemini returns empty candidates due to safety filters, show a plain Notice telling the user their content was blocked by Gemini's safety filters
- **D-04:** No retry, no workaround suggestion - just inform the user what happened
- **D-05:** Same truncation Notice across all three providers - "Warning: response may be truncated due to token limit."
- **D-06:** No provider name in the truncation warning (it's the same situation regardless of provider)

### Claude's Discretion

- Provider adapter structure (separate functions, switch statement, etc.)
- `callLLM()` signature refactor (how provider routing is passed in)
- Anthropic `max_tokens` value selection
- Gemini request body shape and `generationConfig` parameters
- Test structure for the new provider adapters

### Deferred Ideas (OUT OF SCOPE)

None - discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PROV-04 | Plugin calls Gemini via Google AI Studio API (generativelanguage.googleapis.com) using requestUrl() | Gemini REST API structure documented; requestUrl() pattern already established in codebase |
| PROV-05 | Plugin calls Claude via native Anthropic Messages API (api.anthropic.com) using requestUrl() | Anthropic Messages API structure documented; required headers identified |
| PROV-06 | Error messages reference the active provider by name (e.g. "Gemini API key invalid") | classifyError() refactor pattern defined; provider name interpolation approach confirmed |
</phase_requirements>

---

## Summary

Phase 8 wires up the actual Gemini and Anthropic API calls that Phase 7's settings UI now selects between. The codebase already has a working OpenAI adapter in `callLLM()` and a `classifyError()` function that needs to become provider-aware. The main work is implementing two new provider adapters (Gemini and Claude), refactoring `callLLM()` to dispatch based on `settings.provider`, and extending `classifyError()` to accept a provider label for error message interpolation.

The two APIs are structurally different. Anthropic is the simpler of the two: it mirrors OpenAI's messages format closely, adds two required headers (`x-api-key` and `anthropic-version`), and requires `max_tokens` to be set explicitly. Gemini is more different: it uses a `contents` array with `parts`, places the system prompt in a separate top-level `system_instruction` field, and key/auth is a URL query parameter rather than a header. Both use `requestUrl()` with `throw: false` and manual status checking - the existing pattern.

**Primary recommendation:** Refactor `callLLM(apiKey, model, messages)` into a dispatcher that reads `settings.provider` and calls one of three private adapter functions: `callOpenAI`, `callGemini`, `callAnthropic`. This isolates the per-API differences behind a stable interface that `GenerationService.generate()` already calls.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `requestUrl` (Obsidian API) | Built-in | All HTTP calls to LLM APIs | Required by Obsidian sandbox; already used for OpenAI; consistent with REQUIREMENTS.md constraint |

No additional npm packages are needed. All three API calls use `requestUrl()` from the Obsidian API directly.

### Supporting

No additional libraries. The project already has:
- `jest` + `ts-jest` for tests (run with `npx jest`)
- `typescript` for type checking

---

## Architecture Patterns

### Recommended Project Structure

No new files required. All changes are in `src/generation.ts`.

```
src/
  generation.ts    # Add callGemini(), callAnthropic(); refactor callLLM() into dispatcher
  settings.ts      # Read-only for this phase (PROVIDER_CONFIG.label used for error messages)
  __tests__/
    generation.test.ts  # Extend with new provider adapter tests
```

### Pattern 1: Provider Dispatcher in callLLM()

**What:** `callLLM()` signature changes to accept the full settings object (or at minimum `provider`, `apiKey`, `model`). It switches on `settings.provider` and delegates to one of three private adapter functions. Each adapter handles its own URL construction, headers, request body, response parsing, and truncation detection.

**When to use:** Single dispatcher is cleaner than scattering switch statements at call sites. `GenerationService.generate()` doesn't need to change - it already calls `callLLM(providerCfg.apiKey, providerCfg.model, messages)`, though the signature will need to include provider.

**Recommended signature change:**

```typescript
// Before (OpenAI only)
export async function callLLM(
    apiKey: string,
    model: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<string>

// After (multi-provider dispatcher)
export async function callLLM(
    provider: LLMProvider,
    apiKey: string,
    model: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<string>
```

Call sites in `GenerationService.generate()` change from:
```typescript
callLLM(providerCfg.apiKey, providerCfg.model, messages)
```
to:
```typescript
callLLM(this.settings.provider, providerCfg.apiKey, providerCfg.model, messages)
```

### Pattern 2: Gemini Adapter

**What:** Converts OpenAI-style `messages` (with `role: 'system'`) into Gemini's format and makes the API call.

**Key differences from OpenAI:**
- URL: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={apiKey}`
- Auth: `?key=` query parameter, NOT an `Authorization` header
- System message: separate top-level `system_instruction` field, not part of `contents`
- Body: `contents` array where each item has `{ role: 'user'|'model', parts: [{ text }] }`
- Response text: `response.json?.candidates?.[0]?.content?.parts?.[0]?.text`
- Truncation: `candidates[0].finishReason === 'MAX_TOKENS'`
- Safety block: `candidates` array is empty OR `candidates[0].finishReason === 'SAFETY'`

**Gemini 2.5 bug:** Gemini 2.5 models can return `finishReason === 'MAX_TOKENS'` with an empty or missing text. Guard both cases:
```typescript
const candidate = response.json?.candidates?.[0];
if (!candidate || candidate.finishReason === 'SAFETY') {
    new Notice('Gemini blocked this content due to safety filters.');
    throw new Error('Gemini safety block');
}
const content = candidate?.content?.parts?.[0]?.text;
if (candidate?.finishReason === 'MAX_TOKENS') {
    new Notice('Warning: response may be truncated due to token limit.');
}
if (!content) {
    throw new Error('Empty response from LLM');
}
```

**Example request body:**
```typescript
// Source: https://ai.google.dev/api/generate-content
const systemMsg = messages.find(m => m.role === 'system');
const userMessages = messages.filter(m => m.role !== 'system');

const body: Record<string, unknown> = {
    contents: userMessages.map(m => ({
        role: 'user',   // Gemini only supports 'user' and 'model'; no 'system' role in contents
        parts: [{ text: m.content }],
    })),
    generationConfig: {
        maxOutputTokens: 8192,
    },
};

if (systemMsg) {
    body.system_instruction = { parts: [{ text: systemMsg.content }] };
}
```

### Pattern 3: Anthropic Adapter

**What:** Converts OpenAI-style `messages` into Anthropic format (very similar) and makes the API call.

**Key differences from OpenAI:**
- URL: `https://api.anthropic.com/v1/messages`
- Auth: `x-api-key: {apiKey}` header (NOT `Authorization: Bearer`)
- Additional required header: `anthropic-version: 2023-06-01`
- System prompt: separate top-level `system` string field, NOT in messages array
- `max_tokens` is REQUIRED in the request body
- Response text: `response.json?.content?.[0]?.text`
- Truncation: `response.json?.stop_reason === 'max_tokens'`

**Example request body:**
```typescript
// Source: https://platform.claude.com/docs/en/api/messages
const systemMsg = messages.find(m => m.role === 'system');
const userMessages = messages.filter(m => m.role !== 'system');

const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    messages: userMessages.map(m => ({ role: m.role, content: m.content })),
};

if (systemMsg) {
    body.system = systemMsg.content;
}
```

**Example headers:**
```typescript
headers: {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'Content-Type': 'application/json',
}
```

**Response extraction:**
```typescript
const content = response.json?.content?.[0]?.text;
if (response.json?.stop_reason === 'max_tokens') {
    new Notice('Warning: response may be truncated due to token limit.');
}
```

### Pattern 4: classifyError() Provider Interpolation

**What:** Add a `provider` parameter (display label string) and replace hardcoded "OpenAI" with the interpolated label.

**Current signature:**
```typescript
export function classifyError(status: number, apiError?: unknown): string
```

**New signature:**
```typescript
export function classifyError(status: number, apiError?: unknown, provider = 'OpenAI'): string
```

The `>= 500` branch changes from:
```typescript
if (status >= 500) return 'OpenAI service error. Please try again later.';
```
to:
```typescript
if (status >= 500) return `${provider} service error. Please try again later.`;
```

The `401` branch changes from:
```typescript
if (status === 401) return 'Invalid API key. Check your key in Settings.';
```
to - per D-01/D-02, the provider name goes into the message:
```typescript
if (status === 401) return `${provider} API key invalid. Check your key in Settings.`;
```

**How to get the display label in GenerationService.generate():**
```typescript
import { PROVIDER_CONFIG } from './settings';
// ...
const providerLabel = PROVIDER_CONFIG[this.settings.provider].label;
// Pass to classifyError when catching LLMError:
const msg = err instanceof LLMError
    ? classifyError(err.status, err.apiError, providerLabel)
    : 'Generation failed. Check your settings and try again.';
```

### Anti-Patterns to Avoid

- **Putting system message in Gemini `contents` array:** Gemini does not support `role: 'system'` in `contents`. It must go in the top-level `system_instruction` field.
- **Using `Authorization: Bearer` for Anthropic:** Anthropic uses `x-api-key` header, not Bearer token.
- **Omitting `anthropic-version` header:** Without it, the Anthropic API returns a 400 or uses an unexpected default version.
- **Omitting `max_tokens` for Anthropic:** It is required; omitting causes a 400 error.
- **Not guarding empty `candidates` for Gemini safety blocks:** When Gemini safety-blocks content, `candidates` may be empty or have `finishReason: 'SAFETY'`. Accessing `candidates[0]` without guarding throws.
- **Assuming Gemini 2.5 `MAX_TOKENS` means content exists:** Gemini 2.5 models can set `finishReason: 'MAX_TOKENS'` when the content field is also empty/null. Always check for both conditions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP calls to LLM APIs | Custom fetch wrapper | `requestUrl()` from Obsidian API | Obsidian requires requestUrl() for network calls; already established in codebase |
| Error status checking | Custom retry logic | Manual status check after `throw: false` | Established project pattern; requestUrl does not throw on non-200 |

**Key insight:** All three providers need only `requestUrl()`. No SDK installs needed. The adapters are straightforward wrappers around the REST APIs.

---

## Common Pitfalls

### Pitfall 1: Gemini System Message in contents Array

**What goes wrong:** `buildMessages()` currently returns `[{ role: 'system', content: ... }, { role: 'user', content: ... }]`. Passing this directly to Gemini as `contents` will fail because Gemini does not accept `role: 'system'` in the contents array.

**Why it happens:** OpenAI and Anthropic accept system messages in the messages array (OpenAI) or as a separate field (Anthropic). Gemini uses a completely different field: `system_instruction`.

**How to avoid:** In the Gemini adapter, split the messages array: extract the system message for `system_instruction`, map remaining messages to Gemini's `contents` format.

**Warning signs:** 400 Bad Request from Gemini API; or generation completes but system instructions are ignored.

---

### Pitfall 2: Gemini Safety Block - Empty candidates Array

**What goes wrong:** When Gemini's safety filters block content, `candidates` may be an empty array or missing entirely. Accessing `response.json.candidates[0].content.parts[0].text` throws a TypeError.

**Why it happens:** Safety-blocked requests are not errors at the HTTP level (status is 200). The response structure is just missing the candidate content.

**How to avoid:** Guard with `candidates?.[0]` and check `finishReason === 'SAFETY'` before accessing text. Show a plain Notice per D-03.

**Warning signs:** TypeError: Cannot read properties of undefined; generation silently fails.

---

### Pitfall 3: Gemini 2.5 MAX_TOKENS + Empty Content

**What goes wrong:** Gemini 2.5 (`gemini-2.5-pro`, `gemini-2.5-flash`) can return `finishReason: 'MAX_TOKENS'` with empty or null text content. The truncation Notice fires but then `!content` check throws "Empty response from LLM".

**Why it happens:** Gemini 2.5 bug - documented in STATE.md "Critical Pitfalls for v2.0" section. The behavior differs from Gemini 2.0.

**How to avoid:** Check `finishReason` and emit the truncation Notice AFTER confirming content exists, or handle the empty-with-MAX_TOKENS case explicitly.

**Warning signs:** "Empty response from LLM" error thrown after truncation Notice for Gemini 2.5 models specifically.

---

### Pitfall 4: Anthropic Missing Required Headers

**What goes wrong:** Calling Anthropic API without `x-api-key` or `anthropic-version` returns a 400 or 401.

**Why it happens:** Anthropic's auth scheme differs from OpenAI's. `Authorization: Bearer` does not work.

**How to avoid:** Always include both `x-api-key: {apiKey}` and `anthropic-version: 2023-06-01` in headers.

**Warning signs:** 400 from api.anthropic.com even with a valid key.

---

### Pitfall 5: Anthropic Missing max_tokens

**What goes wrong:** Anthropic returns 400: `max_tokens: field required`.

**Why it happens:** `max_tokens` is required in every Anthropic request (unlike OpenAI where it is optional).

**How to avoid:** Always include `max_tokens` in the Anthropic request body.

**Warning signs:** 400 from api.anthropic.com with body validation error.

---

### Pitfall 6: classifyError Tests Break After Signature Change

**What goes wrong:** Existing tests assert `classifyError(500) === 'OpenAI service error. Please try again later.'`. After adding provider interpolation, the test expectation no longer matches.

**Why it happens:** The default provider value of `'OpenAI'` must match the old hardcoded string exactly for backwards compatibility, OR tests must be updated to match the new behavior.

**How to avoid:** If the new default is `provider = 'OpenAI'` and the new message is `${provider} service error. Please try again later.`, then the old test assertion still passes. But the 401 message changes from "Invalid API key. Check your key in Settings." to "${provider} API key invalid. Check your key in Settings." - this WILL break existing tests. Update the tests as part of this phase.

**Warning signs:** Jest test failures for `classifyError(401)` and `classifyError(500)` after the refactor.

---

## Code Examples

Verified patterns from official sources:

### Gemini API Request
```typescript
// Source: https://ai.google.dev/api/generate-content
async function callGemini(
    apiKey: string,
    model: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<string> {
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
        contents: userMessages.map(m => ({
            role: 'user',
            parts: [{ text: m.content }],
        })),
        generationConfig: { maxOutputTokens: 8192 },
    };
    if (systemMsg) {
        body.system_instruction = { parts: [{ text: systemMsg.content }] };
    }

    const response = await requestUrl({
        url: `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        throw: false,
    });

    if (response.status !== 200) {
        throw new LLMError(response.status, response.json);
    }

    const candidate = response.json?.candidates?.[0];
    if (!candidate || candidate.finishReason === 'SAFETY') {
        new Notice('Gemini blocked this content due to safety filters.');
        throw new Error('Gemini safety block');
    }

    const content = candidate?.content?.parts?.[0]?.text;
    if (candidate?.finishReason === 'MAX_TOKENS') {
        new Notice('Warning: response may be truncated due to token limit.');
    }
    if (!content) {
        throw new Error('Empty response from LLM');
    }
    return content;
}
```

### Anthropic Messages API Request
```typescript
// Source: https://platform.claude.com/docs/en/api/messages
async function callAnthropic(
    apiKey: string,
    model: string,
    messages: Array<{ role: 'system' | 'user'; content: string }>
): Promise<string> {
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    const body: Record<string, unknown> = {
        model,
        max_tokens: 8192,
        messages: userMessages.map(m => ({ role: m.role, content: m.content })),
    };
    if (systemMsg) {
        body.system = systemMsg.content;
    }

    const response = await requestUrl({
        url: 'https://api.anthropic.com/v1/messages',
        method: 'POST',
        headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        throw: false,
    });

    if (response.status !== 200) {
        throw new LLMError(response.status, response.json);
    }

    const content = response.json?.content?.[0]?.text;
    if (response.json?.stop_reason === 'max_tokens') {
        new Notice('Warning: response may be truncated due to token limit.');
    }
    if (!content) {
        throw new Error('Empty response from LLM');
    }
    return content;
}
```

### classifyError with Provider Interpolation
```typescript
// Updated signature - default keeps backward compat with OpenAI tests
export function classifyError(status: number, apiError?: unknown, provider = 'OpenAI'): string {
    if (status === 401) return `${provider} API key invalid. Check your key in Settings.`;
    if (status === 429) return 'Rate limit reached. Wait a moment, then try again.';
    if (status === 400) {
        const code = (apiError as { error?: { code?: string } })?.error?.code;
        if (code === 'context_length_exceeded') {
            return 'Folder is too large to process. Try removing some notes or reducing note length.';
        }
    }
    if (status >= 500) return `${provider} service error. Please try again later.`;
    return 'Network error. Check your internet connection.';
}
```

### GenerationService.generate() Error Handling with Provider Label
```typescript
// In GenerationService.generate():
import { PROVIDER_CONFIG } from './settings';

// In catch block:
const providerLabel = PROVIDER_CONFIG[this.settings.provider].label;
const msg = err instanceof LLMError
    ? classifyError(err.status, err.apiError, providerLabel)
    : 'Generation failed. Check your settings and try again.';
new Notice(msg);
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single OpenAI callLLM() | Multi-provider dispatcher with per-adapter functions | This phase | All three providers work through same interface |
| Hardcoded "OpenAI" in classifyError() | Provider-interpolated error strings | This phase | PROV-06 compliant error messages |

---

## Open Questions

1. **max_tokens value for Anthropic and Gemini**
   - What we know: Both require an explicit value. Claude Sonnet 4.6 supports up to 64k output tokens; Gemini 2.5 Pro/Flash support large outputs.
   - What's unclear: The right default. Setting too low truncates; too high wastes quota. OpenAI's current code does not set max_tokens at all (uses model default).
   - Recommendation: Use 8192 as a conservative default for both - matches the existing ~120k token input budget usage pattern and leaves room for structured output. This is a discretion item per D-02 in CONTEXT.md.

2. **Test mock structure for Gemini/Anthropic response shapes**
   - What we know: Jest mock `requestUrl` currently returns an OpenAI-shaped response. New tests need Gemini and Anthropic shapes.
   - What's unclear: Whether to update the global `beforeEach` mock or use per-test mocks.
   - Recommendation: Keep the global mock returning OpenAI shape (preserves existing tests), add per-test mocks for Gemini and Anthropic adapter tests using `mockResolvedValueOnce`.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Jest 30 + ts-jest |
| Config file | `jest.config.cjs` |
| Quick run command | `npx jest --testPathPattern generation` |
| Full suite command | `npx jest` |

### Phase Requirements - Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| PROV-04 | Gemini adapter calls generativelanguage.googleapis.com with correct body | unit | `npx jest --testPathPattern generation` | existing - needs new tests |
| PROV-04 | Gemini adapter extracts text from candidates[0].content.parts[0].text | unit | `npx jest --testPathPattern generation` | existing - needs new tests |
| PROV-04 | Gemini adapter detects safety block and shows Notice | unit | `npx jest --testPathPattern generation` | existing - needs new tests |
| PROV-05 | Anthropic adapter calls api.anthropic.com with x-api-key header | unit | `npx jest --testPathPattern generation` | existing - needs new tests |
| PROV-05 | Anthropic adapter extracts text from content[0].text | unit | `npx jest --testPathPattern generation` | existing - needs new tests |
| PROV-06 | classifyError with provider='Gemini' returns "Gemini API key invalid" | unit | `npx jest --testPathPattern generation` | existing - needs updated tests |
| PROV-06 | classifyError with provider='Claude (Anthropic)' returns provider-named error | unit | `npx jest --testPathPattern generation` | existing - needs updated tests |

### Sampling Rate
- **Per task commit:** `npx jest --testPathPattern generation`
- **Per wave merge:** `npx jest`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None - existing test infrastructure (`src/__tests__/generation.test.ts`, jest.config.cjs, `src/__mocks__/obsidian.ts`) covers all phase requirements. New tests extend the existing file; no new files needed.

Note: The existing `classifyError(500)` test asserts `'OpenAI service error...'` - this test MUST be updated as part of the RED phase to reflect the new provider-interpolated message format.

---

## Sources

### Primary (HIGH confidence)
- `https://ai.google.dev/api/generate-content` - Gemini REST API: request body shape, response shape, finishReason values, system_instruction field
- `https://platform.claude.com/docs/en/api/messages` - Anthropic Messages API: required headers, request body, response shape, stop_reason
- `https://platform.claude.com/docs/en/about-claude/models/overview` - Current Claude model IDs verified: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5

### Secondary (MEDIUM confidence)
- `src/generation.ts` (lines 117-161) - Existing classifyError and callLLM patterns verified by direct source read
- `.planning/STATE.md` "Critical Pitfalls for v2.0" - Gemini 2.5 MAX_TOKENS + empty content bug, safety block detection pattern

### Tertiary (LOW confidence)
None.

---

## Metadata

**Confidence breakdown:**
- Gemini API structure: HIGH - verified from official docs (ai.google.dev)
- Anthropic API structure: HIGH - verified from official docs (platform.claude.com)
- Claude model IDs in settings.ts: HIGH - verified against models overview (current models are correct: claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5)
- Architecture patterns: HIGH - based on existing codebase direct read
- Pitfalls: HIGH - Gemini 2.5 bug confirmed in STATE.md and consistent with official docs

**Research date:** 2026-03-21
**Valid until:** 2026-04-21 (API shapes stable; model IDs may change faster)
