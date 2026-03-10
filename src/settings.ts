import { App, PluginSettingTab, Setting } from 'obsidian';
import type ActiveRecallPlugin from './main';

export type LLMProvider = 'openai';

export interface ActiveRecallSettings {
    provider: LLMProvider;
    apiKey: string;
    model: string;
    language: string;
    generateHints: boolean;
    generateReferenceAnswers: boolean;
    generateConceptMap: boolean;
    customInstructions: string;
}

export const DEFAULT_SETTINGS: ActiveRecallSettings = {
    provider: 'openai',
    apiKey: '',
    model: 'gpt-4o-mini',
    language: '',
    generateHints: true,
    generateReferenceAnswers: true,
    generateConceptMap: true,
    customInstructions: '',
};

export class ActiveRecallSettingTab extends PluginSettingTab {
    plugin: ActiveRecallPlugin;

    constructor(app: App, plugin: ActiveRecallPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

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
                    .setPlaceholder('sk-...')
                    .setValue(this.plugin.settings.apiKey)
                    .onChange(async (value) => {
                        this.plugin.settings.apiKey = value;
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName('Model')
            .setDesc('OpenAI model name to use for generation.')
            .addText(text => text
                .setPlaceholder('gpt-4o-mini')
                .setValue(this.plugin.settings.model)
                .onChange(async (value) => {
                    this.plugin.settings.model = value;
                    await this.plugin.saveSettings();
                })
            );

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
