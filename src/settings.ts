import { App, PluginSettingTab, Setting } from 'obsidian';
import type ActiveRecallPlugin from './main';

export type LLMProvider = 'openai' | 'gemini' | 'anthropic';

const CUSTOM_MODEL_VALUE = '__custom__';

export interface ProviderMeta {
    label: string;
    models: string[];
    defaultModel: string;
    placeholder: string;
    modelDesc: string;
}

export const PROVIDER_CONFIG: Record<LLMProvider, ProviderMeta> = {
    openai: {
        label: 'OpenAI',
        models: ['gpt-5.4', 'gpt-5.4-mini', 'gpt-5.4-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'gpt-4o', 'gpt-4o-mini'],
        defaultModel: 'gpt-5.4-mini',
        placeholder: 'sk-...',
        modelDesc: 'OpenAI model to use for generation.',
    },
    gemini: {
        label: 'Gemini',
        models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
        defaultModel: 'gemini-2.5-flash',
        placeholder: 'AIza...',
        modelDesc: 'Gemini model to use for generation.',
    },
    anthropic: {
        label: 'Claude (Anthropic)',
        models: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
        defaultModel: 'claude-sonnet-4-6',
        placeholder: 'sk-ant-...',
        modelDesc: 'Claude model to use for generation.',
    },
};

export interface ActiveRecallSettings {
    provider: LLMProvider;
    openai: { apiKey: string; model: string };
    gemini: { apiKey: string; model: string };
    anthropic: { apiKey: string; model: string };
    language: string;
    generateHints: boolean;
    generateReferenceAnswers: boolean;
    generateConceptMap: boolean;
    customInstructions: string;
}

export const DEFAULT_SETTINGS: ActiveRecallSettings = {
    provider: 'openai',
    openai: { apiKey: '', model: 'gpt-5.4-mini' },
    gemini: { apiKey: '', model: 'gemini-2.5-flash' },
    anthropic: { apiKey: '', model: 'claude-sonnet-4-6' },
    language: '',
    generateHints: true,
    generateReferenceAnswers: true,
    generateConceptMap: true,
    customInstructions: '',
};

/**
 * Migrates v1 flat apiKey/model fields to nested openai config.
 * Must be called on raw loadData() result BEFORE Object.assign with DEFAULT_SETTINGS.
 * Mutates savedData in place.
 */
export function migrateV1Settings(savedData: Record<string, unknown>): void {
    const hasFlat = savedData['apiKey'] !== undefined;
    const hasNested = !!(savedData['openai'] as Record<string, unknown> | undefined)?.['apiKey'];

    if (hasFlat && !hasNested) {
        const model = savedData['model'] !== undefined
            ? (savedData['model'] as string)
            : 'gpt-5.4-mini';
        savedData['openai'] = {
            apiKey: savedData['apiKey'] as string,
            model: model,
        };
    }

    // Clean up flat fields so they don't persist in data.json on next save
    delete savedData['apiKey'];
    delete savedData['model'];
    // Also clean up customModel if it existed from Phase 6
    delete savedData['customModel'];
}

export class ActiveRecallSettingTab extends PluginSettingTab {
    plugin: ActiveRecallPlugin;

    constructor(app: App, plugin: ActiveRecallPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        const providerCfg = PROVIDER_CONFIG[this.plugin.settings.provider];
        const currentProviderSettings = this.plugin.settings[this.plugin.settings.provider];

        // Connection section
        new Setting(containerEl).setName('Connection').setHeading();

        new Setting(containerEl)
            .setName('Provider')
            .setDesc('Additional providers (Anthropic, custom endpoint) will be available in a future version.')
            .addDropdown(drop => drop
                .addOption('openai', 'OpenAI')
                .setValue(this.plugin.settings.provider)
            )
            .setDisabled(true);

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Stored in data.json inside your vault. Do not commit this file to a public git repository.')
            .addText(text => {
                text.inputEl.type = 'password';
                text
                    .setPlaceholder(providerCfg.placeholder)
                    .setValue(currentProviderSettings.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings[this.plugin.settings.provider].apiKey = value;
                        await this.plugin.saveSettings();
                    });
            });

        // Custom = any model not in the curated list (including empty string)
        const isCustomModel = !providerCfg.models.includes(currentProviderSettings.model);

        new Setting(containerEl)
            .setName('Model')
            .setDesc(providerCfg.modelDesc)
            .addDropdown(drop => {
                for (const m of providerCfg.models) {
                    drop.addOption(m, m);
                }
                drop.addOption(CUSTOM_MODEL_VALUE, 'Custom model...');
                drop.setValue(isCustomModel ? CUSTOM_MODEL_VALUE : currentProviderSettings.model);
                drop.onChange(async (value) => {
                    if (value === CUSTOM_MODEL_VALUE) {
                        // Clear model so custom input appears and persists across reopens
                        this.plugin.settings[this.plugin.settings.provider].model = '';
                        await this.plugin.saveSettings();
                        this.display();
                        return;
                    }
                    this.plugin.settings[this.plugin.settings.provider].model = value;
                    await this.plugin.saveSettings();
                    this.display();
                });
            });

        // Show custom model text input when a non-curated model is set
        if (isCustomModel) {
            new Setting(containerEl)
                .setName('Custom model name')
                .setDesc(`Enter the exact ${providerCfg.label} model identifier.`)
                .addText(text => text
                    .setPlaceholder(`e.g. ${providerCfg.defaultModel}`)
                    .setValue(currentProviderSettings.model)
                    .onChange(async (value) => {
                        this.plugin.settings[this.plugin.settings.provider].model = value;
                        await this.plugin.saveSettings();
                    })
                );
        }

        // Output section
        new Setting(containerEl).setName('Output').setHeading();

        new Setting(containerEl)
            .setName('Language')
            .setDesc("Leave empty to match the language of your notes automatically. Enter a language name (e.g. 'Spanish', 'Japanese') to override.")
            .addText(text => text
                .setPlaceholder('e.g. Spanish')
                .setValue(this.plugin.settings.language)
                .onChange(async (value) => {
                    this.plugin.settings.language = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Generate hints')
            .setDesc('Include a collapsible hint for each question.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.generateHints)
                .onChange(async (value) => {
                    this.plugin.settings.generateHints = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Generate reference answers')
            .setDesc('Include a collapsible reference answer for each question.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.generateReferenceAnswers)
                .onChange(async (value) => {
                    this.plugin.settings.generateReferenceAnswers = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Generate concept map')
            .setDesc('Include a brief concept map before the questions when content supports it.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.generateConceptMap)
                .onChange(async (value) => {
                    this.plugin.settings.generateConceptMap = value;
                    await this.plugin.saveSettings();
                })
            );

        new Setting(containerEl)
            .setName('Custom instructions')
            .setDesc('Optional. Appended to the LLM prompt.')
            .addTextArea(text => {
                text
                    .setPlaceholder("Optional. Appended to the LLM prompt. Example: 'Focus on practical applications.'")
                    .setValue(this.plugin.settings.customInstructions);
                text.inputEl.addEventListener('blur', async () => {
                    this.plugin.settings.customInstructions = text.getValue();
                    await this.plugin.saveSettings();
                });
            });
    }
}
