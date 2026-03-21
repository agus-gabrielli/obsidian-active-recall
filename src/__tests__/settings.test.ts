import { migrateV1Settings, PROVIDER_CONFIG } from '../settings';

describe('migrateV1Settings', () => {
    test('migrates v1 flat apiKey and model to openai nested config', () => {
        const savedData: Record<string, unknown> = { apiKey: 'sk-abc', model: 'gpt-4o' };
        migrateV1Settings(savedData);
        expect(savedData['openai']).toEqual({ apiKey: 'sk-abc', model: 'gpt-4o' });
        expect(savedData['apiKey']).toBeUndefined();
        expect(savedData['model']).toBeUndefined();
    });

    test('preserves custom model string exactly', () => {
        const savedData: Record<string, unknown> = { apiKey: 'sk-abc', model: 'ft:gpt-4o:custom' };
        migrateV1Settings(savedData);
        expect((savedData['openai'] as Record<string, unknown>)['model']).toBe('ft:gpt-4o:custom');
    });

    test('uses default model when model field is undefined', () => {
        const savedData: Record<string, unknown> = { apiKey: 'sk-abc' };
        migrateV1Settings(savedData);
        expect((savedData['openai'] as Record<string, unknown>)['model']).toBe('gpt-5.4-mini');
    });

    test('preserves empty string model as-is', () => {
        const savedData: Record<string, unknown> = { apiKey: 'sk-abc', model: '' };
        migrateV1Settings(savedData);
        expect((savedData['openai'] as Record<string, unknown>)['model']).toBe('');
    });

    test('does not overwrite existing nested openai config', () => {
        const savedData: Record<string, unknown> = {
            apiKey: 'sk-old',
            openai: { apiKey: 'sk-new', model: 'gpt-4o' },
        };
        migrateV1Settings(savedData);
        expect((savedData['openai'] as Record<string, unknown>)['apiKey']).toBe('sk-new');
    });

    test('no-ops on fresh v2 install (no flat apiKey)', () => {
        const savedData: Record<string, unknown> = {};
        migrateV1Settings(savedData);
        expect(savedData['openai']).toBeUndefined();
    });

    test('cleans up flat fields even when no migration needed', () => {
        const savedData: Record<string, unknown> = {
            apiKey: 'sk-abc',
            openai: { apiKey: 'sk-abc', model: 'gpt-4o' },
        };
        migrateV1Settings(savedData);
        expect(savedData['apiKey']).toBeUndefined();
        expect(savedData['model']).toBeUndefined();
    });

    test('cleans up customModel field', () => {
        const savedData: Record<string, unknown> = {
            apiKey: 'sk-abc',
            model: 'gpt-4o',
            customModel: 'some-model',
        };
        migrateV1Settings(savedData);
        expect(savedData['customModel']).toBeUndefined();
    });
});

describe('PROVIDER_CONFIG', () => {
    test('has entries for all three providers', () => {
        const keys = Object.keys(PROVIDER_CONFIG);
        expect(keys).toContain('openai');
        expect(keys).toContain('gemini');
        expect(keys).toContain('anthropic');
    });

    test('each provider entry has required non-empty fields', () => {
        for (const provider of ['openai', 'gemini', 'anthropic'] as const) {
            const cfg = PROVIDER_CONFIG[provider];
            expect(cfg.models.length).toBeGreaterThan(0);
            expect(cfg.defaultModel).toBeTruthy();
            expect(cfg.placeholder).toBeTruthy();
            expect(cfg.label).toBeTruthy();
        }
    });
});
