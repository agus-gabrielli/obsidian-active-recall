import {
    render,
    SYSTEM_MESSAGE,
    batchTemplate,
    synthesisTemplate,
    buildConceptMapInstruction,
    buildHintInstruction,
    buildCheckInstruction,
    buildLanguageInstruction,
    buildCustomInstruction,
} from '../prompts';

describe('render()', () => {
    test('replaces a single {{key}} placeholder with the provided value', () => {
        expect(render('Hello {{name}}', { name: 'World' })).toBe('Hello World');
    });

    test('replaces multiple different {{key}} placeholders', () => {
        const result = render('{{greeting}}, {{subject}}!', { greeting: 'Hello', subject: 'World' });
        expect(result).toBe('Hello, World!');
    });

    test('replaces all occurrences of the same placeholder', () => {
        const result = render('{{x}} + {{x}} = ?', { x: '2' });
        expect(result).toBe('2 + 2 = ?');
    });

    test('removes unmatched {{placeholders}} from the output', () => {
        const result = render('Hello {{name}} {{unknown}}', { name: 'World' });
        expect(result).toBe('Hello World ');
    });

    test('returns template unchanged when vars is empty (except cleaning unmatched placeholders)', () => {
        const result = render('no placeholders here', {});
        expect(result).toBe('no placeholders here');
    });
});

describe('SYSTEM_MESSAGE', () => {
    test('is a non-empty string describing the educator role', () => {
        expect(typeof SYSTEM_MESSAGE).toBe('string');
        expect(SYSTEM_MESSAGE.length).toBeGreaterThan(0);
        expect(SYSTEM_MESSAGE).toContain('educator');
    });
});

describe('buildConceptMapInstruction()', () => {
    test('returns empty string when disabled', () => {
        expect(buildConceptMapInstruction(false)).toBe('');
    });

    test('contains "mindmap" when enabled', () => {
        expect(buildConceptMapInstruction(true)).toContain('mindmap');
    });

    test('contains "mermaid" code fence when enabled', () => {
        expect(buildConceptMapInstruction(true).toLowerCase()).toContain('mermaid');
    });

    test('contains ordering guidance (general/foundational to specific/advanced) when enabled', () => {
        const instruction = buildConceptMapInstruction(true);
        expect(instruction).toContain('general/foundational to specific/advanced');
    });
});

describe('buildHintInstruction()', () => {
    test('returns empty string when disabled', () => {
        expect(buildHintInstruction(false)).toBe('');
    });

    test('contains "[!hint]-" callout syntax when enabled', () => {
        expect(buildHintInstruction(true)).toContain('[!hint]-');
    });

    test('contains "contextual cues" language when enabled', () => {
        expect(buildHintInstruction(true)).toContain('contextual cues that situate the concept without revealing');
    });
});

describe('buildCheckInstruction()', () => {
    test('returns empty string when disabled', () => {
        expect(buildCheckInstruction(false)).toBe('');
    });

    test('contains "[!check]-" callout syntax when enabled', () => {
        expect(buildCheckInstruction(true)).toContain('[!check]-');
    });

    test('contains source traceability example when enabled', () => {
        expect(buildCheckInstruction(true)).toContain('Source: [[Note A]], [[Note B]]');
    });

    test('contains explanation quality guidance when enabled', () => {
        expect(buildCheckInstruction(true)).toContain('explanations that help understanding');
    });
});

describe('buildLanguageInstruction()', () => {
    test('returns empty string when language is empty', () => {
        expect(buildLanguageInstruction('')).toBe('');
    });

    test('returns language instruction string when language is provided', () => {
        const result = buildLanguageInstruction('Spanish');
        expect(result).toContain('Spanish');
    });
});

describe('buildCustomInstruction()', () => {
    test('returns empty string when instructions is empty', () => {
        expect(buildCustomInstruction('')).toBe('');
    });

    test('returns the custom instructions when provided', () => {
        const result = buildCustomInstruction('Focus on practical applications.');
        expect(result).toContain('Focus on practical applications.');
    });
});

