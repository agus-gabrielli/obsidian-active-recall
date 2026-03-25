import { TFile, TFolder, Menu, createMockApp, createMockWorkspaceLeaf } from '../__mocks__/obsidian';
import {
  getFolderStatuses,
  getLastGeneratedDate,
  buildContextMenuHandler,
  buildActivateView,
  ActiveRecallSidebarView,
} from '../sidebar';

describe('getFolderStatuses', () => {
  it('returns only folders with at least one non-_self-test .md file', () => {
    const noteFile = new TFile('Notes/note1.md');
    const folder = new TFolder('Notes', [noteFile]);
    const app = createMockApp();
    app.vault.getAllFolders.mockReturnValue([folder]);

    const statuses = getFolderStatuses(app as never);

    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.folder).toBe(folder);
  });

  it('folder with _self-test.md child has selfTestFile non-null', () => {
    const noteFile = new TFile('Notes/note1.md');
    const selfTestFile = new TFile('Notes/_self-test.md');
    const folder = new TFolder('Notes', [noteFile, selfTestFile]);
    const app = createMockApp();
    app.vault.getAllFolders.mockReturnValue([folder]);

    const statuses = getFolderStatuses(app as never);

    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.selfTestFile).toBe(selfTestFile);
  });

  it('folder without _self-test.md child has selfTestFile null', () => {
    const noteFile = new TFile('Notes/note1.md');
    const folder = new TFolder('Notes', [noteFile]);
    const app = createMockApp();
    app.vault.getAllFolders.mockReturnValue([folder]);

    const statuses = getFolderStatuses(app as never);

    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.selfTestFile).toBeNull();
  });

  it('folder whose only .md file is _self-test.md is excluded (not eligible)', () => {
    const selfTestFile = new TFile('Notes/_self-test.md');
    const folder = new TFolder('Notes', [selfTestFile]);
    const app = createMockApp();
    app.vault.getAllFolders.mockReturnValue([folder]);

    const statuses = getFolderStatuses(app as never);

    expect(statuses).toHaveLength(0);
  });

  it('folder with no .md files at all is excluded', () => {
    const imgFile = new TFile('Notes/image.png', 'png');
    const folder = new TFolder('Notes', [imgFile]);
    const app = createMockApp();
    app.vault.getAllFolders.mockReturnValue([folder]);

    const statuses = getFolderStatuses(app as never);

    expect(statuses).toHaveLength(0);
  });

  it('excludes _self-tests directory and its subfolders', () => {
    const noteFile = new TFile('Notes/note1.md');
    const notesFolder = new TFolder('Notes', [noteFile]);
    const tagFile = new TFile('_self-tests/tags/python.md');
    const selfTestsFolder = new TFolder('_self-tests', [tagFile]);
    const tagsFolder = new TFolder('_self-tests/tags', [tagFile]);
    const app = createMockApp();
    app.vault.getAllFolders.mockReturnValue([notesFolder, selfTestsFolder, tagsFolder]);

    const statuses = getFolderStatuses(app as never);

    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.folder).toBe(notesFolder);
  });
});

describe('getLastGeneratedDate', () => {
  it('returns toLocaleDateString() string derived from TFile.stat.mtime', () => {
    const selfTestFile = new TFile('Notes/_self-test.md');
    const fixedTime = new Date('2025-06-15').getTime();
    selfTestFile.stat = { mtime: fixedTime };

    const result = getLastGeneratedDate(selfTestFile);

    expect(result).toBe(new Date(fixedTime).toLocaleDateString());
  });
});

describe('activateView', () => {
  it('when getLeavesOfType returns a leaf, calls revealLeaf on it and does NOT call getRightLeaf', async () => {
    const app = createMockApp();
    const mockLeaf = { setViewState: jest.fn().mockResolvedValue(undefined) };
    app.workspace.getLeavesOfType.mockReturnValue([mockLeaf]);

    const activateView = buildActivateView(app as never);
    await activateView();

    expect(app.workspace.revealLeaf).toHaveBeenCalledWith(mockLeaf);
    expect(app.workspace.getRightLeaf).not.toHaveBeenCalled();
  });

  it('when getLeavesOfType returns [], calls getRightLeaf then setViewState then revealLeaf', async () => {
    const app = createMockApp();
    app.workspace.getLeavesOfType.mockReturnValue([]);
    const newLeaf = { setViewState: jest.fn().mockResolvedValue(undefined) };
    app.workspace.getRightLeaf.mockReturnValue(newLeaf);

    const activateView = buildActivateView(app as never);
    await activateView();

    expect(app.workspace.getRightLeaf).toHaveBeenCalled();
    expect(newLeaf.setViewState).toHaveBeenCalled();
    expect(app.workspace.revealLeaf).toHaveBeenCalledWith(newLeaf);
  });
});

describe('file-menu context menu handler', () => {
  it('when file is TFolder instance, adds "Generate Self-Test" item to menu', () => {
    const folder = new TFolder('Notes', []);
    const menu = new Menu();
    const handler = buildContextMenuHandler(jest.fn());

    handler(menu as never, folder as never);

    const items = menu.getItems();
    expect(items).toHaveLength(1);
    expect(items[0]!.title).toBe('Generate Self-Test');
  });

  it('when file is TFile instance, does NOT add any item to menu', () => {
    const file = new TFile('Notes/note.md');
    const menu = new Menu();
    const handler = buildContextMenuHandler(jest.fn());

    handler(menu as never, file as never);

    const items = menu.getItems();
    expect(items).toHaveLength(0);
  });
});

describe('tabbed sidebar', () => {
  it('renderPanel creates a tab bar with three tabs: Folders, Tags, Links', () => {
    // Setup: create sidebar view, call refresh()
    // Assert: contentEl.createDiv called with cls 'active-recall-tab-bar'
    // Assert: three createEl('button') calls with text Folders, Tags, Links
    expect(true).toBe(false); // stub - will be implemented in Plan 02
  });

  it('clicking Tags tab sets activeTab to tags and re-renders', () => {
    // Setup: create sidebar, simulate tab click
    // Assert: activeTab changed, refresh called
    expect(true).toBe(false);
  });

  it('active tab is restored from settings on construction', () => {
    // Setup: create sidebar with settings.activeTab = 'tags'
    // Assert: Tags panel rendered instead of Folders
    expect(true).toBe(false);
  });

  it('Tags panel renders files found in _self-tests/tags/', () => {
    // Setup: mock app.vault.getFiles() to return files in _self-tests/tags/
    // Assert: tag names rendered from file paths
    expect(true).toBe(false);
  });

  it('Links panel renders files found in _self-tests/links/', () => {
    // Setup: mock app.vault.getFiles() to return files in _self-tests/links/
    // Assert: link entry names rendered from file basenames
    expect(true).toBe(false);
  });

  it('Tags panel shows spinner when generatingTags has matching tag', () => {
    // Setup: add tag to generationService.generatingTags
    // Assert: spinner element created, not regenerate button
    expect(true).toBe(false);
  });

  it('Links panel shows spinner when generatingLinks has matching basename', () => {
    // Setup: add basename to generationService.generatingLinks
    // Assert: spinner element created, not regenerate button
    expect(true).toBe(false);
  });
});
