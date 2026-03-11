import { Notice, Plugin } from 'obsidian';
import { ActiveRecallSettings, DEFAULT_SETTINGS, ActiveRecallSettingTab } from './settings';
import { GenerationService } from './generation';
import { VIEW_TYPE_ACTIVE_RECALL, ActiveRecallSidebarView, buildActivateView, buildContextMenuHandler } from './sidebar';

export default class ActiveRecallPlugin extends Plugin {
    settings: ActiveRecallSettings;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new ActiveRecallSettingTab(this.app, this));

        const statusBarItem = this.addStatusBarItem();
        statusBarItem.setText('');
        const generationService = new GenerationService(this.app, this.settings, statusBarItem);

        this.registerView(
            VIEW_TYPE_ACTIVE_RECALL,
            (leaf) => new ActiveRecallSidebarView(leaf, this.app, generationService)
        );

        const activateView = buildActivateView(this.app);

        this.addCommand({
            id: 'open-active-recall-panel',
            name: 'Open Active Recall Panel',
            callback: () => activateView(),
        });

        this.registerEvent(
            this.app.workspace.on(
                'file-menu',
                buildContextMenuHandler(generationService.generate.bind(generationService), this.app, VIEW_TYPE_ACTIVE_RECALL)
            )
        );

        this.addRibbonIcon('brain-circuit', 'Open Active Recall Panel', () => {
            activateView();
        });

        this.addCommand({
            id: 'generate-self-test',
            name: 'Generate Self-Test for Current Folder',
            callback: async () => {
                const activeFile = this.app.workspace.getActiveFile();
                if (!activeFile) {
                    new Notice('Open a file inside the folder you want to generate a self-test for.');
                    return;
                }
                const folderPath = activeFile.parent?.path ?? '/';
                await generationService.generate(folderPath);
            },
        });
    }

    onunload() {
        this.app.workspace.detachLeavesOfType(VIEW_TYPE_ACTIVE_RECALL);
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData() as Partial<ActiveRecallSettings>);
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}