describe('batchTemplate', () => {
    test('contains question ordering instruction (general and simple to complex and specific)', () => {
        expect(batchTemplate).toContain('general and simple to complex and specific');
    });

    test('full render with all options enabled produces mindmap output', () => {
        const rendered = render(batchTemplate, {
            noteBlocks: '=== Note: Example ===\nsome content',
            conceptMapInstruction: buildConceptMapInstruction(true),
            hintInstruction: buildHintInstruction(true),
            checkInstruction: buildCheckInstruction(true),
            languageInstruction: buildLanguageInstruction(''),
            customInstruction: buildCustomInstruction(''),
        });
        expect(rendered).toContain('mindmap');
    });

    test('full render with all options enabled produces [!hint]- callout syntax', () => {
        const rendered = render(batchTemplate, {
            noteBlocks: '=== Note: Example ===\nsome content',
            conceptMapInstruction: buildConceptMapInstruction(true),
            hintInstruction: buildHintInstruction(true),
            checkInstruction: buildCheckInstruction(true),
            languageInstruction: buildLanguageInstruction(''),
            customInstruction: buildCustomInstruction(''),
        });
        expect(rendered).toContain('[!hint]-');
    });

    test('full render with all options enabled produces [!check]- callout syntax', () => {
        const rendered = render(batchTemplate, {
            noteBlocks: '=== Note: Example ===\nsome content',
            conceptMapInstruction: buildConceptMapInstruction(true),
            hintInstruction: buildHintInstruction(true),
            checkInstruction: buildCheckInstruction(true),
            languageInstruction: buildLanguageInstruction(''),
            customInstruction: buildCustomInstruction(''),
        });
        expect(rendered).toContain('[!check]-');
    });

    test('full render with all options enabled includes source traceability', () => {
        const rendered = render(batchTemplate, {
            noteBlocks: '=== Note: Example ===\nsome content',
            conceptMapInstruction: buildConceptMapInstruction(true),
            hintInstruction: buildHintInstruction(true),
            checkInstruction: buildCheckInstruction(true),
            languageInstruction: buildLanguageInstruction(''),
            customInstruction: buildCustomInstruction(''),
        });
        expect(rendered).toContain('Source:');
    });
});

describe('synthesisTemplate', () => {
    test('full render with all options enabled contains mindmap', () => {
        const rendered = render(synthesisTemplate, {
            noteBlocks: '=== Partial Output 1 ===\nsome partial content',
            conceptMapInstruction: buildConceptMapInstruction(true),
            hintInstruction: buildHintInstruction(true),
            checkInstruction: buildCheckInstruction(true),
            languageInstruction: buildLanguageInstruction(''),
            customInstruction: buildCustomInstruction(''),
        });
        expect(rendered).toContain('mindmap');
    });

    test('full render with all options enabled contains [!hint]- and [!check]-', () => {
        const rendered = render(synthesisTemplate, {
            noteBlocks: '=== Partial Output 1 ===\nsome partial content',
            conceptMapInstruction: buildConceptMapInstruction(true),
            hintInstruction: buildHintInstruction(true),
            checkInstruction: buildCheckInstruction(true),
            languageInstruction: buildLanguageInstruction(''),
            customInstruction: buildCustomInstruction(''),
        });
        expect(rendered).toContain('[!hint]-');
        expect(rendered).toContain('[!check]-');
    });

    test('full render with all options enabled includes source traceability', () => {
        const rendered = render(synthesisTemplate, {
            noteBlocks: '=== Partial Output 1 ===\nsome partial content',
            conceptMapInstruction: buildConceptMapInstruction(true),
            hintInstruction: buildHintInstruction(true),
            checkInstruction: buildCheckInstruction(true),
            languageInstruction: buildLanguageInstruction(''),
            customInstruction: buildCustomInstruction(''),
        });
        expect(rendered).toContain('Source:');
    });
});
